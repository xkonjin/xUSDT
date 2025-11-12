"""
Polymarket FastAPI Service

This module provides FastAPI endpoints for Polymarket betting integration:
- Market discovery and browsing
- Prediction submission and bet placement
- Order status tracking
- Leaderboard access

Endpoints are designed to be called from the Next.js frontend.
"""

from __future__ import annotations

import time
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Query, Path
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from .polymarket_client import PolymarketClient
from .betting_orchestrator import BettingOrchestrator
from .prediction_service import PredictionService
from .conversion_service import ConversionService
from .balance_service import BalanceService
from .user_profile_service import UserProfileService
from .polymarket_payment_handler import PolymarketPaymentHandler
from .liquidity_buffer_service import LiquidityBufferService
from .x402_models import PaymentSubmitted

app = FastAPI(title="Polymarket Prediction Platform API")


# Request/Response Models
class PlaceBetRequest(BaseModel):
    """Request model for placing a bet (using balance)."""
    user_address: str = Field(..., description="User's wallet address")
    market_id: str = Field(..., description="Polymarket market ID")
    market_question: str = Field(..., description="Market question text")
    outcome: str = Field(..., description="Prediction outcome: YES or NO")
    bet_amount_usdc: int = Field(..., description="Bet amount in USDC atomic units (6 decimals)")
    token_id: str = Field(..., description="Polymarket token ID (conditional token address)")
    predicted_price: Optional[float] = Field(None, description="Optional predicted price (0-1)")


class CreateProfileRequest(BaseModel):
    """Request model for creating/updating user profile."""
    user_address: str = Field(..., description="User's wallet address")
    display_name: Optional[str] = Field(None, description="Display name (3-20 chars, alphanumeric + underscore)")
    avatar_url: Optional[str] = Field(None, description="Optional avatar URL")
    bio: Optional[str] = Field(None, description="Optional bio text")


class PlaceBetResponse(BaseModel):
    """Response model for bet placement."""
    prediction_id: str
    polymarket_order_id: Optional[str]
    conversion_tx_hash: Optional[str]
    status: str
    usdc_amount: Optional[int]


# Initialize services (singleton pattern)
_polymarket_client: Optional[PolymarketClient] = None
_betting_orchestrator: Optional[BettingOrchestrator] = None
_prediction_service: Optional[PredictionService] = None
_balance_service: Optional[BalanceService] = None
_user_profile_service: Optional[UserProfileService] = None
_payment_handler: Optional[PolymarketPaymentHandler] = None
_liquidity_buffer_service: Optional[LiquidityBufferService] = None


def get_polymarket_client() -> PolymarketClient:
    """Get or create Polymarket client instance."""
    global _polymarket_client
    if _polymarket_client is None:
        _polymarket_client = PolymarketClient()
    return _polymarket_client


def get_betting_orchestrator() -> BettingOrchestrator:
    """Get or create betting orchestrator instance."""
    global _betting_orchestrator
    if _betting_orchestrator is None:
        _betting_orchestrator = BettingOrchestrator()
    return _betting_orchestrator


def get_prediction_service() -> PredictionService:
    """Get or create prediction service instance."""
    global _prediction_service
    if _prediction_service is None:
        _prediction_service = PredictionService()
    return _prediction_service


def get_balance_service() -> BalanceService:
    """Get or create balance service instance."""
    global _balance_service
    if _balance_service is None:
        _balance_service = BalanceService()
    return _balance_service


def get_user_profile_service() -> UserProfileService:
    """Get or create user profile service instance."""
    global _user_profile_service
    if _user_profile_service is None:
        _user_profile_service = UserProfileService()
    return _user_profile_service


def get_payment_handler() -> PolymarketPaymentHandler:
    """Get or create payment handler instance."""
    global _payment_handler
    if _payment_handler is None:
        _payment_handler = PolymarketPaymentHandler()
    return _payment_handler


def get_liquidity_buffer_service() -> LiquidityBufferService:
    """Get or create liquidity buffer service instance."""
    global _liquidity_buffer_service
    if _liquidity_buffer_service is None:
        _liquidity_buffer_service = LiquidityBufferService()
    return _liquidity_buffer_service


