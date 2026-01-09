"""
Polymarket API Client

This module provides a client for interacting with Polymarket's public APIs:
- Gamma API: Market discovery and metadata (public, no auth required)
- Mock order handling: Simulated order placement for MVP

The client fetches real market data from Polymarket but returns mock
confirmations for order placement (no real CLOB integration in MVP).

API Reference:
- Gamma API: https://gamma-api.polymarket.com
- Markets endpoint: GET /markets
- Events endpoint: GET /events

Usage:
    client = PolymarketClient()
    markets = await client.get_markets(limit=50)
    market = await client.get_market("0x123...")
"""

from __future__ import annotations

import re
import time
import logging
import atexit
from typing import List, Optional, Dict, Any
from uuid import uuid4
from datetime import datetime, timezone
import httpx

from .models import Market, MarketOutcome, MarketsResponse

# Configure logging for this module
logger = logging.getLogger(__name__)


# =============================================================================
# Input Validation
# =============================================================================

# Regex pattern for valid market IDs (alphanumeric, hyphens, underscores)
# Prevents path traversal and URL injection attacks
MARKET_ID_PATTERN = re.compile(r"^[a-zA-Z0-9_-]+$")


def validate_market_id(market_id: str) -> bool:
    """
    Validate a market ID to prevent injection attacks.
    
    Args:
        market_id: The market ID to validate
        
    Returns:
        True if valid, False otherwise
    """
    if not market_id or len(market_id) > 256:
        return False
    return bool(MARKET_ID_PATTERN.match(market_id))


def sanitize_market_id(market_id: str) -> str:
    """
    Sanitize a market ID for safe use in URLs.
    
    Removes any characters that could cause URL injection.
    
    Args:
        market_id: The market ID to sanitize
        
    Returns:
        Sanitized market ID
    """
    # URL-encode the ID to be safe
    from urllib.parse import quote
    return quote(market_id, safe="")


