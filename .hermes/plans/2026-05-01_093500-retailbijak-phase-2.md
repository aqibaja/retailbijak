# RetailBijak Phase 2 Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Meningkatkan RetailBijak dari versi functional menjadi versi production-grade dengan data quality lebih kuat, observability, testing lebih dalam, dan UX yang lebih polished.

**Architecture:** Phase 2 tidak mengubah fondasi utama (FastAPI + SQLite + Vanilla SPA), tetapi fokus pada pemecahan technical debt yang tersisa: konsistensi response, live data quality, modular backend, frontend polish, scheduler reliability, dan release hygiene. Semua task dibuat kecil dan bisa dieksekusi bertahap.

**Tech Stack:** FastAPI, SQLAlchemy, APScheduler, SQLite, Vanilla JS SPA, pytest, systemd, curl.

---

## Current Context / Assumptions

- Phase 1 (`PLAN.md`) sudah selesai T1–T13.
- Production URL aktif: `https://retailbijak.rich27.my.id`
- Service aktif: `swingaq-backend`
- Sync script tersedia: `scripts/sync_production.sh`
- Existing passing tests:
  - `backend/test_api_e2e.py` → 8 pass
  - `backend/tests/test_response_factory.py` → 10 pass
  - `backend/tests/test_scanner_engine.py` → 5 pass
- Backend masih punya technical debt di `backend/main.py` karena modularization baru dimulai sebagian.

---

## Phase 2 Outcomes

Target hasil akhir phase 2:
1. Semua endpoint penting punya response shape yang konsisten.
2. Data market live lebih bisa dipercaya dan fallback lebih jelas.
3. Observability backend/scheduler lebih baik.
4. UI dashboard/market/detail lebih polished dan lebih ringan untuk mobile.
5. Test coverage untuk area scoring, API, dan parser meningkat.
6. Release workflow lebih rapi (audit, rollback notes, smoke test).

---

## Task P1: Full response-factory adoption

**Objective:** Pasang response factory ke semua endpoint market/data agar frontend tidak perlu handle banyak shape berbeda.

**Files:**
- Modify: `backend/main.py`
- Modify: `backend/routes/user.py`
- Test: `backend/test_api_e2e.py`

**Steps:**
1. Audit endpoint mana yang masih return dict manual.
2. Ganti return shape ke `ok()/empty()/error()/paginated()`.
3. Tambah test shape untuk endpoint penting:
   - `/api/top-movers`
   - `/api/market-breadth`
   - `/api/market-stats`
   - `/api/foreign-trading`
4. Jalankan:
   - `cd /home/rich27/retailbijak/backend`
   - `/opt/swingaq/backend/venv/bin/pytest test_api_e2e.py -q`
5. Commit.

**Done when:** endpoint market utama pakai shape konsisten.

---

## Task P2: Continue backend modularization

**Objective:** Pisahkan endpoint market/data dari `backend/main.py` ke router modular agar maintainable.

**Files:**
- Create: `backend/routes/market.py`
- Create: `backend/routes/stocks.py`
- Modify: `backend/main.py`
- Test: `backend/test_api_e2e.py`

**Steps:**
1. Pindahkan endpoint market overview:
   - `/api/market-summary`
   - `/api/top-movers`
   - `/api/market-breadth`
   - `/api/market-stats`
   - `/api/foreign-trading`
   - `/api/broker-activity`
   - `/api/company-announcements`
   - `/api/corporate-actions`
2. Pindahkan endpoint stock detail/analyzer:
   - `/api/stocks/{ticker}`
   - `/api/stocks/{ticker}/analysis`
   - `/api/stocks/{ticker}/fundamental`
   - `/api/stocks/{ticker}/technical`
   - `/api/stocks/{ticker}/chart-data`
3. Register router di `main.py`.
4. Jalankan compile + pytest.
5. Commit.

**Done when:** `main.py` jauh lebih kecil dan semua test tetap hijau.

---

## Task P3: Data-quality flags on market sections

**Objective:** Tampilkan mana data live, derived, fallback, atau empty supaya user tahu kualitas data.

