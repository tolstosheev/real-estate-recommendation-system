"""Initial migration

Revision ID: 97c6db74240c
Revises: 
Create Date: 2026-05-05 10:47:25.349241

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geometry


# revision identifiers, used by Alembic.
revision: str = '97c6db74240c'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('users',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('full_name', sa.String(), nullable=True),
        sa.Column('phone_number', sa.String(), nullable=True),
        sa.Column('telegram_handle', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )

    op.create_table('properties',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('price', sa.Numeric(), nullable=False),
        sa.Column('rooms', sa.Integer(), nullable=True),
        sa.Column('area', sa.Numeric(), nullable=True),
        sa.Column('floor', sa.Integer(), nullable=True),
        sa.Column('total_floors', sa.Integer(), nullable=True),
        sa.Column('property_type', sa.String(), nullable=True),
        sa.Column('address', sa.String(), nullable=True),
        sa.Column('location', Geometry('POINT', 4326), nullable=True),
        sa.Column('images', sa.ARRAY(sa.String()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'])
    )

    op.create_table('user_preferences',
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('min_price', sa.Numeric(), nullable=True),
        sa.Column('max_price', sa.Numeric(), nullable=True),
        sa.Column('min_area', sa.Numeric(), nullable=True),
        sa.Column('preferred_rooms', sa.ARRAY(sa.Integer()), nullable=True),
        sa.Column('tags', sa.ARRAY(sa.String()), nullable=True),
        sa.Column('priority_weight', sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint('user_id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'])
    )

    op.create_table('interactions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('property_id', sa.UUID(), nullable=False),
        sa.Column('interaction_type', sa.String(), nullable=True),
        sa.Column('weight', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['property_id'], ['properties.id'])
    )


def downgrade() -> None:
    op.drop_table('interactions')
    op.drop_table('user_preferences')
    op.drop_table('properties')
    op.drop_table('users')
