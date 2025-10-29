from __future__ import annotations

import time
from fastapi import FastAPI, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import json
from web3 import Web3

from .merchant_agent import build_payment_required, verify_and_settle
from .x402_models import PaymentSubmitted
from .config import settings
from .x402_models import PaymentOption, PaymentRequired
import uuid

app = FastAPI(title="xUSDT Merchant (Plasma/Ethereum)")


@app.get("/health")
def health() -> dict:
    return {"ok": True, "ts": int(time.time())}


@app.get("/premium")
def get_premium() -> Response:
    pr = build_payment_required(amount_atomic=1_000_000, description="Premium API access", deadline_secs=600)
    return JSONResponse(content=pr.model_dump(), status_code=402)


@app.post("/pay")
def post_pay(submitted: PaymentSubmitted) -> dict:
    completed = verify_and_settle(submitted)
    out = completed.model_dump()
    if not isinstance(out.get("receipt"), dict):
        out["receipt"] = str(out.get("receipt")) if out.get("receipt") is not None else None
    return out


@app.get("/product/{sku}")
def get_product_invoice(sku: str) -> Response:
    # Minimal SKU catalog (atomic amounts, 6 decimals); extend as needed
    catalog = {
        "premium": {"amount": 1_000_000, "description": "Premium API access"},
        "vip-pass": {"amount": 3_000_000, "description": "VIP Access NFT"},
    }
    item = catalog.get(sku, None)
    if item is None:
        # Default to 402 for unknown SKU with generic description and nominal price
        item = {"amount": int(1_000_00), "description": f"Order {sku}"}
    pr = build_payment_required(amount_atomic=int(item["amount"]), description=str(item["description"]), deadline_secs=600)
    # Force Plasma-only by preference if configured; build_payment_required handles that flag
    return JSONResponse(content=pr.model_dump(), status_code=402)


@app.get("/invoice/{invoice_id}")
def get_invoice(invoice_id: str) -> dict:
    from .merchant_agent import get_invoice_record

    rec = get_invoice_record(invoice_id)
    if rec is None:
        return {"invoiceId": invoice_id, "status": "pending"}
    out = rec.model_dump()
    if not isinstance(out.get("receipt"), dict):
        out["receipt"] = str(out.get("receipt")) if out.get("receipt") is not None else None
    return out


# ---------------- Channel-first optional endpoints -----------------
# In-memory store of pending channel receipts; replace with durable store in production.
_PENDING_CHANNEL_RECEIPTS: list[dict] = []


class ChannelReceiptIn(BaseModel):
    payer: str
    merchant: str
    amount: int
    serviceId: str  # 0x-hex 32 bytes
    nonce: str      # 0x-hex 32 bytes
    expiry: int
    signature: str  # 0x-hex bytes (65)


@app.post("/channel/receipt")
def post_channel_receipt(body: ChannelReceiptIn) -> dict:
    """Accept a signed channel receipt for later batch settlement.

    Validation performed server-side:
    - Signature must recover to `payer` under the channel EIP-712 domain
    - Merchant must match our configured MERCHANT_ADDRESS
    """
    from .crypto import build_channel_receipt_typed_data

    if body.merchant.lower() != settings.MERCHANT_ADDRESS.lower():
        return {"ok": False, "error": "recipient_mismatch"}

    # Build typed data and recover signer
    typed = build_channel_receipt_typed_data(
        chain_id=settings.PLASMA_CHAIN_ID,
        verifying_contract=settings.CHANNEL_ADDRESS or "0x0000000000000000000000000000000000000000",
        payer=body.payer,
        merchant=body.merchant,
        amount=int(body.amount),
        service_id_hex32=body.serviceId,
        nonce32=body.nonce,
        expiry=int(body.expiry),
    )
    try:
        from eth_account.messages import encode_structured_data
        from eth_account import Account
        signable = encode_structured_data(primitive=typed)
        recovered = Account.recover_message(signable, signature=body.signature)
    except Exception as e:  # noqa: BLE001
        return {"ok": False, "error": f"invalid_signature: {e}"}

    if recovered.lower() != body.payer.lower():
        return {"ok": False, "error": "signature_mismatch"}

    rec = {
        "payer": body.payer,
        "merchant": body.merchant,
        "amount": int(body.amount),
        "serviceId": body.serviceId,
        "nonce": body.nonce,
        "expiry": int(body.expiry),
        "signature": body.signature,
    }
    _PENDING_CHANNEL_RECEIPTS.append(rec)
    return {"ok": True, "queued": len(_PENDING_CHANNEL_RECEIPTS)}


