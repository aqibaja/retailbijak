from pathlib import Path

ROOT = Path('/home/rich27/retailbijak')
STOCK_DETAIL = (ROOT / 'frontend/js/views/stock_detail.js').read_text()


def test_stock_detail_residual_operator_copy_is_more_indonesian():
    expected = [
        'Ringkasan teknikal belum tersedia lengkap.',
        'Keyakinan —',
        'Keyakinan ',
        'Volatilitas',
        'Level Kunci',
        'Rasio Volume',
        'Menengah',
        'Panjang',
        'Panel Keputusan',
        'TAHAN / PANTAU',
        'PANTAU',
        'Rasio risk/reward kurang ideal',
        'Zona pullback',
        'Zona reward',
        'Kendali risiko',
        'Risiko',
        'Risiko relatif terkendali.',
        'RSI jenuh beli',
        'normal',
    ]
    banned = [
        'Technical summary belum tersedia lengkap.',
        'Confidence —',
        'Confidence ',
        'Volatility',
        "['Levels',",
        'Volume Ratio',
        'medium',
        'long',
        'Decision Panel',
        'TAHAN / WATCH',
        "'WATCH'",
        'Risk/reward kurang ideal',
        'pullback zone',
        'reward zone',
        'risk control',
        "{t:'Risk'",
        'Risk relatif terkendali.',
        'RSI overbought',
    ]
    for marker in expected:
        assert marker in STOCK_DETAIL
    for marker in banned:
        assert marker not in STOCK_DETAIL
