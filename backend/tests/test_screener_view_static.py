from pathlib import Path


FRONTEND_SCREENER_VIEW = Path('/home/rich27/retailbijak/frontend/js/views/screener.js')
FRONTEND_STYLE = Path('/home/rich27/retailbijak/frontend/style.css')


def test_screener_uses_compact_toolbar_and_status_rail_hooks():
    content = FRONTEND_SCREENER_VIEW.read_text()
    assert 'screener-hero' in content
    assert 'screener-toolbar' in content
    assert 'scanner-control-stack' in content
    assert 'scanner-empty-rich' in content
    assert 'scanner-empty-copy' in content
    assert 'scanner-empty-hint' in content
    assert 'scanner-toolbar-hint' in content
    assert 'screener-progress' in content


def test_screener_rows_and_progress_have_editorial_and_mobile_hooks():
    content = FRONTEND_SCREENER_VIEW.read_text()
    style = FRONTEND_STYLE.read_text()
    assert 'scanner-row' in content
    assert 'scanner-row-kicker' in content
    assert 'scanner-row-meta' in content
    assert 'scanner-row-note' in content
    assert 'screener-progress' in content
    assert '.screener-toolbar {' in style
    assert '.scanner-control-stack {' in style
    assert '.scanner-toolbar-hint {' in style
    assert '.scanner-empty-rich {' in style
    assert '.scanner-row-kicker {' in style
    assert '.scanner-row-meta {' in style
    assert '.scanner-row-note {' in style
    assert '.scanner-progress {' in style
    assert '@media (max-width: 767px) {' in style