@app.post("/channel/settle")
def post_channel_settle() -> dict:
    """Batch-settle all queued receipts using PlasmaPaymentChannel.settleBatch.

    Requires CHANNEL_ADDRESS to be configured and the relayer to be funded on Plasma.
    """
    if not settings.CHANNEL_ADDRESS:
        return {"ok": False, "error": "channel_not_configured"}
    if not _PENDING_CHANNEL_RECEIPTS:
        return {"ok": True, "txHash": None, "settled": 0}

    # Convert to receipt tuples and signature bytes for the ABI call
    receipts = [
        {
            "payer": r["payer"],
            "merchant": r["merchant"],
            "amount": int(r["amount"]),
            "serviceId": r["serviceId"],
            "nonce": r["nonce"],
            "expiry": int(r["expiry"]),
        }
        for r in _PENDING_CHANNEL_RECEIPTS
    ]
    sigs = [r["signature"] for r in _PENDING_CHANNEL_RECEIPTS]

    from .facilitator import PaymentFacilitator

    fac = PaymentFacilitator()
    res = fac.settle_plasma_channel(receipts, sigs)
    if res.success:
        _PENDING_CHANNEL_RECEIPTS.clear()
        out_receipt = res.receipt
        try:
            from web3 import Web3
            out_receipt = Web3.toJSON(out_receipt)
        except Exception:
            try:
                import json as _json
                out_receipt = _json.loads(Web3.toJSON(out_receipt))  # type: ignore[name-defined]
            except Exception:
                try:
                    out_receipt = dict(out_receipt) if isinstance(out_receipt, dict) else str(out_receipt)
                except Exception:
                    out_receipt = str(out_receipt)
        return {"ok": True, "txHash": res.tx_hash, "settled": len(receipts), "receipt": out_receipt}
    return {"ok": False, "error": res.error}


@app.get("/premium-nft")
def get_premium_nft() -> Response:
    # Build Plasma-only PaymentRequired for router NFT path
    now = int(time.time())
    deadline = now + 600
    invoice_id = str(uuid.uuid4())
    amount_atomic = 10_000  # 0.01 USDT0
    option = PaymentOption(
        network="plasma",
        chainId=settings.PLASMA_CHAIN_ID,
        token=settings.USDT0_ADDRESS,
        tokenSymbol="USDT0",
        amount=str(amount_atomic),
        decimals=6,
        recipient=settings.MERCHANT_ADDRESS,
        scheme="eip3009-receive",
        routerContract=settings.ROUTER_ADDRESS,
        nonce=uuid.uuid4().hex.ljust(64, "0"),
        deadline=deadline,
        nftCollection="to-be-set-after-deploy",
    )
    pr = PaymentRequired(
        invoiceId=invoice_id,
        timestamp=now,
        paymentOptions=[option],
        description="Smiley NFT",
    )
    return JSONResponse(content=pr.model_dump(), status_code=402)


@app.post("/pay-nft")
def post_pay_nft(submitted: PaymentSubmitted) -> Response:
    from hexbytes import HexBytes
    from web3.datastructures import AttributeDict

    def _jsonify(obj):
        if isinstance(obj, AttributeDict):
            return {k: _jsonify(v) for k, v in obj.items()}
        if isinstance(obj, HexBytes):
            return Web3.to_hex(obj)
        if isinstance(obj, (bytes, bytearray)):
            return Web3.to_hex(obj)
        if isinstance(obj, (list, tuple)):
            return [_jsonify(v) for v in obj]
        if isinstance(obj, dict):
            return {k: _jsonify(v) for k, v in obj.items()}
        return obj

    try:
        # Here we would route to facilitator.settle_plasma_pay_and_mint using routerContract and toNFT
        from agent.facilitator import PaymentFacilitator
        fac = PaymentFacilitator()
        opt = submitted.chosenOption
        # Use bytes path (router.payAndMintReceiveAuth): signature covers receiveWithAuthorization(to=router)
        v = int(submitted.signature.v)
        r_hex = submitted.signature.r[2:] if submitted.signature.r.startswith("0x") else submitted.signature.r
        s_hex = submitted.signature.s[2:] if submitted.signature.s.startswith("0x") else submitted.signature.s
        # Left-pad r and s to 32 bytes (64 hex chars)
        r_hex = r_hex.rjust(64, "0")
        s_hex = s_hex.rjust(64, "0")
        v_hex = f"{v:02x}"
        sig_bytes_hex = "0x" + r_hex + s_hex + v_hex
        res = fac.settle_plasma_pay_and_mint(
            router_address=opt.to,
            from_addr=opt.from_,
            to_nft=opt.toNFT or opt.from_,
            value=int(opt.amount),
            valid_after=opt.validAfter or (opt.deadline - 600),
            valid_before=opt.validBefore or opt.deadline,
            nonce32=str(opt.nonce if isinstance(opt.nonce, str) else hex(int(opt.nonce))),
            signature_bytes=sig_bytes_hex,
        )
        receipt_obj = res.receipt if res.receipt else {"error": res.error}
        # Normalize nested web3 types to JSON-friendly
        try:
            receipt_json_str = Web3.toJSON(receipt_obj)
            out_receipt = json.loads(receipt_json_str)
        except Exception:
            out_receipt = receipt_obj if isinstance(receipt_obj, dict) else str(receipt_obj)

        out = {
            "type": "payment-completed",
            "invoiceId": submitted.invoiceId,
            "txHash": res.tx_hash or "0x0",
            "network": "plasma",
            "status": "confirmed" if res.success else "failed",
            "receipt": out_receipt,
        }
        return JSONResponse(content=_jsonify(out))
    except Exception as e:
        return JSONResponse(
            content={
                "type": "payment-completed",
                "invoiceId": submitted.invoiceId,
                "txHash": "0x0",
                "network": "plasma",
                "status": "failed",
                "receipt": {"error": str(e)},
            },
            status_code=200,
        )
