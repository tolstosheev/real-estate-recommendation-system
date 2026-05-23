import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from fastapi import UploadFile
from io import BytesIO
from app.services.image_service import ImageService


@pytest.fixture
def image_service():
    with (
        patch("app.services.image_service.settings.S3_ENDPOINT", "http://minio:9000"),
        patch("app.services.image_service.settings.S3_ACCESS_KEY", "test-key"),
        patch("app.services.image_service.settings.S3_SECRET_KEY", "test-secret"),
        patch("app.services.image_service.settings.S3_BUCKET", "test-bucket"),
        patch("app.services.image_service.settings.S3_PUBLIC_URL", "/api/images"),
    ):
        yield ImageService()


class TestInit:
    def test_init_values(self, image_service):
        assert image_service.endpoint == "http://minio:9000"
        assert image_service.access_key == "test-key"
        assert image_service.bucket == "test-bucket"
        assert image_service.public_url == "/api/images"


class TestGetClient:
    def test_get_client_creates_minio(self, image_service):
        with patch("app.services.image_service.Minio") as mock_minio:
            client = image_service._get_client()
            mock_minio.assert_called_once()
            assert client is not None

    def test_get_client_reuses(self, image_service):
        mock_instance = MagicMock()
        image_service._client = mock_instance
        with patch("app.services.image_service.Minio") as mock_minio:
            client = image_service._get_client()
            mock_minio.assert_not_called()
            assert client == mock_instance


class TestEnsureBucket:
    @pytest.mark.asyncio
    async def test_ensure_bucket_creates(self, image_service):
        mock_client = MagicMock()
        mock_client.bucket_exists.return_value = False
        image_service._client = mock_client
        await image_service.ensure_bucket()
        mock_client.make_bucket.assert_called_once_with("test-bucket")

    @pytest.mark.asyncio
    async def test_ensure_bucket_exists(self, image_service):
        mock_client = MagicMock()
        mock_client.bucket_exists.return_value = True
        image_service._client = mock_client
        await image_service.ensure_bucket()
        mock_client.make_bucket.assert_not_called()

    @pytest.mark.asyncio
    async def test_ensure_bucket_error(self, image_service):
        from minio.error import S3Error
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_client.bucket_exists.side_effect = S3Error("SomeError", "msg", "bucket", "req_id", "", mock_response)
        image_service._client = mock_client
        with pytest.raises(S3Error):
            await image_service.ensure_bucket()


class TestValidateFile:
    @pytest.mark.parametrize("filename, should_raise", [
        ("test.jpg", False),
        ("test.jpeg", False),
        ("test.png", False),
        ("test.webp", False),
        ("test.pdf", True),
        ("test.gif", True),
        ("test", True),
        ("", True),
    ])
    def test_validate_file(self, image_service, filename, should_raise):
        file = MagicMock(spec=UploadFile)
        file.filename = filename
        if should_raise:
            with pytest.raises(ValueError, match="not allowed"):
                image_service._validate_file(file)
        else:
            image_service._validate_file(file)


