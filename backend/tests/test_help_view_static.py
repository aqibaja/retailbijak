from pathlib import Path


FRONTEND_HELP_VIEW = Path('/home/rich27/retailbijak/frontend/js/views/help.js')
FRONTEND_STYLE = Path('/home/rich27/retailbijak/frontend/style.css')


def test_help_view_uses_editorial_help_shell_and_support_panel():
    content = FRONTEND_HELP_VIEW.read_text()
    assert 'help-page-pro' in content
    assert 'help-hero' in content
    assert 'help-meta-pill' in content
    assert 'help-guide-grid' in content
    assert 'help-step-card' in content
    assert 'help-support-panel' in content


def test_help_view_styles_define_mobile_stack_and_cards():
    content = FRONTEND_STYLE.read_text()
    assert '.help-page-pro {' in content
    assert '.help-hero {' in content
    assert '.help-guide-grid {' in content
    assert '.help-step-card {' in content
    assert '.help-support-panel {' in content
    assert '@media (max-width: 768px) {' in content
