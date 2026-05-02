from fastapi.testclient import TestClient

from backend.main import app


def test_user_routes_still_respond_via_main_app():
    with TestClient(app) as client:
        settings = client.get('/api/settings')
        watchlist = client.get('/api/watchlist')
        portfolio = client.get('/api/portfolio')

    assert settings.status_code == 200
    assert watchlist.status_code == 200
    assert portfolio.status_code == 200
