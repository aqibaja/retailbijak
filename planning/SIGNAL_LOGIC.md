# SwingAQ — Signal Logic Specification

> **File paling kritis.** Ini adalah terjemahan PineScript ke spesifikasi Python yang harus diikuti secara presisi.
> Source PineScript: `/Users/mhusnulaqib/Documents/APP/SwingAQ/SwingAQ.pinescript `

---

## 1. Indikator: Magic Line

### PineScript
```pine
magicCon = input.int(9, minval=1, title="Magic Line")
donchian(len) => math.avg(ta.lowest(len), ta.highest(len))
magicLine = donchian(magicCon)
```

### Python Equivalent
```python
def magic_line(high: pd.Series, low: pd.Series, period: int = 9) -> pd.Series:
    """
    Donchian midline: average of lowest low dan highest high dalam N period.
    """
    return (low.rolling(period).min() + high.rolling(period).max()) / 2
```

**Parameter default**: `period = 9`

---

## 2. Indikator: CCI (Commodity Channel Index)

### PineScript
```pine
cciLength  = input.int(33, minval=1, title="CCI Length")
src        = input(hlc3, title="CCI Source")
windowBars = input.int(3, minval=1, maxval=10, title="Window Bar harga (±cross)")

cciMA = ta.sma(src, cciLength)
cci   = (src - cciMA) / (0.015 * ta.dev(src, cciLength))
```

**Catatan penting**: `ta.dev` di PineScript adalah **mean absolute deviation (MAD)**, BUKAN standard deviation.

### Python Equivalent
```python
def hlc3(high: pd.Series, low: pd.Series, close: pd.Series) -> pd.Series:
    return (high + low + close) / 3

def mean_absolute_deviation(series: pd.Series, period: int) -> pd.Series:
    """ta.dev di PineScript = MAD, bukan std."""
    def mad(x):
        return np.mean(np.abs(x - np.mean(x)))
    return series.rolling(period).apply(mad, raw=True)

def cci(high: pd.Series, low: pd.Series, close: pd.Series,
        period: int = 33) -> pd.Series:
    src = hlc3(high, low, close)
    cci_ma = src.rolling(period).mean()
    dev = mean_absolute_deviation(src, period)
    return (src - cci_ma) / (0.015 * dev)
```

**Parameter default**: `period = 33`, `source = HLC3`

---

## 3. Indikator: Stop Loss (Swing Low)

### PineScript
```pine
slLookback = input.int(20, minval=5, maxval=100, title="SL Lookback (bar terakhir)")
recentSwingLow = ta.lowest(low, slLookback)
```

### Python Equivalent
```python
def stop_loss(low: pd.Series, lookback: int = 20) -> pd.Series:
    """Swing low = lowest low dalam N bar terakhir."""
    return low.rolling(lookback).min()
```

**Parameter default**: `lookback = 20`

---

## 4. Tracking State

### PineScript
```pine
var bool everBelow100 = false
var bool pendingBuy   = false
var int  pendingBar   = 0

if cci < -100:
    everBelow100 := true
```

### Penjelasan State Machine:
| Variabel       | Tipe    | Initial | Fungsi                                                       |
|----------------|---------|---------|--------------------------------------------------------------|
| `everBelow100` | bool    | false   | Apakah CCI pernah < -100 (reset setelah trigger pending buy) |
| `pendingBuy`   | bool    | false   | Sinyal dalam "menunggu" konfirmasi harga                     |
| `pendingBar`   | int     | 0       | Counter berapa bar sudah lewat sejak crossover               |

---

## 5. Events (Deteksi Crossover)

### PineScript
```pine
crossUpMinus100 = ta.crossover(cci, -100)   // CCI naik melewati -100
crossDown100    = ta.crossunder(cci, 100)   // CCI turun melewati 100
```

### Python Equivalent
```python
def crossover(series: pd.Series, level: float) -> pd.Series:
    """True pada bar di mana series naik melewati level (dari bawah ke atas)."""
    return (series.shift(1) < level) & (series >= level)

def crossunder(series: pd.Series, level: float) -> pd.Series:
    """True pada bar di mana series turun melewati level (dari atas ke bawah)."""
    return (series.shift(1) > level) & (series <= level)
```

---

## 6. Price Window Check

### PineScript
```pine
priceAboveWindow = false
for i = 0 to windowBars - 1
    if close[i] > magicLine[i]
        priceAboveWindow := true
```

### Penjelasan:
Cek apakah dalam **windowBars (3) bar terakhir** (termasuk bar saat ini), ada bar di mana `close > magicLine`.

