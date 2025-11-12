"""Seed toy catalog

Revision ID: 002_seed_toys
Revises: 001_initial_schema
Create Date: 2025-01-27 12:01:00.000000

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime

# revision identifiers, used by Alembic.
revision = '002_seed_toys'
down_revision = '001_initial_schema'
branch_labels = None
depends_on = None

# Toy catalog data matching v0/src/lib/toys.ts
TOYS = [
    {"id": 1, "name": "Robot", "icon_name": "robot", "description": "A classic robot companion with mechanical precision", "base_price_usdt0": 100000, "stat_categories": ["Speed", "Power", "Precision"], "rarity_distribution": {"common": 60, "rare": 25, "epic": 10, "legendary": 5}},
    {"id": 2, "name": "Teddy Bear", "icon_name": "teddy-bear", "description": "A cuddly teddy bear that brings comfort and luck", "base_price_usdt0": 50000, "stat_categories": ["Luck", "Defense", "Magic"], "rarity_distribution": {"common": 60, "rare": 25, "epic": 10, "legendary": 5}},
    {"id": 3, "name": "Race Car", "icon_name": "race-car", "description": "A speedy race car built for velocity and performance", "base_price_usdt0": 150000, "stat_categories": ["Speed", "Power", "Precision"], "rarity_distribution": {"common": 60, "rare": 25, "epic": 10, "legendary": 5}},
    {"id": 4, "name": "Magic Wand", "icon_name": "magic-wand", "description": "A mystical wand that channels magical energy", "base_price_usdt0": 200000, "stat_categories": ["Magic", "Luck", "Power"], "rarity_distribution": {"common": 60, "rare": 25, "epic": 10, "legendary": 5}},
    {"id": 5, "name": "Space Ship", "icon_name": "space-ship", "description": "An interstellar vessel exploring the cosmos", "base_price_usdt0": 300000, "stat_categories": ["Speed", "Magic", "Power", "Defense"], "rarity_distribution": {"common": 60, "rare": 25, "epic": 10, "legendary": 5}},
    {"id": 6, "name": "Dragon", "icon_name": "dragon", "description": "A fierce dragon guardian with ancient power", "base_price_usdt0": 500000, "stat_categories": ["Power", "Magic", "Defense", "Speed"], "rarity_distribution": {"common": 60, "rare": 25, "epic": 10, "legendary": 5}},
    {"id": 7, "name": "Unicorn", "icon_name": "unicorn", "description": "A magical unicorn radiating pure luck and magic", "base_price_usdt0": 400000, "stat_categories": ["Luck", "Magic", "Speed"], "rarity_distribution": {"common": 60, "rare": 25, "epic": 10, "legendary": 5}},
    {"id": 8, "name": "Pirate Ship", "icon_name": "pirate-ship", "description": "A treasure-hunting pirate ship on the high seas", "base_price_usdt0": 250000, "stat_categories": ["Luck", "Power", "Defense"], "rarity_distribution": {"common": 60, "rare": 25, "epic": 10, "legendary": 5}},
    {"id": 9, "name": "Castle", "icon_name": "castle", "description": "A fortified castle providing strong defense", "base_price_usdt0": 350000, "stat_categories": ["Defense", "Power", "Magic"], "rarity_distribution": {"common": 60, "rare": 25, "epic": 10, "legendary": 5}},
    {"id": 10, "name": "Treasure Chest", "icon_name": "treasure-chest", "description": "A mysterious chest filled with luck and fortune", "base_price_usdt0": 180000, "stat_categories": ["Luck", "Magic"], "rarity_distribution": {"common": 60, "rare": 25, "epic": 10, "legendary": 5}},
    {"id": 11, "name": "Ninja", "icon_name": "ninja", "description": "A stealthy ninja warrior with precision and speed", "base_price_usdt0": 220000, "stat_categories": ["Speed", "Precision", "Power"], "rarity_distribution": {"common": 60, "rare": 25, "epic": 10, "legendary": 5}},
    {"id": 12, "name": "Wizard", "icon_name": "wizard", "description": "A wise wizard mastering arcane magic", "base_price_usdt0": 280000, "stat_categories": ["Magic", "Power", "Luck"], "rarity_distribution": {"common": 60, "rare": 25, "epic": 10, "legendary": 5}},
    {"id": 13, "name": "Knight", "icon_name": "knight", "description": "A valiant knight in shining armor", "base_price_usdt0": 240000, "stat_categories": ["Defense", "Power", "Precision"], "rarity_distribution": {"common": 60, "rare": 25, "epic": 10, "legendary": 5}},
    {"id": 14, "name": "Phoenix", "icon_name": "phoenix", "description": "A legendary phoenix reborn from flames", "base_price_usdt0": 600000, "stat_categories": ["Magic", "Power", "Speed", "Luck"], "rarity_distribution": {"common": 60, "rare": 25, "epic": 10, "legendary": 5}},
    {"id": 15, "name": "Samurai", "icon_name": "samurai", "description": "An honorable samurai warrior with unmatched precision", "base_price_usdt0": 320000, "stat_categories": ["Precision", "Power", "Defense"], "rarity_distribution": {"common": 60, "rare": 25, "epic": 10, "legendary": 5}},
    {"id": 16, "name": "Mermaid", "icon_name": "mermaid", "description": "A mystical mermaid with enchanting magic", "base_price_usdt0": 270000, "stat_categories": ["Magic", "Luck", "Speed"], "rarity_distribution": {"common": 60, "rare": 25, "epic": 10, "legendary": 5}},
    {"id": 17, "name": "Golem", "icon_name": "golem", "description": "A powerful stone golem with immense defense", "base_price_usdt0": 380000, "stat_categories": ["Defense", "Power", "Precision"], "rarity_distribution": {"common": 60, "rare": 25, "epic": 10, "legendary": 5}},
    {"id": 18, "name": "Fairy", "icon_name": "fairy", "description": "A tiny fairy with incredible luck and magic", "base_price_usdt0": 160000, "stat_categories": ["Luck", "Magic", "Speed"], "rarity_distribution": {"common": 60, "rare": 25, "epic": 10, "legendary": 5}},
    {"id": 19, "name": "Cyborg", "icon_name": "cyborg", "description": "A futuristic cyborg with enhanced abilities", "base_price_usdt0": 450000, "stat_categories": ["Speed", "Power", "Precision", "Defense"], "rarity_distribution": {"common": 60, "rare": 25, "epic": 10, "legendary": 5}},
    {"id": 20, "name": "Crystal Ball", "icon_name": "crystal-ball", "description": "A mystical crystal ball revealing fortune and magic", "base_price_usdt0": 10000, "stat_categories": ["Luck", "Magic"], "rarity_distribution": {"common": 60, "rare": 25, "epic": 10, "legendary": 5}},
]


def upgrade() -> None:
    toys_table = sa.table(
        'toys',
        sa.column('id', sa.Integer),
        sa.column('name', sa.String),
        sa.column('icon_name', sa.String),
        sa.column('description', sa.Text),
        sa.column('base_price_usdt0', sa.BigInteger),
        sa.column('max_mint_per_type', sa.Integer),
        sa.column('stat_categories', sa.JSON),
        sa.column('rarity_distribution', sa.JSON),
        sa.column('created_at', sa.DateTime),
    )
    
    now = datetime.utcnow()
    
    for toy in TOYS:
        op.execute(
            toys_table.insert().values(
                id=toy["id"],
                name=toy["name"],
                icon_name=toy["icon_name"],
                description=toy["description"],
                base_price_usdt0=toy["base_price_usdt0"],
                max_mint_per_type=10,
                stat_categories=toy["stat_categories"],
                rarity_distribution=toy["rarity_distribution"],
                created_at=now,
            )
        )


def downgrade() -> None:
    op.execute("DELETE FROM toys WHERE id IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20)")

