from __future__ import annotations

import json
import re

from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

try:
    from database import UserSetting, WatchlistItem, WatchlistGroup, PortfolioPosition, TransactionLog, get_db
except ModuleNotFoundError:
    from backend.database import UserSetting, WatchlistItem, WatchlistGroup, PortfolioPosition, TransactionLog, get_db

try:
    from database import Stock, OHLCVDaily
except ModuleNotFoundError:
    from backend.database import Stock, OHLCVDaily

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
    # Enrich with latest price & change
    enriched = []
    for row in rows:
        price_row = db.query(OHLCVDaily).filter(
            OHLCVDaily.ticker == row.ticker
        ).order_by(OHLCVDaily.date.desc()).first()
        # Get previous close for change calculation
        prev_row = None
        if price_row:
            prev_row = db.query(OHLCVDaily).filter(
                OHLCVDaily.ticker == row.ticker,
                OHLCVDaily.date < price_row.date
            ).order_by(OHLCVDaily.date.desc()).first()

        price = price_row.close if price_row else None
        prev_close = prev_row.close if prev_row else None
        change = (price - prev_close) if (price and prev_close) else None
        change_pct = ((price - prev_close) / prev_close * 100) if (price and prev_close) else None

        enriched.append({
            'id': row.id,
            'ticker': row.ticker,
            'notes': row.notes,
            'group_id': row.group_id,
            'price': price,
            'change': round(change, 2) if change is not None else None,
            'change_pct': round(change_pct, 2) if change_pct is not None else None,
            'created_at': row.created_at.isoformat() if row.created_at else None,
        })
    return {'count': len(enriched), 'data': enriched}


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


@router.post('/api/portfolio/seed-sample')
def seed_sample_portfolio(db: Session = Depends(get_db)):
    """Seed sample portfolio data for demo/first-time user."""
    sample = [
        {'ticker': 'BBCA', 'lots': 2, 'avg_price': 6225.0},
        {'ticker': 'TLKM', 'lots': 5, 'avg_price': 3800.0},
        {'ticker': 'ASII', 'lots': 3, 'avg_price': 5100.0},
        {'ticker': 'BMRI', 'lots': 4, 'avg_price': 7200.0},
        {'ticker': 'BBRI', 'lots': 3, 'avg_price': 4800.0},
    ]
    created = 0
    for item in sample:
        existing = db.query(PortfolioPosition).filter(PortfolioPosition.ticker == item['ticker']).first()
        if not existing:
            row = PortfolioPosition(ticker=item['ticker'], lots=item['lots'], avg_price=item['avg_price'])
            db.add(row)
            created += 1
    # Add some sample transactions
    if created > 0:
        from datetime import datetime, timedelta
        sample_txns = [
            {'ticker': 'BBCA', 'type': 'buy', 'price': 6100, 'lots': 2, 'date': datetime.utcnow() - timedelta(days=30)},
            {'ticker': 'TLKM', 'type': 'buy', 'price': 3850, 'lots': 5, 'date': datetime.utcnow() - timedelta(days=45)},
            {'ticker': 'ASII', 'type': 'buy', 'price': 5050, 'lots': 3, 'date': datetime.utcnow() - timedelta(days=20)},
            {'ticker': 'BMRI', 'type': 'buy', 'price': 7100, 'lots': 4, 'date': datetime.utcnow() - timedelta(days=60)},
            {'ticker': 'BBRI', 'type': 'buy', 'price': 4750, 'lots': 3, 'date': datetime.utcnow() - timedelta(days=15)},
        ]
        for txn in sample_txns:
            txn_row = TransactionLog(
                ticker=txn['ticker'],
                transaction_type=txn['type'],
                price=txn['price'],
                lots=txn['lots'],
                shares=txn['lots'] * 100,
                total=txn['price'] * txn['lots'] * 100,
                transaction_date=txn['date'],
            )
            db.add(txn_row)
    db.commit()
    return {'ok': True, 'created': created, 'message': f'{created} posisi sample ditambahkan'}


