from __future__ import annotations

import logging
import time
import uuid
from typing import List, Optional, Dict
import os

from .config import settings
from .x402_models import PaymentOption, PaymentRequired, PaymentSubmitted, PaymentCompleted, FeeBreakdown
from .facilitator import PaymentFacilitator
from .persistence import get_invoice_store
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    # Only for type hints; runtime import is lazy and optional.
    from .minter import PlasmaMinter  # pragma: no cover

logger = logging.getLogger(__name__)


def _now() -> int:
    return int(time.time())


# In-memory fallback cache for invoice records (used if persistence fails)
_INVOICE_RECORDS: Dict[str, PaymentCompleted] = {}


def _store_invoice(invoice_id: str, record: PaymentCompleted) -> None:
    """Store invoice record with persistence fallback."""
    # Always keep in memory for fast access
    _INVOICE_RECORDS[invoice_id] = record
    
    # Persist to disk (serializable dict format)
    try:
        store = get_invoice_store()
        store.set(invoice_id, record.model_dump())
    except Exception as e:
        logger.warning(f"Failed to persist invoice {invoice_id}: {e}")


def get_invoice_record(invoice_id: str) -> Optional[PaymentCompleted]:
    """Get invoice record from memory cache or persistent store."""
    # Check in-memory cache first
    if invoice_id in _INVOICE_RECORDS:
        return _INVOICE_RECORDS[invoice_id]
    
    # Fall back to persistent store
    try:
        store = get_invoice_store()
        data = store.get(invoice_id)
        if data is not None:
            record = PaymentCompleted(**data)
            # Cache in memory for future lookups
            _INVOICE_RECORDS[invoice_id] = record
            return record
    except Exception as e:
        logger.warning(f"Failed to load invoice {invoice_id} from persistence: {e}")
    
    return None


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
        tokenDecimals=6,
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
            tokenDecimals=6,
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


def _extract_payment_data(submitted: PaymentSubmitted):
    """Extract payment data from both old and new schema formats.
    
    Returns:
        tuple: (chosen_option, signature_v, signature_r, signature_s)
    """
    # Handle new unified authorization format (preferred)
    if hasattr(submitted, 'authorization') and submitted.authorization:
        auth = submitted.authorization
        # Create a compatible option object
        from types import SimpleNamespace
        opt = SimpleNamespace()
        opt.network = submitted.chosenOption.network
        opt.chainId = submitted.chosenOption.chainId
        opt.token = submitted.chosenOption.token
        opt.amount = auth.value
        opt.from_ = auth.from_
        opt.to = auth.to
        opt.validAfter = auth.validAfter
        opt.validBefore = auth.validBefore
        opt.nonce = auth.nonce
        opt.deadline = auth.validBefore  # Use validBefore as deadline for compatibility
        return opt, auth.v, auth.r, auth.s
    
    # Handle legacy separate chosenOption + signature format
    if hasattr(submitted, 'chosenOption') and hasattr(submitted, 'signature'):
        return submitted.chosenOption, submitted.signature.v, submitted.signature.r, submitted.signature.s
    
    # Fallback for unknown format
    raise ValueError(f"Unable to extract payment data from submission: {type(submitted)}")


def verify_and_settle(submitted: PaymentSubmitted, user_ip: str = "unknown") -> PaymentCompleted:
    """Basic verification and settlement orchestration.

    - Ensures the recipient matches our configured merchant address.
    - Submits the transaction via the appropriate facilitator path.
    - Returns a PaymentCompleted message with tx hash and status.
    
    Args:
        submitted: The PaymentSubmitted payload from the client
        user_ip: The client's IP address for rate limiting (extracted from X-Forwarded-For or client.host)
    """
    # Idempotency: return previously computed result if present
    existing = get_invoice_record(submitted.invoiceId)
    if existing is not None:
        return existing

    now = _now()

    # Extract payment data from either old or new format
    opt, sig_v, sig_r, sig_s = _extract_payment_data(submitted)
    scheme = submitted.scheme or getattr(submitted.chosenOption, "scheme", None)
    # Minimal off-chain checks
    if opt.to.lower() != settings.MERCHANT_ADDRESS.lower():
        pc = PaymentCompleted(
            invoiceId=submitted.invoiceId,
            txHash="0x0",
            network=opt.network,
            chainId=int(getattr(opt, "chainId", settings.PLASMA_CHAIN_ID)),
            status="failed",
            timestamp=now,
            receipt={"error": "recipient_mismatch"},
        )
        _store_invoice(submitted.invoiceId, pc)
        return pc

    facilitator = PaymentFacilitator()
    if scheme == "erc20-gasless-router":
        res = facilitator.settle_ethereum_router(
            token=opt.token,
            from_addr=opt.from_,
            to_addr=opt.to,
            amount=int(opt.amount),
            deadline=opt.deadline,
            v=sig_v,
            r=sig_r,
            s=sig_s,
        )
        pc = PaymentCompleted(
            invoiceId=submitted.invoiceId,
            txHash=res.tx_hash or "0x0",
            network="ethereum",
            chainId=settings.ETH_CHAIN_ID,
            status="confirmed" if res.success else "failed",
            timestamp=now,
            receipt=(res.receipt if res.receipt else {"error": res.error}),
        )
        _store_invoice(submitted.invoiceId, pc)
        return pc

    if scheme == "eip3009-transfer-with-auth":
        # Use exact bounds from the signed payload
        va = int(opt.validAfter) if opt.validAfter is not None else (int(opt.deadline) - 600)
        vb = int(opt.validBefore) if opt.validBefore is not None else int(opt.deadline)
        
        # Use the smart settlement method that tries gasless API first, then falls back
        # to RELAYER wallet. This enables FREE transactions when Plasma gasless API is
        # available and configured with PLASMA_RELAYER_SECRET.
        res = facilitator.settle_plasma_with_fallback(
            from_addr=opt.from_,
            to_addr=opt.to,
            value=int(opt.amount),
            valid_after=va,
            valid_before=vb,
            nonce32=str(opt.nonce),
            v=sig_v,
            r=sig_r,
            s=sig_s,
            user_ip=user_ip,
        )
        token_id = None
        if res.success and getattr(settings, "NFT_MINT_ON_PAY", False):
            # Optional NFT receipt minting (explicitly enabled only)
            try:
                # Lazy import to avoid hard dependency when minter module is absent
                from .minter import PlasmaMinter  # type: ignore
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
            chainId=settings.PLASMA_CHAIN_ID,
            status="confirmed" if res.success else "failed",
            timestamp=now,
            receipt=(res.receipt if res.receipt else {"error": res.error}),
            tokenId=(int(token_id) if token_id is not None else None),
        )
        _store_invoice(submitted.invoiceId, pc)
        return pc

    pc = PaymentCompleted(
        invoiceId=submitted.invoiceId,
        txHash="0x0",
        network=opt.network,
        chainId=int(getattr(opt, "chainId", settings.PLASMA_CHAIN_ID)),
        status="failed",
        timestamp=now,
        receipt={"error": "unsupported_scheme"},
    )
    _store_invoice(submitted.invoiceId, pc)
    return pc

