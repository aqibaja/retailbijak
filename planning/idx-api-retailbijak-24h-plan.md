# RetailBijak — Final Integration & Hardening Plan

> **Untuk Hermes:** implementasikan task per task, pakai TDD, commit tiap task, lalu verifikasi browser + test.

**Goal:** memastikan contract frontend/backend RetailBijak stabil, dokumentasi sinkron, browser flow tervalidasi, dan backend test coverage cukup untuk endpoint inti.

**Architecture:** frontend SPA tetap konsumsi API FastAPI lokal. Fokusnya bukan bikin arsitektur baru, tapi menstabilkan shape response, memperjelas fallback UI, dan mengunci perilaku endpoint lewat test. Semua hasil harus bisa diverifikasi lewat `pytest` dan browser.

**Tech Stack:** FastAPI, pytest/TestClient, vanilla JS SPA, SSE/EventSource, SQLite/SQLAlchemy, browser verification.

---

## Task 1: Audit contract akhir frontend/backend
**Objective:** memastikan semua halaman frontend memanggil endpoint backend yang benar dan shape datanya konsisten.

**Files:**
- Modify:
  - `backend/main.py`
  - `backend/test_api_e2e.py`
  - `frontend/js/api.js`
  - `frontend/js/views/dashboard.js`
  - `frontend/js/views/stock_detail.js`
  - `frontend/js/views/screener.js`
  - `frontend/js/views/portfolio.js`
  - `frontend/js/views/settings.js`

**Checklist audit:**
- `/api/health`
- `/api/market-summary`
- `/api/sector-summary`
- `/api/news`
- `/api/settings`
- `/api/watchlist`
- `/api/portfolio`
- `/api/stocks/{ticker}`
- `/api/stocks/{ticker}/fundamental`
- `/api/stocks/{ticker}/technical`
- `/api/stocks/{ticker}/analysis`
- `/api/stocks/{ticker}/chart-data`
- `/api/scan` SSE

**Output expected:**
- response shape seragam
- fallback aman saat data kosong
- frontend tidak mengasumsikan field yang belum dijamin backend

**Verify:**
- baca route + view
- cocokkan field minimal yang dipakai UI
- tandai mismatch contract

**Commit:**
```bash
git add ...
git commit -m "fix: standardize retailbijak API contract"
```

---

## Task 2: Lengkapi test contract backend
**Objective:** memperkuat endpoint inti agar shape respons tidak gampang pecah.

**Files:**
- Modify:
  - `backend/test_api_e2e.py`
- Optional create:
  - `backend/tests/test_contract_api.py`
  - `backend/tests/test_scan_sse.py`

**TDD loop per endpoint:**
1. tulis test untuk shape response
2. jalankan test → harus gagal dulu kalau contract belum ada
3. implementasi minimal
4. jalankan test → harus pass

**Minimal assertions yang perlu ada:**
- health: `status == ok`
- market-summary: `source == db`, `status`, `symbol`, `updated_at`
- settings: roundtrip read/write
- watchlist: CRUD
- portfolio: CRUD
- news: list shape
- scan: SSE endpoint hidup dan stream format valid

**Verify command:**
```bash
pytest -q backend/test_api_e2e.py
```

**Target hasil:** semua test hijau, tidak ada contract yang samar.

**Commit:**
```bash
git add backend/test_api_e2e.py backend/tests/*
git commit -m "test: extend retailbijak contract coverage"
```

---

## Task 3: Browser verify semua view utama
**Objective:** memastikan UI benar-benar usable, tidak blank, dan data fallback tampil baik.

**Pages to verify:**
- Dashboard
- Stock detail
- Scanner
- Portfolio
- Settings

**What to check:**
- halaman load tanpa error visual
- empty state tidak kosong total
- tombol utama bekerja
- navigasi antar page benar
- fallback/demo content muncul saat backend kosong
- SSE scanner tetap menunjukkan state awal yang jelas

**Browser verification steps:**
1. open root
2. klik dashboard
3. klik stock detail dari search / ticker
4. klik scanner dan cek preset + scan area
5. klik portfolio
6. klik settings
7. cek console error kalau ada

**Verify tambahan:**
- `browser_console` untuk JS error
- `browser_snapshot` untuk visual state

**Commit bila ada perubahan UI:**
```bash
git add ...
git commit -m "fix: improve retailbijak browser flow and fallbacks"
```

---

## Task 4: Sync dokumentasi final
**Objective:** dokumentasi harus mencerminkan perilaku terakhir yang sudah diverifikasi, bukan asumsi lama.

**Files:**
- Modify/create:
  - `docs/IDX_API_BACKEND_LIVE.md`
  - `docs/RETTAILBIJAK_IDX_INTEGRATION.md`
  - `docs/FRONTEND_BACKEND_INTEGRATION_AUDIT.md`
  - `planning/TASKS.md`
  - `planning/API_SPEC.md` bila ada shape yang berubah
  - README terkait bila perlu

**Isi docs yang wajib ada:**
- daftar endpoint final
- shape response penting
- alur frontend → backend
- fallback behavior
- cara run test
- cara run browser verification
- catatan edge case / limitation

**Verify:**
- dokumen sesuai kode terakhir
- tidak ada endpoint documented yang sudah berubah bentuk

**Commit:**
```bash
git add docs planning README*
git commit -m "docs: sync retailbijak contract and usage notes"
```

---

## Task 5: Final regression run
**Objective:** memastikan semua perubahan stabil sebelum dianggap selesai.

**Commands:**
```bash
pytest -q backend/test_api_e2e.py
```

Jika ada test browser/manual check yang disimpan, jalankan juga verifikasi terakhir.

**Expected:**
- test pass
- browser flow aman
- tidak ada console error baru
- docs sinkron

**Commit final kalau ada perubahan tambahan:**
```bash
git add .
git commit -m "chore: finalize retailbijak contract hardening"
```

---

## Task 6: Push dan publish
**Objective:** dorong hasil final ke remote dan pastikan siap deploy.

**Commands:**
```bash
git push origin HEAD:main
```

Kalau repo punya CI/CD / auto-deploy:
- pastikan push memicu pipeline
- cek build status
- cek URL publik hasil deploy

Kalau deploy manual:
- jalankan langkah deploy sesuai target hosting
- verifikasi endpoint publik / halaman publik

---

## Definition of Done
Task dianggap selesai kalau:
- endpoint inti punya contract jelas
- test backend lulus
- browser verifikasi lulus
- docs sinkron
- commit dan push sudah dilakukan
- deploy/public exposure berhasil atau minimal pipeline deploy terpanggil

---

## Urutan eksekusi yang saya sarankan sekarang
1. **Task 1 + Task 2** dulu: kunci contract dan test
2. **Task 3**: browser verify
3. **Task 4**: docs sync
4. **Task 5 + 6**: final regression, push, deploy

Kalau mau, saya bisa langsung ubah plan ini menjadi file plan resmi lain yang lebih spesifik per modul.