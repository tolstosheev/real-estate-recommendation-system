import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_user_contact_info(client: AsyncClient):
    email = "contact_test@example.com"
    password = "Password123!"
    full_name = "Contact Tester"
    phone = "+79991234567"
    telegram = "@nestai_test"

    reg_res = await client.post(
        "/auth/register",
        json={
            "email": email,
            "password": password,
            "full_name": full_name,
            "phone_number": phone,
            "telegram_handle": telegram,
        },
    )
    assert reg_res.status_code == 201
    user_data = reg_res.json()
    assert user_data["phone_number"] == phone
    assert user_data["telegram_handle"] == telegram

    token_res = await client.post("/auth/login", json={"email": email, "password": password})
    token = token_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    me_res = await client.get("/auth/me", headers=headers)
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["phone_number"] == phone
    assert me_data["telegram_handle"] == telegram
