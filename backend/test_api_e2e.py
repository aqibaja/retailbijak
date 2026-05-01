from datetime import datetime

from fastapi.testclient import TestClient
from sqlalchemy import text

try:
    from main import app, _sqlite_datetime_literal
except ModuleNotFoundError:
    from backend.main import app, _sqlite_datetime_literal


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


def test_market_breadth_uses_windowed_db_shape():
    with TestClient(app) as client:
        res = client.get('/api/market-breadth')
    assert res.status_code == 200
    data = res.json()
    assert data['status'] == 'ok'
    assert data['source'] == 'db_breadth'
    assert 'latest_date' in data['data']
    assert 'advancers' in data['data']
    assert 'decliners' in data['data']


def test_top_movers_db_shape_uses_hardened_latest_pairs():
    with TestClient(app) as client:
        res = client.get('/api/top-movers?limit=5')
    assert res.status_code == 200
    data = res.json()
    assert data['source'] == 'db'
    assert data['count'] > 0
    first = data['data'][0]
    assert first['ticker']
    assert 'change_pct' in first
    assert 'volume' in first


def test_market_stats_include_latest_date_and_active_symbols():
    with TestClient(app) as client:
        res = client.get('/api/market-stats')
    assert res.status_code == 200
    data = res.json()
    assert data['status'] == 'ok'
    assert data['source'] == 'db_stats'
    assert 'latest_date' in data['data']
    assert data['data']['active_symbols'] > 0


def test_foreign_trading_uses_full_latest_snapshot():
    with TestClient(app) as client:
        res = client.get('/api/foreign-trading?limit=5')
    assert res.status_code == 200
    data = res.json()
    assert data['source'] == 'derived'
    assert data['count'] == 5
    first = data['data'][0]
    assert first['ticker']
    assert 'net_value' in first
    assert 'date' in first


def test_sqlite_datetime_literal_keeps_fractional_format():
    formatted = _sqlite_datetime_literal(datetime(2026, 4, 30, 0, 0, 0))
    assert formatted == '2026-04-30 00:00:00.000000'


def test_broker_activity_falls_back_to_derived_snapshot_when_table_empty():
    with TestClient(app) as client:
        res = client.get('/api/broker-activity?limit=5')
    assert res.status_code == 200
    data = res.json()
    assert data['source'] == 'derived'
    assert data['count'] == 5
    first = data['data'][0]
    assert first['ticker']
    assert first['broker_code']
    assert first['date']
    assert 'net_value' in first


def test_broker_activity_prefers_db_snapshot_when_available():
    marker = 'ZZZ_TEST_BROKER'
    with TestClient(app) as client:
        from backend.database import SessionLocal

        db = SessionLocal()
        try:
            db.execute(text("DELETE FROM broker_summary WHERE broker_code = :code"), {'code': marker})
            db.execute(
                text(
                    """
                    INSERT INTO broker_summary (
                        ticker, date, broker_code, buy_volume, sell_volume, net_volume,
                        buy_value, sell_value, net_value
                    ) VALUES (
                        :ticker, :date, :broker_code, :buy_volume, :sell_volume, :net_volume,
                        :buy_value, :sell_value, :net_value
                    )
                    """
                ),
                {
                    'ticker': 'BBCA',
                    'date': '2099-01-01 00:00:00.000000',
                    'broker_code': marker,
                    'buy_volume': 100,
                    'sell_volume': 40,
                    'net_volume': 60,
                    'buy_value': 1_000_000.0,
                    'sell_value': 400_000.0,
                    'net_value': 600_000.0,
                },
            )
            db.commit()
        finally:
            db.close()

        try:
            res = client.get('/api/broker-activity?limit=5')
            assert res.status_code == 200
            data = res.json()
            assert data['source'] == 'db'
            assert data['count'] >= 1
            assert any(row['broker_code'] == marker for row in data['data'])
        finally:
            cleanup = SessionLocal()
            try:
                cleanup.execute(text("DELETE FROM broker_summary WHERE broker_code = :code"), {'code': marker})
                cleanup.commit()
            finally:
                cleanup.close()


def test_corporate_actions_shape():
    """Corporate actions endpoint returns consistent response factory shape."""
    with TestClient(app) as client:
        res = client.get('/api/corporate-actions?limit=5')
    assert res.status_code == 200
    data = res.json()
    assert data['status'] in ('ok', 'empty')
    assert 'source' in data
    assert 'data' in data
    assert isinstance(data['data'], list)


def test_analysis_shape():
    """Analysis endpoint returns scanner_engine output with real metrics."""
    with TestClient(app) as client:
        res = client.get('/api/stocks/BBCA/analysis')
    assert res.status_code == 200
    data = res.json()
    assert data['status'] == 'ok'
    assert data['source'] == 'scanner_engine'
    analysis = data['data']
    assert 'ticker' in analysis
    assert 'swing' in analysis
    assert 'valuation' in analysis
    assert 'signal' in analysis
    # Should have real computed metrics, not all zeros
    assert isinstance(analysis['swing']['score'], (int, float))
    assert analysis['swing']['score'] >= 0


def test_response_factory_shapes():
    """Response factory produces correct shapes for all variants."""
    try:
        from services.idx_response_factory import ok, empty, error, paginated
    except ModuleNotFoundError:
        from backend.services.idx_response_factory import ok, empty, error, paginated

    r = ok([1, 2], source='test')
    assert r['status'] == 'ok' and r['data'] == [1, 2]

    r = empty('test')
    assert r['status'] == 'empty' and r['data'] == []

    r = error('fail', 'test')
    assert r['status'] == 'error' and r['error'] == 'fail'

    r = paginated([1], source='test', total=10)
    assert r['count'] == 1 and r['total'] == 10
