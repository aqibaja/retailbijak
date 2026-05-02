from fastapi.testclient import TestClient

from backend.main import app


def test_shared_stock_fallbacks_runtime_still_work_via_main_app():
    endpoints = [
        '/api/stocks/BBCA',
        '/api/stocks/BBCA/analysis',
        '/api/top-movers?limit=3',
    ]
    with TestClient(app) as client:
        responses = [client.get(url) for url in endpoints]

    assert all(response.status_code == 200 for response in responses)
