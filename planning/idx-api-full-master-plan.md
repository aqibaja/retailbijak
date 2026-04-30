# retailbijak IDX-API Full Implementation Master Plan

> **For Hermes:** Jalankan dengan `software-development/continuous-development-flow`, implement per task kecil, test dulu, lalu commit per milestone.

**Goal:**  
Menyelesaikan integrasi IDX-API end-to-end di retailbijak: sync data harian, simpan lokal, hitung scoring, expose API backend yang stabil, lalu wiring ke frontend dashboard/detail/screener agar website terasa hidup walau data belum lengkap.

**Architecture:**  
IDX-API menjadi sumber data harian utama. Backend hanya sync terjadwal ke SQLite, lalu semua endpoint publik membaca dari DB/cache lokal. Setiap endpoint wajib punya fallback shape yang konsisten agar frontend tidak blank. Frontend tetap memakai dummy/fallback content saat data live belum tersedia.

**Tech Stack:**  
FastAPI, SQLAlchemy, SQLite, APScheduler, pytest, Vanilla JS SPA, Chart.js, systemd.

---

## Prinsip kerja
- Data diambil **1x/hari**
- Tidak realtime
- Tidak fetch provider eksternal di request path
- Semua endpoint harus punya fallback
- Semua logic baru harus ditest
- Commit kecil per task
- Frontend tidak boleh blank

---

## Final scope
### Harus selesai
- IDX-API client
- normalizer
- SQLite schema
- daily sync job
- scoring engine
- scanner engine
- API detail saham
- API analysis saham
- API market summary
- API sector summary
- response factory fallback
- frontend dashboard wiring
- frontend detail saham wiring
- frontend screener wiring
- deploy runtime
- tests
- docs
- commit + push

---

# PHASE 1 — Backend foundation

## Task 1: Audit route, model, dan contract data
**Objective:** Menetapkan contract final supaya backend/frontend tidak saling nebak.

**Files:**
- Read: `backend/main.py`
- Read: `backend/database.py`
- Read: `backend/scheduler.py`
- Read: `backend/routes/scanner.py`
- Read: `backend/services/*`
- Create: `docs/idx-api-endpoint-map.md`
- Create: `docs/idx-api-contract.md`

**Output wajib:**
- daftar endpoint IDX-API yang dipakai
- field penting per endpoint
- mapping ke tabel lokal
- contract response internal untuk:
  - stock detail
  - analysis
  - market summary
  - scanner
  - sector snapshot

**Done when:**
- contract jelas
- tidak ada route yang masih ambigu

---

## Task 2: IDX-API client adapter
**Objective:** Membuat adapter tunggal untuk semua request IDX-API.

**Files:**
- Create: `backend/services/idx_api_client.py`
- Create: `backend/services/idx_api_models.py`
- Modify: `backend/services/__init__.py`
- Create: `backend/tests/test_idx_api_client.py`

**Wajib ada:**
- configurable base URL
- timeout
- retry/backoff
- safe error handling
- parse JSON
- helper `get_json(path, params=None)`

**Test minimal:**
- build URL benar
- retry jalan
- HTTP error tidak crash
- network error tidak crash

**Done when:**
- `pytest` pass untuk client

---

## Task 3: Normalizer layer
**Objective:** Mengubah payload IDX-API jadi format internal konsisten.

**Files:**
- Create: `backend/services/idx_normalizer.py`
- Create: `backend/tests/test_idx_normalizer.py`

**Wajib normalize:**
- ticker uppercase
- angka string → float/int
- null / blank aman
- field alias disatukan:
  - close / last / price
  - per / pe
  - pbv / price_to_book
  - dividend_yield / dy

**Output internal minimal:**
- `ticker`
- `trade_date`
- `close`
- `change_pct`
- `market_cap`
- `per`
- `pbv`
- `roe`
- `roa`
- `dividend_yield`
- `volume`
- `payload_json`
- `updated_at`

**Done when:**
- test normalizer pass
- payload kosong tetap aman

---

