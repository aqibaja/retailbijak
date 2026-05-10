import logging
from datetime import datetime

import pandas as pd
from sqlalchemy.dialects.sqlite import insert

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, OHLCVDaily, Signal
from stocks import get_all_tickers
from indicators_extended import get_ohlcv_dataframe, calculate_all_indicators
logger = logging.getLogger(__name__)


def _generate_signals_from_indicators(ticker: str, df: pd.DataFrame) -> list[dict]:
    """Generate buy/sell signals from indicator DataFrame.
    
    Signal rules:
    - RSI < 30 & previous RSI >= 30 → buy (oversold bounce)
    - RSI > 70 & previous RSI <= 70 → sell (overbought pullback)
    - MACD histogram crosses from negative to positive → buy
    - MACD histogram crosses from positive to negative → sell
    - SuperTrend changes from downtrend to uptrend → buy
    - SuperTrend changes from uptrend to downtrend → sell
    - Price crosses above SMA50 → buy
    - Price crosses below SMA50 → sell
    """
    signals = []
    min_bars = 50  # Need enough data for reliable indicators

    if len(df) < min_bars:
        return signals

    # Work on last 100 rows for efficiency
    df = df.tail(100).copy()
    
    for i in range(1, len(df)):
        curr = df.iloc[i]
        prev = df.iloc[i - 1]
        date_val = curr.name
        if hasattr(date_val, 'to_pydatetime'):
            date_val = date_val.to_pydatetime()
        elif hasattr(date_val, 'to_timestamp'):
            date_val = date_val.to_timestamp()
        if isinstance(date_val, pd.Timestamp):
            date_val = date_val.to_pydatetime()

        close_price = float(curr['close']) if pd.notna(curr['close']) else None
        if not close_price:
            continue

        # Magic line: SMA20 or Supertrend value
        magic_line = None
        if 'st_value' in curr.index and pd.notna(curr.get('st_value')):
            magic_line = float(curr['st_value'])
        elif 'sma_20' in curr.index and pd.notna(curr.get('sma_20')):
            magic_line = float(curr['sma_20'])

        # CCI-like proxy: (close - SMA20) / (ATR or std)
        cci_value = None
        if magic_line and close_price:
            cci_value = round((close_price - magic_line) / magic_line * 100, 2)

        # Stop loss: 2x ATR below/above magic line
        atr_value = None
        if 'atr' in curr.index and pd.notna(curr.get('atr')):
            atr_value = float(curr['atr'])

        # --- Generate signal types ---
        signal_type = None
        label = None
        stop_loss = None
        sl_pct = None

        # 1. RSI Oversold → Buy
        rsi_curr = curr.get('rsi')
        rsi_prev = prev.get('rsi')
        if pd.notna(rsi_curr) and pd.notna(rsi_prev):
            if rsi_curr < 30 and rsi_prev >= 30:
                signal_type = 'buy'
                label = 'RSI_Oversold'
            elif rsi_curr > 70 and rsi_prev <= 70:
                signal_type = 'sell'
                label = 'RSI_Overbought'

        # 2. MACD Crossover (higher priority)
        macd_curr = curr.get('macd_hist')
        macd_prev = prev.get('macd_hist')
        if pd.notna(macd_curr) and pd.notna(macd_prev):
            if macd_curr > 0 and macd_prev <= 0:
                signal_type = 'buy'
                label = 'MACD_Bullish'
            elif macd_curr < 0 and macd_prev >= 0:
                signal_type = 'sell'
                label = 'MACD_Bearish'

        # 3. SuperTrend reversal (highest priority)
        st_curr = curr.get('st_trend')
        st_prev = prev.get('st_trend')
        if pd.notna(st_curr) and pd.notna(st_prev):
            if bool(st_curr) and not bool(st_prev):
                signal_type = 'buy'
                label = 'ST_Up'
            elif not bool(st_curr) and bool(st_prev):
                signal_type = 'sell'
                label = 'ST_Down'

        # 4. SMA50 Price Crossover
        sma50_curr = curr.get('sma_50')
        sma50_prev = prev.get('sma_50')
        if pd.notna(sma50_curr) and pd.notna(sma50_prev) and signal_type is None:
            if close_price > sma50_curr and (pd.isna(prev['close']) or float(prev['close']) <= sma50_prev):
                signal_type = 'buy'
                label = 'SMA50_Breakout'
            elif close_price < sma50_curr and (pd.isna(prev['close']) or float(prev['close']) >= sma50_prev):
                signal_type = 'sell'
                label = 'SMA50_Breakdown'

        if signal_type:
            # Calculate stop loss
            if atr_value:
                if signal_type == 'buy':
                    stop_loss = round(close_price - 2 * atr_value, 2)
                else:
                    stop_loss = round(close_price + 2 * atr_value, 2)
                sl_pct = round(abs(stop_loss - close_price) / close_price * 100, 1) if close_price else None

            signals.append({
                'ticker': ticker,
                'timeframe': '1d',
                'signal_date': date_val,
                'signal_type': signal_type,
                'close': close_price,
                'magic_line': round(magic_line, 2) if magic_line else None,
                'cci': cci_value,
                'stop_loss': stop_loss,
                'sl_pct': sl_pct,
                '_label': label,
            })

    return signals


