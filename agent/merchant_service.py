from __future__ import annotations

import time
from fastapi import FastAPI, Response
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import json
from web3 import Web3
from typing import Optional

from .merchant_agent import build_payment_required, verify_and_settle
from .x402_models import PaymentSubmitted
from .config import settings
from .x402_models import PaymentOption, PaymentRequired
import uuid

from pathlib import Path

# Import polymarket router for prediction markets integration
from .polymarket import polymarket_router

# Import predictions router for Plasma Predictions
from .predictions import router as predictions_router

app = FastAPI(title="xUSDT Merchant (Plasma/Ethereum)")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# Mount Polymarket Router
# =============================================================================
# Polymarket integration endpoints for prediction markets
# - GET /polymarket/markets: List active markets from Polymarket Gamma API
# - GET /polymarket/markets/{id}: Get single market details
# - POST /polymarket/predict: Submit a prediction (mock order for MVP)
# - GET /polymarket/predictions: Get user's prediction history
app.include_router(polymarket_router, prefix="/polymarket", tags=["polymarket"])

# =============================================================================
# Mount Plasma Predictions Router
# =============================================================================
# Plasma Predictions - Native prediction market on Plasma chain
# - GET /predictions/markets: List markets (mirrored from Polymarket)
# - GET /predictions/markets/{id}: Get single market
# - POST /predictions/bet: Place a bet (gasless)
# - POST /predictions/cashout: Cash out position
# - GET /predictions/bets: Get user's bets
# - GET /predictions/leaderboard: Get top predictors
app.include_router(predictions_router, tags=["predictions"])

# Serve SDK JS for drop-in integration
_SDK_DIR = Path(__file__).parent / "static"
app.mount("/sdk", StaticFiles(directory=str(_SDK_DIR), html=False), name="sdk")

@app.get("/sdk.js")
def sdk_js() -> Response:
    return FileResponse(str(_SDK_DIR / "sdk.js"), media_type="application/javascript")


@app.get("/demo")
def demo_html() -> Response:
    return FileResponse(str(_SDK_DIR / "demo.html"), media_type="text/html")


@app.get("/health")
def health() -> dict:
    return {"ok": True, "ts": int(time.time())}


@app.get("/premium")
def get_premium(invoiceId: Optional[str] = None) -> Response:
    # If an invoiceId is provided and marked confirmed, grant access (200)
    if invoiceId:
        from .merchant_agent import get_invoice_record
        rec = get_invoice_record(invoiceId)
        if rec and str(rec.status).lower() == "confirmed":
            return JSONResponse(
                content={
                    "type": "premium",
                    "invoiceId": invoiceId,
                    "granted": True,
                    "resource": {
                        "message": "Premium content unlocked",
                        "ts": int(time.time()),
                    },
                },
                status_code=200,
            )
    # Otherwise advertise a new invoice (402)
    # Premium price -> 0.1 USDT0 (100_000 atomic)
    pr = build_payment_required(amount_atomic=100_000, description="Premium API access", deadline_secs=600)
    return JSONResponse(content=pr.model_dump(), status_code=402)


@app.post("/pay")
def post_pay(submitted: PaymentSubmitted) -> dict:
    # Normalize web3-native types (AttributeDict, HexBytes, bytes) so FastAPI can serialize
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

    completed = verify_and_settle(submitted)
    out = _jsonify(completed.model_dump())
    if not isinstance(out.get("receipt"), dict):  # final guard
        out["receipt"] = str(out.get("receipt")) if out.get("receipt") is not None else None
    return out


