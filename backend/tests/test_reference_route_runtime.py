from fastapi.testclient import TestClient

from backend.main import app


def test_reference_routes_still_work_via_main_app():
    with TestClient(app) as client:
        timeframes = client.get('/api/timeframes')
        stocks = client.get('/api/stocks')

    assert timeframes.status_code == 200
    payload = timeframes.json()
    assert 'timeframes' in payload
    assert any(row['value'] == '1d' for row in payload['timeframes'])

    assert stocks.status_code == 200
    payload = stocks.json()
    assert payload['count'] > 0
    assert isinstance(payload['tickers'], list)
    assert payload['tickers'][0]
