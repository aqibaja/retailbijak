from __future__ import annotations

from datetime import datetime
from time import time
from typing import Any

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from database import News, get_db
from services.idx_api_client import get_idx_client
from services.idx_response_factory import ok as _resp_ok
from services.openrouter_llm import get_openrouter_config
logger = logging.getLogger(__name__)
router = APIRouter()

_corporate_actions_cache: dict[str, Any] = {"data": None, "ts": 0}


@router.get('/api/news')
def get_news(db: Session = Depends(get_db), limit: int = 20, offset: int = 0, ticker: str = '', source: str = '', sentiment: str = '', category: str = ''):
    """Get latest market news from DB; optionally filter by ticker, source, sentiment, or category."""
    q = db.query(News)

    # Filter by source
    if source:
        q = q.filter(News.source == source.strip())

    # Filter by sentiment
    if sentiment and sentiment in ('positive', 'negative', 'neutral'):
        q = q.filter(News.sentiment == sentiment.strip().lower())

    # Filter by category
    VALID_CATEGORIES = ('earnings', 'dividend', 'corporate', 'market', 'analyst')
    if category and category.strip().lower() in VALID_CATEGORIES:
        q = q.filter(News.category == category.strip().lower())
    
    # Filter by ticker
    if ticker:
        ticker_upper = ticker.upper()
        like = f'%{ticker_upper}%'
        names = {'BBCA': 'Bank Central Asia', 'BMRI': 'Bank Mandiri', 'BBRI': 'Bank Rakyat Indonesia',
                 'TLKM': 'Telkom Indonesia', 'GOTO': 'GoTo Gojek', 'ASII': 'Astra International',
                 'ADRO': 'Adaro Energy', 'BYAN': 'Bayan Resources', 'UNVR': 'Unilever Indonesia',
                 'INDF': 'Indofood Sukses', 'HMSP': 'HM Sampoerna'}
        full_name = names.get(ticker_upper, '')
        filters = [News.title.ilike(like), News.summary.ilike(like)]
        filters.append(News.tickers.ilike(f'%{ticker_upper}%'))
        if full_name:
            name_like = f'%{full_name}%'
            filters.append(News.title.ilike(name_like))
            filters.append(News.summary.ilike(name_like))
        q = q.filter(or_(*filters))
    
    total = q.count()
    news = q.order_by(News.published_at.desc()).offset(offset).limit(limit).all()
    if not news and offset == 0:
        try:
            from updaters.news_updater import update_news
        except Exception:
            news = []

    data = [{"title": n.title, "link": n.link, "published_at": n.published_at.isoformat() if n.published_at else None, "source": n.source, "summary": n.summary, "image_url": n.image_url, "sentiment": n.sentiment, "tickers": n.tickers, "category": n.category} for n in news]
    
    # Get available sources for filter UI
    sources = [row[0] for row in db.query(News.source).distinct().filter(News.source != None).order_by(News.source.asc()).all() if row[0]]

    # Get available categories for filter UI with counts
    cat_counts_raw = db.query(News.category, func.count(News.id)).filter(News.category != None).group_by(News.category).order_by(News.category.asc()).all()
    categories = [row[0] for row in cat_counts_raw if row[0]]
    category_counts = {row[0]: row[1] for row in cat_counts_raw if row[0]}

    return {"count": len(data), "total": total, "data": data, "sources": sources, "categories": categories, "category_counts": category_counts, "source": "db" if news else "no_data"}


