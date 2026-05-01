from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ROUTER = ROOT / "frontend" / "js" / "router.js"
MAIN = ROOT / "frontend" / "js" / "main.js"


def test_router_uses_latest_dashboard_module_cache_bust():
    src = ROUTER.read_text()
    assert "./views/dashboard.js?v=20260502a" in src


def test_main_uses_latest_api_module_cache_bust_for_shell_widgets():
    src = MAIN.read_text()
    assert "./api.js?v=20260502a" in src
    assert "./router.js?v=20260502b" in src


def test_index_boots_latest_main_module_cache_bust():
    src = (ROOT / "frontend" / "index.html").read_text()
    assert 'js/main.js?v=20260502b' in src
