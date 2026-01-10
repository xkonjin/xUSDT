"""
Polymarket FastAPI Routes

This module provides FastAPI endpoints for the Polymarket integration:
- GET /markets: List active prediction markets
- GET /markets/{market_id}: Get single market details
- POST /predict: Submit a prediction on a market
- GET /predictions: Get user's prediction history

All endpoints are designed to be consumed by the Next.js frontend.
Market data is fetched from Polymarket Gamma API; predictions are
stored in-memory (mock orders, no real CLOB integration in MVP).

IMPORTANT: In-Memory Storage Warning
====================================
The predictions store is in-memory and will be LOST on server restart.
Additionally, if running with multiple workers (e.g., uvicorn --workers 4),
each worker has its own copy of the store - predictions may appear to
"disappear" depending on which worker handles the request.

For production, replace _predictions_store with a proper database
(PostgreSQL, SQLite, Redis, etc.).

Usage:
    from agent.polymarket import polymarket_router
    app.include_router(polymarket_router, prefix="/polymarket", tags=["polymarket"])
"""

from __future__ import annotations

import re
import time
import logging
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, HTTPException, Query, Path
from pydantic import ValidationError

from .client import get_polymarket_client
from .models import (
    Market,
    MarketsResponse,
    Prediction,
    PredictRequest,
    PredictResponse,
    UserStatsResponse,
    validate_eth_address,
)

# Configure logging
logger = logging.getLogger(__name__)

# Create the router for Polymarket endpoints
router = APIRouter()


# =============================================================================
# In-Memory Predictions Store (MVP)
# =============================================================================
#
# WARNING: This is NOT production-ready!
#
# Issues with this approach:
# 1. Data is lost on server restart
# 2. Multiple uvicorn workers have separate stores (race conditions, inconsistency)
# 3. No persistence, no backup, no recovery
# 4. Memory usage grows unbounded (no cleanup of old predictions)
#
# For production, use:
# - PostgreSQL with SQLAlchemy ORM
# - Redis for caching layer
# - Proper database migrations
#
# =============================================================================

# Key: user_address (lowercase), Value: List of Prediction objects
_predictions_store: Dict[str, List[Prediction]] = {}


def _get_user_predictions(user_address: str) -> List[Prediction]:
    """Get all predictions for a user from in-memory store."""
    return _predictions_store.get(user_address.lower(), [])


def _add_prediction(prediction: Prediction) -> None:
    """Add a prediction to the in-memory store."""
    user_key = prediction.user_address.lower()
    if user_key not in _predictions_store:
        _predictions_store[user_key] = []
    _predictions_store[user_key].append(prediction)


def _get_total_predictions_count() -> int:
    """Get total count of all predictions across all users."""
    return sum(len(preds) for preds in _predictions_store.values())


# =============================================================================
# Market Endpoints
# =============================================================================

