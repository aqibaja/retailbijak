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


def test_help_view_uses_consistent_indonesian_operational_copy():
    content = FRONTEND_HELP_VIEW.read_text()
    assert 'pemindai' in content.lower()
    assert 'daftar pantau' in content.lower()
    assert 'pengaturan ruang kerja' in content.lower()
    assert 'pemindaian swingaq' in content.lower()
    assert 'analisis hasil' in content.lower()
    assert 'periksa cci, magic line, dan lonjakan volume' in content.lower()
    assert 'Gunakan jalur bantuan internal' in content
    assert 'scanner' not in content.lower()
    assert 'watchlist' not in content.lower()
    assert 'workspace' not in content.lower()
    assert 'troubleshooting' not in content.lower()
    assert 'support internal' not in content.lower()
