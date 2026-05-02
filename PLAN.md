# Dashboard First-Fold Polish Plan

> **Execution status:** phase-1 first-fold clarity & widget-state system **DONE** · phase-2 deeper dashboard regrouping **PLANNED** · phase-3 verification/deploy **DONE**

**Goal:** memoles route `#dashboard` supaya first fold lebih fokus, trust/freshness lebih jelas, dan widget loading state terasa profesional tanpa redesign besar yang berisiko.

**Architecture:** pertahankan vanilla SPA + kontrak API existing. Fokus perubahan kecil-terverifikasi di `frontend/js/views/dashboard.js` dan `frontend/style.css`, dengan static regression tests baru di `backend/tests/test_dashboard_view_static.py`. Update `PLAN.md` setiap slice selesai.

**Tech Stack:** Vanilla JS, CSS, FastAPI backend existing, pytest static guards, browser QA.

---

## UX Diagnosis Ringkas

1. First fold punya terlalu banyak pusat perhatian: hero, quote card, chart, movers.
2. Hero copy besar tetapi belum cukup mengarahkan aksi tercepat.
3. Trust/freshness di quote card masih tipis.
4. Widget loading state masih terlalu mentah (`Loading ...`) dan terasa kurang production-ready.
5. Dashboard bawah sudah berguna, tetapi hierarchy awal masih bisa dipadatkan.

---

## Target End State

### First fold
- Hero tetap kuat tapi lebih terarah.
- Ada summary strip 3 kartu untuk bias tape, lead gainer, lead sector.
- CTA primer `Run Scanner` lebih dominan, CTA sekunder lebih tenang.
- Quote card punya freshness note yang jujur dan jelas.

### Widget states
- Movers / market intelligence / news tidak lagi boot dengan placeholder mentah.
- Loading state punya copy profesional dan konsisten.

### Verification
- Static guard menjaga hook DOM/CSS baru.
- Compile check lulus.
- Browser QA live memastikan dashboard tetap render normal.

---

## Phase Plan

### Phase 1 — First-fold clarity & widget-state system
**Objective:** rapikan hierarchy first fold dan bootstrap state widget.

**Files:**
- Modify: `frontend/js/views/dashboard.js`
- Modify: `frontend/style.css`
- Test: `backend/tests/test_dashboard_view_static.py`

**Checklist:**
- [x] Tulis failing static guards untuk summary strip, CTA hierarchy, quote freshness, dan widget loading state.
- [x] Tambah hero note + summary strip 3 kartu.
- [x] Perjelas CTA primer/sekunder.
- [x] Tambah `Last sync` / freshness line di quote card.
- [x] Ganti placeholder `Loading ...` mentah dengan widget-state yang lebih profesional.
- [x] Run pytest static guard.
- [x] Run compile check frontend.
- [x] Update progress di `PLAN.md`.

**Acceptance criteria:**
- Hero punya note dan summary strip baru.
- Quote card punya freshness note yang eksplisit.
- Widget movers/intelligence/news tidak lagi boot dengan string loading mentah.
- Static guard baru lulus.

### Phase 2 — Deeper dashboard regrouping
**Objective:** batch berikutnya bila lanjut: rebalance chart / movers / bottom-grid hierarchy.

**Checklist:**
- [x] Tulis failing static guards untuk chart context, movers summary, editorial cards, suggestion reasons, dan featured news hooks.
- [x] Tambah chart context bar + live bias/readout.
- [x] Tambah movers summary + ranked mover rows.
- [x] Ubah market intelligence jadi editorial card stack.
- [x] Tambah suggestion reasons + featured news treatment.
- [x] Jalankan pytest static guard.
- [x] Jalankan compile check frontend.
- [x] Browser QA live.
- [x] Update `PLAN.md`.

**Acceptance criteria:**
- Chart panel punya context/readout yang jelas.
- Movers panel punya summary dan rows lebih kaya hierarchy.
- Bottom grid terasa lebih editorial dan tidak datar.
- Static guard phase-2 lulus.