@app.get("/health")
def health() -> dict:
    """Health check endpoint."""
    return {"ok": True, "ts": int(time.time())}


@app.get("/markets")
def get_markets(
    active: Optional[bool] = Query(True, description="Filter by active status"),
    limit: Optional[int] = Query(100, ge=1, le=1000, description="Maximum results"),
    offset: Optional[int] = Query(0, ge=0, description="Pagination offset"),
) -> List[Dict[str, Any]]:
    """
    Get active markets from Polymarket.
    
    Returns list of available prediction markets.
    """
    try:
        client = get_polymarket_client()
        markets = client.get_markets(active=active, limit=limit, offset=offset)
        return markets
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch markets: {str(e)}")


@app.get("/markets/{market_id}")
def get_market(market_id: str = Path(..., description="Polymarket market ID")) -> Dict[str, Any]:
    """
    Get detailed information about a specific market.
    
    Returns market details including question, outcomes, and current prices.
    """
    try:
        client = get_polymarket_client()
        market = client.get_market(market_id)
        return market
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch market: {str(e)}")


@app.get("/markets/{market_id}/orderbook")
def get_orderbook(
    market_id: str = Path(..., description="Polymarket market ID"),
    token_id: Optional[str] = Query(None, description="Token ID (required if not in market data)"),
) -> Dict[str, Any]:
    """
    Get orderbook data for a market.
    
    Returns current bids and asks with prices and sizes.
    """
    try:
        client = get_polymarket_client()
        
        # If token_id not provided, try to get from market data
        if not token_id:
            market = client.get_market(market_id)
            # Extract token_id from market data (adjust based on actual API structure)
            token_id = market.get("token_id") or market.get("condition_id")
            if not token_id:
                raise ValueError("token_id required for orderbook")
        
        orderbook = client.get_orderbook(token_id)
        return orderbook
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch orderbook: {str(e)}")


