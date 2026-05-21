from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://user:password@db:5432/nestai_db"
    SECRET_KEY: str = "your-secret-key-here-make-it-32-bytes!"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    YANDEX_API_KEY: str = ""
    REDIS_URL: str = "redis://redis:6379/0"

    S3_ENDPOINT: str = "http://minio:9000"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_BUCKET: str = "nestai-images"
    S3_PUBLIC_URL: str = "http://localhost:8000/api/images"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
