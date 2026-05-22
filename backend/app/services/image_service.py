import logging
import os
import uuid

from fastapi import UploadFile
from minio import Minio
from minio.error import S3Error

from app.core.config import settings

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024
MAX_FILES = 10


class ImageService:
    def __init__(self):
        self._client: Minio | None = None
        self.endpoint = settings.S3_ENDPOINT
        self.access_key = settings.S3_ACCESS_KEY
        self.secret_key = settings.S3_SECRET_KEY
        self.bucket = settings.S3_BUCKET
        self.public_url = settings.S3_PUBLIC_URL

    def _get_client(self) -> Minio:
        if self._client is None:
            endpoint_clean = self.endpoint.replace("http://", "").replace("https://", "")
            self._client = Minio(
                endpoint_clean,
                access_key=self.access_key,
                secret_key=self.secret_key,
                secure=self.endpoint.startswith("https"),
            )
        return self._client

    async def ensure_bucket(self):
        try:
            client = self._get_client()
            if not client.bucket_exists(self.bucket):
                client.make_bucket(self.bucket)
                logger.info(f"Created bucket: {self.bucket}")
        except S3Error as e:
            logger.error(f"Failed to ensure bucket: {e}")
            raise

    def _validate_file(self, file: UploadFile) -> None:
        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise ValueError(f"File type {ext} not allowed. Allowed: {ALLOWED_EXTENSIONS}")

    async def upload(self, file: UploadFile) -> str:
        self._validate_file(file)
        ext = os.path.splitext(file.filename or "image.jpg")[1].lower()
        filename = f"{uuid.uuid4()}{ext}"

        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise ValueError(f"File too large. Max size: {MAX_FILE_SIZE // (1024*1024)}MB")

        client = self._get_client()
        try:
            client.put_object(
                self.bucket,
                filename,
                data=__import__("io").BytesIO(content),
                length=len(content),
                content_type=file.content_type or "application/octet-stream",
            )
            logger.info(f"Uploaded {filename} to bucket {self.bucket}")
            return f"{self.public_url}/{filename}"
        except S3Error as e:
            if e.code == "NoSuchBucket":
                await self.ensure_bucket()
                client.put_object(
                    self.bucket,
                    filename,
                    data=__import__("io").BytesIO(content),
                    length=len(content),
                    content_type=file.content_type or "application/octet-stream",
                )
                logger.info(f"Uploaded {filename} to bucket {self.bucket}")
                return f"{self.public_url}/{filename}"
            logger.error(f"Failed to upload {filename}: {e}")
            raise

    async def upload_multiple(self, files: list[UploadFile]) -> list[str]:
        if len(files) > MAX_FILES:
            raise ValueError(f"Too many files. Max: {MAX_FILES}")

        urls = []
        for file in files:
            url = await self.upload(file)
            urls.append(url)
        return urls

    async def delete(self, filename: str) -> None:
        client = self._get_client()
        try:
            client.remove_object(self.bucket, filename)
            logger.info(f"Deleted {filename} from bucket {self.bucket}")
        except S3Error as e:
            if e.code in ("NoSuchKey", "NoSuchBucket"):
                return
            logger.error(f"Failed to delete {filename}: {e}")
            raise

    async def get_file(self, filename: str) -> bytes | None:
        client = self._get_client()
        try:
            response = client.get_object(self.bucket, filename)
            data = response.read()
            response.close()
            response.release_conn()
            return data
        except S3Error as e:
            if e.code in ("NoSuchKey", "NoSuchBucket"):
                return None
            logger.error(f"Failed to get {filename}: {e}")
            raise

    def get_url(self, filename: str) -> str:
        return f"{self.public_url}/{filename}"
