"""
Prediction Competition Service

This module handles the prediction competition logic:
- Tracking user predictions and outcomes
- Calculating prediction accuracy and statistics
- Managing leaderboards for different time periods
- Updating rankings based on accuracy, volume, and P&L

Key Features:
- Prediction tracking with Polymarket market integration
- Accuracy calculation (win rate)
- Leaderboard generation (daily, weekly, monthly, all-time)
- Automatic leaderboard updates when markets resolve
"""

from __future__ import annotations

from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional, Tuple
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_
from .game_db import GameDatabase, Prediction, PredictionLeaderboard
from .user_profile_service import UserProfileService


class PredictionService:
    """
    Service for managing prediction competitions and leaderboards.
    
    Handles prediction tracking, accuracy calculation, and leaderboard management.
    """
    
    def __init__(self, db: Optional[GameDatabase] = None):
        """
        Initialize prediction service.
        
        Args:
            db: GameDatabase instance (creates new one if not provided)
        """
        self.db = db or GameDatabase()
        self.profile_service = UserProfileService(self.db)
    
    def create_prediction(
        self,
        user_address: str,
        market_id: str,
        market_question: str,
        outcome: str,
        bet_amount_usdt0: int,
        bet_amount_usdc: Optional[int] = None,
        predicted_price: Optional[float] = None,
    ) -> Prediction:
        """
        Create a new prediction record.
        
        Args:
            user_address: User's wallet address
            market_id: Polymarket market ID
            market_question: Market question text
            outcome: Prediction outcome (YES/NO or outcome ID)
            bet_amount_usdt0: Bet amount in USDT0 atomic units
            predicted_price: Optional predicted price (0-1)
        
        Returns:
            Created Prediction object
        """
        session = self.db.get_session()
        try:
            prediction = Prediction(
                user_address=user_address.lower(),
                market_id=market_id,
                market_question=market_question,
                outcome=outcome,
                predicted_price=Decimal(str(predicted_price)) if predicted_price else None,
                bet_amount_usdt0=bet_amount_usdt0,
                bet_amount_usdc=bet_amount_usdc,
                status="pending",
            )
            session.add(prediction)
            session.commit()
            session.refresh(prediction)
            return prediction
        finally:
            session.close()
    
    def update_prediction_order(
        self,
        prediction_id: str,
        polymarket_order_id: str,
        bet_amount_usdc: Optional[int] = None,
        conversion_tx_hash: Optional[str] = None,
        status: str = "placed",
    ) -> Prediction:
        """
        Update prediction with Polymarket order details.
        
        Args:
            prediction_id: Prediction UUID
            polymarket_order_id: Polymarket order ID
            bet_amount_usdc: Converted USDC amount
            conversion_tx_hash: Conversion transaction hash
            status: New status (default: "placed")
        
        Returns:
            Updated Prediction object
        """
        session = self.db.get_session()
        try:
            prediction = session.query(Prediction).filter(Prediction.id == prediction_id).first()
            if not prediction:
                raise ValueError(f"Prediction not found: {prediction_id}")
            
            prediction.polymarket_order_id = polymarket_order_id
            prediction.status = status
            if bet_amount_usdc is not None:
                prediction.bet_amount_usdc = bet_amount_usdc
            if conversion_tx_hash:
                prediction.conversion_tx_hash = conversion_tx_hash
            
            session.commit()
            session.refresh(prediction)
            return prediction
        finally:
            session.close()
    
    def resolve_prediction(
        self,
        prediction_id: str,
        outcome_result: str,
        resolved_price: float,
        profit_loss: Optional[float] = None,
    ) -> Prediction:
        """
        Mark a prediction as resolved and calculate P&L.
        
        Args:
            prediction_id: Prediction UUID
            outcome_result: Actual outcome (YES/NO)
            resolved_price: Final market price (0-1)
            profit_loss: Optional P&L amount (calculated if not provided)
        
        Returns:
            Updated Prediction object
        """
        session = self.db.get_session()
        try:
            prediction = session.query(Prediction).filter(Prediction.id == prediction_id).first()
            if not prediction:
                raise ValueError(f"Prediction not found: {prediction_id}")
            
            prediction.status = "resolved"
            prediction.outcome_result = outcome_result
            prediction.resolved_price = Decimal(str(resolved_price))
            prediction.resolved_at = datetime.utcnow()
            
            # Calculate P&L if not provided
            if profit_loss is None:
                # Simple P&L calculation: if correct, profit = bet_amount * (1 - price)
                # If wrong, loss = bet_amount
                if prediction.outcome.upper() == outcome_result.upper():
                    # Correct prediction - profit based on price
                    price = Decimal(str(resolved_price))
                    if prediction.outcome.upper() == "YES":
                        profit_loss = float(prediction.bet_amount_usdc or prediction.bet_amount_usdt0) * float(1 - price)
                    else:  # NO
                        profit_loss = float(prediction.bet_amount_usdc or prediction.bet_amount_usdt0) * float(price)
                else:
                    # Wrong prediction - lose entire bet
                    profit_loss = -float(prediction.bet_amount_usdc or prediction.bet_amount_usdt0)
            
            prediction.profit_loss = Decimal(str(profit_loss))
            
            session.commit()
            session.refresh(prediction)
            
            # Update leaderboards
            self._update_leaderboards(prediction.user_address)
            
            return prediction
        finally:
            session.close()
    
    def get_user_predictions(
        self,
        user_address: str,
        status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Prediction]:
        """
        Get predictions for a user.
        
        Args:
            user_address: User's wallet address
            status: Optional filter by status
            limit: Maximum results
            offset: Pagination offset
        
        Returns:
            List of Prediction objects
        """
        session = self.db.get_session()
        try:
            query = session.query(Prediction).filter(
                Prediction.user_address == user_address.lower()
            )
            
            if status:
                query = query.filter(Prediction.status == status)
            
            return query.order_by(desc(Prediction.created_at)).limit(limit).offset(offset).all()
        finally:
            session.close()
    
    def get_user_stats(self, user_address: str) -> Dict[str, Any]:
        """
        Get prediction statistics for a user.
        
        Args:
            user_address: User's wallet address
        
        Returns:
            Dictionary with user statistics
        """
        session = self.db.get_session()
        try:
            # Get all resolved predictions
            resolved = session.query(Prediction).filter(
                and_(
                    Prediction.user_address == user_address.lower(),
                    Prediction.status == "resolved",
                )
            ).all()
            
            total = len(resolved)
            correct = sum(1 for p in resolved if p.outcome.upper() == (p.outcome_result or "").upper())
            accuracy = (correct / total * 100) if total > 0 else 0.0
            
            total_volume = sum(p.bet_amount_usdt0 for p in resolved)
            total_pnl = sum(float(p.profit_loss or 0) for p in resolved)
            
            return {
                "user_address": user_address,
                "total_predictions": total,
                "correct_predictions": correct,
                "accuracy_percentage": round(accuracy, 2),
                "total_volume_usdt0": total_volume,
                "total_profit_loss": round(total_pnl, 6),
            }
        finally:
            session.close()
    
    def get_leaderboard(
        self,
        period: str = "alltime",
        limit: int = 100,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """
        Get leaderboard for a specific period.
        
        Args:
            period: Time period - "daily", "weekly", "monthly", "alltime"
            limit: Maximum results
            offset: Pagination offset
        
        Returns:
            List of leaderboard entries with user stats and rank
        """
        session = self.db.get_session()
        try:
            # Calculate period start date
            period_start = self._get_period_start(period)
            
            # Query leaderboard entries
            query = session.query(PredictionLeaderboard).filter(
                and_(
                    PredictionLeaderboard.period == period,
                    PredictionLeaderboard.period_start == period_start,
                )
            )
            
            # Order by accuracy (descending), then by total_profit_loss (descending)
            entries = query.order_by(
                desc(PredictionLeaderboard.accuracy_percentage),
                desc(PredictionLeaderboard.total_profit_loss),
            ).limit(limit).offset(offset).all()
            
            # Convert to dictionaries with display names
            result = []
            for idx, entry in enumerate(entries, start=offset + 1):
                display_name = self.profile_service.get_display_name(entry.user_address)
                result.append({
                    "rank": entry.rank or idx,
                    "user_address": entry.user_address,
                    "display_name": display_name,
                    "total_predictions": entry.total_predictions,
                    "correct_predictions": entry.correct_predictions,
                    "accuracy_percentage": float(entry.accuracy_percentage),
                    "total_volume_usdt0": entry.total_volume_usdt0,
                    "total_profit_loss": float(entry.total_profit_loss),
                })
            
            return result
        finally:
            session.close()
    
    def _update_leaderboards(self, user_address: str) -> None:
        """
        Update leaderboards for a user after a prediction is resolved.
        
        Args:
            user_address: User's wallet address
        """
        session = self.db.get_session()
        try:
            # Get user's resolved predictions
            resolved = session.query(Prediction).filter(
                and_(
                    Prediction.user_address == user_address.lower(),
                    Prediction.status == "resolved",
                )
            ).all()
            
            if not resolved:
                return
            
            # Calculate stats
            total = len(resolved)
            correct = sum(1 for p in resolved if p.outcome.upper() == (p.outcome_result or "").upper())
            accuracy = (correct / total * 100) if total > 0 else 0.0
            total_volume = sum(p.bet_amount_usdt0 for p in resolved)
            total_pnl = sum(float(p.profit_loss or 0) for p in resolved)
            
            # Update leaderboards for all periods
            periods = ["daily", "weekly", "monthly", "alltime"]
            
            for period in periods:
                period_start = self._get_period_start(period)
                
                # Get or create leaderboard entry
                entry = session.query(PredictionLeaderboard).filter(
                    and_(
                        PredictionLeaderboard.user_address == user_address.lower(),
                        PredictionLeaderboard.period == period,
                        PredictionLeaderboard.period_start == period_start,
                    )
                ).first()
                
                if not entry:
                    entry = PredictionLeaderboard(
                        user_address=user_address.lower(),
                        period=period,
                        period_start=period_start,
                    )
                    session.add(entry)
                
                # Update stats
                entry.total_predictions = total
                entry.correct_predictions = correct
                entry.accuracy_percentage = Decimal(str(accuracy))
                entry.total_volume_usdt0 = total_volume
                entry.total_profit_loss = Decimal(str(total_pnl))
            
            session.commit()
            
            # Recalculate ranks for all periods
            self._recalculate_ranks(session)
            
        finally:
            session.close()
    
    def _recalculate_ranks(self, session: Session) -> None:
        """
        Recalculate ranks for all leaderboard entries.
        
        Args:
            session: Database session
        """
        periods = ["daily", "weekly", "monthly", "alltime"]
        
        for period in periods:
            period_start = self._get_period_start(period)
            
            # Get all entries for this period, ordered by accuracy and P&L
            entries = session.query(PredictionLeaderboard).filter(
                and_(
                    PredictionLeaderboard.period == period,
                    PredictionLeaderboard.period_start == period_start,
                )
            ).order_by(
                desc(PredictionLeaderboard.accuracy_percentage),
                desc(PredictionLeaderboard.total_profit_loss),
            ).all()
            
            # Assign ranks
            for rank, entry in enumerate(entries, start=1):
                entry.rank = rank
            
            session.commit()
    
    def _get_period_start(self, period: str) -> date:
        """
        Get the start date for a time period.
        
        Args:
            period: Time period - "daily", "weekly", "monthly", "alltime"
        
        Returns:
            Start date for the period
        """
        today = date.today()
        
        if period == "daily":
            return today
        elif period == "weekly":
            # Start of current week (Monday)
            days_since_monday = today.weekday()
            return today - timedelta(days=days_since_monday)
        elif period == "monthly":
            # Start of current month
            return today.replace(day=1)
        elif period == "alltime":
            # Use a fixed early date for all-time
            return date(2020, 1, 1)
        else:
            raise ValueError(f"Invalid period: {period}")

