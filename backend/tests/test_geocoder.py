import pytest
from app.services.geocoding_service import GeocodingService
from unittest.mock import AsyncMock, patch, Mock
import httpx


@pytest.fixture
def geocoder():
    return GeocodingService()


@pytest.mark.asyncio
async def test_get_coords_success(geocoder):
    geocoder.api_key = "test-key"
    mock_response = {
        "response": {
            "GeoObjectCollection": {
                "featureMember": [
                    {
                        "GeoObject": {
                            "Point": {
                                "pos": "37.6173 55.7558"
                            }
                        }
                    }
                ]
            }
        }
    }

    with patch("httpx.AsyncClient") as mock_client_class:
        mock_response_obj = AsyncMock()
        mock_response_obj.raise_for_status = Mock(return_value=None)
        mock_response_obj.json = Mock(return_value=mock_response)

        mock_client_instance = AsyncMock()
        mock_client_instance.get = AsyncMock(return_value=mock_response_obj)
        mock_client_class.return_value = mock_client_instance

        result = await geocoder.get_coords_from_address("Moscow, Tverskaya St")
        assert result == (55.7558, 37.6173)


@pytest.mark.asyncio
async def test_get_coords_no_results(geocoder):
    mock_response = {
        "response": {
            "GeoObjectCollection": {
                "featureMember": []
            }
        }
    }

    with patch("httpx.AsyncClient") as mock_client_class:
        mock_response_obj = AsyncMock()
        mock_response_obj.raise_for_status = Mock(return_value=None)
        mock_response_obj.json = Mock(return_value=mock_response)

        mock_client_instance = AsyncMock()
        mock_client_instance.get = AsyncMock(return_value=mock_response_obj)
        mock_client_class.return_value = mock_client_instance

        result = await geocoder.get_coords_from_address("Non-existent Address")
        assert result is None


@pytest.mark.asyncio
async def test_reverse_geocode_success(geocoder):
    geocoder.api_key = "test-key"
    mock_response = {
        "response": {
            "GeoObjectCollection": {
                "featureMember": [
                    {
                        "GeoObject": {
                            "metaDataProperty": {
                                "GeocoderMetaData": {
                                    "text": "Moscow, Tverskaya St, 1"
                                }
                            }
                        }
                    }
                ]
            }
        }
    }

    with patch("httpx.AsyncClient") as mock_client_class:
        mock_response_obj = AsyncMock()
        mock_response_obj.raise_for_status = Mock(return_value=None)
        mock_response_obj.json = Mock(return_value=mock_response)

        mock_client_instance = AsyncMock()
        mock_client_instance.get = AsyncMock(return_value=mock_response_obj)
        mock_client_class.return_value = mock_client_instance

        result = await geocoder.get_address_from_coords(55.7558, 37.6173)
        assert result == "Moscow, Tverskaya St, 1"


@pytest.mark.asyncio
async def test_no_api_key():
    with patch("app.services.geocoding_service.settings") as mock_settings:
        mock_settings.YANDEX_API_KEY = None
        geocoder = GeocodingService()
        assert geocoder.api_key is None
        result = await geocoder.get_coords_from_address("Moscow")
        assert result is None


@pytest.mark.asyncio
async def test_get_coords_http_error(geocoder):
    with patch("httpx.AsyncClient") as mock_client_class:
        mock_client_instance = AsyncMock()
        mock_client_instance.get = AsyncMock(side_effect=httpx.HTTPError("Connection error"))
        mock_client_class.return_value = mock_client_instance
        result = await geocoder.get_coords_from_address("Moscow")
        assert result is None


@pytest.mark.asyncio
async def test_get_coords_malformed_response(geocoder):
    with patch("httpx.AsyncClient") as mock_client_class:
        mock_response_obj = AsyncMock()
        mock_response_obj.raise_for_status = Mock(return_value=None)
        mock_response_obj.json = Mock(return_value={})
        mock_client_instance = AsyncMock()
        mock_client_instance.get = AsyncMock(return_value=mock_response_obj)
        mock_client_class.return_value = mock_client_instance
        result = await geocoder.get_coords_from_address("Moscow")
        assert result is None


@pytest.mark.asyncio
async def test_reverse_geocode_http_error(geocoder):
    with patch("httpx.AsyncClient") as mock_client_class:
        mock_client_instance = AsyncMock()
        mock_client_instance.get = AsyncMock(side_effect=httpx.HTTPError("Connection error"))
        mock_client_class.return_value = mock_client_instance
        result = await geocoder.get_address_from_coords(55.0, 37.0)
        assert result is None


@pytest.mark.asyncio
async def test_reverse_geocode_no_api_key():
    with patch("app.services.geocoding_service.settings") as mock_settings:
        mock_settings.YANDEX_API_KEY = None
        geocoder = GeocodingService()
        result = await geocoder.get_address_from_coords(55.0, 37.0)
        assert result is None


@pytest.mark.asyncio
async def test_reverse_geocode_no_results(geocoder):
    mock_response = {
        "response": {
            "GeoObjectCollection": {
                "featureMember": []
            }
        }
    }
    with patch("httpx.AsyncClient") as mock_client_class:
        mock_response_obj = AsyncMock()
        mock_response_obj.raise_for_status = Mock(return_value=None)
        mock_response_obj.json = Mock(return_value=mock_response)
        mock_client_instance = AsyncMock()
        mock_client_instance.get = AsyncMock(return_value=mock_response_obj)
        mock_client_class.return_value = mock_client_instance
        result = await geocoder.get_address_from_coords(55.0, 37.0)
        assert result is None
