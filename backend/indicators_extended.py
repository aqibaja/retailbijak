import pandas as pd
import numpy as np
import ta
from sqlalchemy.orm import Session
try:
    from database import OHLCVDaily
except ModuleNotFoundError:
    from backend.database import OHLCVDaily


def _safe_round(value, digits=2):
    try:
        if pd.isna(value):
            return None
        return round(float(value), digits)
    except Exception:
        return None



def empty_technical_summary(message: str = "Belum ada data OHLCV yang cukup untuk analisis teknikal.") -> dict:
    return {
        "status": "no_data",
        "summary": message,
        "rating": "NO DATA",
        "score": 50,
        "indicators": {
            "rsi": {"value": None, "status": "Insufficient"},
            "macd": {"macd_line": None, "signal": None, "histogram": None, "status": "Insufficient"},
            "trend": {"sma_5": None, "sma_10": None, "sma_20": None, "sma_50": None, "sma_200": None, "ema_20": None, "status": "Insufficient"},
            "bollinger_bands": {"upper": None, "middle": None, "lower": None},
            "stochastic": {"k": None, "d": None, "status": "Insufficient"},
            "atr": {"value": None, "status": "Insufficient"},
            "volume": {"latest": None, "avg_20": None, "ratio": None, "status": "Insufficient"},
            "support_resistance": {"support_20d": None, "resistance_20d": None},
        },
    }


def get_ohlcv_dataframe(db: Session, ticker: str, limit: int = 500) -> pd.DataFrame:
    candidates = [ticker]
    if ticker.endswith('.JK'):
        candidates.append(ticker[:-3])
    else:
        candidates.append(f'{ticker}.JK')
    records = (
        db.query(OHLCVDaily)
        .filter(OHLCVDaily.ticker.in_(candidates))
        .order_by(OHLCVDaily.date.desc())
        .limit(limit)
        .all()
    )
    if not records:
        return pd.DataFrame()
    records.reverse()
    df = pd.DataFrame([{
        'date': r.date,
        'open': r.open,
        'high': r.high,
        'low': r.low,
        'close': r.close,
        'volume': r.volume,
    } for r in records])
    df.set_index('date', inplace=True)
    return df


