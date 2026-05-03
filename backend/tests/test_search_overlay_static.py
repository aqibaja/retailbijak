from pathlib import Path

INDEX_HTML = Path('/home/rich27/retailbijak/frontend/index.html')
MAIN_JS = Path('/home/rich27/retailbijak/frontend/js/main.js')


def test_search_overlay_shell_exposes_suggestions_mount():
    index = INDEX_HTML.read_text()

    assert 'id="search-overlay"' in index
    assert 'id="global-search-input"' in index
    assert 'id="search-suggestions"' in index


def test_search_overlay_renderer_guards_missing_suggestions_node():
    main = MAIN_JS.read_text()

    assert 'const suggestions = document.getElementById(\'search-suggestions\');' in main
    assert 'if (!suggestions) return;' in main
