# SwingAQ Scanner — API Specification

---

## Base URL

```
http://localhost:8000
```

---

## Endpoints

### 1. `GET /`
**Deskripsi**: Serve halaman utama frontend.

**Response**: `text/html` — `index.html`

---

### 2. `GET /api/timeframes`
**Deskripsi**: Mengembalikan daftar timeframe yang tersedia.

**Response**:
```json
{
  "timeframes": [
    { "value": "1d",  "label": "Daily" },
    { "value": "1h",  "label": "H1" },
    { "value": "4h",  "label": "H4" },
    { "value": "1wk", "label": "Weekly" },
    { "value": "1mo", "label": "Monthly" }
  ]
}
```

---

### 3. `GET /api/scan`
**Deskripsi**: Scan semua saham IDX untuk sinyal BUY SwingAQ pada timeframe tertentu.
Menggunakan **Server-Sent Events (SSE)** untuk streaming progress dan hasil secara real-time.

**Query Parameters**:
| Parameter   | Tipe   | Required | Default | Keterangan                            |
|-------------|--------|----------|---------|---------------------------------------|
| `timeframe` | string | Ya       | `1d`    | Timeframe: `1d`, `1h`, `4h`, `1wk`, `1mo` |

**Request Headers**:
```
Accept: text/event-stream
Cache-Control: no-cache
```

**SSE Event Format**:

Setiap event adalah JSON dengan field `type`. Browser parse via `JSON.parse(event.data)`.

#### Event: `start`
Dikirim satu kali di awal scan.
```json
{
  "type": "start",
  "total": 900,
  "timeframe": "1d",
  "timestamp": "2024-11-20T10:30:00"
}
```

#### Event: `progress`
Dikirim setiap satu ticker selesai diproses.
```json
{
  "type": "progress",
  "current": 42,
  "total": 900,
  "ticker": "BBCA.JK",
  "percent": 4.67
}
```

#### Event: `result`
Dikirim hanya jika ticker memiliki sinyal BUY aktif.
```json
{
  "type": "result",
  "data": {
    "ticker"      : "BBCA.JK",
    "name"        : "Bank Central Asia Tbk",
    "close"       : 9450.0,
    "magic_line"  : 9200.5,
    "cci"         : -87.3,
    "stop_loss"   : 8900.0,
    "sl_pct"      : -5.82,
    "date"        : "2024-11-20",
    "timeframe"   : "1d"
  }
}
```

**Penjelasan field `result.data`**:
| Field        | Tipe   | Keterangan                                              |
|--------------|--------|---------------------------------------------------------|
| `ticker`     | string | Ticker Yahoo Finance (e.g., `BBCA.JK`)                 |
| `name`       | string | Nama perusahaan (dari yfinance info, atau hardcoded)    |
| `close`      | float  | Harga close bar terakhir                               |
| `magic_line` | float  | Nilai Magic Line (Donchian midline) bar terakhir       |
| `cci`        | float  | Nilai CCI bar terakhir (setelah crossover -100)        |
| `stop_loss`  | float  | Level Stop Loss = Swing Low 20 bar terakhir            |
| `sl_pct`     | float  | % jarak SL dari close (negatif = di bawah close)       |
| `date`       | string | Tanggal/waktu bar terakhir yang menghasilkan sinyal    |
| `timeframe`  | string | Timeframe yang di-scan                                 |

**Kalkulasi `sl_pct`**:
```
sl_pct = ((stop_loss - close) / close) * 100
```

#### Event: `error`
Dikirim jika ada error pada ticker tertentu (non-fatal, scan lanjut).
```json
{
  "type": "error",
  "ticker": "XXXX.JK",
  "message": "No data available"
}
```

#### Event: `done`
Dikirim satu kali di akhir scan.
```json
{
  "type": "done",
  "total_signals": 12,
  "total_scanned": 895,
  "total_skipped": 5,
  "duration_seconds": 145.3,
  "timeframe": "1d"
}
```

**Example SSE Stream** (raw):
```
data: {"type":"start","total":900,"timeframe":"1d","timestamp":"2024-11-20T10:30:00"}

data: {"type":"progress","current":1,"total":900,"ticker":"AALI.JK","percent":0.11}

data: {"type":"progress","current":2,"total":900,"ticker":"ACES.JK","percent":0.22}

data: {"type":"result","data":{"ticker":"BBCA.JK","close":9450.0,...}}

data: {"type":"done","total_signals":12,"total_scanned":895,...}
```

---

### 4. `GET /api/stocks`
**Deskripsi**: Mengembalikan daftar semua ticker IDX yang akan di-scan.

**Response**:
```json
{
  "count": 900,
  "tickers": ["AALI.JK", "ACES.JK", "ADHI.JK", "..."]
}
```

---

### 5. `GET /api/health`
**Deskripsi**: Health check endpoint.

**Response**:
```json
{
  "status": "ok",
  "version": "1.0.0"
}
```

---

## Error Handling (HTTP Errors)

| Status | Kondisi                            | Response                            |
|--------|------------------------------------|-------------------------------------|
| 400    | Timeframe tidak valid              | `{"detail": "Invalid timeframe"}`   |
| 500    | Internal server error              | `{"detail": "Internal error"}`      |

---

## FastAPI Implementation Notes

### SSE Response Pattern
```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import asyncio
import json

async def scan_generator(timeframe: str):
    tickers = get_all_tickers()
    yield f"data: {json.dumps({'type':'start','total':len(tickers)})}\n\n"
    
    signals_found = 0
    for i, ticker in enumerate(tickers):
        try:
            result = await scan_ticker(ticker, timeframe)
            progress_event = {
                "type": "progress",
                "current": i + 1,
                "total": len(tickers),
                "ticker": ticker,
                "percent": round((i + 1) / len(tickers) * 100, 2)
            }
            yield f"data: {json.dumps(progress_event)}\n\n"
            
            if result:
                signals_found += 1
                yield f"data: {json.dumps({'type':'result','data':result})}\n\n"
                
        except Exception as e:
            yield f"data: {json.dumps({'type':'error','ticker':ticker,'message':str(e)})}\n\n"
        
        await asyncio.sleep(0)  # Yield control to event loop
    
    yield f"data: {json.dumps({'type':'done','total_signals':signals_found})}\n\n"

@app.get("/api/scan")
async def scan(timeframe: str = "1d"):
    valid_tfs = ["1d", "1h", "4h", "1wk", "1mo"]
    if timeframe not in valid_tfs:
        raise HTTPException(400, "Invalid timeframe")
    
    return StreamingResponse(
        scan_generator(timeframe),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )
```

### CORS Configuration
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```
