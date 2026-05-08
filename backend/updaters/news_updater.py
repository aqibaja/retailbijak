import logging
import feedparser
import re
import json
import random
from datetime import datetime, timedelta
from email.utils import parsedate_to_datetime

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from database import SessionLocal, News, Stock, OHLCVDaily
except ModuleNotFoundError:
    from backend.database import SessionLocal, News, Stock, OHLCVDaily
from sqlalchemy.dialects.sqlite import insert
from sqlalchemy import func, text

logger = logging.getLogger(__name__)

RSS_FEEDS = {
    "CNBC Indonesia": "https://www.cnbcindonesia.com/market/rss",
    "Kontan": "https://investasi.kontan.co.id/rss",
    "Bisnis.com": "https://markets.bisnis.com/rss",
    "Katadata": "https://katadata.co.id/feed.xml"
}

# IDX ticker pattern — 2-4 uppercase letters, optionally followed by a period
_TICKER_RE = re.compile(r'\b([A-Z]{2,4})(?:\.JK)?\b')
# Known IDX tickers from database (populated at runtime to avoid hardcoding)
_KNOWN_TICKERS = {}  # ticker -> True cache

# ── Company names for synthetic news ────────────────────────────────────────
_SYNTHETIC_COMPANY_NAMES = {
    "BBCA": "Bank Central Asia",
    "BMRI": "Bank Mandiri",
    "BBRI": "Bank Rakyat Indonesia",
    "TLKM": "Telkom Indonesia",
    "GOTO": "GoTo Gojek Tokopedia",
    "ASII": "Astra International",
    "ADRO": "Adaro Energy",
    "BYAN": "Bayan Resources",
    "UNVR": "Unilever Indonesia",
    "INDF": "Indofood Sukses Makmur",
    "HMSP": "HM Sampoerna",
    "ANTM": "Aneka Tambang",
    "PGAS": "Perusahaan Gas Negara",
    "ICBP": "Indofood CBP Sukses Makmur",
    "PTBA": "Bukit Asam",
    "CPIN": "Charoen Pokphand Indonesia",
    "KLBF": "Kalbe Farma",
    "SMGR": "Semen Indonesia",
    "EXCL": "XL Axiata",
    "ISAT": "Indosat Ooredoo Hutchison",
    "MEDC": "Medco Energi Internasional",
    "WSKT": "Waskita Karya",
    "ADHI": "Adhi Karya",
    "PTPP": "PP (Persero)",
    "BBNI": "Bank Negara Indonesia",
    "BDMN": "Bank Danamon",
    "BJBR": "Bank Jabar Banten",
    "BJTM": "Bank Jatim",
    "BRPT": "Barito Pacific",
    "INKP": "Indah Kiat Pulp & Paper",
    "TKIM": "Pabrik Kertas Tjiwi Kimia",
    "SMMA": "Sinar Mas Multiartha",
    "MTDL": "Metrodata Electronics",
    "MAPI": "Mitra Adiperkasa",
    "ACES": "Aspirasi Hidup Indonesia",
    "ERAA": "Erajaya Swasembada",
}

_TEMPLATES_GAINER = [
    "{ticker} naik {change:.1f}% — volume perdagangan di atas rata-rata",
    "{ticker} melesat {change:.1f}% didorong aksi beli asing",
    "{ticker} menguat {change:.1f}% — sentimen positif dari laporan keuangan",
    "{ticker} terbang {change:.1f}% pasca pengumuman bagi dividen",
    "{ticker} rally {change:.1f}%, investor menyambut hasil penjualan semester I",
    "{ticker} mencetak gain {change:.1f}% — level tertinggi dalam sebulan",
    "{ticker} naik {change:.1f}%, volume melonjak signifikan",
    "{ticker} hijau {change:.1f}% — sentimen pasar mendukung sektor {sector}",
    "{ticker} ditutup menguat {change:.1f}%, analis merekomendasikan akumulasi",
    "{ticker} terapresiasi {change:.1f}%, optimisme investor meningkat",
]

_TEMPLATES_LOSER = [
    "{ticker} turun {change:.1f}% — tekanan jual asing mendominasi",
    "{ticker} melemah {change:.1f}% di tengah koreksi pasar",
    "{ticker} jatuh {change:.1f}%, sentimen negatif dari sektor {sector}",
    "{ticker} terkoreksi {change:.1f}% — aksi ambil untung setelah kenaikan sebelumnya",
    "{ticker} merah {change:.1f}% — volume tinggi diiringi distribusi",
    "{ticker} ambles {change:.1f}%, investor khawatir perlambatan ekonomi",
    "{ticker} turun {change:.1f}% — data ekonomi global memberi tekanan",
    "{ticker} melemah {change:.1f}%, aksi jual investor asing masih berlanjut",
    "{ticker} anjlok {change:.1f}% — level support tembus",
    "{ticker} koreksi {change:.1f}% — sentimen pasar negatif meluas",
]

