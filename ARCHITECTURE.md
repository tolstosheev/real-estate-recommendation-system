# Архитектура nestAI

## Общий обзор

nestAI — полноценная full-stack система рекомендации недвижимости с **трёхслойным бэкендом** (API → Service → Repository), **FSD-фронтендом** и **гибридным рекомендательным движком**, сочетающим контентную и коллаборативную фильтрацию.

```mermaid
graph TB
    subgraph "Внешний мир"
        User["👤 Пользователь"]
        Browser["🌐 Браузер"]
        YM["🗺 Yandex Maps"]
        YG["📍 Yandex Geocoder"]
    end

    subgraph "Frontend (React + FSD)"
        Pages["📄 Pages<br/>Home / Map / Catalog / Profile / ..."]
        Widgets["🧩 Widgets<br/>FilterPanel / TabBar"]
        Features["⚙ Features<br/>PropertyForm / UploadImages"]
        Entities["📦 Entities<br/>Property / User"]
        Shared["🔧 Shared<br/>API client / UI-kit / TokenService"]
        App["⚡ App<br/>Init / Store / Router"]
    end

    subgraph "Backend (FastAPI 3-layer)"
        API["🎮 API Layer<br/>auth.py / properties_read.py / recommendations.py / ..."]
        Service["⚙ Service Layer<br/>AuthService / RecommendationService / PropertyService / ..."]
        Repo["📦 Repository Layer<br/>UserRepository / PropertyRepository / ..."]
    end

    subgraph "Infrastructure"
        PG[("🗄 PostgreSQL + PostGIS")]
        Redis[("⚡ Redis")]
        MinIO[("📦 MinIO S3")]
    end

    User --> Browser
    Browser --> App
    App --> Pages
    Pages --> Widgets --> Features --> Entities --> Shared
    Shared --> |"HTTP (Axios)"| API
    API --> Service --> Repo
    Repo --> PG
    Service --> Redis
    Service --> MinIO
    Service --> YG
    Pages --> YM
```

---

## 1. Бэкенд: Трёхслойная архитектура

```mermaid
flowchart LR
    subgraph "📂 api/endpoints/"
        Auth["auth.py"]
        PropsRead["properties_read.py"]
        PropsWrite["properties_write.py"]
        Interactions["interactions.py"]
        Recs["recommendations.py"]
        User["user.py"]
        Upload["upload.py"]
        Geo["geocode.py"]
    end

    subgraph "📂 services/"
        AuthS["AuthService"]
        PropsS["PropertyService"]
        InterS["InteractionService"]
        RecS["RecommendationService"]
        ImageS["ImageService"]
        GeoS["GeocodingService"]
        PrefS["UserPreferenceService"]
    end

    subgraph "📂 repositories/"
        UserR["UserRepository"]
        PropsR["PropertyRepository"]
        InterR["InteractionRepository"]
        PrefR["UserPreferenceRepository"]
    end

    subgraph "📂 models/"
        UserM["User / UserPreference"]
        PropM["Property + Geometry"]
        InterM["Interaction"]
    end

    subgraph "📂 core/"
        Config["config.py"]
        DB["db.py"]
        RedisC["redis.py"]
        Security["security.py"]
        Sim["similarity.py"]
    end

    Auth --> AuthS --> UserR --> UserM
    PropsRead --> PropsS --> PropsR --> PropM
    PropsWrite --> PropsS --> PropsR --> PropM
    Interactions --> InterS --> InterR --> InterM
    Recs --> RecS --> PropsR
    RecS --> PrefR
    RecS --> InterR
    User --> PrefS --> PrefR
    Upload --> ImageS
    Geo --> GeoS

    AuthS --> Config
    PropsS --> Config
    PropsS --> RedisC
    RecS --> Sim
    RecS --> RedisC
```

### 1.1 Уровни

| Уровень | Ответственность | Пример |
|---|---|---|
| **API Layer** | HTTP-маршрутизация, аутентификация, валидация запросов, форматирование ответов | `properties_read.py` валидирует query-параметры, вызывает сервис, возвращает JSON |
| **Service Layer** | Бизнес-логика, оркестрация, кеширование | `RecommendationService` строит вектор пользователя, вычисляет скоринг, применяет MMR |
| **Repository Layer** | SQL-запросы, JOIN, агрегации | `PropertyRepository.get_all()` динамически строит WHERE из 15+ фильтров |

