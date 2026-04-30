from fastapi.testclient import TestClient

try:
    from main import app
except ModuleNotFoundError:
    from backend.main import app


def test_health():
    with TestClient(app) as client:
        res = client.get('/api/health')
    assert res.status_code == 200
    data = res.json()
    assert data['status'] == 'ok'


def test_settings_roundtrip():
    with TestClient(app) as client:
        payload = {'compact_table_rows': True, 'auto_refresh_screener': True}
        put_res = client.put('/api/settings', json=payload)
        assert put_res.status_code == 200
        get_res = client.get('/api/settings')
        assert get_res.status_code == 200
        data = get_res.json()
        assert data['compact_table_rows'] is True
        assert data['auto_refresh_screener'] is True


def test_watchlist_crud():
    with TestClient(app) as client:
        add_res = client.post('/api/watchlist', json={'ticker': 'BBCA', 'notes': 'test'})
        assert add_res.status_code == 200
        list_res = client.get('/api/watchlist')
        assert list_res.status_code == 200
        tickers = [item['ticker'] for item in list_res.json()['data']]
        assert 'BBCA' in tickers
        del_res = client.delete('/api/watchlist/BBCA')
        assert del_res.status_code == 200


def test_portfolio_crud():
    with TestClient(app) as client:
        upsert_res = client.post('/api/portfolio', json={'ticker': 'TLKM', 'lots': 3, 'avg_price': 3500})
        assert upsert_res.status_code == 200
        list_res = client.get('/api/portfolio')
        assert list_res.status_code == 200
        tickers = [item['ticker'] for item in list_res.json()['data']]
        assert 'TLKM' in tickers
        del_res = client.delete('/api/portfolio/TLKM')
        assert del_res.status_code == 200


def test_market_summary_db_only():
    with TestClient(app) as client:
        # Empty DB should still return deterministic payload without provider calls.
        res = client.get('/api/market-summary')
        assert res.status_code == 200
        data = res.json()
        assert data['source'] in ('db', 'idx_index_summary')
        assert data['status'] in {'ok', 'no_data'}
        assert 'symbol' in data
        assert 'updated_at' in data
