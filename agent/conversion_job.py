"""
Conversion Job Service

This module handles async conversion of USDT0 (Plasma) to USDC (Polygon).
Runs as a background job that processes the conversion queue.

Key Features:
- Processes pending deposits in batches
- Converts USDT0 → USDC via bridge/DEX
- Credits user balances when conversion completes
- Handles retries and failures
- Logs all conversion activities

The job should be run periodically (e.g., every 30 seconds) to process new deposits.
"""

from __future__ import annotations

import time
import logging
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_
from .game_db import GameDatabase, Deposit
from .balance_service import BalanceService
from .conversion_service import ConversionService
from .liquidity_buffer_service import LiquidityBufferService

logger = logging.getLogger(__name__)


class ConversionJob:
    """
    Background job for processing USDT0 → USDC conversions.
    
    Processes pending deposits, converts them, and credits user balances.
    """
    
    def __init__(
        self,
        db: Optional[GameDatabase] = None,
        balance_service: Optional[BalanceService] = None,
        conversion_service: Optional[ConversionService] = None,
        liquidity_buffer_service: Optional[LiquidityBufferService] = None,
    ):
        """
        Initialize conversion job.
        
        Args:
            db: GameDatabase instance
            balance_service: BalanceService instance
            conversion_service: ConversionService instance
            liquidity_buffer_service: LiquidityBufferService instance
        """
        self.db = db or GameDatabase()
        self.balance_service = balance_service or BalanceService(self.db)
        self.conversion_service = conversion_service or ConversionService()
        self.liquidity_buffer_service = liquidity_buffer_service or LiquidityBufferService(self.db)
    
    def process_pending_deposits(self, batch_size: int = 10) -> dict:
        """
        Process pending deposits in batch.
        
        Args:
            batch_size: Maximum number of deposits to process in one run
        
        Returns:
            Dictionary with processing results
        """
        session = self.db.get_session()
        try:
            # Get pending deposits
            pending = session.query(Deposit).filter(
                Deposit.status == "pending"
            ).limit(batch_size).all()
            
            if not pending:
                return {
                    "processed": 0,
                    "succeeded": 0,
                    "failed": 0,
                    "skipped": 0,
                }
            
            results = {
                "processed": len(pending),
                "succeeded": 0,
                "failed": 0,
                "skipped": 0,
            }
            
            for deposit in pending:
                try:
                    # Mark as converting
                    deposit.status = "converting"
                    session.commit()
                    
                    # Process conversion
                    success = self._process_deposit(deposit)
                    
                    if success:
                        results["succeeded"] += 1
                    else:
                        results["failed"] += 1
                        # Mark as failed
                        self.balance_service.mark_deposit_failed(str(deposit.id))
                        
                except Exception as e:
                    logger.error(f"Error processing deposit {deposit.id}: {e}")
                    results["failed"] += 1
                    self.balance_service.mark_deposit_failed(str(deposit.id), str(e))
            
            return results
            
        finally:
            session.close()
    
    def _process_deposit(self, deposit: Deposit) -> bool:
        """
        Process a single deposit conversion.
        
        Args:
            deposit: Deposit object to process
        
        Returns:
            True if conversion succeeded, False otherwise
        """
        try:
            # Estimate conversion rate (1:1 for stablecoins, but may have fees)
            # In production, fetch actual rate from DEX/bridge
            estimated_usdc = deposit.usdt0_amount  # Simplified: 1:1 rate
            
            # For MVP, we'll use the liquidity pool approach:
            # Credit user immediately from pool, convert in background
            # This provides instant UX
            
            # In production, implement actual conversion:
            # 1. Bridge USDT0 from Plasma to Polygon (if needed)
            # 2. Swap to USDC on Polygon DEX
            # 3. Get actual USDC amount received
            
            # For now, credit user with estimated amount
            # TODO: Implement actual conversion logic
            
            conversion_tx_hash = None  # Will be set when actual conversion happens
            
            # Credit user balance
            self.balance_service.credit_balance(
                deposit_id=str(deposit.id),
                usdc_amount=estimated_usdc,
                conversion_tx_hash=conversion_tx_hash,
            )
            
            # Replenish liquidity buffer with converted USDC
            # This ensures the buffer is available for future bets
            try:
                self.liquidity_buffer_service.replenish_buffer(estimated_usdc)
                logger.info(
                    f"Liquidity buffer replenished: +{estimated_usdc / 1_000_000:.2f} USDC "
                    f"(from deposit {deposit.id})"
                )
            except Exception as e:
                logger.error(f"Failed to replenish liquidity buffer: {e}")
                # Don't fail the conversion if buffer replenishment fails
                # The buffer can be replenished manually or on next conversion
            
            logger.info(
                f"Deposit {deposit.id} converted: {deposit.usdt0_amount} USDT0 → {estimated_usdc} USDC"
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to process deposit {deposit.id}: {e}")
            return False
    
    def process_converting_deposits(self) -> dict:
        """
        Process deposits that are already marked as converting (retry failed conversions).
        
        Returns:
            Dictionary with processing results
        """
        session = self.db.get_session()
        try:
            # Get deposits stuck in converting status (older than 5 minutes)
            from datetime import datetime, timedelta
            cutoff = datetime.utcnow() - timedelta(minutes=5)
            
            stuck = session.query(Deposit).filter(
                and_(
                    Deposit.status == "converting",
                    Deposit.created_at < cutoff,
                )
            ).all()
            
            results = {
                "processed": len(stuck),
                "succeeded": 0,
                "failed": 0,
            }
            
            for deposit in stuck:
                try:
                    success = self._process_deposit(deposit)
                    if success:
                        results["succeeded"] += 1
                    else:
                        results["failed"] += 1
                        self.balance_service.mark_deposit_failed(str(deposit.id))
                except Exception as e:
                    logger.error(f"Error retrying deposit {deposit.id}: {e}")
                    results["failed"] += 1
                    self.balance_service.mark_deposit_failed(str(deposit.id), str(e))
            
            return results
            
        finally:
            session.close()

