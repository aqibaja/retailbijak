from __future__ import annotations

import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

try:
    from database import UserSetting, WatchlistItem, PortfolioPosition, get_db
except ModuleNotFoundError:
    from backend.database import UserSetting, WatchlistItem, PortfolioPosition, get_db

try:
    from services.openrouter_llm import (
        DEFAULT_AI_PICKS_MODEL,
        DEFAULT_STOCK_ANALYSIS_MODEL,
        get_openrouter_config,
        get_openrouter_runtime_status,
    )
except ModuleNotFoundError:
    from backend.services.openrouter_llm import (
        DEFAULT_AI_PICKS_MODEL,
        DEFAULT_STOCK_ANALYSIS_MODEL,
        get_openrouter_config,
        get_openrouter_runtime_status,
    )

router = APIRouter()


def _mask_secret(value: str | None) -> str:
    value = (value or '').strip()
    if not value:
        return ''
    if len(value) <= 8:
        return '•' * len(value)
    return f'{value[:4]}••••{value[-4:]}'


def _upsert_setting(db: Session, key: str, value: str) -> None:
    row = db.query(UserSetting).filter(UserSetting.key == key).first()
    if row:
        row.value = value
    else:
        db.add(UserSetting(key=key, value=value))


class SettingsPayload(BaseModel):
    compact_table_rows: bool = False
    auto_refresh_screener: bool = False
    openrouter_api_key: str = ''
    openrouter_site_url: str = ''
    openrouter_app_name: str = 'RetailBijak'
    openrouter_stock_analysis_model: str = DEFAULT_STOCK_ANALYSIS_MODEL
    openrouter_ai_picks_model: str = DEFAULT_AI_PICKS_MODEL


class WatchlistPayload(BaseModel):
    ticker: str = Field(min_length=1)
    notes: str = ''


class PortfolioPayload(BaseModel):
    ticker: str = Field(min_length=1)
    lots: int = Field(gt=0)
    avg_price: float = Field(gt=0)


@router.get('/api/settings')
def get_settings(db: Session = Depends(get_db)):
    compact = db.query(UserSetting).filter(UserSetting.key == 'compact_table_rows').first()
    auto_refresh = db.query(UserSetting).filter(UserSetting.key == 'auto_refresh_screener').first()
    openrouter = get_openrouter_config(db)
    openrouter_runtime = get_openrouter_runtime_status(openrouter)
    return {
        'compact_table_rows': compact.value == 'true' if compact else False,
        'auto_refresh_screener': auto_refresh.value == 'true' if auto_refresh else False,
        'openrouter_enabled': openrouter['enabled'],
        'openrouter_has_api_key': bool(openrouter['api_key']),
        'openrouter_api_key_masked': _mask_secret(openrouter['api_key']),
        'openrouter_runtime_state': openrouter_runtime['state'],
        'openrouter_runtime_message': openrouter_runtime['message'],
        'openrouter_site_url': openrouter['site_url'] or '',
        'openrouter_app_name': openrouter['app_name'] or 'RetailBijak',
        'openrouter_stock_analysis_model': openrouter['stock_analysis_model'] or DEFAULT_STOCK_ANALYSIS_MODEL,
        'openrouter_ai_picks_model': openrouter['ai_picks_model'] or DEFAULT_AI_PICKS_MODEL,
    }


