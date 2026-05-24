# API Reference

Base URL: `http://localhost:8000`

All endpoints that require authentication use **Bearer token** in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

## Table of Contents

- [Auth](#auth)
  - [Register](#register)
  - [Login](#login)
  - [Refresh Token](#refresh-token)
  - [Get Current User](#get-current-user)
  - [Update Current User](#update-current-user)
- [Properties](#properties)
  - [Get Property Meta](#get-property-meta)
  - [List Properties](#list-properties)
  - [Get My Properties](#get-my-properties)
  - [Get Properties in Bounding Box](#get-properties-in-bounding-box)
  - [Get Property Details](#get-property-details)
  - [Create Property](#create-property)
  - [Update Property](#update-property)
  - [Delete Property](#delete-property)
- [User Preferences](#user-preferences)
  - [Get Preferences](#get-preferences)
  - [Update Preferences](#update-preferences)
- [Interactions](#interactions)
  - [Interact with Property](#interact-with-property)
  - [Get Favorites](#get-favorites)
  - [Get View History](#get-view-history)
- [Recommendations](#recommendations)
  - [Get Recommendations](#get-recommendations)
- [Images](#images)
  - [Upload Images](#upload-images)
  - [Get Image](#get-image)
  - [Delete Image](#delete-image)
- [Geocoding](#geocoding)
  - [Reverse Geocode](#reverse-geocode)

---

## Auth

### Register

Creates a new user account.

```
POST /auth/register
```

**Authentication:** None

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass1!",
  "full_name": "John Doe",
  "phone_number": "+79991234567",
  "telegram_handle": "@johndoe"
}
```

**Schema:**

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | string (email) | Yes | Must be a valid email format |
| `password` | string | Yes | Min 8 chars, must contain uppercase, lowercase, and digit |
| `full_name` | string | Yes | Display name |
| `phone_number` | string | No | Visible to property owners |
| `telegram_handle` | string | No | Visible to property owners |

**Success Response (201 Created):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "full_name": "John Doe",
  "phone_number": "+79991234567",
  "telegram_handle": "@johndoe"
}
```

**Error Responses:**

| Status | Description |
|---|---|
| `400` | Email already exists or validation failed (e.g., weak password) |

---

### Login

Authenticates a user and returns a JWT access token.

```
POST /auth/login
```

**Authentication:** None

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass1!"
}
```

**Success Response (200 OK):**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

**Error Responses:**

| Status | Description |
|---|---|
| `401` | Invalid email or password |

---

### Refresh Token

Issues a new access token from an existing valid or recently expired token.

```
POST /auth/refresh
```

**Authentication:** Bearer token

**Success Response (200 OK):**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

**Error Responses:**

| Status | Description |
|---|---|
| `401` | Token is invalid or expired too long ago |

---

### Get Current User

Returns the profile of the currently authenticated user.

```
GET /auth/me
```

**Authentication:** Bearer token

**Success Response (200 OK):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "full_name": "John Doe",
  "phone_number": "+79991234567",
  "telegram_handle": "@johndoe"
}
```

**Error Responses:**

| Status | Description |
|---|---|
| `401` | Invalid or missing token |

---

### Update Current User

Updates the profile of the currently authenticated user.

```
PUT /auth/me
```

**Authentication:** Bearer token

**Request Body:**

```json
{
  "full_name": "Jane Doe",
  "phone_number": "+79997654321",
  "telegram_handle": "@janedoe"
}
```

**Schema:**

| Field | Type | Required | Description |
|---|---|---|---|
| `full_name` | string | No | New display name |
| `phone_number` | string | No | New phone number |
| `telegram_handle` | string | No | New Telegram handle |

All fields are optional — only provided fields will be updated.

**Note:** If the user has active property listings, all contact fields (`phone_number` and `telegram_handle`) cannot be cleared simultaneously. At least one contact method must remain.

**Success Response (200 OK):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "full_name": "Jane Doe",
  "phone_number": "+79997654321",
  "telegram_handle": "@janedoe"
}
```

**Error Responses:**

| Status | Description |
|---|---|
| `400` | Cannot clear all contacts while having active listings |
| `401` | Invalid or missing token |

---

## Properties

### Get Property Meta

Returns distinct values for filter dropdowns (cities, property types, materials, repair types, etc.).

```
GET /api/properties/meta
```

**Authentication:** None

**Success Response (200 OK):**

```json
{
  "cities": ["Moscow", "Saint Petersburg", "Kazan"],
  "property_types": ["apartment", "house", "studio", "townhouse"],
  "property_purposes": ["sale", "rent", "daily_rent"],
  "materials": ["panel", "brick", "monolith"],
  "repair_types": ["cosmetic", "euro", "designer"],
  "districts": ["Central", "Northern", "Southern"],
  "metro": ["Park Pobedy", "Kiyevskaya", "Mayakovskaya"]
}
```

---

### List Properties

Returns a paginated list of properties with optional filters.

```
GET /api/properties/?limit=20&offset=0&city=Moscow&min_price=5000000&max_price=15000000&rooms=1,2&property_type=apartment&property_purpose=sale&search=центр
```

**Authentication:** Optional — if authenticated, results are enriched with `is_liked_by_me` flag.

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `limit` | integer | No | 100 | Max results (max 200) |
| `offset` | integer | No | 0 | Pagination offset |
| `min_price` | float | No | — | Minimum price |
| `max_price` | float | No | — | Maximum price |
| `rooms` | integer[] | No | — | Comma-separated room counts (e.g., `1,2`) |
| `property_type` | string[] | No | — | Comma-separated: `apartment`, `studio`, `house`, `townhouse` |
| `property_purpose` | string[] | No | — | Comma-separated: `sale`, `rent`, `daily_rent` |
| `city` | string[] | No | — | Comma-separated city names |
| `district` | string | No | — | District name |
| `metro` | string | No | — | Metro station name |
| `material` | string[] | No | — | Comma-separated: `panel`, `brick`, `monolith` |
| `repair_type` | string[] | No | — | Comma-separated: `cosmetic`, `euro`, `designer` |
| `min_build_year` | integer | No | — | Minimum build year |
| `max_build_year` | integer | No | — | Maximum build year |
| `lat` | float | No | — | Center latitude for spatial search |
| `lon` | float | No | — | Center longitude for spatial search |
| `radius_km` | float | No | — | Search radius in km (requires `lat` and `lon`) |
| `min_area` | float | No | — | Minimum area in m² |
| `max_area` | float | No | — | Maximum area in m² |
| `is_new` | string[] | No | — | `yes`, `no` |
| `search` | string | No | — | Full-text search in title, description, address |

All text filters are **case-insensitive** (uses `LOWER()` in SQL).

**Success Response (200 OK):**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "title": "2-bedroom apartment in city center",
    "description": "Bright apartment with panoramic views...",
    "price": 12000000,
    "area": 65.5,
    "rooms": 2,
    "floor": 7,
    "total_floors": 16,
    "property_type": "apartment",
    "property_purpose": "sale",
    "city": "Moscow",
    "address": "ul. Tverskaya, 10",
    "district": "Central",
    "metro": "Tverskaya",
    "lat": 55.7658,
    "lon": 37.6065,
    "images": ["http://localhost:8000/api/images/prop_001.jpg"],
    "build_year": 2020,
    "material": "brick",
    "repair_type": "euro",
    "room_type": "separate",
    "balcony": true,
    "parking": false,
    "is_new": false,
    "sq_living": 45.0,
    "sq_kitchen": 12.0,
    "views_count": 150,
    "likes_count": 12,
    "is_liked_by_me": false,
    "owner": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "full_name": "John Doe",
      "phone_number": "+79991234567",
      "telegram_handle": "@johndoe"
    },
    "created_at": "2025-01-15T10:30:00Z"
  }
]
```

---

### Get My Properties

Returns properties created by the authenticated user.

```
GET /api/properties/my?limit=20&offset=0
```

**Authentication:** Bearer token (required)

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `limit` | integer | No | 100 | Max results (max 200) |
| `offset` | integer | No | 0 | Pagination offset (min 0) |

**Success Response (200 OK):**

Same schema as [List Properties](#list-properties).

---

### Get Properties in Bounding Box

Returns properties within a geographic bounding box for map rendering.

```
GET /api/properties/map?min_lat=55.6&max_lat=55.8&min_lon=37.4&max_lon=37.7&property_purpose=sale
```

**Authentication:** Optional — enriched with `is_liked_by_me` if authenticated.

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `min_lat` | float | **Yes** | South latitude |
| `max_lat` | float | **Yes** | North latitude |
| `min_lon` | float | **Yes** | West longitude |
| `max_lon` | float | **Yes** | East longitude |
| `limit` | integer | No | Max results, default 50, max 200 |
| `offset` | integer | No | Pagination offset, default 0 |
| `min_price`, `max_price` | float | No | Price range |
| `rooms` | integer[] | No | Comma-separated |
| `property_type` | string[] | No | Comma-separated |
| `property_purpose` | string[] | No | Comma-separated |
| `city` | string[] | No | Comma-separated |
| `min_area`, `max_area` | float | No | Area range |
| `min_build_year`, `max_build_year` | integer | No | Year range |
| `material` | string[] | No | Comma-separated |
| `repair_type` | string[] | No | Comma-separated |
| `district` | string | No | |
| `metro` | string | No | |
| `is_new` | string[] | No | `yes`, `no` |

Uses PostGIS `ST_MakeEnvelope` with `ST_Intersects` for efficient spatial querying.

**Success Response (200 OK):**

Same schema as [List Properties](#list-properties).

---

### Get Property Details

Returns a single property by ID.

```
GET /api/properties/{property_id}
```

**Authentication:** Optional — enriched with `is_liked_by_me` if authenticated.

**Path Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `property_id` | UUID | Property ID |

**Success Response (200 OK):**

Same schema as [List Properties](#list-properties).

**Error Responses:**

| Status | Description |
|---|---|
| `404` | Property not found |

---

### Create Property

Creates a new property listing.

```
POST /api/properties/
```

**Authentication:** Bearer token (required)

**Request Body:**

```json
{
  "title": "2-bedroom apartment in city center",
  "price": 12000000,
  "address": "ul. Tverskaya, 10, Moscow",
  "lat": 55.7658,
  "lon": 37.6065,
  "description": "Bright apartment with panoramic views",
  "city": "Moscow",
  "rooms": 2,
  "area": 65.5,
  "floor": 7,
  "total_floors": 16,
  "property_type": "apartment",
  "property_purpose": "sale",
  "district": "Central",
  "metro": "Tverskaya",
  "images": ["http://localhost:8000/api/images/prop_001.jpg"],
  "build_year": 2020,
  "material": "brick",
  "repair_type": "euro",
  "room_type": "separate",
  "sq_living": 45.0,
  "sq_kitchen": 12.0,
  "balcony": true,
  "parking": false,
  "is_new": false
}
```

**Required fields:** `title`, `price`, `address`, `lat`, `lon`

If `lat`/`lon` are not provided but `address` is, the backend will attempt to geocode the address via Yandex Geocoder API.

**Success Response (201 Created):**

Same schema as [List Properties](#list-properties).

**Error Responses:**

| Status | Description |
|---|---|
| `400` | Invalid coordinates (lat: -90..90, lon: -180..180) or validation failure |
| `401` | Missing or invalid token |

---

### Update Property

Updates an existing property. Only the owner can update their property.

```
PUT /api/properties/{property_id}
```

**Authentication:** Bearer token (required, owner check)

**Path Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `property_id` | UUID | Property ID |

**Request Body:**

```json
{
  "price": 13000000,
  "description": "Updated description"
}
```

All fields from [Create Property](#create-property) are optional on update. Only provided fields will be changed.

**Success Response (200 OK):**

Same schema as [List Properties](#list-properties).

**Error Responses:**

| Status | Description |
|---|---|
| `400` | No valid fields to update |
| `403` | Not the property owner |
| `404` | Property not found |

---

### Delete Property

Deletes a property. Only the owner can delete their property.

```
DELETE /api/properties/{property_id}
```

**Authentication:** Bearer token (required, owner check)

**Path Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `property_id` | UUID | Property ID |

**Success Response (204 No Content):**

No body returned.

**Error Responses:**

| Status | Description |
|---|---|
| `403` | Not the property owner |
| `404` | Property not found |

---

## User Preferences

### Get Preferences

Returns the search preferences of the authenticated user.

```
GET /user/preferences
```

**Authentication:** Bearer token (required)

**Success Response (200 OK):**

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "min_price": 5000000,
  "max_price": 15000000,
  "min_area": 40.0,
  "max_area": 100.0,
  "preferred_rooms": [1, 2, 3],
  "property_types": ["apartment"],
  "property_purposes": ["sale"],
  "cities": ["Moscow"],
  "material": ["brick"],
  "repair_type": ["euro"],
  "min_build_year": 2010,
  "max_build_year": 2025
}
```

**Error Responses:**

| Status | Description |
|---|---|
| `404` | Preferences not set (first-time user) |

---

### Update Preferences

Sets or updates user search preferences (upsert — creates if not exists, updates if exists).

```
PUT /user/preferences
```

**Authentication:** Bearer token (required)

**Request Body:**

```json
{
  "min_price": 5000000,
  "max_price": 15000000,
  "preferred_rooms": [1, 2],
  "property_types": ["apartment", "studio"],
  "property_purposes": ["sale"],
  "cities": ["Moscow"],
  "min_area": 30.0,
  "max_area": 100.0,
  "material": ["brick", "monolith"],
  "repair_type": ["euro"],
  "min_build_year": 2000,
  "max_build_year": 2025
}
```

**Schema:**

All fields are optional.

| Field | Type | Description |
|---|---|---|
| `min_price` | decimal | Minimum price |
| `max_price` | decimal | Maximum price |
| `min_area` | decimal | Minimum area (m²) |
| `max_area` | decimal | Maximum area (m²) |
| `preferred_rooms` | integer[] | Preferred room counts |
| `property_types` | string[] | `apartment`, `studio`, `house`, `townhouse` |
| `property_purposes` | string[] | `sale`, `rent`, `daily_rent` |
| `cities` | string[] | Preferred cities |
| `material` | string[] | `panel`, `brick`, `monolith` |
| `repair_type` | string[] | `cosmetic`, `euro`, `designer` |
| `min_build_year` | integer | Earliest build year |
| `max_build_year` | integer | Latest build year |

**Success Response (200 OK):**

Same schema as [Get Preferences](#get-preferences).

**Error Responses:**

| Status | Description |
|---|---|
| `401` | Missing or invalid token |

---

## Interactions

### Interact with Property

Records a `like` or `view` interaction with a property. Likes act as a **toggle** — liking an already-liked property removes the like.

```
POST /api/interactions/interact
```

**Authentication:** Bearer token (required)

**Request Body:**

```json
{
  "property_id": "550e8400-e29b-41d4-a716-446655440001",
  "interaction_type": "like"
}
```

**Schema:**

| Field | Type | Required | Description |
|---|---|---|---|
| `property_id` | UUID | Yes | Property to interact with |
| `interaction_type` | string | Yes | Must be `like` or `view` |

**Success Responses:**

| Status | Body | Scenario |
|---|---|---|
| `201 Created` | `{"status": "liked"}` | New like created |
| `201 Created` | `{"status": "viewed"}` | New view recorded |
| `200 OK` | `{"status": "removed"}` | Like toggled off (unliked) |

**Error Responses:**

| Status | Description |
|---|---|
| `404` | Property not found |
| `401` | Missing or invalid token |

---

### Get Favorites

Returns all properties liked by the authenticated user.

```
GET /api/interactions/favorites?limit=20&offset=0
```

**Authentication:** Bearer token (required)

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `limit` | integer | No | 100 | Max results (max 200) |
| `offset` | integer | No | 0 | Pagination offset |

**Success Response (200 OK):**

Same schema as [List Properties](#list-properties), with `is_liked_by_me: true` for all results.

---

### Get View History

Returns properties viewed by the authenticated user. Each property appears at most once (latest view timestamp).

```
GET /api/interactions/history?limit=20&offset=0
```

**Authentication:** Bearer token (required)

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `limit` | integer | No | 100 | Max results (max 200) |
| `offset` | integer | No | 0 | Pagination offset |

**Success Response (200 OK):**

Same schema as [List Properties](#list-properties), with `is_liked_by_me` indicator per property.

---

## Recommendations

### Get Recommendations

Returns personalized property recommendations for the authenticated user using a hybrid content-based + collaborative filtering algorithm.

```
GET /api/recommendations/?limit=10
```

**Authentication:** Bearer token (required)

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `limit` | integer | No | 10 | Number of recommendations (max 100) |

**How It Works:**

1. **Build User Profile**: Combines explicit preferences (price range, room count, property type) with implicit signals from favorites (weight 1.0) and views (weight 0.2) into a 14-dimensional feature vector.

2. **Fetch Candidates**: Retrieves properties matching the user's preferences with progressive filter relaxation if too few results are found.

3. **Content-Based Scoring**: Computes feature-weighted cosine similarity between the user vector and each candidate property vector.

4. **Collaborative Filtering**: Finds up to 10 similar users via Jaccard similarity on liked property sets. Aggregates properties liked by those similar users and normalizes to [0, 1]. Only active when the user has 3 or more liked properties.

5. **Hybrid Score**: `0.7 × content_score + 0.3 × collab_score`. Properties with no collaborative signal keep their full content score.

6. **MMR Diversification**: Applies Maximum Marginal Relevance (λ = 0.7) to balance relevance and diversity in the final set.

7. **Caching**: Results are cached in Redis for 1 hour. Cache is invalidated on any new interaction or preference update.

**Success Response (200 OK):**

Same schema as [List Properties](#list-properties), with additional metadata:

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "title": "2-bedroom apartment in city center",
    "price": 12000000,
    "area": 65.5,
    "rooms": 2,
    "city": "Moscow",
    "property_type": "apartment",
    "property_purpose": "sale",
    "is_liked_by_me": false,
    "owner": { ... },
    ...
  }
]
```

**Error Responses:**

| Status | Description |
|---|---|
| `401` | Missing or invalid token |

**Notes:**

- Cold start: new users with no preferences and no interactions receive recommendations based on available properties with no personalization.
- All previously interacted properties (liked or viewed) are excluded from recommendations.
- Results are enriched with the current user's like status (`is_liked_by_me`), owner contact info, and owner's other listings count.

---

## Images

### Upload Images

Uploads property images to MinIO storage.

```
POST /api/upload/
```

**Authentication:** Bearer token (required)

**Request:** `multipart/form-data`

| Field | Type | Required | Description |
|---|---|---|---|
| `files` | UploadFile[] | Yes | 1-10 files |

**Allowed formats:** `jpg`, `jpeg`, `png`, `webp`

**Limits:**
- Max file size: 10 MB per file
- Max files: 10 per request

**Success Response (200 OK):**

```json
{
  "urls": [
    "http://localhost:8000/api/images/uuid_image_001.jpg",
    "http://localhost:8000/api/images/uuid_image_002.jpg"
  ],
  "count": 2
}
```

**Error Responses:**

| Status | Description |
|---|---|
| `400` | Invalid file type, file too large, or too many files |
| `500` | Upload failed (MinIO error) |

---

### Get Image

Serves an image from MinIO storage.

```
GET /api/images/{filename}
```

**Authentication:** None

**Path Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `filename` | string | Image filename (path encoded) |

**Success Response (200 OK):**

Binary image data with appropriate `Content-Type` header (`image/jpeg`, `image/png`, `image/webp`).

**Error Responses:**

| Status | Description |
|---|---|
| `400` | Invalid filename |
| `404` | Image not found |
| `500` | Server error |

---

### Delete Image

Deletes an image from MinIO. The image must belong to a property owned by the requesting user.

```
DELETE /api/images/{filename}
```

**Authentication:** Bearer token (required)

**Path Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `filename` | string | Image filename (path encoded) |

**Success Response (204 No Content):**

No body returned.

**Error Responses:**

| Status | Description |
|---|---|
| `400` | Invalid filename |
| `403` | Image belongs to another user's property (not authorized) |
| `500` | Deletion failed |

---

## Geocoding

### Reverse Geocode

Converts geographic coordinates to a human-readable address using Yandex Geocoder API.

```
GET /api/geocode/reverse?lat=55.7558&lon=37.6173
```

**Authentication:** None

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `lat` | float | **Yes** | Latitude |
| `lon` | float | **Yes** | Longitude |

**Success Response (200 OK):**

```json
{
  "address": "Russia, Moscow, Tverskaya Street, 10"
}
```

**Error Responses:**

| Status | Description |
|---|---|
| `404` | Address could not be resolved for the given coordinates |
| `500` | Yandex API key not configured or external API error |

---

## Common Error Response Format

All errors follow this format:

```json
{
  "detail": "Error description message"
}
```

For validation errors (422):

```json
{
  "detail": [
    {
      "loc": ["body", "price"],
      "msg": "Input should be a valid number",
      "type": "float_parsing"
    }
  ]
}
```
