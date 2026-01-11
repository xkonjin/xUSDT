"""
Polymarket Integration Package

This package provides integration with Polymarket prediction markets:
- client.py: API client for Gamma API (market discovery) and CLOB API (trading)
- auth.py: L1/L2 authentication for CLOB API
- models.py: Pydantic data models for markets, predictions, and API responses
- routes.py: FastAPI router with endpoints for frontend consumption

MVP Mode:
- Uses public Gamma API for market discovery
- Mock order placement (no real CLOB orders)

Production Mode (POLYMARKET_ENABLE_TRADING=true):
- Real order placement on Polymarket CLOB
- Requires authentication credentials

Usage:
    from agent.polymarket import polymarket_router
    app.include_router(polymarket_router, prefix="/polymarket", tags=["polymarket"])

Cleanup (important for preventing connection leaks):
    from agent.polymarket import close_polymarket_client
    
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        yield
        await close_polymarket_client()

Authentication:
    from agent.polymarket import AuthManager, ApiCredentials
    
    auth = AuthManager(private_key="0x...")
    headers = auth.get_l1_headers()  # For credential creation
    headers = auth.get_l2_headers(method, path)  # For authenticated requests
"""

from .routes import router as polymarket_router
from .client import PolymarketClient, get_polymarket_client, close_polymarket_client
from .models import Market, Prediction, PredictRequest, PredictResponse
from .auth import (
    AuthManager,
    ApiCredentials,
    L1Headers,
    L2Headers,
    create_l1_signature,
    create_l2_signature,
    create_l2_headers,
    parse_api_credentials,
    validate_credentials,
)

__all__ = [
    # Router
    "polymarket_router",
    # Client
    "PolymarketClient",
    "get_polymarket_client",
    "close_polymarket_client",
    # Models
    "Market",
    "Prediction",
    "PredictRequest",
    "PredictResponse",
    # Auth
    "AuthManager",
    "ApiCredentials",
    "L1Headers",
    "L2Headers",
    "create_l1_signature",
    "create_l2_signature",
    "create_l2_headers",
    "parse_api_credentials",
    "validate_credentials",
]
