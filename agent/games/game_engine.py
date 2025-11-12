"""
Game Engine Module

Server-side game logic and validation for skill-based and chance-based games.
Implements anti-cheat measures through server-side validation and cryptographic challenges.

Game Types:
- Skill Games: Reaction Time, Memory Match, Precision Click, Pattern Recognition
- Chance Games: Dice Roll, Card Draw, Wheel Spin
"""

from __future__ import annotations

import random
import hashlib
import time
from typing import Dict, Any, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime

from ..game_db import Player, NFTToy, PlayerInventory, DailyBonus, GameSession


@dataclass
class GameChallenge:
    """
    Server-generated game challenge for anti-cheat validation.
    
    Attributes:
        challenge_id: Unique challenge identifier
        game_type: Type of game
        seed: Random seed for game generation
        difficulty: Difficulty level
        expected_result: Expected result (for validation)
        validation_hash: Hash of challenge data for verification
        created_at: Challenge creation timestamp
        expires_at: Challenge expiration timestamp
    """
    challenge_id: str
    game_type: str
    seed: int
    difficulty: int
    expected_result: Dict[str, Any]
    validation_hash: str
    created_at: float
    expires_at: float


@dataclass
class GameResult:
    """
    Game result after validation.
    
    Attributes:
        success: Whether game was completed successfully
        points_earned: Points earned from this game
        base_points: Base points before multipliers
        toy_bonus_multiplier: Multiplier from equipped toys
        daily_bonus_multiplier: Multiplier from daily bonuses
        wager_multiplier: Multiplier from wager amount
        validation_passed: Whether server-side validation passed
        error: Error message if validation failed
    """
    success: bool
    points_earned: int
    base_points: int
    toy_bonus_multiplier: float
    daily_bonus_multiplier: float
    wager_multiplier: float
    validation_passed: bool
    error: Optional[str] = None


