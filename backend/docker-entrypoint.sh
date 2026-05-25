#!/bin/bash
set -e

echo "Waiting for database..."
while ! pg_isready -h db -p 5432 -U user; do
    echo "Database is unavailable - sleeping"
    sleep 1
done

echo "Enabling PostGIS extension..."
PGPASSWORD="${PGPASSWORD:-${POSTGRES_PASSWORD:-password}}" psql -h db -U "${POSTGRES_USER:-user}" -d "${POSTGRES_DB:-nestai_db}" -c "CREATE EXTENSION IF NOT EXISTS postgis" 2>/dev/null || echo "PostGIS extension may already exist"

echo "Running migrations..."
alembic upgrade head

echo "Starting application..."
exec "$@"
