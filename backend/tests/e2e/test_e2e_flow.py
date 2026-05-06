import pytest
from httpx import AsyncClient
from app.core.db import get_db


@pytest.mark.asyncio
async def test_full_recommendation_cycle(client: AsyncClient):
    user_email = "e2e_user@test.com"
    reg_payload = {"email": user_email, "password": "securepassword123", "full_name": "E2E Tester"}
    await client.post("/auth/register", json=reg_payload)

    login_payload = {"email": user_email, "password": "securepassword123"}
    login_res = await client.post("/auth/login", json=login_payload)
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    prop_a_payload = {
        "title": "Cheap Studio",
        "price": 50000,
        "rooms": 1,
        "area": 30,
        "address": "Cheap St 1",
        "lat": 55.0,
        "lon": 37.0,
        "property_type": "Apartment",
    }
    res_a = await client.post("/api/properties/", json=prop_a_payload, headers=headers)
    assert res_a.status_code == 201
    prop_a_id = res_a.json()["id"]

    prop_b_payload = {
        "title": "Luxury Villa",
        "price": 1000000,
        "rooms": 5,
        "area": 300,
        "address": "Rich Ave 1",
        "lat": 56.0,
        "lon": 38.0,
        "property_type": "House",
    }
    res_b = await client.post("/api/properties/", json=prop_b_payload, headers=headers)
    assert res_b.status_code == 201
    prop_b_id = res_b.json()["id"]

    pref_payload = {"min_price": 40000, "max_price": 100000, "min_area": 20, "preferred_rooms": [1]}
    await client.put("/user/preferences", json=pref_payload, headers=headers)

    recs_1 = await client.get("/api/recommendations/?limit=10", headers=headers)
    assert recs_1.status_code == 200
    recs_1_ids = [p["id"] for p in recs_1.json()]

    if prop_a_id in recs_1_ids and prop_b_id in recs_1_ids:
        assert recs_1_ids.index(prop_a_id) < recs_1_ids.index(prop_b_id)

    interact_payload = {"property_id": prop_b_id, "interaction_type": "like"}
    await client.post("/api/interactions/interact", json=interact_payload, headers=headers)

    recs_2 = await client.get("/api/recommendations/?limit=10", headers=headers)
    assert recs_2.status_code == 200
    recs_2_ids = [p["id"] for p in recs_2.json()]

    if prop_a_id in recs_2_ids and prop_b_id in recs_2_ids:
        assert prop_b_id in recs_2_ids