@router.post('/api/portfolio/import-csv')
def import_portfolio_csv(payload: dict = Body(...), db: Session = Depends(get_db)):
    """Import portfolio positions from CSV body.
    Expects: { 'rows': [{'ticker':'BBCA','lots':2,'avg_price':6225}, ...] }
    Mode: 'overwrite' (default) clears all existing, 'append' adds to existing.
    """
    rows = payload.get('rows', [])
    mode = payload.get('mode', 'overwrite')
    if not rows:
        raise HTTPException(400, 'No rows provided')
    if mode == 'overwrite':
        db.query(PortfolioPosition).delete()
        db.query(TransactionLog).delete()
    created = 0
    errors = []
    for i, row in enumerate(rows):
        ticker = str(row.get('ticker', '')).upper().strip()
        if not ticker:
            errors.append(f'Row {i}: missing ticker')
            continue
        try:
            lots = int(row.get('lots', 0))
            avg_price = float(row.get('avg_price', 0))
        except (ValueError, TypeError):
            errors.append(f'Row {i}: invalid number format')
            continue
        if lots <= 0 or avg_price <= 0:
            errors.append(f'Row {i}: lots and avg_price must be positive')
            continue
        existing = db.query(PortfolioPosition).filter(PortfolioPosition.ticker == ticker).first()
        if existing:
            existing.lots = lots
            existing.avg_price = avg_price
        else:
            pos = PortfolioPosition(ticker=ticker, lots=lots, avg_price=avg_price)
            db.add(pos)
        created += 1
    db.commit()
    return {'ok': True, 'created': created, 'errors': errors, 'message': f'{created} posisi diimport, {len(errors)} error'}


@router.get('/api/portfolio/sample-csv')
def download_sample_csv():
    """Download sample CSV template for portfolio import."""
    import csv, io
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['ticker', 'lots', 'avg_price', 'notes'])
    writer.writerow(['BBCA', '2', '6225', 'Bank Central Asia'])
    writer.writerow(['BBRI', '3', '4800', 'Bank Rakyat Indonesia'])
    writer.writerow(['TLKM', '5', '3800', 'Telkom Indonesia'])
    writer.writerow(['ASII', '3', '5100', 'Astra International'])
    writer.writerow(['BMRI', '4', '7200', 'Bank Mandiri'])
    output.seek(0)
    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type='text/csv',
        headers={'Content-Disposition': 'attachment; filename=retailbijak_portfolio_template.csv'}
    )


@router.get('/api/portfolio/summary')
def portfolio_summary(db: Session = Depends(get_db)):
    """P&L calculation with sector breakdown for portfolio positions."""
    from collections import defaultdict
    positions = db.query(PortfolioPosition).order_by(PortfolioPosition.ticker.asc()).all()
    if not positions:
        return {'count': 0, 'data': {'positions': [], 'total_invested': 0, 'current_value': 0, 'pnl': 0, 'pnl_pct': 0, 'sectors': {}}}

    total_invested = 0
    current_value = 0
    pos_data = []
    sector_groups = defaultdict(lambda: {'invested': 0, 'value': 0, 'pnl': 0})

    for pos in positions:
        ticker = pos.ticker
        lots = pos.lots or 0
        avg_price = pos.avg_price or 0
        shares = lots * 100  # 1 lot = 100 shares
        invested = avg_price * shares
        total_invested += invested

        # Latest price
        latest = db.query(OHLCVDaily).filter(
            OHLCVDaily.ticker == ticker
        ).order_by(OHLCVDaily.date.desc()).first()
        current_price = float(latest.close) if latest and latest.close else avg_price
        val = current_price * shares
        current_value += val

        pnl = val - invested
        pnl_pct = ((current_price - avg_price) / avg_price * 100) if avg_price else 0

        # Sector
        stock = db.query(Stock).filter(Stock.ticker == ticker).first()
        sector = stock.sector if stock and stock.sector else 'Lainnya'

        sector_groups[sector]['invested'] += invested
        sector_groups[sector]['value'] += val
        sector_groups[sector]['pnl'] += pnl

        pos_data.append({
            'ticker': ticker,
            'name': stock.name if stock else ticker,
            'sector': sector,
            'lots': lots,
            'avg_price': round(avg_price, 2),
            'current_price': round(current_price, 2),
            'invested': round(invested, 2),
            'value': round(val, 2),
            'pnl': round(pnl, 2),
            'pnl_pct': round(pnl_pct, 2),
        })

    overall_pnl = current_value - total_invested
    overall_pnl_pct = ((current_value / total_invested) - 1) * 100 if total_invested else 0

    sectors = {}
    for s, v in sector_groups.items():
        sectors[s] = {
            'invested': round(v['invested'], 2),
            'value': round(v['value'], 2),
            'pnl': round(v['pnl'], 2),
        }

    return {
        'count': len(pos_data),
        'data': {
            'positions': pos_data,
            'total_invested': round(total_invested, 2),
            'current_value': round(current_value, 2),
            'pnl': round(overall_pnl, 2),
            'pnl_pct': round(overall_pnl_pct, 2),
            'sectors': sectors,
        },
    }


