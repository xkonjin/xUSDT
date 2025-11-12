"""
Liquidity Buffer Service

This module manages the global liquidity buffer on Polygon for instant betting.
The buffer limits the maximum bet amount globally across all users.

Key Features:
- Buffer balance tracking (current, min, max)
- Buffer operations (deduct, replenish, check)
- Max bet calculation (min of user balance and buffer balance)
- Buffer monitoring and alerts

Flow:
1. User deposits USDT0 → Conversion completes → Buffer replenished
2. User places bet → Buffer checked → Buffer deducted → Bet placed
3. Max bet = min(user_balance, buffer_balance)
"""

from __future__ import annotations

from typing import Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from .game_db import GameDatabase, LiquidityBuffer


class LiquidityBufferService:
    """
    Service for managing the global liquidity buffer on Polygon.
    
    The buffer is a singleton (only one row) that tracks available USDC
    for instant betting. It limits the maximum bet amount globally.
    """
    
    def __init__(self, db: Optional[GameDatabase] = None):
        """
        Initialize liquidity buffer service.
        
        Args:
            db: GameDatabase instance (creates new one if not provided)
        """
        self.db = db or GameDatabase()
        self._buffer_id = "global"  # Singleton identifier
    
    def get_buffer(self) -> LiquidityBuffer:
        """
        Get the global liquidity buffer record.
        
        Returns:
            LiquidityBuffer object (creates if doesn't exist)
        """
        session = self.db.get_session()
        try:
            buffer = session.query(LiquidityBuffer).filter(
                LiquidityBuffer.buffer_id == self._buffer_id
            ).first()
            
            if not buffer:
                # Create buffer if doesn't exist
                buffer = LiquidityBuffer(
                    buffer_id=self._buffer_id,
                    usdc_balance=0,
                    min_buffer_size=10_000_000_000,  # 10,000 USDC default
                    total_deposited=0,
                    total_withdrawn=0,
                )
                session.add(buffer)
                session.commit()
                session.refresh(buffer)
            
            return buffer
        finally:
            session.close()
    
    def get_buffer_status(self) -> Dict[str, Any]:
        """
        Get current buffer status and statistics.
        
        Returns:
            Dictionary with buffer information including max bet calculation
        """
        buffer = self.get_buffer()
        
        return {
            **buffer.to_dict(),
            "available_for_betting": int(buffer.usdc_balance),  # Current available balance
            "available_for_betting_formatted": float(buffer.usdc_balance / 1_000_000),
            "is_low": buffer.usdc_balance < buffer.min_buffer_size,  # Alert if below minimum
            "utilization_percent": (
                float((buffer.total_withdrawn / buffer.total_deposited) * 100)
                if buffer.total_deposited > 0
                else 0.0
            ),
        }
    
    def get_max_bet_amount(self, user_balance: int) -> int:
        """
        Calculate maximum bet amount for a user.
        
        Max bet is the minimum of:
        - User's USDC balance
        - Buffer's available balance
        
        Args:
            user_balance: User's USDC balance in atomic units
        
        Returns:
            Maximum bet amount in atomic units
        """
        buffer = self.get_buffer()
        return min(user_balance, buffer.usdc_balance)
    
    def check_buffer_sufficient(self, amount: int) -> bool:
        """
        Check if buffer has sufficient balance for a bet.
        
        Args:
            amount: Required amount in USDC atomic units
        
        Returns:
            True if buffer has sufficient balance, False otherwise
        """
        buffer = self.get_buffer()
        return buffer.usdc_balance >= amount
    
    def deduct_buffer(self, amount: int) -> LiquidityBuffer:
        """
        Deduct from buffer when a bet is placed.
        
        Args:
            amount: Amount to deduct in USDC atomic units
        
        Returns:
            Updated LiquidityBuffer object
        
        Raises:
            ValueError: If buffer has insufficient balance
        """
        session = self.db.get_session()
        try:
            buffer = session.query(LiquidityBuffer).filter(
                LiquidityBuffer.buffer_id == self._buffer_id
            ).first()
            
            if not buffer:
                raise ValueError("Liquidity buffer not found")
            
            if buffer.usdc_balance < amount:
                raise ValueError(
                    f"Insufficient buffer balance: have {buffer.usdc_balance}, need {amount}. "
                    f"Max bet is currently {buffer.usdc_balance / 1_000_000:.2f} USDC"
                )
            
            buffer.usdc_balance -= amount
            buffer.total_withdrawn += amount
            buffer.updated_at = datetime.utcnow()
            
            session.commit()
            session.refresh(buffer)
            return buffer
        finally:
            session.close()
    
    def replenish_buffer(self, amount: int) -> LiquidityBuffer:
        """
        Replenish buffer when conversion completes.
        
        Args:
            amount: Amount to add in USDC atomic units
        
        Returns:
            Updated LiquidityBuffer object
        """
        session = self.db.get_session()
        try:
            buffer = session.query(LiquidityBuffer).filter(
                LiquidityBuffer.buffer_id == self._buffer_id
            ).first()
            
            if not buffer:
                # Create buffer if doesn't exist
                buffer = LiquidityBuffer(
                    buffer_id=self._buffer_id,
                    usdc_balance=amount,
                    min_buffer_size=10_000_000_000,
                    total_deposited=amount,
                    total_withdrawn=0,
                    last_replenished_at=datetime.utcnow(),
                )
                session.add(buffer)
            else:
                buffer.usdc_balance += amount
                buffer.total_deposited += amount
                buffer.last_replenished_at = datetime.utcnow()
                buffer.updated_at = datetime.utcnow()
            
            session.commit()
            session.refresh(buffer)
            return buffer
        finally:
            session.close()
    
    def set_min_buffer_size(self, min_size: int) -> LiquidityBuffer:
        """
        Set minimum buffer size (for alerts and monitoring).
        
        Args:
            min_size: Minimum buffer size in USDC atomic units
        
        Returns:
            Updated LiquidityBuffer object
        """
        session = self.db.get_session()
        try:
            buffer = session.query(LiquidityBuffer).filter(
                LiquidityBuffer.buffer_id == self._buffer_id
            ).first()
            
            if not buffer:
                raise ValueError("Liquidity buffer not found")
            
            buffer.min_buffer_size = min_size
            buffer.updated_at = datetime.utcnow()
            
            session.commit()
            session.refresh(buffer)
            return buffer
        finally:
            session.close()
    
    def set_max_buffer_size(self, max_size: Optional[int]) -> LiquidityBuffer:
        """
        Set maximum buffer size (optional cap).
        
        Args:
            max_size: Maximum buffer size in USDC atomic units (None to remove cap)
        
        Returns:
            Updated LiquidityBuffer object
        """
        session = self.db.get_session()
        try:
            buffer = session.query(LiquidityBuffer).filter(
                LiquidityBuffer.buffer_id == self._buffer_id
            ).first()
            
            if not buffer:
                raise ValueError("Liquidity buffer not found")
            
            buffer.max_buffer_size = max_size
            buffer.updated_at = datetime.utcnow()
            
            session.commit()
            session.refresh(buffer)
            return buffer
        finally:
            session.close()
    
    def refund_buffer(self, amount: int) -> LiquidityBuffer:
        """
        Refund buffer (e.g., when bet fails or is cancelled).
        
        Args:
            amount: Amount to refund in USDC atomic units
        
        Returns:
            Updated LiquidityBuffer object
        """
        session = self.db.get_session()
        try:
            buffer = session.query(LiquidityBuffer).filter(
                LiquidityBuffer.buffer_id == self._buffer_id
            ).first()
            
            if not buffer:
                raise ValueError("Liquidity buffer not found")
            
            buffer.usdc_balance += amount
            buffer.total_withdrawn = max(0, buffer.total_withdrawn - amount)  # Don't go negative
            buffer.updated_at = datetime.utcnow()
            
            session.commit()
            session.refresh(buffer)
            return buffer
        finally:
            session.close()

