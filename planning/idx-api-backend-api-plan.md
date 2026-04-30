# IDX-API Backend API Implementation Plan

> **For Hermes:** Execute this plan bertahap dengan `software-development/continuous-development-flow`, dan gunakan `test-driven-development` untuk setiap endpoint/logic baru.

**Goal:** Menyelesaikan API backend IDX-API yang belum selesai: detail saham, market summary, scanner, analysis payload, dan endpoint pendukung supaya frontend retailbijak bisa membaca data harian yang sudah dinormalisasi.

**Architecture:**
Backend akan menjadi sumber kebenaran untuk semua data IDX. Endpoint publik akan membaca dari SQLite/cache lokal terlebih dahulu, lalu fallback ke snapshot demo bila data masih kosong. API akan menyatukan raw IDX payload, hasil normalisasi, dan hasil scoring ke dalam response yang konsisten untuk dashboard, detail saham, dan screener.

**Tech Stack:** FastAPI, SQLAlchemy, SQLite, pydantic, APScheduler, pytest, Vanilla JS frontend consumer.

---

## Scope

### In scope
- API detail saham
- API market summary
- API stock analysis
- API scanner/filter
- API sector snapshot
- API dividend and valuation summary
- fallback response schema
- route registration di `backend/main.py`
- test endpoint backend
- verifikasi response shape

### Out of scope
- realtime tick data
- broker flow advanced analytics
- chart rendering frontend
- machine learning ranking

---

## Target API contract

### 1. `GET /api/stocks/{ticker}`
Return detail saham gabungan:
- profile dasar
- harga harian terakhir
- fundamental ringkas
- dividend ringkas
- scoring ringkas
- fallback demo bila data kosong

### 2. `GET /api/stocks/{ticker}/analysis`
Return analisa terstruktur:
- swing score
- valuation score
- gorengan score
- dividend score
- fair value
- upside/downside
- alasan/rationale
- tags/preset match

### 3. `GET /api/market/summary`
Return ringkasan market:
- IHSG snapshot
- adv/decl
- volume/value
- top movers
- market status
- fallback snapshot bila data kosong

### 4. `GET /api/scanner`
Return hasil scan lokal:
- list ticker
- score ringkas
- tag preset
- sort order
- filter rule query param

### 5. `GET /api/sectors`
Return ringkasan sektor:
- nama sektor
- jumlah saham
- performa harian
- strength label

### 6. `GET /api/dividend` / `GET /api/value`
Return watchlist/leaderboard untuk screen khusus.

---

## Data source strategy

### Primary source
- SQLite tables hasil sync IDX-API

### Secondary source
- computed scoring cache

### Tertiary fallback
- demo payload statis agar UI tetap hidup

### Rules
- Jika data kosong, API tetap return 200 dengan `status: "demo"` atau `status: "empty"`
- Jangan bikin frontend gagal hanya karena satu tabel belum terisi
- Jangan query provider eksternal di request path

---

## Task 1: Audit current backend route shape

**Objective:** Menentukan route yang sudah ada dan route yang harus diganti/tambah.

**Files:**
- Read: `backend/main.py`
- Read: `backend/routes/scanner.py`
- Read: `backend/database.py`
- Read: `backend/services/scanner_engine.py`
- Read: `backend/services/scoring/*`

**Step 1: Review existing routes**
Catat endpoint yang sudah tersedia dan mana yang masih dummy.

**Step 2: Map missing endpoint**
Tentukan file route baru yang dibutuhkan.

**Step 3: Verify**
Pastikan tidak ada route bentrok atau import cycle.

---

## Task 2: Buat repository/service layer untuk data IDX

**Objective:** Menyediakan helper query yang reusable untuk route.

**Files:**
- Create: `backend/services/idx_repository.py`
- Create: `backend/services/idx_response_factory.py`
- Create: `backend/tests/test_idx_repository.py`

**Step 1: Tulis test repository**
Tes:
- ambil row terakhir per ticker
- ambil snapshot market kosong
- ambil fallback data saat tabel kosong

**Step 2: Implement helper**
Fungsi minimal:
- `get_latest_stock_snapshot(ticker)`
- `get_stock_profile(ticker)`
- `get_stock_analysis(ticker)`
- `get_market_summary()`
- `get_scanner_results(rule=None)`

**Step 3: Verify**
Repository harus return dict yang konsisten, bukan model mentah.

---

## Task 3: Implement `GET /api/stocks/{ticker}`

**Objective:** Endpoint detail saham jadi sumber utama frontend.

**Files:**
- Create/Modify: `backend/routes/stocks.py`
- Modify: `backend/main.py`
- Create: `backend/tests/test_api_stocks.py`

**Step 1: Tulis failing test**
Test response shape:
- ticker valid
- ticker tidak ada
- response punya fallback when empty

**Step 2: Implement endpoint**
Return fields:
- `ticker`
- `name`
- `price`
- `change_pct`
- `volume`
- `market_cap`
- `per`
- `pbv`
- `roe`
- `dividend_yield`
- `status`

