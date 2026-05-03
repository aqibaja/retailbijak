from pathlib import Path
import re

INDEX = Path('/home/rich27/retailbijak/frontend/index.html')
MAIN = Path('/home/rich27/retailbijak/frontend/js/main.js')
ROUTER = Path('/home/rich27/retailbijak/frontend/js/router.js')
VIEWS_DIR = Path('/home/rich27/retailbijak/frontend/js/views')


def _extract(pattern: str, text: str) -> str:
    match = re.search(pattern, text)
    assert match, pattern
    return match.group(1)


def test_views_follow_current_main_and_api_cache_bust_tokens():
    index = INDEX.read_text()
    main = MAIN.read_text()
    router = ROUTER.read_text()
    main_token = _extract(r'js/main\.js\?v=([A-Za-z0-9_-]+)', index)
    router_token = _extract(r"\.\/router\.js\?v=([A-Za-z0-9_-]+)", main)
    api_token = _extract(r"\.\/api\.js\?v=([A-Za-z0-9_-]+)", main)

    assert main_token == router_token

    for path in sorted(VIEWS_DIR.glob('*.js')):
        text = path.read_text()
        if '../main.js?v=' in text:
            assert f"../main.js?v={main_token}" in text, path.name
        if '../api.js?v=' in text:
            assert f"../api.js?v={api_token}" in text, path.name

    assert '20260502a' not in router
    assert '20260502a' not in ''.join(path.read_text() for path in VIEWS_DIR.glob('*.js'))
