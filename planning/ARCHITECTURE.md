# SwingAQ Scanner — Technical Architecture

---

## 1. Overview Arsitektur

```
┌────────────────────────────────────────────────────────────────┐
│                         BROWSER                                │
│                                                                │
│   index.html + style.css + app.js                             │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  1. Pilih Timeframe                                     │  │
│   │  2. Klik "Scan"                                         │  │
│   │  3. Progress bar SSE (real-time)                        │  │
│   │  4. Tabel hasil: Ticker | Close | Magic | CCI | SL      │  │
│   └────────────────────────┬────────────────────────────────┘  │
└────────────────────────────┼───────────────────────────────────┘
                             │ HTTP + SSE
                             ▼
┌────────────────────────────────────────────────────────────────┐
│                     FASTAPI BACKEND                            │
│                    localhost:8000                              │
│                                                                │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │  main.py    │  │  scanner.py  │  │   indicators.py       │ │
│  │  (routing)  │  │  (orchestr.) │  │   (magic,cci,sl calc) │ │
│  └──────┬──────┘  └──────┬───────┘  └───────────────────────┘ │
│         │                │                                     │
│         │         ┌──────┴───────┐                             │
│         │         │  stocks.py   │                             │
│         │         │  (IDX list)  │                             │
│         │         └──────────────┘                             │
└────────────────────────────┼───────────────────────────────────┘
                             │ yfinance download
                             ▼
┌────────────────────────────────────────────────────────────────┐
│                    YAHOO FINANCE API                           │
│                 (via yfinance library)                         │
└────────────────────────────────────────────────────────────────┘
```

---

## 2. Stack Teknologi

### Backend
| Komponen    | Teknologi        | Versi    | Alasan                                      |
|-------------|------------------|----------|---------------------------------------------|
| Framework   | FastAPI          | ≥0.115   | Async native, SSE support, auto docs        |
| Server      | Uvicorn          | ≥0.30    | ASGI server untuk FastAPI                   |
| Data fetch  | yfinance         | ≥0.2.40  | Yahoo Finance gratis, no API key            |
| Data manip  | pandas           | ≥2.0     | Seri waktu OHLCV                            |
| Numerik     | numpy            | ≥1.26    | Kalkulasi MAD untuk CCI                     |
| SSE         | fastapi (native) | -        | StreamingResponse untuk SSE                 |

### Frontend
| Komponen  | Teknologi    | Alasan                                               |
|-----------|--------------|------------------------------------------------------|
| Struktur  | HTML5        | Single page, tidak perlu framework berat             |
| Styling   | Vanilla CSS  | Kontrol penuh, dark mode, tanpa build step           |
| Logika    | Vanilla JS   | EventSource API native untuk SSE                     |
| Font      | Google Fonts | Inter — modern, clean                                |

---

## 3. Struktur File Proyek

```
SwingAQ/
├── planning/                      ← Semua planning docs
│   ├── README.md
│   ├── SIGNAL_LOGIC.md
│   ├── ARCHITECTURE.md            ← File ini
│   ├── API_SPEC.md
│   ├── UI_SPEC.md
│   └── TASKS.md
│
├── SwingAQ.pinescript             ← Source PineScript asli
│
├── backend/
│   ├── main.py                    ← FastAPI app, routing, CORS, static files
│   ├── scanner.py                 ← Orchestrator: loop ticker, panggil yfinance
│   ├── indicators.py              ← Magic Line, CCI, SL, SwingAQ signal logic
│   ├── stocks.py                  ← Daftar semua ticker IDX (.JK)
│   └── requirements.txt
│
├── frontend/
│   ├── index.html                 ← Single page app
│   ├── style.css                  ← Dark mode, responsive
│   └── app.js                     ← SSE client, tabel rendering, filter
│
└── README.md                      ← Quick start
```

---

## 4. Data Flow

### Flow Scan Request