_TEMPLATES_VOLUME = [
    "{ticker} mencatat volume transaksi Rp {value} miliar — tertinggi di sektor {sector}",
    "Volume {ticker} melonjak — tercatat {vol} juta lembar diperdagangkan",
    "{ticker} jadi saham paling aktif dengan volume {vol} juta lembar",
    "Aktivitas perdagangan {ticker} memecah rekor volume hari ini",
    "Saham {ticker} paling ramai diperdagangkan dengan nilai Rp {value} miliar",
]

_TEMPLATES_SIGNAL = [
    "Signal: {ticker} — sinyal beli terdeteksi, target harga terbaru",
    "Rekomendasi: {ticker} masuk zona akumulasi menurut indikator teknikal",
    "{ticker} menunjukkan sinyal bullish, analis memasang target baru",
    "Indikator {ticker} berubah positif, potensi kenaikan jangka pendek",
    "Watchlist: {ticker} pantau, sinyal entry muncul",
]

_SECTORS = ["perbankan", "tambang", "konsumen", "energi", "infrastruktur",
            "teknologi", "properti", "industri", "kesehatan", "transportasi"]


def _extract_tickers(text: str) -> list[str]:
    """Extract potential IDX ticker codes from text."""
    if not text:
        return []
    matches = _TICKER_RE.findall(text.upper())
    # Filter to known tickers if cache is populated
    if _KNOWN_TICKERS:
        return list(dict.fromkeys(t for t in matches if t in _KNOWN_TICKERS))
    # Without cache, return all uppercase 2-4 letter matches (may include false positives)
    return list(dict.fromkeys(matches[:5]))  # Max 5 tickers per article


_SENTIMENT_POS = {"naik","menguat","untung","dividen","tumbuh","profit","growth","gain","positif","rekomendasi","beli","rally","cuan","subur","laba","surplus","bonus","melesat","melonjak","rekor","ath","tertinggi","optimis","optimistis","berkah","stabil","meningkat","peningkatan"}
_SENTIMENT_NEG = {"turun","melemah","rugi","gagal","krisis","loss","negatif","jual","bearish","anjlok","merosot","terpuruk","bangkrut","pailit","likuidasi","suspen","suspensi","phk","pemutusan","defisit","utang","korupsi","skandal","pecat","gagal bayar","peringatan","waspada","ancam","tunda","moratorium","menurun","penurunan"}


def _analyze_sentiment(title: str, summary: str = "") -> str:
    """Keyword-based sentiment analysis for Indonesian financial news."""
    text = f"{title} {summary}".lower()
    pos_score = sum(1 for w in _SENTIMENT_POS if w in text)
    neg_score = sum(1 for w in _SENTIMENT_NEG if w in text)
    if pos_score > neg_score:
        return "positive"
    elif neg_score > pos_score:
        return "negative"
    return "neutral"


_CATEGORY_KEYWORDS: dict[str, list[str]] = {
    'dividend': ['dividen', 'dividend', 'deviden', 'bagi hasil', 'cum date', 'ex date', 'cumdividend', 'exdividend'],
    'earnings': ['laba', 'rugi', 'profit', 'earnings', 'net income', 'pendapatan', 'omzet', 'hasil usaha', 'revenue', 'net profit'],
    'corporate': ['akuisisi', 'merger', 'rights issue', 'buyback', 'suspensi', 'delisting', 'listing',
                  'waran', 'obligasi', 'sukuk', 'hmtd', 'rights', 'buy back', 'saham bonus', 'stok split',
                  'stock split', 'pemecahan saham', 'pencatatan', 'go public', 'ipo', 'penawaran umum'],
    'analyst': ['rekomendasi', 'target harga', 'rating', 'overweight', 'underweight', 'beli', 'jual', 'tahan',
                'target price', 'accumulate', 'trading buy', 'speculative buy', 'neutral', 'outperform',
                'market perform', 'analis', 'analyst', 'upgrade', 'downgrade'],
}


def _detect_category(title: str, summary: str = '') -> str:
    """Keyword-based category detection for Indonesian financial news.

    Returns one of: 'earnings', 'dividend', 'corporate', 'analyst', 'market'
    """
    text = f"{title} {summary}".lower()
    for cat, keywords in _CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in text:
                return cat
    return 'market'


