from __future__ import annotations

import os
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Provide stable defaults for tests without overriding real env configuration.
os.environ.setdefault("ETH_RPC", "http://localhost:8545")
os.environ.setdefault("PLASMA_RPC", "http://localhost:8545")
os.environ.setdefault("MERCHANT_ADDRESS", "0x" + "11" * 20)
os.environ.setdefault("RELAYER_PRIVATE_KEY", "0x" + "11" * 32)
os.environ.setdefault("CLIENT_PRIVATE_KEY", "0x" + "22" * 32)
