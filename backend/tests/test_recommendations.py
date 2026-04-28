import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_recommendations_cold_start(client: AsyncClient):
    payload = {"email": "cold@example.com", "password": "password123", "full_name": "Cold User"}
    await client.post("/auth/register", json=payload)
    login_data = {"username": "cold@example.com", "password": "password123"}
    token_res = await client.post("/auth/token", data=login_data)
    token = token_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    prop_data = {"title": "Some House", "price": 100, "address": "A", "lat": 0, "lon": 0, "property_type": "House"}
    await client.post("/api/properties/", json=prop_data, headers=headers)

    res = await client.get("/api/recommendations/", headers=headers)
    assert res.status_code == 200
    assert len(res.json()) >= 1

@pytest.mark.asyncio
async def test_recommendations_personalized(client: AsyncClient):
    payload = {"email": "rec@example.com", "password": "password123", "full_name": "Rec User"}
    await client.post("/auth/register", json=payload)
    login_data = {"username": "rec@example.com", "password": "password123"}
    token_res = await client.post("/auth/token", data=login_data)
    token = token_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    p1_data = {"title": "Cheap House", "price": 100, "address": "A", "lat": 0, "lon": 0, "property_type": "House"}
    p2_data = {"title": "Luxury Villa", "price": 1000000, "address": "B", "lat": 0, "lon": 0, "property_type": "Villa"}
    
    res_p1 = await client.post("/api/properties/", json=p1_data, headers=headers)
    id_p1 = res_p1.json()["id"]
    await client.post("/api/properties/", json=p2_data, headers=headers)

    await client.post("/api/interactions/interact", json={"property_id": id_p1, "interaction_type": "like"}, headers=headers)
    
    res = await client.get("/api/recommendations/", headers=headers)
    assert res.status_code == 200
    assert len(res.json()) >= 1
