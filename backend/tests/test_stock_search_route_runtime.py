from fastapi.testclient import TestClient

from backend.main import app


def test_stock_search_route_still_works_via_main_app():
    with TestClient(app) as client:
        res = client.get('/api/stocks/search?q=goto&limit=5')

    assert res.status_code == 200
    data = res.json()
    assert data['count'] > 0
    assert any(row['ticker'] == 'GOTO' for row in data['data'])
    assert data['data'][0]['name']