class PolymarketClient:
    """
    Client for Polymarket Gamma API.
    
    Fetches market data from Polymarket's public Gamma API.
    For order placement, returns mock confirmations (no real CLOB in MVP).
    
    Attributes:
        gamma_api_url: Base URL for Polymarket Gamma API
        timeout: HTTP request timeout in seconds
        use_mock_data: Whether to use mock data when API is unavailable
    """
    
    # Polymarket's public Gamma API endpoint
    # This API provides market discovery without authentication
    DEFAULT_GAMMA_URL = "https://gamma-api.polymarket.com"
    
    def __init__(
        self,
        gamma_api_url: Optional[str] = None,
        timeout: float = 30.0,
        use_mock_data: bool = True,
    ):
        """
        Initialize the Polymarket client.
        
        Args:
            gamma_api_url: Override for Gamma API URL (defaults to production)
            timeout: HTTP request timeout in seconds
            use_mock_data: If True, return mock data when API fails
        """
        self.gamma_api_url = (gamma_api_url or self.DEFAULT_GAMMA_URL).rstrip("/")
        self.timeout = timeout
        self.use_mock_data = use_mock_data
        
        # HTTP client for async requests (lazy initialization)
        self._client: Optional[httpx.AsyncClient] = None
    
    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create the async HTTP client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=self.timeout,
                headers={
                    "Accept": "application/json",
                    "User-Agent": "xUSDT-Polymarket-Client/1.0",
                },
            )
        return self._client
    
    async def close(self) -> None:
        """
        Close the HTTP client connection.
        
        IMPORTANT: Call this when shutting down the application to prevent
        connection leaks. This should be called in FastAPI's lifespan handler.
        """
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None
            logger.info("Polymarket client connection closed")
    
    # =========================================================================
    # Market Discovery (Gamma API)
    # =========================================================================
    
    async def get_markets(
        self,
        active: bool = True,
        limit: int = 50,
        offset: int = 0,
    ) -> MarketsResponse:
        """
        Fetch markets from Polymarket Gamma API.
        
        The Gamma API provides market discovery with metadata including:
        - Market question and description
        - Current outcome prices
        - Volume and liquidity
        - Resolution dates
        
        Args:
            active: If True, only return active (tradeable) markets
            limit: Maximum number of markets to return (1-100)
            offset: Pagination offset
        
        Returns:
            MarketsResponse with list of markets
        
        Note:
            Falls back to mock data if API is unavailable and use_mock_data=True
        """
        try:
            client = await self._get_client()
            
            # Build query parameters
            # Gamma API supports: active, limit, offset, order, ascending
            params: Dict[str, Any] = {
                "limit": min(limit, 100),  # Cap at 100
                "offset": offset,
            }
            if active:
                params["active"] = "true"
            
            # Make request to Gamma API markets endpoint
            response = await client.get(
                f"{self.gamma_api_url}/markets",
                params=params,
            )
            response.raise_for_status()
            
            data = response.json()
            
            # Parse response - Gamma API returns array of market objects
            markets = self._parse_markets(data)
            
            return MarketsResponse(
                markets=markets,
                total=len(markets),  # Gamma API doesn't return total
                limit=limit,
                offset=offset,
            )
            
        except httpx.HTTPError as e:
            logger.error(f"Failed to fetch markets from Gamma API: {e}")
            if self.use_mock_data:
                logger.info("Falling back to mock market data")
                return self._get_mock_markets()
            raise
        except Exception as e:
            logger.error(f"Unexpected error fetching markets: {e}")
            if self.use_mock_data:
                return self._get_mock_markets()
            raise
    
    async def get_market(self, market_id: str) -> Optional[Market]:
        """
        Fetch a single market by ID from Polymarket.
        
        Args:
            market_id: The market's condition_id or slug
        
        Returns:
            Market object if found, None otherwise
            
        Note:
            Market ID is sanitized before use to prevent URL injection.
        """
        # Sanitize market_id to prevent URL injection
        safe_market_id = sanitize_market_id(market_id)
        
        try:
            client = await self._get_client()
            
            # Fetch by condition_id (sanitized)
            response = await client.get(
                f"{self.gamma_api_url}/markets/{safe_market_id}",
            )
            
            if response.status_code == 404:
                return None
                
            response.raise_for_status()
            data = response.json()
            
            # Parse single market response
            markets = self._parse_markets([data] if isinstance(data, dict) else data)
            return markets[0] if markets else None
            
        except httpx.HTTPError as e:
            logger.error(f"Failed to fetch market {market_id}: {e}")
            if self.use_mock_data:
                # Return a mock market if available
                mock_markets = self._get_mock_markets().markets
                for m in mock_markets:
                    if m.id == market_id:
                        return m
            return None
    
    def _parse_markets(self, raw_markets: List[Dict[str, Any]]) -> List[Market]:
        """
        Parse raw market data from Gamma API into Market objects.
        
        The Gamma API returns markets with various fields. This method
        normalizes them into our Market model.
        
        Args:
            raw_markets: List of raw market dicts from API
        
        Returns:
            List of parsed Market objects
        """
        markets: List[Market] = []
        
        for raw in raw_markets:
            try:
                # Extract market ID (condition_id is the primary identifier)
                market_id = raw.get("condition_id") or raw.get("id", "")
                
                # Skip markets without valid ID
                if not market_id:
                    continue
                
                # Parse outcomes from tokens array
                outcomes: List[MarketOutcome] = []
                tokens = raw.get("tokens", [])
                
                for token in tokens:
                    outcome = MarketOutcome(
                        outcome_id=token.get("token_id", ""),
                        name=token.get("outcome", "Unknown"),
                        price=float(token.get("price", 0.5)),
                    )
                    outcomes.append(outcome)
                
                # If no tokens, create default Yes/No outcomes
                if not outcomes:
                    outcomes = [
                        MarketOutcome(outcome_id="yes", name="Yes", price=0.5),
                        MarketOutcome(outcome_id="no", name="No", price=0.5),
                    ]
                
                # Build Market object
                market = Market(
                    id=market_id,
                    question=raw.get("question", "Unknown question"),
                    description=raw.get("description"),
                    end_date=raw.get("end_date_iso") or raw.get("end_date"),
                    outcomes=outcomes,
                    volume=float(raw.get("volume", 0) or 0),
                    liquidity=float(raw.get("liquidity", 0) or 0),
                    active=raw.get("active", True),
                    category=raw.get("category"),
                    image_url=raw.get("image"),
                )
                markets.append(market)
                
            except Exception as e:
                logger.warning(f"Failed to parse market: {e}")
                continue
        
        return markets
    
    # =========================================================================
    # Mock Order Placement (MVP)
    # =========================================================================
    
    def create_mock_order(
        self,
        market_id: str,
        outcome: str,
        amount: int,
        user_address: str,
    ) -> Dict[str, Any]:
        """
        Create a mock order confirmation.
        
        In the MVP, we don't actually place orders on Polymarket's CLOB.
        This method returns a simulated order confirmation for testing.
        
        Args:
            market_id: Market condition_id
            outcome: Selected outcome (Yes/No)
            amount: Bet amount in atomic units
            user_address: User's wallet address
        
        Returns:
            Mock order confirmation dict
        """
        mock_order_id = f"mock-{uuid4().hex[:16]}"
        
        return {
            "success": True,
            "order_id": mock_order_id,
            "market_id": market_id,
            "outcome": outcome,
            "amount": amount,
            "amount_formatted": amount / 1_000_000,
            "user_address": user_address.lower(),
            "status": "filled",  # Mock orders are instantly "filled"
            "fill_price": 0.50,  # Mock fill at 50%
            "timestamp": int(time.time()),
            "mock": True,  # Flag indicating this is a mock order
            "message": "This is a simulated order. No real funds were used.",
        }
    
    # =========================================================================
    # Mock Data (for testing without API)
    # =========================================================================
    
    def _get_mock_markets(self) -> MarketsResponse:
        """
        Generate mock market data for testing.
        
        Returns realistic-looking prediction markets when the API is unavailable.
        Useful for development and testing.
        """
        mock_markets = [
            Market(
                id="mock-btc-100k-2025",
                question="Will Bitcoin reach $100,000 by end of 2025?",
                description="Resolves YES if Bitcoin's price reaches or exceeds $100,000 USD on any major exchange before January 1, 2026.",
                end_date="2025-12-31T23:59:59Z",
                outcomes=[
                    MarketOutcome(outcome_id="yes", name="Yes", price=0.72),
                    MarketOutcome(outcome_id="no", name="No", price=0.28),
                ],
                volume=5_250_000.00,
                liquidity=850_000.00,
                active=True,
                category="Crypto",
            ),
            Market(
                id="mock-eth-10k-2025",
                question="Will Ethereum reach $10,000 by end of 2025?",
                description="Resolves YES if ETH reaches $10,000 on major exchanges.",
                end_date="2025-12-31T23:59:59Z",
                outcomes=[
                    MarketOutcome(outcome_id="yes", name="Yes", price=0.35),
                    MarketOutcome(outcome_id="no", name="No", price=0.65),
                ],
                volume=2_100_000.00,
                liquidity=420_000.00,
                active=True,
                category="Crypto",
            ),
            Market(
                id="mock-fed-rate-cut",
                question="Will the Fed cut rates in Q1 2025?",
                description="Resolves YES if the Federal Reserve announces a rate cut in Q1 2025.",
                end_date="2025-03-31T23:59:59Z",
                outcomes=[
                    MarketOutcome(outcome_id="yes", name="Yes", price=0.58),
                    MarketOutcome(outcome_id="no", name="No", price=0.42),
                ],
                volume=1_800_000.00,
                liquidity=350_000.00,
                active=True,
                category="Economics",
            ),
            Market(
                id="mock-ai-agi-2030",
                question="Will AGI be achieved by 2030?",
                description="Resolves YES if a credible AI lab announces achievement of Artificial General Intelligence.",
                end_date="2030-12-31T23:59:59Z",
                outcomes=[
                    MarketOutcome(outcome_id="yes", name="Yes", price=0.22),
                    MarketOutcome(outcome_id="no", name="No", price=0.78),
                ],
                volume=950_000.00,
                liquidity=180_000.00,
                active=True,
                category="Technology",
            ),
            Market(
                id="mock-spacex-mars-2026",
                question="Will SpaceX land humans on Mars by 2026?",
                description="Resolves YES if SpaceX successfully lands humans on Mars surface.",
                end_date="2026-12-31T23:59:59Z",
                outcomes=[
                    MarketOutcome(outcome_id="yes", name="Yes", price=0.08),
                    MarketOutcome(outcome_id="no", name="No", price=0.92),
                ],
                volume=680_000.00,
                liquidity=120_000.00,
                active=True,
                category="Space",
            ),
        ]
        
        return MarketsResponse(
            markets=mock_markets,
            total=len(mock_markets),
            limit=50,
            offset=0,
        )


