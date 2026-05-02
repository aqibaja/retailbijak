from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MAIN = ROOT / 'backend/main.py'
MODULE = ROOT / 'backend/routes/scanner_stream.py'

ROUTES = [
    '/api/scan',
]

HELPERS = [
    'async def scan_all_db_generator(',
    'async def scan(',
]


def test_scanner_stream_route_and_helpers_are_not_defined_in_main_anymore():
    src = MAIN.read_text(encoding='utf-8')
    for route in ROUTES:
        assert route not in src
    for helper in HELPERS:
        assert helper not in src


def test_scanner_stream_route_and_helpers_exist_in_module():
    src = MODULE.read_text(encoding='utf-8')
    for route in ROUTES:
        assert route in src
    for helper in HELPERS:
        assert helper in src
