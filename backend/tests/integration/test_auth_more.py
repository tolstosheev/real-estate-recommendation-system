import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_update_me(client: AsyncClient, auth_headers):
    headers, _ = auth_headers
    update_data = {"full_name": "Updated Name", "phone_number": "+79998887766"}
    res = await client.put("/auth/me", json=update_data, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["full_name"] == "Updated Name"
    assert data["phone_number"] == "+79998887766"


@pytest.mark.asyncio
async def test_update_me_unauthorized(client: AsyncClient):
    res = await client.put("/auth/me", json={"full_name": "Hacker"})
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_update_me_partial(client: AsyncClient, auth_headers):
    headers, _ = auth_headers
    res = await client.put("/auth/me", json={"telegram_handle": "@newhandle"}, headers=headers)
    assert res.status_code == 200
    assert res.json()["telegram_handle"] == "@newhandle"


@pytest.mark.asyncio
async def test_update_me_invalid_token(client: AsyncClient):
    headers = {"Authorization": "Bearer invalid-token"}
    res = await client.put("/auth/me", json={"full_name": "Hacker"}, headers=headers)
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token(client: AsyncClient, auth_headers):
    headers, _ = auth_headers
    res = await client.post("/auth/refresh", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_refresh_token_invalid(client: AsyncClient):
    headers = {"Authorization": "Bearer invalid-token"}
    res = await client.post("/auth/refresh", headers=headers)
    assert res.status_code == 401


@pytest.mark.parametrize("method, endpoint", [
    ("GET", "/"),
    ("GET", "/auth/"),
])
@pytest.mark.asyncio
async def test_root_endpoints(client: AsyncClient, method, endpoint):
    res = await client.request(method, endpoint)
    assert res.status_code in (200, 404)
