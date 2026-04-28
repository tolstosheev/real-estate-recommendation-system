import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_user_journey_recommendation_shift(client: AsyncClient):
    email = "e2e_user@example.com"
    password = "Password123!"
    full_name = "E2E Tester"
    
    reg_res = await client.post("/auth/register", json={
        "email": email, 
        "password": password, 
        "full_name": full_name
    })
    assert reg_res.status_code == 201
    
    token_res = await client.post("/auth/token", data={
        "username": email, 
        "password": password
    })
    assert token_res.status_code == 200
    token = token_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    cheap_props = []
    for i in range(3):
        p = await client.post("/api/properties/", json={
            "title": f"Cheap Apt {i}", 
            "price": 100000 + i*1000, 
            "area": 40 + i, 
            "rooms": 1, 
            "address": f"Cheap St {i}", 
            "lat": 40.0, "lon": 30.0, "property_type": "Apartment"
        }, headers=headers)
        cheap_props.append(p.json()["id"])

    luxury_props = []
    for i in range(3):
        p = await client.post("/api/properties/", json={
            "title": f"Luxury Villa {i}", 
            "price": 1000000 + i*10000, 
            "area": 300 + i*10, 
            "rooms": 5, 
            "address": f"Rich Blvd {i}", 
            "lat": 40.1, "lon": 30.1, "property_type": "Villa"
        }, headers=headers)
        luxury_props.append(p.json()["id"])

    await client.put("/user/preferences", json={
        "min_price": 50000,
        "max_price": 200000,
        "min_area": 30,
        "preferred_rooms": [1, 2],
        "tags": ["budget"]
    }, headers=headers)

    res_initial = await client.get("/api/recommendations/", headers=headers)
    initial_recs = res_initial.json()
    initial_titles = [p["title"] for p in initial_recs]
    
    assert any("Cheap" in title for title in initial_titles)
    if any("Luxury" in title for title in initial_titles):
        first_luxury = next(i for i, t in enumerate(initial_titles) if "Luxury" in t)
        first_cheap = next(i for i, t in enumerate(initial_titles) if "Cheap" in t)
        assert first_cheap < first_luxury

    for prop_id in luxury_props:
        await client.post("/api/interactions/interact", json={
            "property_id": prop_id, 
            "interaction_type": "like"
        }, headers=headers)

    res_final = await client.get("/api/recommendations/", headers=headers)
    final_recs = res_final.json()
    final_titles = [p["title"] for p in final_recs]
    
    assert any("Luxury" in title for title in final_titles)
    first_luxury = next(i for i, t in enumerate(final_titles) if "Luxury" in t)
    assert first_luxury < 2 
