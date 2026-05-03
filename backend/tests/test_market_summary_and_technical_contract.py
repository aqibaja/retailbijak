from fastapi.testclient import TestClient

from backend.database import UserSetting
from main import app


def test_market_summary_uses_stored_ihsg_not_average_stock_price(isolated_db_session):
    SessionLocal = isolated_db_session
    db = SessionLocal()
    try:
        db.add(UserSetting(key="idx_market_summary", value='{"code":"COMPOSITE","close":7100.12,"previous":7050.12,"high":7120.0,"low":7000.0,"change":50.0,"percent":0.71,"date":"2024-02-20"}'))
        db.commit()
    finally:
        db.close()

    with TestClient(app) as client:
        response = client.get('/api/market-summary')

    assert response.status_code == 200
    data = response.json()
    assert data['value'] == 7100.12
    assert data['open'] == 7050.12
    assert data['high'] == 7120.0
    assert data['low'] == 7000.0
    assert data['data_date'] == '2024-02-20'
    assert data['source'] == 'idx_index_summary'


def test_technical_endpoint_returns_rich_indicator_summary_for_ui():
    with TestClient(app) as client:
        response = client.get('/api/stocks/GOTO/technical')

    assert response.status_code == 200
    payload = response.json()
    technical = payload.get('technical', {})
    indicators = technical.get('indicators', {})
    for key in ['rsi', 'macd', 'trend', 'bollinger_bands', 'stochastic', 'atr', 'volume', 'support_resistance']:
        assert key in indicators
    assert 'summary' in technical
    assert 'rating' in technical


def test_technical_endpoint_uses_natural_language_summary_and_indicator_labels():
    with TestClient(app) as client:
        response = client.get('/api/stocks/BBCA/technical')

    assert response.status_code == 200
    technical = response.json()['technical']
    summary = technical['summary']
    joined_status = ' '.join([
        str(technical['indicators']['rsi'].get('status') or ''),
        str(technical['indicators']['macd'].get('status') or ''),
        str(technical['indicators']['trend'].get('status') or ''),
        str(technical['indicators']['stochastic'].get('status') or ''),
        str(technical['indicators']['atr'].get('status') or ''),
        str(technical['indicators']['volume'].get('status') or ''),
    ])

    banned = [
        'Overbought', 'Oversold', 'Above SMA20', 'Below SMA20',
        'Bullish', 'Bearish', 'Insufficient', 'Neutral', 'Volatile', 'Spike', 'Normal',
    ]
    for marker in banned:
        assert marker not in summary
        assert marker not in joined_status

    assert any(marker in summary for marker in ['harga berada', 'tren', 'MACD', 'RSI'])