class TestUpload:
    @pytest.mark.asyncio
    async def test_upload_success(self, image_service):
        mock_client = MagicMock()
        image_service._client = mock_client
        file = MagicMock(spec=UploadFile)
        file.filename = "photo.jpg"
        file.content_type = "image/jpeg"
        file.read = AsyncMock(return_value=b"image-data")
        result = await image_service.upload(file)
        assert result.startswith("/api/images/")
        assert result.endswith(".jpg")
        mock_client.put_object.assert_called_once()

    @pytest.mark.asyncio
    async def test_upload_too_large(self, image_service):
        file = MagicMock(spec=UploadFile)
        file.filename = "big.jpg"
        file.content_type = "image/jpeg"
        file.read = AsyncMock(return_value=b"x" * (11 * 1024 * 1024))
        with pytest.raises(ValueError, match="too large"):
            await image_service.upload(file)

    @pytest.mark.asyncio
    async def test_upload_invalid_type(self, image_service):
        file = MagicMock(spec=UploadFile)
        file.filename = "doc.pdf"
        with pytest.raises(ValueError, match="not allowed"):
            await image_service.upload(file)

    @pytest.mark.asyncio
    async def test_upload_no_such_bucket(self, image_service):
        from minio.error import S3Error
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_client.put_object.side_effect = [
            S3Error("NoSuchBucket", "bucket not found", "test-bucket", "req_id", "", mock_response),
            None,
        ]
        image_service._client = mock_client
        with patch.object(image_service, "ensure_bucket", new_callable=AsyncMock) as mock_ensure:
            file = MagicMock(spec=UploadFile)
            file.filename = "photo.jpg"
            file.content_type = "image/jpeg"
            file.read = AsyncMock(return_value=b"image-data")
            result = await image_service.upload(file)
            assert result.startswith("/api/images/")
            mock_ensure.assert_awaited_once()
            assert mock_client.put_object.call_count == 2

    @pytest.mark.asyncio
    async def test_upload_other_error(self, image_service):
        from minio.error import S3Error
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_client.put_object.side_effect = S3Error("SomeError", "msg", "test-bucket", "req_id", "", mock_response)
        image_service._client = mock_client
        file = MagicMock(spec=UploadFile)
        file.filename = "photo.jpg"
        file.content_type = "image/jpeg"
        file.read = AsyncMock(return_value=b"image-data")
        with pytest.raises(S3Error):
            await image_service.upload(file)


class TestUploadMultiple:
    @pytest.mark.asyncio
    async def test_upload_multiple_success(self, image_service):
        mock_client = MagicMock()
        image_service._client = mock_client
        files = []
        for i in range(3):
            f = MagicMock(spec=UploadFile)
            f.filename = f"photo{i}.jpg"
            f.content_type = "image/jpeg"
            f.read = AsyncMock(return_value=b"img-data")
            files.append(f)
        urls = await image_service.upload_multiple(files)
        assert len(urls) == 3

    @pytest.mark.asyncio
    async def test_upload_multiple_too_many(self, image_service):
        files = [MagicMock(spec=UploadFile, filename=f"f{i}.jpg") for i in range(11)]
        with pytest.raises(ValueError, match="Too many files"):
            await image_service.upload_multiple(files)


class TestDelete:
    @pytest.mark.asyncio
    async def test_delete_success(self, image_service):
        mock_client = MagicMock()
        image_service._client = mock_client
        await image_service.delete("test.jpg")
        mock_client.remove_object.assert_called_once_with("test-bucket", "test.jpg")

    @pytest.mark.asyncio
    async def test_delete_no_such_key(self, image_service):
        from minio.error import S3Error
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_client.remove_object.side_effect = S3Error("NoSuchKey", "not found", "test-bucket", "", "", mock_response)
        image_service._client = mock_client
        await image_service.delete("test.jpg")

    @pytest.mark.asyncio
    async def test_delete_other_error(self, image_service):
        from minio.error import S3Error
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_client.remove_object.side_effect = S3Error("SomeError", "msg", "test-bucket", "req_id", "", mock_response)
        image_service._client = mock_client
        with pytest.raises(S3Error):
            await image_service.delete("test.jpg")


class TestGetFile:
    @pytest.mark.asyncio
    async def test_get_file_exists(self, image_service):
        mock_response = MagicMock()
        mock_response.read.return_value = b"image-data"
        mock_client = MagicMock()
        mock_client.get_object.return_value = mock_response
        image_service._client = mock_client
        result = await image_service.get_file("test.jpg")
        assert result == b"image-data"

    @pytest.mark.asyncio
    async def test_get_file_not_found(self, image_service):
        from minio.error import S3Error
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_client.get_object.side_effect = S3Error("NoSuchKey", "not found", "test-bucket", "", "", mock_response)
        image_service._client = mock_client
        result = await image_service.get_file("test.jpg")
        assert result is None

    @pytest.mark.asyncio
    async def test_get_file_other_error(self, image_service):
        from minio.error import S3Error
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_client.get_object.side_effect = S3Error("SomeError", "msg", "test-bucket", "req_id", "", mock_response)
        image_service._client = mock_client
        with pytest.raises(S3Error):
            await image_service.get_file("test.jpg")