class GameEngine:
    """
    Server-side game engine with anti-cheat validation.
    
    Generates game challenges, validates client results, and calculates points
    with multipliers from toys, daily bonuses, and wagers.
    """
    
    # Base points for different game types
    BASE_POINTS = {
        "reaction_time": 100,
        "memory_match": 150,
        "precision_click": 120,
        "pattern_recognition": 130,
        "dice_roll": 80,
        "card_draw": 90,
        "wheel_spin": 100,
    }
    
    # Challenge expiration time (seconds)
    CHALLENGE_EXPIRY = 300  # 5 minutes
    
    def __init__(self):
        """Initialize game engine."""
        self.active_challenges: Dict[str, GameChallenge] = {}
    
    def generate_challenge(
        self,
        game_type: str,
        difficulty: int = 1,
    ) -> GameChallenge:
        """
        Generate a game challenge for client.
        
        Args:
            game_type: Type of game to generate
            difficulty: Difficulty level (1-5)
        
        Returns:
            GameChallenge with challenge data
        """
        challenge_id = hashlib.sha256(
            f"{game_type}{time.time()}{random.random()}".encode()
        ).hexdigest()[:16]
        
        seed = random.randint(1, 1000000)
        random.seed(seed)
        
        # Generate expected result based on game type
        expected_result = self._generate_expected_result(game_type, difficulty, seed)
        
        # Create validation hash
        validation_data = f"{challenge_id}{game_type}{seed}{difficulty}{expected_result}"
        validation_hash = hashlib.sha256(validation_data.encode()).hexdigest()
        
        challenge = GameChallenge(
            challenge_id=challenge_id,
            game_type=game_type,
            seed=seed,
            difficulty=difficulty,
            expected_result=expected_result,
            validation_hash=validation_hash,
            created_at=time.time(),
            expires_at=time.time() + self.CHALLENGE_EXPIRY,
        )
        
        self.active_challenges[challenge_id] = challenge
        
        return challenge
    
    def _generate_expected_result(
        self,
        game_type: str,
        difficulty: int,
        seed: int,
    ) -> Dict[str, Any]:
        """Generate expected result for game type."""
        random.seed(seed)
        
        if game_type == "reaction_time":
            # Expected reaction time in milliseconds (with tolerance)
            base_time = 500 - (difficulty * 50)  # Gets faster with difficulty
            variance = random.randint(-100, 100)
            return {
                "target_time_ms": base_time + variance,
                "tolerance_ms": 150,  # Acceptable range
            }
        
        elif game_type == "memory_match":
            # Expected pairs matched
            pairs = 4 + difficulty  # 5-9 pairs
            return {
                "total_pairs": pairs,
                "required_pairs": pairs,
            }
        
        elif game_type == "precision_click":
            # Expected sequence and timing
            sequence_length = 5 + difficulty
            sequence = [random.randint(1, 9) for _ in range(sequence_length)]
            return {
                "sequence": sequence,
                "max_time_ms": 3000 + (difficulty * 500),
            }
        
        elif game_type == "pattern_recognition":
            # Expected pattern completion
            pattern_length = 4 + difficulty
            pattern = [random.choice(["circle", "square", "triangle"]) for _ in range(pattern_length)]
            return {
                "pattern": pattern,
                "max_time_ms": 5000 + (difficulty * 1000),
            }
        
        elif game_type == "dice_roll":
            # Expected dice result (1-6)
            return {
                "dice_value": random.randint(1, 6),
            }
        
        elif game_type == "card_draw":
            # Expected card value
            return {
                "card_value": random.randint(1, 13),  # Ace=1, King=13
                "suit": random.choice(["hearts", "diamonds", "clubs", "spades"]),
            }
        
        elif game_type == "wheel_spin":
            # Expected wheel segment
            segments = 8
            return {
                "segment": random.randint(1, segments),
                "multiplier": random.choice([1.0, 1.5, 2.0, 2.5, 3.0]),
            }
        
        else:
            return {}
    
    def validate_result(
        self,
        challenge_id: str,
        client_result: Dict[str, Any],
    ) -> Tuple[bool, Optional[str]]:
        """
        Validate client game result against server challenge.
        
        Args:
            challenge_id: Challenge ID from generate_challenge
            client_result: Result data from client
        
        Returns:
            Tuple of (is_valid, error_message)
        """
        challenge = self.active_challenges.get(challenge_id)
        
        if not challenge:
            return False, "Challenge not found or expired"
        
        # Check expiration
        if time.time() > challenge.expires_at:
            del self.active_challenges[challenge_id]
            return False, "Challenge expired"
        
        # Validate based on game type
        if challenge.game_type == "reaction_time":
            return self._validate_reaction_time(challenge, client_result)
        elif challenge.game_type == "memory_match":
            return self._validate_memory_match(challenge, client_result)
        elif challenge.game_type == "precision_click":
            return self._validate_precision_click(challenge, client_result)
        elif challenge.game_type == "pattern_recognition":
            return self._validate_pattern_recognition(challenge, client_result)
        elif challenge.game_type == "dice_roll":
            return self._validate_dice_roll(challenge, client_result)
        elif challenge.game_type == "card_draw":
            return self._validate_card_draw(challenge, client_result)
        elif challenge.game_type == "wheel_spin":
            return self._validate_wheel_spin(challenge, client_result)
        else:
            return False, f"Unknown game type: {challenge.game_type}"
    
    def _validate_reaction_time(
        self,
        challenge: GameChallenge,
        client_result: Dict[str, Any],
    ) -> Tuple[bool, Optional[str]]:
        """Validate reaction time game."""
        expected = challenge.expected_result
        client_time = client_result.get("reaction_time_ms")
        
        if client_time is None:
            return False, "Missing reaction_time_ms"
        
        target_time = expected["target_time_ms"]
        tolerance = expected["tolerance_ms"]
        
        # Check if within tolerance
        if abs(client_time - target_time) > tolerance:
            return False, f"Reaction time out of tolerance: {client_time}ms (expected ~{target_time}ms)"
        
        return True, None
    
    def _validate_memory_match(
        self,
        challenge: GameChallenge,
        client_result: Dict[str, Any],
    ) -> Tuple[bool, Optional[str]]:
        """Validate memory match game."""
        expected = challenge.expected_result
        client_pairs = client_result.get("pairs_matched", 0)
        required = expected["required_pairs"]
        
        if client_pairs < required:
            return False, f"Insufficient pairs matched: {client_pairs}/{required}"
        
        return True, None
    
    def _validate_precision_click(
        self,
        challenge: GameChallenge,
        client_result: Dict[str, Any],
    ) -> Tuple[bool, Optional[str]]:
        """Validate precision click game."""
        expected = challenge.expected_result
        client_sequence = client_result.get("sequence", [])
        client_time = client_result.get("time_ms", 0)
        
        expected_sequence = expected["sequence"]
        max_time = expected["max_time_ms"]
        
        if client_sequence != expected_sequence:
            return False, "Sequence mismatch"
        
        if client_time > max_time:
            return False, f"Time exceeded: {client_time}ms (max {max_time}ms)"
        
        return True, None
    
    def _validate_pattern_recognition(
        self,
        challenge: GameChallenge,
        client_result: Dict[str, Any],
    ) -> Tuple[bool, Optional[str]]:
        """Validate pattern recognition game."""
        expected = challenge.expected_result
        client_pattern = client_result.get("pattern", [])
        client_time = client_result.get("time_ms", 0)
        
        expected_pattern = expected["pattern"]
        max_time = expected["max_time_ms"]
        
        if client_pattern != expected_pattern:
            return False, "Pattern mismatch"
        
        if client_time > max_time:
            return False, f"Time exceeded: {client_time}ms (max {max_time}ms)"
        
        return True, None
    
    def _validate_dice_roll(
        self,
        challenge: GameChallenge,
        client_result: Dict[str, Any],
    ) -> Tuple[bool, Optional[str]]:
        """Validate dice roll game (chance-based, always valid)."""
        # Dice roll is chance-based, so we accept any result
        # But we can verify it's a valid dice value
        dice_value = client_result.get("dice_value")
        if dice_value is None or not (1 <= dice_value <= 6):
            return False, "Invalid dice value"
        
        return True, None
    
    def _validate_card_draw(
        self,
        challenge: GameChallenge,
        client_result: Dict[str, Any],
    ) -> Tuple[bool, Optional[str]]:
        """Validate card draw game (chance-based)."""
        # Card draw is chance-based, verify valid card
        card_value = client_result.get("card_value")
        suit = client_result.get("suit")
        
        if card_value is None or not (1 <= card_value <= 13):
            return False, "Invalid card value"
        
        if suit not in ["hearts", "diamonds", "clubs", "spades"]:
            return False, "Invalid suit"
        
        return True, None
    
    def _validate_wheel_spin(
        self,
        challenge: GameChallenge,
        client_result: Dict[str, Any],
    ) -> Tuple[bool, Optional[str]]:
        """Validate wheel spin game (chance-based)."""
        # Wheel spin is chance-based, verify valid segment
        segment = client_result.get("segment")
        if segment is None or not (1 <= segment <= 8):
            return False, "Invalid segment"
        
        return True, None
    
    def calculate_points(
        self,
        game_type: str,
        base_points: Optional[int] = None,
        toy_multiplier: float = 1.0,
        daily_multiplier: float = 1.0,
        wager_multiplier: float = 1.0,
    ) -> int:
        """
        Calculate points with multipliers.
        
        Args:
            game_type: Type of game
            base_points: Base points (defaults to game type base)
            toy_multiplier: Multiplier from equipped toys
            daily_multiplier: Multiplier from daily bonuses
            wager_multiplier: Multiplier from wager amount
        
        Returns:
            Final points earned
        """
        if base_points is None:
            base_points = self.BASE_POINTS.get(game_type, 100)
        
        final_points = int(
            base_points * toy_multiplier * daily_multiplier * wager_multiplier
        )
        
        return max(1, final_points)  # Minimum 1 point
    
    def cleanup_expired_challenges(self):
        """Remove expired challenges."""
        now = time.time()
        expired = [
            cid for cid, challenge in self.active_challenges.items()
            if challenge.expires_at < now
        ]
        for cid in expired:
            del self.active_challenges[cid]


# Global game engine instance
_game_engine: Optional[GameEngine] = None


def get_game_engine() -> GameEngine:
    """Get game engine instance (singleton)."""
    global _game_engine
    if _game_engine is None:
        _game_engine = GameEngine()
    return _game_engine

