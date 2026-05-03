from pathlib import Path

FRONTEND_HELP_VIEW = Path('/home/rich27/retailbijak/frontend/js/views/help.js')


def test_help_view_uses_indonesian_copy_and_actionable_support_links():
    content = FRONTEND_HELP_VIEW.read_text()
    assert 'Pusat Bantuan' in content
    assert 'Panduan Mulai Cepat' in content
    assert 'Hubungi Support' in content
    assert 'href="#settings"' in content
    assert 'href="#screener"' in content
    assert '<button class="btn btn-primary help-support-btn">Contact Support</button>' not in content
