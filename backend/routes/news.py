from __future__ import annotations

from datetime import datetime
from time import time
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

try:
    from database import News, get_db
except ModuleNotFoundError:
    from backend.database import News, get_db

try:
    from services.idx_api_client import get_idx_client
except ModuleNotFoundError:
    from backend.services.idx_api_client import get_idx_client

try:
    from services.idx_response_factory import ok as _resp_ok
except ModuleNotFoundError:
    from backend.services.idx_response_factory import ok as _resp_ok

router = APIRouter()

_corporate_actions_cache: dict[str, Any] = {"data": None, "ts": 0}


@router.get('/api/news')
def get_news(db: Session = Depends(get_db), limit: int = 20, ticker: str = ''):
    """Get latest market news from DB; optionally filter by ticker/company name."""
    q = db.query(News)
    if ticker:
        like = f'%{ticker.upper()}%'
        # Company name mapping for better relevance
        names = {'BBCA': 'Bank Central Asia', 'BMRI': 'Bank Mandiri', 'BBRI': 'Bank Rakyat Indonesia',
                 'TLKM': 'Telkom Indonesia', 'GOTO': 'GoTo Gojek', 'ASII': 'Astra International',
                 'ADRO': 'Adaro Energy', 'BYAN': 'Bayan Resources', 'UNVR': 'Unilever Indonesia',
                 'INDF': 'Indofood Sukses', 'HMSP': 'HM Sampoerna'}
        name_likes = [f'%{n}%' for n in names.get(ticker.upper(), '').split()]
        if name_likes and name_likes[0] != '%%':
            from sqlalchemy import or_
            filters = [News.title.ilike(like), News.summary.ilike(like)]
            for nl in name_likes:
                filters.append(News.title.ilike(nl))
                filters.append(News.summary.ilike(nl))
            q = q.filter(or_(*filters))
        else:
            q = q.filter(News.title.ilike(like) | News.summary.ilike(like))
    news = q.order_by(News.published_at.desc()).limit(limit).all()
    if not news:
        try:
            try:
                from updaters.news_updater import update_news
            except ModuleNotFoundError:
                from backend.updaters.news_updater import update_news
            update_news()
            news = db.query(News).order_by(News.published_at.desc()).limit(limit).all()
        except Exception:
            news = []

    data = [{"title": n.title, "link": n.link, "published_at": n.published_at.isoformat() if n.published_at else None, "source": n.source, "summary": n.summary, "image_url": n.image_url} for n in news]
    return {"count": len(data), "data": data, "source": "db" if news else "no_data"}


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

    result = _resp_ok(unique[:limit], source="idx_corporate_live", count=len(unique[:limit]))
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
