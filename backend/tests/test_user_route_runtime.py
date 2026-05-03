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


def test_settings_route_exposes_openrouter_config_without_leaking_api_key():
    with TestClient(app) as client:
        settings = client.get('/api/settings')

    assert settings.status_code == 200
    data = settings.json()
    assert data['openrouter_enabled'] is False
    assert data['openrouter_has_api_key'] is False
    assert data['openrouter_api_key_masked'] == ''
    assert isinstance(data['openrouter_site_url'], str)
    assert data['openrouter_app_name'] == 'RetailBijak'
    assert data['openrouter_stock_analysis_model'] == 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free'
    assert data['openrouter_ai_picks_model'] == 'openai/gpt-oss-120b:free'