@app.get("/balance")
def get_balance(
    user_address: str = Query(..., description="User's wallet address"),
) -> Dict[str, Any]:
    """
    Get user's USDC balance.
    
    Returns current balance, pending deposits, deposit history, and max bet amount.
    """
    try:
        balance_service = get_balance_service()
        buffer_service = get_liquidity_buffer_service()
        
        balance = balance_service.get_balance(user_address)
        
        # Calculate max bet (min of user balance and buffer balance)
        max_bet = buffer_service.get_max_bet_amount(balance["usdc_balance"])
        
        return {
            **balance,
            "max_bet_amount": max_bet,
            "max_bet_amount_formatted": max_bet / 1_000_000,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get balance: {str(e)}")


@app.get("/buffer/status")
def get_buffer_status() -> Dict[str, Any]:
    """
    Get global liquidity buffer status.
    
    Returns buffer balance, min/max sizes, and statistics.
    Useful for monitoring and admin purposes.
    """
    try:
        buffer_service = get_liquidity_buffer_service()
        return buffer_service.get_buffer_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get buffer status: {str(e)}")


@app.get("/buffer/max-bet")
def get_max_bet(
    user_address: str = Query(..., description="User's wallet address"),
) -> Dict[str, Any]:
    """
    Get maximum bet amount for a user.
    
    Max bet is the minimum of:
    - User's USDC balance
    - Global liquidity buffer balance
    
    Returns max bet amount and breakdown.
    """
    try:
        balance_service = get_balance_service()
        buffer_service = get_liquidity_buffer_service()
        
        user_balance_data = balance_service.get_balance(user_address)
        user_balance = user_balance_data["usdc_balance"]
        
        buffer_status = buffer_service.get_buffer_status()
        buffer_balance = buffer_status["usdc_balance"]
        
        max_bet = buffer_service.get_max_bet_amount(user_balance)
        
        return {
            "user_address": user_address,
            "user_balance": user_balance,
            "user_balance_formatted": user_balance / 1_000_000,
            "buffer_balance": buffer_balance,
            "buffer_balance_formatted": buffer_balance / 1_000_000,
            "max_bet_amount": max_bet,
            "max_bet_amount_formatted": max_bet / 1_000_000,
            "limiting_factor": "user_balance" if max_bet == user_balance else "buffer_balance",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get max bet: {str(e)}")


@app.post("/deposit")
def deposit(payment_submitted: PaymentSubmitted) -> Dict[str, Any]:
    """
    Handle USDT0 deposit via x402 payment.
    
    Accepts x402 PaymentSubmitted, settles payment, and queues conversion.
    Returns deposit confirmation.
    """
    try:
        handler = get_payment_handler()
        completed = handler.handle_deposit_payment(payment_submitted)
        
        # Convert to dict for response
        from hexbytes import HexBytes
        from web3.datastructures import AttributeDict
        from web3 import Web3
        
        def _jsonify(obj):
            if isinstance(obj, AttributeDict):
                return {k: _jsonify(v) for k, v in obj.items()}
            if isinstance(obj, HexBytes):
                return Web3.to_hex(obj)
            if isinstance(obj, (bytes, bytearray)):
                return Web3.to_hex(obj)
            if isinstance(obj, (list, tuple)):
                return [_jsonify(v) for v in obj]
            if isinstance(obj, dict):
                return {k: _jsonify(v) for k, v in obj.items()}
            return obj
        
        return _jsonify(completed.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process deposit: {str(e)}")


@app.post("/predict", response_model=PlaceBetResponse)
def place_bet(request: PlaceBetRequest) -> PlaceBetResponse:
    """
    Place a bet on a Polymarket market using pre-converted balance.
    
    This endpoint:
    1. Checks user has sufficient USDC balance
    2. Deducts balance
    3. Places order on Polymarket immediately
    4. Creates prediction record
    
    Returns prediction ID and order details.
    """
    try:
        orchestrator = get_betting_orchestrator()
        
        result = orchestrator.place_bet_from_balance(
            user_address=request.user_address,
            market_id=request.market_id,
            market_question=request.market_question,
            outcome=request.outcome,
            bet_amount_usdc=request.bet_amount_usdc,
            token_id=request.token_id,
            predicted_price=request.predicted_price,
        )
        
        return PlaceBetResponse(
            prediction_id=result["prediction_id"],
            polymarket_order_id=result.get("polymarket_order_id"),
            conversion_tx_hash=None,  # No conversion needed for balance-based betting
            status=result["status"],
            usdc_amount=result.get("usdc_amount"),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to place bet: {str(e)}")


@app.get("/predictions")
def get_predictions(
    user_address: str = Query(..., description="User's wallet address"),
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: Optional[int] = Query(100, ge=1, le=1000),
    offset: Optional[int] = Query(0, ge=0),
) -> List[Dict[str, Any]]:
    """
    Get user's predictions.
    
    Returns list of predictions with status and details.
    """
    try:
        service = get_prediction_service()
        predictions = service.get_user_predictions(
            user_address=user_address,
            status=status,
            limit=limit,
            offset=offset,
        )
        
        # Convert to dictionaries
        return [
            {
                "id": str(p.id),
                "user_address": p.user_address,
                "market_id": p.market_id,
                "market_question": p.market_question,
                "outcome": p.outcome,
                "predicted_price": float(p.predicted_price) if p.predicted_price else None,
                "bet_amount_usdt0": p.bet_amount_usdt0,
                "bet_amount_usdc": p.bet_amount_usdc,
                "status": p.status,
                "polymarket_order_id": p.polymarket_order_id,
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "resolved_at": p.resolved_at.isoformat() if p.resolved_at else None,
                "outcome_result": p.outcome_result,
                "profit_loss": float(p.profit_loss) if p.profit_loss else None,
                "resolved_price": float(p.resolved_price) if p.resolved_price else None,
            }
            for p in predictions
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch predictions: {str(e)}")


@app.get("/predictions/{prediction_id}")
def get_prediction(
    prediction_id: str = Path(..., description="Prediction UUID"),
) -> Dict[str, Any]:
    """
    Get details of a specific prediction.
    
    Returns prediction details including order status.
    """
    try:
        orchestrator = get_betting_orchestrator()
        result = orchestrator.check_order_status(prediction_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch prediction: {str(e)}")


@app.get("/stats/{user_address}")
def get_user_stats(user_address: str = Path(..., description="User's wallet address")) -> Dict[str, Any]:
    """
    Get prediction statistics for a user.
    
    Returns accuracy, volume, and P&L statistics.
    """
    try:
        service = get_prediction_service()
        stats = service.get_user_stats(user_address)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")


@app.get("/leaderboard")
def get_leaderboard(
    period: str = Query("alltime", description="Time period: daily, weekly, monthly, alltime"),
    limit: Optional[int] = Query(100, ge=1, le=1000),
    offset: Optional[int] = Query(0, ge=0),
) -> List[Dict[str, Any]]:
    """
    Get prediction leaderboard.
    
    Returns ranked list of users by prediction accuracy and P&L.
    """
    try:
        service = get_prediction_service()
        leaderboard = service.get_leaderboard(period=period, limit=limit, offset=offset)
        return leaderboard
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch leaderboard: {str(e)}")


@app.get("/conversion/quote")
def get_conversion_quote(
    usdt0_amount: int = Query(..., ge=1, description="Amount in USDT0 atomic units"),
) -> Dict[str, Any]:
    """
    Get conversion rate estimate for USDT0 → USDC.
    
    Returns estimated USDC amount and conversion rate.
    """
    try:
        conversion_service = ConversionService()
        quote = conversion_service.estimate_conversion_rate(usdt0_amount)
        return quote
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get conversion quote: {str(e)}")


@app.post("/profile")
def create_or_update_profile(request: CreateProfileRequest) -> Dict[str, Any]:
    """
    Create or update user profile.
    
    Sets display name and profile information.
    Display names are unique and appear on leaderboards.
    """
    try:
        profile_service = get_user_profile_service()
        profile = profile_service.create_or_update_profile(
            wallet_address=request.user_address,
            display_name=request.display_name,
            avatar_url=request.avatar_url,
            bio=request.bio,
        )
        return profile_service.get_profile_dict(request.user_address)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")


@app.get("/profile/{wallet_address}")
def get_profile(wallet_address: str = Path(..., description="Wallet address")) -> Dict[str, Any]:
    """
    Get user profile by wallet address.
    
    Returns profile information including display name.
    """
    try:
        profile_service = get_user_profile_service()
        return profile_service.get_profile_dict(wallet_address)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get profile: {str(e)}")


@app.get("/profile/check-name/{display_name}")
def check_name_availability(display_name: str = Path(..., description="Display name to check")) -> Dict[str, Any]:
    """
    Check if display name is available.
    
    Returns availability status and validation errors if any.
    """
    try:
        profile_service = get_user_profile_service()
        is_valid, error = profile_service.validate_display_name(display_name)
        is_available = profile_service.is_name_available(display_name) if is_valid else False
        
        return {
            "display_name": display_name,
            "is_valid": is_valid,
            "is_available": is_available,
            "error": error,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check name: {str(e)}")


@app.get("/deposits")
def get_deposits(
    user_address: str = Query(..., description="User's wallet address"),
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: Optional[int] = Query(100, ge=1, le=1000),
) -> List[Dict[str, Any]]:
    """
    Get user's deposit history.
    
    Returns list of deposits with conversion status.
    """
    try:
        balance_service = get_balance_service()
        deposits = balance_service.get_deposits(
            user_address=user_address,
            status=status,
            limit=limit,
        )
        
        return [
            {
                "id": str(d.id),
                "user_address": d.user_address,
                "invoice_id": d.invoice_id,
                "usdt0_amount": d.usdt0_amount,
                "usdc_amount": d.usdc_amount,
                "conversion_tx_hash": d.conversion_tx_hash,
                "status": d.status,
                "created_at": d.created_at.isoformat() if d.created_at else None,
                "completed_at": d.completed_at.isoformat() if d.completed_at else None,
            }
            for d in deposits
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch deposits: {str(e)}")

