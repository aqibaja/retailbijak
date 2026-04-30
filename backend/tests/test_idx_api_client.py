from backend.services.idx_api_client import IDXApiClient


def test_default_base_url_uses_idx_website():
    client = IDXApiClient(base_url="")
    assert client._full_url("/foo") == "https://www.idx.co.id/foo"


def test_full_url_joins_base_and_path():
    client = IDXApiClient(base_url="https://example.com")
    assert client._full_url("/foo") == "https://example.com/foo"
