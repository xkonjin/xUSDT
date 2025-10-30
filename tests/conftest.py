import os

def pytest_configure():
    # Provide safe defaults to avoid import-time settings failures
    os.environ.setdefault("ETH_RPC", "http://127.0.0.1:8545")
    os.environ.setdefault("PLASMA_RPC", "http://127.0.0.1:8545")
    os.environ.setdefault("MERCHANT_ADDRESS", "0x000000000000000000000000000000000000dEaD")
    os.environ.setdefault("RELAYER_PRIVATE_KEY", "0x" + "11" * 32)
    os.environ.setdefault("CLIENT_PRIVATE_KEY", "0x" + "22" * 32)
    os.environ.setdefault("PREFER_PLASMA", "true")
    os.environ.setdefault("DRY_RUN", "true")
