from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MAIN = ROOT / 'backend/main.py'
STOCKS = ROOT / 'backend/routes/stocks.py'


def test_stock_search_route_is_not_defined_in_main_anymore():
    src = MAIN.read_text(encoding='utf-8')
    assert '@app.get("/api/stocks/search")' not in src
    assert 'def search_stocks(' not in src


def test_stock_search_route_exists_in_stock_module():
    src = STOCKS.read_text(encoding='utf-8')
    assert "@router.get('/api/stocks/search')" in src or '@router.get("/api/stocks/search")' in src
    assert 'def search_stocks(' in src
