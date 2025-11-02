import os
import sys
from pathlib import Path

def main() -> None:
    # Ensure repo root is on sys.path so `agent.*` imports resolve
    repo_root = Path(__file__).resolve().parent
    if str(repo_root) not in sys.path:
        sys.path.insert(0, str(repo_root))

    # Defer uvicorn import until after sys.path is set
    import uvicorn  # type: ignore

    # Run the FastAPI app
    uvicorn.run(
        "agent.merchant_service:app",
        host=os.environ.get("HOST", "127.0.0.1"),
        port=int(os.environ.get("PORT", "8000")),
        log_level=os.environ.get("LOG_LEVEL", "warning"),
    )


if __name__ == "__main__":
    main()


