from __future__ import annotations

import time
import uuid
from typing import List, Optional

from .config import settings
from .x402_models import PaymentOption, PaymentRequired, PaymentSubmitted, PaymentCompleted
from .facilitator import PaymentFacilitator


def _now() -> int:
    return int(time.time())


def build_payment_required(
    *,
    amount_atomic: int,
    description: str,
    deadline_secs: int = 600,
) -> PaymentRequired:
    """Construct a PaymentRequired message advertising both Ethereum and Plasma options.

    - Ethereum: erc20-gasless-router (client fetches router nonce; shown as 0 placeholder)
    - Plasma: eip3009-transfer-with-auth (merchant suggests a unique 32-byte nonce)
    """
    now = _now()
    deadline = now + deadline_secs
    invoice_id = str(uuid.uuid4())

    options: List[PaymentOption] = []

    # Ethereum via router
    options.append(
        PaymentOption(
            network="ethereum",
            chainId=settings.ETH_CHAIN_ID,
            token=settings.USDT_ADDRESS,
            tokenSymbol="USDT",
            amount=str(amount_atomic),
            decimals=6,
            recipient=settings.MERCHANT_ADDRESS,
            scheme="erc20-gasless-router",
            routerContract=settings.ROUTER_ADDRESS,
            nonce=0,  # placeholder; client computes actual router nonce
            deadline=deadline,
        )
    )

    # Plasma via EIP-3009
    options.append(
        PaymentOption(
            network="plasma",
            chainId=settings.PLASMA_CHAIN_ID,
            token=settings.USDT0_ADDRESS,
            tokenSymbol="USDT0",
            amount=str(amount_atomic),
            decimals=6,
            recipient=settings.MERCHANT_ADDRESS,
            scheme="eip3009-transfer-with-auth",
            nonce=uuid.uuid4().hex.ljust(64, "0"),  # server-suggested 32-byte hex
            deadline=deadline,
        )
    )

    return PaymentRequired(
        invoiceId=invoice_id,
        timestamp=now,
        paymentOptions=options,
        description=description,
    )


def verify_and_settle(submitted: PaymentSubmitted) -> PaymentCompleted:
    """Basic verification and settlement orchestration.

    - Ensures the recipient matches our configured merchant address.
    - Submits the transaction via the appropriate facilitator path.
    - Returns a PaymentCompleted message with tx hash and status.
    """
    opt = submitted.chosenOption
    # Minimal off-chain checks
    if opt.to.lower() != settings.MERCHANT_ADDRESS.lower():
        return PaymentCompleted(
            invoiceId=submitted.invoiceId,
            txHash="0x0",
            network=opt.network,
            status="failed",
            receipt={"error": "recipient_mismatch"},
        )

    facilitator = PaymentFacilitator()
    if submitted.scheme == "erc20-gasless-router":
        res = facilitator.settle_ethereum_router(
            token=opt.token,
            from_addr=opt.from_,
            to_addr=opt.to,
            amount=int(opt.amount),
            deadline=opt.deadline,
            v=submitted.signature.v,
            r=submitted.signature.r,
            s=submitted.signature.s,
        )
        return PaymentCompleted(
            invoiceId=submitted.invoiceId,
            txHash=res.tx_hash or "0x0",
            network="ethereum",
            status="confirmed" if res.success else "failed",
            receipt=(res.receipt if res.receipt else {"error": res.error}),
        )

    if submitted.scheme == "eip3009-transfer-with-auth":
        res = facilitator.settle_plasma_eip3009(
            from_addr=opt.from_,
            to_addr=opt.to,
            value=int(opt.amount),
            valid_after=int(submitted.chosenOption.deadline) - 600,  # approx
            valid_before=int(opt.deadline),
            nonce32=str(opt.nonce),
            v=submitted.signature.v,
            r=submitted.signature.r,
            s=submitted.signature.s,
        )
        return PaymentCompleted(
            invoiceId=submitted.invoiceId,
            txHash=res.tx_hash or "0x0",
            network="plasma",
            status="confirmed" if res.success else "failed",
            receipt=(res.receipt if res.receipt else {"error": res.error}),
        )

    return PaymentCompleted(
        invoiceId=submitted.invoiceId,
        txHash="0x0",
        network=opt.network,
        status="failed",
        receipt={"error": "unsupported_scheme"},
    )