@router.post('/api/news/{news_id}/summarize')
def summarize_news(news_id: str, db: Session = Depends(get_db)):
    """Generate an AI-powered concise 2-3 paragraph summary in Indonesian for a news item using OpenRouter LLM."""
    news = db.query(News).filter(News.id == news_id).first()
    if not news:
        raise HTTPException(status_code=404, detail='Berita tidak ditemukan')

    if not news.title:
        raise HTTPException(status_code=400, detail='Berita tidak memiliki judul untuk diringkas')

    config = get_openrouter_config(db)
    if not config.get('enabled'):
        raise HTTPException(status_code=503, detail='OpenRouter API tidak dikonfigurasi. Atur di Settings > AI.')

    api_key = config['api_key']
    model = config.get('ai_picks_model') or config.get('stock_analysis_model') or 'google/gemma-4-26b-a4b-it'
    site_url = config.get('site_url')
    app_name = config.get('app_name', 'RetailBijak')

    existing = (news.summary or '').strip()
    title = news.title.strip()

    system_prompt = (
        "Anda adalah asisten ringkasan berita pasar modal Indonesia. "
        "Buat ringkasan berita yang jelas, faktual, dan informatif dalam Bahasa Indonesia.\n"
        "Output: JSON dengan key 'summary' berisi 2-3 paragraf pendek (maks 200 kata)."
    )

    if existing:
        user_prompt = (
            f"Judul: {title}\n\n"
            f"Ringkasan saat ini: {existing}\n\n"
            "Buat ringkasan yang lebih baik dari berita di atas dalam 2-3 paragraf pendek "
            "dalam Bahasa Indonesia. Output JSON: {\"summary\":\"ringkasan baru\"}"
        )
    else:
        user_prompt = (
            f"Judul: {title}\n\n"
            "Buat ringkasan berita di atas dalam 2-3 paragraf pendek "
            "dalam Bahasa Indonesia. Output JSON: {\"summary\":\"ringkasan berita\"}"
        )

    import requests

    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
        'HTTP-Referer': site_url or 'https://retailbijak.rich27.my.id',
        'X-Title': app_name,
    }
    payload = {
        'model': model,
        'temperature': 0.3,
        'max_tokens': 600,
        'response_format': {'type': 'json_object'},
        'messages': [
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': user_prompt},
        ],
    }

    try:
        response = requests.post(
            'https://openrouter.ai/api/v1/chat/completions',
            headers=headers,
            json=payload,
            timeout=30,
        )
    except requests.RequestException as e:
        logger.error('OpenRouter request failed for news %s: %s', news_id, e)
        raise HTTPException(status_code=502, detail=f'Gagal menghubungi OpenRouter: {e}')

    if response.status_code >= 400:
        error_data = {}
        try:
            error_data = response.json().get('error', {})
        except Exception:
            pass
        msg = error_data.get('message', f'HTTP {response.status_code}')
        logger.error('OpenRouter API error for news %s: %s', news_id, msg)
        if response.status_code == 429:
            raise HTTPException(status_code=429, detail='Rate limit OpenRouter tercapai. Coba lagi nanti.')
        raise HTTPException(status_code=502, detail=f'Gagal dari OpenRouter: {msg}')

    data = response.json()
    choices = data.get('choices', [])
    if not choices:
        raise HTTPException(status_code=502, detail='Tidak ada respons dari OpenRouter')

    content = choices[0]['message']['content']
    if isinstance(content, list):
        content = ''.join(p.get('text', '') if isinstance(p, dict) else str(p) for p in content)

    try:
        import json
        parsed = json.loads(content.strip())
        new_summary = parsed.get('summary', content)
    except (json.JSONDecodeError, ValueError):
        new_summary = content.strip()

    news.summary = new_summary
    db.commit()

    logger.info('Summary updated for news %s (model=%s)', news_id, model)
    return {'summary': new_summary, 'news_id': news_id, 'model': model}


