from fastapi.testclient import TestClient

try:
    from main import app
except ModuleNotFoundError:
    from backend.main import app

client = TestClient(app)


def test_news_endpoint_never_empty_for_ui():
    res = client.get('/api/news?limit=5')
    assert res.status_code == 200
    data = res.json()
    assert data['count'] > 0
    assert data['data'][0]['title']
    assert data['data'][0]['source']


def test_stock_search_returns_relevant_ticker_suggestions():
    res = client.get('/api/stocks/search?q=goto&limit=5')
    assert res.status_code == 200
    data = res.json()
    tickers = [row['ticker'] for row in data['data']]
    assert 'GOTO' in tickers
    assert data['data'][0]['name']


def test_top_movers_uses_non_empty_real_ticker_universe():
    res = client.get('/api/top-movers?limit=5')
    assert res.status_code == 200
    data = res.json()
    assert data['count'] > 0
    assert all(row['ticker'] for row in data['data'])
