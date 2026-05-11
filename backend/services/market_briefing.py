"""
AI Market Briefing Service — Fase 18.3
Generates daily AI-powered market summary for IDX using OpenRouter LLM.
Cached in DB, max 1 per trading day.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

from database import MarketBriefing, get_db, Stock, OHLCVDaily
from services.openrouter_llm import (
    get_openrouter_config,
    get_openrouter_runtime_status,
)
def _get_market_context(db) -> dict:
    """Collect market data for briefing context."""
    from sqlalchemy import func

    # Latest OHLCV date from DB — gunakan date dengan data terbanyak (bukan max date yang bisa sparse)
    from sqlalchemy import func as sqlfunc
    latest_date_row = (
        db.query(OHLCVDaily.date, sqlfunc.count(OHLCVDaily.ticker).label('cnt'))
        .group_by(OHLCVDaily.date)
        .having(sqlfunc.count(OHLCVDaily.ticker) >= 200)
        .order_by(OHLCVDaily.date.desc())
        .first()
    )
    if not latest_date_row:
        return {'total': 0, 'gainers': '', 'losers': '', 'sectors': '', 'date': ''}
    latest_date_row = latest_date_row[0]  # ambil date saja
    if not latest_date_row:
        return {'total': 0, 'gainers': '', 'losers': '', 'sectors': '', 'date': ''}
    latest_date = latest_date_row if isinstance(latest_date_row, str) else str(latest_date_row)[:10]

    # Get all rows for latest date sorted by ticker
    all_rows = (
        db.query(OHLCVDaily)
        .filter(OHLCVDaily.date == latest_date_row)
        .all()
    )

    # Compute change_pct on the fly (not a column)
    def get_change_pct(r):
        if r.open and r.open > 0 and r.close:
            return round(((r.close - r.open) / r.open) * 100, 2)
        return 0.0

    sorted_rows = sorted(all_rows, key=lambda r: abs(get_change_pct(r)), reverse=True)
    gainers = []
    losers = []
    for r in sorted_rows[:5]:
        name = r.ticker
        chg = get_change_pct(r)
        if chg > 0:
            gainers.append(f'{name}({chg:+.2f}%)')
        elif chg < 0:
            losers.append(f'{name}({chg:+.2f}%)')

    # Sector performance (rough)
    sectors = {}
    stocks_with_sector = (
        db.query(Stock)
        .filter(Stock.sector.isnot(None), Stock.sector != '')
        .all()
    )
    sector_map = {s.ticker: s.sector for s in stocks_with_sector}

    latest_ohlcv = (
        db.query(OHLCVDaily)
        .filter(OHLCVDaily.date == latest_date_row)
        .all()
    )
    for row in latest_ohlcv:
        sec = sector_map.get(row.ticker, 'Other')
        chg = get_change_pct(row)
        if abs(chg) > 0.01:
            sectors.setdefault(sec, []).append(chg)

    sector_avg = {}
    for sec, changes in sectors.items():
        if changes:
            sector_avg[sec] = round(sum(changes) / len(changes), 2)

    top_sectors = sorted(sector_avg.items(), key=lambda x: -abs(x[1]))[:5]

    return {
        'date': latest_date,
        'total_stocks': len(latest_ohlcv),
        'gainers': ', '.join(gainers[:3]) or 'tidak tersedia',
        'losers': ', '.join(losers[:3]) or 'tidak tersedia',
        'sectors': ', '.join(f'{s}({v:+.2f}%)' for s, v in top_sectors) or 'tidak tersedia',
    }


def _call_briefing_llm(api_key: str, model: str, context: dict, site_url: str | None, app_name: str) -> dict:
    """Call OpenRouter for market briefing."""
    import requests

    date_str = context.get('date', 'hari ini')

    system_prompt = """Anda adalah analis pasar saham IDX. Buat ringkasan pasar yang:
1. Professional, faktual, fokus pada data
2. Bahasa Indonesia formal namun mudah dibaca
3. 3-4 paragraf pendek (max 250 kata total)
4. Sertakan data: gainers, losers, sektor

Output JSON: {"content":"ringkasan lengkap","summary":"1 kalimat eksekutif","sentiment":"bullish|bearish|neutral"}
"""

    user_prompt = f"""Data pasar {date_str}:
- Total saham tercatat: {context['total_stocks']}
- Top gainers: {context['gainers']}
- Top losers: {context['losers']}
- Sektor: {context['sectors']}

