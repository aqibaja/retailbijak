from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
RUNTIME_ROOT = Path('/opt/swingaq/frontend/js')
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
    assert "./theme.js?v=20260430n" in MAIN
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


def test_router_cases_match_view_imports():
    expected_patterns = {
        'dashboard': ["if (view === 'dashboard')"],
        'stock': ["view === 'stock' && segments[1]"],
        'market': ["else if (view === 'market')"],
        'screener': ["else if (view === 'screener')"],
        'portfolio': ["view === 'portfolio' || view === 'watchlist'"],
        'news': ["else if (view === 'news')"],
        'settings': ["else if (view === 'settings')"],
        'help': ["else if (view === 'help')"],
    }
    expected_renderers = {
        'dashboard': 'renderDashboard',
        'stock': 'renderStockDetail',
        'market': 'renderMarket',
        'screener': 'renderScreener',
        'portfolio': 'renderPortfolio',
        'news': 'renderNews',
        'settings': 'renderSettings',
        'help': 'renderHelp',
    }
    for route, patterns in expected_patterns.items():
        assert any(pattern in ROUTER for pattern in patterns)
        assert expected_renderers[route] in ROUTER


def test_no_orphan_boot_modules_in_repo_or_runtime():
    repo_boot = sorted((ROOT / 'frontend' / 'js').glob('boot-*.js'))
    runtime_boot = sorted(RUNTIME_ROOT.glob('boot-*.js')) if RUNTIME_ROOT.exists() else []
    assert repo_boot == []
    assert runtime_boot == []


def test_index_has_single_module_boot_entry():
    entries = re.findall(r'<script type="module" src="([^"]+)"', INDEX)
    assert entries == ['js/main.js?v=20260502c']


def test_router_imports_only_current_versioned_views_once_each():
    expected = {
        'dashboard': './views/dashboard.js?v=20260502c',
        'stock_detail': './views/stock_detail.js?v=20260502c',
        'screener': './views/screener.js?v=20260502c',
        'portfolio': './views/portfolio.js?v=20260502c',
        'market': './views/market.js?v=20260502c',
        'news': './views/news.js?v=20260502c',
        'settings': './views/settings.js?v=20260502c',
        'help': './views/help.js?v=20260502c',
    }
    for module_path in expected.values():
        assert ROUTER.count(module_path) == 1


