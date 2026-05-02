from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SUMMARY = ROOT / 'backend/routes/market_summary.py'
MODULE = ROOT / 'backend/routes/shared_market_summary_helpers.py'


def test_market_summary_parser_is_available_in_shared_module():
    src = MODULE.read_text(encoding='utf-8')
    assert 'def _parse_sector_snapshot_payload(' in src