### Python Equivalent
```python
def price_above_window(close: pd.Series, magic: pd.Series, window: int = 3) -> pd.Series:
    """
    True jika dalam `window` bar terakhir (termasuk bar ini),
    setidaknya ada 1 bar di mana close > magic_line.
    Digunakan saat pendingBuy = True.
    """
    above = (close > magic)
    # Any True dalam rolling window
    return above.rolling(window).max().astype(bool)
```

---

## 7. BUY Logic (State Machine Lengkap)

### PineScript
```pine
// Step 1: Ketika CCI crossover -100 dari bawah (dan pernah di bawah -100)
if crossUpMinus100 and everBelow100[1]:
    pendingBuy   := true
    pendingBar   := 0
    everBelow100 := false

// Step 2: Increment counter
if pendingBuy:
    pendingBar += 1

// Step 3: Konfirmasi — harga di atas Magic Line dalam window
cciBullish = false
if pendingBuy and priceAboveWindow:
    cciBullish := true
    pendingBuy := false
    pendingBar := 0

// Step 4: Timeout — jika sudah lebih dari windowBars, batalkan
if pendingBuy and pendingBar > windowBars:
    pendingBuy := false
    pendingBar := 0
```

### Alur State Machine BUY:

```
CCI < -100 selama beberapa bar
         │
         ▼
    everBelow100 = True
         │
         ▼
CCI crossover -100 (naik melewati -100)
AND everBelow100[1] = True (bar sebelumnya sudah pernah di bawah -100)
         │
         ▼
    pendingBuy = True
    pendingBar = 0
    everBelow100 = False (reset)
         │
    ┌────┴────┐
    │ Per bar │ pendingBar += 1
    └────┬────┘
         │
    ┌────┴──────────────────────────┐
    │ Apakah close > magicLine      │
    │ dalam window (3 bar)?         │
    └────┬──────────────┬───────────┘
         │ YA           │ TIDAK
         ▼              ▼
    BUY SIGNAL ✅   pendingBar > 3?
                        │ YA
                        ▼
                   CANCEL (timeout) ❌
```

### Python Implementation (Iteratif — wajib pakai loop, tidak bisa pure vectorized):

```python
def compute_swingaq_signals(df: pd.DataFrame,
                             magic_period: int = 9,
                             cci_period: int = 33,
                             window_bars: int = 3,
                             sl_lookback: int = 20) -> pd.DataFrame:
    """
    Hitung sinyal BUY SwingAQ pada DataFrame OHLCV.
    
    Parameters:
        df: DataFrame dengan kolom ['Open','High','Low','Close','Volume']
            Index harus DatetimeIndex, sorted ascending.
    
    Returns:
        DataFrame dengan kolom tambahan:
        - 'magic_line': Magic Line value
        - 'cci': CCI value
        - 'sl': Stop Loss level (swing low)
        - 'buy_signal': True jika bar ini adalah sinyal BUY
        - 'sell_signal': True jika bar ini adalah sinyal SELL
    """
    df = df.copy()
    
    # Hitung indikator
    df['magic_line'] = magic_line(df['High'], df['Low'], magic_period)
    df['cci']        = cci(df['High'], df['Low'], df['Close'], cci_period)
    df['sl']         = stop_loss(df['Low'], sl_lookback)
    
    # State variables
    ever_below_100 = False
    pending_buy    = False
    pending_bar    = 0
    
    buy_signals  = [False] * len(df)
    sell_signals = [False] * len(df)
    
    for i in range(len(df)):
        cci_val    = df['cci'].iloc[i]
        close_val  = df['Close'].iloc[i]
        magic_val  = df['magic_line'].iloc[i]
        
        # ⚠️ KRITIS: Simpan nilai sebelum update, karena PineScript
        # menggunakan everBelow100[1] (nilai bar SEBELUMNYA) di cek BUY.
        # Update everBelow100 terjadi SEBELUM cek crossover di PineScript,
        # tapi cek menggunakan [1], jadi kita harus simpan nilai lama dulu.
        prev_ever_below_100 = ever_below_100
        
        # Update everBelow100 (PineScript line 38-39)
        if cci_val < -100:
            ever_below_100 = True
        
        # Detect crossover -100
        if i > 0:
            prev_cci = df['cci'].iloc[i - 1]
            cross_up_minus100 = (prev_cci < -100) and (cci_val >= -100)
        else:
            cross_up_minus100 = False
        
        # Detect crossunder 100 (SELL)
        if i > 0:
            prev_cci = df['cci'].iloc[i - 1]
            cross_down_100 = (prev_cci > 100) and (cci_val <= 100)
        else:
            cross_down_100 = False
        
        # BUY Step 1: Trigger pendingBuy
        # ⚠️ Gunakan prev_ever_below_100 (= everBelow100[1] di PineScript)
        if cross_up_minus100 and prev_ever_below_100:
            pending_buy    = True
            pending_bar    = 0
            ever_below_100 = False
        
        # BUY Step 2: Increment counter
        if pending_buy:
            pending_bar += 1
        
        # Price above window check (cek dari bar (i - window_bars + 1) sampai bar i)
        price_above = False
        if pending_buy:
            start = max(0, i - window_bars + 1)
            for j in range(start, i + 1):
                if df['Close'].iloc[j] > df['magic_line'].iloc[j]:
                    price_above = True
                    break
        
        # BUY Step 3: Konfirmasi
        if pending_buy and price_above:
            buy_signals[i] = True
            pending_buy    = False
            pending_bar    = 0
        
        # BUY Step 4: Timeout
        elif pending_buy and pending_bar > window_bars:
            pending_buy = False
            pending_bar = 0
        
        # SELL Signal
        sell_signals[i] = cross_down_100
    
    df['buy_signal']  = buy_signals
    df['sell_signal'] = sell_signals
    
    return df
```

