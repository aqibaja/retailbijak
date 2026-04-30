# SwingAQ Scanner — Task Breakdown

> Gunakan file ini untuk melacak progress implementasi.
> Update status saat mulai mengerjakan dan saat selesai.
> Format: `[ ]` todo | `[/]` in-progress | `[x]` done

---

## 📋 Status Keseluruhan

**Planning**: ✅ Selesai
**Implementasi**: ✅ Contract hardening + browser verification + docs sync in progress/terverifikasi

> Catatan: bagian lama masih menyimpan roadmap implementasi awal SwingAQ. Untuk status terbaru RetailBijak, lihat `planning/idx-api-retailbijak-24h-plan.md`.

---

## Phase 1: Setup Proyek

- [x] **TASK-01**: Buat struktur direktori proyek
  ```
  SwingAQ/
  ├── backend/
  ├── frontend/
  └── planning/ (sudah ada)
  ```

- [x] **TASK-02**: Buat `backend/requirements.txt`
  ```
  fastapi>=0.115.0
  uvicorn[standard]>=0.30.0
  yfinance>=0.2.40
  pandas>=2.0.0
  numpy>=1.26.0
  ```

- [x] **TASK-03**: Install dependencies (venv)
  ```bash
  cd backend
  pip install -r requirements.txt
  ```

---

## Phase 2: Backend — Indikator (`indicators.py`)

> Referensi: `planning/SIGNAL_LOGIC.md` — WAJIB dibaca sebelum mengerjakan ini.

- [x] **TASK-04**: Implementasi fungsi `hlc3(high, low, close) -> pd.Series`
  - HLC3 = (High + Low + Close) / 3

- [x] **TASK-05**: Implementasi fungsi `magic_line(high, low, period=9) -> pd.Series`
  - Donchian midline: (lowest(low, N) + highest(high, N)) / 2
  - BUKAN Bollinger Band, BUKAN SMA

- [x] **TASK-06**: Implementasi fungsi `mean_absolute_deviation(series, period) -> pd.Series`
  - MAD, BUKAN standard deviation
  - Digunakan sebagai `ta.dev` di PineScript

- [x] **TASK-07**: Implementasi fungsi `cci(high, low, close, period=33) -> pd.Series`
  - Formula: `(hlc3 - SMA(hlc3, N)) / (0.015 * MAD(hlc3, N))`
  - Handle division by zero jika MAD = 0

- [x] **TASK-08**: Implementasi fungsi `stop_loss(low, lookback=20) -> pd.Series`
  - Swing Low = `low.rolling(lookback).min()`

- [x] **TASK-09**: Implementasi fungsi `compute_swingaq_signals(df, ...) -> pd.DataFrame`
  - State machine BUY dengan loop iteratif (WAJIB loop, tidak bisa vectorized)
  - State variables: `ever_below_100`, `pending_buy`, `pending_bar`
  - Output kolom tambahan: `magic_line`, `cci`, `sl`, `buy_signal`, `sell_signal`
  - Referensi implementasi Python ada di `SIGNAL_LOGIC.md` Section 7

- [x] **TASK-10**: Implementasi fungsi `has_active_buy_signal(df) -> dict | None`
  - Panggil `compute_swingaq_signals`
  - Cek hanya bar terakhir (`df.iloc[-1]`)
  - Return dict dengan field sesuai `API_SPEC.md` jika ada sinyal

- [ ] **TASK-11**: Unit test `indicators.py` (deferred to Phase 9)
  - Buat `backend/test_indicators.py`
  - Test magic_line dengan data sederhana
  - Test CCI dengan data diketahui hasilnya
  - Test state machine: simulasi sequence CCI yang harus trigger BUY
  - Test edge cases: MAD=0, data kurang dari minimum, NaN values

---

## Phase 3: Backend — Daftar Saham (`stocks.py`)

- [x] **TASK-12**: Kumpulkan daftar semua ticker IDX (.JK) — 702 tickers
  - Sumber: Wikipedia/IDX/data publik
  - Format JSON: `["AALI.JK", "ACES.JK", ...]`
  - Target: ~900 ticker

- [x] **TASK-13**: Implementasi `stocks.py`
  ```python
  def get_all_tickers() -> list[str]:
      """Kembalikan list semua ticker IDX dengan suffix .JK"""
      ...
  
  def get_ticker_name(ticker: str) -> str:
      """Kembalikan nama perusahaan dari ticker (jika tersedia)"""
      ...
  ```

