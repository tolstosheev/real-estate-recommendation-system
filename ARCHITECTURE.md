# Architecture

## Overview

nestAI is a full-stack real estate recommendation system with a **3-layer backend** (API → Service → Repository), **FSD frontend**, and a **hybrid recommendation engine** combining content-based and collaborative filtering.

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Frontend   │────▶│   FastAPI    │────▶│ PostgreSQL  │
│  React + FSD │     │  3-layer     │     │  + PostGIS  │
└─────────────┘     ├──────────────┤     ├─────────────┤
                    │    Redis     │     │    MinIO    │
                    │   (cache)    │     │   (images)  │
                    └──────────────┘     └─────────────┘
```

## Backend: 3-Layer Architecture

```
api/endpoints/      ← HTTP handlers, validation, auth
    │
services/           ← Business logic, orchestration
    │
repositories/       ← SQL queries, data access
    │
models/             ← SQLAlchemy ORM models
```

### Layer Responsibilities

| Layer | Role | Example |
|---|---|---|
| **API** | HTTP routing, auth, request validation, response formatting | `PropertyController` validates query params, calls service, returns JSON |
| **Service** | Business logic, cross-cutting concerns, caching | `RecommendationService` builds user vector, scores, diversifies |
| **Repository** | SQL queries, joins, aggregations | `PropertyRepository.get_all()` builds dynamic WHERE clauses |

### Key Services

| Service | Responsibility |
|---|---|
| `AuthService` | Registration, JWT creation/refresh, password validation |
| `PropertyService` | CRUD, geocoding on create, enrichment (owner, likes), Redis caching |
| `InteractionService` | Like/view toggle, likes count sync |
| `RecommendationService` | **Hybrid ML engine** — see below |
| `ImageService` | MinIO upload/delete/serve, file validation |
| `GeocodingService` | Yandex Geocoder proxy |

## Frontend: Feature-Sliced Design (FSD)

```
src/
  app/          App init, store, routing, global styles
  pages/        Page-level composition (Home, Map, Catalog, Profile…)
  features/     User interactions (property form, image upload)
  entities/     Business entities (property, user)
  widgets/      Reusable blocks (FilterPanel)
  shared/       Infrastructure: API client, UI kit, lib, utils
  assets/       Static files
```

### Routing

| Route | Page | Access |
|---|---|---|
| `/` | Home | Public |
| `/map` | Map | Public |
| `/catalog` | Catalog | Public |
| `/property/:id` | Property Details | Public |
| `/login` | Login | Guest only |
| `/register` | Register | Guest only |
| `/onboarding` | Onboarding | Guest only |
| `/profile` | Profile | Auth required |
| `/add-property` | Add Property | Auth required |

### State Management

Redux Toolkit with a single `auth` slice. JWT token stored in localStorage + in-memory cache. Axios interceptor handles automatic token refresh on 401 responses.

## Data Model

### Users

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `email` | VARCHAR | Unique, used for login |
| `hashed_password` | VARCHAR | bcrypt |
| `full_name` | VARCHAR | |
| `phone_number` | VARCHAR | PII — visible to property owners only |
| `telegram_handle` | VARCHAR | PII |

### User Preferences

| Column | Type | Notes |
|---|---|---|
| `user_id` | UUID | FK → users, PK |
| `min_price` / `max_price` | NUMERIC | Price range |
| `min_area` / `max_area` | NUMERIC | Area range |
| `preferred_rooms` | INTEGER[] | Array of room counts |
| `property_types` | VARCHAR[] | Array of types |
| `property_purposes` | VARCHAR[] | Array of purposes |
| `cities` | VARCHAR[] | Preferred cities |
| `material` / `repair_type` | VARCHAR[] | Array filters |
| `min_build_year` / `max_build_year` | INTEGER | Year range |

### Properties

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → users (owner) |
| `title`, `description` | VARCHAR / TEXT | |
| `price` | NUMERIC | |
| `area` / `rooms` | NUMERIC / INTEGER | |
| `property_type` | VARCHAR | apartment, studio, house, townhouse |
| `property_purpose` | VARCHAR | sale, rent, daily_rent |
| `city` / `address` | VARCHAR | |
| `location` | GEOMETRY(Point, 4326) | PostGIS spatial index |
| `images` | VARCHAR[] | URLs |
| `views_count` / `likes_count` | INTEGER | Denormalized counters |
| `build_year` / `material` / `repair_type` | VARCHAR | |
| `balcony` / `parking` | BOOLEAN | |
| `is_new` | BOOLEAN | New development flag |

### Interactions

| Column | Type | Notes |
|---|---|---|
| `user_id` | UUID | FK → users |
| `property_id` | UUID | FK → properties |
| `interaction_type` | VARCHAR | `like` or `view` |
| `weight` | INTEGER | Default 5 for likes |
| `created_at` | TIMESTAMP | |
| UNIQUE | (user_id, property_id, interaction_type) | Prevents duplicates |

## Recommendation Engine

### Pipeline

```
User Vector ──┐
               ├── Cosine Similarity ── Content Score ──┐
