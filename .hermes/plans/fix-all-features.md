# RetailBijak — Full Feature Fix Plan
**Dibuat**: 2026-05-12
**Update terakhir**: 2026-05-12 01:07 WIB
**Status**: 🟡 IN PROGRESS
**Commit terkini**: `28ccaa3`
**Version**: `202605120200`
**SW Cache**: `retailbijak-v4`

---

## 📊 Progress Keseluruhan

| Area | Status | Keterangan |
|------|--------|------------|
| Backend API endpoints | ✅ 100% | Semua 34+ endpoint 200 OK |
| Scheduler OHLCV | ✅ Fixed | Job ohlcv_daily_update terdaftar |
| IDX daily sync | ✅ Fixed | multi_day=False, tidak hang |
| Data OHLCV freshness | ✅ Fixed | 2026-05-11 (dari IDX API) |
| Signals freshness | ✅ Fixed | 2026-05-11, 407 signals |
| Sector data | ✅ Fixed | 581/974 ticker classified |
| Industry data | ✅ Fixed | 138 industries updated |
| Heatmap/Treemap | ✅ Fixed | 12 sektor, 575 saham |
| Sectors rotation | ✅ Fixed | Route shadowing fixed |
| Freshness queries | ✅ Fixed | broker_summary & ai_pick_reports |
| Stock full-detail | ✅ Fixed | Composite endpoint ditambah |
| Sector.js versioning | ✅ Fixed | Import pakai ?v= |
| Frontend views | ✅ OK | Semua 25 views ada & punya export |
| Router | ✅ OK | Semua routes terdaftar |

---

## ✅ SELESAI

### Backend — Data & Scheduler
- [x] Scheduler: tambah `ohlcv_daily_update` job (Mon-Fri 09:05 & 16:05 WIB)
- [x] IDX daily sync: fix multi_day=False wrapper agar tidak hang
- [x] Trigger manual IDX sync → data OHLCV fresh 2026-05-11
- [x] Trigger manual sector classifier → 581 ticker classified
- [x] Trigger manual industry classifier → 138 industries updated
- [x] Trigger manual signal updater (50 ticker) → 799 signals 2026-05-11
- [x] system.py: fix freshness query broker_summary & ai_pick_reports
- [x] stock_detail.py: tambah /full-detail composite endpoint
- [x] sectors.py: fix route shadowing /sectors/rotation vs /sectors/{sector}

### Backend — API Fixes
- [x] DB migration watchlist_items.group_id
- [x] Fix Signal serializer price field
- [x] Fix fundamentals endpoint path
- [x] Fix broker-summary endpoint path
- [x] Tambah /api/stocks/{ticker}/news endpoint
- [x] Fix chart drawings prefix
- [x] Fix /api/industries N+1 query (8.8s → 0.74s)
- [x] Fix /api/sectors/performance (5.2s → 0.61s)
- [x] Fix /api/top-movers N+1 query (11s → 0.9s)

### Frontend
- [x] Re-enable semua setup functions
- [x] Re-enable Service Worker (CACHE_NAME v4)
- [x] Re-enable setupLivePriceStream SSE
- [x] Fix MutationObserver infinite loop
- [x] Fix duplicate export di main.js
- [x] Extract utils/helpers.js
- [x] Fix sector.js import versioning
- [x] Hapus sectors.py dari folder views/
- [x] Hapus semua debug code
- [x] Version bump → 202605120200

---

## 🔜 NEXT TASKS

### P1 — Data completeness
- [x] Jalankan signal update test (50 ticker) → 799 signals 2026-05-11 ✅
- [x] Fix dividend aristocrats min_years=3 → 84 hasil ✅
- [x] Fix market briefing pakai latest DB date → 959 saham ✅
- [ ] Seed IPO upcoming — count=0 (butuh data IPO mendatang 2026)

