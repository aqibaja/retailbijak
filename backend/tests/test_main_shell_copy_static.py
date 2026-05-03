from pathlib import Path

INDEX_HTML = Path('/home/rich27/retailbijak/frontend/index.html')
MAIN_JS = Path('/home/rich27/retailbijak/frontend/js/main.js')
ROUTER_JS = Path('/home/rich27/retailbijak/frontend/js/router.js')


def test_main_shell_uses_indonesian_navigation_and_search_copy():
    index = INDEX_HTML.read_text()
    main = MAIN_JS.read_text()
    router = ROUTER_JS.read_text()

    assert '>Beranda<' in index
    assert '>Pindai<' in index
    assert '>Pasar<' in index
    assert '>Berita<' in index
    assert '>Aset<' in index
    assert 'aria-label="Cari"' in index
    assert 'aria-label="Pengaturan"' in index
    assert 'placeholder="Cari kode saham, emiten, atau sektor..."' in index

    assert 'Emiten' in main
    assert 'Sektor' in main
    assert 'Ketik kode saham atau nama emiten.' in main
    assert 'IDX BUKA' in main
    assert 'IDX TUTUP' in main
    assert 'Failed to refresh topbar' not in main
    assert 'Company' not in main
    assert 'Sector' not in main
    assert 'IDX OPEN' not in main
    assert 'IDX CLOSED' not in main

    assert 'Gagal memuat tampilan.' in router
    assert 'Error loading view.' not in router