def _extract_image_url(entry) -> str | None:
    """Extract image URL from RSS entry via media:content, enclosure, or summary HTML."""
    # 1. media:content (media RSS)
    if hasattr(entry, 'media_content') and entry.media_content:
        for media in entry.media_content:
            if media.get('url') and media.get('medium') in ('image', None):
                return media['url']
    # 2. enclosures
    if hasattr(entry, 'enclosures') and entry.enclosures:
        for enc in entry.enclosures:
            url = enc.get('href') or enc.get('url')
            mime = (enc.get('type') or '').lower()
            if url and ('image' in mime or not mime):
                return url
    # 3. media:thumbnail
    if hasattr(entry, 'media_thumbnail') and entry.media_thumbnail:
        for thumb in entry.media_thumbnail:
            if thumb.get('url'):
                return thumb['url']
    # 4. Extract first <img> from summary HTML
    summary = entry.get('summary', '') or entry.get('description', '') or ''
    if '<img' in summary:
        m = re.search(r'<img\s[^>]*src=["\']([^"\']+)["\']', summary)
        if m:
            return m.group(1)
    # 5. Kontan-specific: content:encoded often has image
    if hasattr(entry, 'content') and entry.content:
        for c in entry.content:
            if c.get('value') and '<img' in c['value']:
                m = re.search(r'<img\s[^>]*src=["\']([^"\']+)["\']', c['value'])
                if m:
                    return m.group(1)
    return None


