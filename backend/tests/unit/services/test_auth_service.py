import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta, timezone
from app.services.auth_service import AuthService
from app.repositories.property_repository import PropertyRepository


@pytest.fixture
def mock_session():
    return AsyncMock()


@pytest.fixture
def service(mock_session):
    import app.core.config as config
    _old_key = config.settings.SECRET_KEY
    _old_alg = config.settings.ALGORITHM
    config.settings.SECRET_KEY = "test-secret-key-for-testing-32bytes!"
    config.settings.ALGORITHM = "HS256"
    s = AuthService(mock_session)
    s.repository = AsyncMock()
    yield s
    config.settings.SECRET_KEY = _old_key
    config.settings.ALGORITHM = _old_alg


class TestPasswordHashing:
    @pytest.mark.parametrize("password", [
        "simplepass",
        "ComplexPass123!@#",
        "a" * 100,
        "12345678",
    ])
    @pytest.mark.asyncio
    async def test_verify_password_roundtrip(self, service, password):
        hashed = await service.get_password_hash(password)
        assert await service.verify_password(password, hashed)

    @pytest.mark.parametrize("password, wrong", [
        ("correctpass", "wrongpass"),
        ("pass123", "pass456"),
    ])
    @pytest.mark.asyncio
    async def test_verify_password_wrong(self, service, password, wrong):
        hashed = await service.get_password_hash(password)
        assert not await service.verify_password(wrong, hashed)


class TestCreateAccessToken:
    @pytest.mark.parametrize("data, expires_delta", [
        ({"sub": "user-id-1"}, None),
        ({"sub": "user-id-2", "role": "admin"}, timedelta(minutes=60)),
    ])
    @pytest.mark.asyncio
    async def test_create_access_token(self, service, data, expires_delta):
        token = await service.create_access_token(data, expires_delta)
        assert isinstance(token, str)
        assert len(token.split(".")) == 3

    @pytest.mark.asyncio
    async def test_token_contains_sub(self, service):
        import jwt
        token = await service.create_access_token({"sub": "test-user"})
        payload = jwt.decode(token, "test-secret-key-for-testing-32bytes!", algorithms=["HS256"])
        assert payload["sub"] == "test-user"
        assert "exp" in payload


class TestRegisterUser:
    @pytest.mark.parametrize("email, password, full_name, expected_error", [
        ("new@test.com", "Short1!ab", "Valid Name", None),
        ("new@test.com", "Ab1", "Name", "Password must be at least 8 characters"),
        ("new@test.com", "abcdefgh", "Name", "Password must contain at least one uppercase letter"),
        ("new@test.com", "ABCDEF1!", "Name", "Password must contain at least one lowercase letter"),
        ("new@test.com", "Abcdefgh", "Name", "Password must contain at least one digit"),
        ("not-an-email", "ValidPass1", "Name", "Invalid email format"),
        ("existing@test.com", "ValidPass1!", "Name", "User with this email already exists"),
    ])
    @pytest.mark.asyncio
    async def test_register_user(self, service, email, password, full_name, expected_error):
        if email == "existing@test.com":
            service.repository.get_by_email = AsyncMock(return_value=MagicMock(email=email))
        else:
            service.repository.get_by_email = AsyncMock(return_value=None)
            service.repository.create = AsyncMock(return_value=MagicMock(id="new-id", email=email, full_name=full_name))

        if expected_error:
            with pytest.raises(ValueError, match=expected_error):
                await service.register_user(email, password, full_name)
        else:
            result = await service.register_user(email, password, full_name)
            assert result is not None


class TestAuthenticateUser:
    @pytest.mark.parametrize("email, password, user_exists, should_succeed", [
        ("user@test.com", "CorrectPass1!", True, True),
        ("user@test.com", "WrongPass1!", True, False),
        ("nobody@test.com", "AnyPass1!", False, False),
    ])
    @pytest.mark.asyncio
    async def test_authenticate_user(self, service, email, password, user_exists, should_succeed):
        if user_exists:
            correct_hash = await service.get_password_hash("CorrectPass1!")
            user = MagicMock(email=email, hashed_password=correct_hash)
            service.repository.get_by_email = AsyncMock(return_value=user)
        else:
            service.repository.get_by_email = AsyncMock(return_value=None)

        result = await service.authenticate_user(email, password)
        if should_succeed:
            assert result is not None
        else:
            assert result is None


class TestGetCurrentUser:
    @pytest.mark.parametrize("user_id, user_exists", [
        ("valid-id", True),
        ("invalid-id", False),
    ])
    @pytest.mark.asyncio
    async def test_get_current_user(self, service, user_id, user_exists):
        import jwt
        token = await service.create_access_token({"id": user_id})
        if user_exists:
            service.repository.get_by_id = AsyncMock(return_value=MagicMock(id=user_id, email="test@test.com"))
        else:
            service.repository.get_by_id = AsyncMock(return_value=None)

        result = await service.get_current_user(token)
        if user_exists:
            assert result is not None
        else:
            assert result is None