@router.get('/api/portfolio/export-csv')
def export_portfolio_csv(db: Session = Depends(get_db)):
    """Export portfolio positions as CSV with current prices and P&L."""
    from io import StringIO
    import csv

    positions = db.query(PortfolioPosition).order_by(PortfolioPosition.ticker.asc()).all()
    rows = []
    for pos in positions:
        ticker = pos.ticker
        lots = pos.lots or 0
        avg_price = pos.avg_price or 0
        shares = lots * 100
        invested = avg_price * shares
        latest = db.query(OHLCVDaily).filter(
            OHLCVDaily.ticker == ticker
        ).order_by(OHLCVDaily.date.desc()).first()
        current_price = float(latest.close) if latest and latest.close else avg_price
        value = current_price * shares
        pnl = value - invested
        pnl_pct = ((current_price - avg_price) / avg_price * 100) if avg_price else 0
        stock = db.query(Stock).filter(Stock.ticker == ticker).first()
        rows.append({
            'Ticker': ticker,
            'Nama': stock.name if stock else ticker,
            'Sektor': stock.sector if stock and stock.sector else '-',
            'Lot': lots,
            'Lembar': shares,
            'Harga_Rata': round(avg_price, 2),
            'Harga_Saat_Ini': round(current_price, 2),
            'Investasi': round(invested, 2),
            'Nilai_Saat_Ini': round(value, 2),
            'P&L': round(pnl, 2),
            'P&L_%': round(pnl_pct, 2),
        })

    output = StringIO()
    writer = csv.DictWriter(output, fieldnames=rows[0].keys() if rows else [])
    writer.writeheader()
    writer.writerows(rows)
    csv_content = output.getvalue()
    output.close()

    from fastapi.responses import Response
    
    if not rows:
        return Response(
            content="Ticker,Nama,Sektor,Lot,Lembar,Harga_Rata,Harga_Saat_Ini,Investasi,Nilai_Saat_Ini,P&L,P&L_%\n",
            media_type='text/csv',
            headers={
                'Content-Disposition': 'attachment; filename=retailbijak_portfolio.csv',
                'Cache-Control': 'no-cache',
            },
        )

    return Response(
        content=csv_content,
        media_type='text/csv',
        headers={
            'Content-Disposition': 'attachment; filename=retailbijak_portfolio.csv',
            'Cache-Control': 'no-cache',
        },
    )


# ─── Transaction Log CRUD ─────────────────────────


class TransactionPayload(BaseModel):
    ticker: str = Field(min_length=1, max_length=10)
    transaction_type: str = Field(pattern=r'^(buy|sell)$')
    price: float = Field(gt=0)
    lots: int = Field(gt=0, le=99999)
    fee: float = Field(default=0, ge=0)
    transaction_date: str = ''  # ISO date string, default = now
    notes: str = ''


@router.get('/api/portfolio/transactions')
def list_transactions(ticker: str = '', limit: int = 50, offset: int = 0, db: Session = Depends(get_db)):
    q = db.query(TransactionLog)
    if ticker:
        q = q.filter(TransactionLog.ticker == ticker.upper().strip())
    total = q.count()
    rows = q.order_by(TransactionLog.transaction_date.desc()).offset(offset).limit(limit).all()
    return {
        'count': len(rows),
        'total': total,
        'data': [{
            'id': r.id,
            'ticker': r.ticker,
            'transaction_type': r.transaction_type,
            'price': r.price,
            'lots': r.lots,
            'shares': r.shares,
            'fee': r.fee,
            'total': r.total,
            'transaction_date': r.transaction_date.isoformat()[:19] if r.transaction_date else '',
            'notes': r.notes,
        } for r in rows],
    }


