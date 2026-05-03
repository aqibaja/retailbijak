from pathlib import Path


PORTFOLIO_VIEW = Path('/home/rich27/retailbijak/frontend/js/views/portfolio.js')
STYLE = Path('/home/rich27/retailbijak/frontend/style.css')


def test_portfolio_view_uses_compact_shell_and_editorial_table_rows():
    content = PORTFOLIO_VIEW.read_text()
    assert 'portfolio-page-pro' in content
    assert 'portfolio-header' in content
    assert 'portfolio-tab-switch' in content
    assert 'portfolio-table-shell' in content
    assert 'portfolio-row-kicker' in content
    assert 'portfolio-row-note' in content
    assert 'portfolio-meta-rail' in content
    assert 'portfolio-summary' in content


def test_portfolio_view_uses_indonesian_copy_for_tables_prompts_and_actions():
    content = PORTFOLIO_VIEW.read_text()
    assert 'Pusat Portofolio' in content
    assert 'Aset & Daftar Pantau' in content
    assert 'operasi daftar pantau' in content
    assert 'Portofolio' in content
    assert 'Kode Saham' in content
    assert 'Catatan' in content
    assert 'Aksi' in content
    assert 'Lot' in content
    assert 'Harga Rata-Rata' in content
    assert 'Belum ada saham di daftar pantau.' in content
    assert 'Belum ada posisi portofolio.' in content
    assert 'Kode saham (contoh: BBCA):' in content
    assert 'Catatan:' in content
    assert 'ditambahkan ke daftar pantau' in content
    assert 'Yakin ingin menghapus' in content
    assert 'dari daftar pantau?' in content
    assert 'Kode saham:' in content
    assert 'Lot:' in content
    assert 'Harga rata-rata:' in content
    assert 'Lot atau harga tidak valid' in content
    assert 'ditambahkan ke portofolio' in content
    assert 'dari portofolio?' in content
    assert 'Portfolio' not in content.replace('fetchPortfolio', '').replace('savePortfolioPosition', '').replace('deletePortfolioPosition', '').replace('renderPortfolio', '')
    assert 'Watchlist' not in content.replace('fetchWatchlist', '').replace('saveWatchlistItem', '').replace('deleteWatchlistItem', '').replace('renderWatchlistTab', '')
    assert 'Ticker' not in content
    assert 'Notes' not in content
    assert 'Action' not in content
    assert 'Lots' not in content
    assert 'Avg Price' not in content
    assert 'Are you sure you want to remove' not in content
    assert 'added to Portfolio' not in content


def test_portfolio_styles_define_compact_hierarchy_and_mobile_stack():
    content = STYLE.read_text()
    assert '.portfolio-page-pro {' in content
    assert '.portfolio-header {' in content
    assert '.portfolio-tab-switch {' in content
    assert '.portfolio-table-shell {' in content
    assert '.portfolio-row-kicker {' in content
    assert '.portfolio-meta-rail {' in content
    assert '.portfolio-summary {' in content
    assert '@media (max-width: 768px) {' in content