@router.get("/markets", response_model=MarketsResponse)
async def get_markets(
    active: bool = Query(True, description="Only return active markets"),
    limit: int = Query(50, ge=1, le=100, description="Maximum results to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
) -> MarketsResponse:
    """
    List prediction markets from Polymarket.
    
    Fetches market data from Polymarket's Gamma API. Returns active markets
    with their current pricing, volume, and metadata.
    
    Query Parameters:
        active: If true, only return markets that are currently tradeable
        limit: Maximum number of markets to return (1-100)
        offset: Pagination offset for fetching more results
    
    Returns:
        MarketsResponse with list of markets and pagination info
    """
    try:
        client = get_polymarket_client()
        response = await client.get_markets(active=active, limit=limit, offset=offset)
        return response
    except Exception as e:
        logger.error(f"Error fetching markets: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch markets: {str(e)}")


@router.get("/markets/{market_id}", response_model=Market)
async def get_market(
    market_id: str = Path(..., description="Market ID (condition_id)"),
) -> Market:
    """
    Get details for a single prediction market.
    
    Fetches detailed information about a specific market including
    current outcome prices, description, and resolution date.
    
    Path Parameters:
        market_id: The market's condition_id from Polymarket
    
    Returns:
        Market object with full details
    
    Raises:
        404: If market not found
    """
    # Validate market_id length to prevent abuse
    if len(market_id) > 256:
        raise HTTPException(status_code=400, detail="Market ID too long")
    
    try:
        client = get_polymarket_client()
        market = await client.get_market(market_id)
        
        if market is None:
            raise HTTPException(status_code=404, detail=f"Market not found: {market_id}")
        
        return market
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching market {market_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch market: {str(e)}")


# =============================================================================
# Prediction Endpoints
# =============================================================================

@router.post("/predict", response_model=PredictResponse)
async def create_prediction(request: PredictRequest) -> PredictResponse:
    """
    Submit a prediction on a market.
    
    Creates a prediction record for the user. In this MVP, predictions
    are stored in-memory and no real orders are placed on Polymarket.
    This is a simulation for testing the UI flow.
    
    Request Body:
        user_address: User's wallet address (0x + 40 hex chars)
        market_id: Polymarket market ID
        market_question: Market question (cached for display)
        outcome: Selected outcome (e.g., "Yes", "No")
        amount: Bet amount in atomic units (6 decimals, min 1000)
    
    Returns:
        PredictResponse with created prediction and mock order ID
    """
    try:
        # Note: Pydantic validators in PredictRequest already handle:
        # - user_address format validation
        # - amount minimum validation
        # - outcome non-empty validation
        
        # Create mock order via client
        client = get_polymarket_client()
        mock_order = client.create_mock_order(
            market_id=request.market_id,
            outcome=request.outcome,
            amount=request.amount,
            user_address=request.user_address,
        )
        
        # Create prediction record
        prediction = Prediction(
            user_address=request.user_address,  # Validator lowercases it
            market_id=request.market_id,
            market_question=request.market_question,
            outcome=request.outcome,
            amount=request.amount,
            amount_formatted=request.amount / 1_000_000,
            status="active",
            mock_order_id=mock_order["order_id"],
        )
        
        # Store prediction
        _add_prediction(prediction)
        
        logger.info(
            f"Created prediction: user={prediction.user_address}, "
            f"market={prediction.market_id}, outcome={prediction.outcome}, "
            f"amount={prediction.amount_formatted} USDT0"
        )
        
        return PredictResponse(
            success=True,
            prediction=prediction,
            mock_order_id=mock_order["order_id"],
            message="Prediction created successfully. Note: This is a mock order for testing.",
        )
        
    except ValidationError as e:
        # Pydantic validation error
        error_msg = str(e.errors()[0]["msg"]) if e.errors() else str(e)
        return PredictResponse(
            success=False,
            prediction=None,
            mock_order_id=None,
            message="Validation failed",
            error=error_msg,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating prediction: {e}")
        return PredictResponse(
            success=False,
            prediction=None,
            mock_order_id=None,
            message="Failed to create prediction",
            error=str(e),
        )


@router.get("/predictions", response_model=List[Prediction])
async def get_predictions(
    user_address: str = Query(..., description="User's wallet address"),
    limit: int = Query(50, ge=1, le=100, description="Maximum results"),
    status: Optional[str] = Query(None, description="Filter by status"),
) -> List[Prediction]:
    """
    Get user's prediction history.
    
    Returns all predictions made by a user, optionally filtered by status.
    Predictions are stored in-memory for this MVP.
    
    Query Parameters:
        user_address: User's wallet address (required, 0x + 40 hex chars)
        limit: Maximum number of predictions to return
        status: Optional filter by prediction status (active, won, lost)
    
    Returns:
        List of Prediction objects, sorted by creation date (newest first)
    """
    # Validate wallet address format using shared validator
    if not validate_eth_address(user_address):
        raise HTTPException(
            status_code=400, 
            detail="Invalid wallet address format. Expected 0x followed by 40 hex characters."
        )
    
    predictions = _get_user_predictions(user_address)
    
    # Apply status filter if provided
    if status:
        predictions = [p for p in predictions if p.status == status]
    
    # Sort by creation date (newest first)
    predictions = sorted(predictions, key=lambda p: p.created_at, reverse=True)
    
    # Apply limit
    return predictions[:limit]


@router.get(
    "/stats/{user_address}", 
    response_model=UserStatsResponse,
    deprecated=True,  # Mark as deprecated in OpenAPI docs
    description="EXPERIMENTAL: Stats endpoint. Won/lost counts always 0 in MVP (no market resolution)."
)
async def get_user_stats(
    user_address: str = Path(..., description="User's wallet address"),
) -> UserStatsResponse:
    """
    Get prediction statistics for a user.
    
    EXPERIMENTAL ENDPOINT - NOT FULLY FUNCTIONAL IN MVP
    
    Returns summary statistics including total predictions, wins/losses, and win rate.
    
    Note: In the current MVP, won_predictions and lost_predictions will always be 0
    because we don't have market resolution logic. This endpoint will become fully
    functional when real Polymarket CLOB integration is added.
    
    Path Parameters:
        user_address: User's wallet address
    
    Returns:
        UserStatsResponse with aggregated stats
    """
    if not validate_eth_address(user_address):
        raise HTTPException(
            status_code=400, 
            detail="Invalid wallet address format. Expected 0x followed by 40 hex characters."
        )
    
    predictions = _get_user_predictions(user_address)
    
    # Calculate stats
    total = len(predictions)
    active = sum(1 for p in predictions if p.status == "active")
    won = sum(1 for p in predictions if p.status == "won")
    lost = sum(1 for p in predictions if p.status == "lost")
    volume = sum(p.amount for p in predictions)
    
    # Calculate win rate (only from resolved predictions)
    resolved = won + lost
    win_rate = (won / resolved * 100) if resolved > 0 else 0.0
    
    return UserStatsResponse(
        user_address=user_address.lower(),
        total_predictions=total,
        active_predictions=active,
        won_predictions=won,
        lost_predictions=lost,
        total_volume=volume,
        win_rate=round(win_rate, 2),
    )


# =============================================================================
# Health Check
# =============================================================================

@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """
    Health check endpoint for the Polymarket service.
    
    Returns service status and basic diagnostics.
    """
    return {
        "service": "polymarket",
        "status": "healthy",
        "timestamp": int(time.time()),
        "predictions_in_memory": _get_total_predictions_count(),
        "warning": "In-memory store - data lost on restart. Multi-worker deployments may have inconsistent data."
    }