@router.post('/api/portfolio/transactions')
def create_transaction(payload: TransactionPayload, db: Session = Depends(get_db)):
    from datetime import datetime
    ticker = payload.ticker.upper().strip()
    shares = payload.lots * 100
    total_cost = (payload.price * shares) + payload.fee
    txn_date = datetime.utcnow()
    if payload.transaction_date:
        try:
            txn_date = datetime.fromisoformat(payload.transaction_date)
        except (ValueError, TypeError):
            pass
    txn = TransactionLog(
        ticker=ticker,
        transaction_type=payload.transaction_type,
        price=payload.price,
        lots=payload.lots,
        shares=shares,
        fee=payload.fee,
        total=total_cost,
        transaction_date=txn_date,
        notes=payload.notes,
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)
    return {'ok': True, 'id': txn.id, 'message': f'{payload.transaction_type.upper()} {ticker} ({payload.lots} lot @ {payload.price}) dicatat.'}


@router.delete('/api/portfolio/transactions/{txn_id}')
def delete_transaction(txn_id: int, db: Session = Depends(get_db)):
    txn = db.query(TransactionLog).filter(TransactionLog.id == txn_id).first()
    if not txn:
        raise HTTPException(404, 'Transaksi tidak ditemukan')
    db.delete(txn)
    db.commit()
    return {'ok': True, 'message': f'Transaksi {txn_id} dihapus.'}


@router.get('/api/portfolio/transactions/pnl')
def transaction_pnl(ticker: str = '', db: Session = Depends(get_db)):
    """Calculate realized and unrealized P&L from transaction log + current prices."""
    from collections import defaultdict
    q = db.query(TransactionLog).order_by(TransactionLog.transaction_date.asc())
    if ticker:
        q = q.filter(TransactionLog.ticker == ticker.upper().strip())
    txns = q.all()

    positions = defaultdict(lambda: {'shares': 0, 'total_cost': 0, 'realized_pnl': 0})
    realized_total = 0
    total_buy_cost = 0
    current_shares_map = defaultdict(int)

    for txn in txns:
        t = txn.transaction_type
        shares = txn.shares
        cost = txn.total
        tick = txn.ticker

        if t == 'buy':
            positions[tick]['shares'] += shares
            positions[tick]['total_cost'] += cost
            total_buy_cost += cost
            current_shares_map[tick] += shares
        elif t == 'sell':
            avg_cost_per_share = positions[tick]['total_cost'] / positions[tick]['shares'] if positions[tick]['shares'] else 0
            sold_cost = avg_cost_per_share * shares
            realized_pnl = cost - sold_cost  # sell_total - buy_cost_of_sold_shares
            positions[tick]['shares'] -= shares
            positions[tick]['total_cost'] -= sold_cost
            positions[tick]['realized_pnl'] += realized_pnl
            realized_total += realized_pnl
            total_buy_cost -= sold_cost
            current_shares_map[tick] -= shares

    # Unrealized P&L from current prices
    unrealized_total = 0
    unrealized_items = []
    for tick, shares in current_shares_map.items():
        if shares <= 0:
            continue
        latest = db.query(OHLCVDaily).filter(
            OHLCVDaily.ticker == tick
        ).order_by(OHLCVDaily.date.desc()).first()
        current_price = float(latest.close) if latest and latest.close else 0
        current_value = current_price * shares
        cost_basis = positions[tick]['total_cost']
        unrealized = current_value - cost_basis
        unrealized_total += unrealized
        unrealized_items.append({
            'ticker': tick,
            'shares': shares,
            'cost_basis': round(cost_basis, 2),
            'current_price': round(current_price, 2),
            'current_value': round(current_value, 2),
            'unrealized_pnl': round(unrealized, 2),
            'unrealized_pnl_pct': round((unrealized / cost_basis) * 100, 2) if cost_basis else 0,
        })

    return {
        'realized_pnl': round(realized_total, 2),
        'unrealized_pnl': round(unrealized_total, 2),
        'total_pnl': round(realized_total + unrealized_total, 2),
        'realized_items': [],
        'unrealized_items': unrealized_items,
    }


@router.get('/api/screener-presets')
def get_screener_presets(db: Session = Depends(get_db)):
    row = db.query(UserSetting).filter(UserSetting.key == 'screener_presets').first()
    try:
        data = json.loads(row.value) if row and row.value else []
    except (json.JSONDecodeError, TypeError):
        data = []
    return {'data': data}


