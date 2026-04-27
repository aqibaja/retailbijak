"""
SwingAQ — Indicator Calculations & Signal Detection
=====================================================

Terjemahan presisi dari PineScript SwingByAQib ke Python.
Referensi: planning/SIGNAL_LOGIC.md

Indikator:
  1. Magic Line (Donchian midline)
  2. CCI (Commodity Channel Index) — dengan MAD, bukan std dev
  3. Stop Loss (Swing Low)
  4. SwingAQ BUY/SELL signal state machine
"""

import numpy as np
import pandas as pd


# =============================================================================
# 1. Magic Line (Donchian Midline)
# =============================================================================
# PineScript: donchian(len) => math.avg(ta.lowest(len), ta.highest(len))

def magic_line(high: pd.Series, low: pd.Series, period: int = 9) -> pd.Series:
    """
    Donchian midline: rata-rata dari lowest low dan highest high dalam N period.

    Bukan Bollinger Band, bukan SMA — ini Donchian Channel midline.
    """
    return (low.rolling(period).min() + high.rolling(period).max()) / 2


# =============================================================================
# 2. CCI (Commodity Channel Index)
# =============================================================================
# PineScript:
#   src   = hlc3
#   cciMA = ta.sma(src, cciLength)
#   cci   = (src - cciMA) / (0.015 * ta.dev(src, cciLength))
#
# ⚠️ ta.dev di PineScript = Mean Absolute Deviation (MAD), BUKAN std dev.

def hlc3(high: pd.Series, low: pd.Series, close: pd.Series) -> pd.Series:
    """Typical Price: (High + Low + Close) / 3"""
    return (high + low + close) / 3


def mean_absolute_deviation(series: pd.Series, period: int) -> pd.Series:
    """
    Mean Absolute Deviation (MAD) — sesuai PineScript ta.dev().

    MAD = mean(|x_i - mean(x)|) untuk rolling window.
    Ini BERBEDA dari standard deviation (std).
    """
    def mad(x):
        return np.mean(np.abs(x - np.mean(x)))
    return series.rolling(period).apply(mad, raw=True)


def cci(high: pd.Series, low: pd.Series, close: pd.Series,
        period: int = 33) -> pd.Series:
    """
    Commodity Channel Index menggunakan MAD (bukan std dev).

    Formula: (HLC3 - SMA(HLC3, N)) / (0.015 * MAD(HLC3, N))
    """
    src = hlc3(high, low, close)
    cci_ma = src.rolling(period).mean()
    dev = mean_absolute_deviation(src, period)
    # Handle division by zero: jika MAD = 0, CCI = 0
    result = (src - cci_ma) / (0.015 * dev)
    result = result.fillna(0)
    result = result.replace([np.inf, -np.inf], 0)
    return result


# =============================================================================
# 3. Stop Loss (Swing Low)
# =============================================================================
# PineScript: recentSwingLow = ta.lowest(low, slLookback)

def stop_loss(low: pd.Series, lookback: int = 20) -> pd.Series:
    """Swing Low = lowest low dalam N bar terakhir."""
    return low.rolling(lookback).min()


# =============================================================================
# 4. SwingAQ Signal State Machine
# =============================================================================
# Referensi lengkap: planning/SIGNAL_LOGIC.md Section 7
#
# BUY Logic (state machine, WAJIB iteratif / loop):
#   1. CCI pernah < -100 → everBelow100 = True
#   2. CCI crossover -100 AND everBelow100[1] → pendingBuy = True
#   3. Dalam windowBars bar, jika close > magicLine → BUY SIGNAL ✅
#   4. Jika windowBars terlampaui tanpa konfirmasi → cancel
#
# SELL Logic:
#   CCI crossunder 100 → SELL SIGNAL

MIN_BARS_REQUIRED = 100


