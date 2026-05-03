from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PARITY_SCRIPT = (ROOT / 'scripts' / 'check_frontend_runtime_parity.py').read_text()
SMOKE_SCRIPT = (ROOT / 'scripts' / 'post_deploy_smoke_check.py').read_text()
PUBLIC_CHAIN_SCRIPT = (ROOT / 'scripts' / 'check_public_resource_chain.py').read_text()


def test_parity_script_covers_all_routed_view_files():
    expected_views = [
        'js/views/dashboard.js',
        'js/views/stock_detail.js',
        'js/views/screener.js',
        'js/views/portfolio.js',
        'js/views/market.js',
        'js/views/news.js',
        'js/views/settings.js',
        'js/views/help.js',
    ]
    for rel in expected_views:
        assert rel in PARITY_SCRIPT


def test_smoke_script_checks_spa_route_markers():
    expected_hashes = ['#dashboard', '#market', '#screener', '#portfolio']
    expected_markers = ['app-root', 'bottom-nav', 'topbar']
    for marker in expected_hashes + expected_markers:
        assert marker in SMOKE_SCRIPT


def test_public_chain_script_checks_core_route_modules_and_copy_markers():
    expected_markers = [
        'index.html',
        'js/main.js',
        'js/router.js',
        'js/api.js',
        'js/views/dashboard.js',
        'js/views/portfolio.js',
        'main.js?v=',
        'api.js?v=',
        'renderDashboard',
        'renderPortfolio',
        'Dashboard Intelijen Pasar',
        'Grafik Harga',
        'Memuat feed intel pasar...',
    ]
    for marker in expected_markers:
        assert marker in PUBLIC_CHAIN_SCRIPT
