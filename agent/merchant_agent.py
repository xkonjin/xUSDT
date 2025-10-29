from __future__ import annotations

import time
import uuid
from typing import List, Optional, Dict
import os

from .config import settings
from .x402_models import PaymentOption, PaymentRequired, PaymentSubmitted, PaymentCompleted, FeeBreakdown
from .facilitator import PaymentFacilitator
from .minter import PlasmaMinter


def _now() -> int:
    return int(time.time())


# In-memory invoice records to provide idempotency and status lookups.
_INVOICE_RECORDS: Dict[str, PaymentCompleted] = {}


def get_invoice_record(invoice_id: str) -> Optional[PaymentCompleted]:
    return _INVOICE_RECORDS.get(invoice_id)


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

    # Plasma via EIP-3009 (preferred path)
    # Compute fee and routing hints for Plasma path (direct EIP-3009 by default today)
    # Policy: channel-first recommended, but fall back to direct with dynamic-floor logic
    # Note: Dynamic floor requires calibration; see Settings.DIRECT_SETTLE_FLOOR_ATOMIC
    # For Plasma direct, we advertise the direct path but mark recommendedMode as "channel"
    fee_amt_plasma, floor_applied_plasma = compute_protocol_fee(amount_atomic, chain="plasma", mode="direct")
    plasma_option = PaymentOption(
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
        recommendedMode="channel",
        feeBreakdown=FeeBreakdown(
            amount=str(amount_atomic),
            percentBps=int(settings.PLATFORM_FEE_BPS),
            percentFee=str((amount_atomic * int(settings.PLATFORM_FEE_BPS)) // 10_000),
            floorApplied=bool(floor_applied_plasma),
            totalFee=str(fee_amt_plasma),
        ),
    )

    # Only include Ethereum option when Plasma is not explicitly preferred
    if not settings.PREFER_PLASMA:
        fee_amt_eth, floor_applied_eth = compute_protocol_fee(amount_atomic, chain="ethereum", mode="direct")
        eth_option = PaymentOption(
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
            recommendedMode="channel",
            feeBreakdown=FeeBreakdown(
                amount=str(amount_atomic),
                percentBps=int(settings.PLATFORM_FEE_BPS),
                percentFee=str((amount_atomic * int(settings.PLATFORM_FEE_BPS)) // 10_000),
                floorApplied=bool(floor_applied_eth),
                totalFee=str(fee_amt_eth),
            ),
        )
        options.append(eth_option)

    options.append(plasma_option)

    return PaymentRequired(
        invoiceId=invoice_id,
        timestamp=now,
        paymentOptions=options,
        description=description,
    )


def compute_protocol_fee(amount_atomic: int, *, chain: str, mode: str) -> tuple[int, bool]:
    """Compute protocol fee in atomic units under the practical policy.

    - percent component: amount * PLATFORM_FEE_BPS / 10_000
    - dynamic floor: applied only in direct mode; taken from DIRECT_SETTLE_FLOOR_ATOMIC when > 0
      (operators calibrate this value to cover relayer gas costs with a safety factor)

    Returns (feeAmountAtomic, floorApplied)
    """
    # Percent component (rounding down)
    percent_fee = (amount_atomic * int(settings.PLATFORM_FEE_BPS)) // 10_000

    if mode != "direct":
        # Channel path: no floor, flat percentage only
        return percent_fee, False

    # Direct path: apply dynamic floor if configured
    floor_atomic = int(getattr(settings, "DIRECT_SETTLE_FLOOR_ATOMIC", 0) or 0)
    if floor_atomic <= 0:
        # Optional future: compute from gas price and conversion if configured
        # For now, no floor when not calibrated
        return percent_fee, False

    if percent_fee >= floor_atomic:
        return percent_fee, False
    return floor_atomic, True


def verify_and_settle(submitted: PaymentSubmitted) -> PaymentCompleted:
    """Basic verification and settlement orchestration.

    - Ensures the recipient matches our configured merchant address.
    - Submits the transaction via the appropriate facilitator path.
    - Returns a PaymentCompleted message with tx hash and status.
    """
    # Idempotency: return previously computed result if present
    existing = _INVOICE_RECORDS.get(submitted.invoiceId)
    if existing is not None:
        return existing

    opt = submitted.chosenOption
    # Minimal off-chain checks
    if opt.to.lower() != settings.MERCHANT_ADDRESS.lower():
        pc = PaymentCompleted(
            invoiceId=submitted.invoiceId,
            txHash="0x0",
            network=opt.network,
            status="failed",
            receipt={"error": "recipient_mismatch"},
        )
        _INVOICE_RECORDS[submitted.invoiceId] = pc
        return pc

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
        pc = PaymentCompleted(
            invoiceId=submitted.invoiceId,
            txHash=res.tx_hash or "0x0",
            network="ethereum",
            status="confirmed" if res.success else "failed",
            receipt=(res.receipt if res.receipt else {"error": res.error}),
        )
        _INVOICE_RECORDS[submitted.invoiceId] = pc
        return pc

    if submitted.scheme == "eip3009-transfer-with-auth":
        # Use exact bounds from the signed payload
        va = int(opt.validAfter) if opt.validAfter is not None else (int(opt.deadline) - 600)
        vb = int(opt.validBefore) if opt.validBefore is not None else int(opt.deadline)
        res = facilitator.settle_plasma_eip3009(
            from_addr=opt.from_,
            to_addr=opt.to,
            value=int(opt.amount),
            valid_after=va,
            valid_before=vb,
            nonce32=str(opt.nonce),
            v=submitted.signature.v,
            r=submitted.signature.r,
            s=submitted.signature.s,
        )
        token_id = None
        if res.success:
            # Mint NFT to payer ("to" address) after confirmed payment
            try:
                minter = PlasmaMinter()
                # Token URI strategy: env template or default by invoiceId
                base_uri = getattr(settings, "NFT_BASE_URI", None) or os.environ.get("NFT_BASE_URI")
                if base_uri and "{invoiceId}" in base_uri:
                    token_uri = base_uri.format(invoiceId=submitted.invoiceId)
                elif base_uri:
                    token_uri = base_uri.rstrip("/") + f"/{submitted.invoiceId}"
                else:
                    token_uri = f"https://example.com/nft/{submitted.invoiceId}"
                mr = minter.mint(to=opt.to, token_uri=token_uri)
                if mr.success:
                    token_id = mr.token_id
                else:
                    # Attach mint error to receipt for debugging; settlement remains confirmed
                    if res.receipt is None:
                        res.receipt = {}
                    res.receipt["mint_error"] = mr.error
            except Exception as mint_err:  # noqa: BLE001
                if res.receipt is None:
                    res.receipt = {}
                res.receipt["mint_error"] = str(mint_err)
        pc = PaymentCompleted(
            invoiceId=submitted.invoiceId,
            txHash=res.tx_hash or "0x0",
            network="plasma",
            status="confirmed" if res.success else "failed",
            receipt=(res.receipt if res.receipt else {"error": res.error}),
            tokenId=(int(token_id) if token_id is not None else None),
        )
        _INVOICE_RECORDS[submitted.invoiceId] = pc
        return pc

    pc = PaymentCompleted(
        invoiceId=submitted.invoiceId,
        txHash="0x0",
        network=opt.network,
        status="failed",
        receipt={"error": "unsupported_scheme"},
    )
    _INVOICE_RECORDS[submitted.invoiceId] = pc
    return pc


