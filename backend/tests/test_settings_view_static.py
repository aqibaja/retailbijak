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


def test_settings_view_uses_indonesian_copy_for_labels_actions_and_notes():
    content = FRONTEND_SETTINGS_VIEW.read_text()
    assert 'PUSAT PENGATURAN' in content
    assert 'Kontrol Ruang Kerja' in content
    assert 'Tersambung' in content
    assert 'Sinkron ke layanan lokal' in content
    assert 'Mesin Antarmuka' in content
    assert 'Kontrol yang tersimpan di basis data' in content
    assert 'Tabel Lebih Rapat' in content
    assert 'Pembaruan Otomatis Pemindai' in content
    assert 'Simpan Konfigurasi' in content
    assert 'Catatan Terminal' in content
    assert 'Sedang menyimpan...' in content
    assert 'Konfigurasi gagal disinkronkan' in content
    assert 'Konfigurasi berhasil disinkronkan' in content
    assert 'palet perintah' in content
    assert 'kode saham' in content
    assert 'aliran data premium' in content
    assert 'Workspace Controls' not in content
    assert 'Save Configuration' not in content
    assert 'Connected' not in content
    assert 'Workspace' not in content
    assert 'command palette' not in content
    assert 'ticker' not in content
    assert 'backend' not in content


def test_settings_view_styles_define_cards_and_mobile_stack():
    content = FRONTEND_STYLE.read_text()
    assert '.settings-page-pro {' in content
    assert '.settings-hero {' in content
    assert '.settings-toggle-grid {' in content
    assert '.settings-toggle-card {' in content
    assert '.settings-note-rail {' in content
    assert '@media (max-width: 768px) {' in content