**Files:**
- Modify: `frontend/js/views/market.js`
- Modify: `frontend/js/views/dashboard.js`
- Modify: `frontend/style.css`

**Steps:**
1. Tambah badge source-state per section:
   - `LIVE`
   - `DERIVED`
   - `FALLBACK`
   - `EMPTY`
2. Gunakan field `source` dan `status` dari backend.
3. Tambah visual treatment kecil tapi konsisten.
4. Verify page render manual + compile frontend.
5. Commit.

**Done when:** user bisa bedakan kualitas data per card.

---

## Task P4: Broker activity ingestion or graceful hide

**Objective:** Hilangkan section kosong broker activity dengan salah satu dari dua jalur: isi data, atau hide dengan jelas.

**Files:**
- Modify: `backend/main.py` or `backend/routes/market.py`
- Modify: `frontend/js/views/market.js`
- Optional: `backend/jobs/idx_daily_sync.py`

**Steps:**
1. Audit table `broker_summary` apakah ada data aktual.
2. Jika ada endpoint IDX yang workable, tambahkan ingestion.
3. Jika tidak ada data, ubah frontend jadi hide section saat truly empty.
4. Tambah fallback message yang eksplisit, bukan blank.
5. Verify public page.
6. Commit.

**Done when:** broker activity tidak lagi terasa broken.

---

## Task P5: Company announcements reliability fix

**Objective:** Pastikan announcement section konsisten: data live jika ada, fallback/hide jika tidak.

**Files:**
- Modify: `backend/main.py` or `backend/routes/market.py`
- Modify: `frontend/js/views/market.js`
- Test: `backend/test_api_e2e.py`

**Steps:**
1. Audit parser current announcement response IDX.
2. Tambah logging/normalizer bila field berubah.
3. Jika endpoint tidak stabil, ubah frontend agar collapse card saat empty.
4. Tambah E2E shape assertion.
5. Commit.

**Done when:** announcement section tidak misleading.

---

## Task P6: Dashboard data freshness indicator

**Objective:** Tambah indikator “last updated” / freshness di dashboard & market.

**Files:**
- Modify: `frontend/js/views/dashboard.js`
- Modify: `frontend/js/views/market.js`
- Modify: `frontend/style.css`
- Optional: backend response metadata

**Steps:**
1. Gunakan `updated_at` / date field dari API.
2. Render relative freshness text:
   - `Updated just now`
   - `Updated 2h ago`
   - `Stale`
3. Tambah style untuk stale warning.
4. Verify visual manual.
5. Commit.

**Done when:** user tahu kapan data terakhir diperbarui.

---

## Task P7: Scheduler failure counters + last run metadata

**Objective:** Observability scheduler bukan cuma daftar jobs, tapi juga status eksekusi terakhir.

**Files:**
- Modify: `backend/scheduler.py`
- Modify: `backend/main.py`
- Optional: `backend/database.py`

**Steps:**
1. Simpan metadata runtime untuk tiap job:
   - `last_run_at`
   - `last_success_at`
   - `last_error`
   - `failure_count`
2. Expose di `/api/scheduler-health`.
3. Verify response di localhost.
4. Commit.

**Done when:** scheduler health punya informasi operasional nyata.

---

## Task P8: Smoke-test script for production

**Objective:** Tambahkan smoke test setelah deploy supaya deploy script tidak hanya cek `/api/health`.

**Files:**
- Modify: `scripts/sync_production.sh`
- Create: `scripts/smoke_test.sh`

**Steps:**
1. Buat smoke test untuk endpoint penting:
   - `/api/health`
   - `/api/market-summary`
   - `/api/top-movers`
   - `/api/stocks/BBCA/analysis`
   - `/api/scheduler-health`
2. Integrasikan ke sync script.
3. Expected: exit non-zero kalau ada endpoint gagal.
4. Run script lokal.
5. Commit.

**Done when:** deploy punya validasi yang lebih meaningful.

---

## Task P9: Stock detail UI cleanup

**Objective:** Rapikan halaman stock detail agar lebih rapi di mobile dan info lebih seimbang.

