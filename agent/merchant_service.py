from __future__ import annotations

import time
from fastapi import FastAPI, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel

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
def post_pay_nft(submitted: PaymentSubmitted) -> dict:
    # Here we would route to facilitator.settle_plasma_pay_and_mint using routerContract and toNFT
    from agent.facilitator import PaymentFacilitator
    fac = PaymentFacilitator()
    opt = submitted.chosenOption
    # signature bytes are not available; using v/r/s variant
    res = fac.settle_plasma_pay_and_mint(
        router_address=opt.to,
        from_addr=opt.from_,
        to_nft=opt.toNFT or opt.from_,
        value=int(opt.amount),
        valid_after=opt.validAfter or (opt.deadline - 600),
        valid_before=opt.validBefore or opt.deadline,
        nonce32=str(opt.nonce if isinstance(opt.nonce, str) else hex(int(opt.nonce))),
        v=submitted.signature.v,
        r=submitted.signature.r,
        s=submitted.signature.s,
    )
    out = {
        "type": "payment-completed",
        "invoiceId": submitted.invoiceId,
        "txHash": res.tx_hash or "0x0",
        "network": "plasma",
        "status": "confirmed" if res.success else "failed",
        "receipt": res.receipt if res.receipt else {"error": res.error},
    }
    if not isinstance(out.get("receipt"), dict):
        out["receipt"] = str(out.get("receipt")) if out.get("receipt") is not None else None
    return out
