import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_recommendations_with_preferences(client: AsyncClient):
    payload = {"email": "pref_rec@example.com", "password": "Password123", "full_name": "Pref Rec"}
    await client.post("/auth/register", json=payload)
    token = (await client.post("/auth/login", json={"email": "pref_rec@example.com", "password": "Password123"})).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    await client.put("/user/preferences", json={
        "min_price": 50000, "max_price": 150000,
        "min_area": 30, "preferred_rooms": [1, 2],
        "property_types": ["Apartment"],
    }, headers=headers)

    for i in range(3):
        await client.post("/api/properties/", json={
            "title": f"Pref Apt {i}", "price": 80000 + i * 10000,
            "area": 40 + i, "rooms": 1, "address": f"S{i}",
            "lat": 55.75, "lon": 37.61, "property_type": "Apartment",
        }, headers=headers)

    res = await client.get("/api/recommendations/", headers=headers)
    assert res.status_code == 200
    recs = res.json()
    assert len(recs) >= 1


@pytest.mark.asyncio
async def test_recommendations_without_properties(client: AsyncClient):
    payload = {"email": "empty_rec@example.com", "password": "Password123", "full_name": "Empty"}
    await client.post("/auth/register", json=payload)
    token = (await client.post("/auth/login", json={"email": "empty_rec@example.com", "password": "Password123"})).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = await client.get("/api/recommendations/", headers=headers)
    assert res.status_code == 200
    assert res.json() == []


@pytest.mark.asyncio
async def test_recommendations_unauthorized(client: AsyncClient):
    res = await client.get("/api/recommendations/")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_recommendations_with_likes_only(client: AsyncClient):
    payload = {"email": "like_rec@example.com", "password": "Password123", "full_name": "Like Rec"}
    await client.post("/auth/register", json=payload)
    token = (await client.post("/auth/login", json={"email": "like_rec@example.com", "password": "Password123"})).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    props = []
    for i in range(3):
        r = await client.post("/api/properties/", json={
            "title": f"Like Prop {i}", "price": 100000 + i * 5000,
            "area": 40, "rooms": 1, "address": f"S{i}",
            "lat": 55.75, "lon": 37.61, "property_type": "Apartment",
        }, headers=headers)
        props.append(r.json()["id"])

    await client.post("/api/interactions/interact", json={"property_id": props[0], "interaction_type": "like"}, headers=headers)

    res = await client.get("/api/recommendations/", headers=headers)
    assert res.status_code == 200
    recs = res.json()
    assert len(recs) >= 1
