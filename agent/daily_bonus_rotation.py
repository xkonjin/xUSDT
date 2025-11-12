"""
Daily Bonus Rotation System

This module handles the daily rotation of toy bonuses and games of the day.
Runs as a cron job (or scheduled task) to:
1. Select 2 random games as "games of the day"
2. Select 3-5 random toy types and assign them bonuses tied to specific games
3. Only toys with bonuses matching the games of the day provide multipliers

This creates strategic depth - players must select a "squad" of toys that match
the featured games to maximize their bonuses.

Bonus Types:
- points: Multiplies points earned in games
- credits: Grants bonus credits
- wager_reduction: Reduces wager cost

Multipliers range from 1.5x to 3.0x depending on rarity and day.
"""

from __future__ import annotations

import random
from datetime import date, datetime
from typing import List, Dict, Any, Optional

from .game_db import GameDatabase, Toy, DailyBonus, GamesOfTheDay

# Available game types in the system
AVAILABLE_GAMES = [
    "reaction_time",
    "memory_match",
    "precision_click",
    "pattern_recognition",
    "dice_roll",
    "card_draw",
    "wheel_spin",
]


class DailyBonusRotator:
    """
    Handles daily bonus rotation for toy types and games of the day.
    
    Each day:
    1. Selects 2 random games as "games of the day"
    2. Selects 3-5 random toy types and assigns bonuses tied to specific games
    3. Only toys with bonuses matching the games of the day provide multipliers
    
    This creates strategic depth - players must select a "squad" of toys that match
    the featured games to maximize their bonuses.
    """
    
    # Number of toys to feature each day
    FEATURED_TOYS_COUNT = 5
    
    # Number of games to feature each day
    GAMES_OF_THE_DAY_COUNT = 2
    
    # Bonus multipliers available
    MULTIPLIERS = [1.5, 2.0, 2.5, 3.0]
    
    # Bonus types
    BONUS_TYPES = ["points", "credits", "wager_reduction"]
    
    def __init__(self, db: GameDatabase):
        """
        Initialize bonus rotator.
        
        Args:
            db: GameDatabase instance
        """
        self.db = db
    
    def rotate_bonuses(self, target_date: Optional[date] = None) -> Dict[str, Any]:
        """
        Rotate daily bonuses and games of the day for a specific date.
        
        Process:
        1. Selects 2 random games as "games of the day"
        2. Selects random toy types and assigns bonuses tied to specific games
        3. Ensures at least some toys have bonuses for the featured games
        
        Args:
            target_date: Date to rotate bonuses for (defaults to today)
        
        Returns:
            Dict with:
            - games_of_the_day: List of 2 game types
            - bonuses: List of created bonus records with game_types
        """
        if target_date is None:
            target_date = date.today()
        
        session = self.db.get_session()
        
        try:
            # Step 1: Select 2 random games as "games of the day"
            if len(AVAILABLE_GAMES) < self.GAMES_OF_THE_DAY_COUNT:
                games_of_day = AVAILABLE_GAMES
            else:
                games_of_day = random.sample(AVAILABLE_GAMES, self.GAMES_OF_THE_DAY_COUNT)
            
            # Delete existing games of the day for this date
            session.query(GamesOfTheDay).filter(
                GamesOfTheDay.date == target_date
            ).delete()
            
            # Create games of the day record
            games_record = GamesOfTheDay(
                date=target_date,
                game_type_1=games_of_day[0],
                game_type_2=games_of_day[1],
                created_at=datetime.utcnow(),
            )
            session.add(games_record)
            
            # Step 2: Get all toy types
            toys = session.query(Toy).all()
            
            if len(toys) < self.FEATURED_TOYS_COUNT:
                # Not enough toys, feature all available
                featured_toys = toys
            else:
                # Randomly select featured toys
                featured_toys = random.sample(toys, self.FEATURED_TOYS_COUNT)
            
            # Step 3: Delete existing bonuses for this date
            session.query(DailyBonus).filter(
                DailyBonus.date == target_date
            ).delete()
            
            # Step 4: Create new bonuses with game-specific assignments
            created_bonuses = []
            
            # Ensure at least 2 toys have bonuses for each featured game
            toys_for_game_1 = featured_toys[:2]  # First 2 toys for game 1
            toys_for_game_2 = featured_toys[2:4] if len(featured_toys) >= 4 else featured_toys[2:]  # Next 2 for game 2
            remaining_toys = featured_toys[4:] if len(featured_toys) > 4 else []
            
            # Assign bonuses for game 1 toys
            for i, toy in enumerate(toys_for_game_1):
                multiplier = random.choice([2.5, 3.0]) if i == 0 else random.choice([2.0, 2.5])
                bonus_type = random.choice(self.BONUS_TYPES)
                
                bonus = DailyBonus(
                    date=target_date,
                    toy_type_id=toy.id,
                    multiplier=multiplier,
                    bonus_type=bonus_type,
                    game_types=[games_of_day[0]],  # Only affects first game
                    created_at=datetime.utcnow(),
                )
                session.add(bonus)
                created_bonuses.append({
                    "toy_type_id": toy.id,
                    "toy_name": toy.name,
                    "multiplier": float(multiplier),
                    "bonus_type": bonus_type,
                    "game_types": [games_of_day[0]],
                })
            
            # Assign bonuses for game 2 toys
            for i, toy in enumerate(toys_for_game_2):
                multiplier = random.choice([2.5, 3.0]) if i == 0 else random.choice([2.0, 2.5])
                bonus_type = random.choice(self.BONUS_TYPES)
                
                bonus = DailyBonus(
                    date=target_date,
                    toy_type_id=toy.id,
                    multiplier=multiplier,
                    bonus_type=bonus_type,
                    game_types=[games_of_day[1]],  # Only affects second game
                    created_at=datetime.utcnow(),
                )
                session.add(bonus)
                created_bonuses.append({
                    "toy_type_id": toy.id,
                    "toy_name": toy.name,
                    "multiplier": float(multiplier),
                    "bonus_type": bonus_type,
                    "game_types": [games_of_day[1]],
                })
            
            # Assign bonuses for remaining toys (can affect both games or one)
            for toy in remaining_toys:
                multiplier = random.choice([1.5, 2.0])
                bonus_type = random.choice(self.BONUS_TYPES)
                
                # Randomly assign to one or both games
                if random.random() < 0.3:  # 30% chance to affect both games
                    game_types = games_of_day
                else:
                    game_types = [random.choice(games_of_day)]
                
                bonus = DailyBonus(
                    date=target_date,
                    toy_type_id=toy.id,
                    multiplier=multiplier,
                    bonus_type=bonus_type,
                    game_types=game_types,
                    created_at=datetime.utcnow(),
                )
                session.add(bonus)
                created_bonuses.append({
                    "toy_type_id": toy.id,
                    "toy_name": toy.name,
                    "multiplier": float(multiplier),
                    "bonus_type": bonus_type,
                    "game_types": game_types,
                })
            
            session.commit()
            
            return {
                "games_of_the_day": games_of_day,
                "bonuses": created_bonuses,
            }
        
        except Exception as e:
            session.rollback()
            raise Exception(f"Failed to rotate bonuses: {str(e)}")
        finally:
            session.close()
    
    def get_todays_bonuses(self) -> Dict[str, Any]:
        """
        Get today's bonuses and games of the day.
        
        Returns:
            Dict with games_of_the_day and bonuses
        """
        return self.rotate_bonuses(date.today())


def rotate_daily_bonuses(db_url: str):
    """
    Standalone function to rotate daily bonuses and games of the day (for cron job).
    
    Args:
        db_url: PostgreSQL connection URL
    """
    db = GameDatabase(db_url)
    rotator = DailyBonusRotator(db)
    
    try:
        result = rotator.rotate_bonuses()
        games_of_day = result["games_of_the_day"]
        bonuses = result["bonuses"]
        
        print(f"Rotated daily bonuses for {date.today()}")
        print(f"Games of the Day: {games_of_day[0]}, {games_of_day[1]}")
        print(f"Created {len(bonuses)} toy bonuses:")
        for bonus in bonuses:
            games_str = ", ".join(bonus.get("game_types", []))
            print(f"  - {bonus['toy_name']}: {bonus['multiplier']}x {bonus['bonus_type']} (affects: {games_str})")
    except Exception as e:
        print(f"Error rotating bonuses: {str(e)}")
        raise


if __name__ == "__main__":
    # For running as a cron job
    import os
    from .config import settings
    
    db_url = settings.GAME_DATABASE_URL
    if not db_url:
        print("Error: GAME_DATABASE_URL not configured")
        exit(1)
    
    rotate_daily_bonuses(db_url)

