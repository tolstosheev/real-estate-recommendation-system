"""Add extended property fields

Revision ID: 56ac5ae38a9f
Revises: d7efa8cc8857
Create Date: 2026-05-06 15:46:51.628268

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '56ac5ae38a9f'
down_revision: Union[str, None] = 'd7efa8cc8857'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('properties', sa.Column('property_purpose', sa.VARCHAR(), nullable=True))
    op.add_column('properties', sa.Column('category', sa.VARCHAR(), nullable=True))
    op.add_column('properties', sa.Column('district', sa.VARCHAR(), nullable=True))
    op.add_column('properties', sa.Column('metro', sa.VARCHAR(), nullable=True))
    op.add_column('properties', sa.Column('sq_living', sa.NUMERIC(), nullable=True))
    op.add_column('properties', sa.Column('sq_kitchen', sa.NUMERIC(), nullable=True))
    op.add_column('properties', sa.Column('build_year', sa.INTEGER(), nullable=True))
    op.add_column('properties', sa.Column('material', sa.VARCHAR(), nullable=True))
    op.add_column('properties', sa.Column('repair_type', sa.VARCHAR(), nullable=True))
    op.add_column('properties', sa.Column('room_type', sa.VARCHAR(), nullable=True))
    op.add_column('properties', sa.Column('is_new', sa.VARCHAR(), nullable=True))
    op.add_column('properties', sa.Column('balcony', sa.VARCHAR(), nullable=True))
    op.add_column('properties', sa.Column('parking', sa.VARCHAR(), nullable=True))


def downgrade() -> None:
    op.drop_column('properties', 'parking')
    op.drop_column('properties', 'balcony')
    op.drop_column('properties', 'is_new')
    op.drop_column('properties', 'room_type')
    op.drop_column('properties', 'repair_type')
    op.drop_column('properties', 'material')
    op.drop_column('properties', 'build_year')
    op.drop_column('properties', 'sq_kitchen')
    op.drop_column('properties', 'sq_living')
    op.drop_column('properties', 'metro')
    op.drop_column('properties', 'district')
    op.drop_column('properties', 'category')
    op.drop_column('properties', 'property_purpose')
