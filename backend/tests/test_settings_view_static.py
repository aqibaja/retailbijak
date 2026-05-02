from pathlib import Path


FRONTEND_SETTINGS_VIEW = Path('/home/rich27/retailbijak/frontend/js/views/settings.js')
FRONTEND_STYLE = Path('/home/rich27/retailbijak/frontend/style.css')


def test_settings_view_uses_editorial_workspace_shell_and_status_rail():
    content = FRONTEND_SETTINGS_VIEW.read_text()
    assert 'settings-page-pro' in content
    assert 'settings-hero' in content
    assert 'settings-meta-pill' in content
    assert 'settings-toggle-grid' in content
    assert 'settings-note-rail' in content
    assert 'settings-status' in content


def test_settings_view_styles_define_cards_and_mobile_stack():
    content = FRONTEND_STYLE.read_text()
    assert '.settings-page-pro {' in content
    assert '.settings-hero {' in content
    assert '.settings-toggle-grid {' in content
    assert '.settings-toggle-card {' in content
    assert '.settings-note-rail {' in content
    assert '@media (max-width: 768px) {' in content