## Task 4: SQLite schema IDX
**Objective:** Menyediakan storage lokal untuk data harian + scoring cache.

**Files:**
- Modify: `backend/database.py`
- Create: `backend/tests/test_idx_schema.py`

**Tabel minimal:**
- `idx_daily_price`
- `idx_company_profile`
- `idx_financial_ratio`
- `idx_dividend_history`
- `stock_scores`
- `scanner_cache`

**Kolom minimal per raw table:**
- `ticker`
- `trade_date` / `updated_at`
- `source`
- `payload`

**Done when:**
- tabel bisa dibuat
- insert/select jalan
- unique key aman

---

## Task 5: Daily sync job
**Objective:** Sync IDX-API ke SQLite 1x/hari dan tidak gagal total kalau satu endpoint error.

**Files:**
- Create: `backend/jobs/idx_daily_sync.py`
- Modify: `backend/scheduler.py`
- Create: `backend/tests/test_idx_daily_sync.py`

**Flow sync:**
1. ambil ticker universe
2. fetch snapshot harian
3. fetch ratio/fundamental/dividend
4. normalisasi
5. simpan raw payload + snapshot
6. commit DB

**Rules:**
- kalau satu endpoint gagal, lanjut
- job idempotent
- kalau ticker list kosong, return aman

**Done when:**
- job manual jalan
- DB terisi
- scheduler boot aman

---

# PHASE 2 — Scoring and scanner backend

## Task 6: Swing score engine
**Objective:** Menghasilkan skor swing yang bisa dipakai dashboard/scanner/detail.

**Files:**
- Create: `backend/services/scoring/swing.py`
- Create: `backend/tests/test_scoring_swing.py`

**Signals awal:**
- trend score
- volume spike
- breakout
- liquidity
- volatility

**Output:**
- `score` 0–100
- `label`
- `reasons[]`

**Done when:**
- breakout + volume spike menghasilkan score tinggi
- trend lemah menghasilkan score rendah

---

## Task 7: Valuation engine
**Objective:** Menghitung murah/mahal/fair value proxy.

**Files:**
- Create: `backend/services/scoring/valuation.py`
- Create: `backend/tests/test_scoring_valuation.py`

**Signal:**
- PER
- PBV
- ROE
- price
- target PER/PBV proxy

**Output:**
- `score`
- `label`
- `fair_value`
- `upside_pct`
- `reasons[]`

**Done when:**
- murah → score tinggi
- mahal → score rendah

---

## Task 8: Gorengan score
**Objective:** Menilai saham spekulatif / gorengan.

**Files:**
- Create: `backend/services/scoring/gorengan.py`
- Create: `backend/tests/test_scoring_gorengan.py`

**Signal:**
- market cap kecil
- volume spike ekstrem
- volatility tinggi
- PER/PBV tinggi
- fundamental lemah

**Output:**
- `score`
- `label`
- `reasons[]`

**Done when:**
- small cap + spike → score tinggi

---

## Task 9: Dividend score
**Objective:** Menilai saham dividen menarik.

**Files:**
- Create: `backend/services/scoring/dividend.py`
- Create: `backend/tests/test_scoring_dividend.py`

**Signal:**
- dividend yield
- consistency
- payout ratio
- fundamental support

**Output:**
- `score`
- `label`
- `reasons[]`

---

## Task 10: Scanner engine
**Objective:** Scanner backend yang memberi hasil relevan dari data lokal.

**Files:**
- Create: `backend/services/scanner_engine.py`
- Create: `backend/tests/test_scanner_engine.py`
- Modify: `backend/routes/scanner.py`
- Modify: `backend/main.py`

**Preset rules MVP:**
- `swing_breakout`
- `value_cheap`
- `dividend_pick`
- `gorengan_watchlist`
- `low_risk`

**Output row:**
- ticker
- name
- price
- scores
- tags
- recommendation label

**Done when:**
- scanner bisa filter per rule
- hasil di-sort by relevance
- tetap ada fallback bila data kosong

---

