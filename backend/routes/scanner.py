from __future__ import annotations

import statistics
import time
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import SavedScreener, get_db, SessionLocal, OHLCVDaily
from stocks import get_all_tickers

try:
    from indicators_extended import get_ohlcv_dataframe
except ModuleNotFoundError:
    from backend.indicators_extended import get_ohlcv_dataframe

try:
    from updaters.pattern_detector import (
        PATTERN_DETECTORS, LOCALE_NAMES_ID, detect_all_patterns,
    )
except ModuleNotFoundError:
    from backend.updaters.pattern_detector import (
        PATTERN_DETECTORS, LOCALE_NAMES_ID, detect_all_patterns,
    )

router = APIRouter(prefix="/api", tags=["scanner"])


@router.get("/scanner")
def scanner(rule: str | None = None):
    # TODO: scan_universe function not defined, returning demo data
    demo_rows = [
        {"ticker": "BBCA", "price": 1000, "per": 8, "pbv": 1.2, "roe": 18, "volume_spike": 2.5, "trend_score": 60, "breakout": True, "market_cap": 2_000_000_000_000, "dividend_yield": 2.5, "dividend_consistency": 3},
        {"ticker": "GAMA", "price": 500, "per": 50, "pbv": 8, "roe": 2, "volume_spike": 3.0, "market_cap": 300_000_000_000, "volatility_score": 85},
    ]
    return {"count": len(demo_rows), "data": demo_rows}


# ─── Saved Screeners CRUD (19.1) ─────────────────


class SavedScreenerPayload(BaseModel):
    name: str
    filters_json: str = "{}"
    active: bool = True


@router.get("/screener/saved/{screener_id}")
def get_saved_screener(screener_id: int, db: Session = Depends(get_db)):
    row = db.query(SavedScreener).filter(SavedScreener.id == screener_id).first()
    if not row:
        raise HTTPException(404, 'Saved screener not found')
    return {
        'data': {
            'id': row.id,
            'name': row.name,
            'filters_json': row.filters_json,
            'active': bool(row.active),
            'match_count': row.match_count,
            'created_at': row.created_at.isoformat() if row.created_at else None,
        }
    }


