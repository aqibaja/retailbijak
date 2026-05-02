from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
STOCKS = ROOT / 'backend/routes/stocks.py'
MODULE = ROOT / 'backend/routes/shared_stocks_helpers.py'


def test_stock_helper_functions_are_moved_out_of_stocks_module():
    src = STOCKS.read_text(encoding='utf-8')
    assert 'def _display_ticker(' not in src
    assert 'def _company_name(' not in src
    assert 'def _stock_row_from_static(' not in src


def test_stock_helper_functions_exist_in_shared_module():
    src = MODULE.read_text(encoding='utf-8')
    assert 'def _display_ticker(' in src
    assert 'def _company_name(' in src
    assert 'def _stock_row_from_static(' in src
    assert 'from routes.shared_stock_fallbacks import _ticker_base' in src or 'from backend.routes.shared_stock_fallbacks import _ticker_base' in src
    assert "return t.upper().replace('.JK', '').strip()" not in src
    assert 'from stocks import get_ticker_display' not in src
    assert 'from backend.stocks import get_ticker_display' not in src
    assert 'get_ticker_display(' not in src