# PHASE 3 — Backend API final

## Task 11: Response factory / fallback templates
**Objective:** Semua endpoint punya shape yang stabil walau data kosong.

**Files:**
- Create: `backend/services/idx_response_factory.py`
- Create: `backend/tests/test_idx_response_factory.py`

**Template wajib:**
- stock detail fallback
- analysis fallback
- market summary fallback
- scanner fallback
- sector fallback

**Rules:**
- status bisa `ok`, `empty`, atau `demo`
- response selalu konsisten
- frontend tidak perlu nebak key

**Done when:**
- fallback shape lulus test

---

## Task 12: Stock detail API
**Objective:** Endpoint detail saham jadi sumber utama frontend detail page.

**Files:**
- Create/Modify: `backend/routes/stocks.py`
- Modify: `backend/main.py`
- Create: `backend/tests/test_api_stocks.py`

**Endpoint:**
- `GET /api/stocks/{ticker}`

**Return minimal:**
- ticker
- name
- price
- change_pct
- volume
- market_cap
- per
- pbv
- roe
- dividend_yield
- status
- updated_at

**Done when:**
- ticker valid → data keluar
- ticker tidak ada → fallback aman
- response shape stabil

---

## Task 13: Stock analysis API
**Objective:** Endpoint analisa gabungan untuk detail dan scanner cards.

**Files:**
- Create/Modify: `backend/routes/analysis.py`
- Modify: `backend/main.py`
- Create: `backend/tests/test_api_analysis.py`

**Endpoint:**
- `GET /api/stocks/{ticker}/analysis`

**Return minimal:**
- swing score
- valuation score
- gorengan score
- dividend score
- fair value
- upside pct
- reasons
- tags
- recommendation label

**Done when:**
- analysis bisa dipakai detail page
- response tetap ada saat data sebagian kosong

---

## Task 14: Market summary API
**Objective:** Menyediakan snapshot market untuk topbar/dashboard.

**Files:**
- Create/Modify: `backend/routes/market.py`
- Modify: `backend/main.py`
- Create: `backend/tests/test_api_market_summary.py`

**Endpoint:**
- `GET /api/market/summary`

**Return minimal:**
- symbol
- value
- change_pct
- status
- source
- updated_at
- adv/decl jika ada

**Done when:**
- topbar bisa baca data ini
- fallback selalu ada

---

## Task 15: Sector summary API
**Objective:** Menambah informasi market lebih informatif.

**Files:**
- Create: `backend/routes/sectors.py`
- Modify: `backend/main.py`
- Create: `backend/tests/test_api_sectors.py`

**Endpoint:**
- `GET /api/sectors`

**Return minimal:**
- sector name
- count
- performance
- strength label
- updated_at

**Done when:**
- dashboard/market bisa tampilkan sektor
- fallback aman

---

## Task 16: Scanner API final
**Objective:** Scanner endpoint bisa dipakai frontend tanpa SSE berat jika data lokal tersedia.

**Files:**
- Modify: `backend/routes/scanner.py`
- Modify: `backend/main.py`
- Create: `backend/tests/test_api_scanner.py`

**Endpoint:**
- `GET /api/scanner?rule=...`

**Return minimal:**
- count
- data[]
- rule
- status
- updated_at

**Done when:**
- rule param berfungsi
- response ada walau DB kosong

---

## Task 17: Route registration & import cleanup
**Objective:** Semua route terdaftar dan import aman.

**Files:**
- Modify: `backend/main.py`
- Modify: `backend/routes/__init__.py`
- Modify: `backend/services/__init__.py`

**Checklist:**
- no circular import
- router terdaftar:
  - stocks
  - analysis
  - market
  - sectors
  - scanner

**Done when:**
- `py_compile` lulus

---

# PHASE 4 — Frontend wiring

## Task 18: Dashboard wiring
**Objective:** Dashboard membaca market summary + analysis endpoint, bukan placeholder terus.

**Files:**
- Modify: `frontend/js/views/dashboard.js`
- Modify: `frontend/js/main.js`
- Modify: `frontend/style.css`