Property Vectors ──┘                                    │
                                                        ├── Hybrid Score
        Favorites ── Jaccard Similarity ── Collab Score ──┘
                          │
                    Top-10 similar users
                          │
                    Aggregate liked properties
                          │
                    Normalize to [0, 1]
```

### Feature Vector (14 dimensions)

| Index | Feature | Weight | Notes |
|---|---|---|---|
| 0 | Price | 2.0 | |
| 1 | Area | 1.5 | |
| 2 | Rooms | 1.5 | |
| 3-4 | Lon / Lat | 0.5 | Zeroed if user has no location |
| 5 | Build year | 0.5 | |
| 6-9 | Property type (one-hot) | 0.5 | Apartment, Studio, House, Townhouse |
| 10-12 | Purpose (one-hot) | 1.5 | Sale, Rent, Daily rent |
| 13 | City match | 2.0 | Zeroed if city filter is active |

### Scoring

1. **Content-based**: Feature-weighted cosine similarity between user profile vector and property vectors (StandardScaler normalized)
2. **Collaborative**: Jaccard similarity on liked property sets → find top-10 similar users → aggregate their liked candidates → normalize by max count
3. **Hybrid**: `0.7 × content_score + 0.3 × collab_score` (collab only if user has ≥3 likes)

### Diversification (MMR)

Maximum Marginal Relevance with λ = 0.7 balances relevance and diversity:

```
MMR = λ × score(i) − (1 − λ) × max_sim(i, selected)
```

### Filter Relaxation

If fewer candidates than `limit` are found, filters are progressively relaxed:

1. Strict: city, purpose, price range
2. Remove: material, repair_type
3. Remove: rooms, area, build_year
4. Remove: property_type

### Caching

| Cache Key | TTL | Invalidated On |
|---|---|---|
| `user_vec:{user_id}` | 1h | Interaction or preference update |
| `user_recs:{user_id}:{limit}` | 1h | Interaction or preference update |
| `property:{property_id}` | 1h | Property update |

## Data Flows

### Recommendation Request

```
Client → GET /api/recommendations/
  → RecommendationService.recommend(user_id)
    → PrefRepo.get_by_user_id → get preferences
    → InteractionRepo.get_user_favorites → liked properties
    → InteractionRepo.get_user_view_history → viewed properties
    → PropertyRepo.get_all → candidates (with relaxation)
    → SimilarityUtils.build_user_vector → weighted profile
    → Cosine similarity → content scores
    → InteractionRepo.get_users_liked_properties → Jaccard
    → MMR diversification
    → PropertyService.batch_enrich_recs → add owner/likes info
  → JSON response
```

### Interaction (Like/View)

```
Client → POST /api/interactions/interact { property_id, type }
  → InteractionService.add_interaction
    → Find existing interaction
    → Toggle (remove if already liked) or create
    → Update likes_count on property
    → Redis cache invalidation
  → JSON { status: "liked" | "removed" | "viewed" }
```