@router.get("/screener/saved")
def list_saved_screeners(db: Session = Depends(get_db)):
    rows = db.query(SavedScreener).order_by(SavedScreener.created_at.desc()).all()
    return {
        'count': len(rows),
        'data': [
            {
                'id': r.id,
                'name': r.name,
                'filters_json': r.filters_json,
                'active': bool(r.active),
                'match_count': r.match_count,
                'created_at': r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ],
    }


@router.post("/screener/saved")
def create_saved_screener(payload: SavedScreenerPayload, db: Session = Depends(get_db)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(400, 'Name is required')
    row = SavedScreener(name=name, filters_json=payload.filters_json, active=1 if payload.active else 0)
    db.add(row)
    db.commit()
    db.refresh(row)
    return {'ok': True, 'id': row.id, 'name': row.name}


@router.put("/screener/saved/{screener_id}")
def update_saved_screener(screener_id: int, payload: SavedScreenerPayload, db: Session = Depends(get_db)):
    row = db.query(SavedScreener).filter(SavedScreener.id == screener_id).first()
    if not row:
        raise HTTPException(404, 'Saved screener not found')
    row.name = payload.name.strip()
    row.filters_json = payload.filters_json
    row.active = 1 if payload.active else 0
    db.commit()
    return {'ok': True, 'id': row.id}


@router.delete("/screener/saved/{screener_id}")
def delete_saved_screener(screener_id: int, db: Session = Depends(get_db)):
    row = db.query(SavedScreener).filter(SavedScreener.id == screener_id).first()
    if not row:
        raise HTTPException(404, 'Saved screener not found')
    db.delete(row)
    db.commit()
    return {'ok': True}


# ─── 26.3.3 — Pattern Backtest ─────────────────────────


def _compute_forward_returns(closes, idx, horizons=(5, 10, 20)):
    """Compute forward returns at given horizons from index idx."""
    result = {}
    for h in horizons:
        target = idx + h
        if target < len(closes):
            result[f'{h}d'] = (closes[target] - closes[idx]) / closes[idx] * 100
        else:
            result[f'{h}d'] = None
    return result


def _aggregate_pattern_stats(pattern_returns, pattern_info):
    """Aggregate raw returns into per-pattern statistics."""
    result = []
    now = datetime.utcnow()

    for pat_name, rets in pattern_returns.items():
        info = pattern_info[pat_name]

        def stats_for_horizon(horizon):
            data = [r for r in rets[horizon] if r is not None]
            if len(data) < 5:
                return None
            wins = sum(1 for r in data if r > 0)
            total = len(data)
            sorted_d = sorted(data)
            median = sorted_d[total // 2]
            return {
                'win_rate': round(wins / total * 100, 1),
                'avg_return': round(sum(data) / total, 2),
                'max_profit': round(max(data), 2),
                'max_loss': round(min(data), 2),
                'median_return': round(median, 2),
                'total': total,
            }

        s5 = stats_for_horizon('5d')
        s10 = stats_for_horizon('10d')
        s20 = stats_for_horizon('20d')

        if not s5:
            continue

        wr = s5['win_rate']
        if wr >= 60:
            strength = 'strong'
        elif wr >= 50:
            strength = 'moderate'
        else:
            strength = 'weak'

        result.append({
            'pattern': pat_name,
            'label': info.get('label_id', info.get('label', pat_name)),
            'direction': info.get('direction', 'neutral'),
            'total_occurrences': s5['total'],
            'win_rate_5d': s5['win_rate'],
            'win_rate_10d': s10['win_rate'] if s10 else 0,
            'win_rate_20d': s20['win_rate'] if s20 else 0,
            'avg_return_5d': s5['avg_return'],
            'avg_return_10d': s10['avg_return'] if s10 else 0,
            'avg_return_20d': s20['avg_return'] if s20 else 0,
            'max_profit': s5['max_profit'],
            'max_loss': s5['max_loss'],
            'median_return_5d': s5['median_return'],
            'strength': strength,
        })

    result.sort(key=lambda x: -x['total_occurrences'])
    return result


@router.get('/backtest/patterns')
def backtest_patterns(
    timeframe: str = Query('1d', description='Timeframe: 1d, 4h, 1wk'),
    limit: int = Query(200, description='Max candles per ticker'),
):
    """
    Backtest all candlestick patterns across all historical data.
    Returns per-pattern performance statistics including win rates,
    average returns, and recent accuracy.
    """
    valid_tf = ['1d', '4h', '1wk']
    if timeframe not in valid_tf:
        raise HTTPException(400, f'Invalid timeframe. Valid: {valid_tf}')

    db = SessionLocal()
    start_ts = time.time()
    try:
        tickers = get_all_tickers()
        # For quick results, limit to most liquid tickers (top 100 by data availability)
        # Fetch all available tickers that have enough data
        import random
        random.shuffle(tickers)
        sample = tickers[:200]  # limit to 200 tickers for performance

        # Data structures: pattern -> list of returns at each horizon
        pattern_returns = {}
        pattern_info = {}
        # Also track recent patterns (last 60 candles) for "top this month"
        recent_pattern_hits = {}

        scanned = 0
        skipped = 0

        for ticker in sample:
            try:
                df = get_ohlcv_dataframe(db, ticker, limit=limit)
                if df.empty or len(df) < 30:
                    skipped += 1
                    continue

                opens = df['open'].astype(float).tolist()
                highs = df['high'].astype(float).tolist()
                lows = df['low'].astype(float).tolist()
                closes = df['close'].astype(float).tolist()
                dates = df.index.tolist()

                n = len(closes)
                all_patterns = detect_all_patterns(opens, highs, lows, closes, lookback=n)

                for p in all_patterns:
                    pat_name = p['pattern']
                    idx = p['index']

                    if pat_name not in pattern_returns:
                        pattern_returns[pat_name] = {'5d': [], '10d': [], '20d': []}
                        pattern_info[pat_name] = {
                            'label': p.get('label', pat_name),
                            'label_id': LOCALE_NAMES_ID.get(pat_name, p.get('label', pat_name)),
                            'direction': p.get('direction', 'neutral'),
                        }

                    returns = _compute_forward_returns(closes, idx, (5, 10, 20))
                    for hk in ('5d', '10d', '20d'):
                        if returns.get(hk) is not None:
                            pattern_returns[pat_name][hk].append(returns[hk])

                    # Track recent patterns (last 60 candles) for accuracy scoring
                    if idx >= n - 60:
                        if pat_name not in recent_pattern_hits:
                            recent_pattern_hits[pat_name] = {'wins': 0, 'total': 0, 'returns': []}
                        r5 = returns.get('5d')
                        if r5 is not None:
                            recent_pattern_hits[pat_name]['total'] += 1
                            if r5 > 0:
                                recent_pattern_hits[pat_name]['wins'] += 1
                            recent_pattern_hits[pat_name]['returns'].append(r5)

                scanned += 1

            except Exception:
                skipped += 1
                continue

        # Compute aggregate stats
        patterns = _aggregate_pattern_stats(pattern_returns, pattern_info)

        # Compute recent accuracy
        recent_accuracy = {}
        for pat_name, hits in recent_pattern_hits.items():
            if hits['total'] >= 3:
                acc = round(hits['wins'] / hits['total'] * 100, 1)
                recent_accuracy[pat_name] = {
                    'accuracy_30d': acc,
                    'total_30d': hits['total'],
                    'avg_return_30d': round(sum(hits['returns']) / len(hits['returns']), 2),
                }

        # Find top pattern this month
        top_pattern_month = None
        if recent_accuracy:
            top_name = max(recent_accuracy, key=lambda k: recent_accuracy[k]['accuracy_30d'])
            top_pattern_month = {
                'pattern': top_name,
                'accuracy_30d': recent_accuracy[top_name]['accuracy_30d'],
            }

        duration = round(time.time() - start_ts, 1)

        return {
            'status': 'ok',
            'timeframe': timeframe,
            'scanned': scanned,
            'skipped': skipped,
            'duration_seconds': duration,
            'patterns': patterns,
            'recent_accuracy': recent_accuracy,
            'top_pattern_month': top_pattern_month,
        }

    except Exception as e:
        return {'status': 'error', 'message': str(e), 'patterns': [], 'recent_accuracy': {}}
    finally:
        db.close()
