from __future__ import annotations

import json
import os
import time

from agent.config import settings
from agent.merchant_agent import build_payment_required, verify_and_settle
from agent.client_agent import ClientAgent


def main() -> None:
    amount = int(os.environ.get("PAY_AMOUNT_ATOMIC", "1000000"))  # default 1 USDT (6 decimals)
    req = build_payment_required(amount_atomic=amount, description="Premium API access", deadline_secs=600)
    print("PaymentRequired:\n", json.dumps(req.dict(), indent=2))

    client = ClientAgent()
    submitted = client.prepare_submission(req)
    print("\nPaymentSubmitted:\n", json.dumps(submitted.dict(by_alias=True), indent=2))

    # WARNING: This will submit a real transaction if RPC and keys are live
    if os.environ.get("DRY_RUN", "false").lower() == "true":
        print("\nDRY_RUN enabled — skipping on-chain settlement")
        return

    completed = verify_and_settle(submitted)
    # Ensure JSON-safe output
    out = completed.model_dump()
    if isinstance(out.get("receipt"), dict):
        try:
            json.dumps(out["receipt"])  # validate
        except Exception:
            out["receipt"] = str(out["receipt"])  # fallback stringify
    else:
        out["receipt"] = str(out.get("receipt")) if out.get("receipt") is not None else None
    print("\nPaymentCompleted:\n", json.dumps(out, indent=2))


if __name__ == "__main__":
    start = time.time()
    try:
        main()
    finally:
        print(f"\nElapsed: {time.time() - start:.2f}s")


