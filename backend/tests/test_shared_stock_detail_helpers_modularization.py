from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DETAIL = ROOT / 'backend/routes/stock_detail.py'
MODULE = ROOT / 'backend/routes/shared_stock_detail_helpers.py'


def test_stock_detail_analysis_helper_is_removed_from_route_module():
    src = DETAIL.read_text(encoding='utf-8')
    assert 'def _compute_analysis_metrics_from_ohlcv(' not in src


def test_stock_detail_analysis_helper_exists_in_shared_module():
    src = MODULE.read_text(encoding='utf-8')
    assert 'def _compute_analysis_metrics_from_ohlcv(' in src
