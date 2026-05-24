# nestAI

Hybrid recommendation system for real estate — content-based filtering combined with collaborative filtering (Jaccard similarity). Built with FastAPI + React + PostGIS.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 (async), asyncpg |
| Frontend | React 19, TypeScript, Redux Toolkit, Vite, FSD architecture |
| Database | PostgreSQL 15 + PostGIS |
| Caching | Redis 7 |
| Storage | MinIO (S3-compatible) |
| Maps | Yandex Maps API 3 + Yandex Geocoder |
| ML | scikit-learn (cosine similarity, StandardScaler) |
| CI | GitHub Actions — Ruff, MyPy, ESLint, pytest (90% cov), vitest (90% cov), Bandit, pip-audit, npm audit |

## Quick Start

```bash
docker compose up -d
```

Services:
- **Backend** — http://localhost:8000
- **Frontend** — http://localhost:3000
- **MinIO Console** — http://localhost:9001

## Run Tests

```bash
# Backend (all tests including integration + e2e)
docker compose run --rm test

# Frontend
cd frontend && npm test -- --run

# Linters & SAST
cd backend && ruff check . && mypy . && bandit -c pyproject.toml -r app/
cd frontend && npm run lint && npx tsc --noEmit
```

## Project Structure

```
real-estate-recommendation-system/
  backend/          # Python FastAPI (3-layer: api → service → repository)
  frontend/         # React TypeScript (FSD: app/pages/features/entities/widgets/shared)
  docker-compose.yml
```

## Documentation

- [Architecture](ARCHITECTURE.md)
- [API Reference](API.md)
- [Contributing](CONTRIBUTING.md)
- [Testing](TESTING.md)
- [Docker Setup](DOCKER.md)
- [Deployment](DEPLOYMENT.md)
- [Security](SECURITY.md)
- [Changelog](CHANGELOG.md)

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Key variables: `JWT_SECRET_KEY`, `YANDEX_API_KEY`, `S3_*` (MinIO), `DATABASE_URL*`.
