import pytest
from pydantic import ValidationError
from app.core.config import Settings


def test_config_rejects_empty_secret_key():
    with pytest.raises(ValidationError):
        Settings(SECRET_KEY="", DATABASE_URL="sqlite:///test.db")


def test_config_accepts_valid_secret_key():
    settings = Settings(SECRET_KEY="valid-secret", DATABASE_URL="sqlite:///test.db")
    assert settings.SECRET_KEY == "valid-secret"
