from __future__ import annotations

try:
    from stocks import get_ticker_display
except ModuleNotFoundError:
    from backend.stocks import get_ticker_display

try:
    from routes.shared_stock_fallbacks import _ticker_base
except ModuleNotFoundError:
    from backend.routes.shared_stock_fallbacks import _ticker_base

COMPANY_NAMES = {
    "BBCA": "Bank Central Asia Tbk.", "BMRI": "Bank Mandiri (Persero) Tbk.",
    "BBRI": "Bank Rakyat Indonesia Tbk.", "TLKM": "Telkom Indonesia Tbk.", "ASII": "Astra International Tbk.",
    "BRPT": "Barito Pacific Tbk.", "ADRO": "Adaro Energy Indonesia Tbk.", "ANTM": "Aneka Tambang Tbk.", "UNVR": "Unilever Indonesia Tbk.",
    "AMMN": "Amman Mineral Internasional Tbk.", "BREN": "Barito Renewables Energy Tbk.", "BUMI": "Bumi Resources Tbk.",
}
SECTOR_HINTS = {
    "BBCA": "Financials", "BMRI": "Financials", "BBRI": "Financials", "TLKM": "Infrastructure", "GOTO": "Technology",
    "ASII": "Industrials", "BRPT": "Basic Materials", "ADRO": "Energy", "ANTM": "Basic Materials", "UNVR": "Consumer Non-Cyclicals",
    "AMMN": "Basic Materials", "BREN": "Energy", "BUMI": "Energy",
}


def _display_ticker(t: str) -> str:
    return _ticker_base(t)


def _company_name(t: str) -> str:
    base = _display_ticker(t)
    return COMPANY_NAMES.get(base, get_ticker_display(base))


def _stock_row_from_static(t: str, i: int = 0) -> dict:
    base = _display_ticker(t)
    return {'ticker': base, 'name': _company_name(base), 'sector': SECTOR_HINTS.get(base, 'IDX Equity'), 'price': None, 'change_pct': None, 'rank': i + 1}


def _search_rank(row_ticker: str, row_name: str | None, row_sector: str | None, query: str) -> tuple[int, int, int, int]:
    ticker = _display_ticker(row_ticker)
    name = (row_name or _company_name(row_ticker)).upper()
    sector = (row_sector or SECTOR_HINTS.get(ticker, '')).upper()
    q = query.strip().upper()
    if not q:
        return (0, 0, 0, 0)
    ticker_exact = 0 if ticker == q else 1
    ticker_prefix = 0 if ticker.startswith(q) else 1
    name_prefix = 0 if name.startswith(q) else 1
    name_contains = 0 if q in name else 1
    sector_match = 0 if q in sector else 1
    return (ticker_exact, ticker_prefix, name_prefix + name_contains, sector_match)


def _search_bucket(ticker: str, name: str, sector: str, query: str) -> str:
    q = query.strip().upper()
    t = ticker.upper()
    n = name.upper()
    s = sector.upper()
    if q and (t == q or t.startswith(q)):
        return 'ticker'
    if q and n.startswith(q):
        return 'company'
    if q and len(q) >= 4 and q in s:
        return 'sector'
    return 'company' if q and q in n else 'ticker'
