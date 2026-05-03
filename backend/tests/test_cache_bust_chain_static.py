from pathlib import Path
import re

INDEX = Path('/home/rich27/retailbijak/frontend/index.html')
MAIN = Path('/home/rich27/retailbijak/frontend/js/main.js')
ROUTER = Path('/home/rich27/retailbijak/frontend/js/router.js')
JS_DIR = Path('/home/rich27/retailbijak/frontend/js')
VIEWS_DIR = JS_DIR / 'views'


def test_cache_bust_chain_follows_current_tokens():
    index = INDEX.read_text()
    main = MAIN.read_text()
    router = ROUTER.read_text()
    main_token = re.search(r'js/main\.js\?v=([A-Za-z0-9_-]+)', index).group(1)
    router_token = re.search(r"\.\/router\.js\?v=([A-Za-z0-9_-]+)", main).group(1)

    assert main_token == router_token
    assert f'js/main.js?v={main_token}' in index
    assert f"./router.js?v={router_token}" in main
    assert f"../main.js?v={main_token}" in Path('/home/rich27/retailbijak/frontend/js/views/dashboard.js').read_text()
    assert f"../main.js?v={main_token}" in Path('/home/rich27/retailbijak/frontend/js/views/market.js').read_text()

    for view_name in [
        'dashboard.js',
        'stock_detail.js',
        'screener.js',
        'portfolio.js',
        'market.js',
        'news.js',
        'settings.js',
        'help.js',
    ]:
        assert f"./views/{view_name}?v=" in router


def test_view_files_do_not_contain_line_number_prefix_corruption():
    offenders = []
    for path in VIEWS_DIR.glob('*.js'):
        text = path.read_text()
        if re.search(r'^\s*\d+\|', text, flags=re.MULTILINE):
            offenders.append(path.name)
    assert offenders == []


def test_frontend_core_js_files_do_not_contain_line_number_prefix_corruption():
    offenders = []
    for path in sorted(JS_DIR.glob('*.js')):
        text = path.read_text()
        if re.search(r'^\s*\d+\|', text, flags=re.MULTILINE):
            offenders.append(path.name)
    assert offenders == []
