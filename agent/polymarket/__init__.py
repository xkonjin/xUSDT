"""
Polymarket Integration Package

This package provides a minimal integration with Polymarket prediction markets:
- client.py: API client for fetching markets from Polymarket Gamma API + mock order handling
- models.py: Pydantic data models for markets, predictions, and API responses
- routes.py: FastAPI router with endpoints for frontend consumption

The integration uses Polymarket's public Gamma API for market discovery and
maintains an in-memory store for user predictions (mock betting for MVP).

Usage:
    from agent.polymarket import polymarket_router
    app.include_router(polymarket_router, prefix="/polymarket", tags=["polymarket"])
"""

from .routes import router as polymarket_router
from .client import PolymarketClient
from .models import Market, Prediction, PredictRequest, PredictResponse

__all__ = [
    "polymarket_router",
    "PolymarketClient",
    "Market",
    "Prediction",
    "PredictRequest",
    "PredictResponse",
]