def calculate_all_indicators(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df
    df = df.copy()
    close = df['close'].astype(float)
    high = df['high'].astype(float)
    low = df['low'].astype(float)
    volume = df['volume'].astype(float)

    if len(df) >= 14:
        df['rsi'] = ta.momentum.RSIIndicator(close=close, window=14).rsi()
        stoch = ta.momentum.StochasticOscillator(high=high, low=low, close=close, window=14, smooth_window=3)
        df['stoch_k'] = stoch.stoch()
        df['stoch_d'] = stoch.stoch_signal()
        df['atr'] = ta.volatility.AverageTrueRange(high=high, low=low, close=close, window=14).average_true_range()
    if len(df) >= 26:
        macd = ta.trend.MACD(close=close)
        df['macd_line'] = macd.macd()
        df['macd_signal'] = macd.macd_signal()
        df['macd_hist'] = macd.macd_diff()
    for win in (5, 10, 20, 50, 200):
        if len(df) >= win:
            df[f'sma_{win}'] = ta.trend.SMAIndicator(close=close, window=win).sma_indicator()
            df[f'ema_{win}'] = ta.trend.EMAIndicator(close=close, window=win).ema_indicator()
    if len(df) >= 20:
        bb = ta.volatility.BollingerBands(close=close, window=20, window_dev=2)
        df['bb_high'] = bb.bollinger_hband()
        df['bb_mid'] = bb.bollinger_mavg()
        df['bb_low'] = bb.bollinger_lband()
        df['vol_sma_20'] = volume.rolling(20).mean()
    return df


def get_technical_summary(df: pd.DataFrame) -> dict:
    if df.empty:
        return empty_technical_summary("Belum ada data OHLCV untuk analisis teknikal.")

    latest = df.iloc[-1]
    prev = df.iloc[-2] if len(df) > 1 else latest
    close_price = float(latest['close']) if pd.notna(latest['close']) else None
    prev_close = float(prev['close']) if pd.notna(prev['close']) else close_price
    change_pct = ((close_price - prev_close) / prev_close * 100) if close_price and prev_close else None

    rsi_val = latest.get('rsi')
    if pd.isna(rsi_val):
        rsi_status = "Insufficient"
    elif rsi_val > 70:
        rsi_status = "Overbought"
    elif rsi_val < 30:
        rsi_status = "Oversold"
    else:
        rsi_status = "Neutral"

    macd_hist = latest.get('macd_hist')
    prev_macd = prev.get('macd_hist')
    if pd.isna(macd_hist):
        macd_status = "Insufficient"
    elif macd_hist > 0 and (pd.isna(prev_macd) or prev_macd <= 0):
        macd_status = "Bullish Crossover"
    elif macd_hist < 0 and (pd.isna(prev_macd) or prev_macd >= 0):
        macd_status = "Bearish Crossover"
    elif macd_hist > 0:
        macd_status = "Bullish"
    else:
        macd_status = "Bearish"

    sma20 = latest.get('sma_20')
    sma50 = latest.get('sma_50')
    sma200 = latest.get('sma_200')
    if close_price and pd.notna(sma50) and pd.notna(sma200):
        if close_price > sma50 > sma200:
            trend = "Strong Uptrend"
        elif close_price < sma50 < sma200:
            trend = "Strong Downtrend"
        elif close_price > sma50:
            trend = "Mild Uptrend"
        else:
            trend = "Mild Downtrend"
    elif close_price and pd.notna(sma20):
        trend = "Above SMA20" if close_price > sma20 else "Below SMA20"
    else:
        trend = "Insufficient"

    high_window = df['high'].tail(min(len(df), 20)).max()
    low_window = df['low'].tail(min(len(df), 20)).min()
    volume_latest = latest.get('volume')
    volume_avg = latest.get('vol_sma_20')
    volume_ratio = (float(volume_latest) / float(volume_avg)) if pd.notna(volume_latest) and pd.notna(volume_avg) and volume_avg else None

    bull = 0
    bear = 0
    if change_pct is not None:
        bull += change_pct > 0
        bear += change_pct < 0
    if rsi_status in {"Oversold", "Neutral"} and pd.notna(rsi_val) and rsi_val >= 45:
        bull += 1
    if rsi_status == "Overbought":
        bear += 1
    if "Bullish" in macd_status:
        bull += 1
    if "Bearish" in macd_status:
        bear += 1
    if "Uptrend" in trend or trend == "Above SMA20":
        bull += 1
    if "Downtrend" in trend or trend == "Below SMA20":
        bear += 1
    rating = "BULLISH" if bull > bear else "BEARISH" if bear > bull else "NEUTRAL"
    summary = f"{rating}: harga {('naik' if (change_pct or 0) >= 0 else 'turun')} {_safe_round(change_pct) if change_pct is not None else 0}% vs sesi sebelumnya; trend {trend}; MACD {macd_status}; RSI {rsi_status}."

    return {
        "status": "ok",
        "date": latest.name.isoformat() if hasattr(latest.name, 'isoformat') else str(latest.name),
        "close": _safe_round(close_price),
        "change_pct": _safe_round(change_pct),
        "rating": rating,
        "summary": summary,
        "score": max(0, min(100, 50 + (bull - bear) * 12)),
        "indicators": {
            "rsi": {"value": _safe_round(rsi_val), "status": rsi_status},
            "macd": {"macd_line": _safe_round(latest.get('macd_line')), "signal": _safe_round(latest.get('macd_signal')), "histogram": _safe_round(macd_hist), "status": macd_status},
            "trend": {"sma_5": _safe_round(latest.get('sma_5')), "sma_10": _safe_round(latest.get('sma_10')), "sma_20": _safe_round(sma20), "sma_50": _safe_round(sma50), "sma_200": _safe_round(sma200), "ema_20": _safe_round(latest.get('ema_20')), "status": trend},
            "bollinger_bands": {"upper": _safe_round(latest.get('bb_high')), "middle": _safe_round(latest.get('bb_mid')), "lower": _safe_round(latest.get('bb_low'))},
            "stochastic": {"k": _safe_round(latest.get('stoch_k')), "d": _safe_round(latest.get('stoch_d')), "status": "Overbought" if pd.notna(latest.get('stoch_k')) and latest.get('stoch_k') > 80 else "Oversold" if pd.notna(latest.get('stoch_k')) and latest.get('stoch_k') < 20 else "Neutral"},
            "atr": {"value": _safe_round(latest.get('atr')), "status": "Volatile" if pd.notna(latest.get('atr')) and close_price and latest.get('atr') / close_price > 0.04 else "Normal"},
            "volume": {"latest": int(volume_latest) if pd.notna(volume_latest) else None, "avg_20": int(volume_avg) if pd.notna(volume_avg) else None, "ratio": _safe_round(volume_ratio), "status": "Spike" if volume_ratio and volume_ratio >= 1.5 else "Normal"},
            "support_resistance": {"support_20d": _safe_round(low_window), "resistance_20d": _safe_round(high_window)},
        },
    }
