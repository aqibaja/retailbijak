from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MAIN = ROOT / 'backend/main.py'
DETAIL = ROOT / 'backend/routes/stock_detail.py'


def test_stock_detail_routes_are_not_defined_in_main_anymore():
    src = MAIN.read_text(encoding='utf-8')
    assert '@app.get("/api/stocks/{ticker}")' not in src
    assert '@app.get("/api/stocks/{ticker}/analysis")' not in src
    assert '@app.get("/api/stocks/{ticker}/fundamental")' not in src
    assert '@app.get("/api/stocks/{ticker}/technical")' not in src
    assert '@app.get("/api/stocks/{ticker}/chart-data")' not in src


def test_stock_detail_routes_exist_in_module():
    src = DETAIL.read_text(encoding='utf-8')
    for route in [
        '/api/stocks/{ticker}',
        '/api/stocks/{ticker}/analysis',
        '/api/stocks/{ticker}/fundamental',
        '/api/stocks/{ticker}/technical',
        '/api/stocks/{ticker}/chart-data',
    ]:
        assert route in src
    assert "if not ticker.endswith('.JK'):" not in src
    assert "ticker = f'{ticker}.JK'" not in src
