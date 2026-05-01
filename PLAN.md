# RetailBijak — Consolidated Critical Plan

> Satu-satunya sumber rencana. Semua plan lama sudah dihapus.
> Format: `[ ]` todo | `[/]` in-progress | `[x]` done

---

## Status Snapshot (2026-05-01)

| Area | Status |
|------|--------|
| Backend core (FastAPI, DB, scheduler) | ✅ |
| IDX-API client + normalizer + daily sync | ✅ |
| Scoring engines (swing, valuation, gorengan, dividend) | ✅ |
| Scanner engine (preset rules, analyze_stock) | ✅ |
| All 28 API endpoints | ✅ |
| Frontend SPA (dashboard, detail, screener, market, news, portfolio) | ✅ |
| OG meta tags (title, description, Twitter, OpenGraph) | ✅ |
| Git repo | ⚠️ 2 ahead, 35 uncommitted files |
| Production venv | ❌ Hilang, pakai system python3 |
| Response factory / fallback template | ❌ Belum ada |
| Corporate actions live data | ❌ IDX endpoint return no_data |
| E2E test regression | ❌ Belum di-run ulang |
| Analysis endpoint data quality | ⚠️ Pakai dummy values (volume_spike=1, trend=50) |

---

## TIER 1 — CRITICAL (harus selesai dulu)

### T1: Git sync & commit semua uncommitted changes
**Why:** 35 file belum di-commit, 2 commit local belum di-push. Semua perubahan berisiko hilang.

**Steps:**
1. `git add -A`
2. `git commit -m "feat: live IDX market overview, scoring engines, meta tags, contract tests"`
3. `git push origin main`

**Done when:** `git status` clean, `git log HEAD..origin/main` = 0

---

### T2: Fix production venv
**Why:** `/opt/swingaq/backend/venv/` hilang. Service jalan pakai system python3 — bisa unstable kalau ada dependency mismatch.

**Steps:**
1. `cd /opt/swingaq/backend && python3 -m venv venv`
2. `./venv/bin/pip install -r requirements.txt`
3. Update `/etc/systemd/system/swingaq-backend.service`: ganti `ExecStart` ke `./venv/bin/python -m uvicorn ...`
4. `systemctl daemon-reload && systemctl restart swingaq-backend`
5. Verify health: `curl -s http://127.0.0.1:8000/api/health`

**Done when:** service pakai venv python, health OK

---

### T3: Response factory (fallback templates)
**Why:** Saat data kosong, beberapa endpoint return shape beda-beda. Frontend perlu shape yang konsisten.

**File:** `backend/services/idx_response_factory.py`

**Template wajib:**
```python
def ok(data, source, **meta):      # {"status":"ok", "data":..., "source":..., ...}
def empty(source, message=""):      # {"status":"empty", "data":[], "source":..., "message":...}
def error(message, source):         # {"status":"error", "data":null, "source":..., "error":...}
```

**Endpoints yang perlu dipasang:**
- `/api/corporate-actions` — sekarang return `{"count":0, "data":[], "source":"no_data"}`
- `/api/foreign-trading` — bisa empty
- `/api/broker-activity` — bisa empty
- `/api/top-movers` — bisa empty
- `/api/company-announcements` — bisa empty

**Test:** `pytest tests/test_response_factory.py`

**Done when:** semua endpoint empty state punya shape identik

---

## TIER 2 — HIGH (segera setelah T1-T3)

### T4: Investigasi & fix corporate actions endpoint
**Why:** `/api/corporate-actions` selalu return `{"count":0, "data":[], "source":"no_data"}`

**Root cause kemungkinan:**
- IDX API endpoint path salah untuk listing/dividend/suspension
- Response format berbeda dari yang di-parse
- Session/cookie expired

**Steps:**
1. Test langsung IDX endpoints dari terminal:
   - `curl` ke `/primary/DigitalStatistic/GetApiDataPaginated?urlName=LINK_LISTING`
   - `curl` ke `/primary/ListedCompany/GetDividend`
   - `curl` ke `/primary/ListedCompany/GetSuspension`
2. Bandingkan response format dengan parsing di `main.py:440-457`
3. Fix parser sesuai response aktual
4. Jika endpoint IDX memang tidak tersedia, ganti ke sumber lain atau hide section

**Done when:** corporate actions return data atau section di-hide dengan clear message

---

### T5: Analysis endpoint — real data injection
**Why:** `/api/stocks/{ticker}/analysis` pakai dummy values (`volume_spike=1, trend_score=50, volatility_score=50`). Scoring hasilnya selalu generik.

**Current code (main.py:383-409):**
```python
analysis = analyze_stock({...,
    "volume_spike": 1,    # dummy
    "trend_score": 50,    # dummy
    "liquidity_score": 50, # dummy
    "volatility_score": 50, # dummy
    "breakout": False,    # dummy
})
```

