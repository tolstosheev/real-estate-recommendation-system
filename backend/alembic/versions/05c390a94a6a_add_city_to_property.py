"""Add city column to properties

Revision ID: 05c390a94a6a
Revises: 97c6db74240c
Create Date: 2026-05-07 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '05c390a94a6a'
down_revision = 'add_reference_tables'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('properties', sa.Column('city', sa.String(), nullable=True))
    op.create_index('idx_properties_city', 'properties', ['city'], unique=False)


def downgrade() -> None:
    op.drop_index('idx_properties_city')
    op.drop_column('properties', 'city')
