"""
Balance Service

This module manages user USDC balances for instant Polymarket betting.
Users deposit USDT0, which gets converted to USDC in the background.
The USDC balance is credited and can be used immediately for betting.

Key Features:
- Balance tracking (deposits, credits, deductions)
- Deposit management (USDT0 → USDC conversion tracking)
- Balance operations (check, deduct, credit)
- Withdrawal support (USDC → USDT0)

Flow:
1. User deposits USDT0 → Record deposit → Queue conversion
2. Conversion completes → Credit balance → User can bet
3. User places bet → Deduct from balance → Place order
4. Market resolves → Add winnings to balance
"""

from __future__ import annotations

from typing import Dict, Any, Optional
from uuid import uuid4
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_
from .game_db import GameDatabase, UserBalance, Deposit


class BalanceService:
    """
    Service for managing user USDC balances.
    
    Handles deposits, conversions, balance credits, and deductions.
    """
    
    def __init__(self, db: Optional[GameDatabase] = None):
        """
        Initialize balance service.
        
        Args:
            db: GameDatabase instance (creates new one if not provided)
        """
        self.db = db or GameDatabase()
    
    def get_balance(self, user_address: str) -> Dict[str, Any]:
        """
        Get user's current USDC balance.
        
        Args:
            user_address: User's wallet address
        
        Returns:
            Dictionary with balance information
        """
        session = self.db.get_session()
        try:
            balance = session.query(UserBalance).filter(
                UserBalance.user_address == user_address.lower()
            ).first()
            
            if not balance:
                # Create balance record if doesn't exist
                balance = UserBalance(
                    user_address=user_address.lower(),
                    usdc_balance=0,
                    pending_deposits=0,
                )
                session.add(balance)
                session.commit()
                session.refresh(balance)
            
            return {
                "user_address": balance.user_address,
                "usdc_balance": balance.usdc_balance,
                "usdc_balance_formatted": balance.usdc_balance / 1_000_000,  # Convert to decimal
                "pending_deposits": balance.pending_deposits,
                "pending_deposits_formatted": balance.pending_deposits / 1_000_000,
                "total_deposited": balance.total_deposited,
                "total_withdrawn": balance.total_withdrawn,
            }
        finally:
            session.close()
    
    def create_deposit(
        self,
        user_address: str,
        usdt0_amount: int,
        invoice_id: Optional[str] = None,
    ) -> Deposit:
        """
        Create a deposit record for USDT0 → USDC conversion.
        
        Args:
            user_address: User's wallet address
            usdt0_amount: Amount deposited in USDT0 atomic units
            invoice_id: Optional x402 invoice ID
        
        Returns:
            Created Deposit object
        """
        session = self.db.get_session()
        try:
            deposit = Deposit(
                user_address=user_address.lower(),
                invoice_id=invoice_id,
                usdt0_amount=usdt0_amount,
                status="pending",
            )
            session.add(deposit)
            
            # Update user balance pending deposits
            balance = session.query(UserBalance).filter(
                UserBalance.user_address == user_address.lower()
            ).first()
            
            if not balance:
                balance = UserBalance(
                    user_address=user_address.lower(),
                    usdc_balance=0,
                    pending_deposits=usdt0_amount,
                    total_deposited=usdt0_amount,
                )
                session.add(balance)
            else:
                balance.pending_deposits += usdt0_amount
                balance.total_deposited += usdt0_amount
            
            session.commit()
            session.refresh(deposit)
            return deposit
        finally:
            session.close()
    
    def credit_balance(
        self,
        deposit_id: str,
        usdc_amount: int,
        conversion_tx_hash: Optional[str] = None,
    ) -> UserBalance:
        """
        Credit user's balance after conversion completes.
        
        Args:
            deposit_id: Deposit UUID
            usdc_amount: Amount to credit in USDC atomic units
            conversion_tx_hash: Conversion transaction hash
        
        Returns:
            Updated UserBalance object
        """
        session = self.db.get_session()
        try:
            deposit = session.query(Deposit).filter(Deposit.id == deposit_id).first()
            if not deposit:
                raise ValueError(f"Deposit not found: {deposit_id}")
            
            # Update deposit
            deposit.usdc_amount = usdc_amount
            deposit.conversion_tx_hash = conversion_tx_hash
            deposit.status = "completed"
            deposit.completed_at = datetime.utcnow()
            
            # Update user balance
            balance = session.query(UserBalance).filter(
                UserBalance.user_address == deposit.user_address
            ).first()
            
            if not balance:
                balance = UserBalance(
                    user_address=deposit.user_address,
                    usdc_balance=usdc_amount,
                    pending_deposits=0,
                )
                session.add(balance)
            else:
                balance.usdc_balance += usdc_amount
                balance.pending_deposits -= deposit.usdt0_amount
            
            session.commit()
            session.refresh(balance)
            return balance
        finally:
            session.close()
    
    def deduct_balance(
        self,
        user_address: str,
        usdc_amount: int,
    ) -> UserBalance:
        """
        Deduct from user's balance for bet placement.
        
        Args:
            user_address: User's wallet address
            usdc_amount: Amount to deduct in USDC atomic units
        
        Returns:
            Updated UserBalance object
        
        Raises:
            ValueError: If insufficient balance
        """
        session = self.db.get_session()
        try:
            balance = session.query(UserBalance).filter(
                UserBalance.user_address == user_address.lower()
            ).first()
            
            if not balance:
                raise ValueError(f"No balance found for user: {user_address}")
            
            if balance.usdc_balance < usdc_amount:
                raise ValueError(
                    f"Insufficient balance: have {balance.usdc_balance}, need {usdc_amount}"
                )
            
            balance.usdc_balance -= usdc_amount
            session.commit()
            session.refresh(balance)
            return balance
        finally:
            session.close()
    
    def add_balance(
        self,
        user_address: str,
        usdc_amount: int,
    ) -> UserBalance:
        """
        Add to user's balance (e.g., from winnings).
        
        Args:
            user_address: User's wallet address
            usdc_amount: Amount to add in USDC atomic units
        
        Returns:
            Updated UserBalance object
        """
        session = self.db.get_session()
        try:
            balance = session.query(UserBalance).filter(
                UserBalance.user_address == user_address.lower()
            ).first()
            
            if not balance:
                balance = UserBalance(
                    user_address=user_address.lower(),
                    usdc_balance=usdc_amount,
                )
                session.add(balance)
            else:
                balance.usdc_balance += usdc_amount
            
            session.commit()
            session.refresh(balance)
            return balance
        finally:
            session.close()
    
    def get_deposits(
        self,
        user_address: str,
        status: Optional[str] = None,
        limit: int = 100,
    ) -> list[Deposit]:
        """
        Get user's deposit history.
        
        Args:
            user_address: User's wallet address
            status: Optional filter by status
            limit: Maximum results
        
        Returns:
            List of Deposit objects
        """
        session = self.db.get_session()
        try:
            query = session.query(Deposit).filter(
                Deposit.user_address == user_address.lower()
            )
            
            if status:
                query = query.filter(Deposit.status == status)
            
            return query.order_by(Deposit.created_at.desc()).limit(limit).all()
        finally:
            session.close()
    
    def mark_deposit_converting(self, deposit_id: str) -> Deposit:
        """
        Mark deposit as converting (conversion job started).
        
        Args:
            deposit_id: Deposit UUID
        
        Returns:
            Updated Deposit object
        """
        session = self.db.get_session()
        try:
            deposit = session.query(Deposit).filter(Deposit.id == deposit_id).first()
            if not deposit:
                raise ValueError(f"Deposit not found: {deposit_id}")
            
            deposit.status = "converting"
            session.commit()
            session.refresh(deposit)
            return deposit
        finally:
            session.close()
    
    def mark_deposit_failed(self, deposit_id: str, error: Optional[str] = None) -> Deposit:
        """
        Mark deposit as failed (conversion failed).
        
        Args:
            deposit_id: Deposit UUID
            error: Optional error message
        
        Returns:
            Updated Deposit object
        """
        session = self.db.get_session()
        try:
            deposit = session.query(Deposit).filter(Deposit.id == deposit_id).first()
            if not deposit:
                raise ValueError(f"Deposit not found: {deposit_id}")
            
            deposit.status = "failed"
            
            # Refund pending deposit amount
            balance = session.query(UserBalance).filter(
                UserBalance.user_address == deposit.user_address
            ).first()
            
            if balance:
                balance.pending_deposits -= deposit.usdt0_amount
            
            session.commit()
            session.refresh(deposit)
            return deposit
        finally:
            session.close()

