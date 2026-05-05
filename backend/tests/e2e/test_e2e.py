import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_user_journey_recommendation_shift(client: AsyncClient):
    email = "e2e_user@example.com"
    password = "Password123!"
    full_name = "E2E Tester"
    
    # Register user
    reg_res = await client.post("/auth/register", json={
        "email": email, 
        "password": password, 
        "full_name": full_name
    })
    assert reg_res.status_code == 201
    
    # Login
    token_res = await client.post("/auth/login", json={
        "email": email, 
        "password": password
    })
    assert token_res.status_code == 200
    token = token_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create cheap properties (matching user's budget preferences)
    cheap_props = []
    for i in range(5):
        p = await client.post("/api/properties/", json={
            "title": f"Cheap Apt {i}", 
            "price": 100000 + i*1000, 
            "area": 40 + i, 
            "rooms": 1, 
            "address": f"Cheap St {i}", 
            "lat": 55.75, "lon": 37.61, "property_type": "Apartment"
        }, headers=headers)
        cheap_props.append(p.json()["id"])
    
    # Create luxury properties (outside user's budget)
    luxury_props = []
    for i in range(5):
        p = await client.post("/api/properties/", json={
            "title": f"Luxury Villa {i}", 
            "price": 1000000 + i*10000, 
            "area": 300 + i*10, 
            "rooms": 5, 
            "address": f"Rich Blvd {i}", 
            "lat": 55.76, "lon": 37.62, "property_type": "Villa"
        }, headers=headers)
        luxury_props.append(p.json()["id"])
    
    # Set preferences for budget properties
    await client.put("/user/preferences", json={
        "min_price": 50000,
        "max_price": 200000,
        "min_area": 30,
        "preferred_rooms": [1, 2],
        "tags": ["budget"]
    }, headers=headers)
    
    # Get initial recommendations
    res_initial = await client.get("/api/recommendations/", headers=headers)
    initial_recs = res_initial.json()
    initial_titles = [p["title"] for p in initial_recs]
    
    # Check that cheap properties are recommended (they match user preferences)
    cheap_in_initial = [t for t in initial_titles if "Cheap" in t]
    assert len(cheap_in_initial) > 0, f"No cheap properties in initial recommendations: {initial_titles}"
    
    # Like luxury properties
    for prop_id in luxury_props:
        await client.post("/api/interactions/interact", json={
            "property_id": prop_id, 
            "interaction_type": "like"
        }, headers=headers)
    
    # Get final recommendations
    res_final = await client.get("/api/recommendations/", headers=headers)
    final_recs = res_final.json()
    final_titles = [p["title"] for p in final_recs]
    
    # Check that luxury properties are now recommended (due to likes)
    luxury_in_final = [t for t in final_titles if "Luxury" in t]
    assert len(luxury_in_final) > 0, f"No luxury properties in final recommendations: {final_titles}"
    
    # Check that luxury properties appear earlier in final recommendations
    if cheap_in_initial and luxury_in_final:
        first_luxury_final = min(i for i, t in enumerate(final_titles) if "Luxury" in t)
        first_cheap_initial = min(i for i, t in enumerate(initial_titles) if "Cheap" in t)
        # Luxury should be more prominent after liking them
        assert first_luxury_final < len(final_titles) - 1
