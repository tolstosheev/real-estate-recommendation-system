import pytest
import json
from httpx import AsyncClient
from app.core.redis import RedisClient


@pytest.mark.asyncio
async def test_redis_connection():
    client = await RedisClient.get_client()
    assert client is not None
    await client.set("test_key", "test_value")
    val = await client.get("test_key")
    assert val == "test_value"
    await client.delete("test_key")
    await RedisClient.close()


@pytest.mark.asyncio
async def test_recommendations_caching(client: AsyncClient):
    payload = {"email": "cache@example.com", "password": "password123", "full_name": "Cache User"}
    await client.post("/auth/register", json=payload)
    login_data = {"email": "cache@example.com", "password": "password123"}
    token = (await client.post("/auth/login", json=login_data)).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    p1 = {
        "title": "P1",
        "price": 100,
        "area": 50,
        "rooms": 1,
        "address": "A",
        "lat": 0,
        "lon": 0,
        "property_type": "House",
    }
    p2 = {
        "title": "P2",
        "price": 110,
        "area": 55,
        "rooms": 1,
        "address": "B",
        "lat": 0,
        "lon": 0,
        "property_type": "House",
    }
    await client.post("/api/properties/", json=p1, headers=headers)
    await client.post("/api/properties/", json=p2, headers=headers)

    res1 = await client.get("/api/recommendations/", headers=headers)
    assert res1.status_code == 200
    recs1 = res1.json()

    res2 = await client.get("/api/recommendations/", headers=headers)
    assert res2.status_code == 200
    recs2 = res2.json()

    assert recs1 == recs2
