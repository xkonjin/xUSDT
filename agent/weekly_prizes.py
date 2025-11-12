"""
Weekly Prize Distribution System

Handles calculation and distribution of weekly USDT0 prizes to leaderboard winners.
Runs every Friday at end of day to:
1. Calculate prize pool (50% of merchant fees from the week)
2. Determine top 3 winners
3. Distribute prizes: 1st (50%), 2nd (30%), 3rd (20%)
4. Record distributions in database
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from decimal import Decimal

from .game_db import (
    GameDatabase,
    Leaderboard,
    MarketplaceSale,
    WeeklyPrize,
    Player,
    get_week_id,
)
from .facilitator import PaymentFacilitator
from .config import settings


class WeeklyPrizeDistributor:
    """
    Handles weekly prize calculation and distribution.
    
    Prize pool is 50% of marketplace fees collected during the week.
    Distribution:
    - 1st place: 50% of pool
    - 2nd place: 30% of pool
    - 3rd place: 20% of pool
    """
    
    def __init__(self, db: GameDatabase):
        """
        Initialize prize distributor.
        
        Args:
            db: GameDatabase instance
        """
        self.db = db
        self.facilitator = PaymentFacilitator()
    
    def calculate_prize_pool(self, week_id: str) -> int:
        """
        Calculate prize pool from marketplace fees for a week.
        
        Args:
            week_id: Week ID (e.g., "2025-W01")
        
        Returns:
            Prize pool in atomic units (6 decimals)
        """
        session = self.db.get_session()
        
        try:
            # Get week start and end dates
            year, week = week_id.split("-W")
            year = int(year)
            week = int(week)
            
            # Calculate week start (Monday of that week)
            jan1 = datetime(year, 1, 1)
            days_offset = (week - 1) * 7
            week_start = jan1 + timedelta(days=days_offset - jan1.weekday())
            week_end = week_start + timedelta(days=7)
            
            # Sum marketplace fees from this week
            total_fees = session.query(MarketplaceSale).filter(
                MarketplaceSale.timestamp >= week_start,
                MarketplaceSale.timestamp < week_end,
            ).with_entities(
                MarketplaceSale.fee_usdt0
            ).all()
            
            total_fees_atomic = sum(fee[0] for fee in total_fees if fee[0])
            
            # Prize pool is 50% of fees
            prize_pool = total_fees_atomic // 2
            
            return prize_pool
        
        finally:
            session.close()
    
    def get_weekly_winners(self, week_id: str) -> List[Dict[str, Any]]:
        """
        Get top 3 winners for a week.
        
        Args:
            week_id: Week ID
        
        Returns:
            List of winner records with rank, address, and points
        """
        session = self.db.get_session()
        
        try:
            entries = session.query(Leaderboard).filter(
                Leaderboard.week_id == week_id
            ).order_by(
                Leaderboard.total_points.desc()
            ).limit(3).all()
            
            winners = []
            for rank, entry in enumerate(entries, start=1):
                winners.append({
                    "rank": rank,
                    "wallet_address": entry.player_address,
                    "total_points": entry.total_points,
                })
            
            return winners
        
        finally:
            session.close()
    
    def distribute_prizes(self, week_id: str) -> List[Dict[str, Any]]:
        """
        Calculate and distribute weekly prizes.
        
        Args:
            week_id: Week ID to distribute prizes for
        
        Returns:
            List of prize distribution records
        """
        session = self.db.get_session()
        
        try:
            # Check if prizes already distributed
            existing = session.query(WeeklyPrize).filter(
                WeeklyPrize.week_id == week_id
            ).first()
            
            if existing:
                raise ValueError(f"Prizes already distributed for {week_id}")
            
            # Calculate prize pool
            prize_pool = self.calculate_prize_pool(week_id)
            
            if prize_pool == 0:
                return []  # No fees collected, no prizes
            
            # Get winners
            winners = self.get_weekly_winners(week_id)
            
            if len(winners) == 0:
                return []  # No players this week
            
            # Distribution percentages
            distributions = [
                {"rank": 1, "percent": 0.50},
                {"rank": 2, "percent": 0.30},
                {"rank": 3, "percent": 0.20},
            ]
            
            prize_records = []
            
            for i, dist in enumerate(distributions):
                if i < len(winners):
                    winner = winners[i]
                    prize_amount = int(prize_pool * dist["percent"])
                    
                    # Distribute USDT0 to winner
                    try:
                        res = self.facilitator.settle_plasma_eip3009(
                            from_addr=settings.MERCHANT_ADDRESS,
                            to_addr=winner["wallet_address"],
                            value=prize_amount,
                            valid_after=int(datetime.utcnow().timestamp()) - 1,
                            valid_before=int(datetime.utcnow().timestamp()) + 3600,
                            nonce32=f"prize-{week_id}-{dist['rank']}",
                            v=0,  # Will be signed by relayer
                            r="0x0",
                            s="0x0",
                        )
                        
                        tx_hash = res.tx_hash if res.success else None
                    except Exception as e:
                        # If distribution fails, record but mark as failed
                        tx_hash = None
                        print(f"Failed to distribute prize to {winner['wallet_address']}: {str(e)}")
                    
                    # Create prize record
                    prize = WeeklyPrize(
                        week_id=week_id,
                        winner_address=winner["wallet_address"],
                        rank=dist["rank"],
                        prize_amount_usdt0=prize_amount,
                        distributed_at=datetime.utcnow() if tx_hash else None,
                        tx_hash=tx_hash,
                        created_at=datetime.utcnow(),
                    )
                    
                    session.add(prize)
                    prize_records.append({
                        "rank": dist["rank"],
                        "wallet_address": winner["wallet_address"],
                        "prize_amount_usdt0": prize_amount,
                        "prize_amount_readable": prize_amount / 1_000_000,
                        "tx_hash": tx_hash,
                    })
            
            session.commit()
            
            return prize_records
        
        except Exception as e:
            session.rollback()
            raise Exception(f"Prize distribution failed: {str(e)}")
        finally:
            session.close()


def distribute_weekly_prizes(db_url: str, week_id: Optional[str] = None):
    """
    Standalone function to distribute weekly prizes (for cron job).
    
    Args:
        db_url: PostgreSQL connection URL
        week_id: Week ID (defaults to last week)
    """
    db = GameDatabase(db_url)
    distributor = WeeklyPrizeDistributor(db)
    
    if week_id is None:
        # Default to last week (previous week)
        from datetime import datetime
        last_week = datetime.utcnow() - timedelta(days=7)
        week_id = get_week_id(last_week)
    
    try:
        prizes = distributor.distribute_prizes(week_id)
        print(f"Distributed prizes for {week_id}:")
        for prize in prizes:
            print(f"  Rank {prize['rank']}: {prize['prize_amount_readable']:.2f} USDT0 to {prize['wallet_address']}")
    except Exception as e:
        print(f"Error distributing prizes: {str(e)}")
        raise


if __name__ == "__main__":
    # For running as a cron job
    import os
    from .config import settings
    
    db_url = settings.GAME_DATABASE_URL
    if not db_url:
        print("Error: GAME_DATABASE_URL not configured")
        exit(1)
    
    distribute_weekly_prizes(db_url)

