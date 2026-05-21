import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_user_properties(client: AsyncClient, auth_headers):
    headers, user_id = auth_headers
    prop_data = {
        "title": "My Property",
        "price": 100,
        "address": "A",
        "lat": 0, "lon": 0,
        "property_type": "House",
    }
    await client.post("/api/properties/", json=prop_data, headers=headers)
    res = await client.get("/user/properties", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 1
    assert data[0]["title"] == "My Property"


@pytest.mark.asyncio
async def test_get_user_properties_unauthorized(client: AsyncClient):
    res = await client.get("/user/properties")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_update_user_profile(client: AsyncClient, auth_headers):
    headers, user_id = auth_headers
    update_data = {"full_name": "Updated Name", "phone_number": "+79999999999"}
    res = await client.put("/user/profile", json=update_data, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["full_name"] == "Updated Name"
    assert data["phone_number"] == "+79999999999"


@pytest.mark.asyncio
async def test_update_user_profile_unauthorized(client: AsyncClient):
    res = await client.put("/user/profile", json={"full_name": "Hacker"})
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_get_user_by_id(client: AsyncClient, auth_headers):
    headers, user_id = auth_headers
    res = await client.get(f"/user/{user_id}")
    assert res.status_code == 200
    data = res.json()
    assert "email" in data
    assert "full_name" in data


@pytest.mark.asyncio
async def test_get_user_not_found(client: AsyncClient):
    res = await client.get("/user/00000000-0000-0000-0000-000000000000")
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_view_history(client: AsyncClient, auth_headers):
    headers, user_id = auth_headers

    prop_data = {
        "title": "Viewed Prop",
        "price": 100,
        "address": "A",
        "lat": 0, "lon": 0,
        "property_type": "House",
    }
    prop_res = await client.post("/api/properties/", json=prop_data, headers=headers)
    prop_id = prop_res.json()["id"]

    await client.post(
        "/api/interactions/interact",
        json={"property_id": prop_id, "interaction_type": "view"},
        headers=headers,
    )

    res = await client.get("/api/interactions/history", headers=headers)
    assert res.status_code == 200
    history = res.json()
    assert len(history) >= 1
    assert history[0]["id"] == prop_id


@pytest.mark.asyncio
async def test_interaction_duplicate_like_toggle(client: AsyncClient, auth_headers):
    headers, user_id = auth_headers

    prop_data = {
        "title": "Toggle Prop",
        "price": 100,
        "address": "A",
        "lat": 0, "lon": 0,
        "property_type": "House",
    }
    prop_res = await client.post("/api/properties/", json=prop_data, headers=headers)
    prop_id = prop_res.json()["id"]

    res1 = await client.post(
        "/api/interactions/interact",
        json={"property_id": prop_id, "interaction_type": "like"},
        headers=headers,
    )
    assert res1.status_code == 201
    assert res1.json()["status"] == "created"

    res2 = await client.post(
        "/api/interactions/interact",
        json={"property_id": prop_id, "interaction_type": "like"},
        headers=headers,
    )
    assert res2.status_code == 200
    assert res2.json()["status"] == "removed"

    favs = await client.get("/api/interactions/favorites", headers=headers)
    assert len(favs.json()) == 0


@pytest.mark.asyncio
async def test_interaction_without_auth(client: AsyncClient):
    res = await client.post(
        "/api/interactions/interact",
        json={"property_id": "00000000-0000-0000-0000-000000000000", "interaction_type": "like"},
    )
    assert res.status_code == 401