### 1.2 Сервисы

| Сервис | Файл | Обязанности | Зависимости |
|---|---|---|---|
| **AuthService** | `auth_service.py` | Регистрация (валидация пароля, bcrypt хеширование), JWT create/refresh, обновление профиля (с защитой контактов при активных объявлениях) | `UserRepository` |
| **PropertyService** | `property_service.py` | CRUD, геокодирование при создании, обогащение (владелец, лайки, координаты), кеширование в Redis | `PropertyRepository`, `UserRepository`, `GeocodingService`, `RedisClient` |
| **InteractionService** | `interactions_service.py` | Добавление/удаление лайков (toggle), запись просмотров, синхронизация счётчиков, инвалидация кеша | `InteractionRepository`, `PropertyRepository`, `RedisClient` |
| **UserPreferenceService** | `preferences_service.py` | Получение и обновление предпочтений пользователя (upsert) | `UserPreferenceRepository` |
| **RecommendationService** | `recommendation_service.py` | **Гибридный ML-движок** — см. раздел 4 | `PropertyRepository`, `UserPreferenceRepository`, `InteractionRepository`, `RedisClient`, `SimilarityUtils` |
| **ImageService** | `image_service.py` | Загрузка/удаление/отдача изображений, управление bucket, валидация файлов (тип, размер, количество) | `MinioClient` |
| **GeocodingService** | `geocoding_service.py` | Прямое и обратное геокодирование через Yandex Geocoder API | `httpx` |

### 1.3 Репозитории

| Репозиторий | Ключевые методы | Особенности SQL |
|---|---|---|
| **PropertyRepository** | `get_all` (15+ фильтров, spatial radius), `get_by_bbox` (PostGIS), `get_meta` (distinct values), `get_by_ids` (bulk), `get_by_image_url` | `ST_MakeEnvelope` / `ST_Intersects`, case-insensitive фильтры, динамическая сборка WHERE, пагинация |
| **UserRepository** | `get_by_email`, `get_by_id`, `get_by_ids`, `create`, `update` | — |
| **InteractionRepository** | `create_interaction`, `find_interaction`, `get_user_favorites` (JOIN), `get_user_view_history` (subquery с max per property), `batch_check_likes`, `get_users_liked_properties` (collaborative), `remove_interaction` | Сложные JOIN, подзапросы, агрегация |
| **UserPreferenceRepository** | `get_by_user_id`, `update_or_create` | `INSERT ... ON CONFLICT DO UPDATE` (upsert) |

### 1.4 DI и жизненный цикл

```mermaid
sequenceDiagram
    participant C as Client
    participant API as API Layer
    participant Deps as FastAPI Depends()
    participant Service as Service Layer
    participant Repo as Repository

    Note over C,Repo: Каждый запрос создаёт новую сессию БД
    C->>API: HTTP Request
    API->>Deps: get_db() → AsyncSession
    API->>Deps: get_current_user() → User
    API->>Service: Service(session, ...)
    Service->>Repo: Repository(session)
    Repo->>Repo: SQL Query
    Repo-->>Service: Result
    Service-->>API: Response
    API-->>C: JSON Response
    Note over API,Repo: Сессия автоматически закрывается после ответа
```

---

## 2. Фронтенд: Feature-Sliced Design (FSD)

```mermaid
flowchart TB
    subgraph "FSD Layers"
        APP["app/<br/>Инициализация, Store, Routing, Стили"]
        PAGES["pages/<br/>Home, Map, Catalog, Profile, ..."]
        FEATURES["features/<br/>propertyForm, uploadImages"]
        ENTITIES["entities/<br/>property, user"]
        WIDGETS["widgets/<br/>FilterPanel"]
        SHARED["shared/<br/>API client, UI kit, lib, utils"]
        ASSETS["assets/<br/>Изображения, иконки"]
    end

    APP --> PAGES
    PAGES --> WIDGETS
    PAGES --> FEATURES
    PAGES --> ENTITIES
    FEATURES --> ENTITIES --> SHARED
    WIDGETS --> SHARED
    SHARED --> ASSETS

    linkStyle default stroke-width:2px,fill:none,stroke:gray;
```

