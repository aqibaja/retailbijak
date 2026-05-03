from pathlib import Path

ROOT = Path('/home/rich27/retailbijak')
STOCK_DETAIL = (ROOT / 'frontend/js/views/stock_detail.js').read_text()
DASHBOARD = (ROOT / 'frontend/js/views/dashboard.js').read_text()


def test_stock_detail_low_signal_copy_is_more_indonesian():
    expected = [
        'IDX EKUITAS',
        'Asisten AI',
        'Tanya AI tentang saham ini',
        'Pratinjau AI',
        'Tanya Risiko',
        'Tanya Entry',
        'Bacaan valuasi',
        'Pembacaan Cepat',
        'Katalis Terbaru',
        'Tautan Katalis',
        'Pemantau Pengumuman',
        'Cek Sumber',
        'Skor Swing',
        'Zona Entry',
    ]
    banned = [
        'IDX EQUITY',
        'AI Assistant',
        'Ask AI about this stock',
        'AI Preview',
        'Ask Risk',
        'Ask Entry',
        'Valuation Read',
        'Quick Read',
        'Latest Catalysts',
        'Catalyst Link',
        'Announcement Monitor',
        'Source Check',
        'Swing Score',
        'Entry Zone',
    ]
    for marker in expected:
        assert marker in STOCK_DETAIL
    for marker in banned:
        assert marker not in STOCK_DETAIL


def test_dashboard_low_signal_copy_is_more_indonesian():
    expected = [
        'RUANG KERJA LIVE IDX',
        'Bias Pasar',
        'Penguat Utama',
        'Sektor Utama',
        'Memuat...',
        'Menyiapkan breadth dan konteks tape.',
        'Market Intelligence',
        'Menyusun ringkasan pasar',
        'Mengumpulkan berita pasar',
        'Tape sedang dimuat',
        'Menyiapkan penggerak pasar',
        'Menunggu snapshot',
        'Tape Berisiko',
        'Tape Defensif',
        'Belum ada pemimpin',
        'Ekuitas IDX',
    ]
    banned = [
        'IDX LIVE WORKSPACE',
        'Market Bias',
        'Lead Gainer',
        'Lead Sector',
        'Loading...',
        'tape context',
        'Building market brief',
        'Gathering market headlines',
        'Tape loading',
        'Preparing movers tape',
        'Waiting Snapshot',
        'Risk-On Tape',
        'No leader yet',
        'IDX Equity',
    ]
    for marker in expected:
        assert marker in DASHBOARD
    for marker in banned:
        assert marker not in DASHBOARD
