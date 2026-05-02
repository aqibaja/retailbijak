from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MARKET = ROOT / 'backend/routes/market.py'
MODULE = ROOT / 'backend/routes/shared_sqlite_helpers.py'


def test_sqlite_helper_is_removed_from_market_module():
    src = MARKET.read_text(encoding='utf-8')
    assert 'def _sqlite_datetime_literal(' not in src


def test_sqlite_helper_is_available_in_shared_module():
    src = MODULE.read_text(encoding='utf-8')
    assert 'def _sqlite_datetime_literal(' in src
