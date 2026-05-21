import pytest
from httpx import AsyncClient
import io


@pytest.mark.asyncio
async def test_upload_image(client: AsyncClient, auth_headers):
    headers, _ = auth_headers
    file_content = b"fake-image-data"
    files = [("files", ("test.jpg", io.BytesIO(file_content), "image/jpeg"))]
    res = await client.post("/api/upload/", files=files, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "urls" in data
    assert data["count"] == 1


@pytest.mark.asyncio
async def test_upload_unauthorized(client: AsyncClient):
    file_content = b"fake-image-data"
    files = [("files", ("test.jpg", io.BytesIO(file_content), "image/jpeg"))]
    res = await client.post("/api/upload/", files=files)
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_upload_invalid_file_type(client: AsyncClient, auth_headers):
    headers, _ = auth_headers
    files = [("files", ("test.pdf", io.BytesIO(b"fake-pdf"), "application/pdf"))]
    res = await client.post("/api/upload/", files=files, headers=headers)
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_get_image_not_found(client: AsyncClient):
    res = await client.get("/api/images/nonexistent.jpg")
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_upload_and_retrieve_image(client: AsyncClient, auth_headers):
    headers, _ = auth_headers
    file_content = b"fake-image-data"
    files = [("files", ("test_retrieve.jpg", io.BytesIO(file_content), "image/jpeg"))]
    upload_res = await client.post("/api/upload/", files=files, headers=headers)
    filename = upload_res.json()["urls"][0].split("/")[-1]

    get_res = await client.get(f"/api/images/{filename}")
    assert get_res.status_code == 200
    assert get_res.content == file_content


@pytest.mark.asyncio
async def test_delete_image(client: AsyncClient, auth_headers):
    headers, _ = auth_headers
    file_content = b"fake-image-data"
    files = [("files", ("test_delete.jpg", io.BytesIO(file_content), "image/jpeg"))]
    upload_res = await client.post("/api/upload/", files=files, headers=headers)
    filename = upload_res.json()["urls"][0].split("/")[-1]

    del_res = await client.delete(f"/api/images/{filename}", headers=headers)
    assert del_res.status_code == 204

    get_res = await client.get(f"/api/images/{filename}")
    assert get_res.status_code == 404


@pytest.mark.asyncio
async def test_delete_image_unauthorized(client: AsyncClient, auth_headers):
    headers, _ = auth_headers
    file_content = b"fake-image-data"
    files = [("files", ("test_del_unauth.jpg", io.BytesIO(file_content), "image/jpeg"))]
    upload_res = await client.post("/api/upload/", files=files, headers=headers)
    filename = upload_res.json()["urls"][0].split("/")[-1]

    del_res = await client.delete(f"/api/images/{filename}")
    assert del_res.status_code == 401