**Fix:** Hitung real values dari OHLCV data:
1. Ambil 20 hari terakhir OHLCV dari DB
2. Hitung: `volume_spike = volume_today / avg_volume_20d`
3. Hitung: `trend_score` dari SMA crossover / price vs SMA
4. Hitung: `volatility_score` dari ATR / close
5. Hitung: `breakout` dari close > highest high N days
6. Inject ke scoring engine

**File:** modifikasi `main.py` endpoint analysis + tambah helper di `scanner_engine.py`

**Done when:** analysis score berubah per ticker (bukan semua sama)

---

### T6: E2E test regression
**Why:** Test belum di-run setelah semua perubahan besar.

**Steps:**
1. Pastikan venv punya pytest + httpx: `pip install pytest httpx`
2. `cd /opt/swingaq/backend && ./venv/bin/pytest -q test_api_e2e.py`
3. Fix test yang gagal
4. Tambah test untuk new endpoints:
   - `/api/foreign-trading`
   - `/api/broker-activity`
   - `/api/company-announcements`
   - `/api/corporate-actions`

**Done when:** semua test hijau, tidak ada regression

---

## TIER 3 — MEDIUM (stabilisasi)

### T7: Market Overview — full redesign ⭐
**Why:** Market overview masih campur aduk dengan dashboard, beberapa section kosong, dan tidak ada fitur unik.

**Audit backend data (hasil pengecekan 2026-05-01):**

| Section | Endpoint | Status | Source |
|---------|----------|--------|--------|
| IHSG Summary | `/api/market-summary` | ✅ Ada data | idx_index_summary |
| Top Movers | `/api/top-movers` | ✅ Ada data | DB (OHLCV) |
| Sector Performance | `/api/sector-summary` | ✅ Ada data (12 sektor) | idx_sectoral_snapshot |
| Foreign Flow | `/api/foreign-trading` | ⚠️ Derived (estimasi) | DB derived |
| Broker Activity | `/api/broker-activity` | ❌ no_data | DB kosong |
| Announcements | `/api/company-announcements` | ❌ no_data | IDX live gagal |
| Corporate Actions | `/api/corporate-actions` | ❌ no_data | IDX live gagal |
| Market Events | `/api/market-events` | ⚠️ Fallback only | user_settings |
| News | `/api/news` | ✅ Ada data | DB |
| Sector Summary | `/api/sector-summary` | ✅ Ada data | idx_sectoral_snapshot |

---

**CHANGE 1: Top Gainers & Top Losers dipisah**
- Sekarang: 1 card "Top Gainers / Losers" campur, diurutkan by `abs(change_pct)`
- Target: 2 card terpisah:
  - **🟢 Top Gainers** — sort by `change_pct DESC`, max 5 row
  - **🔴 Top Losers** — sort by `change_pct ASC`, max 5 row
- Backend: `/api/top-movers` sudah return semua data, split di frontend
- Atau: tambah param `?sort=gainers` / `?sort=losers` di backend

**CHANGE 2: Hapus News section dari Market Overview**
- News sudah ada di Dashboard (`news-container`) dan halaman dedicated `/news`
- Hapus card "Latest Market News" dari Market Overview
- Market Overview fokus: data market intel, bukan berita

**CHANGE 3: Audit & fix semua section — tidak boleh kosong**
- [ ] **Broker Activity**: cek apakah `broker_summary` table ada data, jika tidak — sync dari IDX atau hide section
- [ ] **Announcements**: investigasi IDX announcement endpoint, fix parser atau hide
- [ ] **Foreign Trading**: ganti dari derived estimation ke data IDX live jika tersedia
- [ ] **Corporate Actions**: bagian dari T4, handle di sana
- [ ] **Market Events**: sync calendar dari IDX atau buat hardcoded upcoming holidays

**CHANGE 4: Tambah fitur unik (tidak ada di halaman lain)**

4a. **Sector Performance Table**
- Data dari `/api/sector-summary` (sudah ada, 12 sektor)
- Tampil: nama sektor, change%, jumlah saham, market cap
- Visual: bar chart horizontal atau heatmap mini (warna hijau/merah)
- TIDAK ada di Dashboard (dashboard pakai `market-intel` yang beda format)

4b. **Market Breadth**
- Hitung dari data OHLCV terbaru di DB:
  - Advancers (naik): jumlah saham close > prev close
  - Decliners (turun): jumlah saham close < prev close
  - Unchanged: close = prev close
- Tampilkan sebagai bar/streak visual (hijau-abu-merah)
- Endpoint baru: `/api/market-breadth` atau hitung langsung di frontend

4c. **Market Statistics Ringkas**
- Total volume hari ini
- Total value (volume × close)
- Jumlah saham aktif
- Data dari DB, simple aggregate query