class TestUpdateUser:
    @pytest.mark.parametrize("update_data, expected_fields, current_phone, current_telegram", [
        ({"full_name": "New Name"}, {"full_name": "New Name"}, "+79990000000", "@test"),
        ({"phone_number": "+79990000000"}, {"phone_number": "+79990000000"}, "+79990000000", "@test"),
        ({"full_name": "New", "phone_number": "+71111111111"}, {"full_name": "New", "phone_number": "+71111111111"}, "+79990000000", "@test"),
    ])
    @pytest.mark.asyncio
    async def test_update_user(self, service, update_data, expected_fields, current_phone, current_telegram):
        mock_user = MagicMock(id="user-1", full_name="Old", phone_number=current_phone, telegram_handle=current_telegram)
        service.repository.get_by_id = AsyncMock(return_value=mock_user)
        service.repository.update = AsyncMock(return_value=mock_user)
        result = await service.update_user("user-1", update_data)
        service.repository.update.assert_called_once_with("user-1", update_data)

    @pytest.mark.asyncio
    @patch.object(PropertyRepository, "count_by_user_id", new_callable=AsyncMock, return_value=3)
    @pytest.mark.asyncio
    async def test_update_user_rejects_clearing_all_contacts_with_properties(self, mock_count, service):
        mock_user = MagicMock(id="user-1", full_name="Old", phone_number="+79990000000", telegram_handle="@test")
        service.repository.get_by_id = AsyncMock(return_value=mock_user)
        with pytest.raises(ValueError, match="contact details"):
            await service.update_user("user-1", {"phone_number": None, "telegram_handle": None})

    @patch.object(PropertyRepository, "count_by_user_id", new_callable=AsyncMock, return_value=0)
    @pytest.mark.asyncio
    async def test_update_user_allows_clearing_all_contacts_without_properties(self, mock_count, service):
        mock_user = MagicMock(id="user-1", full_name="Old", phone_number="+79990000000", telegram_handle="@test")
        service.repository.get_by_id = AsyncMock(return_value=mock_user)
        service.repository.update = AsyncMock(return_value=mock_user)
        result = await service.update_user("user-1", {"phone_number": None, "telegram_handle": None})
        assert result is not None

    @pytest.mark.asyncio
    async def test_update_user_allows_clearing_single_contact(self, service):
        mock_user = MagicMock(id="user-1", full_name="Old", phone_number="+79990000000", telegram_handle="@test")
        service.repository.get_by_id = AsyncMock(return_value=mock_user)
        service.repository.update = AsyncMock(return_value=mock_user)
        result = await service.update_user("user-1", {"phone_number": None})
        assert result is not None

    @pytest.mark.asyncio
    async def test_update_user_returns_none_when_not_found(self, service):
        service.repository.get_by_id = AsyncMock(return_value=None)
        result = await service.update_user("nonexistent", {"full_name": "New"})
        assert result is None


class TestRefreshToken:
    @pytest.mark.asyncio
    async def test_refresh_valid_token(self, service):
        token = await service.create_access_token(data={"sub": "user-1", "id": "user-1"})
        mock_user = MagicMock(id="user-1")
        service.repository.get_by_id = AsyncMock(return_value=mock_user)
        new_token = await service.refresh_token(token)
        assert new_token is not None
        import jwt
        from app.core.config import settings
        payload = jwt.decode(new_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        assert payload["sub"] == "user-1"

    @pytest.mark.asyncio
    async def test_refresh_also_works_with_recently_expired_token(self, service):
        import jwt
        import time
        from app.core.config import settings
        expired_token = jwt.encode(
            {"sub": "user-1", "id": "user-1", "exp": int(time.time()) - 180},
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM,
        )
        mock_user = MagicMock(id="user-1")
        service.repository.get_by_id = AsyncMock(return_value=mock_user)
        new_token = await service.refresh_token(expired_token)
        assert new_token is not None

    @pytest.mark.asyncio
    async def test_refresh_rejects_token_expired_too_long_ago(self, service):
        import jwt
        import time
        from app.core.config import settings
        old_token = jwt.encode(
            {"sub": "user-1", "id": "user-1", "exp": int(time.time()) - 3600 * 2},
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM,
        )
        mock_user = MagicMock(id="user-1")
        service.repository.get_by_id = AsyncMock(return_value=mock_user)
        result = await service.refresh_token(old_token)
        assert result is None

    @pytest.mark.asyncio
    async def test_refresh_rejects_invalid_token(self, service):
        result = await service.refresh_token("invalid-token-string")
        assert result is None

    @pytest.mark.asyncio
    async def test_refresh_rejects_malformed_jwt(self, service):
        result = await service.refresh_token("aaaa.bbbb.cccc")
        assert result is None

    @pytest.mark.asyncio
    async def test_refresh_returns_none_when_user_not_found(self, service):
        token = await service.create_access_token(data={"sub": "nonexistent", "id": "nonexistent"})
        service.repository.get_by_id = AsyncMock(return_value=None)
        result = await service.refresh_token(token)
        assert result is None

    @pytest.mark.asyncio
    async def test_refresh_returns_none_when_no_user_id(self, service):
        import jwt
        from app.core.config import settings
        token = jwt.encode({"foo": "bar"}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        result = await service.refresh_token(token)
        assert result is None

    @pytest.mark.asyncio
    async def test_refresh_works_with_id_only_no_sub(self, service):
        import jwt
        from app.core.config import settings
        token = jwt.encode({"id": "user-1"}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        mock_user = MagicMock(id="user-1")
        service.repository.get_by_id = AsyncMock(return_value=mock_user)
        new_token = await service.refresh_token(token)
        assert new_token is not None

    @pytest.mark.asyncio
    async def test_refresh_rejects_token_with_empty_sub(self, service):
        import jwt
        from app.core.config import settings
        token = jwt.encode({"sub": "", "id": "user-1"}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        mock_user = MagicMock(id="user-1")
        service.repository.get_by_id = AsyncMock(return_value=mock_user)
        new_token = await service.refresh_token(token)
        assert new_token is not None

    @pytest.mark.asyncio
    async def test_refresh_chain_multiple_times(self, service):
        token = await service.create_access_token(data={"sub": "user-1", "id": "user-1"})
        mock_user = MagicMock(id="user-1")
        service.repository.get_by_id = AsyncMock(return_value=mock_user)
        for _ in range(3):
            token = await service.refresh_token(token)
            assert token is not None