@router.get('/api/news/watchlist')
def get_watchlist_news(db: Session = Depends(get_db), limit: int = 20, since: str = ''):
    """Get news for stocks in user's watchlist. Fallback to top movers if watchlist empty."""
    from database import WatchlistItem
    # Get watchlist tickers
    watchlist_tickers = [row.ticker for row in db.query(WatchlistItem.ticker).all()]

    if not watchlist_tickers:
        # Fallback: latest news regardless of ticker
        q = db.query(News)
        if since:
            try:
                from datetime import datetime as dt
                since_dt = dt.fromisoformat(since.replace('Z', '+00:00'))
                q = q.filter(News.published_at > since_dt)
            except Exception:
                pass
        items = q.order_by(News.published_at.desc()).limit(limit).all()
        return {
            "count": len(items),
            "data": [{"title": n.title, "link": n.link, "published_at": n.published_at.isoformat() if n.published_at else None,
                       "source": n.source, "summary": n.summary, "sentiment": n.sentiment, "tickers": n.tickers, "category": n.category} for n in items],
            "source": "fallback_all"
        }

    # Build filter: tickers field contains any watchlist ticker
    filters = []
    for t in watchlist_tickers:
        filters.append(News.tickers.ilike(f'%{t}%'))
        filters.append(News.title.ilike(f'%{t}%'))

    q = db.query(News).filter(or_(*filters))
    if since:
        try:
            from datetime import datetime as dt
            since_dt = dt.fromisoformat(since.replace('Z', '+00:00'))
            q = q.filter(News.published_at > since_dt)
        except Exception:
            pass

    items = q.order_by(News.published_at.desc()).limit(limit).all()
    return {
        "count": len(items),
        "watchlist_tickers": watchlist_tickers,
        "data": [{"title": n.title, "link": n.link, "published_at": n.published_at.isoformat() if n.published_at else None,
                   "source": n.source, "summary": n.summary, "sentiment": n.sentiment, "tickers": n.tickers, "category": n.category} for n in items],
        "source": "watchlist"
    }


@router.get('/api/corporate-actions')
def get_corporate_actions(year: int | None = None, month: int | None = None, limit: int = 30):
    """Corporate actions: listings (new/warrants), dividends — live from IDX DigitalStatistic.

    Uses only working IDX endpoints:
    - LINK_LISTING via GetApiDataPaginated (listing/warrant data, last 3 months)
    - LINK_DIVIDEND via GetApiData (dividend announcements)
    Suspension endpoint (GetSuspension) returns 503 — wrapped in try/except.
    Results cached for 5 min to avoid IDX rate-limit.
    """
    now = time()
    if _corporate_actions_cache["data"] and (now - _corporate_actions_cache["ts"]) < 300:
        return _corporate_actions_cache["data"]

    client = get_idx_client()
    year = year or datetime.utcnow().year
    month = month or datetime.utcnow().month
    actions: list[dict[str, Any]] = []

    try:
        for m_offset in range(3):
            m = month - m_offset
            y = year
            if m < 1:
                m += 12
                y -= 1
            listing = client.get_json(
                f"/primary/DigitalStatistic/GetApiDataPaginated?"
                f"urlName=LINK_LISTING&periodYear={y}&periodMonth={m}"
                f"&periodType=monthly&isPrint=False&cumulative=true"
                f"&pageSize={limit}&pageNumber=1"
            )
            if listing.ok and isinstance(listing.data, dict):
                rows = listing.data.get("data") or []
                if isinstance(rows, list):
                    for item in rows:
                        actions.append({
                            "type": "listing",
                            "title": item.get("issuerName") or item.get("code"),
                            "code": item.get("code"),
                            "date": item.get("StartDate"),
                            "end_date": item.get("LastDate"),
                            "shares": item.get("NumOfShares"),
                            "source": "idx_listing",
                        })
    except Exception:
        pass

    try:
        dividend = client.get_json(
            "/primary/DigitalStatistic/GetApiData?urlName=LINK_DIVIDEND"
        )
        if dividend.ok and isinstance(dividend.data, dict):
            rows = dividend.data.get("data") or []
            if isinstance(rows, list):
                for item in rows:
                    actions.append({
                        "type": "dividend",
                        "title": item.get("name") or item.get("code"),
                        "code": item.get("code"),
                        "cash_dividend": item.get("cashDividend"),
                        "cum_dividend": item.get("cumDividend"),
                        "ex_dividend": item.get("exDividend"),
                        "record_date": item.get("recordDate"),
                        "payment_date": item.get("paymentDate"),
                        "date": item.get("cumDividend") or item.get("exDividend"),
                        "source": "idx_dividend",
                    })
    except Exception:
        pass

    try:
        suspension = client.get_json(
            "/primary/ListedCompany/GetSuspension?resultCount=10"
        )
        if suspension.ok and isinstance(suspension.data, dict):
            rows = suspension.data.get("results") or suspension.data.get("data") or []
            if isinstance(rows, list):
                for item in rows:
                    actions.append({
                        "type": "suspension",
                        "title": item.get("code") or item.get("companyName"),
                        "code": item.get("code"),
                        "date": item.get("date") or item.get("startDate"),
                        "source": "idx_suspension",
                    })
    except Exception:
        pass

    seen = set()
    unique: list[dict[str, Any]] = []
    for a in actions:
        key = (a.get("type"), a.get("code"))
        if key not in seen:
            seen.add(key)
            unique.append(a)

    # Filter to upcoming/relevant events only (date >= today - 7 days)
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    grace = today.isoformat()[:10]  # start of today YYYY-MM-DD
    future: list[dict[str, Any]] = []
    for a in unique:
        d = str(a.get("date") or "")
        if d >= grace:
            future.append(a)
        elif a.get("end_date") and str(a.get("end_date")) >= grace:
            # Event that started earlier but still ongoing
            future.append(a)
        elif a.get("ex_dividend") and str(a.get("ex_dividend")) >= grace:
            future.append(a)
        elif a.get("payment_date") and str(a.get("payment_date")) >= grace:
            future.append(a)

    # Fallback to calendar_events DB if IDX API returned nothing
    if not future:
        try:
            from database import SessionLocal, CalendarEvent
            from sqlalchemy import text as _text
            _db = SessionLocal()
            try:
                today_str = datetime.utcnow().strftime('%Y-%m-%d')
                rows = _db.query(CalendarEvent).filter(
                    CalendarEvent.event_type.in_(['ipo', 'rights', 'split', 'corporate', 'dividend'])
                ).order_by(CalendarEvent.event_date.desc()).limit(limit).all()
                for row in rows:
                    future.append({
                        "type": row.event_type,
                        "title": row.title,
                        "code": row.ticker,
                        "date": str(row.event_date)[:10] if row.event_date else None,
                        "description": row.description,
                        "source": "db_calendar",
                    })
            finally:
                _db.close()
        except Exception:
            pass

    result = _resp_ok(future[:limit], source="idx_corporate_live" if future else "no_data", count=len(future[:limit]))
    _corporate_actions_cache["data"] = result
    _corporate_actions_cache["ts"] = now
    return result


