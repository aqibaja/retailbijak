from fastapi.testclient import TestClient

from backend.main import app


def test_market_summary_routes_still_work_via_main_app():
    endpoints = [
        '/api/ihsg-chart',
        '/api/market-summary',
        '/api/sector-summary',
    ]
    with TestClient(app) as client:
        responses = [client.get(url) for url in endpoints]

    assert all(response.status_code == 200 for response in responses)
