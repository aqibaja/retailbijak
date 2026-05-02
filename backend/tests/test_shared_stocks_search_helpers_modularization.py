from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
STOCKS = ROOT / 'backend/routes/stocks.py'
MODULE = ROOT / 'backend/routes/shared_stocks_helpers.py'


def test_stock_search_helpers_exist_in_shared_module():
    src = MODULE.read_text(encoding='utf-8')
    assert 'def _search_rank(' in src
    assert 'def _search_bucket(' in src
    assert 'from routes.shared_stock_fallbacks import _ticker_base' in src or 'from backend.routes.shared_stock_fallbacks import _ticker_base' in src


def test_stock_search_helpers_are_not_defined_in_stocks_module():
    src = STOCKS.read_text(encoding='utf-8')
    assert 'def _search_rank(' not in src
    assert 'def _search_bucket(' not in src


def test_stock_route_imports_search_helpers_from_shared_module():
    src = STOCKS.read_text(encoding='utf-8')
    assert 'from routes.shared_stocks_helpers import _display_ticker, _company_name, _stock_row_from_static, _search_rank, _search_bucket, SECTOR_HINTS' in src or 'from backend.routes.shared_stocks_helpers import _display_ticker, _company_name, _stock_row_from_static, _search_rank, _search_bucket, SECTOR_HINTS' in src
