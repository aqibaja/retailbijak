from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MAIN = ROOT / 'backend/main.py'
MARKET = ROOT / 'backend/routes/market.py'

ROUTES = [
    '/api/market-breadth',
    '/api/market-stats',
    '/api/market-events',
    '/api/top-movers',
    '/api/foreign-trading',
    '/api/broker-activity',
]

HELPERS = [
    'def _latest_ohlcv_snapshot(',
    'def _latest_ohlcv_pairs(',
    'def _top_mover_rows(',
    'def _derived_broker_activity_rows(',
]


def test_market_routes_and_helpers_are_not_defined_in_main_anymore():
    src = MAIN.read_text(encoding='utf-8')
    for route in ROUTES:
        assert route not in src
    for helper in HELPERS:
        assert helper not in src


def test_market_routes_and_helpers_exist_in_module():
    src = MARKET.read_text(encoding='utf-8')
    for route in ROUTES:
        assert route in src
    for helper in HELPERS:
        assert helper in src
