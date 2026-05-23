from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    app_env: str = "development"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    YANDEX_API_KEY: str = ""
    REDIS_URL: str = "redis://redis:6379/0"

    S3_ENDPOINT: str = "http://minio:9000"
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_BUCKET: str = "nestai-images"
    S3_PUBLIC_URL: str = "http://localhost:8000/api/images"
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        if not v:
            raise ValueError("SECRET_KEY environment variable must not be empty")
        return v


settings = Settings(_env_file=".env")  # type: ignore[call-arg]
