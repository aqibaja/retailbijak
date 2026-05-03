from pathlib import Path
import re

INDEX = Path('/home/rich27/retailbijak/frontend/index.html')
MAIN = Path('/home/rich27/retailbijak/frontend/js/main.js')
ROUTER = Path('/home/rich27/retailbijak/frontend/js/router.js')
JS_DIR = Path('/home/rich27/retailbijak/frontend/js')
VIEWS_DIR = JS_DIR / 'views'


def test_cache_bust_chain_uses_current_20260503y_token():
    index = INDEX.read_text()
    main = MAIN.read_text()
    router = ROUTER.read_text()
    assert 'js/main.js?v=20260503y' in index
    assert "./router.js?v=20260503y" in main
    assert "./views/dashboard.js?v=20260503y" in router
    assert "./views/stock_detail.js?v=20260503x" in router
    assert "./views/screener.js?v=20260503x" in router
    assert "./views/portfolio.js?v=20260503x" in router
    assert "./views/market.js?v=20260503x" in router
    assert "./views/news.js?v=20260503u" in router
    assert "./views/help.js?v=20260503x" in router
    assert "./views/settings.js?v=20260503x" in router
    assert "../main.js?v=20260503y" in Path('/home/rich27/retailbijak/frontend/js/views/dashboard.js').read_text()
    assert "../main.js?v=20260503y" in Path('/home/rich27/retailbijak/frontend/js/views/market.js').read_text()


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
