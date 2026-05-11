# RetailBijak — Full Feature Fix Plan
**Dibuat**: 2026-05-12  
**Status**: PENDING  
**Tujuan**: Fix semua fitur yang broken, re-enable semua setup functions, stabilkan performa

---

## 🔴 FASE 1 — Critical Fixes (Backend)

### 1.1 Migrasi DB — tambah kolom `group_id` ke `watchlist_items`
- **Root cause**: Model Python punya `group_id` tapi kolom belum ada di SQLite
- **Impact**: Watchlist selalu 500, Portfolio view broken, Alert per-ticker broken
- **Fix**: Jalankan ALTER TABLE atau Alembic migration
- **File**: `backend/database.py`, `backend/migrations/` (atau manual SQL)
- **Test**: `GET /api/watchlist` harus return 200

### 1.2 Fix `Signal` model — field `price` tidak ada
- **Root cause**: `_serialize_signal_rows` di `shared_stock_detail_helpers.py` akses `signal.price` tapi field tidak ada di model
- **Impact**: Stock Detail → Tab Signals selalu 500
- **Fix**: Hapus atau handle field `price` di serializer
- **File**: `backend/routes/shared_stock_detail_helpers.py`
- **Test**: `GET /api/stocks/BBCA/signals` harus return 200

---

## 🟡 FASE 2 — Path Mismatch Fixes (Frontend ↔ Backend)

### 2.1 Fix `stock_detail.js` — endpoint fundamentals
- **Frontend calls**: `/api/stocks/{ticker}/fundamentals`
- **Backend has**: `/api/stocks/{ticker}/fundamental` (tanpa 's')
- **Fix**: Update `stock_detail.js` atau tambah alias route di backend

### 2.2 Fix `stock_detail.js` — endpoint broker-summary
- **Frontend calls**: `/api/stocks/{ticker}/broker-summary`
- **Backend has**: `/api/stocks/{ticker}/broker-activity`
- **Fix**: Update `stock_detail.js` atau tambah alias route di backend

### 2.3 Fix `stock_detail.js` — endpoint news per-ticker
- **Frontend calls**: `/api/stocks/{ticker}/news`
- **Backend**: Tidak ada endpoint ini
- **Fix**: Tambah endpoint `GET /api/stocks/{ticker}/news` di backend (filter dari tabel `news` by ticker)

### 2.4 Fix `chart.js` — drawings endpoint prefix
- **Frontend calls**: `/chart/{ticker}/drawings` (tanpa `/api/`)
- **Fix**: Tambah `/api/` prefix di `chart.js`

---

## 🟠 FASE 3 — Re-enable Setup Functions (Frontend)

Semua ini di-disable saat debug. Re-enable satu per satu dengan test:

### 3.1 Re-enable `setupScrollEffects()`
- Topbar scroll effect + progress bar
- **Risk**: Low — hanya event listener scroll

### 3.2 Re-enable `setupKeyboardShortcuts()`
- Shortcut `g+d/s/p/m` untuk navigasi
- **Risk**: Low

### 3.3 Re-enable `setupScrollToTop()`
- Tombol scroll-to-top
- **Risk**: Low

### 3.4 Re-enable `setupShortcutPanel()`
- Panel `?` keyboard shortcuts
- **Risk**: Low

### 3.5 Re-enable `setupPageTransitions()`
- Animasi fade-in antar halaman
- **Risk**: Low

### 3.6 Re-enable `setupSwipeNavigation()`
- Swipe kiri/kanan antar tab (mobile)
- **Risk**: Medium — cek apakah ada conflict dengan scroll

### 3.7 Re-enable `setupPullToRefresh()`
- Pull-to-refresh (mobile)
- **Risk**: Medium — cek apakah ada infinite loop

### 3.8 Re-enable `setupTouchGestures()`
- Touch gestures (mobile)
- **Risk**: Medium

### 3.9 Re-enable `showOnboarding()`
- Modal welcome screen untuk user baru
- **Risk**: Low

---

## 🟡 FASE 4 — Performance Fixes (Backend)

### 4.1 Fix `/api/industries` — N+1 query (6 detik)
- **Root cause**: Loop per ticker × per period = ratusan query
- **Fix**: Bulk query dengan window function seperti `_batch_historical_closes`
- **File**: `backend/routes/sectors.py` line ~346

### 4.2 Fix `/api/sectors/performance` — lambat (3.5 detik)
- **Root cause**: Query tidak optimal
- **Fix**: Audit dan optimasi query
- **File**: `backend/routes/sectors.py`

