import pytest
from httpx import AsyncClient
from decimal import Decimal

@pytest.mark.asyncio
async def test_user_preferences(client: AsyncClient):
    payload = {"email": "pref@example.com", "password": "password123", "full_name": "Pref User"}
    await client.post("/auth/register", json=payload)
    login_data = {"username": "pref@example.com", "password": "password123"}
    token_res = await client.post("/auth/token", data=login_data)
    token = token_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    pref_data = {
        "min_price": 100000,
        "max_price": 500000,
        "min_area": 50.0,
        "preferred_rooms": [2, 3],
        "tags": ["center", "modern"]
    }
    
    res = await client.put("/user/preferences", json=pref_data, headers=headers)
    assert res.status_code == 200
    assert float(res.json()["min_price"]) == 100000.0
    
    res = await client.get("/user/preferences", headers=headers)
    assert res.status_code == 200
    assert float(res.json()["max_price"]) == 500000.0

@pytest.mark.asyncio
async def test_property_interactions(client: AsyncClient):
    payload = {"email": "int@example.com", "password": "password123", "full_name": "Int User"}
    await client.post("/auth/register", json=payload)
    login_data = {"username": "int@example.com", "password": "password123"}
    token_res = await client.post("/auth/token", data=login_data)
    token = token_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    prop_data = {
        "title": "Interaction House", "price": 100, "address": "A", "lat": 0, "lon": 0, "property_type": "House"
    }
    prop_res = await client.post("/api/properties/", json=prop_data, headers=headers)
    prop_id = prop_res.json()["id"]

    like_data = {"property_id": prop_id, "interaction_type": "like"}
    res = await client.post("/api/interactions/interact", json=like_data, headers=headers)
    assert res.status_code == 201
    
    favs = await client.get("/api/interactions/favorites", headers=headers)
    assert len(favs.json()) == 1
    assert favs.json()[0]["id"] == prop_id

    res = await client.post("/api/interactions/interact", json=like_data, headers=headers)
    assert res.status_code == 204
    
    favs = await client.get("/api/interactions/favorites", headers=headers)
    assert len(favs.json()) == 0

@pytest.mark.asyncio
async def test_interaction_nonexistent_property(client: AsyncClient):
    payload = {"email": "err@example.com", "password": "password123", "full_name": "Err"}
    await client.post("/auth/register", json=payload)
    login_data = {"username": "err@example.com", "password": "password123"}
    token = (await client.post("/auth/token", data=login_data)).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    like_data = {
        "property_id": "00000000-0000-0000-0000-000000000000", 
        "interaction_type": "like"
    }
    res = await client.post("/api/interactions/interact", json=like_data, headers=headers)
    # Current implementation might just create it if not checked, but logically it should fail
    # If the DB has FK constraint, it will fail with 500. 
    # Let's see.
    assert res.status_code in [400, 404, 500]