### 2.1 Роутинг

```mermaid
flowchart LR
    Root["/"] --> Home["Home.tsx<br/>Рекомендации + поиск"]
    Root --> Map["/map<br/>Map.tsx<br/>Интерактивная карта"]
    Root --> Catalog["/catalog<br/>Catalog.tsx<br/>Каталог с фильтрами"]
    Root --> Property["/property/:id<br/>PropertyDetails.tsx<br/>Детали объекта"]
    Root --> Login["/login<br/>Login.tsx"]
    Root --> Register["/register<br/>Register.tsx"]
    Root --> Onboarding["/onboarding<br/>Onboarding.tsx"]
    Root --> Profile["/profile<br/>Profile.tsx"]
    Root --> AddProp["/add-property<br/>AddPropertyPage.tsx"]

    Onboarding -->|"auth"| Login
    Onboarding -->|"no auth"| Login
    Login -->|"success"| Home
    Profile -->|"not auth"| Onboarding
    AddProp -->|"not auth"| Onboarding
```

### 2.2 Управление состоянием (Redux Toolkit)

```mermaid
flowchart LR
    subgraph "Redux Store"
        Auth["auth slice<br/>user, token, loading"]
    end

    subgraph "Middleware"
        MW["authMiddleware<br/>синхронизация токена"]
    end

    subgraph "Внешние сервисы"
        Token["TokenService<br/>localStorage + memory"]
        Axios["Axios Instance<br/>interceptor + refresh queue"]
    end

    Login["Login Page"] -->|"dispatch(login)"| Auth
    Auth -->|"setCredentials"| Token
    Auth -->|"token"| Axios
    Axios -->|"401"| MW -->|"refresh"| Auth
    MW -->|"logout"| Token
```

### 2.3 Компоненты shared/ui

| Компонент | Путь | Назначение |
|---|---|---|
| Header | `shared/ui/Header/` | Навигация, поиск, аутентификация |
| Map | `shared/ui/Map/` | Yandex Maps с динамической загрузкой |
| Card | `shared/ui/Card/` | Карточка объекта недвижимости |
| Modal | `shared/ui/Modal/` | Модальное окно |
| Button | `shared/ui/Button/` | Кнопка |
| Input | `shared/ui/Input/` | Поле ввода |
| RangeSlider | `shared/ui/RangeSlider/` | Слайдер диапазона цен и площади |
| CheckboxGroup | `shared/ui/CheckboxGroup/` | Группа чекбоксов |
| AuthLayout | `shared/ui/AuthLayout/` | Шаблон страниц аутентификации |
| ErrorBoundary | `shared/ui/ErrorBoundary/` | Отлов ошибок рендеринга |

---

## 3. Модель данных

```mermaid
erDiagram
    User {
        uuid id PK
        varchar email UK
        varchar hashed_password
        varchar full_name
        varchar phone_number
        varchar telegram_handle
        timestamp created_at
    }

    UserPreference {
        uuid user_id PK, FK
        numeric min_price
        numeric max_price
        numeric min_area
        numeric max_area
        int[] preferred_rooms
        varchar[] property_types
        varchar[] property_purposes
        varchar[] cities
        varchar[] material
        varchar[] repair_type
        int min_build_year
        int max_build_year
    }

    Property {
        uuid id PK
        uuid user_id FK
        varchar title
        text description
        numeric price
        numeric area
        int rooms
        int floor
        int total_floors
        varchar property_type
        varchar property_purpose
        varchar category
        varchar city
        varchar address
        varchar district
        varchar metro
        geometry location
        varchar[] images
        varchar build_year
        varchar material
        varchar repair_type
        varchar room_type
        varchar is_new
        boolean balcony
        boolean parking
        int views_count
        int likes_count
        timestamp created_at
    }

    Interaction {
        int id PK
        uuid user_id FK
        uuid property_id FK
        varchar interaction_type
        int weight
        timestamp created_at
    }

    User ||--o| UserPreference : "has"
    User ||--o{ Property : "owns"
    User ||--o{ Interaction : "performs"
    Property ||--o{ Interaction : "receives"
```

### 3.1 Таблицы БД

#### Users (пользователи)

