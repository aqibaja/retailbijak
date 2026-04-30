import pandas as pd
import numpy as np
import ta
from sqlalchemy.orm import Session
try:
    from database import OHLCVDaily
except ModuleNotFoundError:
    from backend.database import OHLCVDaily

def get_ohlcv_dataframe(db: Session, ticker: str, limit: int = 500) -> pd.DataFrame:
    """Fetch OHLCV data from the database and return as a pandas DataFrame."""
    # We query ascending by date to calculate indicators correctly, but we might 
    # only want the last N records. Easiest way is to fetch descending, limit, then reverse.
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
        'volume': r.volume
    } for r in records])
    
    df.set_index('date', inplace=True)
    return df

def calculate_all_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """Calculate extended technical indicators using the `ta` library."""
    if df.empty or len(df) < 50:
        return df
        
    # RSI
    df['rsi'] = ta.momentum.RSIIndicator(close=df['close'], window=14).rsi()
    
    # MACD
    macd = ta.trend.MACD(close=df['close'])
    df['macd_line'] = macd.macd()
    df['macd_signal'] = macd.macd_signal()
    df['macd_hist'] = macd.macd_diff()
    
    # Moving Averages
    df['sma_20'] = ta.trend.SMAIndicator(close=df['close'], window=20).sma_indicator()
    df['sma_50'] = ta.trend.SMAIndicator(close=df['close'], window=50).sma_indicator()
    df['sma_200'] = ta.trend.SMAIndicator(close=df['close'], window=200).sma_indicator()
    
    # Bollinger Bands
    bb = ta.volatility.BollingerBands(close=df['close'], window=20, window_dev=2)
    df['bb_high'] = bb.bollinger_hband()
    df['bb_mid'] = bb.bollinger_mavg()
    df['bb_low'] = bb.bollinger_lband()
    
    return df

def get_technical_summary(df: pd.DataFrame) -> dict:
    """Generate a summary of technical indicators for the latest day."""
    if df.empty or 'rsi' not in df.columns:
        return {"status": "insufficient_data"}
        
    latest = df.iloc[-1]
    prev = df.iloc[-2]
    
    # Determine RSI Status
    rsi_val = latest['rsi']
    if pd.isna(rsi_val):
        rsi_status = "Neutral"
    elif rsi_val > 70:
        rsi_status = "Overbought"
    elif rsi_val < 30:
        rsi_status = "Oversold"
    else:
        rsi_status = "Neutral"
        
    # Determine MACD Status
    macd_val = latest['macd_hist']
    prev_macd = prev['macd_hist']
    if pd.isna(macd_val) or pd.isna(prev_macd):
        macd_status = "Neutral"
    elif macd_val > 0 and prev_macd <= 0:
        macd_status = "Bullish Crossover"
    elif macd_val < 0 and prev_macd >= 0:
        macd_status = "Bearish Crossover"
    elif macd_val > 0:
        macd_status = "Bullish"
    else:
        macd_status = "Bearish"
        
    # Determine Trend (SMA)
    close_price = latest['close']
    if pd.notna(latest['sma_50']) and pd.notna(latest['sma_200']):
        if close_price > latest['sma_50'] and latest['sma_50'] > latest['sma_200']:
            trend = "Strong Uptrend"
        elif close_price < latest['sma_50'] and latest['sma_50'] < latest['sma_200']:
            trend = "Strong Downtrend"
        elif close_price > latest['sma_50']:
            trend = "Mild Uptrend"
        else:
            trend = "Mild Downtrend"
    else:
        trend = "Unknown"
        
    return {
        "status": "ok",
        "date": latest.name.isoformat(),
        "close": close_price,
        "indicators": {
            "rsi": {
                "value": round(rsi_val, 2) if pd.notna(rsi_val) else None,
                "status": rsi_status
            },
            "macd": {
                "macd_line": round(latest['macd_line'], 2) if pd.notna(latest['macd_line']) else None,
                "signal": round(latest['macd_signal'], 2) if pd.notna(latest['macd_signal']) else None,
                "histogram": round(macd_val, 2) if pd.notna(macd_val) else None,
                "status": macd_status
            },
            "trend": {
                "sma_20": round(latest['sma_20'], 2) if pd.notna(latest['sma_20']) else None,
                "sma_50": round(latest['sma_50'], 2) if pd.notna(latest['sma_50']) else None,
                "sma_200": round(latest['sma_200'], 2) if pd.notna(latest['sma_200']) else None,
                "status": trend
            },
            "bollinger_bands": {
                "upper": round(latest['bb_high'], 2) if pd.notna(latest['bb_high']) else None,
                "middle": round(latest['bb_mid'], 2) if pd.notna(latest['bb_mid']) else None,
                "lower": round(latest['bb_low'], 2) if pd.notna(latest['bb_low']) else None
            }
        }
    }
