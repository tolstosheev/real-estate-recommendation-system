import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta, timezone
from app.services.auth_service import AuthService


@pytest.fixture
def mock_session():
    return AsyncMock()


@pytest.fixture
def service(mock_session):
    import app.core.config as config
    _old_key = config.settings.SECRET_KEY
    _old_alg = config.settings.ALGORITHM
    config.settings.SECRET_KEY = "test-secret-key-for-testing"
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
    def test_verify_password_roundtrip(self, service, password):
        hashed = service.get_password_hash(password)
        assert service.verify_password(password, hashed)

    @pytest.mark.parametrize("password, wrong", [
        ("correctpass", "wrongpass"),
        ("pass123", "pass456"),
    ])
    def test_verify_password_wrong(self, service, password, wrong):
        hashed = service.get_password_hash(password)
        assert not service.verify_password(wrong, hashed)


class TestCreateAccessToken:
    @pytest.mark.parametrize("data, expires_delta", [
        ({"sub": "user-id-1"}, None),
        ({"sub": "user-id-2", "role": "admin"}, timedelta(minutes=60)),
    ])
    def test_create_access_token(self, service, data, expires_delta):
        token = service.create_access_token(data, expires_delta)
        assert isinstance(token, str)
        assert len(token.split(".")) == 3

    def test_token_contains_sub(self, service):
        import jwt
        token = service.create_access_token({"sub": "test-user"})
        payload = jwt.decode(token, "test-secret-key-for-testing", algorithms=["HS256"])
        assert payload["sub"] == "test-user"
        assert "exp" in payload


class TestRegisterUser:
    @pytest.mark.parametrize("email, password, full_name, expected_error", [
        ("new@test.com", "Short1!", "Valid Name", None),
        ("new@test.com", "Ab1", "Name", "Password must be at least 6 characters"),
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
            user = MagicMock(email=email, hashed_password=service.get_password_hash("CorrectPass1!"))
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
        token = service.create_access_token({"id": user_id})
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
    @pytest.mark.parametrize("update_data, expected_fields", [
        ({"full_name": "New Name"}, {"full_name": "New Name"}),
        ({"phone_number": "+79990000000"}, {"phone_number": "+79990000000"}),
        ({"full_name": "New", "phone_number": "+71111111111"}, {"full_name": "New", "phone_number": "+71111111111"}),
    ])
    @pytest.mark.asyncio
    async def test_update_user(self, service, update_data, expected_fields):
        mock_user = MagicMock(id="user-1", full_name="Old", phone_number=None)
        service.repository.update = AsyncMock(return_value=mock_user)
        result = await service.update_user("user-1", update_data)
        service.repository.update.assert_called_once_with("user-1", update_data)
