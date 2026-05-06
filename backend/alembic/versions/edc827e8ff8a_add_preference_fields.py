"""Add new preference fields

Revision ID: edc827e8ff8a
Revises: 56ac5ae38a9f
Create Date: 2026-05-06 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'edc827e8ff8a'
down_revision = '56ac5ae38a9f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('user_preferences', sa.Column('district', sa.String(), nullable=True))
    op.add_column('user_preferences', sa.Column('metro', sa.String(), nullable=True))
    op.add_column('user_preferences', sa.Column('material', sa.String(), nullable=True))
    op.add_column('user_preferences', sa.Column('repair_type', sa.String(), nullable=True))
    op.add_column('user_preferences', sa.Column('min_build_year', sa.Integer(), nullable=True))
    op.add_column('user_preferences', sa.Column('max_build_year', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('user_preferences', 'max_build_year')
    op.drop_column('user_preferences', 'min_build_year')
    op.drop_column('user_preferences', 'repair_type')
    op.drop_column('user_preferences', 'material')
    op.drop_column('user_preferences', 'metro')
    op.drop_column('user_preferences', 'district')
