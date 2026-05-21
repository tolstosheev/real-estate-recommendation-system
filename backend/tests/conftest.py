import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.db import Base
from app.core.redis import RedisClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://user:password@db:5432/nestai_test",
)


@pytest_asyncio.fixture(autouse=True)
async def cleanup_redis():
    yield
    await RedisClient.close()


@pytest_asyncio.fixture
async def db_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(db_engine):
    async_session_factory = sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session_factory() as session:
        yield session


@pytest_asyncio.fixture
async def client(db_engine):
    async_session_factory = sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session_factory() as session:
        from app.core.db import get_db

        async def override_get_db():
            yield session

        app.dependency_overrides[get_db] = override_get_db

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            try:
                yield ac
            finally:
                app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def auth_headers(client):
    register_data = {
        "email": "testuser@example.com",
        "password": "StrongPass123!",
        "full_name": "Test User",
    }
    resp = await client.post("/auth/register", json=register_data)
    user_id = resp.json().get("id")

    login_resp = await client.post(
        "/auth/login",
        json={"email": "testuser@example.com", "password": "StrongPass123!"},
    )
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}, user_id


@pytest_asyncio.fixture
async def second_auth_headers(client):
    register_data = {
        "email": "user2@example.com",
        "password": "StrongPass456!",
        "full_name": "Second User",
    }
    await client.post("/auth/register", json=register_data)
    login_resp = await client.post(
        "/auth/login",
        json={"email": "user2@example.com", "password": "StrongPass456!"},
    )
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
