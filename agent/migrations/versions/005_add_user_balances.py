"""Add user balances and deposits

Revision ID: 005_add_user_balances
Revises: 004_add_predictions
Create Date: 2025-01-27 16:00:00.000000

Adds tables for balance management:
- user_balances: Tracks user USDC balances (pre-converted)
- deposits: Tracks USDT0 deposits and conversions

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic.
revision = '005_add_user_balances'
down_revision = '004_add_predictions'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create user_balances table
    # Tracks user USDC balances for instant betting (pre-converted from USDT0)
    op.create_table(
        'user_balances',
        sa.Column('user_address', sa.String(length=42), primary_key=True, nullable=False, index=True),
        sa.Column('usdc_balance', sa.BigInteger(), nullable=False, default=0),  # Balance in USDC atomic units (6 decimals)
        sa.Column('pending_deposits', sa.BigInteger(), nullable=False, default=0),  # USDT0 awaiting conversion
        sa.Column('total_deposited', sa.BigInteger(), nullable=False, default=0),  # Lifetime deposits in USDT0
        sa.Column('total_withdrawn', sa.BigInteger(), nullable=False, default=0),  # Lifetime withdrawals in USDT0
        sa.Column('updated_at', sa.DateTime(), nullable=False, default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index('ix_user_balances_user_address', 'user_balances', ['user_address'], unique=True)
    
    # Create deposits table
    # Tracks USDT0 deposits and their conversion to USDC
    op.create_table(
        'deposits',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('user_address', sa.String(length=42), nullable=False, index=True),
        sa.Column('invoice_id', sa.String(length=100), nullable=True, unique=True, index=True),  # x402 invoice ID
        sa.Column('usdt0_amount', sa.BigInteger(), nullable=False),  # Deposited amount in USDT0 atomic units
        sa.Column('usdc_amount', sa.BigInteger(), nullable=True),  # Converted amount in USDC atomic units
        sa.Column('conversion_tx_hash', sa.String(length=66), nullable=True),  # Polygon conversion transaction
        sa.Column('status', sa.String(length=20), nullable=False, default='pending', index=True),  # pending, converting, completed, failed
        sa.Column('created_at', sa.DateTime(), nullable=False, default=sa.func.now()),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_deposits_user_address', 'deposits', ['user_address'])
    op.create_index('ix_deposits_status', 'deposits', ['status'])
    op.create_index('ix_deposits_invoice_id', 'deposits', ['invoice_id'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_deposits_invoice_id', table_name='deposits')
    op.drop_index('ix_deposits_status', table_name='deposits')
    op.drop_index('ix_deposits_user_address', table_name='deposits')
    op.drop_table('deposits')
    op.drop_index('ix_user_balances_user_address', table_name='user_balances')
    op.drop_table('user_balances')