| Колонка | Тип | Ограничения | Описание |
|---|---|---|---|
| `id` | UUID | PK, default gen_random_uuid() | Уникальный идентификатор |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Email для входа |
| `hashed_password` | VARCHAR(255) | NOT NULL | bcrypt хеш пароля |
| `full_name` | VARCHAR(255) | NOT NULL | Отображаемое имя |
| `phone_number` | VARCHAR(50) | | PII — виден только владельцам объектов |
| `telegram_handle` | VARCHAR(100) | | PII |
| `created_at` | TIMESTAMP | default now() | Дата регистрации |

#### User Preferences (предпочтения)

| Колонка | Тип | Описание |
|---|---|---|
| `user_id` | UUID | PK, FK → users.id |
| `min_price` / `max_price` | NUMERIC(12,2) | Диапазон цен |
| `min_area` / `max_area` | NUMERIC(10,2) | Диапазон площади (м²) |
| `preferred_rooms` | INTEGER[] | Массив количества комнат |
| `property_types` | VARCHAR[] | Массив типов недвижимости |
| `property_purposes` | VARCHAR[] | Массив целей (продажа/аренда) |
| `cities` | VARCHAR[] | Предпочитаемые города |
| `material` | VARCHAR[] | Материал стен |
| `repair_type` | VARCHAR[] | Тип ремонта |
| `min_build_year` / `max_build_year` | INTEGER | Год постройки |

#### Properties (объекты недвижимости)

| Колонка | Тип | Описание |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → users.id (владелец) |
| `title` | VARCHAR(255) | Название |
| `description` | TEXT | Описание |
| `price` | NUMERIC(12,2) | Цена |
| `area` | NUMERIC(10,2) | Площадь (м²) |
| `rooms` | INTEGER | Количество комнат |
| `floor` / `total_floors` | INTEGER | Этаж / Всего этажей |
| `property_type` | VARCHAR(50) | Тип: apartment, studio, house, townhouse |
| `property_purpose` | VARCHAR(50) | Цель: sale, rent, daily_rent |
| `city` | VARCHAR(100) | Город |
| `address` | VARCHAR(500) | Адрес |
| `district` | VARCHAR(100) | Район |
| `metro` | VARCHAR(100) | Метро |
| `location` | GEOMETRY(Point, 4326) | **PostGIS** — пространственный индекс |
| `images` | VARCHAR[] | Массив URL изображений |
| `build_year` | VARCHAR(4) | Год постройки |
| `material` | VARCHAR(50) | Материал стен |
| `repair_type` | VARCHAR(50) | Тип ремонта |
| `room_type` | VARCHAR(50) | Тип комнат (separate, open) |
| `balcony` / `parking` | BOOLEAN | Балкон / Парковка |
| `is_new` | VARCHAR(3) | Новостройка (yes/no) |
| `sq_living` / `sq_kitchen` | NUMERIC(10,2) | Жилая / Кухня площадь |
| `views_count` / `likes_count` | INTEGER | Счётчики (default 0) |
| `created_at` | TIMESTAMP | Дата создания |

Индексы:
- `properties_location_gist` — GIST index на `location` для пространственных запросов
- `properties_user_id_idx` — по владельцу
- `properties_city_idx` — по городу
- `properties_purpose_idx` — по цели

#### Interactions (взаимодействия)

| Колонка | Тип | Описание |
|---|---|---|
| `id` | INTEGER | PK, autoincrement |
| `user_id` | UUID | FK → users.id |
| `property_id` | UUID | FK → properties.id |
| `interaction_type` | VARCHAR(20) | `like` или `view` |
| `weight` | INTEGER | Вес (по умолч. 5 для like) |
| `created_at` | TIMESTAMP | Дата |

**Ограничения:**
- UNIQUE(user_id, property_id, interaction_type) — предотвращает дубликаты

---

## 4. Рекомендательный движок

