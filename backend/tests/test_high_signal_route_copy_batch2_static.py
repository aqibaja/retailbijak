from pathlib import Path

ROOT = Path('/home/rich27/retailbijak')
SCREENER = (ROOT / 'frontend/js/views/screener.js').read_text()
PORTFOLIO = (ROOT / 'frontend/js/views/portfolio.js').read_text()
SETTINGS = (ROOT / 'frontend/js/views/settings.js').read_text()


def test_screener_high_signal_copy_is_indonesian():
    expected = [
        'Pemindai Akumulasi Institusi',
        'Sinyal Live',
        'Urutkan berdasarkan CCI',
        'Cari kode saham...',
        'BELUM SCAN',
        'Sedang menganalisis...',
        'Sedang memindai',
        'TERDETEKSI',
        'GALAT PEMINDAIAN',
        'Pemindaian selesai.',
    ]
    banned = [
        'BUY',
        'IDX Equity',
        'Price',
        'SCANNING...',
        'sinyal BUY',
    ]
    for marker in expected:
        assert marker in SCREENER
    for marker in banned:
        assert marker not in SCREENER


def test_portfolio_high_signal_copy_is_indonesian():
    expected = [
        'Pusat Portofolio',
        'Aset & Daftar Pantau',
        'Tambah ke Daftar Pantau',
        'Belum ada saham di daftar pantau.',
        'Posisi Aktif',
        'Harga Beli Rata-Rata',
        'Belum ada posisi portofolio.',
        'ditambahkan ke portofolio',
    ]
    banned = [
        '>Tambah<',
        'ITEM',
        'POSISI',
        'Harga Rata-Rata',
    ]
    for marker in expected:
        assert marker in PORTFOLIO
    for marker in banned:
        assert marker not in PORTFOLIO


def test_settings_high_signal_copy_is_indonesian():
    expected = [
        'PUSAT PENGATURAN',
        'Kontrol Ruang Kerja',
        'Mesin Antarmuka',
        'Pembaruan Otomatis Pemindai',
        'Catatan Terminal',
        'palet perintah',
        'aliran data lanjutan',
        'Sedang menyimpan...',
    ]
    banned = [
        'CMD+K / CTRL+K',
        'premium',
    ]
    for marker in expected:
        assert marker in SETTINGS
    for marker in banned:
        assert marker not in SETTINGS
