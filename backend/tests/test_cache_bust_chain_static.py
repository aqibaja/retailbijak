from pathlib import Path

INDEX = Path('/home/rich27/retailbijak/frontend/index.html')
MAIN = Path('/home/rich27/retailbijak/frontend/js/main.js')
ROUTER = Path('/home/rich27/retailbijak/frontend/js/router.js')


def test_cache_bust_chain_uses_current_20260503w_token():
    index = INDEX.read_text()
    main = MAIN.read_text()
    router = ROUTER.read_text()
    assert 'js/main.js?v=20260503w' in index
    assert "./router.js?v=20260503w" in main
    assert "./views/portfolio.js?v=20260503u" in router
    assert "./views/news.js?v=20260503u" in router
    assert "./views/help.js?v=20260503u" in router
    assert "./views/settings.js?v=20260503w" in router