### Phase 3 — Verification, deploy, git hygiene
**Objective:** verifikasi live, sync runtime, commit, push, deploy notes.

**Checklist:**
- [x] Jalankan `pytest -q backend/tests/test_dashboard_view_static.py`
- [x] Jalankan `python -m compileall -q frontend/js`
- [x] Browser QA halaman `#dashboard`
- [x] Update `PLAN.md`
- [x] Commit
- [x] Sync runtime `/opt/swingaq/frontend`
- [x] Restart service bila perlu
- [x] Push

---

## Progress Log

### 2026-05-03 01:00 WIB
- [done] Audit live route `#dashboard` via browser snapshot/console/vision.
- [done] Diagnosis: first fold masih terlalu ramai, trust/freshness belum kuat, dan widget loading state masih terasa mentah.
- [done] TDD RED: buat `backend/tests/test_dashboard_view_static.py` untuk memaksa summary strip, CTA hierarchy, quote freshness, dan widget-state hooks.
- [done] RED verified: `pytest -q backend/tests/test_dashboard_view_static.py` gagal `3 failed` sebelum implementasi.
- [done] Implementasi `frontend/js/views/dashboard.js`: tambah `dash-hero-note`, `dash-summary-strip`, CTA primer/sekunder yang lebih jelas, `dash-quote-freshness`, serta professional widget-state placeholders untuk movers / intelligence / news.
- [done] Implementasi `frontend/style.css`: tambah styling summary strip, quote-meta/freshness, CTA emphasis, dan widget-state system plus responsive tweak aman.
- [done] GREEN verified: `pytest -q backend/tests/test_dashboard_view_static.py` → `3 passed`; `python -m compileall -q frontend/js` → pass.
- [done] Browser smoke QA `#dashboard`: render normal, chart tetap ada, live DOM mengonfirmasi `heroNote=true`, `summaryCards=3`, `moversRows=5`, `newsCount=3`, `status=DB SYNCED`, dan `quoteFreshness` aktif.
- [done] Deploy runtime: `frontend/js/views/dashboard.js`, `frontend/style.css`, dan `backend/tests/test_dashboard_view_static.py` disalin ke `/opt/swingaq/...`.
- [done] Restart service tidak diperlukan karena deploy hanya menyentuh aset frontend statis + file test.
- [done] Git/push final untuk batch ini selesai.

---

### 2026-05-03 01:25 WIB
- [done] TDD RED phase-2: tambah static guards untuk `dash-chart-context`, `dash-movers-summary`, ranked mover rows, editorial intel cards, suggestion reasons, dan featured news styling.
- [done] Implementasi `frontend/js/views/dashboard.js`: tambah chart context bar + live readout breadth, movers summary chip, ranked mover rows, editorial intel cards, richer suggestion reasons, dan featured news markup.
- [done] Implementasi `frontend/style.css`: rebalance chart vs movers, styling context bar, summary chip, ranked rows, editorial intel cards, news featured state, dan responsive pass kecil.
- [done] GREEN verified: `pytest -q backend/tests/test_dashboard_view_static.py` → `4 passed`; `python -m compileall -q frontend/js` → pass.
- [done] Fix cache-bust deploy gap: bump asset versions di `frontend/index.html`, `frontend/js/main.js`, `frontend/js/router.js`, dan import dashboard view agar runtime memuat patch phase-2.
- [done] Sync runtime `/opt/swingaq/frontend` + `/opt/swingaq/backend/tests` untuk dashboard phase-2.
- [done] Browser QA live setelah deploy: phase-2 hooks termuat; chart context, movers summary, suggestion reasons, dan featured news sudah tersedia dari asset baru.

---

## Current Slice Notes

**Slice aktif sekarang:** Phase 2 dashboard regrouping complete.

**Target patch minimum untuk slice berikutnya:**
1. compact ticker noise / desktop spacing,
2. mobile-first dashboard pass lebih agresif,
3. cross-page consistency ke market/screener,
4. ulangi verify + push + deploy.