### 4.3 Fix `/api/scan/patterns` — sangat lambat (5.5 detik)
- **Root cause**: Scan semua pola TA untuk semua saham
- **Fix**: Tambah cache atau batasi scope
- **File**: `backend/routes/scanner.py` atau `backend/scanner.py`

---

## 🔵 FASE 5 — Re-enable Service Worker (PWA)

### 5.1 Investigasi root cause SW reload loop
- **Root cause sebelumnya**: SW auto-reload saat update detected → infinite loop
- **Fix yang sudah ada**: Hapus `window.location.reload(true)` dari SW handler
- **Sisa masalah**: SW masih di-disable total di `main.js`
- **Action**: Re-enable SW dengan versi yang sudah di-fix, test di browser

### 5.2 Re-enable `setupLivePriceStream()`
- **Root cause sebelumnya**: SSE endpoint `/api/market/live-prices` pakai correlated subquery → hang
- **Fix yang sudah ada**: Query sudah di-fix pakai CTE
- **Action**: Re-enable di `main.js`, test tidak freeze

---

## 🟢 FASE 6 — Polish & Stabilisasi

### 6.1 Hapus debug code dari production
- `document.documentElement.style.borderTop='6px solid #ff0000'` di `index.html`
- Debug bar `#js-debug-bar` di `main.js`
- Debug panel `#rbk-debug-panel` di `index.html`
- Router marker `#rbk-router-marker` di `router.js`
- `#dash-debug` di `dashboard.js`
- File debug: `debug_module.html`, `test_dash.html`, `test_minimal.html`

### 6.2 Tambah composite index DB untuk `/api/industries` dan `/api/sectors/performance`
- Index `(ticker, date, close)` sudah ada
- Cek apakah perlu index tambahan untuk query sektor

### 6.3 Run full test suite
- `cd /opt/swingaq/backend && ./venv/bin/pytest -q test_api_e2e.py`
- Fix test yang fail

### 6.4 Final version bump dan commit
- Bump ke versi `202605120100`
- Commit semua perubahan
- Push ke GitHub

---

## 📊 Summary Prioritas

| Fase | Item | Priority | Estimasi |
|------|------|----------|----------|
| 1.1 | DB migration watchlist group_id | 🔴 Critical | 30 menit |
| 1.2 | Fix Signal.price serializer | 🔴 Critical | 15 menit |
| 2.1-2.4 | Path mismatch fixes | 🟡 High | 45 menit |
| 3.1-3.5 | Re-enable low-risk setup functions | 🟠 Medium | 20 menit |
| 3.6-3.9 | Re-enable medium-risk setup functions | 🟠 Medium | 30 menit |
| 4.1-4.3 | Performance fixes backend | 🟡 High | 60 menit |
| 5.1-5.2 | Re-enable SW + LivePriceStream | 🔵 Normal | 30 menit |
| 6.1-6.4 | Polish & stabilisasi | 🟢 Low | 30 menit |

**Total estimasi**: ~4 jam

---

## ✅ Checklist Eksekusi

- [ ] 1.1 DB migration watchlist_items.group_id
- [ ] 1.2 Fix Signal serializer price field
- [ ] 2.1 Fix fundamentals endpoint path
- [ ] 2.2 Fix broker-summary endpoint path
- [ ] 2.3 Tambah /api/stocks/{ticker}/news endpoint
- [ ] 2.4 Fix chart drawings prefix
- [ ] 3.1 Re-enable setupScrollEffects
- [ ] 3.2 Re-enable setupKeyboardShortcuts
- [ ] 3.3 Re-enable setupScrollToTop
- [ ] 3.4 Re-enable setupShortcutPanel
- [ ] 3.5 Re-enable setupPageTransitions
- [ ] 3.6 Re-enable setupSwipeNavigation
- [ ] 3.7 Re-enable setupPullToRefresh
- [ ] 3.8 Re-enable setupTouchGestures
- [ ] 3.9 Re-enable showOnboarding
- [ ] 4.1 Fix /api/industries N+1 query
- [ ] 4.2 Fix /api/sectors/performance
- [ ] 4.3 Fix /api/scan/patterns
- [ ] 5.1 Re-enable Service Worker
- [ ] 5.2 Re-enable setupLivePriceStream
- [ ] 6.1 Hapus debug code
- [ ] 6.2 Index DB tambahan
- [ ] 6.3 Run test suite
- [ ] 6.4 Final version bump & commit
