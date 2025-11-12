"""Add user profiles

Revision ID: 006_add_user_profiles
Revises: 005_add_user_balances
Create Date: 2025-01-27 16:30:00.000000

Adds user_profiles table for display names and identity management.
Users can set display names that appear on leaderboards instead of wallet addresses.

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '006_add_user_profiles'
down_revision = '005_add_user_balances'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create user_profiles table
    # Stores user display names and profile information
    op.create_table(
        'user_profiles',
        sa.Column('wallet_address', sa.String(length=42), primary_key=True, nullable=False, index=True),
        sa.Column('display_name', sa.String(length=20), nullable=True, unique=True, index=True),  # 3-20 characters, unique
        sa.Column('avatar_url', sa.String(length=500), nullable=True),  # Optional avatar image URL
        sa.Column('bio', sa.Text(), nullable=True),  # Optional bio text
        sa.Column('created_at', sa.DateTime(), nullable=False, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index('ix_user_profiles_wallet_address', 'user_profiles', ['wallet_address'], unique=True)
    op.create_index('ix_user_profiles_display_name', 'user_profiles', ['display_name'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_user_profiles_display_name', table_name='user_profiles')
    op.drop_index('ix_user_profiles_wallet_address', table_name='user_profiles')
    op.drop_table('user_profiles')