### P2 — Frontend polish
- [ ] Audit visual dashboard di browser — apakah semua widget render dengan data baru
- [ ] Audit stock detail page — full-detail endpoint, chart, signals, fundamental
- [ ] Audit screener — SSE scan berjalan, preset buttons OK
- [ ] Audit portfolio/watchlist — CRUD berfungsi
- [ ] Audit market page — heatmap, treemap, sectors rotation render
- [ ] Cek mobile layout semua halaman utama

### P3 — Backend improvements
- [ ] Fix test suite (8/16 failing karena TestClient route registration)
- [ ] Implement /api/corporate-actions endpoint (saat ini return empty)
- [ ] Migrasi @app.on_event → lifespan handler (FastAPI deprecation)
- [ ] Tambah admin endpoint untuk trigger manual sync dari UI

### P4 — UX improvements
- [ ] Tambah "Data per tanggal X" label di dashboard header
- [ ] Tambah tombol "Refresh Data" di topbar untuk trigger manual sync
- [ ] Fix market briefing — regenerate dengan data terbaru
- [ ] Tambah fallback content untuk empty states (IPO, corporate actions, paper trades)

---

## 📋 Log Eksekusi

| Tanggal | Task | Status | Catatan |
|---------|------|--------|---------|
| 2026-05-12 | DB migration watchlist group_id | ✅ | ALTER TABLE berhasil |
| 2026-05-12 | Fix Signal serializer | ✅ | price → close field |
| 2026-05-12 | Fix fundamentals path | ✅ | /fundamentals → /fundamental |
| 2026-05-12 | Fix broker-summary path | ✅ | /broker-summary → /broker-activity |
| 2026-05-12 | Tambah /news endpoint | ✅ | Filter news by ticker |
| 2026-05-12 | Fix chart drawings prefix | ✅ | Tambah /api/ prefix |
| 2026-05-12 | Re-enable setup functions | ✅ | 9 fungsi UI aktif kembali |
| 2026-05-12 | Fix industries N+1 | ✅ | 8.8s → 0.74s |
| 2026-05-12 | Fix sectors/performance | ✅ | 5.2s → 0.61s |
| 2026-05-12 | Fix top-movers N+1 | ✅ | 11s → 0.9s |
| 2026-05-12 | Re-enable SW + LivePriceStream | ✅ | CACHE_NAME v4 |
| 2026-05-12 | Hapus debug code | ✅ | Semua debug artifacts removed |
| 2026-05-12 | Tambah ohlcv_daily_update job | ✅ | Mon-Fri 09:05 & 16:05 WIB |
| 2026-05-12 | Fix freshness queries | ✅ | broker_summary & ai_pick_reports |
| 2026-05-12 | Tambah /full-detail endpoint | ✅ | Composite 6 parallel calls |
| 2026-05-12 | Fix sector.js versioning | ✅ | Import pakai ?v= |
| 2026-05-12 | Hapus sectors.py dari views | ✅ | File nyasar dihapus |
| 2026-05-12 | Version bump 202605120200 | ✅ | SW cache v4 |
| 2026-05-12 | Fix idx_daily_sync hang | ✅ | multi_day=False wrapper |
| 2026-05-12 | Trigger IDX sync manual | ✅ | 959 ticker, data 2026-05-11 |
| 2026-05-12 | Trigger sector classifier | ✅ | 581/974 ticker classified |
| 2026-05-12 | Trigger industry classifier | ✅ | 138 industries updated |
| 2026-05-12 | Trigger signal updater | ✅ | 799 signals, 45 ticker, 2026-05-11 |
| 2026-05-12 | Fix sectors/rotation shadowing | ✅ | Route dipindah sebelum {sector} |
| 2026-05-12 | Commit & push | ✅ | commit 28ccaa3 |
| 2026-05-12 | Fix sectors/rotation route shadowing | ✅ | Dipindah sebelum {sector} wildcard |
| 2026-05-12 | Fix dividend aristocrats min_years | ✅ | 5→3, sekarang 84 hasil |
| 2026-05-12 | Fix market briefing latest date | ✅ | UTC today→MAX(date) DB, 959 saham |
| 2026-05-12 | Final audit 30 endpoint | ✅ | 30/30 OK, commit e7e7b99 |
