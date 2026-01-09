"""
Polymarket Data Models

This module defines Pydantic models for Polymarket integration:
- Market: Represents a prediction market from Polymarket Gamma API
- Prediction: Represents a user's prediction/bet on a market
- Request/Response models for API endpoints

All models use Pydantic v2 for validation and serialization.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator
from uuid import uuid4


# =============================================================================
# Validation Helpers
# =============================================================================

# Regex pattern for Ethereum addresses: 0x followed by 40 hex characters
ETH_ADDRESS_PATTERN = re.compile(r"^0x[a-fA-F0-9]{40}$")


def validate_eth_address(address: str) -> bool:
    """
    Validate an Ethereum wallet address format.
    
    Checks for:
    - Starts with 0x
    - Followed by exactly 40 hexadecimal characters
    
    Note: This does not validate checksums. For checksum validation,
    use a library like eth-utils or web3.py in production.
    
    Args:
        address: Wallet address to validate
        
    Returns:
        True if valid format, False otherwise
    """
    return bool(ETH_ADDRESS_PATTERN.match(address))


# =============================================================================
# Market Models (from Polymarket Gamma API)
# =============================================================================

class MarketOutcome(BaseModel):
    """
    Represents a single outcome option in a prediction market.
    
    For binary markets: typically "Yes" and "No"
    For multi-outcome: can have multiple options like team names, candidates, etc.
    """
    # Unique identifier for this outcome (used for placing orders)
    outcome_id: str = Field(..., description="Unique outcome identifier")
    
    # Human-readable outcome name (e.g., "Yes", "No", "Trump", "Biden")
    name: str = Field(..., description="Outcome display name")
    
    # Current probability/price (0.0 to 1.0)
    price: float = Field(0.5, ge=0.0, le=1.0, description="Current price/probability")


class Market(BaseModel):
    """
    Represents a prediction market from Polymarket.
    
    Markets are fetched from the Polymarket Gamma API which provides:
    - Market metadata (question, description, end date)
    - Current pricing information
    - Volume and liquidity data
    
    Example market:
        {
            "id": "0x123...",
            "question": "Will Bitcoin reach $100k by end of 2024?",
            "outcomes": [{"name": "Yes", "price": 0.65}, {"name": "No", "price": 0.35}],
            "end_date": "2024-12-31T23:59:59Z"
        }
    """
    # Unique market identifier from Polymarket (condition_id)
    id: str = Field(..., description="Unique market identifier")
    
    # The prediction question being asked
    question: str = Field(..., description="Market question")
    
    # Optional detailed description of the market
    description: Optional[str] = Field(None, description="Market description")
    
    # When the market resolves/ends
    end_date: Optional[str] = Field(None, description="Market end date (ISO format)")
    
    # Available outcomes for this market
    outcomes: List[MarketOutcome] = Field(
        default_factory=list, 
        description="Available outcomes with prices"
    )
    
    # Trading volume in USD
    volume: Optional[float] = Field(None, description="Total trading volume in USD")
    
    # Available liquidity in USD
    liquidity: Optional[float] = Field(None, description="Available liquidity in USD")
    
    # Whether the market is currently active for trading
    active: bool = Field(True, description="Whether market is active")
    
    # Category/topic of the market
    category: Optional[str] = Field(None, description="Market category")
    
    # Image URL for the market
    image_url: Optional[str] = Field(None, alias="image", description="Market image URL")


class MarketsResponse(BaseModel):
    """Response model for listing multiple markets."""
    # List of markets
    markets: List[Market] = Field(default_factory=list)
    
    # Total count for pagination
    total: int = Field(0, description="Total number of markets")
    
    # Pagination info
    limit: int = Field(50, description="Results per page")
    offset: int = Field(0, description="Current offset")


# =============================================================================
# Prediction Models (user's bets)
# =============================================================================

def _utc_now() -> datetime:
    """Get current UTC time with timezone info (Python 3.12+ compatible)."""
    return datetime.now(timezone.utc)


class Prediction(BaseModel):
    """
    Represents a user's prediction on a market.
    
    In this MVP, predictions are stored in-memory and represent "mock" bets.
    No real orders are placed on Polymarket CLOB - this is a simulation.
    
    Attributes:
        id: Unique prediction identifier (UUID)
        user_address: Wallet address of the user
        market_id: Polymarket market ID
        market_question: Cached market question for display
        outcome: Selected outcome (e.g., "Yes", "No")
        amount: Bet amount in USDT0 atomic units (6 decimals)
        created_at: When the prediction was made (UTC)
        status: Current status (pending, active, resolved, won, lost)
    """
    # Unique prediction ID (generated UUID)
    # Using string instead of UUID type for JSON serialization simplicity
    id: str = Field(default_factory=lambda: str(uuid4()), description="Prediction UUID")
    
    # User's wallet address (lowercased for consistency)
    user_address: str = Field(..., description="User's wallet address")
    
    # Reference to the Polymarket market
    market_id: str = Field(..., description="Polymarket market ID")
    
    # Cached question for display without refetching
    market_question: str = Field(..., description="Market question (cached)")
    
    # The outcome the user predicted
    outcome: str = Field(..., description="Selected outcome (e.g., Yes, No)")
    
    # Bet amount in atomic units (6 decimals for USDT0)
    # Example: 1000000 = 1.00 USDT0
    amount: int = Field(..., ge=0, description="Bet amount in atomic units")
    
    # Formatted amount for display (set in constructor, not computed lazily)
    amount_formatted: float = Field(0.0, description="Bet amount in human-readable format")
    
    # Timestamp when prediction was created (timezone-aware UTC)
    # Using datetime.now(timezone.utc) instead of deprecated datetime.utcnow()
    created_at: datetime = Field(
        default_factory=_utc_now, 
        description="Prediction timestamp (UTC)"
    )
    
    # Current prediction status
    # - pending: Just submitted, not yet confirmed
    # - active: Prediction is active, waiting for market resolution
    # - resolved: Market resolved, outcome determined
    # - won: User's prediction was correct
    # - lost: User's prediction was incorrect
    status: str = Field("active", description="Prediction status")
    
    # Mock order ID (simulated Polymarket order)
    mock_order_id: Optional[str] = Field(None, description="Mock order ID for simulation")
    
    @field_validator("user_address")
    @classmethod
    def validate_user_address(cls, v: str) -> str:
        """Validate and normalize wallet address."""
        if not validate_eth_address(v):
            raise ValueError(f"Invalid Ethereum address format: {v}")
        return v.lower()  # Normalize to lowercase


# =============================================================================
# API Request/Response Models
# =============================================================================

class PredictRequest(BaseModel):
    """
    Request model for submitting a prediction.
    
    The frontend sends this when a user wants to predict on a market.
    All amounts are in atomic units (6 decimals for USDT0).
    """
    # User's wallet address
    user_address: str = Field(..., description="User's wallet address")
    
    # Market to predict on
    market_id: str = Field(..., description="Polymarket market ID")
    
    # Market question (cached for storage)
    market_question: str = Field(..., description="Market question")
    
    # Selected outcome
    outcome: str = Field(..., description="Selected outcome (Yes/No)")
    
    # Bet amount in atomic units (minimum 1000 = 0.001 USDT0)
    amount: int = Field(..., ge=1000, description="Bet amount in atomic units (min 0.001)")
    
    @field_validator("user_address")
    @classmethod
    def validate_address(cls, v: str) -> str:
        """Validate wallet address format."""
        if not validate_eth_address(v):
            raise ValueError("Invalid Ethereum address format. Expected 0x followed by 40 hex characters.")
        return v.lower()
    
    @field_validator("outcome")
    @classmethod
    def validate_outcome(cls, v: str) -> str:
        """Validate outcome is not empty."""
        if not v or not v.strip():
            raise ValueError("Outcome cannot be empty")
        return v.strip()


class PredictResponse(BaseModel):
    """
    Response model after submitting a prediction.
    
    Returns the created prediction along with a mock order confirmation.
    """
    # Whether the prediction was successfully created
    success: bool = Field(..., description="Whether prediction was successful")
    
    # Created prediction object
    prediction: Optional[Prediction] = Field(None, description="Created prediction")
    
    # Mock order ID (simulates Polymarket order placement)
    mock_order_id: Optional[str] = Field(None, description="Mock order ID")
    
    # Human-readable message
    message: str = Field("", description="Status message")
    
    # Error details if failed
    error: Optional[str] = Field(None, description="Error message if failed")


class UserStatsResponse(BaseModel):
    """
    Response model for user statistics.
    
    Provides summary stats for a user's prediction activity.
    
    NOTE: This is an experimental endpoint. In the current MVP implementation,
    won/lost stats will always be 0 since we don't have market resolution logic.
    This will be fully functional when real Polymarket CLOB integration is added.
    """
    # User's wallet address
    user_address: str = Field(..., description="User's wallet address")
    
    # Total predictions made
    total_predictions: int = Field(0, description="Total predictions made")
    
    # Predictions by status
    active_predictions: int = Field(0, description="Currently active predictions")
    won_predictions: int = Field(0, description="Predictions won")
    lost_predictions: int = Field(0, description="Predictions lost")
    
    # Total volume bet in atomic units
    total_volume: int = Field(0, description="Total volume in atomic units")
    
    # Win rate percentage (0-100)
    win_rate: float = Field(0.0, ge=0.0, le=100.0, description="Win rate percentage")