---

**Layout Market Overview (baru):**
```
┌──────────────────────────────────────────┐
│  Market Overview                    LIVE  │
├──────────────┬───────────────────────────┤
│ 🟢 Top       │  📊 Sector Performance    │
│   Gainers    │  ┌─────────────────────┐  │
│  (5 rows)    │  │ Energi     +2.5% ▓▓ │  │
│              │  │ Mining     +1.8% ▓  │  │
│ 🔴 Top       │  │ Finance    -0.3% ░  │  │
│   Losers     │  │ ...                 │  │
│  (5 rows)    │  └─────────────────────┘  │
├──────────────┼───────────────────────────┤
│ 💹 Market    │  🌏 Foreign Flow          │
│   Breadth    │  (5 rows)                 │
│  ▓▓▓░░░░░░  │                           │
│  A:450 D:280 │                           │
├──────────────┼───────────────────────────┤
│ 📋 Corporate │  📰 Announcements         │
│   Actions    │  (3-5 rows)               │
│  (3-5 rows)  │                           │
├──────────────┼───────────────────────────┤
│ 🏦 Broker    │  📅 Market Events         │
│   Activity   │  (trading calendar)       │
│  (5 rows)    │                           │
└──────────────┴───────────────────────────┘
```

**Backend changes:**
- [ ] Tambah endpoint `/api/market-breadth` → hitung advance/decline/unchanged dari OHLCV terbaru
- [ ] Tambah endpoint `/api/market-stats` → total volume, value, active stocks
- [ ] Modifikasi `/api/top-movers` → tambah param `sort=gainers|losers|both` (default: both)

**Frontend changes (`frontend/js/views/market.js`):**
- [ ] Hapus import `fetchNews` dan news card
- [ ] Split movers jadi 2 card (gainers/losers)
- [ ] Tambah sector performance heatmap card
- [ ] Tambah market breadth visual card
- [ ] Tambah market stats mini card
- [ ] Reorganize layout sesuai diagram di atas
- [ ] Loading skeleton per section
- [ ] Source label per section

**Files:**
- `backend/main.py` — tambah 2 endpoint baru, modifikasi top-movers
- `frontend/js/views/market.js` — full rewrite layout
- `frontend/js/api.js` — tambah fetch wrapper baru

**Done when:**
- Top gainers dan top losers terpisah, masing-masing max 5 row
- News TIDAK ada di Market Overview
- Setiap section ada data atau jelas "unavailable" (bukan blank)
- Sector performance tampil dengan visual heatmap/bar
- Market breadth tampil (advance/decline)
- Tidak ada section yang selalu kosong tanpa penjelasan

---

### T8: Route modular cleanup
**Why:** Semua 28 endpoints ada di `main.py` (~1070 baris). Hard to maintain.

**Plan:**
- Pindahkan ke `backend/routes/`:
  - `routes/market.py` — market-summary, sector-summary, ihsg-chart, foreign-trading, broker-activity
  - `routes/stocks.py` — stocks/{ticker}, analysis, fundamental, technical, chart-data
  - `routes/trading.py` — scan SSE, top-movers
  - `routes/user.py` — settings, watchlist, portfolio
  - `routes/live.py` — corporate-actions, announcements, market-events, news
- `main.py` tinggal register routers + static files

**Done when:** `main.py` < 200 baris, semua route test pass

---

### T9: Production sync script
**Why:** Tiap kali edit, harus manual `cp` lalu restart. Mudah lupa.

**Buat:** `deploy/sync.sh`
```bash
#!/bin/bash
set -e
rsync -av --exclude='__pycache__' --exclude='*.db' \
  backend/ /opt/swingaq/backend/
rsync -av frontend/ /opt/swingaq/frontend/
sudo systemctl restart swingaq-backend
echo "✅ Deployed"
```

**Done when:** 1 command sync + restart

---

## TIER 4 — LOW (nice to have)

### T10: Mobile responsive full overhaul ⭐
**Why:** Tampilan HP masih banyak yang belum optimal — kolom lebar tidak collapse, touch target kecil, tidak ada safe area, tabel horizontal scroll belum konsisten.

**Current state (problem):**
- `@media(max-width:720px)` block di CSS **KOSONG** (placeholder, no rules)
- Market overview: `col-span-7` + `col-span-5` → tidak collapse jadi 1 kolom di HP
- Tabel data: tidak ada horizontal scroll wrapper
- Touch target: tombol/icon kurang dari 44px (Apple HIG minimum)
- Tidak ada `safe-area-inset` untuk iPhone notch/dynamic island
- Font size beberapa elemen terlalu kecil di mobile
- Card padding terlalu besar di layar kecil
- Sidebar nav masih muncul di tablet (harusnya bottom-nav only)
- Chart height fixed, tidak adaptif

