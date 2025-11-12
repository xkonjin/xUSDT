"""Add predictions and prediction leaderboards

Revision ID: 004_add_predictions
Revises: 003_add_game_specific_bonuses
Create Date: 2025-01-27 15:00:00.000000

Adds tables for Polymarket predictions:
- predictions: Tracks user predictions and bets on Polymarket markets
- prediction_leaderboards: Tracks user rankings based on prediction accuracy

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic.
revision = '004_add_predictions'
down_revision = '003_add_game_specific_bonuses'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create predictions table
    # Tracks user predictions on Polymarket markets with bet amounts and outcomes
    op.create_table(
        'predictions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('user_address', sa.String(length=42), nullable=False, index=True),  # Wallet address
        sa.Column('market_id', sa.String(length=100), nullable=False, index=True),  # Polymarket market ID
        sa.Column('market_question', sa.Text(), nullable=True),  # Market question for display
        sa.Column('outcome', sa.String(length=50), nullable=False),  # YES/NO or outcome ID
        sa.Column('predicted_price', sa.Numeric(precision=10, scale=4), nullable=True),  # User's predicted price (0-1)
        sa.Column('bet_amount_usdt0', sa.BigInteger(), nullable=False),  # Amount in USDT0 atomic units (6 decimals)
        sa.Column('bet_amount_usdc', sa.BigInteger(), nullable=True),  # Converted amount in USDC atomic units (6 decimals)
        sa.Column('polymarket_order_id', sa.String(length=100), nullable=True, index=True),  # Order ID from Polymarket API
        sa.Column('status', sa.String(length=20), nullable=False, default='pending', index=True),  # pending, placed, filled, cancelled, resolved
        sa.Column('conversion_tx_hash', sa.String(length=66), nullable=True),  # Transaction hash for USDT0→USDC conversion
        sa.Column('created_at', sa.DateTime(), nullable=False, default=sa.func.now()),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),  # When market resolved
        sa.Column('outcome_result', sa.String(length=50), nullable=True),  # Actual outcome when resolved
        sa.Column('profit_loss', sa.Numeric(precision=20, scale=6), nullable=True),  # P&L when resolved (can be negative)
        sa.Column('resolved_price', sa.Numeric(precision=10, scale=4), nullable=True),  # Final market price (0-1)
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_predictions_user_address', 'predictions', ['user_address'])
    op.create_index('ix_predictions_market_id', 'predictions', ['market_id'])
    op.create_index('ix_predictions_status', 'predictions', ['status'])
    op.create_index('ix_predictions_polymarket_order_id', 'predictions', ['polymarket_order_id'], unique=True)
    op.create_index('ix_predictions_created_at', 'predictions', ['created_at'])
    
    # Create prediction_leaderboards table
    # Tracks user rankings based on prediction accuracy, volume, and P&L
    op.create_table(
        'prediction_leaderboards',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_address', sa.String(length=42), nullable=False, index=True),  # Wallet address
        sa.Column('period', sa.String(length=20), nullable=False, index=True),  # daily, weekly, monthly, alltime
        sa.Column('period_start', sa.Date(), nullable=False, index=True),  # Start date of period
        sa.Column('total_predictions', sa.Integer(), nullable=False, default=0),  # Total predictions made
        sa.Column('correct_predictions', sa.Integer(), nullable=False, default=0),  # Correct predictions
        sa.Column('accuracy_percentage', sa.Numeric(precision=5, scale=2), nullable=False, default=0),  # Win rate percentage
        sa.Column('total_volume_usdt0', sa.BigInteger(), nullable=False, default=0),  # Total volume bet in USDT0
        sa.Column('total_profit_loss', sa.Numeric(precision=20, scale=6), nullable=False, default=0),  # Total P&L
        sa.Column('rank', sa.Integer(), nullable=True, index=True),  # Calculated rank (1, 2, 3, ...)
        sa.Column('updated_at', sa.DateTime(), nullable=False, default=sa.func.now(), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_address', 'period', 'period_start', name='uq_leaderboard_user_period'),
    )
    op.create_index('ix_prediction_leaderboards_user_address', 'prediction_leaderboards', ['user_address'])
    op.create_index('ix_prediction_leaderboards_period', 'prediction_leaderboards', ['period'])
    op.create_index('ix_prediction_leaderboards_period_start', 'prediction_leaderboards', ['period_start'])
    op.create_index('ix_prediction_leaderboards_rank', 'prediction_leaderboards', ['rank'])
    op.create_index('ix_prediction_leaderboards_accuracy', 'prediction_leaderboards', ['accuracy_percentage'], unique=False)
    op.create_index('ix_prediction_leaderboards_profit_loss', 'prediction_leaderboards', ['total_profit_loss'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_prediction_leaderboards_profit_loss', table_name='prediction_leaderboards')
    op.drop_index('ix_prediction_leaderboards_accuracy', table_name='prediction_leaderboards')
    op.drop_index('ix_prediction_leaderboards_rank', table_name='prediction_leaderboards')
    op.drop_index('ix_prediction_leaderboards_period_start', table_name='prediction_leaderboards')
    op.drop_index('ix_prediction_leaderboards_period', table_name='prediction_leaderboards')
    op.drop_index('ix_prediction_leaderboards_user_address', table_name='prediction_leaderboards')
    op.drop_table('prediction_leaderboards')
    
    op.drop_index('ix_predictions_created_at', table_name='predictions')
    op.drop_index('ix_predictions_polymarket_order_id', table_name='predictions')
    op.drop_index('ix_predictions_status', table_name='predictions')
    op.drop_index('ix_predictions_market_id', table_name='predictions')
    op.drop_index('ix_predictions_user_address', table_name='predictions')
    op.drop_table('predictions')

