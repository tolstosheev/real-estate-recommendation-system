"""Add UNIQUE constraint on interactions, drop unused reference tables and columns

Revision ID: f1a2b3c4d5e6
Revises: change_material_repair_to_array
Create Date: 2026-05-25 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'f1a2b3c4d5e6'
down_revision = 'change_material_repair_to_array'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add UNIQUE constraint that exists in model but missing in DB
    op.create_unique_constraint(
        'uq_user_property_interaction',
        'interactions',
        ['user_id', 'property_id', 'interaction_type'],
    )

    # Drop unused reference tables (created by migration add_reference_tables
    # but never used in code — values are read via SELECT DISTINCT from properties)
    op.drop_table('metro_stations')
    op.drop_table('districts')
    op.drop_table('repair_types')
    op.drop_table('materials')

    # Drop dead columns from user_preferences (not in ORM model, never used)
    op.drop_column('user_preferences', 'tags')
    op.drop_column('user_preferences', 'priority_weight')


def downgrade() -> None:
    # Recreate dead columns
    op.add_column('user_preferences', sa.Column('priority_weight', sa.JSON(), nullable=True))
    op.add_column('user_preferences', sa.Column('tags', sa.ARRAY(sa.String()), nullable=True))

    # Recreate reference tables
    op.create_table(
        'materials',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(50), unique=True, nullable=False),
        sa.Column('display_name', sa.String(100), nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True),
    )
    op.create_table(
        'repair_types',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(50), unique=True, nullable=False),
        sa.Column('display_name', sa.String(100), nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True),
    )
    op.create_table(
        'districts',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('city', sa.String(100), nullable=False),
        sa.Column('name', sa.String(50), nullable=False),
        sa.Column('display_name', sa.String(100), nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True),
    )
    op.create_table(
        'metro_stations',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('city', sa.String(100), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('line_color', sa.String(20)),
        sa.Column('is_active', sa.Boolean(), default=True),
    )

    # Drop the unique constraint
    op.drop_constraint('uq_user_property_interaction', 'interactions', type_='unique')
