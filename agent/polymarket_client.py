"""
Polymarket API Client

This module provides a client for interacting with Polymarket's CLOB (Central Limit Order Book) API.
It handles authentication, market data fetching, and order placement with Builder Program attribution.

Key Features:
- HMAC-SHA256 signature authentication (similar to Coinbase Pro)
- Market discovery and orderbook data
- Order placement with Builder attribution headers
- Order status tracking and trade history

API Documentation: https://docs.polymarket.com/developers/builders/builder-intro
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import time
from typing import Dict, Any, List, Optional
import requests
from .config import settings


class PolymarketClient:
    """
    Client for Polymarket CLOB API with Builder Program support.
    
    Handles authentication, market data fetching, and order placement.
    Uses HMAC-SHA256 signature authentication similar to Coinbase Pro.
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        secret: Optional[str] = None,
        passphrase: Optional[str] = None,
        base_url: Optional[str] = None,
        builder_key: Optional[str] = None,
    ):
        """
        Initialize Polymarket API client.
        
        Args:
            api_key: Polymarket API key (defaults to settings.POLYMARKET_API_KEY)
            secret: Polymarket API secret (defaults to settings.POLYMARKET_SECRET)
            passphrase: Polymarket API passphrase (defaults to settings.POLYMARKET_PASSPHRASE)
            base_url: API base URL (defaults to settings.POLYMARKET_API_URL)
            builder_key: Builder Program key for order attribution (optional)
        """
        self.api_key = api_key or settings.POLYMARKET_API_KEY
        self.secret = secret or settings.POLYMARKET_SECRET
        self.passphrase = passphrase or settings.POLYMARKET_PASSPHRASE
        self.base_url = (base_url or settings.POLYMARKET_API_URL).rstrip("/")
        self.builder_key = builder_key or settings.POLYMARKET_BUILDER_KEY
        
        if not self.api_key or not self.secret or not self.passphrase:
            raise ValueError("Polymarket API credentials must be configured")
    
    def _generate_signature(
        self,
        timestamp: str,
        method: str,
        request_path: str,
        body: str = "",
    ) -> str:
        """
        Generate HMAC-SHA256 signature for API authentication.
        
        Polymarket uses a signature scheme similar to Coinbase Pro:
        - Create message: timestamp + method + request_path + body
        - Sign with HMAC-SHA256 using the secret
        - Base64 encode the signature
        
        Args:
            timestamp: Unix timestamp as string
            method: HTTP method (GET, POST, etc.)
            request_path: API endpoint path (e.g., "/orders")
            body: Request body as string (empty for GET requests)
        
        Returns:
            Base64-encoded signature string
        """
        # Create the message to sign
        message = timestamp + method + request_path + body
        
        # Decode the secret from base64
        secret_bytes = base64.b64decode(self.secret)
        
        # Generate HMAC-SHA256 signature
        signature = hmac.new(
            secret_bytes,
            message.encode("utf-8"),
            hashlib.sha256
        ).digest()
        
        # Base64 encode the signature
        return base64.b64encode(signature).decode("utf-8")
    
    def _get_headers(
        self,
        method: str,
        request_path: str,
        body: str = "",
    ) -> Dict[str, str]:
        """
        Generate authentication headers for API request.
        
        Args:
            method: HTTP method
            request_path: API endpoint path
            body: Request body as string
        
        Returns:
            Dictionary of headers including authentication
        """
        timestamp = str(int(time.time()))
        signature = self._generate_signature(timestamp, method, request_path, body)
        
        headers = {
            "POLY_API_KEY": self.api_key,
            "POLY_SIGNATURE": signature,
            "POLY_TIMESTAMP": timestamp,
            "POLY_PASSPHRASE": self.passphrase,
            "Content-Type": "application/json",
        }
        
        # Add Builder attribution header if configured
        if self.builder_key:
            headers["X-Builder-Key"] = self.builder_key
        
        return headers
    
    def _request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Make authenticated API request to Polymarket.
        
        Args:
            method: HTTP method (GET, POST, DELETE, etc.)
            endpoint: API endpoint path (e.g., "/orders")
            params: Query parameters for GET requests
            data: Request body data for POST requests
        
        Returns:
            JSON response as dictionary
        
        Raises:
            requests.HTTPError: If API request fails
        """
        request_path = endpoint
        body = ""
        
        # Prepare request body for POST/PUT requests
        if data:
            import json
            body = json.dumps(data)
        
        # Add query parameters to path for GET requests
        if params:
            import urllib.parse
            query_string = urllib.parse.urlencode(params)
            request_path = f"{endpoint}?{query_string}"
        
        # Get authentication headers
        headers = self._get_headers(method, request_path, body)
        
        # Make the request
        url = f"{self.base_url}{endpoint}"
        response = requests.request(
            method=method,
            url=url,
            headers=headers,
            params=params if method == "GET" else None,
            json=data if method != "GET" else None,
            timeout=30,
        )
        
        # Raise exception for HTTP errors
        response.raise_for_status()
        
        # Return JSON response
        return response.json()
    
    def get_markets(
        self,
        active: Optional[bool] = True,
        limit: Optional[int] = 100,
        offset: Optional[int] = 0,
    ) -> List[Dict[str, Any]]:
        """
        Fetch active markets from Polymarket.
        
        Args:
            active: Filter by active status (default: True)
            limit: Maximum number of results (default: 100)
            offset: Pagination offset (default: 0)
        
        Returns:
            List of market dictionaries
        """
        params = {
            "active": active,
            "limit": limit,
            "offset": offset,
        }
        return self._request("GET", "/markets", params=params)
    
    def get_market(self, market_id: str) -> Dict[str, Any]:
        """
        Get detailed information about a specific market.
        
        Args:
            market_id: Polymarket market ID
        
        Returns:
            Market details dictionary
        """
        return self._request("GET", f"/markets/{market_id}")
    
    def get_orderbook(self, token_id: str) -> Dict[str, Any]:
        """
        Get orderbook data for a market token.
        
        Args:
            token_id: Market token ID (conditional token address)
        
        Returns:
            Orderbook data with bids and asks
        """
        return self._request("GET", f"/book", params={"token_id": token_id})
    
    def place_order(
        self,
        token_id: str,
        side: str,
        size: str,
        price: str,
        order_type: str = "LIMIT",
        client_order_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Place an order on Polymarket CLOB.
        
        Args:
            token_id: Market token ID (conditional token address)
            side: Order side - "BUY" or "SELL"
            size: Order size in token units (as string to preserve precision)
            price: Order price (as string to preserve precision)
            order_type: Order type - "LIMIT" or "MARKET" (default: "LIMIT")
            client_order_id: Optional client-provided order ID for tracking
        
        Returns:
            Order response dictionary with order_id and status
        """
        order_data = {
            "token_id": token_id,
            "side": side.upper(),
            "size": size,
            "price": price,
            "order_type": order_type.upper(),
        }
        
        if client_order_id:
            order_data["client_order_id"] = client_order_id
        
        return self._request("POST", "/orders", data=order_data)
    
    def get_order(self, order_id: str) -> Dict[str, Any]:
        """
        Get order status by order ID.
        
        Args:
            order_id: Polymarket order ID
        
        Returns:
            Order details dictionary
        """
        return self._request("GET", f"/orders/{order_id}")
    
    def get_active_orders(
        self,
        token_id: Optional[str] = None,
        limit: Optional[int] = 100,
    ) -> List[Dict[str, Any]]:
        """
        Get active orders for the authenticated account.
        
        Args:
            token_id: Optional filter by token ID
            limit: Maximum number of results (default: 100)
        
        Returns:
            List of active order dictionaries
        """
        params = {"limit": limit}
        if token_id:
            params["token_id"] = token_id
        
        return self._request("GET", "/orders", params=params)
    
    def cancel_order(self, order_id: str) -> Dict[str, Any]:
        """
        Cancel an active order.
        
        Args:
            order_id: Polymarket order ID to cancel
        
        Returns:
            Cancellation response dictionary
        """
        return self._request("DELETE", f"/orders/{order_id}")
    
    def cancel_all_orders(self, token_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Cancel all active orders, optionally filtered by token ID.
        
        Args:
            token_id: Optional token ID to filter cancellations
        
        Returns:
            Cancellation response dictionary
        """
        params = {}
        if token_id:
            params["token_id"] = token_id
        
        return self._request("DELETE", "/orders", params=params)
    
    def get_trades(
        self,
        token_id: Optional[str] = None,
        limit: Optional[int] = 100,
        offset: Optional[int] = 0,
    ) -> List[Dict[str, Any]]:
        """
        Get trade history for the authenticated account.
        
        Args:
            token_id: Optional filter by token ID
            limit: Maximum number of results (default: 100)
            offset: Pagination offset (default: 0)
        
        Returns:
            List of trade dictionaries
        """
        params = {"limit": limit, "offset": offset}
        if token_id:
            params["token_id"] = token_id
        
        return self._request("GET", "/trades", params=params)
    
    def get_balance(self) -> Dict[str, Any]:
        """
        Get account balance (USDC on Polygon).
        
        Returns:
            Balance dictionary with available and locked amounts
        """
        return self._request("GET", "/balance")