- [x] **TASK-14**: Validasi: pastikan semua ticker valid format `.JK`

---

## Phase 4: Backend — Scanner (`scanner.py`)

> Referensi: `planning/ARCHITECTURE.md` Section 4 & 5

- [x] **TASK-15**: Implementasi fungsi `download_ohlcv(ticker, timeframe) -> pd.DataFrame | None`
  - Gunakan `yfinance`
  - Map timeframe: `4h` → download `1h` lalu resample
  - Lookback period sesuai tabel di `ARCHITECTURE.md` Section 5
  - Retry 2x jika gagal, delay 1 detik antar retry
  - Return `None` jika error atau data < 100 bar

- [x] **TASK-16**: Implementasi fungsi `resample_to_h4(df_1h) -> pd.DataFrame`
  - Resample `1H` OHLCV ke `4H`
  - Gunakan: Open=first, High=max, Low=min, Close=last, Volume=sum

- [x] **TASK-17**: Implementasi `scan_ticker(ticker, timeframe) -> dict | None`
  - Download data → validasi → hitung sinyal → return result atau None
  - Sesuai format return `API_SPEC.md` `result.data`

- [x] **TASK-18**: Implementasi async generator `scan_all(timeframe) -> AsyncGenerator`
  - Yield SSE events: `start`, `progress`, `result`, `error`, `done`
  - Track: `signals_found`, `total_scanned`, `total_skipped`, waktu mulai
  - Download batch 10 ticker sekaligus (`yf.download(tickers=[...])`)
  - Yield `asyncio.sleep(0)` di setiap iterasi agar SSE tidak blocking

---

## Phase 5: Backend — FastAPI App (`main.py`)

> Referensi: `planning/API_SPEC.md`

- [x] **TASK-19**: Setup FastAPI app dengan CORS middleware
  ```python
  app = FastAPI(title="SwingAQ Scanner", version="1.0.0")
  ```

- [x] **TASK-20**: Serve static files dari `../frontend/`
  - Mount `/static` → direktori frontend
  - `GET /` → return `index.html`

- [x] **TASK-21**: Implementasi `GET /api/health`
  - Return `{"status": "ok", "version": "1.0.0"}`

- [x] **TASK-22**: Implementasi `GET /api/timeframes`
  - Return daftar timeframe yang tersedia

- [x] **TASK-23**: Implementasi `GET /api/stocks`
  - Return daftar ticker dari `stocks.py`

- [x] **TASK-24**: Implementasi `GET /api/scan?timeframe=1d`
  - Validasi parameter `timeframe`
  - Return `StreamingResponse` dengan `media_type="text/event-stream"`
  - Header: `Cache-Control: no-cache`, `X-Accel-Buffering: no`
  - Panggil `scan_all(timeframe)` sebagai generator

---

## Phase 6: Frontend — HTML (`index.html`)

> Referensi: `planning/UI_SPEC.md` Section 8

- [x] **TASK-25**: Buat struktur HTML dasar
  - Header dengan logo dan tagline
  - Section: control-panel, progress-section, stats-bar, results-section
  - Toast container

- [x] **TASK-26**: Buat Control Panel
  - Timeframe button group (Daily, H1, H4, Weekly, Monthly)
  - Tombol "Start Scan" dengan id `btn-scan`

- [x] **TASK-27**: Buat Progress Section
  - Progress bar visual
  - Teks: percent, count (current/total), ticker saat ini

- [x] **TASK-28**: Buat Stats Bar
  - Signals found, Scanned, Skipped, Duration

- [x] **TASK-29**: Buat Results Table
  - Kolom: #, Ticker, TF, Date, Close, Magic Line, CCI, Stop Loss, SL%
  - Filter input di atas tabel
  - Empty state message

---

## Phase 7: Frontend — CSS (`style.css`)

> Referensi: `planning/UI_SPEC.md` Section 1–5

- [x] **TASK-30**: CSS variables / design tokens (color palette, typography)
- [x] **TASK-31**: Reset & base styles
- [x] **TASK-32**: Header styles
- [x] **TASK-33**: Control panel styles (button group, scan button states)
- [x] **TASK-34**: Progress bar styles + animation
- [x] **TASK-35**: Stats bar styles
- [x] **TASK-36**: Table styles (dark, hover, sorted column highlight)
- [x] **TASK-37**: Row entry animation (fade-in hijau untuk row baru)
- [x] **TASK-38**: Toast notification styles
- [x] **TASK-39**: Responsive mobile styles (tabel scroll horizontal)

