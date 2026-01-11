"""
Rate limiting for Plasma Predictions API

Uses slowapi for per-IP and per-endpoint rate limits.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from fastapi import Request
from fastapi.responses import JSONResponse

# Create limiter instance
limiter = Limiter(key_func=get_remote_address)

# Rate limit configurations
RATE_LIMITS = {
    "default": "60/minute",
    "markets": "120/minute",      # Higher for read-heavy endpoints
    "bet": "10/minute",           # Lower for write operations
    "cashout": "10/minute",
    "sync": "2/minute",           # Very low for admin operations
    "leaderboard": "30/minute",
}

def get_rate_limit(endpoint: str) -> str:
    """Get rate limit for an endpoint."""
    return RATE_LIMITS.get(endpoint, RATE_LIMITS["default"])


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """Custom handler for rate limit exceeded."""
    return JSONResponse(
        status_code=429,
        content={
            "error": "rate_limit_exceeded",
            "message": f"Rate limit exceeded. Try again in {exc.detail} seconds.",
            "retry_after": exc.detail,
        },
        headers={"Retry-After": str(exc.detail)},
    )


def setup_rate_limiting(app):
    """Setup rate limiting for the FastAPI app."""
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)
