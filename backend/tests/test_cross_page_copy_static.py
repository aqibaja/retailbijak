from pathlib import Path

FRONTEND_PORTFOLIO_VIEW = Path('/home/rich27/retailbijak/frontend/js/views/portfolio.js')
FRONTEND_NEWS_VIEW = Path('/home/rich27/retailbijak/frontend/js/views/news.js')


def test_portfolio_view_uses_indonesian_shell_copy_and_actions():
    content = FRONTEND_PORTFOLIO_VIEW.read_text()
    assert 'Pusat Portfolio' in content
    assert 'Aset & Watchlist' in content
    assert 'Jalur cepat untuk posisi aktif' in content
    assert 'Daftar Pantau' in content
    assert 'Posisi Aktif' in content
    assert 'Tambah</button>' in content
    assert 'Watchlist is empty.' not in content
    assert 'No portfolio positions.' not in content


def test_news_view_uses_indonesian_headline_copy_and_loading_state():
    content = FRONTEND_NEWS_VIEW.read_text()
    assert 'Intel Pasar' in content
    assert 'Berita Terbaru' in content
    assert 'Memuat feed intelligence...' in content
    assert 'Auto refresh saat feed berubah.' not in content
    assert 'Loading intelligence...' not in content
