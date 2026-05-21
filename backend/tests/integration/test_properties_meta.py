import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_properties_meta_empty(client: AsyncClient):
    res = await client.get("/api/properties/meta")
    assert res.status_code == 200
    data = res.json()
    assert "districts" in data
    assert "metro" in data
    assert "materials" in data
    assert "repair_types" in data
    assert "property_types" in data
    assert "cities" in data


@pytest.mark.asyncio
async def test_properties_meta_with_data(client: AsyncClient, auth_headers):
    headers, _ = auth_headers

    p1 = {
        "title": "Meta Test 1", "price": 100, "address": "A",
        "lat": 55.75, "lon": 37.61, "property_type": "Apartment",
        "property_purpose": "sale", "city": "Moscow",
        "district": "Центр", "metro": "Пушкинская",
        "material": "кирпич", "repair_type": "евро",
    }
    p2 = {
        "title": "Meta Test 2", "price": 200, "address": "B",
        "lat": 55.76, "lon": 37.62, "property_type": "House",
        "property_purpose": "rent", "city": "London",
        "district": "Westminster", "metro": "Baker Street",
        "material": "монолит", "repair_type": "дизайнерский",
    }
    await client.post("/api/properties/", json=p1, headers=headers)
    await client.post("/api/properties/", json=p2, headers=headers)

    res = await client.get("/api/properties/meta")
    assert res.status_code == 200
    data = res.json()
    assert "Moscow" in data["cities"]
    assert "London" in data["cities"]
    assert "Центр" in data["districts"]
    assert "кирпич" in data["materials"]
    assert "евро" in data["repair_types"]
    assert "Apartment" in data["property_types"]
    assert "House" in data["property_types"]


@pytest.mark.asyncio
async def test_properties_meta_no_duplicates(client: AsyncClient, auth_headers):
    headers, _ = auth_headers

    for i in range(3):
        await client.post("/api/properties/", json={
            "title": f"Same City {i}", "price": 100, "address": f"A{i}",
            "lat": 55.75, "lon": 37.61, "property_type": "Apartment",
            "city": "Moscow", "material": "кирпич",
        }, headers=headers)

    res = await client.get("/api/properties/meta")
    data = res.json()
    assert len([c for c in data["cities"] if c == "Moscow"]) == 1
    assert len(data["cities"]) == 1


@pytest.mark.asyncio
async def test_properties_meta_unauthorized(client: AsyncClient):
    res = await client.get("/api/properties/meta")
    assert res.status_code == 200


@pytest.mark.parametrize("endpoint", [
    "/api/properties/",
    "/api/properties/map?min_lat=0&max_lat=90&min_lon=0&max_lon=180",
])
@pytest.mark.asyncio
async def test_properties_endpoints_return_lists(client: AsyncClient, auth_headers, endpoint):
    headers, _ = auth_headers
    res = await client.get(endpoint, headers=headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)
