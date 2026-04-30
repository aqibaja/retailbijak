from backend.services.idx_api_client import IDXApiClient


def test_full_url_requires_base_url():
    client = IDXApiClient(base_url="")
    try:
        client._full_url("/foo")
        assert False, "expected ValueError"
    except ValueError:
        assert True


def test_full_url_joins_base_and_path():
    client = IDXApiClient(base_url="https://example.com")
    assert client._full_url("/foo") == "https://example.com/foo"