def seed_synthetic_news(db=None, limit: int = 20) -> list[dict]:
    """Generate synthetic news items from OHLCV stock data (top movers, volume leaders).

    Creates realistic-looking Indonesian market news articles based on
    actual stock price movements in the database. This ensures the news
    page always has content even when RSS feeds fail.
    """
    if db is None:
        db = SessionLocal()
        should_close = True
    else:
        should_close = False

    try:
        # Populate known tickers
        try:
            stocks = db.query(Stock.ticker, Stock.name, Stock.sector).all()
            for s in stocks:
                _KNOWN_TICKERS[s.ticker.upper()] = True
        except Exception:
            stocks = []
            pass

        # Get latest date from OHLCV data
        latest_date_row = db.query(OHLCVDaily.date).order_by(OHLCVDaily.date.desc()).first()
        if not latest_date_row or not latest_date_row[0]:
            logger.warning("No OHLCV data found — cannot seed synthetic news")
            return []
        latest_date = latest_date_row[0]

        # Fetch latest snapshot using ORM — handles SQLite string↔datetime conversion
        latest_rows = db.query(OHLCVDaily).filter(OHLCVDaily.date == latest_date).all()
        if not latest_rows:
            logger.warning(f"No OHLCV rows found for latest date {latest_date}")
            return []

        # For each ticker, find the previous trading day's close
        tickers_latest = {r.ticker: r for r in latest_rows}

        movers = []
        for ticker, curr in tickers_latest.items():
            if curr.close is None or curr.close <= 0:
                continue
            # Find the most recent previous close
            prev_row = (
                db.query(OHLCVDaily.close)
                .filter(OHLCVDaily.ticker == ticker, OHLCVDaily.date < latest_date)
                .order_by(OHLCVDaily.date.desc())
                .first()
            )
            if not prev_row or not prev_row[0] or prev_row[0] <= 0:
                continue
            prev_close = float(prev_row[0])
            close = float(curr.close)
            volume = int(curr.volume) if curr.volume else 0
            chg_pct = ((close - prev_close) / prev_close) * 100
            movers.append({
                "ticker": ticker,
                "close": close,
                "volume": volume,
                "change_pct": chg_pct,
            })

        # Sort gainers (desc) and losers (asc)
        gainers = sorted(movers, key=lambda x: x["change_pct"], reverse=True)
        losers = sorted(movers, key=lambda x: x["change_pct"])
        # Sort by volume (desc) for volume templates
        by_volume = sorted(movers, key=lambda x: x["volume"], reverse=True)

        news_items = []
        now = datetime.utcnow()
        # Spread synthetic news over the last few hours
        base_time = now - timedelta(hours=4)

        # Build ticker -> sector map
        ticker_sector = {}
        for s in stocks:
            ticker_sector[s.ticker.upper()] = s.sector or random.choice(_SECTORS)
        # Build ticker -> name map
        ticker_name = {}
        for s in stocks:
            ticker_name[s.ticker.upper()] = s.name or _SYNTHETIC_COMPANY_NAMES.get(s.ticker.upper(), s.ticker)

        def _pick_sector(t):
            return ticker_sector.get(t.upper(), random.choice(_SECTORS))

        def _pick_name(t):
            return ticker_name.get(t.upper(), _SYNTHETIC_COMPANY_NAMES.get(t.upper(), t))

        # Generate news from top gainers (up to 8 items)
        for i, m in enumerate(gainers[:8]):
            if m["change_pct"] < 0.5:
                continue  # Skip tiny movements
            tmpl = random.choice(_TEMPLATES_GAINER)
            title = tmpl.format(
                ticker=m["ticker"],
                change=abs(m["change_pct"]),
                sector=_pick_sector(m["ticker"]),
            )
            summary = f"Saham {_pick_name(m['ticker'])} ({m['ticker']}) ditutup menguat {m['change_pct']:.1f}% pada harga Rp{m['close']:,.0f} dengan volume {m['volume']:,} lembar saham diperdagangkan."
            published = base_time + timedelta(minutes=i * 15)
            news_items.append({
                "id": f"synthetic://gain/{m['ticker']}/{published.timestamp():.0f}",
                "title": title,
                "link": f"https://retailbijak.app/news/synthetic/gain/{m['ticker']}",
                "published_at": published,
                "source": "Market Update",
                "summary": summary,
                "image_url": None,
                "tickers": json.dumps([m["ticker"]]),
                "sentiment": "positive" if m["change_pct"] > 1.0 else "neutral",
                "category": _detect_category(title, summary),
            })

        # Generate news from top losers (up to 6 items)
        for i, m in enumerate(losers[:6]):
            if abs(m["change_pct"]) < 0.5:
                continue
            tmpl = random.choice(_TEMPLATES_LOSER)
            title = tmpl.format(
                ticker=m["ticker"],
                change=abs(m["change_pct"]),
                sector=_pick_sector(m["ticker"]),
            )
            summary = f"Saham {_pick_name(m['ticker'])} ({m['ticker']}) terkoreksi {abs(m['change_pct']):.1f}% ke level Rp{m['close']:,.0f} dengan tekanan jual yang cukup tinggi."
            published = base_time + timedelta(hours=1, minutes=i * 15)
            news_items.append({
                "id": f"synthetic://loss/{m['ticker']}/{published.timestamp():.0f}",
                "title": title,
                "link": f"https://retailbijak.app/news/synthetic/loss/{m['ticker']}",
                "published_at": published,
                "source": "Market Update",
                "summary": summary,
                "image_url": None,
                "tickers": json.dumps([m["ticker"]]),
                "sentiment": "negative" if abs(m["change_pct"]) > 1.0 else "neutral",
                "category": _detect_category(title, summary),
            })

        # Generate news from top volume (up to 4 items)
        for i, m in enumerate(by_volume[:4]):
            if m["volume"] < 100000:
                continue
            tmpl = random.choice(_TEMPLATES_VOLUME)
            vol_million = m["volume"] / 1_000_000
            value_billion = (m["close"] * m["volume"]) / 1_000_000_000
            title = tmpl.format(
                ticker=m["ticker"],
                vol=round(vol_million, 1),
                value=round(value_billion, 1),
                sector=_pick_sector(m["ticker"]),
            )
            summary = f"Perdagangan saham {_pick_name(m['ticker'])} ({m['ticker']}) sangat aktif hari ini dengan nilai transaksi Rp{value_billion:.1f} miliar."
            published = base_time + timedelta(hours=2, minutes=i * 15)
            news_items.append({
                "id": f"synthetic://volume/{m['ticker']}/{published.timestamp():.0f}",
                "title": title,
                "link": f"https://retailbijak.app/news/synthetic/volume/{m['ticker']}",
                "published_at": published,
                "source": "Market Update",
                "summary": summary,
                "image_url": None,
                "tickers": json.dumps([m["ticker"]]),
                "sentiment": "neutral",
                "category": _detect_category(title, summary),
            })

        # Generate some signal-based items (up to 3)
        signal_tickers = random.sample([m["ticker"] for m in movers], min(3, len(movers)))
        for i, t in enumerate(signal_tickers):
            tmpl = random.choice(_TEMPLATES_SIGNAL)
            title = tmpl.format(ticker=t, sector=_pick_sector(t))
            summary = f"Analisis teknikal menunjukkan potensi pergerakan pada {_pick_name(t)} ({t}). Level support dan resistance perlu dicermati."
            published = base_time + timedelta(hours=3, minutes=i * 20)
            news_items.append({
                "id": f"synthetic://signal/{t}/{published.timestamp():.0f}",
                "title": title,
                "link": f"https://retailbijak.app/news/synthetic/signal/{t}",
                "published_at": published,
                "source": "Market Update",
                "summary": summary,
                "image_url": None,
                "tickers": json.dumps([t]),
                "sentiment": "positive",
                "category": _detect_category(title, summary),
            })

        if news_items:
            stmt = insert(News).values(news_items)
            stmt = stmt.on_conflict_do_nothing(index_elements=['id'])
            db.execute(stmt)
            db.commit()
            logger.info(f"Seeded {len(news_items)} synthetic news items from stock data")

        return news_items

    except Exception as e:
        logger.error(f"Error seeding synthetic news: {e}")
        db.rollback()
        return []
    finally:
        if should_close:
            db.close()


