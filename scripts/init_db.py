#!/usr/bin/env python3
"""
Database initialization script for Trillionaire Toy Store Game.

This script:
1. Runs Alembic migrations to create database schema
2. Seeds toy catalog data
3. Initializes daily bonus rotation for current day
"""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from alembic.config import Config
from alembic import command
from agent.config import settings
from agent.game_db import GameDatabase
from agent.daily_bonus_rotation import DailyBonusRotator
from datetime import datetime


def run_migrations():
    """Run Alembic migrations."""
    alembic_cfg = Config("agent/migrations/alembic.ini")
    
    # Override sqlalchemy.url with DATABASE_URL
    database_url = settings.GAME_DATABASE_URL or os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError("DATABASE_URL or GAME_DATABASE_URL must be set")
    
    alembic_cfg.set_main_option("sqlalchemy.url", database_url)
    
    print("Running database migrations...")
    command.upgrade(alembic_cfg, "head")
    print("✓ Migrations completed")


def initialize_daily_bonuses():
    """Initialize daily bonuses for today."""
    database_url = settings.GAME_DATABASE_URL or os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError("DATABASE_URL or GAME_DATABASE_URL must be set")
    
    db = GameDatabase(database_url)
    rotator = DailyBonusRotator(db)
    
    print("Initializing daily bonuses...")
    rotator.generate_daily_bonuses(datetime.utcnow().date())
    print("✓ Daily bonuses initialized")


def main():
    """Main initialization function."""
    print("=" * 60)
    print("Trillionaire Toy Store Game - Database Initialization")
    print("=" * 60)
    
    try:
        # Run migrations (includes toy catalog seed)
        run_migrations()
        
        # Initialize daily bonuses
        initialize_daily_bonuses()
        
        print("\n" + "=" * 60)
        print("✓ Database initialization complete!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n✗ Error during initialization: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

