from __future__ import annotations

from typing import Any

import pandas as pd
from sqlalchemy.orm import Session


def _serialize_signal_rows(signals) -> list[dict[str, Any]]:
    data: list[dict[str, Any]] = []
    for signal in signals:
        data.append({
            'ticker': signal.ticker,
            'timeframe': signal.timeframe,
            'signal_type': signal.signal_type,
            'signal_date': signal.signal_date.isoformat() if signal.signal_date else None,
            'price': signal.price,
            'entry_price': signal.entry_price,
            'target_price': signal.target_price,
            'stop_loss': signal.stop_loss,
            'rationale': signal.rationale,
        })
    return data


def _compute_analysis_metrics_from_ohlcv(db: Session, ticker: str) -> dict[str, Any]:
    try:
        from indicators_extended import get_ohlcv_dataframe, calculate_all_indicators
    except ModuleNotFoundError:
        from backend.indicators_extended import get_ohlcv_dataframe, calculate_all_indicators

    df = get_ohlcv_dataframe(db, ticker, limit=100)
    if df.empty or len(df) < 20:
        return {'volume_spike': 1.0, 'trend_score': 50, 'volatility_score': 50, 'breakout': False}

    df = calculate_all_indicators(df)
    latest = df.iloc[-1]

    close = float(latest['close']) if pd.notna(latest['close']) else 0
    volume = float(latest['volume']) if pd.notna(latest['volume']) else 0

    vol_sma20 = latest.get('vol_sma_20')
    if pd.isna(vol_sma20) or vol_sma20 is None or vol_sma20 == 0:
        vol_sma20 = volume
    volume_spike = round(volume / vol_sma20, 2) if vol_sma20 else 1.0

    sma5 = latest.get('sma_5')
    sma20 = latest.get('sma_20')
    sma50 = latest.get('sma_50')
    rsi = latest.get('rsi')
    trend = 50
    if pd.notna(sma5) and pd.notna(sma20):
        if close > sma5 > sma20:
            trend += 20
        elif close < sma5 < sma20:
            trend -= 20
        elif close > sma20:
            trend += 10
        elif close < sma20:
            trend -= 10
    if pd.notna(sma50):
        trend += 10 if close > sma50 else -10
    if pd.notna(rsi):
        trend += (rsi - 50) * 0.3
    trend_score = max(min(int(trend), 100), 0)

    atr = latest.get('atr')
    if pd.notna(atr) and close > 0:
        atr_pct = (atr / close) * 100
        vol_score = int(min(max(30 + atr_pct * 5, 0), 100))
    else:
        vol_score = 50
    volatility_score = vol_score

    bb_high = latest.get('bb_high')
    high_20 = df['high'].astype(float).tail(20).max() if len(df) >= 20 else close
    breakout = bool(close >= high_20 * 0.99 or (pd.notna(bb_high) and close > bb_high))

    return {
        'volume_spike': volume_spike,
        'trend_score': trend_score,
        'volatility_score': volatility_score,
        'breakout': breakout,
    }
