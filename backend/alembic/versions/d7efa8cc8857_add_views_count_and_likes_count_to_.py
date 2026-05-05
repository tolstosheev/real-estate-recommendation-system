"""Add views_count and likes_count to properties

Revision ID: d7efa8cc8857
Revises: 97c6db74240c
Create Date: 2026-05-05 14:48:27.409899

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd7efa8cc8857'
down_revision: str = '97c6db74240c'
branch_labels: tuple = None
depends_on: tuple = None


def upgrade() -> None:
    op.add_column('properties', sa.Column('views_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('properties', sa.Column('likes_count', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('properties', 'likes_count')
    op.drop_column('properties', 'views_count')
