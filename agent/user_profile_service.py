"""
User Profile Service

This module manages user profiles and display names for the prediction platform.
Users can set display names that appear on leaderboards instead of wallet addresses.

Key Features:
- Display name management (unique, 3-20 characters)
- Profile creation and updates
- Name availability checking
- Profile lookup by wallet address or display name
"""

from __future__ import annotations

import re
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from .game_db import GameDatabase, UserProfile


class UserProfileService:
    """
    Service for managing user profiles and display names.
    
    Handles profile creation, updates, and name validation.
    """
    
    # Display name validation: 3-20 characters, alphanumeric and underscores
    DISPLAY_NAME_PATTERN = re.compile(r"^[a-zA-Z0-9_]{3,20}$")
    
    def __init__(self, db: Optional[GameDatabase] = None):
        """
        Initialize user profile service.
        
        Args:
            db: GameDatabase instance (creates new one if not provided)
        """
        self.db = db or GameDatabase()
    
    def validate_display_name(self, display_name: str) -> tuple[bool, Optional[str]]:
        """
        Validate display name format.
        
        Args:
            display_name: Display name to validate
        
        Returns:
            Tuple of (is_valid, error_message)
        """
        if not display_name:
            return False, "Display name is required"
        
        if len(display_name) < 3:
            return False, "Display name must be at least 3 characters"
        
        if len(display_name) > 20:
            return False, "Display name must be at most 20 characters"
        
        if not self.DISPLAY_NAME_PATTERN.match(display_name):
            return False, "Display name can only contain letters, numbers, and underscores"
        
        return True, None
    
    def is_name_available(self, display_name: str) -> bool:
        """
        Check if display name is available.
        
        Args:
            display_name: Display name to check
        
        Returns:
            True if available, False if taken
        """
        session = self.db.get_session()
        try:
            profile = session.query(UserProfile).filter(
                UserProfile.display_name == display_name
            ).first()
            return profile is None
        finally:
            session.close()
    
    def get_profile(self, wallet_address: str) -> Optional[UserProfile]:
        """
        Get user profile by wallet address.
        
        Args:
            wallet_address: User's wallet address
        
        Returns:
            UserProfile object or None if not found
        """
        session = self.db.get_session()
        try:
            return session.query(UserProfile).filter(
                UserProfile.wallet_address == wallet_address.lower()
            ).first()
        finally:
            session.close()
    
    def get_profile_by_name(self, display_name: str) -> Optional[UserProfile]:
        """
        Get user profile by display name.
        
        Args:
            display_name: Display name
        
        Returns:
            UserProfile object or None if not found
        """
        session = self.db.get_session()
        try:
            return session.query(UserProfile).filter(
                UserProfile.display_name == display_name
            ).first()
        finally:
            session.close()
    
    def create_or_update_profile(
        self,
        wallet_address: str,
        display_name: Optional[str] = None,
        avatar_url: Optional[str] = None,
        bio: Optional[str] = None,
    ) -> UserProfile:
        """
        Create or update user profile.
        
        Args:
            wallet_address: User's wallet address
            display_name: Display name (validated)
            avatar_url: Optional avatar URL
            bio: Optional bio text
        
        Returns:
            Created or updated UserProfile object
        
        Raises:
            ValueError: If display name is invalid or taken
        """
        session = self.db.get_session()
        try:
            # Validate display name if provided
            if display_name:
                is_valid, error = self.validate_display_name(display_name)
                if not is_valid:
                    raise ValueError(error)
                
                # Check if name is available (unless updating own profile)
                existing = session.query(UserProfile).filter(
                    UserProfile.display_name == display_name
                ).first()
                
                if existing and existing.wallet_address != wallet_address.lower():
                    raise ValueError(f"Display name '{display_name}' is already taken")
            
            # Get or create profile
            profile = session.query(UserProfile).filter(
                UserProfile.wallet_address == wallet_address.lower()
            ).first()
            
            if not profile:
                profile = UserProfile(
                    wallet_address=wallet_address.lower(),
                    display_name=display_name,
                    avatar_url=avatar_url,
                    bio=bio,
                )
                session.add(profile)
            else:
                # Update existing profile
                if display_name:
                    profile.display_name = display_name
                if avatar_url is not None:
                    profile.avatar_url = avatar_url
                if bio is not None:
                    profile.bio = bio
            
            session.commit()
            session.refresh(profile)
            return profile
        finally:
            session.close()
    
    def get_display_name(self, wallet_address: str) -> str:
        """
        Get display name for a wallet address, or return shortened address.
        
        Args:
            wallet_address: User's wallet address
        
        Returns:
            Display name if set, otherwise shortened address (e.g., "0x1234...5678")
        """
        profile = self.get_profile(wallet_address)
        if profile and profile.display_name:
            return profile.display_name
        
        # Return shortened address
        if len(wallet_address) > 10:
            return f"{wallet_address[:6]}...{wallet_address[-4]}"
        return wallet_address
    
    def get_profile_dict(self, wallet_address: str) -> Dict[str, Any]:
        """
        Get profile as dictionary.
        
        Args:
            wallet_address: User's wallet address
        
        Returns:
            Dictionary with profile information
        """
        profile = self.get_profile(wallet_address)
        
        if not profile:
            return {
                "wallet_address": wallet_address,
                "display_name": None,
                "avatar_url": None,
                "bio": None,
                "has_profile": False,
            }
        
        return {
            "wallet_address": profile.wallet_address,
            "display_name": profile.display_name,
            "avatar_url": profile.avatar_url,
            "bio": profile.bio,
            "has_profile": True,
            "created_at": profile.created_at.isoformat() if profile.created_at else None,
            "updated_at": profile.updated_at.isoformat() if profile.updated_at else None,
        }