@router.post('/api/screener-presets')
def save_screener_presets(payload: dict = Body(...), db: Session = Depends(get_db)):
    presets = payload.get('presets', [])
    _upsert_setting(db, 'screener_presets', json.dumps(presets))
    db.commit()
    return {'ok': True, 'count': len(presets)}


@router.get('/api/portfolio/rebalance')
def portfolio_rebalance(db: Session = Depends(get_db)):
    """Calculate current vs target sector allocation and suggest rebalancing."""
    from collections import defaultdict

    positions = db.query(PortfolioPosition).all()
    if not positions:
        return {'has_data': False, 'message': 'Belum ada posisi portofolio'}

    # Get latest prices and sector info
    ticker_values = {}
    sector_map = {}
    total_value = 0

    for pos in positions:
        ticker = pos.ticker
        latest = db.query(OHLCVDaily).filter(
            OHLCVDaily.ticker == ticker
        ).order_by(OHLCVDaily.date.desc()).first()
        price = latest.close if latest else pos.avg_price
        value = price * pos.lots * 100
        ticker_values[ticker] = {'lots': pos.lots, 'price': price, 'value': value, 'avg_price': pos.avg_price}
        total_value += value

        stock = db.query(Stock).filter(Stock.ticker == ticker).first()
        sector_map[ticker] = stock.sector if stock and stock.sector else 'Lainnya'

    # Current allocation by sector
    sector_alloc = defaultdict(lambda: {'value': 0, 'tickers': []})
    for ticker, info in ticker_values.items():
        sec = sector_map.get(ticker, 'Lainnya')
        sector_alloc[sec]['value'] += info['value']
        sector_alloc[sec]['tickers'].append(ticker)

    # Target: equal-weight across sectors
    num_sectors = len(sector_alloc)
    target_pct = 100.0 / num_sectors if num_sectors > 0 else 0

    rebalance_suggestions = []
    for sector, data in sorted(sector_alloc.items(), key=lambda x: -x[1]['value']):
        current_pct = (data['value'] / total_value * 100) if total_value > 0 else 0
        diff = current_pct - target_pct
        action = 'overweight' if diff > 2 else ('underweight' if diff < -2 else 'balanced')
        rebalance_suggestions.append({
            'sector': sector,
            'current_pct': round(current_pct, 1),
            'target_pct': round(target_pct, 1),
            'diff': round(diff, 1),
            'value': round(data['value']),
            'action': action,
            'tickers': data['tickers'],
        })

    return {
        'has_data': True,
        'total_value': round(total_value),
        'num_sectors': num_sectors,
        'suggestions': rebalance_suggestions,
    }

