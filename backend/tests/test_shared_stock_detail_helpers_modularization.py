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
    assert 'def _serialize_signal_rows(' in src


def test_stock_detail_route_imports_shared_signal_serializer():
    src = DETAIL.read_text(encoding='utf-8')
    assert 'from routes.shared_stock_detail_helpers import _compute_analysis_metrics_from_ohlcv, _serialize_signal_rows' in src or 'from backend.routes.shared_stock_detail_helpers import _compute_analysis_metrics_from_ohlcv, _serialize_signal_rows' in src
    assert "'signal_type': signal.signal_type" not in src
    assert "'entry_price': signal.entry_price" not in src