**Step 3: Verify**
Curl endpoint dan cek field tersedia.

**Step 4: Commit**
Commit endpoint detail saham.

---

## Task 4: Implement `GET /api/stocks/{ticker}/analysis`

**Objective:** Menyediakan analisa gabungan untuk detail page dan scanner cards.

**Files:**
- Create/Modify: `backend/routes/analysis.py`
- Modify: `backend/main.py`
- Create: `backend/tests/test_api_analysis.py`

**Step 1: Tulis failing test**
Test minimal:
- score semua muncul
- fair value muncul
- label/risk tersedia
- tags tersedia

**Step 2: Implement response mapper**
Gabungkan hasil:
- swing score
- valuation score
- gorengan score
- dividend score
- fair value
- upside pct
- reasons
- recommendation label

**Step 3: Verify**
Response stabil walau data sebagian kosong.

---

## Task 5: Implement `GET /api/market/summary`

**Objective:** Menyediakan snapshot market untuk topbar/dashboard.

**Files:**
- Create/Modify: `backend/routes/market.py`
- Modify: `backend/main.py`
- Create: `backend/tests/test_api_market_summary.py`

**Step 1: Tulis test**
Test:
- market data ada
- market data kosong
- response tetap 200

**Step 2: Implement fallback snapshot**
Fields minimal:
- `symbol`
- `value`
- `change_pct`
- `status`
- `updated_at`
- `source`

**Step 3: Verify**
Topbar frontend bisa baca response lama maupun baru.

---

## Task 6: Implement scanner API berbasis local cache

**Objective:** Scanner backend menampilkan hasil yang relevan dan cepat.

**Files:**
- Modify: `backend/routes/scanner.py`
- Modify: `backend/main.py`
- Create: `backend/tests/test_api_scanner.py`

**Step 1: Tulis test**
Test query param:
- `rule=swing_breakout`
- `rule=value_cheap`
- `rule=dividend_pick`
- `rule=gorengan_watchlist`

**Step 2: Implement query handler**
Return:
- `count`
- `data[]`
- `status`
- `rule`
- `updated_at`

**Step 3: Verify**
Scanner endpoint tetap hidup saat DB kosong.

---

## Task 7: Implement sector snapshot API

**Objective:** Menambah view market dan dashboard yang lebih informatif.

**Files:**
- Create: `backend/routes/sectors.py`
- Modify: `backend/main.py`
- Create: `backend/tests/test_api_sectors.py`

**Step 1: Tulis test**
Response harus ada label sektor dan strength.

**Step 2: Implement minimal**
Jika data IDX sector belum ada, return dummy sector breakdown.

---

## Task 8: Add response factory/fallback templates

**Objective:** Menjamin semua endpoint punya shape tetap walau data kosong.

**Files:**
- Create: `backend/services/idx_response_factory.py`
- Create: `backend/tests/test_idx_response_factory.py`

**Required templates:**
- stock detail fallback
- analysis fallback
- market summary fallback
- scanner fallback
- sector fallback

**Step 1: Tulis test**
Assert default keys always muncul.

**Step 2: Implement**
Gunakan satu factory agar frontend tidak perlu menebak shape.

---

## Task 9: Route registration and import cleanup

**Objective:** Pastikan semua route terdaftar dan import stabil.

**Files:**
- Modify: `backend/main.py`
- Modify: `backend/routes/__init__.py`
- Modify: `backend/services/__init__.py`

**Step 1: Audit imports**
Hindari circular import.

**Step 2: Register routers**
- stocks
- analysis
- market
- scanner
- sectors

**Step 3: Verify**
`py_compile` lulus.

---

## Task 10: End-to-end API verification

**Objective:** Buktikan API backend siap dipakai frontend.

**Files:**
- `backend/tests/test_api_e2e.py`
- maybe `backend/tests/test_api_contract.py`

**Step 1: Tulis e2e tests**
Cek:
- health
- stock detail
- analysis
- market summary
- scanner

**Step 2: Run tests**
Pastikan semua endpoint memiliki response shape konsisten.

**Step 3: Verify live**
Curl/browser check pada runtime produksi bila perlu.

---

## Execution order

1. Audit route/backend shape
2. Service repository + response factory
3. Stock detail API
4. Analysis API
5. Market summary API
6. Scanner API
7. Sector API
8. Route registration cleanup
9. E2E tests
10. Deploy + verify

---

## Definition of done

- Backend punya endpoint detail saham yang stabil
- Backend punya analysis endpoint untuk scoring
- Market summary tersedia untuk topbar/dashboard
- Scanner API membaca local cache/scoring
- Semua endpoint punya fallback/demo response
- Frontend bisa wiring tanpa blank state
- Tests lulus
- Deploy siap

---

## Notes

- Jangan tarik data eksternal langsung di request path.
- Prioritaskan response shape yang konsisten.
- Jika data belum lengkap, return demo/fallback yang bagus.
- Build kecil dulu, lalu perluas.
- Commit per task selesai.
