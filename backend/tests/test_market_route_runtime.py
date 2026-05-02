from fastapi.testclient import TestClient

from backend.main import app


def test_market_routes_still_work_via_main_app():
    endpoints = [
        '/api/market-breadth',
        '/api/market-stats',
        '/api/market-events',
        '/api/top-movers?limit=3',
        '/api/foreign-trading?limit=3',
        '/api/broker-activity?limit=3',
    ]
    with TestClient(app) as client:
        responses = [client.get(url) for url in endpoints]

    assert all(response.status_code == 200 for response in responses)
