"""Add reference tables for property parameters

Revision ID: add_reference_tables
Revises: edc827e8ff8a
Create Date: 2026-05-06
"""

from alembic import op
import sqlalchemy as sa


revision = 'add_reference_tables'
down_revision = 'edc827e8ff8a'
branch_labels = None
depends_on = None


def upgrade() -> None:
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

    # Insert default data
    materials = [
        ('Panel', 'Panel'),
        ('Brick', 'Brick'),
        ('Monolith', 'Monolith'),
        ('Brick-Monolith', 'Brick-Monolith'),
        ('Wood', 'Wood'),
        ('Block', 'Block'),
    ]

    repair_types = [
        ('Cosmetic', 'Cosmetic'),
        ('Euro', 'Euro'),
        ('Design', 'Design'),
        ('Rough', 'Rough'),
    ]

    districts = [
        ('Moscow', 'CAO', 'CAO'),
        ('Moscow', 'SAO', 'SAO'),
        ('Moscow', 'SVAO', 'SVAO'),
        ('Moscow', 'VAO', 'VAO'),
        ('Moscow', 'YVAO', 'YVAO'),
        ('Moscow', 'YUAO', 'YUAO'),
        ('Moscow', 'YZAO', 'YZAO'),
        ('Moscow', 'ZAO', 'ZAO'),
        ('Moscow', 'SZAO', 'SZAO'),
        ('Moscow', 'NAO', 'NAO'),
    ]

    metros = [
        ('Moscow', 'Tverskaya', '#green'),
        ('Moscow', 'Pushkinskaya', '#green'),
        ('Moscow', 'Chekhovskaya', '#grey'),
        ('Moscow', 'Kurskaya', '#brown'),
        ('Moscow', 'Belorusskaya', '#green'),
        ('Moscow', 'Prospekt Mira', '#orange'),
        ('Moscow', 'Novoslobodskaya', '#orange'),
        ('Moscow', 'Kievskaya', '#blue'),
        ('Moscow', 'Smolenskaya', '#blue'),
    ]

    for name, display in materials:
        op.execute(f"INSERT INTO materials (name, display_name) VALUES ('{name}', '{display}')")

    for name, display in repair_types:
        op.execute(f"INSERT INTO repair_types (name, display_name) VALUES ('{name}', '{display}')")

    for city, name, display in districts:
        op.execute(f"INSERT INTO districts (city, name, display_name) VALUES ('{city}', '{name}', '{display}')")

    for city, name, color in metros:
        op.execute(f"INSERT INTO metro_stations (city, name, line_color) VALUES ('{city}', '{name}', '{color}')")


def downgrade() -> None:
    op.drop_table('metro_stations')
    op.drop_table('districts')
    op.drop_table('repair_types')
    op.drop_table('materials')
