from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MODULE = ROOT / 'backend/routes/shared_market_helpers.py'


def test_shared_market_helpers_keep_market_data_helpers_in_shared_module():
    src = MODULE.read_text(encoding='utf-8')
    assert 'def _latest_ohlcv_snapshot(' in src
    assert 'def _latest_ohlcv_pairs(' in src
    assert 'def _top_mover_rows(' in src
    assert 'def _derived_broker_activity_rows(' in src


def test_shared_market_helpers_import_company_name_from_shared_stocks_helpers():
    src = MODULE.read_text(encoding='utf-8')
    assert 'from routes.shared_stocks_helpers import _company_name, _display_ticker' in src or 'from backend.routes.shared_stocks_helpers import _company_name, _display_ticker' in src
    assert 'from routes.stocks import _company_name' not in src
    assert 'from backend.routes.stocks import _company_name' not in src
    assert 'from stocks import get_ticker_display' not in src
    assert 'from backend.stocks import get_ticker_display' not in src
    assert 'get_ticker_display(' not in src