```mermaid
flowchart TB
    Start["Запрос рекомендаций<br/>GET /api/recommendations/"] --> BuildUserVec

    subgraph Step1["1. Построение профиля пользователя"]
        BuildUserVec["Сбор данных"]
        Prefs["Предпочтения (явные)<br/>цена, комнаты, тип, город"]
        Favs["Избранное (неявные)<br/>weight = 1.0"]
        Views["Просмотры (неявные)<br/>weight = 0.2"]
        BuildUserVec --> Prefs
        BuildUserVec --> Favs
        BuildUserVec --> Views
        Prefs & Favs & Views --> Combine["Взвешенная комбинация<br/>explicit × 0.6 + implicit × 0.4"]
        Combine --> UserVec["14-мерный вектор пользователя"]
    end

    subgraph Step2["2. Поиск кандидатов с релаксацией"]
        Fetch["Запрос к БД"]
        Filter1["Строгие фильтры<br/>город, цель, цена"]
        Filter2["+ материал, тип ремонта"]
        Filter3["+ комнаты, площадь, год"]
        Filter4["+ тип недвижимости"]
        Fetch --> Filter1 -->|"< limit"| Filter2 -->|"< limit"| Filter3 -->|"< limit"| Filter4
        Filter1 -->|"≥ limit"| Done["✅ Кандидаты готовы"]
        Filter4 --> Done
    end

    subgraph Step3["3. Контентный скоринг"]
        PropVecs["14-мерные векторы объектов"]
        Normalize["StandardScaler<br/>нормализация"]
        Weights["Feature Weights<br/>price×2, area×1.5, city×2, ..."]
        CosSim["Cosine Similarity"]
        PropVecs --> Normalize --> Weights
        UserVec --> Normalize --> Weights
        Weights --> CosSim
        CosSim --> ContentScores["content_score[i]"]
    end

    subgraph Step4["4. Коллаборативный скоринг"]
        CheckLikes["≥ 3 лайка?"] -->|"нет"| NoCollab["collab неактивен"]
        CheckLikes -->|"да"| GetSimilar["Поиск похожих пользователей<br/>Jaccard(user_i, user_j)"]
        GetSimilar --> Jaccard["|A ∩ B| / |A ∪ B|"]
        Jaccard --> Top10["Top-10 похожих"]
        Top10 --> Aggregate["Сбор их лайков среди кандидатов"]
        Aggregate --> NormalizeCollab["Нормализация [0, 1]"]
        NormalizeCollab --> CollabScores["collab_score[i]"]
    end

    subgraph Step5["5. Гибридный скор"]
        WeightedSum["hybrid[i] = 0.7 × content[i] + 0.3 × collab[i]"]
        ContentScores --> WeightedSum
        CollabScores --> WeightedSum
    end

    subgraph Step6["6. Диверсификация (MMR)"]
        MMR["MMR(λ = 0.7)<br/>Maximal Marginal Relevance"]
        WeightedSum --> MMR
        MMR --> Final["Top-N рекомендаций"]
    end

    subgraph Step7["7. Кеширование"]
        Cache["Redis cache<br/>user_recs:{user_id}:{limit}<br/>TTL = 1 час"]
        Enrich["Обогащение<br/>владелец, лайки, контакты"]
        Final --> Cache
        Final --> Enrich
        Enrich --> Response["JSON Response"]
    end

    Start --> Step1
    Step1 --> Step2
    Step2 --> Step3
    Step3 --> Step4
    Step4 --> Step5
    Step5 --> Step6
    Step6 --> Step7
```

### 4.1 Feature Vector (14 измерений)

```mermaid
flowchart LR
    subgraph FeatureVector["14-мерный вектор признаков"]
        F0["0: Price<br/>weight = 2.0"]
        F1["1: Area<br/>weight = 1.5"]
        F2["2: Rooms<br/>weight = 1.5"]
        F3["3: Lon<br/>weight = 0.5"]
        F4["4: Lat<br/>weight = 0.5"]
        F5["5: Build Year<br/>weight = 0.5"]
        F6["6: Apartment<br/>weight = 0.5"]
        F7["7: Studio<br/>weight = 0.5"]
        F8["8: House<br/>weight = 0.5"]
        F9["9: Townhouse<br/>weight = 0.5"]
        F10["10: Sale<br/>weight = 1.5"]
        F11["11: Rent<br/>weight = 1.5"]
        F12["12: Daily Rent<br/>weight = 1.5"]
        F13["13: City Match<br/>weight = 2.0"]
    end

    F3 -.->|"0 if no location"| F3
    F4 -.->|"0 if no location"| F4
    F13 -.->|"0 if city filter active"| F13
```

**Формирование вектора:**