**Wiring target:**
- topbar market summary
- top movers
- swing candidates
- value candidates
- news section
- fallback demo kalau API kosong

**Done when:**
- dashboard first fold tidak kosong
- mobile tetap hidup

---

## Task 19: Stock detail wiring
**Objective:** Detail saham menampilkan analysis + valuation + scores.

**Files:**
- Modify: `frontend/js/views/stock_detail.js`
- Modify: `frontend/style.css`

**Wiring target:**
- `/api/stocks/{ticker}`
- `/api/stocks/{ticker}/analysis`

**Isi UI:**
- chart ringkas
- fair value
- murah/mahal
- swing score
- gorengan warning
- dividend info
- fallback demo

**Done when:**
- route detail usable
- tidak blank

---

## Task 20: Screener wiring
**Objective:** Screener pakai backend scanner API dan preset rule.

**Files:**
- Modify: `frontend/js/views/screener.js`
- Modify: `frontend/style.css`

**Wiring target:**
- `rule=swing_breakout`
- `rule=value_cheap`
- `rule=dividend_pick`
- `rule=gorengan_watchlist`

**Done when:**
- hasil scanner terisi
- fallback demo tetap ada
- mobile layout bagus

---

## Task 21: Mobile nav polish
**Objective:** Nav HP simpel, tidak dua lapis, tetap enak dipakai.

**Files:**
- Modify: `frontend/index.html`
- Modify: `frontend/style.css`
- Modify: `frontend/js/main.js`

**Checklist:**
- bottom nav satu baris
- menu utama jelas
- mobile first fold tidak kosong
- drawer / quick actions tetap rapi

**Done when:**
- mobile enak dipakai
- tidak ada nav aneh

---

# PHASE 5 — Validation, deploy, docs

## Task 22: E2E tests backend
**Objective:** Mengunci contract API.

**Files:**
- Modify/Create: `backend/tests/test_api_e2e.py`

**Test minimal:**
- health
- stock detail
- analysis
- market summary
- scanner
- sectors

**Done when:**
- endpoint shape stabil
- test pass

---

## Task 23: Deploy to runtime
**Objective:** Sinkron repo kerja ke runtime production.

**Files:**
- `/opt/swingaq/backend/*`
- `/opt/swingaq/frontend/*`

**Steps:**
- copy file
- restart service
- check health
- check browser

**Done when:**
- production memakai code terbaru

---

## Task 24: Documentation
**Objective:** Biar next work mudah diteruskan.

**Files:**
- `README.md`
- `DEPLOY.md`
- `docs/idx-api-endpoint-map.md`
- `docs/idx-api-contract.md`
- `docs/scoring-formulas.md`
- `docs/scanner-rules.md`

**Done when:**
- dokumen menjelaskan contract dan flow

---

## Task 25: Commit + push
**Objective:** Semua perubahan permanen di repo.

**Rule:**
- commit per milestone
- push setelah verifikasi

---

# Urutan eksekusi paling aman
Kalau mau “sekali jalan”, urutan saya:
1. Audit contract
2. Client + normalizer
3. DB schema
4. Sync job
5. Scoring engines
6. Scanner engine
7. Response factory
8. Stock detail API
9. Analysis API
10. Market summary API
11. Sector API
12. Scanner API final
13. Route cleanup
14. Frontend wiring
15. Mobile polish
16. E2E tests
17. Deploy
18. Docs
19. Commit + push

---

# Definition of Done
Kalau plan ini selesai, berarti:
- IDX-API sudah jadi sumber data harian utama
- backend API sudah lengkap
- frontend dashboard/detail/screener sudah terhubung
- UI tetap hidup saat data kosong
- no blank state
- no Yahoo dependency di request path
- backend dan frontend siap dipakai harian

---

Kalau kamu mau, saya bisa lanjut ubah plan ini jadi checklist implementasi file-per-file yang lebih teknis lagi, atau langsung eksekusi Task 1 sekarang.