@router.put('/api/settings')
def update_settings(payload: SettingsPayload, db: Session = Depends(get_db)):
    updates = {
        'compact_table_rows': 'true' if payload.compact_table_rows else 'false',
        'auto_refresh_screener': 'true' if payload.auto_refresh_screener else 'false',
        'openrouter_site_url': payload.openrouter_site_url.strip(),
        'openrouter_app_name': payload.openrouter_app_name.strip() or 'RetailBijak',
        'openrouter_stock_analysis_model': payload.openrouter_stock_analysis_model.strip() or DEFAULT_STOCK_ANALYSIS_MODEL,
        'openrouter_ai_picks_model': payload.openrouter_ai_picks_model.strip() or DEFAULT_AI_PICKS_MODEL,
    }

    for key, value in updates.items():
        _upsert_setting(db, key, value)

    api_key = payload.openrouter_api_key.strip()
    if api_key and not re.fullmatch(r'\*+', api_key):
        _upsert_setting(db, 'openrouter_api_key', api_key)

    db.commit()
    config = get_openrouter_config(db)
    runtime = get_openrouter_runtime_status(config)
    return {
        'ok': True,
        'compact_table_rows': payload.compact_table_rows,
        'auto_refresh_screener': payload.auto_refresh_screener,
        'openrouter_enabled': config['enabled'],
        'openrouter_has_api_key': bool(config['api_key']),
        'openrouter_api_key_masked': _mask_secret(config['api_key']),
        'openrouter_runtime_state': runtime['state'],
        'openrouter_runtime_message': runtime['message'],
        'openrouter_site_url': config['site_url'] or '',
        'openrouter_app_name': config['app_name'] or 'RetailBijak',
        'openrouter_stock_analysis_model': config['stock_analysis_model'] or DEFAULT_STOCK_ANALYSIS_MODEL,
        'openrouter_ai_picks_model': config['ai_picks_model'] or DEFAULT_AI_PICKS_MODEL,
    }


@router.get('/api/watchlist')
def get_watchlist(db: Session = Depends(get_db)):
    rows = db.query(WatchlistItem).order_by(WatchlistItem.ticker.asc()).all()
    return {
        'count': len(rows),
        'data': [
            {
                'id': row.id,
                'ticker': row.ticker,
                'notes': row.notes,
                'created_at': row.created_at.isoformat() if row.created_at else None,
            }
            for row in rows
        ],
    }


@router.post('/api/watchlist')
def add_watchlist(payload: WatchlistPayload, db: Session = Depends(get_db)):
    ticker = payload.ticker.upper().strip()
    existing = db.query(WatchlistItem).filter(WatchlistItem.ticker == ticker).first()
    if existing:
        existing.notes = payload.notes
        db.commit()
        db.refresh(existing)
        return {'ok': True, 'item': {'id': existing.id, 'ticker': existing.ticker, 'notes': existing.notes}}

    row = WatchlistItem(ticker=ticker, notes=payload.notes)
    db.add(row)
    db.commit()
    db.refresh(row)
    return {'ok': True, 'item': {'id': row.id, 'ticker': row.ticker, 'notes': row.notes}}


@router.delete('/api/watchlist/{ticker}')
def delete_watchlist(ticker: str, db: Session = Depends(get_db)):
    row = db.query(WatchlistItem).filter(WatchlistItem.ticker == ticker.upper().strip()).first()
    if not row:
        raise HTTPException(404, 'Watchlist item not found')
    db.delete(row)
    db.commit()
    return {'ok': True}


@router.get('/api/portfolio')
def get_portfolio(db: Session = Depends(get_db)):
    rows = db.query(PortfolioPosition).order_by(PortfolioPosition.ticker.asc()).all()
    return {
        'count': len(rows),
        'data': [
            {
                'id': row.id,
                'ticker': row.ticker,
                'lots': row.lots,
                'avg_price': row.avg_price,
                'created_at': row.created_at.isoformat() if row.created_at else None,
            }
            for row in rows
        ],
    }


@router.post('/api/portfolio')
def upsert_portfolio(payload: PortfolioPayload, db: Session = Depends(get_db)):
    ticker = payload.ticker.upper().strip()
    row = db.query(PortfolioPosition).filter(PortfolioPosition.ticker == ticker).first()
    if row:
        row.lots = payload.lots
        row.avg_price = payload.avg_price
        db.commit()
        db.refresh(row)
        return {'ok': True, 'item': {'id': row.id, 'ticker': row.ticker, 'lots': row.lots, 'avg_price': row.avg_price}}

    row = PortfolioPosition(ticker=ticker, lots=payload.lots, avg_price=payload.avg_price)
    db.add(row)
    db.commit()
    db.refresh(row)
    return {'ok': True, 'item': {'id': row.id, 'ticker': row.ticker, 'lots': row.lots, 'avg_price': row.avg_price}}


@router.delete('/api/portfolio/{ticker}')
def delete_portfolio(ticker: str, db: Session = Depends(get_db)):
    row = db.query(PortfolioPosition).filter(PortfolioPosition.ticker == ticker.upper().strip()).first()
    if not row:
        raise HTTPException(404, 'Portfolio position not found')
    db.delete(row)
    db.commit()
    return {'ok': True}