```python
# Числовые признаки (масштабируются StandardScaler)
[price, area, rooms, lon, lat, build_year]

# One-hot тип недвижимости
[is_apartment, is_studio, is_house, is_townhouse]

# One-hot цель
[is_sale, is_rent, is_daily_rent]

# Совпадение города
[city_match]
```

**Настройка весов:**

| Индекс | Признак | Вес | Поведение |
|---|---|---|---|
| 0 | Price | 2.0 | Высокий приоритет |
| 1 | Area | 1.5 | Средний приоритет |
| 2 | Rooms | 1.5 | Средний приоритет |
| 3-4 | Lon / Lat | 0.5 | Обнуляется, если у пользователя нет геолокации |
| 5 | Build Year | 0.5 | Низкий приоритет |
| 6-9 | Property Type | 0.5 | One-hot |
| 10-12 | Purpose | 1.5 | Обнуляется, если фильтр по цели активен |
| 13 | City Match | 2.0 | Обнуляется, если фильтр по городу активен |

### 4.2 Алгоритмы

#### Контентная фильтрация (Content-Based)

```python
# 1. Нормализация признаков
norm_prop_vectors, scaler = StandardScaler().fit_transform(prop_vectors)
norm_user_vec = scaler.transform(user_vector)

# 2. Применение весов
norm_prop_vectors *= FEATURE_WEIGHTS
norm_user_vec *= FEATURE_WEIGHTS

# 3. Cosine Similarity
scores = cosine_similarity(norm_prop_vectors, norm_user_vec)
# → content_score[i] ∈ [-1, 1]
```

#### Коллаборативная фильтрация (Collaborative)

```mermaid
flowchart LR
    A["Пользователь A<br/>лайкнул: {1, 2, 3, 4, 5}"] --- Jaccard
    B["Пользователь B<br/>лайкнул: {1, 2, 3, 7, 8, 9}"]
    Jaccard["J(A,B) = |{1,2,3}| / |{1,2,3,4,5,7,8,9}|<br/>= 3 / 8 = 0.375"]
    Jaccard --> Rank["Top-10 похожих пользователей"]
    Rank --> Aggregate["Агрегация их лайков среди кандидатов"]
    Aggregate --> Norm["Нормализация: score / max_score"]
    Norm --> Collab["collab_score"]
```

```python
def _find_similar_users(user_id: str) -> list[str]:
    my_favs = get_user_favorites(user_id)  # {1, 2, 3, 4, 5}
    if len(my_favs) < COLLAB_MIN_LIKES:    # 3
        return []                          # недостаточно данных

    all_users = get_users_liked_properties()
    # {"user_B": {1, 2, 3, 7, 8, 9}, "user_C": {5, 6}, ...}

    for uid, liked_set in all_users:
        intersection = my_favs & liked_set  # {1, 2, 3}
        union = my_favs | liked_set         # {1, 2, 3, 4, 5, 7, 8, 9}
        jaccard = len(intersection) / len(union)  # 3/8 = 0.375

    return top_10_by_jaccard
```

```python
def _score_collaborative(candidate_ids, similar_users):
    # similar_users = ["user_B", "user_C", ...]
    for uid in similar_users:
        liked = all_users[uid] & candidate_set
        for pid in liked:
            prop_scores[pid] += 1.0         # голос

    # Нормализация: 1.0 = лайкнули все похожие
    return {pid: score / max(prop_scores.values()) for pid, score in prop_scores.items()}
```

#### Гибридный скор

```python
if collab_scores:
    hybrid_score = (
        0.7 * content_score[i] +           # контентная составляющая
        0.3 * collab_scores.get(str(p.id), 0.0)  # коллаборативная (0 если нет сигнала)
    )
else:
    hybrid_score = content_score[i]         # fallback на контент
```

#### MMR Диверсификация (Maximal Marginal Relevance)

```python
def _diversify(scored_props, prop_vectors, user_vec, limit, lambda_param=0.7):
    # λ = 0.7 — баланс между релевантностью и разнообразием

    for i in remaining:
        relevance = scores[i]                    # насколько релевантен
        similarity_to_selected = max(            # насколько похож на уже выбранные
            pairwise_sim[i][j] for j in selected
        )
        mmr = lambda_param * relevance - (1 - lambda_param) * similarity_to_selected

    # Выбираем объект с максимальным MMR на каждом шаге
```

