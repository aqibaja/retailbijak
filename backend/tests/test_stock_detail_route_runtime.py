from fastapi.testclient import TestClient

from backend.main import app


def test_stock_detail_routes_still_work_via_main_app():
    endpoints = [
        '/api/stocks/BBCA',
        '/api/stocks/BBCA/fundamental',
        '/api/stocks/BBCA/technical',
        '/api/stocks/BBCA/chart-data?limit=5',
        '/api/stocks/BBCA/analysis',
    ]
    with TestClient(app) as client:
        responses = [client.get(url) for url in endpoints]

    assert all(response.status_code == 200 for response in responses)
