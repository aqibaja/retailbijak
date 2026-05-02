from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MAIN = ROOT / 'backend/main.py'
MODULE = ROOT / 'backend/routes/news.py'

ROUTES = [
    '/api/news',
    '/api/corporate-actions',
    '/api/company-announcements',
]

HELPERS = [
    '_corporate_actions_cache',
    'def get_news(',
    'def get_corporate_actions(',
    'def get_company_announcements(',
]


def test_news_routes_and_helpers_are_not_defined_in_main_anymore():
    src = MAIN.read_text(encoding='utf-8')
    for route in ROUTES:
        assert route not in src
    for helper in HELPERS:
        assert helper not in src


def test_news_routes_and_helpers_exist_in_module():
    src = MODULE.read_text(encoding='utf-8')
    for route in ROUTES:
        assert route in src
    for helper in HELPERS:
        assert helper in src
