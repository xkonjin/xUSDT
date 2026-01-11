"""
FastAPI Routes for Plasma Predictions

Endpoints for market data, betting, and user portfolios.
"""

from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from .models import (
    PredictionMarket,
    MarketCategory,
    Bet,
    BetStatus,
    MarketFilters,
    MarketResponse,
    PlaceBetRequest,
    PlaceBetResponse,
    CashOutRequest,
    CashOutResponse,
    LeaderboardEntry,
    UserStatsResponse,
)
from .sync import (
    sync_markets_from_polymarket,
    get_cached_markets,
    get_market_by_id,
    get_market_count,
)

router = APIRouter(prefix="/predictions", tags=["predictions"])

# In-memory stores (replace with database in production)
_USER_BETS: dict[str, List[Bet]] = {}
_LEADERBOARD: List[LeaderboardEntry] = []


# =============================================================================
# Market Endpoints
# =============================================================================

@router.get("/markets", response_model=MarketResponse)
async def list_markets(
    category: Optional[str] = Query(None, description="Market category"),
    search: Optional[str] = Query(None, description="Search query"),
    sort_by: Optional[str] = Query("volume", description="Sort field"),
    resolved: Optional[bool] = Query(None, description="Filter by resolved"),
    page: int = Query(0, ge=0, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
):
    """
    List prediction markets with filtering and pagination.
    """
    cat = MarketCategory(category) if category and category != "all" else None
    
    markets, total = await get_cached_markets(
        category=cat,
        search=search,
        resolved=resolved,
        sort_by=sort_by,
        page=page,
        limit=limit,
    )
    
    return MarketResponse(
        markets=markets,
        total=total,
        page=page,
        has_more=(page + 1) * limit < total,
    )


@router.get("/markets/{market_id}", response_model=PredictionMarket)
async def get_market(market_id: str):
    """Get a single market by ID."""
    market = await get_market_by_id(market_id)
    if not market:
        raise HTTPException(status_code=404, detail="Market not found")
    return market


@router.post("/sync")
async def trigger_sync():
    """Manually trigger market sync from Polymarket."""
    markets = await sync_markets_from_polymarket()
    return {"synced": len(markets), "total": get_market_count()}


# =============================================================================
# Betting Endpoints
# =============================================================================

@router.post("/bet", response_model=PlaceBetResponse)
async def place_bet(request: PlaceBetRequest):
    """
    Place a bet on a prediction market.
    
    Accepts EIP-3009 authorization for gasless deposit+swap.
    """
    # Validate market exists
    market = await get_market_by_id(request.market_id)
    if not market:
        raise HTTPException(status_code=404, detail="Market not found")
    
    if market.resolved:
        raise HTTPException(status_code=400, detail="Market already resolved")
    
    # TODO: Implement actual betting flow:
    # 1. Validate EIP-3009 signature
    # 2. Build depositAndBuy transaction
    # 3. Submit to relayer
    # 4. Wait for confirmation
    # 5. Calculate shares received
    
    # For MVP, return mock success
    import uuid
    tx_hash = f"0x{uuid.uuid4().hex}"
    
    amount = int(request.amount) / 1e6  # Convert from atomic
    price = market.yes_price if request.outcome.upper() == "YES" else market.no_price
    shares = amount / price
    
    # Store bet
    user_address = request.authorization.get("from", "0x")
    bet = Bet(
        id=str(uuid.uuid4()),
        market_id=market.id,
        user_address=user_address,
        outcome=request.outcome.upper(),
        shares=shares,
        cost_basis=amount,
        current_value=shares * price,
        pnl=0,
        pnl_percent=0,
        status=BetStatus.ACTIVE,
        placed_at=datetime.utcnow(),
        tx_hash=tx_hash,
    )
    
    if user_address not in _USER_BETS:
        _USER_BETS[user_address] = []
    _USER_BETS[user_address].append(bet)
    
    return PlaceBetResponse(
        success=True,
        tx_hash=tx_hash,
        shares=shares,
    )


@router.post("/cashout", response_model=CashOutResponse)
async def cash_out(request: CashOutRequest):
    """
    Cash out a bet position before resolution.
    """
    # Find the bet
    bet_found = None
    user_address = None
    
    for addr, bets in _USER_BETS.items():
        for bet in bets:
            if bet.id == request.bet_id:
                bet_found = bet
                user_address = addr
                break
        if bet_found:
            break
    
    if not bet_found:
        raise HTTPException(status_code=404, detail="Bet not found")
    
    if bet_found.status != BetStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Bet is not active")
    
    # TODO: Implement actual cash out:
    # 1. Build sellAndWithdraw transaction
    # 2. Submit to relayer
    # 3. Wait for confirmation
    
    # Mock success
    import uuid
    tx_hash = f"0x{uuid.uuid4().hex}"
    amount = bet_found.current_value
    
    # Update bet status
    bet_found.status = BetStatus.CASHED_OUT
    bet_found.resolved_at = datetime.utcnow()
    
    return CashOutResponse(
        success=True,
        tx_hash=tx_hash,
        amount=amount,
    )


# =============================================================================
# Portfolio Endpoints
# =============================================================================

@router.get("/bets")
async def get_user_bets(
    user: str = Query(..., description="User address"),
    status: Optional[str] = Query(None, description="Filter by status"),
) -> List[Bet]:
    """Get all bets for a user."""
    bets = _USER_BETS.get(user.lower(), [])
    
    if status:
        status_enum = BetStatus(status)
        bets = [b for b in bets if b.status == status_enum]
    
    # Update current values based on market prices
    for bet in bets:
        if bet.status == BetStatus.ACTIVE:
            market = await get_market_by_id(bet.market_id)
            if market:
                price = market.yes_price if bet.outcome == "YES" else market.no_price
                bet.current_value = bet.shares * price
                bet.pnl = bet.current_value - bet.cost_basis
                bet.pnl_percent = bet.pnl / bet.cost_basis if bet.cost_basis > 0 else 0
    
    return bets


@router.get("/stats/{address}", response_model=UserStatsResponse)
async def get_user_stats(address: str):
    """Get statistics for a user."""
    bets = _USER_BETS.get(address.lower(), [])
    
    active_bets = [b for b in bets if b.status == BetStatus.ACTIVE]
    resolved_bets = [b for b in bets if b.status in (BetStatus.WON, BetStatus.LOST)]
    
    total_won = sum(b.pnl for b in resolved_bets if b.pnl > 0)
    total_lost = sum(abs(b.pnl) for b in resolved_bets if b.pnl < 0)
    
    wins = len([b for b in resolved_bets if b.pnl > 0])
    win_rate = wins / len(resolved_bets) if resolved_bets else 0
    
    portfolio_value = sum(b.current_value for b in active_bets)
    total_pnl = sum(b.pnl for b in bets)
    
    return UserStatsResponse(
        address=address,
        total_bets=len(bets),
        active_bets=len(active_bets),
        total_won=total_won,
        total_lost=total_lost,
        win_rate=win_rate,
        portfolio_value=portfolio_value,
        total_pnl=total_pnl,
    )


# =============================================================================
# Leaderboard Endpoints
# =============================================================================

@router.get("/leaderboard", response_model=List[LeaderboardEntry])
async def get_leaderboard(
    sort_by: str = Query("profit", description="Sort by: profit, accuracy, volume"),
    period: str = Query("all-time", description="Period: weekly, monthly, all-time"),
    limit: int = Query(10, ge=1, le=100),
):
    """Get the prediction leaderboard."""
    # Build leaderboard from user stats
    entries = []
    
    for address, bets in _USER_BETS.items():
        resolved = [b for b in bets if b.status in (BetStatus.WON, BetStatus.LOST)]
        if len(resolved) < 10:  # Minimum 10 bets to qualify
            continue
        
        profit = sum(b.pnl for b in resolved)
        wins = len([b for b in resolved if b.pnl > 0])
        accuracy = wins / len(resolved) if resolved else 0
        volume = sum(b.cost_basis for b in bets)
        
        entries.append(LeaderboardEntry(
            rank=0,  # Set after sorting
            address=address,
            profit=profit,
            accuracy=accuracy,
            total_bets=len(bets),
            volume=volume,
        ))
    
    # Sort
    if sort_by == "accuracy":
        entries.sort(key=lambda e: e.accuracy, reverse=True)
    elif sort_by == "volume":
        entries.sort(key=lambda e: e.volume, reverse=True)
    else:
        entries.sort(key=lambda e: e.profit, reverse=True)
    
    # Assign ranks
    for i, entry in enumerate(entries[:limit]):
        entry.rank = i + 1
    
    return entries[:limit]


# =============================================================================
# Health Check
# =============================================================================

@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "markets_cached": get_market_count(),
        "timestamp": datetime.utcnow().isoformat(),
    }
