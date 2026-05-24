# Changelog

## [1.0.0] — 2026-05-24

### Добавлено

#### Бэкенд

- **Коллаборативная фильтрация**: Jaccard similarity user-user collaborative filtering с гибридным скорингом (0.7 content + 0.3 collab)
  - `InteractionRepository.get_users_liked_properties()` — массовая загрузка множеств лайков всех пользователей
  - `RecommendationService._find_similar_users()` — Jaccard-based поиск похожих (top-10, min 3 лайка)
  - `RecommendationService._score_collaborative()` — агрегация лайков похожих пользователей с нормализацией [0, 1]
- **CI/CD pipeline**: GitHub Actions — Ruff, MyPy, pytest (90% coverage), ESLint, vitest (90% lines), Bandit SAST, pip-audit/npm audit SCA
- **Docker**: non-root пользователь для безопасности
- **S3-хранилище**: MinIO для изображений — загрузка/удаление/отдача с валидацией
- **Геопространственный поиск**: PostGIS bounding box (`ST_MakeEnvelope`, `ST_Intersects`) + GIST index
- **Yandex Maps API 3** на фронтенде с динамической загрузкой компонентов
- **Yandex Geocoder** на бэкенде — автозаполнение адреса при создании объекта
- **Гибридный рекомендательный движок**: 14-мерный feature vector, feature-weighted cosine similarity, MMR (λ=0.7), progressive filter relaxation, Redis caching
- **3-layer архитектура**: API → Service → Repository
- **Изображения**: multipart upload в MinIO с валидацией (тип, размер, количество)
- **Reference tables**: материалы, типы ремонта, районы, метро для фильтров
- **Guest mode**: публичные маршруты без аутентификации
- **URL-based фильтры** с сохранением состояния, сбросом, автоцентрированием карты
- **Клиентская валидация** форм с дебаунс-автокомплитом адреса
- **FilterParams utility** для управления состоянием фильтров через URL
- **Interactions toggle**: like/unlike с атомарной синхронизацией счётчика
- **Password policy**: мин. 8 символов, заглавная, строчная, цифра
- **Защита контактов**: запрет очистки всех контактов при активных объявлениях

#### Фронтенд

- **FSD архитектура**: app/pages/features/entities/widgets/shared layers
- **8 страниц**: Home, Map, Catalog, Property Details, Login, Register, Onboarding, Profile, Add Property
- **Redux Toolkit** store с auth slice и middleware
- **Axios client** с JWT interceptor, token refresh queue (защита от конкурентных refresh)
- **Yandex Maps 3** с кластеризацией, маркерами, bbox поиском
- **Swiper carousel** для рекомендаций на Home
- **FilterPanel widget** — диапазон цен, комнаты, тип, цель и т.д.
- **PropertyForm feature** — все расширенные поля, geocoder autofill, загрузка изображений
- **ImageUploader feature** — предпросмотр и валидация
- **ErrorBoundary** — отлов ошибок рендеринга
- **Адаптивный дизайн** — SCSS variables, mixins, breakpoints
- **Onboarding wizard** — визуальные иллюстрации и анимации
- **Profile page** — контакты, предпочтения, управление объявлениями
- **TokenService** — in-memory + localStorage JWT
- **Infinite scroll** на карте через IntersectionObserver
- **Автоцентрирование карты** при смене города в фильтрах

### Изменено

- **Архитектура бэкенда**: монолитный models.py → отдельные доменные файлы (user, property, interaction, reference)
- **Endpoints**: properties разделены на read (properties_read.py) и write (properties_write.py)
- **FSD extraction**: FilterPanel, TabBar, PropertyGrid — вынесены из страниц в widgets
- **Рекомендательный движок**: 13 → 14 измерений, feature weights (price×2, purpose×1.5, city×2), MMR диверсификация
- **Material/repair_type**: VARCHAR → ARRAY в preferences
- **Docker**: healthchecks, зависимости, non-root user
- **Populate-скрипты**: реалистичные объекты с реальным геокодированием (10 городов, 500+ объектов)
- **CI**: полный quality gate с SAST/SCA

### Исправлено

- **Layer violations**: доступ к БД/Redis из endpoints → через сервисы
- **Race conditions**: unique constraint на interactions, atomic counters, upsert
- **Безопасность**:
  - Утечка exception details в ответах
  - Пустой JWT_SECRET_KEY — теперь rejection
  - Хардкодные credentials удалены из docker-compose
  - Mass assignment protection — белый список полей для обновления
  - PII: контакты владельца видны только авторизованным
- **Производительность**: batch queries, vectorized cosine similarity, shared HTTP clients, LIMIT hardcaps
- **Фронтенд**: undefined geocoder, YMapMarker, zero-floor filter, image field stripping
- **Runtime**: favorites sorting, catalog pagination, delete modal styling
- **Auth**: JWT redirect, profile save, logout token clearing
- **Interaction API**: путь совместим между фронтендом и бэкендом
- **Geocoder**: обязательный параметр lang для Yandex API
- **Type hints**: Pydantic V2 deprecation warnings, MyPy strict

### Удалено

- Мёртвый код: reference models, user columns, frontend components, empty barrels, MSW mocks
- Устаревшие скрипты: старые populate-скрипты, неиспользуемые middleware
- Хардкодные API ключи из docker-compose
- Комментарии из кода (политика самодокументируемого кода)

### Безопасность

- SAST: Bandit в CI
- SCA: pip-audit (Python), npm audit (Node.js)
- JWT: SECRET_KEY ≥ 32 символа
- Пароли: bcrypt + server-side policy
- Rate limiting: уникальность взаимодействий предотвращает дубликаты

## [Документация] — 2026-05-24

### Добавлено

- `README.md` — полное описание проекта на русском с Mermaid-диаграммами, tech stack, quick start, CI/CD
- `ARCHITECTURE.md` — подробная архитектура: 3-layer backend, FSD frontend, data model ERD, recommendation engine pipeline, sequence diagrams
- `API.md` — все 24 эндпоинта с примерами, схемами запросов/ответов, Mermaid-диаграммами
- `CHANGELOG.md` — полная история версий
- `CONTRIBUTING.md` — руководство для контрибьюторов
- `TESTING.md` — гайд по тестированию
- `SECURITY.md` — политика безопасности
- `DOCKER.md` — Docker окружение
- `DEPLOYMENT.md` — деплой
- Обновлён `backend/alembic/README` — миграции БД
- Обновлён `frontend/README.md` — FSD архитектура фронтенда
- Обновлён `.env.example` — подробные комментарии