---

## Phase 8: Frontend — JavaScript (`app.js`)

> Referensi: `planning/UI_SPEC.md` Section 6

- [x] **TASK-40**: State management object
- [x] **TASK-41**: UI state setter (inline in startScan + handleDone)
- [x] **TASK-42**: Timeframe selector logic (button group toggle)
- [x] **TASK-43**: `startScan()` — buka EventSource, handle events
- [x] **TASK-44**: `handleStart(data)` — inisialisasi progress section
- [x] **TASK-45**: `handleProgress(data)` — update progress bar dan ticker text
- [x] **TASK-46**: `handleResult(data)` — append row ke tabel dengan animasi
- [x] **TASK-47**: `handleDone(data)` — update stats bar, ubah tombol ke "Scan Again"
- [x] **TASK-48**: `handleTickerError(data)` — increment skipped counter
- [x] **TASK-49**: `addTableRow(result)` — buat HTML row dan append ke tbody
- [x] **TASK-50**: `fmt(n)` — format angka dengan separator ribuan
- [x] **TASK-51**: SL % warna merah/hijau via CSS class
- [x] **TASK-52**: Filter input handler (client-side search by ticker)
- [x] **TASK-53**: Column sort handler
- [x] **TASK-54**: `showToast(message, type)` — toast notification
- [x] **TASK-55**: Error handling SSE disconnect

---

## Phase 9: Testing & Validasi

- [ ] **TASK-56**: Test scan Daily timeframe — pastikan sinyal masuk akal
- [ ] **TASK-57**: Validasi manual: ambil 1 saham yang ada sinyal, cek di TradingView dengan SwingAQ
- [ ] **TASK-58**: Test SSE disconnect (tutup tab saat scanning) — pastikan server berhenti
- [ ] **TASK-59**: Test dengan timeframe H1 dan Weekly
- [ ] **TASK-60**: Test filter dan sort tabel
- [ ] **TASK-61**: Test edge cases: ticker yang tidak ada data, data sangat sedikit

---

## Phase 10: Polish & README

- [ ] **TASK-62**: Review UI — pastikan terlihat premium dan profesional
- [ ] **TASK-63**: Tambah loading skeleton di tabel
- [ ] **TASK-64**: Buat `README.md` di root dengan instruksi quick start
- [ ] **TASK-65**: Tambah komentar di semua file Python yang complex

---

## 🔑 Urutan Pengerjaan yang Direkomendasikan

```
TASK-01,02,03         → Setup
TASK-04..11           → indicators.py (logic paling penting)
TASK-12..14           → stocks.py
TASK-15..18           → scanner.py
TASK-19..24           → main.py
TASK-25..29           → index.html
TASK-30..39           → style.css
TASK-40..55           → app.js
TASK-56..61           → Testing
TASK-62..65           → Polish
```

---

## ⚠️ Hal Penting yang Sering Salah

1. **`ta.dev` di PineScript = MAD (Mean Absolute Deviation), BUKAN std dev**
   → Gunakan `.rolling().apply(lambda x: np.mean(np.abs(x - np.mean(x))))`

2. **BUY Logic WAJIB pakai loop iteratif**, tidak bisa pure pandas vectorized
   → State `everBelow100` dan `pendingBuy` bergantung pada history bar sebelumnya

3. **🔴 `everBelow100[1]` = nilai bar SEBELUMNYA, BUKAN nilai saat ini**
   → Simpan `prev_ever_below_100 = ever_below_100` SEBELUM update `if cci < -100`
   → Lalu gunakan `prev_ever_below_100` pada cek `if cross_up_minus100 and prev_ever_below_100`
   → Lihat detail fix di `SIGNAL_LOGIC.md` Section 7

4. **H4 tidak ada native di yfinance** → download `1h` lalu resample ke `4h`

5. **Ticker IDX di Yahoo Finance menggunakan suffix `.JK`**
   → `BBCA` di IDX = `BBCA.JK` di yfinance

6. **SSE harus dibaca dengan `EventSource`, bukan `fetch`**
   → Gunakan `new EventSource('/api/scan?timeframe=1d')`

7. **Close connection SSE saat done**
   → `evtSource.close()` setelah event `done` diterima