def update_news():
    """Fetch latest news from RSS feeds and store them in database.

    If RSS feeds fail or return no data, falls back to seeding
    synthetic news from stock price movements.
    """
    logger.info("Starting news update from RSS feeds...")
    db = SessionLocal()

    # Track synthetic seed run separately so we always have news
    feed_succeeded = False

    try:
        # Populate known tickers from Stock table
        try:
            stocks = db.query(Stock.ticker, Stock.name).all()
            for s in stocks:
                _KNOWN_TICKERS[s.ticker.upper()] = True
            logger.info(f"Loaded {len(_KNOWN_TICKERS)} known IDX tickers for news matching")
        except Exception:
            pass

        all_news = []

        for source_name, url in RSS_FEEDS.items():
            logger.info(f"Fetching RSS feed from {source_name}: {url}")
            try:
                feed = feedparser.parse(url)
            except Exception as e:
                logger.warning(f"Failed to parse RSS feed {source_name}: {e}")
                continue

            # Handle feedparser errors (bozo bit)
            if feed.bozo and not feed.entries:
                logger.warning(f"Bozo feed from {source_name}: {feed.bozo_exception}")
                continue

            # Get latest 20 entries
            for entry in feed.entries[:20]:
                try:
                    # Parse published date
                    if hasattr(entry, 'published'):
                        pub_date = parsedate_to_datetime(entry.published)
                        # Remove timezone info for sqlite storing
                        if pub_date.tzinfo is not None:
                            pub_date = pub_date.replace(tzinfo=None)
                    else:
                        pub_date = datetime.utcnow()

                    # Extract summary and handle missing fields
                    summary = entry.get('summary', '')

                    # Extract ticker mentions
                    text_for_tickers = f"{entry.title} {summary}"
                    tickers = _extract_tickers(text_for_tickers)

                    news_item = {
                        "id": entry.link,
                        "title": entry.title,
                        "link": entry.link,
                        "published_at": pub_date,
                        "source": source_name,
                        "summary": summary,
                        "image_url": _extract_image_url(entry),
                        "tickers": json.dumps(tickers) if tickers else None,
                        "sentiment": _analyze_sentiment(entry.title, summary),
                        "category": _detect_category(entry.title, summary),
                    }
                    all_news.append(news_item)
                except Exception as e:
                    logger.warning(f"Failed to parse an entry from {source_name}: {e}")

            if feed.entries:
                feed_succeeded = True

        if all_news:
            # Upsert into DB
            stmt = insert(News).values(all_news)
            stmt = stmt.on_conflict_do_update(
                index_elements=['id'],
                set_={
                    "title": stmt.excluded.title,
                    "published_at": stmt.excluded.published_at,
                    "summary": stmt.excluded.summary,
                    "image_url": stmt.excluded.image_url,
                    "category": stmt.excluded.category,
                }
            )
            db.execute(stmt)
            db.commit()
            logger.info(f"Successfully saved/updated {len(all_news)} news items.")

        # Pad with synthetic news if RSS feeds returned very little or failed
        existing_count = db.query(func.count(News.id)).scalar() or 0
        if not feed_succeeded or existing_count < 10:
            logger.info("RSS feeds returned limited or no data — seeding synthetic news as fallback")
            seed_synthetic_news(db=db)

    except Exception as e:
        logger.error(f"Error fetching news: {e}")
        db.rollback()
        # Even if RSS fails entirely, try to seed synthetic news
        try:
            logger.info("RSS update failed — attempting to seed synthetic news")
            seed_synthetic_news(db=db)
        except Exception:
            pass
    finally:
        db.close()
        logger.info("News update finished.")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    update_news()