Buat ringkasan pasar IDX hari ini."""

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

    response = requests.post(
        'https://openrouter.ai/api/v1/chat/completions',
        headers=headers,
        json=payload,
        timeout=30,
    )

    if response.status_code >= 400:
        error_data = response.json().get('error', {})
        msg = error_data.get('message', f'HTTP {response.status_code}')
        if response.status_code == 429:
            raise RuntimeError(f'RATE_LIMIT::{msg}')
        raise RuntimeError(msg)

    data = response.json()
    choices = data.get('choices', [])
    if not choices:
        raise RuntimeError('No choices in response')

    content = choices[0]['message']['content']
    if isinstance(content, list):
        content = ''.join(p.get('text', '') if isinstance(p, dict) else str(p) for p in content)

    parsed = json.loads(content.strip())
    return {
        'content': parsed.get('content', content),
        'summary': parsed.get('summary', ''),
        'sentiment': parsed.get('sentiment', 'neutral'),
    }


def _build_fallback_briefing(context: dict) -> dict[str, Any]:
    """Build a text briefing from market data without LLM."""
    date_str = context.get('date', 'hari ini')
    gainers = context.get('gainers', 'tidak tersedia')
    losers = context.get('losers', 'tidak tersedia')
    sectors = context.get('sectors', 'tidak tersedia')
    total = context.get('total_stocks', 0)

    content_parts = [
        f"Ringkasan Pasar IDX — {date_str}",
        f"",
        f"Data {total} saham tercatat menunjukkan pergerakan sebagai berikut:",
    ]
    gainer_items: list[str] = []
    loser_items: list[str] = []
    if gainers and gainers != 'tidak tersedia':
        content_parts.append(f"Top gainers: {gainers}")
        gainer_items = [g.strip() for g in gainers.split(',') if g.strip()]
    if losers and losers != 'tidak tersedia':
        content_parts.append(f"Top losers: {losers}")
        loser_items = [l.strip() for l in losers.split(',') if l.strip()]
    if sectors and sectors != 'tidak tersedia':
        content_parts.append(f"Performa sektor: {sectors}")

    content_parts.append(f"")
    content_parts.append("Ringkasan ini dihasilkan secara otomatis dari data pasar (tanpa LLM).")

    # Determine sentiment from gainers vs losers info
    sentiment = 'neutral'
    if len(gainer_items) > len(loser_items) and gainer_items:
        sentiment = 'bullish'
    elif len(loser_items) > len(gainer_items) and loser_items:
        sentiment = 'bearish'

    content = '\n'.join(content_parts)
    summary = f"Pasar {date_str}: {len(gainer_items)} gainers, {len(loser_items)} losers teratas."
    return {
        'content': content,
        'summary': summary,
        'sentiment': sentiment,
    }


def generate_briefing(db, force: bool = False) -> dict[str, Any]:
    """Generate daily market briefing. If force=False, skip if already exists today."""
    from datetime import datetime, timezone

    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')

    # Check if already generated today
    if not force:
        existing = db.query(MarketBriefing).filter(
            MarketBriefing.trading_date == today,
            MarketBriefing.runtime_state == 'ok',
        ).order_by(MarketBriefing.id.desc()).first()
        if existing:
            logger.info('Briefing already exists for %s, skipping', today)
            return {
                'ok': True,
                'date': today,
                'source': 'cache',
                'state': 'ok',
                'content': existing.content,
                'summary': existing.summary,
                'sentiment': existing.sentiment,
            }

    # Get config
    config = get_openrouter_config(db)
    if not config.get('enabled'):
        # Fallback: generate briefing from market data without LLM
        context = _get_market_context(db)
        fallback = _build_fallback_briefing(context)
        briefing = MarketBriefing(
            trading_date=today,
            content=fallback['content'],
            summary=fallback['summary'],
            model='fallback',
            ihsg_change=context.get('gainers', ''),
            top_gainer=context.get('gainers', ''),
            top_loser=context.get('losers', ''),
            sentiment=fallback.get('sentiment', 'neutral'),
            runtime_state='ok',
            runtime_message='LLM tidak dikonfigurasi — fallback ke ringkasan data pasar',
        )
        db.add(briefing)
        db.commit()
        logger.info('Market briefing fallback generated for %s (no LLM)', today)
        return {
            'ok': True,
            'date': today,
            'source': 'fallback',
            'state': 'ok',
            'content': fallback['content'],
            'summary': fallback['summary'],
            'sentiment': fallback['sentiment'],
            'model': 'fallback',
        }

    api_key = config['api_key']
    model = config.get('picks_model') or 'google/gemma-4-26b-a4b-it'
    site_url = config.get('site_url')
    app_name = config.get('app_name', 'RetailBijak')

    # Collect market context
    context = _get_market_context(db)

    try:
        result = _call_briefing_llm(api_key, model, context, site_url, app_name)
    except RuntimeError as e:
        msg = str(e)
        is_rate = 'RATE_LIMIT' in msg
        # Build a fallback briefing when LLM fails
        fallback = _build_fallback_briefing(context)
        db.add(MarketBriefing(
            trading_date=today,
            content=fallback['content'],
            summary=f'Gagal: {msg[:200]}',
            model=model,
            runtime_state='rate_limited' if is_rate else 'error',
            runtime_message=msg[:300],
            sentiment=fallback.get('sentiment', 'neutral'),
        ))
        db.commit()
        return {'ok': False, 'date': today, 'state': 'error', 'message': msg, 'content': fallback['content']}

    # Save to DB
    briefing = MarketBriefing(
        trading_date=today,
        content=result['content'],
        summary=result['summary'],
        model=model,
        ihsg_change=context.get('gainers', ''),
        top_gainer=context.get('gainers', ''),
        top_loser=context.get('losers', ''),
        sentiment=result.get('sentiment', 'neutral'),
        runtime_state='ok',
    )
    db.add(briefing)
    db.commit()

    logger.info('Market briefing generated for %s (model=%s)', today, model)
    return {
        'ok': True,
        'date': today,
        'source': 'llm',
        'state': 'ok',
        'content': result['content'],
        'summary': result['summary'],
        'sentiment': result['sentiment'],
        'model': model,
    }
