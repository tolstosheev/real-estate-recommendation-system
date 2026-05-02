import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_register_user(client: AsyncClient):
    payload = {
        "email": "test@example.com",
        "password": "testpassword123",
        "full_name": "Test User"
    }
    response = await client.post("/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["full_name"] == "Test User"
    assert "id" in data

@pytest.mark.asyncio
async def test_register_duplicate_user(client: AsyncClient):
    payload = {
        "email": "duplicate@example.com",
        "password": "password123",
        "full_name": "First User"
    }
    await client.post("/auth/register", json=payload)
    
    response = await client.post("/auth/register", json=payload)
    assert response.status_code == 400
    assert response.json()["detail"] == "User with this email already exists"

@pytest.mark.asyncio
async def test_register_invalid_email(client: AsyncClient):
    payload = {
        "email": "not-an-email",
        "password": "password123",
        "full_name": "Invalid User"
    }
    response = await client.post("/auth/register", json=payload)
    assert response.status_code == 422

@pytest.mark.asyncio
async def test_register_missing_fields(client: AsyncClient):
    payload = {
        "email": "missing@example.com"
    }
    response = await client.post("/auth/register", json=payload)
    assert response.status_code == 422

@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    payload = {
        "email": "login@example.com",
        "password": "loginpassword",
        "full_name": "Login User"
    }
    await client.post("/auth/register", json=payload)
    
    login_data = {
        "username": "login@example.com",
        "password": "loginpassword"
    }
    response = await client.post("/auth/token", data=login_data)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_login_failure(client: AsyncClient):
    login_data = {
        "username": "nonexistent@example.com",
        "password": "wrongpassword"
    }
    response = await client.post("/auth/token", data=login_data)
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"

@pytest.mark.asyncio
async def test_get_me_success(client: AsyncClient):
    payload = {
        "email": "me@example.com",
        "password": "mepassword",
        "full_name": "Me User"
    }
    await client.post("/auth/register", json=payload)
    
    login_data = {"username": "me@example.com", "password": "mepassword"}
    token_res = await client.post("/auth/token", data=login_data)
    token = token_res.json()["access_token"]
    
    headers = {"Authorization": f"Bearer {token}"}
    response = await client.get("/auth/me", headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "me@example.com"

@pytest.mark.asyncio
async def test_get_me_invalid_token(client: AsyncClient):
    headers = {"Authorization": "Bearer invalid-token"}
    response = await client.get("/auth/me", headers=headers)
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid authentication credentials"

@pytest.mark.asyncio
async def test_get_me_no_token(client: AsyncClient):
    response = await client.get("/auth/me")
    assert response.status_code == 401
