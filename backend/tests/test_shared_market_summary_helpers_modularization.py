from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MAIN = ROOT / 'backend/main.py'
MODULE = ROOT / 'backend/routes/shared_market_summary_helpers.py'


def test_market_summary_helpers_are_not_defined_in_main_anymore():
    src = MAIN.read_text(encoding='utf-8')
    assert 'def _load_period_for_ihsg(' not in src
    assert 'def _safe_pct(' not in src


def test_market_summary_helpers_exist_in_shared_module():
    src = MODULE.read_text(encoding='utf-8')
    assert 'def _load_period_for_ihsg(' in src
    assert 'def _safe_pct(' in src
    assert 'def _parse_sector_snapshot_payload(' in src