@router.get('/api/company-announcements')
def get_company_announcements(companyCode: str = "", limit: int = 20):
    client = get_idx_client()
    resp = client.get_json(f"/primary/ListedCompany/GetAnnouncement?kodeEmiten={companyCode}&indexFrom=0&pageSize={limit}&dateFrom=&dateTo=&lang=id")
    rows = []
    if resp.ok and isinstance(resp.data, dict) and isinstance(resp.data.get("Replies"), list):
        for item in resp.data["Replies"][:limit]:
            p = item.get("pengumuman", {})
            announcement_id = p.get("IdPengumuman") or p.get("PengumumanId") or p.get("id") or p.get("Id")
            attachment = p.get("AttachmentUrl") or p.get("Url") or p.get("Link") or p.get("Lampiran")
            if attachment and isinstance(attachment, str) and attachment.startswith('//'):
                attachment = f"https:{attachment}"
            idx_link = attachment
            if not idx_link and announcement_id:
                idx_link = f"https://www.idx.co.id/id/perusahaan-tercatat/keterbukaan-informasi/?id={announcement_id}"
            if not idx_link:
                code = (p.get("Kode_Emiten") or "").strip().upper()
                idx_link = f"https://www.idx.co.id/id/perusahaan-tercatat/keterbukaan-informasi/?kodeEmiten={code}" if code else "https://www.idx.co.id/id/perusahaan-tercatat/keterbukaan-informasi/"
            rows.append({
                "code": (p.get("Kode_Emiten") or "").strip(),
                "title": p.get("JudulPengumuman") or p.get("PerihalPengumuman") or p.get("JenisPengumuman") or "Announcement",
                "subject": p.get("PerihalPengumuman") or p.get("JenisPengumuman"),
                "date": p.get("TglPengumuman") or p.get("CreatedDate"),
                "type": p.get("JenisPengumuman"),
                "link": idx_link,
                "source": "idx_announcement",
            })
    return {"count": len(rows), "data": rows, "source": "idx_announcement" if rows else "no_data"}