@app.get("/product/{sku}")
def get_product_invoice(sku: str) -> Response:
    # Minimal SKU catalog (atomic amounts, 6 decimals); extend as needed
    catalog = {
        # Premium price -> 0.1 USDT0
        "premium": {"amount": 100_000, "description": "Premium API access"},
        "vip-pass": {"amount": 3_000_000, "description": "VIP Access NFT"},
    }
    item = catalog.get(sku, None)
    if item is None:
        # Default price -> 0.01 USDT0 (10_000 atomic)
        item = {"amount": 10_000, "description": f"Order {sku}"}
    pr = build_payment_required(amount_atomic=int(item["amount"]), description=str(item["description"]), deadline_secs=600)
    # Force Plasma-only by preference if configured; build_payment_required handles that flag
    return JSONResponse(content=pr.model_dump(), status_code=402)


# ---------------- Router (EIP-712 gasless) endpoints -----------------

class CheckoutTotalIn(BaseModel):
    buyer: str
    amountDecimal: Optional[str] = None  # e.g., "0.10" (6 dp max)
    amountAtomic: Optional[int] = None   # e.g., 100000 (6 dp atomic)


def _to_atomic_6dp(amount_decimal: str) -> int:
    """Convert a decimal string (e.g., "0.10") into 6‑decimal atomic units.

    - Pads/truncates fractional part to 6 digits.
    - Accepts integer strings ("1") and returns e.g., 1000000 for 6dp.
    """
    s = amount_decimal.strip()
    if not s:
        return 0
    if "." in s:
        i, f = s.split(".", 1)
    else:
        i, f = s, ""
    f = (f + "000000")[:6]
    digits = (i + f).lstrip("0")
    return int(digits or "0")


@app.post("/router/checkout_total")
def router_checkout_total(body: CheckoutTotalIn) -> dict:
    """Build EIP‑712 typed data for PaymentRouter.gaslessTransfer for an arbitrary total.

    - Resolves buyer nonce from router contract (to prevent replay).
    - Uses USDT₀ token and Plasma chain settings by default.
    """
    from .crypto import build_router_typed_data

    router_addr = Web3.to_checksum_address(settings.ROUTER_ADDRESS)
    token_addr = Web3.to_checksum_address(settings.USDT0_ADDRESS)
    merchant_addr = Web3.to_checksum_address(settings.MERCHANT_ADDRESS)

    # Compute amount in atomic units (6 dp)
    if body.amountAtomic is not None:
        amount_atomic = int(body.amountAtomic)
    else:
        amount_atomic = _to_atomic_6dp(str(body.amountDecimal or "0"))
    if amount_atomic <= 0:
        return {"error": "amount must be > 0"}

    # Read current nonce for buyer from router
    w3 = Web3(Web3.HTTPProvider(settings.PLASMA_RPC))
    router_abi = [
        {"type": "function", "name": "nonces", "stateMutability": "view", "inputs": [{"name": "", "type": "address"}], "outputs": [{"name": "", "type": "uint256"}]}
    ]
    router = w3.eth.contract(address=router_addr, abi=router_abi)
    buyer_addr = Web3.to_checksum_address(body.buyer)
    nonce = int(router.functions.nonces(buyer_addr).call())

    now = int(time.time())
    deadline = now + 10 * 60

    typed = build_router_typed_data(
        chain_id=int(settings.PLASMA_CHAIN_ID),
        verifying_contract=router_addr,
        token=token_addr,
        from_addr=buyer_addr,
        to_addr=merchant_addr,
        amount=amount_atomic,
        nonce=nonce,
        deadline=deadline,
    )

    return {
        "domain": typed["domain"],
        "types": typed["types"],
        "message": typed["message"],
        "amount": str(amount_atomic),
        "deadline": str(deadline),
    }


class RelayTotalIn(BaseModel):
    buyer: str
    amount: int
    deadline: int
    signature: str  # 0x + 65 bytes (r,s,v)


