"""Add liquidity buffer

Revision ID: 007_add_liquidity_buffer
Revises: 006_add_user_profiles
Create Date: 2025-01-27 18:00:00.000000

Adds table for global liquidity buffer management:
- liquidity_buffer: Tracks global USDC buffer on Polygon for instant betting
  This buffer limits the maximum bet amount globally across all users.

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '007_add_liquidity_buffer'
down_revision = '006_add_user_profiles'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create liquidity_buffer table
    # Tracks global USDC buffer on Polygon that limits max bet amounts
    # This is a singleton table (only one row) that tracks the available liquidity
    op.create_table(
        'liquidity_buffer',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('buffer_id', sa.String(length=50), nullable=False, unique=True, default='global', index=True),  # Singleton identifier
        sa.Column('usdc_balance', sa.BigInteger(), nullable=False, default=0),  # Current USDC balance on Polygon (atomic units, 6 decimals)
        sa.Column('min_buffer_size', sa.BigInteger(), nullable=False, default=10_000_000_000),  # Minimum buffer size (10,000 USDC default)
        sa.Column('max_buffer_size', sa.BigInteger(), nullable=True),  # Maximum buffer size (optional cap)
        sa.Column('total_deposited', sa.BigInteger(), nullable=False, default=0),  # Lifetime total deposited to buffer
        sa.Column('total_withdrawn', sa.BigInteger(), nullable=False, default=0),  # Lifetime total withdrawn from buffer
        sa.Column('last_replenished_at', sa.DateTime(), nullable=True),  # Last time buffer was replenished
        sa.Column('updated_at', sa.DateTime(), nullable=False, default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index('ix_liquidity_buffer_buffer_id', 'liquidity_buffer', ['buffer_id'], unique=True)
    
    # Insert initial buffer record with zero balance
    # This will be funded via conversions or manual deposits
    op.execute("""
        INSERT INTO liquidity_buffer (buffer_id, usdc_balance, min_buffer_size, total_deposited, total_withdrawn, updated_at)
        VALUES ('global', 0, 10000000000, 0, 0, NOW())
    """)


def downgrade() -> None:
    op.drop_index('ix_liquidity_buffer_buffer_id', table_name='liquidity_buffer')
    op.drop_table('liquidity_buffer')