```
User klik "Scan"
      │
      ▼
GET /api/scan?timeframe=1d
      │
      ▼
FastAPI: Buka SSE stream
      │
      ├── yield: {"type":"start", "total": 900}
      │
      ├── Untuk setiap ticker di daftar IDX:
      │     │
      │     ├── Download OHLCV via yfinance
      │     │     └── yf.download(ticker, interval=tf, period=lookback_period)
      │     │
      │     ├── Validasi: minimal 100 bar? → skip jika tidak
      │     │
      │     ├── Hitung: magic_line, cci, sl
      │     │
      │     ├── Deteksi: buy_signal pada bar terakhir?
      │     │
      │     ├── yield: {"type":"progress", "current": i, "ticker": ticker}
      │     │
      │     └── Jika buy_signal:
      │           yield: {"type":"result", "data": {...}}
      │
      └── yield: {"type":"done", "total_signals": n}

Browser menerima events via EventSource:
  - Update progress bar
  - Tambah row ke tabel jika ada result
  - Tampilkan "Scan selesai" saat done
```

---

## 5. Timeframe & Lookback Period

Karena yfinance memiliki batasan data historis, gunakan period yang cukup untuk sinyal:

| Timeframe    | yfinance interval | yfinance period | Min bars butuh |
|--------------|-------------------|-----------------|----------------|
| Daily        | `1d`              | `2y` (2 tahun)  | ≥100 bar       |
| H1           | `1h`              | `730d`          | ≥100 bar       |
| H4 (resample)| `1h` → resample   | `730d`          | ≥100 bar       |
| Weekly       | `1wk`             | `5y`            | ≥100 bar       |
| Monthly      | `1mo`             | `10y`           | ≥100 bar       |

---

## 6. Penanganan Error & Edge Cases

| Case                              | Handling                                             |
|-----------------------------------|------------------------------------------------------|
| Ticker tidak ada data di yfinance | Skip, kirim progress event saja                     |
| Data < 100 bar                    | Skip dengan log warning                             |
| yfinance rate limit / timeout     | Retry 2x dengan delay 1s, lalu skip                |
| NaN values di OHLCV               | dropna() sebelum kalkulasi                          |
| Magic Line NaN (insufficient data)| Tidak akan terjadi jika minimal 100 bar terpenuhi   |
| CCI denominator = 0 (MAD = 0)     | Handle division by zero → CCI = 0                  |
| SSE disconnect (user tutup tab)   | Generator dihentikan otomatis oleh FastAPI           |

---

## 7. Performa & Estimasi Waktu Scan

Scanning ~900 saham IDX secara sequential:
- Per ticker: ~0.5–1.5 detik (download yfinance)
- Total estimasi: **10–25 menit** untuk full scan

**Optimasi Fase 1**:
- Download batch dengan `yf.download(tickers=[...], group_by='ticker')` — lebih cepat
- Batch 10 ticker sekaligus → estimasi **2–5 menit**

**Optimasi Fase 2** (opsional, bukan scope v1):
- Async concurrent download
- Cache hasil scan per hari

---

## 8. CORS & Static File Serving

FastAPI akan serve frontend static files langsung:

```python
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app.mount("/static", StaticFiles(directory="../frontend"), name="static")

@app.get("/")
async def root():
    return FileResponse("../frontend/index.html")
```

Tidak perlu server terpisah untuk frontend.

---

## 9. Daftar Saham IDX

- Sumber: Daftar ticker IDX dari file JSON hardcoded (dikumpulkan dari data publik IDX)
- Format: `["AAAA.JK", "BBBB.JK", ...]`
- File: `backend/stocks.py` — berisi fungsi `get_all_tickers() -> list[str]`
- Jumlah: ~900 ticker
- Update: Manual (tidak ada auto-update di v1)

---

## 10. requirements.txt

```
fastapi>=0.115.0
uvicorn[standard]>=0.30.0
yfinance>=0.2.40
pandas>=2.0.0
numpy>=1.26.0
```