---

## 8. SELL Logic

### PineScript
```pine
cciBearish = crossDown100
```

Sederhana: SELL signal ketika CCI **crossunder 100** (turun dari atas ke bawah melewati 100).

---

## 9. Deteksi "Sinyal BUY Aktif Saat Ini" untuk Scanner

Scanner tidak perlu menampilkan semua bar historis. Yang penting adalah:

> **Apakah bar TERAKHIR (close terbaru) adalah sinyal BUY?**

```python
def has_active_buy_signal(df: pd.DataFrame, **kwargs) -> dict | None:
    """
    Jalankan SwingAQ pada DataFrame, cek apakah bar terakhir = BUY signal.
    
    Returns:
        dict dengan info sinyal jika ada, None jika tidak ada sinyal.
    """
    result = compute_swingaq_signals(df, **kwargs)
    last   = result.iloc[-1]
    
    if last['buy_signal']:
        return {
            'date'       : last.name.strftime('%Y-%m-%d %H:%M'),
            'close'      : round(last['Close'], 2),
            'magic_line' : round(last['magic_line'], 2),
            'cci'        : round(last['cci'], 2),
            'stop_loss'  : round(last['sl'], 2),
        }
    return None
```

---

## 10. Parameter Default (Sesuai PineScript)

| Parameter       | Default | Keterangan                              |
|-----------------|---------|-----------------------------------------|
| `magic_period`  | 9       | Period Donchian untuk Magic Line        |
| `cci_period`    | 33      | Period CCI                              |
| `window_bars`   | 3       | Max bar tunggu konfirmasi harga         |
| `sl_lookback`   | 20      | Bar lookback untuk swing low (SL)       |

---

## 11. Timeframe yang Didukung (yfinance)

| Label di UI | yfinance interval | Keterangan                              |
|-------------|-------------------|-----------------------------------------|
| Daily       | `1d`              | Data harian (tersedia panjang)          |
| H4          | `1h` (4 candle)   | Tidak ada native 4h, gunakan 1h→resample|
| H1          | `1h`              | Max 730 hari historis                   |
| Weekly      | `1wk`             | Data mingguan                           |
| Monthly     | `1mo`             | Data bulanan                            |

**Catatan**: Intraday (1h) hanya tersedia 730 hari ke belakang via yfinance.
Untuk H4, ambil data `1h` lalu resample ke `4h` sebelum kalkulasi.

```python
def resample_to_h4(df_1h: pd.DataFrame) -> pd.DataFrame:
    """Resample data 1H ke 4H."""
    return df_1h.resample('4h').agg({
        'Open'  : 'first',
        'High'  : 'max',
        'Low'   : 'min',
        'Close' : 'last',
        'Volume': 'sum'
    }).dropna()
```

---

## 12. Validasi Data Minimum

Agar sinyal dapat dihitung dengan akurat, butuh minimal:
- `cci_period + window_bars + sl_lookback + buffer = 33 + 3 + 20 + 10 = 66 bar`
- Gunakan **minimal 100 bar** sebagai safety margin
- Jika data kurang dari 100 bar → skip ticker tersebut

```python
MIN_BARS_REQUIRED = 100
```