**Files:**
- Modify: `frontend/js/views/stock_detail.js`
- Modify: `frontend/style.css`

**Steps:**
1. Audit panel yang terlalu tinggi/lebar.
2. Rapikan hero section, technical tiles, stat tiles, chart container.
3. Pastikan card spacing dan hierarchy lebih jelas.
4. Verify responsive layout.
5. Commit.

**Done when:** stock detail terasa lebih premium dan tidak cramped.

---

## Task P10: Dashboard perceived-liveness polish

**Objective:** Dashboard terasa lebih hidup walau sebagian data belum sempurna.

**Files:**
- Modify: `frontend/js/views/dashboard.js`
- Modify: `frontend/style.css`

**Steps:**
1. Audit empty state dashboard.
2. Tambahkan believable fallback text/preview content.
3. Rapikan metric cards supaya tidak terasa kosong.
4. Verify on desktop + mobile.
5. Commit.

**Done when:** dashboard tidak terasa mati saat data tipis.

---

## Task P11: Expand tests for parsers and endpoint contracts

**Objective:** Tambah coverage untuk parser live-data dan contract response endpoints baru.

**Files:**
- Create: `backend/tests/test_market_contracts.py`
- Create: `backend/tests/test_idx_parsers.py`
- Modify: existing tests if needed

**Steps:**
1. Tambah test shape untuk endpoint market.
2. Tambah parser tests untuk corporate actions / announcement normalization.
3. Jalankan seluruh suite:
   - `/opt/swingaq/backend/venv/bin/pytest -q`
4. Commit.

**Done when:** area live-data punya regression safety lebih kuat.

---

## Task P12: Release hardening + final audit

**Objective:** Siapkan release candidate phase 2 dengan audit akhir dan dokumentasi status.

**Files:**
- Modify: `README.md`
- Modify: `PLAN.md` or create `PHASE2.md`
- Optional: `DEPLOY.md`

**Steps:**
1. Audit `git status`.
2. Run compile + full pytest.
3. Run smoke-test script.
4. Update docs dengan endpoint baru dan test status.
5. Write summary of known limitations.
6. Commit + push.

**Done when:** repo siap release dengan docs dan checks yang rapi.

---

## Likely Files to Change

- `backend/main.py`
- `backend/routes/user.py`
- `backend/routes/market.py`
- `backend/routes/stocks.py`
- `backend/scheduler.py`
- `backend/jobs/idx_daily_sync.py`
- `backend/test_api_e2e.py`
- `backend/tests/test_market_contracts.py`
- `backend/tests/test_idx_parsers.py`
- `frontend/js/views/dashboard.js`
- `frontend/js/views/market.js`
- `frontend/js/views/stock_detail.js`
- `frontend/style.css`
- `scripts/sync_production.sh`
- `scripts/smoke_test.sh`
- `README.md`

---

## Validation / Test Commands

```bash
cd /home/rich27/retailbijak/backend
python3 -m py_compile main.py routes/user.py
python3 -m compileall -q ../frontend/js
/opt/swingaq/backend/venv/bin/pytest -q
curl -s http://127.0.0.1:8000/api/health
curl -s http://127.0.0.1:8000/api/scheduler-health
```

---

## Risks / Trade-offs

1. **IDX endpoints unstable** → beberapa task harus graceful degrade, bukan memaksa live.
2. **Vanilla SPA maintainability** → UI polish cepat, tapi complexity bisa naik tanpa component system.
3. **SQLite + derived metrics** → cukup untuk sekarang, tapi limit untuk analytics yang lebih berat.
4. **Modularization** → perlu hati-hati agar tidak memecah import/runtime production.

---

## Suggested Execution Order

1. P1 Response-factory full adoption
2. P2 Continue backend modularization
3. P4 Broker activity resolution
4. P5 Announcement reliability
5. P6 Data freshness indicator
6. P7 Scheduler failure counters
7. P8 Smoke-test deploy
8. P9 Stock detail UI cleanup
9. P10 Dashboard liveness polish
10. P11 Parser + contract tests
11. P12 Release hardening

---

Plan complete. Saved for execution in a future session.