@app.post("/router/relay_total")
def router_relay_total(body: RelayTotalIn) -> dict:
    """Relay a signed EIP‑712 PaymentRouter.gaslessTransfer using the relayer key.

    Expects signature as a 65‑byte 0x hex string; splits into v/r/s and submits the tx.
    """
    router_addr = Web3.to_checksum_address(settings.ROUTER_ADDRESS)
    token_addr = Web3.to_checksum_address(settings.USDT0_ADDRESS)
    merchant_addr = Web3.to_checksum_address(settings.MERCHANT_ADDRESS)

    # Split signature into r, s, v
    hex_sig = body.signature[2:] if body.signature.startswith("0x") else body.signature
    r = Web3.to_hex(bytes.fromhex(hex_sig[0:64]))
    s = Web3.to_hex(bytes.fromhex(hex_sig[64:128]))
    v_raw = int(hex_sig[128:130], 16)
    v = v_raw if v_raw in (27, 28) else (v_raw + 27)

    w3 = Web3(Web3.HTTPProvider(settings.PLASMA_RPC))
    acct = w3.eth.account.from_key(settings.RELAYER_PRIVATE_KEY)

    router_abi = [
        {
            "type": "function",
            "name": "gaslessTransfer",
            "stateMutability": "nonpayable",
            "inputs": [
                {"name": "token", "type": "address"},
                {"name": "from", "type": "address"},
                {"name": "to", "type": "address"},
                {"name": "amount", "type": "uint256"},
                {"name": "deadline", "type": "uint256"},
                {"name": "v", "type": "uint8"},
                {"name": "r", "type": "bytes32"},
                {"name": "s", "type": "bytes32"},
            ],
            "outputs": [],
        }
    ]
    router = w3.eth.contract(address=router_addr, abi=router_abi)

    tx = router.functions.gaslessTransfer(
        token_addr,
        Web3.to_checksum_address(body.buyer),
        merchant_addr,
        int(body.amount),
        int(body.deadline),
        int(v),
        r,
        s,
    ).build_transaction({
        "from": acct.address,
        "nonce": w3.eth.get_transaction_count(acct.address),
        "gas": 150000,
        "gasPrice": w3.eth.gas_price,
        "chainId": int(settings.PLASMA_CHAIN_ID),
    })

    signed = w3.eth.account.sign_transaction(tx, private_key=settings.RELAYER_PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
    rcpt = w3.eth.wait_for_transaction_receipt(tx_hash)
    return {"routerTx": Web3.to_hex(tx_hash), "status": bool(rcpt.status)}

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
    channel: str    # channel contract address used for EIP-712 domain
    chainId: int


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
        chain_id=int(body.chainId),
        verifying_contract=body.channel,
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
        return {
            "ok": False,
            "error": "signature_mismatch",
            "recovered": recovered,
            "expected": body.payer,
            "chainId": body.chainId,
            "channel": body.channel,
        }

    rec = {
        "payer": body.payer,
        "merchant": body.merchant,
        "amount": int(body.amount),
        "serviceId": body.serviceId,
        "nonce": body.nonce,
        "expiry": int(body.expiry),
        "channel": body.channel,
        "signature": body.signature,
    }
    _PENDING_CHANNEL_RECEIPTS.clear()
    _PENDING_CHANNEL_RECEIPTS.append(rec)
    return {"ok": True, "queued": 1}


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
    channel_addr = _PENDING_CHANNEL_RECEIPTS[0]["channel"]

    from .facilitator import PaymentFacilitator

    fac = PaymentFacilitator()
    res = fac.settle_plasma_channel(receipts, sigs, channel_address=channel_addr)
    if res.success:
        _PENDING_CHANNEL_RECEIPTS.clear()
        return {"ok": True, "txHash": res.tx_hash, "settled": len(receipts), "receipt": {"status": True}}
    return {"ok": False, "error": res.error}


@app.get("/channel/diag")
def channel_diag() -> dict:
    from .config import settings as _s
    return {
        "CHANNEL_ADDRESS": getattr(_s, "CHANNEL_ADDRESS", None),
        "PLASMA_CHAIN_ID": getattr(_s, "PLASMA_CHAIN_ID", None),
        "MERCHANT_ADDRESS": getattr(_s, "MERCHANT_ADDRESS", None),
    }


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