def compute_swingaq_signals(
    df: pd.DataFrame,
    magic_period: int = 9,
    cci_period: int = 33,
    window_bars: int = 3,
    sl_lookback: int = 20,
) -> pd.DataFrame:
    """
    Hitung sinyal BUY/SELL SwingAQ pada DataFrame OHLCV.

    Parameters
    ----------
    df : pd.DataFrame
        Kolom: ['Open', 'High', 'Low', 'Close', 'Volume']
        Index: DatetimeIndex, sorted ascending.
    magic_period : int
        Period Donchian untuk Magic Line (default: 9).
    cci_period : int
        Period CCI (default: 33).
    window_bars : int
        Max bar tunggu konfirmasi harga di atas Magic Line (default: 3).
    sl_lookback : int
        Bar lookback untuk swing low / stop loss (default: 20).

    Returns
    -------
    pd.DataFrame
        DataFrame asli + kolom tambahan:
        - 'magic_line', 'cci', 'sl', 'buy_signal', 'sell_signal'
    """
    df = df.copy()

    # --- Hitung indikator vectorized ---
    df['magic_line'] = magic_line(df['High'], df['Low'], magic_period)
    df['cci'] = cci(df['High'], df['Low'], df['Close'], cci_period)
    df['sl'] = stop_loss(df['Low'], sl_lookback)

    # --- State machine (WAJIB iteratif) ---
    ever_below_100 = False
    pending_buy = False
    pending_bar = 0

    n = len(df)
    buy_signals = [False] * n
    sell_signals = [False] * n

    cci_vals = df['cci'].values
    close_vals = df['Close'].values
    magic_vals = df['magic_line'].values

    for i in range(n):
        cci_val = cci_vals[i]

        # ⚠️ KRITIS: PineScript menggunakan everBelow100[1] (bar sebelumnya).
        # Simpan nilai lama SEBELUM update.
        prev_ever_below_100 = ever_below_100

        # Update everBelow100 (PineScript line 38-39)
        if cci_val < -100:
            ever_below_100 = True

        # Detect crossover -100 (CCI naik melewati -100)
        if i > 0:
            prev_cci = cci_vals[i - 1]
            cross_up_minus100 = (prev_cci < -100) and (cci_val >= -100)
        else:
            cross_up_minus100 = False

        # Detect crossunder 100 (CCI turun melewati 100) — SELL
        if i > 0:
            prev_cci = cci_vals[i - 1]
            cross_down_100 = (prev_cci > 100) and (cci_val <= 100)
        else:
            cross_down_100 = False

        # BUY Step 1: Trigger pendingBuy
        # ⚠️ Gunakan prev_ever_below_100 (= everBelow100[1])
        if cross_up_minus100 and prev_ever_below_100:
            pending_buy = True
            pending_bar = 0
            ever_below_100 = False

        # BUY Step 2: Increment counter
        if pending_buy:
            pending_bar += 1

        # Price above window check
        # Cek apakah dalam windowBars bar terakhir ada close > magic_line
        price_above = False
        if pending_buy:
            start = max(0, i - window_bars + 1)
            for j in range(start, i + 1):
                if close_vals[j] > magic_vals[j]:
                    price_above = True
                    break

        # BUY Step 3: Konfirmasi
        if pending_buy and price_above:
            buy_signals[i] = True
            pending_buy = False
            pending_bar = 0

        # BUY Step 4: Timeout
        elif pending_buy and pending_bar > window_bars:
            pending_buy = False
            pending_bar = 0

        # SELL Signal
        sell_signals[i] = cross_down_100

    df['buy_signal'] = buy_signals
    df['sell_signal'] = sell_signals

    return df


def has_active_buy_signal(
    df: pd.DataFrame, **kwargs
) -> dict | None:
    """
    Jalankan SwingAQ pada DataFrame, cek apakah bar terakhir = BUY signal.

    Returns
    -------
    dict | None
        Dict info sinyal jika bar terakhir = BUY, None jika tidak.
    """
    if len(df) < MIN_BARS_REQUIRED:
        return None

    result = compute_swingaq_signals(df, **kwargs)
    last = result.iloc[-1]

    if last['buy_signal']:
        date_val = last.name
        if hasattr(date_val, 'strftime'):
            date_str = date_val.strftime('%Y-%m-%d %H:%M')
        else:
            date_str = str(date_val)

        close_val = float(last['Close'])
        sl_val = float(last['sl'])
        sl_pct = ((sl_val - close_val) / close_val) * 100 if close_val != 0 else 0

        return {
            'close': round(close_val, 2),
            'magic_line': round(float(last['magic_line']), 2),
            'cci': round(float(last['cci']), 2),
            'stop_loss': round(sl_val, 2),
            'sl_pct': round(sl_pct, 2),
            'date': date_str,
        }
    return None