# =============================================================================
# Client Factory with Settings
# =============================================================================

# Global client instance for use across the application
_client_instance: Optional[PolymarketClient] = None


def get_polymarket_client() -> PolymarketClient:
    """
    Get or create the Polymarket client instance.
    
    Reads configuration from Settings if available, otherwise uses defaults.
    The client is created lazily on first access.
    
    Returns:
        PolymarketClient instance configured from Settings
    """
    global _client_instance
    
    if _client_instance is None:
        # Try to read from Settings if available
        try:
            from ..config import Settings
            settings = Settings()
            _client_instance = PolymarketClient(
                gamma_api_url=settings.POLYMARKET_GAMMA_API_URL,
                timeout=settings.POLYMARKET_API_TIMEOUT,
                use_mock_data=settings.POLYMARKET_USE_MOCK,
            )
            logger.info(f"Polymarket client initialized with URL: {settings.POLYMARKET_GAMMA_API_URL}")
        except Exception as e:
            # Fallback to defaults if Settings not available
            logger.warning(f"Could not load Settings, using defaults: {e}")
            _client_instance = PolymarketClient()
    
    return _client_instance


async def close_polymarket_client() -> None:
    """
    Close the global Polymarket client.
    
    Should be called during application shutdown to prevent connection leaks.
    Use this in FastAPI's lifespan handler:
    
        @asynccontextmanager
        async def lifespan(app: FastAPI):
            yield
            await close_polymarket_client()
    """
    global _client_instance
    if _client_instance is not None:
        await _client_instance.close()
        _client_instance = None
