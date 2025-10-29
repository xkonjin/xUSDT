from __future__ import annotations

import os
import sys
import json
import requests

from agent.client_agent import ClientAgent
from agent.x402_models import PaymentRequired, PaymentSubmitted


def main() -> None:
    base = os.environ.get("MERCHANT_URL", "http://127.0.0.1:8000")
    # Step 1: request resource
    r = requests.get(f"{base}/premium")
    if r.status_code != 402:
        print("Unexpected status:", r.status_code, r.text)
        sys.exit(1)
    pr = PaymentRequired.model_validate(r.json())

    # Step 2: sign and submit payment
    client = ClientAgent()
    submitted: PaymentSubmitted = client.prepare_submission(pr)
    p = requests.post(f"{base}/pay", json=submitted.model_dump(by_alias=True))
    print("PaymentCompleted:\n", json.dumps(p.json(), indent=2))


if __name__ == "__main__":
    main()
