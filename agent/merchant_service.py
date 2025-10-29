from __future__ import annotations

import time
from fastapi import FastAPI, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from .merchant_agent import build_payment_required, verify_and_settle
from .x402_models import PaymentSubmitted

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
