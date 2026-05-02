from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MAIN = ROOT / 'backend/main.py'
SUMMARY = ROOT / 'backend/routes/market_summary.py'

ROUTES = [
    '/api/ihsg-chart',
    '/api/market-summary',
    '/api/sector-summary',
]

HELPERS = [
    'def _parse_sector_snapshot_payload(',
]


def test_market_summary_routes_and_helpers_are_not_defined_in_main_anymore():
    src = MAIN.read_text(encoding='utf-8')
    for route in ROUTES:
        assert route not in src
    for helper in HELPERS:
        assert helper not in src


def test_market_summary_routes_and_helpers_exist_in_module():
    src = SUMMARY.read_text(encoding='utf-8')
    for route in ROUTES:
        assert route in src
    for helper in HELPERS:
        assert helper in src
