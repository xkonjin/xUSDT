"""
WebSocket support for Plasma Predictions

Real-time price updates and market activity streaming.
"""

import asyncio
import json
from typing import Dict, List, Set
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect
from dataclasses import dataclass, asdict


@dataclass
class PriceUpdate:
    """Price update message."""
    type: str = "price_update"
    market_id: str = ""
    yes_price: float = 0.5
    no_price: float = 0.5
    volume: int = 0
    timestamp: str = ""


@dataclass
class BetActivity:
    """New bet activity message."""
    type: str = "bet_activity"
    market_id: str = ""
    user: str = ""
    outcome: str = ""
    amount: float = 0
    timestamp: str = ""


class ConnectionManager:
    """Manages WebSocket connections for market subscriptions."""
    
    def __init__(self):
        # market_id -> set of websockets
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # all connections (for broadcast)
        self.all_connections: Set[WebSocket] = set()
    
    async def connect(self, websocket: WebSocket, market_id: str = None):
        """Accept a new WebSocket connection."""
        await websocket.accept()
        self.all_connections.add(websocket)
        
        if market_id:
            if market_id not in self.active_connections:
                self.active_connections[market_id] = set()
            self.active_connections[market_id].add(websocket)
    
    def disconnect(self, websocket: WebSocket, market_id: str = None):
        """Remove a WebSocket connection."""
        self.all_connections.discard(websocket)
        
        if market_id and market_id in self.active_connections:
            self.active_connections[market_id].discard(websocket)
            if not self.active_connections[market_id]:
                del self.active_connections[market_id]
    
    async def send_personal(self, websocket: WebSocket, message: dict):
        """Send message to a specific connection."""
        try:
            await websocket.send_json(message)
        except Exception:
            pass
    
    async def broadcast_to_market(self, market_id: str, message: dict):
        """Broadcast message to all connections subscribed to a market."""
        if market_id not in self.active_connections:
            return
        
        disconnected = set()
        for websocket in self.active_connections[market_id]:
            try:
                await websocket.send_json(message)
            except Exception:
                disconnected.add(websocket)
        
        # Clean up disconnected sockets
        for ws in disconnected:
            self.disconnect(ws, market_id)
    
    async def broadcast_all(self, message: dict):
        """Broadcast message to all connected clients."""
        disconnected = set()
        for websocket in self.all_connections:
            try:
                await websocket.send_json(message)
            except Exception:
                disconnected.add(websocket)
        
        # Clean up disconnected sockets
        for ws in disconnected:
            self.all_connections.discard(ws)
    
    def get_connection_count(self, market_id: str = None) -> int:
        """Get count of active connections."""
        if market_id:
            return len(self.active_connections.get(market_id, set()))
        return len(self.all_connections)


# Global connection manager
manager = ConnectionManager()


async def handle_websocket(websocket: WebSocket, market_id: str = None):
    """
    Handle WebSocket connection for a market.
    
    Usage:
        @app.websocket("/ws/market/{market_id}")
        async def websocket_endpoint(websocket: WebSocket, market_id: str):
            await handle_websocket(websocket, market_id)
    """
    await manager.connect(websocket, market_id)
    try:
        while True:
            # Keep connection alive, handle incoming messages
            data = await websocket.receive_text()
            
            # Handle subscription changes
            try:
                message = json.loads(data)
                if message.get("type") == "subscribe":
                    new_market = message.get("market_id")
                    if new_market:
                        if new_market not in manager.active_connections:
                            manager.active_connections[new_market] = set()
                        manager.active_connections[new_market].add(websocket)
                        await websocket.send_json({
                            "type": "subscribed",
                            "market_id": new_market
                        })
                elif message.get("type") == "unsubscribe":
                    old_market = message.get("market_id")
                    if old_market and old_market in manager.active_connections:
                        manager.active_connections[old_market].discard(websocket)
                        await websocket.send_json({
                            "type": "unsubscribed",
                            "market_id": old_market
                        })
                elif message.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
            except json.JSONDecodeError:
                pass
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, market_id)


async def broadcast_price_update(
    market_id: str,
    yes_price: float,
    no_price: float,
    volume: int = 0
):
    """Broadcast a price update for a market."""
    update = PriceUpdate(
        market_id=market_id,
        yes_price=yes_price,
        no_price=no_price,
        volume=volume,
        timestamp=datetime.utcnow().isoformat(),
    )
    await manager.broadcast_to_market(market_id, asdict(update))


async def broadcast_bet_activity(
    market_id: str,
    user: str,
    outcome: str,
    amount: float
):
    """Broadcast a new bet activity."""
    activity = BetActivity(
        market_id=market_id,
        user=f"{user[:6]}...{user[-4:]}" if len(user) > 10 else user,
        outcome=outcome,
        amount=amount,
        timestamp=datetime.utcnow().isoformat(),
    )
    await manager.broadcast_to_market(market_id, asdict(activity))


def get_websocket_stats() -> dict:
    """Get WebSocket connection statistics."""
    return {
        "total_connections": manager.get_connection_count(),
        "subscribed_markets": len(manager.active_connections),
        "connections_per_market": {
            mid: len(conns) 
            for mid, conns in manager.active_connections.items()
        }
    }