### 4.3 Фильтр-релаксация

Если кандидатов меньше, чем `limit`, фильтры постепенно смягчаются:

```mermaid
flowchart LR
    All["Все фильтры"] --> Step1["Строгие:<br/>город, цель, цена"]
    Step1 -->|"< limit"| Step2["Убрать:<br/>материал, тип ремонта"]
    Step2 -->|"< limit"| Step3["Убрать:<br/>комнаты, площадь, год"]
    Step3 -->|"< limit"| Step4["Убрать:<br/>тип недвижимости"]
    Step1 -->|"≥ limit"| Return["✅ Результат"]
    Step2 -->|"≥ limit"| Return
    Step3 -->|"≥ limit"| Return
    Step4 --> Return
```

### 4.4 Кеширование

```mermaid
flowchart LR
    subgraph Redis["Redis Cache"]
        UserVec["user_vec:{user_id}<br/>TTL: 3600s"]
        Recs["user_recs:{user_id}:{limit}<br/>TTL: 3600s"]
        Prop["property:{property_id}<br/>TTL: 3600s"]
    end

    BuildVec["build_user_vector()"] -->|"проверить кеш"| UserVec
    UserVec -->|"miss"| Compute["Вычислить"] -->|"сохранить"| UserVec

    Recommend["recommend()"] -->|"проверить кеш"| Recs
    Recs -->|"miss"| FullPipe["Полный пайплайн"] -->|"сохранить"| Recs

    GetProp["get_property_details()"] -->|"проверить кеш"| Prop
    Prop -->|"miss"| Query["SELECT"] -->|"сохранить"| Prop

    Interact["interact()"] --> Invalidate["Инвалидация кеша<br/>user_vec, recs, property"]
```

---

## 5. Жизненный цикл запроса

### 5.1 Рекомендации

```mermaid
sequenceDiagram
    participant Client as Клиент
    participant API as API Layer
    participant RecS as RecommendationService
    participant PrefR as UserPreferenceRepository
    participant InterR as InteractionRepository
    participant PropR as PropertyRepository
    participant Sim as SimilarityUtils
    participant Redis as Redis
    participant Enrich as PropertyService

    Client->>API: GET /api/recommendations/
    Note over API: Dependency Injection
    API->>Redis: get user_recs:user_id:10
    Redis-->>API: MISS

    API->>RecS: recommend(user_id)

    RecS->>PrefR: get_by_user_id(user_id)
    PrefR-->>RecS: preferences
    RecS->>InterR: get_user_favorites(user_id)
    InterR-->>RecS: favorites
    RecS->>InterR: get_user_view_history(user_id)
    InterR-->>RecS: views

    RecS->>RecS: filter_kwargs + preferred_city
    RecS->>PropR: get_all(filters, limit=1000)
    PropR-->>RecS: candidates

    RecS->>Redis: get user_vec:user_id
    Redis-->>RecS: MISS
    RecS->>Sim: compute_user_profile_vector()
    Sim-->>RecS: user_vec
    RecS->>Redis: setex user_vec:user_id

    RecS->>RecS: cosine_similarity(user_vec, prop_vectors)
    Note over RecS: content scores

    RecS->>InterR: get_users_liked_properties()
    InterR-->>RecS: all likes
    RecS->>RecS: _find_similar_users() → Jaccard
    RecS->>RecS: _score_collaborative()
    Note over RecS: hybrid scores

    RecS->>RecS: _diversify() → MMR
    RecS->>Redis: setex user_recs:user_id:10

    RecS->>Enrich: batch_enrich_recs()
    Enrich-->>RecS: enriched properties

    RecS-->>API: list[Property]
    API-->>Client: JSON
```

### 5.2 Взаимодействие (лайк/просмотр)

