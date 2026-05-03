from pathlib import Path

FRONTEND_MARKET_VIEW = Path('/home/rich27/retailbijak/frontend/js/views/market.js')


def test_market_view_uses_indonesian_shell_and_section_copy():
    content = FRONTEND_MARKET_VIEW.read_text()
    expected = [
        'Ikhtisar Pasar',
        'Menyinkronkan',
        'Sumber: memuat',
        'Muat Ulang',
        'Internal Pasar',
        'Arus & Partisipasi',
        'Katalis & Agenda',
        'Ringkasan IHSG',
        'Denyut Pasar',
        'Breadth Pasar',
        'Penguat Utama',
        'Pelemah Utama',
        'Mood Pasar',
        'Rasio Breadth',
        'Penguat Teratas',
        'Pelemah Teratas',
        'Saham Penguat Teratas',
        'Saham Pelemah Teratas',
        'Aksi Korporasi',
        'Arus Investor Asing',
        'Aktivitas Broker',
        'Berita & Pengumuman Korporasi',
        'Arus asing',
        'Konsentrasi broker',
        'Katalis korporasi',
    ]
    forbidden = [
        'Market Overview',
        'Syncing',
        'Top Gainers',
        'Top Losers',
        'Corporate Actions',
        'Foreign Investor Flows',
        'Broker Trading Activity',
        'Corporate News & Announcements',
        'Market Breadth',
        'Top Advancers',
        'Top Decliners',
        'No advancers.',
        'No decliners.',
        'Best performing stocks today',
        'Weakest performing stocks today',
        'Foreign flow',
        'Broker concentration',
        'Corporate catalyst',
        'Updated ',
        'Sources:',
        'No data',
        'announcement baru',
    ]
    for token in expected:
        assert token in content
    for token in forbidden:
        assert token not in content
