from pathlib import Path

ROOT = Path('/home/rich27/retailbijak')
DASHBOARD = (ROOT / 'frontend/js/views/dashboard.js').read_text()
NEWS = (ROOT / 'frontend/js/views/news.js').read_text()
STOCK_DETAIL = (ROOT / 'frontend/js/views/stock_detail.js').read_text()


def test_dashboard_high_signal_copy_is_indonesian():
    expected = [
        'Dashboard Intelijen Pasar',
        'Jalankan Pemindai',
        'Ikhtisar Pasar',
        'Sinkronisasi terakhir:',
        'Penggerak Teratas',
        'Lihat Semua',
        'Saran Cepat',
        'Berita Terbaru',
    ]
    banned = [
        'Run Scanner',
        'Market Overview',
        'Last sync:',
        'Top Movers',
        'View All',
        'Suggestions',
        'Latest News',
    ]
    for marker in expected:
        assert marker in DASHBOARD
    for marker in banned:
        assert marker not in DASHBOARD


def test_news_high_signal_copy_is_indonesian():
    expected = [
        'Berita Terbaru',
        'Memuat feed intel pasar...',
        'ITEM INTEL',
        'Gagal memuat berita: ',
    ]
    banned = [
        'Memuat feed intelligence...',
        'INTEL ITEMS',
        'Failed to load news: ',
    ]
    for marker in expected:
        assert marker in NEWS
    for marker in banned:
        assert marker not in NEWS


def test_stock_detail_high_signal_copy_is_indonesian():
    expected = [
        'Grafik Harga',
        'Ringkasan Sesi',
        'Ringkasan Teknikal',
        'Statistik Kunci',
        'Catatan Aksi',
        'Tambah ke Daftar Pantau',
        'Atur Peringatan',
        'Jalankan Pemindai',
    ]
    banned = [
        'Price Chart',
        'Session Snapshot',
        'Technical Summary',
        'Key Statistics',
        'Action Notes',
        'Add Watchlist',
        'Set Alert',
        'Run Scanner',
    ]
    for marker in expected:
        assert marker in STOCK_DETAIL
    for marker in banned:
        assert marker not in STOCK_DETAIL
