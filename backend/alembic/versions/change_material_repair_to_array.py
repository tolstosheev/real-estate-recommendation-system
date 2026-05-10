"""Change material and repair_type in user_preferences to ARRAY(String)

Revision ID: change_material_repair_to_array
Revises: 123456789abc
Create Date: 2026-05-10 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = 'change_material_repair_to_array'
down_revision = '123456789abc'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE user_preferences
        ALTER COLUMN material TYPE VARCHAR[]
        USING CASE WHEN material IS NULL THEN NULL ELSE ARRAY[material] END
    """)
    op.execute("""
        ALTER TABLE user_preferences
        ALTER COLUMN repair_type TYPE VARCHAR[]
        USING CASE WHEN repair_type IS NULL THEN NULL ELSE ARRAY[repair_type] END
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE user_preferences
        ALTER COLUMN material TYPE VARCHAR
        USING CASE WHEN material IS NULL THEN NULL ELSE material[1] END
    """)
    op.execute("""
        ALTER TABLE user_preferences
        ALTER COLUMN repair_type TYPE VARCHAR
        USING CASE WHEN repair_type IS NULL THEN NULL ELSE repair_type[1] END
    """)