```mermaid
sequenceDiagram
    participant Client as Клиент
    participant API as API Layer
    participant InterS as InteractionService
    participant InterR as InteractionRepository
    participant PropR as PropertyRepository
    participant Redis as Redis

    Client->>API: POST /api/interactions/interact

    API->>InterS: add_interaction(user_id, property_id, type)

    InterS->>PropR: get_by_id(property_id)
    PropR-->>InterS: property or None
    Note over InterS: 404 if None

    InterS->>InterR: find_interaction(user_id, property_id, type)
    InterR-->>InterS: existing or None

    alt type == "view"
        InterS->>InterR: create_interaction(weight=1)
        InterR-->>InterS: created
        InterS-->>API: {status: "viewed"}
    else type == "like"
        alt already liked
            InterS->>InterR: remove_interaction()
            InterR-->>InterS: removed
            InterS->>PropR: decrement likes_count
            InterS-->>API: {status: "removed"}
        else new like
            InterS->>InterR: create_interaction(weight=5)
            InterR-->>InterS: created
            InterS->>PropR: increment likes_count
            InterS-->>API: {status: "liked"}
        end
    end

    InterS->>Redis: clear_user_cache(user_id)
    InterS->>Redis: clear_property_cache(property_id)

    API-->>Client: {status: "..."}
```

---

## 6. Инфраструктура

```mermaid
graph TB
    subgraph "Docker Compose (6 сервисов)"
        direction TB
        Traefik[":8000 Backend"]
        FE[":3000 → 5173 Frontend"]
        DB[":5432 PostgreSQL + PostGIS"]
        RDS[":6379 Redis"]
        MinIO["MinIO<br/>:9000 API<br/>:9001 Console"]
        Test["Test Runner<br/>(one-off)"]
    end

    subgraph "Volumes"
        PGVol["postgres_data"]
        MinIOVol["minio_data"]
    end

    DB --> PGVol
    MinIO --> MinIOVol
    Test --> DB
    Test --> RDS
    Test --> MinIO

    FE -->|"DEPENDS_ON"| Traefik
    Traefik -->|"DEPENDS_ON"| DB
    Traefik -->|"DEPENDS_ON"| RDS
    Traefik -->|"DEPENDS_ON"| MinIO
    Test -->|"network"| DB
    Test -->|"network"| RDS
    Test -->|"network"| MinIO
```

### 6.1 Сервисы Docker

| Сервис | Образ | Назначение | Порты | Healthcheck |
|---|---|---|---|---|
| **db** | `postgis/postgis:15-3.3` | PostgreSQL 15 + PostGIS | 5432 | `pg_isready` |
| **redis** | `redis:7-alpine` | Кеш Redis 7 | 6379 | `redis-cli ping` |
| **minio** | `minio/minio:latest` | S3-совместимое хранилище | 9000, 9001 | `/minio/health/live` |
| **backend** | сборка из `backend/` | FastAPI приложение | 8000 | `/health` |
| **frontend** | сборка из `frontend/` | React SPA | 3000 → 5173 | — |
| **test** | сборка из `backend/` | Тестовый раннер (profile=test) | — | — |

---

## 7. CI/CD Pipeline

```mermaid
flowchart TB
    Push["git push"] --> CI["GitHub Actions"]

    subgraph CI
        direction TB
        BackendUnit["🧪 backend-unit<br/>pytest tests/unit/"]
        Frontend["🧪 frontend<br/>npm run lint + test"]
        BackendInt["🧪 backend-integration<br/>pytest (все, кроме e2e)"]
    end

    subgraph "Quality Gate (test.yml)"
        Ruff["ruff check ."]
        MyPy["mypy ."]
        Bandit["bandit -r app/"]
        PipAudit["pip-audit"]
        Pytest["pytest --cov=app --cov-fail-under=90"]
        ESLint["npm run lint"]
        TSC["npx tsc --noEmit"]
        NpmAudit["npm audit"]
        Vitest["vitest --coverage --coverage.thresholds.lines=90"]
    end

    Push --> BackendUnit --> BackendInt
    Push --> Frontend
    BackendInt --> QualityGate
    Frontend --> QualityGate

    QualityGate --> |"все проверки"| Deploy["🚀 Deploy"]
```

**ci.yml** — 3 job:
1. `backend-unit`: Python 3.12 → `pytest tests/unit/`
2. `frontend`: Node 20 → `npm ci` → `npm run lint` → `npm test -- --run`
3. `backend-integration` (needs 1 + 2): PostGIS + Redis → alembic migrations → `pytest` (все, кроме e2e)

**test.yml** — полный quality gate:
- **backend**: Ruff, MyPy, Bandit, pip-audit, pytest с coverage ≥ 90%
- **frontend**: ESLint, tsc, npm audit, vitest с coverage ≥ 90% lines
