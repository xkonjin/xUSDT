"""
Market Sync Service

Synchronizes prediction markets from Polymarket Gamma API to Plasma.
Handles market creation, price updates, and resolution tracking.
"""

import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Optional
from ..polymarket.client import get_polymarket_client
from .models import PredictionMarket, MarketCategory

logger = logging.getLogger(__name__)

# In-memory market cache (replace with Redis/PostgreSQL in production)
_MARKET_CACHE: Dict[str, PredictionMarket] = {}
_LAST_SYNC: Optional[datetime] = None
_SYNC_INTERVAL = 30  # seconds


def _map_polymarket_category(tags: List[str]) -> MarketCategory:
    """Map Polymarket tags to our categories."""
    tag_map = {
        "politics": MarketCategory.POLITICS,
        "crypto": MarketCategory.CRYPTO,
        "sports": MarketCategory.SPORTS,
        "technology": MarketCategory.TECH,
        "tech": MarketCategory.TECH,
        "entertainment": MarketCategory.ENTERTAINMENT,
        "science": MarketCategory.SCIENCE,
        "finance": MarketCategory.FINANCE,
        "economics": MarketCategory.FINANCE,
    }
    
    for tag in tags:
        tag_lower = tag.lower()
        if tag_lower in tag_map:
            return tag_map[tag_lower]
    
    return MarketCategory.ALL


def _polymarket_to_plasma_market(poly_market: dict) -> PredictionMarket:
    """Convert Polymarket market data to our model."""
    # Extract prices from tokens
    yes_price = 0.5
    no_price = 0.5
    
    tokens = poly_market.get("tokens", [])
    for token in tokens:
        if token.get("outcome", "").upper() == "YES":
            yes_price = float(token.get("price", 0.5))
        elif token.get("outcome", "").upper() == "NO":
            no_price = float(token.get("price", 0.5))
    
    # Normalize prices (should sum to ~1)
    total = yes_price + no_price
    if total > 0:
        yes_price = yes_price / total
        no_price = no_price / total
    
    # Parse end date
    end_date_str = poly_market.get("end_date_iso", poly_market.get("end_date"))
    if end_date_str:
        try:
            end_date = datetime.fromisoformat(end_date_str.replace("Z", "+00:00"))
        except ValueError:
            end_date = datetime.utcnow()
    else:
        end_date = datetime.utcnow()
    
    # Build market ID
    condition_id = poly_market.get("condition_id", poly_market.get("id", "unknown"))
    market_id = f"plasma-{condition_id[:16]}"
    
    return PredictionMarket(
        id=market_id,
        polymarket_id=poly_market.get("condition_id"),
        condition_id=condition_id,
        question=poly_market.get("question", "Unknown"),
        description=poly_market.get("description"),
        category=_map_polymarket_category(poly_market.get("tags", [])),
        end_date=end_date,
        resolved=poly_market.get("closed", False),
        outcome=poly_market.get("winner") if poly_market.get("closed") else None,
        yes_price=yes_price,
        no_price=no_price,
        volume_24h=float(poly_market.get("volume_24h", 0)),
        total_volume=float(poly_market.get("volume", 0)),
        liquidity=float(poly_market.get("liquidity", 0)),
        image_url=poly_market.get("image"),
        polymarket_url=f"https://polymarket.com/event/{poly_market.get('slug', '')}",
        amm_address=None,  # Set when deployed on Plasma
        created_at=datetime.utcnow(),
    )


async def sync_markets_from_polymarket(limit: int = 50) -> List[PredictionMarket]:
    """
    Sync markets from Polymarket Gamma API.
    
    Args:
        limit: Maximum number of markets to fetch
        
    Returns:
        List of synchronized markets
    """
    global _LAST_SYNC
    
    try:
        client = get_polymarket_client()
        
        # Fetch active markets
        events = await client.get_events(active=True, closed=False, limit=limit)
        
        synced_markets = []
        
        for event in events:
            for market_data in event.get("markets", [event]):
                try:
                    market = _polymarket_to_plasma_market(market_data)
                    _MARKET_CACHE[market.id] = market
                    synced_markets.append(market)
                except Exception as e:
                    logger.warning(f"Failed to parse market: {e}")
                    continue
        
        _LAST_SYNC = datetime.utcnow()
        logger.info(f"Synced {len(synced_markets)} markets from Polymarket")
        
        return synced_markets
        
    except Exception as e:
        logger.error(f"Failed to sync markets: {e}")
        return list(_MARKET_CACHE.values())


async def get_cached_markets(
    category: Optional[MarketCategory] = None,
    search: Optional[str] = None,
    resolved: Optional[bool] = None,
    sort_by: str = "volume",
    page: int = 0,
    limit: int = 20,
) -> tuple[List[PredictionMarket], int]:
    """
    Get markets from cache with filtering and pagination.
    
    Returns:
        Tuple of (markets, total_count)
    """
    # Check if cache needs refresh
    if not _MARKET_CACHE or (
        _LAST_SYNC and (datetime.utcnow() - _LAST_SYNC).seconds > _SYNC_INTERVAL
    ):
        await sync_markets_from_polymarket()
    
    # Filter markets
    markets = list(_MARKET_CACHE.values())
    
    if category and category != MarketCategory.ALL:
        markets = [m for m in markets if m.category == category]
    
    if search:
        search_lower = search.lower()
        markets = [
            m for m in markets
            if search_lower in m.question.lower() or
               (m.description and search_lower in m.description.lower())
        ]
    
    if resolved is not None:
        markets = [m for m in markets if m.resolved == resolved]
    
    # Sort
    if sort_by == "volume":
        markets.sort(key=lambda m: m.total_volume, reverse=True)
    elif sort_by == "endDate":
        markets.sort(key=lambda m: m.end_date)
    elif sort_by == "liquidity":
        markets.sort(key=lambda m: m.liquidity, reverse=True)
    elif sort_by == "newest":
        markets.sort(key=lambda m: m.created_at, reverse=True)
    else:
        markets.sort(key=lambda m: m.volume_24h, reverse=True)
    
    total = len(markets)
    
    # Paginate
    start = page * limit
    end = start + limit
    markets = markets[start:end]
    
    return markets, total


async def get_market_by_id(market_id: str) -> Optional[PredictionMarket]:
    """Get a single market by ID."""
    if market_id in _MARKET_CACHE:
        return _MARKET_CACHE[market_id]
    
    # Try to find by polymarket ID or condition ID
    for market in _MARKET_CACHE.values():
        if market.polymarket_id == market_id or market.condition_id == market_id:
            return market
    
    return None


async def update_market_prices(market_id: str, yes_price: float, no_price: float):
    """Update market prices (called by price oracle)."""
    if market_id in _MARKET_CACHE:
        market = _MARKET_CACHE[market_id]
        market.yes_price = yes_price
        market.no_price = no_price


async def resolve_market(market_id: str, outcome: str):
    """Mark a market as resolved (called by resolution oracle)."""
    if market_id in _MARKET_CACHE:
        market = _MARKET_CACHE[market_id]
        market.resolved = True
        market.outcome = outcome


def get_market_count() -> int:
    """Get total number of cached markets."""
    return len(_MARKET_CACHE)


def clear_cache():
    """Clear the market cache (for testing)."""
    global _MARKET_CACHE, _LAST_SYNC
    _MARKET_CACHE = {}
    _LAST_SYNC = None
