from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MAIN = ROOT / 'backend/main.py'
MODULE = ROOT / 'backend/routes/shared_stock_fallbacks.py'
STOCK_DETAIL = ROOT / 'backend/routes/stock_detail.py'

HELPERS = [
    'def _ticker_base(',
    'def _ticker_with_suffix(',
    'def _fallback_row_for_ticker(',
]

USAGE_MARKERS = [
    '_ticker_base(',
    '_ticker_with_suffix(',
    '_fallback_row_for_ticker(',
]

DEAD_LEGACY = [
    'COMPANY_NAMES = {',
    'SECTOR_HINTS = {',
    'def _legacy_top_movers_snapshot(',
]


def test_shared_stock_fallback_helpers_are_not_defined_in_main_anymore():
    src = MAIN.read_text(encoding='utf-8')
    for helper in HELPERS + DEAD_LEGACY:
        assert helper not in src


def test_shared_stock_fallback_helpers_exist_in_module_and_stock_detail_imports_them():
    module_src = MODULE.read_text(encoding='utf-8')
    stock_detail_src = STOCK_DETAIL.read_text(encoding='utf-8')
    for helper in HELPERS:
        assert helper in module_src
    assert 'from routes.shared_stock_fallbacks import _ticker_base, _ticker_with_suffix, _fallback_row_for_ticker' in stock_detail_src or 'from backend.routes.shared_stock_fallbacks import _ticker_base, _ticker_with_suffix, _fallback_row_for_ticker' in stock_detail_src
    assert "ticker.replace('.JK', '')" not in stock_detail_src
