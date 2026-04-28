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

    p1_data = {"title": "Cheap House 1", "price": 100, "area": 50, "rooms": 1, "address": "A", "lat": 0, "lon": 0, "property_type": "House"}
    p2_data = {"title": "Cheap House 2", "price": 110, "area": 55, "rooms": 1, "address": "B", "lat": 0, "lon": 0, "property_type": "House"}
    p3_data = {"title": "Luxury Villa", "price": 1000000, "area": 500, "rooms": 10, "address": "C", "lat": 0, "lon": 0, "property_type": "Villa"}
    
    res_p1 = await client.post("/api/properties/", json=p1_data, headers=headers)
    id_p1 = res_p1.json()["id"]
    await client.post("/api/properties/", json=p2_data, headers=headers)
    await client.post("/api/properties/", json=p3_data, headers=headers)

    await client.post("/api/interactions/interact", json={"property_id": id_p1, "interaction_type": "like"}, headers=headers)
    
    res = await client.get("/api/recommendations/", headers=headers)
    assert res.status_code == 200
    recs = res.json()
    
    titles = [p["title"] for p in recs]
    assert "Cheap House 2" in titles
    if "Luxury Villa" in titles:
        assert titles.index("Cheap House 2") < titles.index("Luxury Villa")
