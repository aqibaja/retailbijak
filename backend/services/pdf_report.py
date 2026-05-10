"""
PDF Stock Report Service — Fase 18.1
Generates professional PDF report for any IDX stock using WeasyPrint.
Data sources: Fundamental, Technical, Signals, AI Analysis.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

MAX_ATTEMPTS = 3

from database import Fundamental, OHLCVDaily, Signal, Stock, News, get_db
from routes.shared_stock_fallbacks import _ticker_base, _ticker_with_suffix, _fallback_row_for_ticker
def _get_fundamental_data(db, ticker: str) -> dict:
    """Fetch fundamental data for a ticker."""
    ticker_with_suffix = _ticker_with_suffix(ticker)
    ticker_base = _ticker_base(ticker)

    f = db.query(Fundamental).filter(Fundamental.ticker.in_([ticker_with_suffix, ticker_base])).first()
    if not f:
        return {}

    def _v(val, fmt='number'):
        if val is None:
            return '—'
        if fmt == 'pct':
            return f'{val * 100:.2f}%' if abs(val) < 1 else f'{val:.2f}%'
        if fmt == 'money_b':
            return f'Rp{val / 1e12:.2f}T' if abs(val) >= 1e12 else f'Rp{val / 1e9:.2f}B'
        return f'{val:,.2f}'

    return {
        'trailing_pe': _v(f.trailing_pe),
        'forward_pe': _v(f.forward_pe),
        'price_to_book': _v(f.price_to_book),
        'trailing_eps': _v(f.trailing_eps),
        'dividend_yield': _v(f.dividend_yield, 'pct'),
        'roe': _v(f.roe, 'pct'),
        'roa': _v(f.roa, 'pct'),
        'debt_to_equity': _v(f.debt_to_equity),
        'market_cap': _v(f.market_cap, 'money_b'),
        'revenue': _v(f.revenue, 'money_b'),
        'net_income': _v(f.net_income, 'money_b'),
        'sector': f.sector or '—',
        'industry': f.industry or '—',
    }


def _get_technical_data(db, ticker: str) -> dict:
    """Fetch technical indicators summary."""
from indicators_extended import get_ohlcv_dataframe, calculate_all_indicators, get_technical_summary
    ticker = _ticker_with_suffix(ticker)
    df = get_ohlcv_dataframe(db, ticker, limit=300)
    if df.empty:
        return {'status': 'no_data', 'rsi': '—', 'macd': '—', 'trend': '—'}

    df_ind = calculate_all_indicators(df)
    summary = get_technical_summary(df_ind)
    ind = summary.get('indicators', {})

    return {
        'status': summary.get('status', 'no_data'),
        'rating': summary.get('rating', '—'),
        'score': summary.get('score', 0),
        'rsi': ind.get('rsi', {}),
        'macd': ind.get('macd', {}),
        'trend': ind.get('trend', {}),
        'bollinger': ind.get('bollinger_bands', {}),
        'volume': ind.get('volume', {}),
        'atr': ind.get('atr', {}),
    }


def _get_stock_info(db, ticker: str) -> dict:
    """Fetch basic stock info."""
    row = _fallback_row_for_ticker(ticker, db)
    return {
        'ticker': row.get('ticker', ticker),
        'name': row.get('name', ticker),
        'price': row.get('price'),
        'change': row.get('change'),
        'change_pct': row.get('change_pct'),
        'volume': row.get('volume'),
    }


def _get_recent_news(db, ticker: str, limit: int = 5) -> list:
    """Fetch recent news for ticker."""
    base = _ticker_base(ticker)
    rows = (
        db.query(News)
        .filter(News.ticker == base)
        .order_by(News.pub_date.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            'title': r.title or '',
            'date': r.pub_date.strftime('%d %b %Y') if r.pub_date else '',
            'source': r.source or '',
        }
        for r in rows
    ]


def _generate_html(ticker: str, info: dict, fundamental: dict, technical: dict, news: list) -> str:
    """Generate HTML report template."""
    price = info.get('price')
    change = info.get('change')
    change_pct = info.get('change_pct')
    is_up = change is not None and change >= 0

    price_html = f'<span class="price">Rp {price:,.0f}</span>' if price else '<span class="price muted">—</span>'
    change_html = ''
    if change is not None:
        cls = 'up' if is_up else 'down'
        change_html = f'<span class="change {cls}">{"+" if is_up else ""}{change:,.0f} ({"+" if is_up else ""}{change_pct:.2f}%)</span>'

    # Technical indicators
    tech = technical
    rsi = tech.get('rsi', {})
    macd = tech.get('macd', {})
    trend = tech.get('trend', {})
    boll = tech.get('bollinger', {})
    vol = tech.get('volume', {})

    rsi_val = rsi.get('value', '—')
    rsi_status = rsi.get('status', '—')

    macd_status = macd.get('status', '—')
    macd_line = macd.get('macd_line', '—')
    macd_signal = macd.get('signal', '—')

    trend_status = trend.get('status', '—')
    sma_20 = trend.get('sma_20', '—')
    sma_50 = trend.get('sma_50', '—')

    bb_status = boll.get('status', '—')
    vol_ratio = vol.get('ratio', '—')
    vol_status = vol.get('status', '—')

    score = tech.get('score', 0)
    rating = tech.get('rating', '—')

    # Fundamental table rows
    fa_rows = ''
    for label, key in [
        ('PER (Trailing)', 'trailing_pe'),
        ('PER (Forward)', 'forward_pe'),
        ('PBV', 'price_to_book'),
        ('EPS', 'trailing_eps'),
        ('Dividend Yield', 'dividend_yield'),
        ('ROE', 'roe'),
        ('ROA', 'roa'),
        ('DER', 'debt_to_equity'),
        ('Market Cap', 'market_cap'),
        ('Revenue', 'revenue'),
        ('Net Income', 'net_income'),
    ]:
        val = fundamental.get(key, '—')
        fa_rows += f'<tr><td class="label">{label}</td><td class="value">{val}</td></tr>\n'

    # News items
    news_rows = ''
    for n in news:
        news_rows += f"""
        <tr>
            <td class="news-date">{n['date']}</td>
            <td class="news-title">{n['title']}</td>
            <td class="news-source">{n['source']}</td>
        </tr>"""

    generated_at = datetime.now(timezone.utc).strftime('%d %B %Y %H:%M WIB')

    return f"""<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<style>
  @page {{
    size: A4;
    margin: 2cm 1.8cm;
    @bottom-center {{
      content: "Halaman " counter(page) " dari " counter(pages);
      font-size: 9px;
      color: #94a3b8;
    }}
  }}
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{ font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #1e293b; line-height: 1.5; }}
  .header {{ display: flex; justify-content: space-between; align-items: center; padding-bottom: 16px; border-bottom: 3px solid #10b981; margin-bottom: 20px; }}
  .header-left h1 {{ font-size: 22px; font-weight: 800; color: #0f172a; margin: 0; }}
  .header-left .subtitle {{ font-size: 12px; color: #64748b; margin-top: 2px; }}
  .header-left .sector {{ font-size: 10px; color: #94a3b8; }}
  .header-right {{ text-align: right; }}
  .price {{ font-size: 28px; font-weight: 800; color: #0f172a; }}
  .change {{ font-size: 14px; font-weight: 600; margin-left: 6px; }}
  .change.up {{ color: #059669; }}
  .change.down {{ color: #dc2626; }}
  .muted {{ color: #94a3b8; }}
  .meta {{ font-size: 9px; color: #94a3b8; margin-top: 4px; }}
  .section {{ margin-bottom: 18px; }}
  .section-title {{ font-size: 13px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; margin-bottom: 10px; }}
  .section-title .badge {{ display: inline-block; font-size: 10px; padding: 1px 8px; border-radius: 4px; margin-left: 8px; vertical-align: middle; }}
  .badge-bullish {{ background: #dcfce7; color: #059669; }}
  .badge-bearish {{ background: #fee2e2; color: #dc2626; }}
  .badge-neutral {{ background: #f1f5f9; color: #64748b; }}
  table {{ width: 100%; border-collapse: collapse; }}
  table.indicators td, table.indicators th {{ padding: 4px 8px; border: 1px solid #e2e8f0; font-size: 10px; }}
  table.indicators th {{ background: #f8fafc; font-weight: 700; color: #475569; text-align: left; }}
  table.fa td {{ padding: 3px 8px; border-bottom: 1px solid #f1f5f9; font-size: 10px; }}
  td.label {{ color: #64748b; width: 140px; }}
  td.value {{ font-weight: 600; color: #0f172a; }}
  .fa-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }}
  .score-ring {{ display: inline-flex; align-items: center; gap: 6px; }}
  .score-bar {{ width: 60px; height: 6px; border-radius: 3px; background: #e2e8f0; overflow: hidden; display: inline-block; vertical-align: middle; }}
  .score-fill {{ height: 100%; border-radius: 3px; transition: width 0.3s; }}
  .footer {{ margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #94a3b8; text-align: center; }}
  .news-date {{ width: 80px; color: #94a3b8; font-size: 9px; }}
  .news-title {{ color: #1e293b; }}
  .news-source {{ width: 70px; color: #94a3b8; font-size: 9px; }}
  .cover {{ text-align: center; padding: 60px 0 40px; }}
  .cover h1 {{ font-size: 32px; font-weight: 800; color: #0f172a; }}
  .cover .tagline {{ font-size: 14px; color: #64748b; margin-top: 8px; }}
</style>
</head>
<body>

<div class="cover">
    <h1>{ticker}</h1>
    <div class="tagline">{info.get('name', ticker)}</div>
    <div style="margin-top:20px">{price_html} {change_html}</div>
    <div class="meta" style="margin-top:8px">Sektor: {fundamental.get('sector', '—')} | Industri: {fundamental.get('industry', '—')}</div>
    <div class="meta">Laporan dihasilkan: {generated_at}</div>
</div>

<div class="section">
    <div class="section-title">Ringkasan Teknikal <span class="badge badge-{'bullish' if score >= 60 else 'bearish' if score <= 40 else 'neutral'}">{rating} ({score}/100)</span></div>
    <table class="indicators">
        <tr>
            <th>Indikator</th>
            <th>Nilai</th>
            <th>Status</th>
        </tr>
        <tr><td>RSI (14)</td><td>{rsi_val}</td><td>{rsi_status}</td></tr>
        <tr><td>MACD</td><td>{macd_line}</td><td>{macd_status}</td></tr>
        <tr><td>SMA 20</td><td>{sma_20}</td><td>{trend_status}</td></tr>
        <tr><td>SMA 50</td><td>{sma_50}</td><td>{trend_status}</td></tr>
        <tr><td>Bollinger Bands</td><td>{boll.get('upper', '—')} / {boll.get('middle', '—')} / {boll.get('lower', '—')}</td><td>{bb_status}</td></tr>
        <tr><td>Volume Ratio</td><td>{vol_ratio}</td><td>{vol_status}</td></tr>
        <tr><td>ATR</td><td>{tech.get('atr', {}).get('value', '—')}</td><td>{tech.get('atr', {}).get('status', '—')}</td></tr>
    </table>
</div>

<div class="section">
    <div class="section-title">Data Fundamental</div>
    <table class="fa">
        {fa_rows}
    </table>
</div>

<div class="section">
    <div class="section-title">Berita Terbaru</div>
    <table>
        {news_rows or '<tr><td class="muted" style="padding:8px">Tidak ada berita terbaru.</td></tr>'}
    </table>
</div>

<div class="footer">
    <strong>RetailBijak</strong> — IDX Stock Intelligence &bull; {generated_at} &bull; Laporan ini dibuat otomatis dari data publik.
</div>

</body>
</html>"""


def generate_stock_report(db, ticker: str) -> bytes | None:
    """Generate PDF report for a stock ticker. Returns PDF bytes or None."""
    try:
        import weasyprint
    except ImportError:
        logger.error('weasyprint not installed')
        return None

    ticker = ticker.upper().strip()

    # Gather all data
    info = _get_stock_info(db, ticker)
    fundamental = _get_fundamental_data(db, ticker)
    technical = _get_technical_data(db, ticker)
    news = _get_recent_news(db, ticker)

    # Generate HTML
    html = _generate_html(ticker, info, fundamental, technical, news)

    # Render to PDF
    try:
        pdf_bytes = weasyprint.HTML(string=html).write_pdf()
        logger.info('PDF report generated for %s (%d bytes)', ticker, len(pdf_bytes))
        return pdf_bytes
    except Exception as e:
        logger.error('Failed to generate PDF for %s: %s', ticker, e)
        return None
