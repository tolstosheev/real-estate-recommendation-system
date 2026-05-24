# Changelog

## [Unreleased]

### Documentation

- Add API reference with all 24 endpoints, schemas, examples
- Add architecture overview with system design, data flows, algorithm details
- Add project README with quick start, tech stack, test commands

## [1.0.0] — 2026-05-24

### Added

#### Backend

- **Collaborative filtering**: Jaccard similarity user-user collaborative filtering with hybrid scoring (0.7 content + 0.3 collab)
  - `InteractionRepository.get_users_liked_properties()` — bulk fetch of all liked property sets
  - `RecommendationService._find_similar_users()` — Jaccard-based similarity search (top-10, min 3 likes threshold)
  - `RecommendationService._score_collaborative()` — aggregate likes from similar users, normalize to [0, 1]
- **CI/CD pipeline**: GitHub Actions with Ruff, MyPy, pytest (90% coverage), ESLint, vitest (90% lines), Bandit SAST, pip-audit/npm audit SCA
- **Docker non-root user** for security hardening
- **S3-compatible image storage** via MinIO with upload/delete/serve endpoints
- **Geospatial search** with PostGIS bounding box queries (`ST_MakeEnvelope`, `ST_Intersects`)
- **GIST index** on properties.location for spatial query performance
- **Yandex Maps API 3** integration on frontend with dynamic component loading
- **Yandex Geocoder** proxy on backend with address auto-fill on property creation
- **Hybrid recommendation engine**: 14-dim feature vector, feature-weighted cosine similarity, MMR diversification (λ=0.7), progressive filter relaxation, Redis caching
- **Layer-separated architecture**: API → Service → Repository
- **Image upload**: multipart upload to MinIO with validation (type, size, count limits)
- **Reference tables**: materials, repair_types, districts, metro_stations for filter metadata
- **Guest mode**: public routes accessible without authentication
- **URL-based filters** with session persistence, reset, city auto-centering
- **Client-side form validation** with debounced address autocomplete
- **Filter parameters utility** for URL-based filter state management
- **Interactions toggle**: like/unlike with atomic counter sync
- **Password policy**: min 8 chars, must contain uppercase, lowercase, digit
- **Contact protection**: prevent clearing all contacts when user has active listings

#### Frontend

- **FSD architecture**: app/pages/features/entities/widgets/shared layers
- **8 pages**: Home, Map, Catalog, Property Details, Login, Register, Onboarding, Profile, Add Property
- **Redux Toolkit** store with auth slice and middleware
- **Axios client** with JWT interceptor, token refresh queue (prevents concurrent refresh storms)
- **Yandex Maps 3** with clustering, markers, bbox search
- **Swiper carousel** for recommendations on Home page
- **FilterPanel widget** with price range, rooms, property type, purpose, etc.
- **PropertyForm feature** with all extended fields, geocoder autofill, image upload
- **ImageUploader feature** with preview and validation
- **ErrorBoundary** component
- **Responsive design** with SCSS variables, mixins, breakpoints
- **Onboarding wizard** with visual illustrations and animations
- **Profile page** with contact info, preferences, owned property management
- **TokenService**: in-memory + localStorage JWT management
- **Infinite scroll** on Map via IntersectionObserver
- **City auto-centering** on map when filter changes

### Changed

- **Backend architecture**: monolithic models.py → separate domain files (user, property, interaction, reference)
- **Properties endpoints**: split into read (properties_read.py) and write (properties_write.py) modules
- **Models split**: user.py, property.py, interaction.py with proper __init__.py re-exports
- **FSD extraction**: FilterPanel, TabBar, PropertyGrid widgets extracted from page components
- **Recommendation engine**: 13-dim → 14-dim vector, feature weights (price×2, purpose×1.5, city×2), MMR diversification
- **Material/repair_type**: VARCHAR → ARRAY in preferences schema
- **Docker configuration**: healthchecks, dependencies, non-root user
- **Populate scripts**: realistic properties with real geocoding across 10 cities (500+ properties)
- **CI pipeline**: full quality gate with SAST/SCA

### Fixed

- **Layer violations**: delegate DB/Redis access from endpoints to services
- **Race conditions**: unique constraint on interactions, atomic counters, upsert pattern
- **Security issues**:
  - Exception details leak in error responses
  - Empty JWT_SECRET_KEY rejection
  - Hardcoded credentials removed from docker-compose
  - Mass assignment protection via whitelisted update fields
  - PII exposure: owner contacts only visible to authenticated users
- **Performance**: batch queries, vectorized cosine similarity, shared HTTP clients, LIMIT hardcaps
- **Frontend crashes**: undefined geocoder, broken YMapMarker, zero-floor filter, image field stripping
- **Runtime issues**: favorites sorting, catalog pagination, delete modal styling
- **Auth flow**: JWT redirect to onboarding, profile save support, logout token clearing
- **Interaction API**: endpoint path alignment between frontend and backend
- **Geocoder**: required lang parameter for Yandex API
- **Type hints**: Pydantic V2 deprecation warnings, strict MyPy configuration

### Removed

- Dead code: reference models, user columns, frontend components, empty barrels, MSW mocks
- Deprecated scripts: old population scripts, unused middleware
- Hardcoded API keys from docker-compose
- Comments from codebase (self-documenting code policy)

### Security

- SAST: Bandit in CI pipeline
- SCA: pip-audit (Python), npm audit (Node.js)
- JWT: SECRET_KEY min 32 bytes validation
- Password: bcrypt hashing with server-side policy enforcement
- Rate limiting: interaction uniqueness prevents duplicate operations
