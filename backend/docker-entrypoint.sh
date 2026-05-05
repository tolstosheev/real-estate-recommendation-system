#!/bin/bash
set -e

echo "Waiting for database..."
while ! pg_isready -h db -p 5432 -U user; do
    echo "Database is unavailable - sleeping"
    sleep 1
done

echo "Running migrations..."
alembic upgrade head

echo "Starting application..."
exec "$@"
