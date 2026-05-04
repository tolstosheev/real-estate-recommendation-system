import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_property_crud(client: AsyncClient):
    payload = {
        "email": "owner@example.com",
        "password": "password123",
        "full_name": "Owner"
    }
    await client.post("/auth/register", json=payload)
    login_data = {"email": "owner@example.com", "password": "password123"}
    token_res = await client.post("/auth/login", json=login_data)
    token = token_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    prop_data = {
        "title": "Modern Apartment",
        "description": "Great place",
        "price": 150000,
        "rooms": 2,
        "area": 60.0,
        "address": "Street 1",
        "lat": 40.7128,
        "lon": -74.0060,
        "property_type": "Apartment"
    }
    
    res = await client.post("/api/properties/", json=prop_data, headers=headers)
    assert res.status_code == 201
    prop_id = res.json()["id"]

    update_data = {"title": "Updated Apartment", "price": 160000}
    res = await client.put(f"/api/properties/{prop_id}", json=update_data, headers=headers)
    assert res.status_code == 200
    assert res.json()["title"] == "Updated Apartment"
    assert float(res.json()["price"]) == 160000

    res = await client.delete(f"/api/properties/{prop_id}", headers=headers)
    assert res.status_code == 204

@pytest.mark.asyncio
async def test_property_unauthorized_access(client: AsyncClient):
    u1_payload = {"email": "u1@example.com", "password": "password123", "full_name": "User 1"}
    u2_payload = {"email": "u2@example.com", "password": "password123", "full_name": "User 2"}
    await client.post("/auth/register", json=u1_payload)
    await client.post("/auth/register", json=u2_payload)
    
    l1_data = {"email": "u1@example.com", "password": "password123"}
    l2_data = {"email": "u2@example.com", "password": "password123"}
    t1 = (await client.post("/auth/login", json=l1_data)).json()["access_token"]
    t2 = (await client.post("/auth/login", json=l2_data)).json()["access_token"]
    
    prop_data = {
        "title": "Private House", "price": 100, "address": "A", "lat": 0, "lon": 0, "property_type": "House"
    }
    res = await client.post("/api/properties/", json=prop_data, headers={"Authorization": f"Bearer {t1}"})
    prop_id = res.json()["id"]

    res = await client.put(f"/api/properties/{prop_id}", json={"title": "Hacked"}, headers={"Authorization": f"Bearer {t2}"})
    assert res.status_code == 403
    
    res = await client.delete(f"/api/properties/{prop_id}", headers={"Authorization": f"Bearer {t2}"})
    assert res.status_code == 403

@pytest.mark.asyncio
async def test_property_not_found(client: AsyncClient):
    payload = {"email": "lost@example.com", "password": "password123", "full_name": "Lost"}
    await client.post("/auth/register", json=payload)
    login_data = {"email": "lost@example.com", "password": "password123"}
    token = (await client.post("/auth/login", json=login_data)).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = await client.get(f"/api/properties/00000000-0000-0000-0000-000000000000")
    assert res.status_code == 404

    res = await client.put(f"/api/properties/00000000-0000-0000-0000-000000000000", json={"title": "X"}, headers=headers)
    assert res.status_code == 404

    res = await client.delete(f"/api/properties/00000000-0000-0000-0000-000000000000", headers=headers)
    assert res.status_code == 404

@pytest.mark.asyncio
async def test_geo_search(client: AsyncClient):
    payload = {"email": "geo@example.com", "password": "password123", "full_name": "Geo"}
    await client.post("/auth/register", json=payload)
    login_data = {"email": "geo@example.com", "password": "password123"}
    token = (await client.post("/auth/login", json=login_data)).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    p1 = {"title": "Near", "price": 100, "address": "A", "lat": 40.0, "lon": 40.0, "property_type": "House"}
    p2 = {"title": "Far", "price": 200, "address": "B", "lat": 41.0, "lon": 41.0, "property_type": "House"}
    await client.post("/api/properties/", json=p1, headers=headers)
    await client.post("/api/properties/", json=p2, headers=headers)

    res = await client.get("/api/properties/", params={"lat": 40.0, "lon": 40.0, "radius_km": 10})
    data = res.json()
    assert len(data) == 1
    assert data[0]["title"] == "Near"

@pytest.mark.asyncio
async def test_property_filters(client: AsyncClient):
    payload = {"email": "filt@example.com", "password": "password123", "full_name": "Filt"}
    await client.post("/auth/register", json=payload)
    login_data = {"email": "filt@example.com", "password": "password123"}
    token = (await client.post("/auth/login", json=login_data)).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    p1 = {"title": "Cheap", "price": 50000, "address": "A", "lat": 0, "lon": 0, "rooms": 1, "property_type": "Studio"}
    p2 = {"title": "Expensive", "price": 500000, "address": "B", "lat": 0, "lon": 0, "rooms": 4, "property_type": "Villa"}
    await client.post("/api/properties/", json=p1, headers=headers)
    await client.post("/api/properties/", json=p2, headers=headers)

    res = await client.get("/api/properties/", params={"max_price": 100000})
    assert len(res.json()) == 1
    assert res.json()[0]["title"] == "Cheap"

    res = await client.get("/api/properties/", params={"rooms": 4})
    assert len(res.json()) == 1
    assert res.json()[0]["title"] == "Expensive"

@pytest.mark.asyncio
async def test_invalid_coordinates(client: AsyncClient):
    payload = {"email": "val@example.com", "password": "password123", "full_name": "Val"}
    await client.post("/auth/register", json=payload)
    login_data = {"email": "val@example.com", "password": "password123"}
    token = (await client.post("/auth/login", json=login_data)).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    prop_data = {
        "title": "Invalid", "price": 100, "address": "A", "lat": 100, "lon": 200, "property_type": "House"
    }
    res = await client.post("/api/properties/", json=prop_data, headers=headers)
    assert res.status_code == 422

@pytest.mark.asyncio
async def test_property_owner_contacts(client: AsyncClient):
    payload = {
        "email": "contact@example.com",
        "password": "password123",
        "full_name": "Contact User",
        "phone_number": "+79001112233",
        "telegram_handle": "@contact_me"
    }
    await client.post("/auth/register", json=payload)
    login_data = {"email": "contact@example.com", "password": "password123"}
    token_res = await client.post("/auth/login", json=login_data)
    token = token_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    prop_data = {
        "title": "Contact House", "price": 100, "address": "A", "lat": 0, "lon": 0, "property_type": "House"
    }
    res = await client.post("/api/properties/", json=prop_data, headers=headers)
    prop_id = res.json()["id"]

    res = await client.get(f"/api/properties/{prop_id}")
    data = res.json()
    assert data["owner"]["full_name"] == "Contact User"
    assert data["owner"]["phone_number"] == "+79001112233"
    assert data["owner"]["telegram_handle"] == "@contact_me"