@router.get('/api/portfolio/analytics')
def portfolio_analytics(db: Session = Depends(get_db)):
    from collections import defaultdict
    import math

    # 1. Equity curve: portfolio value over time
    txns = db.query(TransactionLog).order_by(TransactionLog.transaction_date.asc()).all()
    equity_curve = []
    running_map = defaultdict(lambda: {'shares': 0, 'total_cost': 0.0})
    unique_tickers = set()
    all_dates = set()

    for txn in txns:
        t, shares, cost, tick = txn.transaction_type, txn.shares, float(txn.total), txn.ticker
        unique_tickers.add(tick)
        if t == 'buy':
            running_map[tick]['shares'] += shares
            running_map[tick]['total_cost'] += cost
        elif t == 'sell':
            avg = running_map[tick]['total_cost'] / running_map[tick]['shares'] if running_map[tick]['shares'] else 0
            running_map[tick]['shares'] -= shares
            running_map[tick]['total_cost'] -= avg * shares

    if unique_tickers:
        ohclv_rows = db.query(OHLCVDaily).filter(
            OHLCVDaily.ticker.in_(list(unique_tickers))
        ).order_by(OHLCVDaily.date.asc()).all()

        date_prices = defaultdict(dict)
        for row in ohclv_rows:
            date_prices[row.date.isoformat()][row.ticker] = float(row.close or 0)
            all_dates.add(row.date.isoformat())

        sorted_dates = sorted(all_dates)
        # Replay transactions to get equity at each date
        replay = defaultdict(lambda: {'shares': 0, 'total_cost': 0.0})
        realized_cash = 0.0
        txn_idx = 0

        for d in sorted_dates:
            # Process transactions up to this date
            while txn_idx < len(txns) and txns[txn_idx].transaction_date.isoformat() <= d:
                txn = txns[txn_idx]
                t, shares, cost, tick = txn.transaction_type, txn.shares, float(txn.total), txn.ticker
                if t == 'buy':
                    replay[tick]['shares'] += shares
                    replay[tick]['total_cost'] += cost
                elif t == 'sell':
                    avg = replay[tick]['total_cost'] / replay[tick]['shares'] if replay[tick]['shares'] else 0
                    replay[tick]['shares'] -= shares
                    replay[tick]['total_cost'] -= avg * shares
                    realized_cash += cost
                txn_idx += 1
            # Calculate value at this date
            mv = 0.0
            for tick, pos in replay.items():
                if pos['shares'] > 0:
                    price = date_prices.get(d, {}).get(tick, 0)
                    mv += price * pos['shares']
            total_value = mv + realized_cash
            if total_value > 0:
                equity_curve.append({'date': d, 'value': round(total_value, 2)})

    # 2. Sector allocation
    positions = db.query(PortfolioPosition).all()
    sector_value = defaultdict(float)
    total_portfolio_value = 0.0

    for pos in positions:
        latest = db.query(OHLCVDaily).filter(
            OHLCVDaily.ticker == pos.ticker
        ).order_by(OHLCVDaily.date.desc()).first()
        price = float(latest.close) if latest and latest.close else float(pos.avg_price or 0)
        val = price * pos.lots * 100  # 1 lot = 100 shares
        sector_name = 'Lainnya'
        if pos.ticker:
            stock = db.query(Stock).filter(Stock.ticker == pos.ticker).first()
            if stock and stock.sector:
                sector_name = stock.sector
        sector_value[sector_name] += val
        total_portfolio_value += val

    sectors = [{
        'name': name,
        'value': round(val, 2),
        'pct': round((val / total_portfolio_value) * 100, 1) if total_portfolio_value > 0 else 0
    } for name, val in sorted(sector_value.items(), key=lambda x: -x[1])]

    return {
        'equity_curve': equity_curve,
        'sectors': sectors,
        'total_value': round(total_portfolio_value, 2),
        'has_data': bool(equity_curve or sectors),
    }


@router.get('/api/watchlist-groups')
def list_watchlist_groups(db: Session = Depends(get_db)):
    groups = db.query(WatchlistGroup).order_by(WatchlistGroup.sort_order).all()
    return {'data': [{'id': g.id, 'name': g.name, 'icon': g.icon, 'sort_order': g.sort_order, 'count': db.query(WatchlistItem).filter(WatchlistItem.group_id == g.id).count()} for g in groups]}


class WatchlistGroupPayload(BaseModel):
    name: str
    icon: str = 'folder'


@router.post('/api/watchlist-groups')
def create_watchlist_group(payload: WatchlistGroupPayload, db: Session = Depends(get_db)):
    max_order = db.query(WatchlistGroup.sort_order).order_by(WatchlistGroup.sort_order.desc()).first()
    group = WatchlistGroup(name=payload.name.strip(), icon=payload.icon.strip() or 'folder', sort_order=(max_order[0] or 0) + 1 if max_order else 1)
    db.add(group)
    db.commit()
    db.refresh(group)
    return {'ok': True, 'id': group.id}


@router.put('/api/watchlist-groups/{group_id}')
def update_watchlist_group(group_id: int, payload: WatchlistGroupPayload, db: Session = Depends(get_db)):
    group = db.query(WatchlistGroup).filter(WatchlistGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail='Group not found')
    group.name = payload.name.strip()
    group.icon = payload.icon.strip() or 'folder'
    db.commit()
    return {'ok': True}


@router.delete('/api/watchlist-groups/{group_id}')
def delete_watchlist_group(group_id: int, db: Session = Depends(get_db)):
    db.query(WatchlistItem).filter(WatchlistItem.group_id == group_id).update({'group_id': None})
    db.query(WatchlistGroup).filter(WatchlistGroup.id == group_id).delete()
    db.commit()
    return {'ok': True}


@router.put('/api/watchlist/{ticker}/group')
def set_watchlist_group(ticker: str, group_id: int = 0, db: Session = Depends(get_db)):
    item = db.query(WatchlistItem).filter(WatchlistItem.ticker == ticker.upper().strip()).first()
    if not item:
        raise HTTPException(status_code=404, detail='Watchlist item not seen')
    item.group_id = group_id or None
    db.commit()
    return {'ok': True}
