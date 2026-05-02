from fastapi.testclient import TestClient

from backend.main import app


def test_news_routes_still_work_via_main_app():
    endpoints = [
        '/api/news?limit=1',
        '/api/corporate-actions?limit=1',
        '/api/company-announcements?companyCode=BBCA&limit=1',
    ]
    with TestClient(app) as client:
        responses = [client.get(url) for url in endpoints]

    assert all(response.status_code == 200 for response in responses)
