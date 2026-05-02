from fastapi.testclient import TestClient

try:
    from main import app
except ModuleNotFoundError:
    from backend.main import app


def test_scan_accepts_frontend_timeframe_and_streams_done_event():
    with TestClient(app) as client:
        with client.stream('GET', '/api/scan?timeframe=1d') as response:
            assert response.status_code == 200
            body = ''
            for chunk in response.iter_text():
                body += chunk
                if '"type": "done"' in body or '"type":"done"' in body:
                    break

    assert '"type": "start"' in body or '"type":"start"' in body
    assert '"type": "done"' in body or '"type":"done"' in body


def test_market_and_sector_contracts_are_ui_safe():
    with TestClient(app) as client:
        market = client.get('/api/market-summary')
        sectors = client.get('/api/sector-summary')

    assert market.status_code == 200
    market_json = market.json()
    assert 'symbol' in market_json
    assert 'value' in market_json

    assert sectors.status_code == 200
    sectors_json = sectors.json()
    assert 'data' in sectors_json
    assert isinstance(sectors_json['data'], list)
    assert all('change_pct' in row for row in sectors_json['data'])
    assert all(isinstance(row['change_pct'], (int, float)) for row in sectors_json['data'])


def test_stock_detail_endpoints_never_500_for_ui():
    with TestClient(app) as client:
        endpoints = [
            '/api/stocks/BBCA',
            '/api/stocks/BBCA/fundamental',
            '/api/stocks/BBCA/technical',
            '/api/stocks/BBCA/chart-data?limit=5',
            '/api/stocks/BBCA/analysis',
        ]
        responses = [client.get(url) for url in endpoints]

    assert all(response.status_code == 200 for response in responses)
    assert responses[-1].json().get('status') == 'ok'
