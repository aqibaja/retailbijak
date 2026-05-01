from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ROUTER = (ROOT / "frontend" / "js" / "router.js").read_text()
MAIN = (ROOT / "frontend" / "js" / "main.js").read_text()
INDEX = (ROOT / "frontend" / "index.html").read_text()
MARKET = (ROOT / "frontend" / "js" / "views" / "market.js").read_text()
DASHBOARD = (ROOT / "frontend" / "js" / "views" / "dashboard.js").read_text()
STOCK = (ROOT / "frontend" / "js" / "views" / "stock_detail.js").read_text()
SCREENER = (ROOT / "frontend" / "js" / "views" / "screener.js").read_text()
PORTFOLIO = (ROOT / "frontend" / "js" / "views" / "portfolio.js").read_text()
SETTINGS = (ROOT / "frontend" / "js" / "views" / "settings.js").read_text()
NEWS = (ROOT / "frontend" / "js" / "views" / "news.js").read_text()
HELP = (ROOT / "frontend" / "js" / "views" / "help.js").read_text()


def test_router_uses_latest_view_cache_bust_chain():
    expected = [
        "./views/dashboard.js?v=20260502c",
        "./views/stock_detail.js?v=20260502c",
        "./views/screener.js?v=20260502c",
        "./views/portfolio.js?v=20260502c",
        "./views/market.js?v=20260502c",
        "./views/news.js?v=20260502c",
        "./views/settings.js?v=20260502c",
        "./views/help.js?v=20260502c",
    ]
    for item in expected:
        assert item in ROUTER


def test_main_and_index_boot_latest_shell_versions():
    assert "./router.js?v=20260502c" in MAIN
    assert "./api.js?v=20260502a" in MAIN
    assert 'js/main.js?v=20260502c' in INDEX


def test_views_use_latest_shared_api_and_main_modules():
    assert "../api.js?v=20260502a" in DASHBOARD
    assert "../main.js?v=20260502c" in DASHBOARD
    assert "../api.js?v=20260502a" in MARKET
    assert "../main.js?v=20260502c" in MARKET
    assert "../api.js?v=20260502a" in STOCK
    assert "../main.js?v=20260502c" in STOCK
    assert "../api.js?v=20260502a" in SCREENER
    assert "../main.js?v=20260502c" in SCREENER
    assert "../api.js?v=20260502a" in PORTFOLIO
    assert "../main.js?v=20260502c" in PORTFOLIO
    assert "../api.js?v=20260502a" in SETTINGS
    assert "../main.js?v=20260502c" in SETTINGS
    assert "../api.js?v=20260502a" in NEWS
    assert "../main.js?v=20260502c" in HELP
