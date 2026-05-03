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


def test_screener_uses_indonesian_operator_copy_and_status_labels():
    content = FRONTEND_SCREENER_VIEW.read_text()
    assert 'Pemindai Akumulasi Institusi' in content
    assert 'PUSAT KONTROL' in content
    assert 'Jalankan Pemindaian SwingAQ' in content
    assert 'Sinyal Live' in content
    assert 'Urutkan berdasarkan CCI' in content
    assert 'Cari kode saham...' in content
    assert 'Memindai ' in content
    assert 'TERDETEKSI' in content
    assert 'Pemindaian selesai.' in content
    assert 'Institutional BUY Scanner' not in content
    assert 'CONFIGURATION' not in content
    assert 'Run Institutional Scan' not in content
    assert 'Live Signals' not in content
    assert 'Sort by CCI' not in content
    assert 'Search...' not in content
    assert 'Scanning ' not in content
    assert 'DETECTED' not in content
    assert 'Scan complete.' not in content