def update_signals(ticker_limit: int | None = None):
    """Calculate and store trading signals from local DB OHLCV data.
    
    Reads OHLCV from database (not yfinance), calculates indicators,
    generates signals, and upserts into the Signal table.
    
    Args:
        ticker_limit: Optional max number of tickers to process (for testing)
    """
    logger.info("Starting signal calculation from DB OHLCV...")
    db = SessionLocal()
    try:
        tickers = get_all_tickers()
        if ticker_limit:
            tickers = tickers[:ticker_limit]
        logger.info(f"Processing signals for {len(tickers)} tickers")

        total_signals = 0
        total_tickers = 0
        failed = 0

        for ticker in tickers:
            clean_ticker = ticker.replace('.JK', '')
            try:
                df = get_ohlcv_dataframe(db, clean_ticker, limit=500)
                if df.empty or len(df) < 50:
                    continue

                df = calculate_all_indicators(df)
                if df.empty:
                    continue

                signals = _generate_signals_from_indicators(clean_ticker, df)
                if not signals:
                    continue

                # Upsert signals to DB
                for sig in signals:
                    stmt = insert(Signal).values(
                        ticker=sig['ticker'],
                        timeframe=sig['timeframe'],
                        signal_date=sig['signal_date'],
                        signal_type=sig['signal_type'],
                        close=sig['close'],
                        magic_line=sig['magic_line'],
                        cci=sig['cci'],
                        stop_loss=sig['stop_loss'],
                        sl_pct=sig['sl_pct'],
                    )
                    stmt = stmt.on_conflict_do_update(
                        index_elements=['ticker', 'timeframe', 'signal_date'],
                        set_={
                            'signal_type': stmt.excluded.signal_type,
                            'close': stmt.excluded.close,
                            'magic_line': stmt.excluded.magic_line,
                            'cci': stmt.excluded.cci,
                            'stop_loss': stmt.excluded.stop_loss,
                            'sl_pct': stmt.excluded.sl_pct,
                        },
                    )
                    db.execute(stmt)

                total_signals += len(signals)
                total_tickers += 1

                if total_tickers % 50 == 0:
                    db.commit()
                    logger.info(f"  Processed {total_tickers}/{len(tickers)} tickers, {total_signals} signals so far")

            except Exception as exc:
                failed += 1
                if failed <= 5:
                    logger.warning(f"  Signal calc failed for {ticker}: {exc}")
                continue

        db.commit()
        logger.info(f"Signal calculation complete: {total_signals} signals for {total_tickers} tickers ({failed} failed)")
        return {'ok': total_tickers, 'signals': total_signals, 'failed': failed}

    except Exception as e:
        logger.error(f"Signal calculation error: {e}")
        db.rollback()
        return {'ok': 0, 'signals': 0, 'failed': 0, 'error': str(e)}
    finally:
        db.close()


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    result = update_signals()
    print(f"Result: {result}")