**Per-halaman checklist:**

#### Global (style.css)
- [ ] Tambah `@media(max-width:720px)` rules yang sekarang kosong
- [ ] `.col-span-7, .col-span-5` → `grid-column: span 12 !important` di mobile
- [ ] Touch target minimum 44×44px untuk semua tombol/icon
- [ ] Tambah `padding-bottom: env(safe-area-inset-bottom)` di body
- [ ] Font minimum 14px untuk body text di mobile
- [ ] Card padding: `12px 14px` di mobile (bukan `16px 20px`)
- [ ] Sidebar: `display:none` di mobile (bottom-nav jadi primary)

#### Dashboard (`views/dashboard.js`)
- [ ] Hero section: stack vertical di < 768px
- [ ] Metrics grid: 2 kolom di mobile (bukan 1)
- [ ] Chart height: `240px` di mobile (bukan `300px` fixed)
- [ ] Movers list: max-height dengan scroll
- [ ] News cards: compact layout, 2 line max title

#### Market Overview (`views/market.js`)
- [ ] `col-span-7` + `col-span-5` → collapse ke 1 kolom
- [ ] Card bodies: max 4 row visible + "show more" toggle
- [ ] Flow/broker rows: compact horizontal layout
- [ ] Badge text: wrap baik di narrow screen

#### Stock Detail (`views/stock_detail.js`)
- [ ] Chart height: `280px` di mobile (bukan `440px`)
- [ ] Side panel: stack di bawah chart
- [ ] Technical grid: 2 kolom tetap di mobile
- [ ] Price + change: font besar, center aligned
- [ ] Tab navigation (TA/FA): scroll horizontal jika perlu

#### Screener (`views/screener.js`)
- [ ] Filter panel: collapsible/accordion di mobile
- [ ] SSE results: card mode (bukan tabel) di mobile
- [ ] Preset buttons: scroll horizontal, bukan wrap

#### Portfolio (`views/portfolio.js`)
- [ ] Position cards: compact, 1 kolom
- [ ] Tab bar: scroll horizontal
- [ ] Add/edit form: full-width inputs

#### Settings (`views/settings.js`)
- [ ] `col-span-8` + `col-span-4` → 1 kolom
- [ ] Form inputs: full-width, large touch targets
- [ ] Toggle switches: 44px minimum height

#### Help (`views/help.js`)
- [ ] `col-span-8` + `col-span-4` → 1 kolom
- [ ] FAQ accordion di mobile
- [ ] CTA section: center-aligned, stack

**Testing:**
- Chrome DevTools: iPhone SE (375px), iPhone 14 (390px), iPad (768px)
- Pastikan tidak ada horizontal overflow
- Touch semua tombol utama
- Bottom nav tidak overlap konten
- Keyboard muncul tidak break layout

**Files:**
- `frontend/style.css` — mobile media queries
- `frontend/js/views/*.js` — responsive class adjustments
- `frontend/index.html` — viewport meta sudah OK

**Done when:** 
- Semua halaman rapi di 375px (iPhone SE)
- Tidak ada horizontal scroll yang tidak disengaja
- Touch target ≥ 44px
- Bottom nav tidak overlap konten
- Chart adaptif, tidak pecah atau kepotong

---

### T11: Unit tests scoring engines
- [ ] `tests/test_scoring_swing.py`
- [ ] `tests/test_scoring_valuation.py`
- [ ] `tests/test_scoring_gorengan.py`
- [ ] `tests/test_scoring_dividend.py`

### T12: Scheduler job health monitoring
- [ ] Log setiap kali sync job jalan
- [ ] Dashboard card "Last sync: X hours ago"
- [ ] Auto-notify kalau sync gagal 3x berturut

### T13: README.md final
- [ ] Quick start guide
- [ ] API reference
- [ ] Architecture diagram
- [ ] Deploy instructions

---

## Execution Order

```
T1 (git sync) → T2 (fix venv) → T6 (E2E tests) → T3 (response factory)
→ T4 (corporate actions) → T5 (analysis real data)
→ T7 (UI polish) → T10 (mobile responsive ⭐)
→ T8 (route modular) → T9 (deploy script)
→ T11-T13 (cleanup)
```

**Critical path:** T1 → T2 → T6 (harus hijau dulu sebelum feature baru)
**T10 (mobile)** priority naik ke TIER 2 karena user request langsung.

---

## Notes

- **Production path:** `/opt/swingaq/`
- **Service:** `swingaq-backend` (systemd, user: rich27)
- **Python:** system python3 (venv hilang, perlu recreate)
- **DB:** `/opt/swingaq/backend/swingaq.db`
- **Public URL:** `https://retailbijak.rich27.my.id`
- **Git remote:** `github.com:aqibaja/retailbijak.git`
- **Branch:** main (local 2 ahead, 0 behind)
