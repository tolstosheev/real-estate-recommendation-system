"""Add max_area, property_types, property_purposes, cities to user_preferences

Revision ID: 123456789abc
Revises: 05c390a94a6a
Create Date: 2026-05-09 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '123456789abc'
down_revision = '05c390a94a6a'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('user_preferences', sa.Column('max_area', sa.Numeric(), nullable=True))
    op.add_column('user_preferences', sa.Column('property_types', postgresql.ARRAY(sa.String()), nullable=True))
    op.add_column('user_preferences', sa.Column('property_purposes', postgresql.ARRAY(sa.String()), nullable=True))
    op.add_column('user_preferences', sa.Column('cities', postgresql.ARRAY(sa.String()), nullable=True))
    op.drop_column('user_preferences', 'district')
    op.drop_column('user_preferences', 'metro')


def downgrade() -> None:
    op.add_column('user_preferences', sa.Column('metro', sa.String(), nullable=True))
    op.add_column('user_preferences', sa.Column('district', sa.String(), nullable=True))
    op.drop_column('user_preferences', 'cities')
    op.drop_column('user_preferences', 'property_purposes')
    op.drop_column('user_preferences', 'property_types')
    op.drop_column('user_preferences', 'max_area')
