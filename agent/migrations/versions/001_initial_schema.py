"""Initial schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2025-01-27 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Toys table
    op.create_table(
        'toys',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('icon_name', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('base_price_usdt0', sa.BigInteger(), nullable=False),
        sa.Column('max_mint_per_type', sa.Integer(), nullable=False, server_default='10'),
        sa.Column('stat_categories', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('rarity_distribution', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_toys_name'), 'toys', ['name'], unique=False)

    # NFT Toys table
    op.create_table(
        'nft_toys',
        sa.Column('token_id', sa.BigInteger(), nullable=False),
        sa.Column('toy_type_id', sa.Integer(), nullable=False),
        sa.Column('owner_address', sa.String(length=42), nullable=False),
        sa.Column('rarity', sa.String(length=20), nullable=False),
        sa.Column('stats_json', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('mint_number', sa.Integer(), nullable=False),
        sa.Column('minted_at', sa.DateTime(), nullable=False),
        sa.Column('metadata_uri', sa.String(length=500), nullable=True),
        sa.Column('original_purchase_price', sa.BigInteger(), nullable=True),
        sa.ForeignKeyConstraint(['toy_type_id'], ['toys.id'], ),
        sa.PrimaryKeyConstraint('token_id')
    )
    op.create_index(op.f('ix_nft_toys_owner_address'), 'nft_toys', ['owner_address'], unique=False)
    op.create_index(op.f('ix_nft_toys_rarity'), 'nft_toys', ['rarity'], unique=False)
    op.create_index(op.f('ix_nft_toys_toy_type_id'), 'nft_toys', ['toy_type_id'], unique=False)

    # Players table
    op.create_table(
        'players',
        sa.Column('wallet_address', sa.String(length=42), nullable=False),
        sa.Column('nickname', sa.String(length=20), nullable=True),
        sa.Column('credits_balance', sa.Integer(), nullable=False, server_default='100'),
        sa.Column('total_points', sa.BigInteger(), nullable=False, server_default='0'),
        sa.Column('games_played', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('last_active_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('wallet_address'),
        sa.UniqueConstraint('nickname')
    )
    op.create_index(op.f('ix_players_nickname'), 'players', ['nickname'], unique=True)
    op.create_index(op.f('ix_players_total_points'), 'players', ['total_points'], unique=False)
    op.create_index(op.f('ix_players_wallet_address'), 'players', ['wallet_address'], unique=False)

    # Player Inventory table
    op.create_table(
        'player_inventory',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('player_address', sa.String(length=42), nullable=False),
        sa.Column('token_id', sa.BigInteger(), nullable=False),
        sa.Column('slot_number', sa.Integer(), nullable=False),
        sa.Column('equipped_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['player_address'], ['players.wallet_address'], ),
        sa.ForeignKeyConstraint(['token_id'], ['nft_toys.token_id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('player_address', 'slot_number', name='uq_player_slot')
    )
    op.create_index(op.f('ix_player_inventory_player_address'), 'player_inventory', ['player_address'], unique=False)
    op.create_index(op.f('ix_player_inventory_token_id'), 'player_inventory', ['token_id'], unique=False)

    # Daily Bonuses table
    op.create_table(
        'daily_bonuses',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('toy_type_id', sa.Integer(), nullable=False),
        sa.Column('bonus_date', sa.Date(), nullable=False),
        sa.Column('multiplier', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['toy_type_id'], ['toys.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('toy_type_id', 'bonus_date', name='uq_toy_bonus_date')
    )
    op.create_index(op.f('ix_daily_bonuses_bonus_date'), 'daily_bonuses', ['bonus_date'], unique=False)
    op.create_index(op.f('ix_daily_bonuses_toy_type_id'), 'daily_bonuses', ['toy_type_id'], unique=False)

    # Game Sessions table
    op.create_table(
        'game_sessions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('player_address', sa.String(length=42), nullable=False),
        sa.Column('game_type', sa.String(length=50), nullable=False),
        sa.Column('wager_type', sa.String(length=20), nullable=False),
        sa.Column('wager_amount', sa.BigInteger(), nullable=True),
        sa.Column('wager_token_id', sa.BigInteger(), nullable=True),
        sa.Column('points_earned', sa.BigInteger(), nullable=False, server_default='0'),
        sa.Column('base_points', sa.BigInteger(), nullable=False),
        sa.Column('toy_bonus_multiplier', sa.Numeric(precision=5, scale=2), nullable=False, server_default='1.0'),
        sa.Column('daily_bonus_multiplier', sa.Numeric(precision=5, scale=2), nullable=False, server_default='1.0'),
        sa.Column('wager_multiplier', sa.Numeric(precision=5, scale=2), nullable=False, server_default='1.0'),
        sa.Column('game_result_data', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('server_validation_hash', sa.String(length=64), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['player_address'], ['players.wallet_address'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_game_sessions_game_type'), 'game_sessions', ['game_type'], unique=False)
    op.create_index(op.f('ix_game_sessions_player_address'), 'game_sessions', ['player_address'], unique=False)
    op.create_index(op.f('ix_game_sessions_timestamp'), 'game_sessions', ['timestamp'], unique=False)

    # Leaderboard table
    op.create_table(
        'leaderboard',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('player_address', sa.String(length=42), nullable=False),
        sa.Column('week_id', sa.String(length=20), nullable=False),
        sa.Column('points', sa.BigInteger(), nullable=False),
        sa.Column('rank', sa.Integer(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['player_address'], ['players.wallet_address'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('player_address', 'week_id', name='uq_player_week')
    )
    op.create_index(op.f('ix_leaderboard_points'), 'leaderboard', ['points'], unique=False)
    op.create_index(op.f('ix_leaderboard_week_id'), 'leaderboard', ['week_id'], unique=False)

    # Marketplace Listings table
    op.create_table(
        'marketplace_listings',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('token_id', sa.BigInteger(), nullable=False),
        sa.Column('seller_address', sa.String(length=42), nullable=False),
        sa.Column('price_usdt0', sa.BigInteger(), nullable=False),
        sa.Column('listed_at', sa.DateTime(), nullable=False),
        sa.Column('sold_at', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.ForeignKeyConstraint(['seller_address'], ['players.wallet_address'], ),
        sa.ForeignKeyConstraint(['token_id'], ['nft_toys.token_id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_marketplace_listings_is_active'), 'marketplace_listings', ['is_active'], unique=False)
    op.create_index(op.f('ix_marketplace_listings_seller_address'), 'marketplace_listings', ['seller_address'], unique=False)
    op.create_index(op.f('ix_marketplace_listings_token_id'), 'marketplace_listings', ['token_id'], unique=False)

    # Marketplace Sales table
    op.create_table(
        'marketplace_sales',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('listing_id', sa.Integer(), nullable=False),
        sa.Column('token_id', sa.BigInteger(), nullable=False),
        sa.Column('seller_address', sa.String(length=42), nullable=False),
        sa.Column('buyer_address', sa.String(length=42), nullable=False),
        sa.Column('price_usdt0', sa.BigInteger(), nullable=False),
        sa.Column('merchant_fee_usdt0', sa.BigInteger(), nullable=False),
        sa.Column('seller_received_usdt0', sa.BigInteger(), nullable=False),
        sa.Column('sold_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['buyer_address'], ['players.wallet_address'], ),
        sa.ForeignKeyConstraint(['listing_id'], ['marketplace_listings.id'], ),
        sa.ForeignKeyConstraint(['seller_address'], ['players.wallet_address'], ),
        sa.ForeignKeyConstraint(['token_id'], ['nft_toys.token_id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_marketplace_sales_buyer_address'), 'marketplace_sales', ['buyer_address'], unique=False)
    op.create_index(op.f('ix_marketplace_sales_seller_address'), 'marketplace_sales', ['seller_address'], unique=False)
    op.create_index(op.f('ix_marketplace_sales_token_id'), 'marketplace_sales', ['token_id'], unique=False)

    # Weekly Prizes table
    op.create_table(
        'weekly_prizes',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('player_address', sa.String(length=42), nullable=False),
        sa.Column('week_id', sa.String(length=20), nullable=False),
        sa.Column('rank', sa.Integer(), nullable=False),
        sa.Column('prize_amount_usdt0', sa.BigInteger(), nullable=False),
        sa.Column('distributed_at', sa.DateTime(), nullable=True),
        sa.Column('tx_hash', sa.String(length=66), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['player_address'], ['players.wallet_address'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_weekly_prizes_player_address'), 'weekly_prizes', ['player_address'], unique=False)
    op.create_index(op.f('ix_weekly_prizes_week_id'), 'weekly_prizes', ['week_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_weekly_prizes_week_id'), table_name='weekly_prizes')
    op.drop_index(op.f('ix_weekly_prizes_player_address'), table_name='weekly_prizes')
    op.drop_table('weekly_prizes')
    op.drop_index(op.f('ix_marketplace_sales_token_id'), table_name='marketplace_sales')
    op.drop_index(op.f('ix_marketplace_sales_seller_address'), table_name='marketplace_sales')
    op.drop_index(op.f('ix_marketplace_sales_buyer_address'), table_name='marketplace_sales')
    op.drop_table('marketplace_sales')
    op.drop_index(op.f('ix_marketplace_listings_token_id'), table_name='marketplace_listings')
    op.drop_index(op.f('ix_marketplace_listings_seller_address'), table_name='marketplace_listings')
    op.drop_index(op.f('ix_marketplace_listings_is_active'), table_name='marketplace_listings')
    op.drop_table('marketplace_listings')
    op.drop_index(op.f('ix_leaderboard_week_id'), table_name='leaderboard')
    op.drop_index(op.f('ix_leaderboard_points'), table_name='leaderboard')
    op.drop_table('leaderboard')
    op.drop_index(op.f('ix_game_sessions_timestamp'), table_name='game_sessions')
    op.drop_index(op.f('ix_game_sessions_player_address'), table_name='game_sessions')
    op.drop_index(op.f('ix_game_sessions_game_type'), table_name='game_sessions')
    op.drop_table('game_sessions')
    op.drop_index(op.f('ix_daily_bonuses_toy_type_id'), table_name='daily_bonuses')
    op.drop_index(op.f('ix_daily_bonuses_bonus_date'), table_name='daily_bonuses')
    op.drop_table('daily_bonuses')
    op.drop_index(op.f('ix_player_inventory_token_id'), table_name='player_inventory')
    op.drop_index(op.f('ix_player_inventory_player_address'), table_name='player_inventory')
    op.drop_table('player_inventory')
    op.drop_index(op.f('ix_players_wallet_address'), table_name='players')
    op.drop_index(op.f('ix_players_total_points'), table_name='players')
    op.drop_index(op.f('ix_players_nickname'), table_name='players')
    op.drop_table('players')
    op.drop_index(op.f('ix_nft_toys_toy_type_id'), table_name='nft_toys')
    op.drop_index(op.f('ix_nft_toys_rarity'), table_name='nft_toys')
    op.drop_index(op.f('ix_nft_toys_owner_address'), table_name='nft_toys')
    op.drop_table('nft_toys')
    op.drop_index(op.f('ix_toys_name'), table_name='toys')
    op.drop_table('toys')

