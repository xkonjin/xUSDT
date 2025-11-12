"""Add game-specific bonuses

Revision ID: 003_add_game_specific_bonuses
Revises: 002_seed_toys
Create Date: 2025-01-27 14:00:00.000000

Adds game_types column to daily_bonuses to track which games each toy bonus affects.
Also adds games_of_the_day table to track featured games each day.

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '003_add_game_specific_bonuses'
down_revision = '002_seed_toys'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add game_types column to daily_bonuses (JSON array of game type strings)
    # This tracks which games each toy bonus affects (e.g., ["memory_match", "reaction_time"])
    op.add_column(
        'daily_bonuses',
        sa.Column('game_types', postgresql.JSON(astext_type=sa.Text()), nullable=True)
    )
    
    # Create games_of_the_day table to track featured games each day
    # Each day, 2 games are featured and only toys with bonuses for those games provide multipliers
    op.create_table(
        'games_of_the_day',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('date', sa.Date(), nullable=False, index=True),
        sa.Column('game_type_1', sa.String(length=50), nullable=False),
        sa.Column('game_type_2', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('date', name='uq_games_of_day_date')
    )
    op.create_index(op.f('ix_games_of_the_day_date'), 'games_of_the_day', ['date'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_games_of_the_day_date'), table_name='games_of_the_day')
    op.drop_table('games_of_the_day')
    op.drop_column('daily_bonuses', 'game_types')

