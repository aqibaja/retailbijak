# Market Overview Redesign Plan

> **Execution status:** phase-1 first-fold cleanup **DONE** · phase-2 internals regrouping **DONE** · phase-3 flow/catalyst refinement **DONE** · phase-4 mobile polish **DONE** · phase-5 verification/deploy **DONE**

**Goal:** Merombak halaman `Market Overview` supaya rapi, cepat discan, jelas prioritasnya, dan terasa profesional di desktop maupun mobile.

**Architecture:** Pertahankan vanilla SPA + kontrak API yang ada. Fokus redesign bertahap di `frontend/js/views/market.js` dan `frontend/style.css`, dengan static regression tests di `backend/tests/test_market_view_static.py`. Pendekatan: kecil, aman, terverifikasi, update `PLAN.md` setiap slice selesai.

**Tech Stack:** Vanilla JS, CSS, FastAPI backend existing, pytest static guards, browser QA.

---

## UX Diagnosis Ringkas

1. Fold pertama terlalu padat dan tidak punya fokus tunggal.
2. `Market Pulse` redundan: ada KPI utama lalu mini-panel winner/loser lagi.
3. Stats strip terasa tempelan dan mengulang metrik yang sama.
4. Section bawah sudah lebih baik, tapi hierarchy antar grup belum cukup kuat.
5. Mobile risk tinggi: stacking terlalu panjang, panel sempit, dan CTA kurang jelas.

---

## Target End State

### First fold
- Hero kiri = title, session pill, 1 kalimat summary, metadata rail.
- Hero kanan = data quality + refresh.
- `IHSG Snapshot` jadi anchor utama.
- `Market Pulse` hanya 4 insight: breadth, top winner, top loser, market mood.
- Stats strip jadi ringkas, tidak terasa seperti sisa layout lama.

### Deep sections
- `Market Internals` lebih mudah discan.
- `Flow & Participation` lebih mirip professional data rows.
- `Catalysts & Events` lebih editorial dan rapi.

### Mobile
- Prioritas konten diubah, bukan sekadar di-stack.
- Fold pertama tetap “hidup” tanpa harus scroll jauh.
- Semua card utama full-width dan mudah dibaca.

---

## Phase Plan

### Phase 1 — First-fold cleanup
**Objective:** benahi area atas yang paling berantakan.

**Files:**
- Modify: `frontend/js/views/market.js`
- Modify: `frontend/style.css`
- Test: `backend/tests/test_market_view_static.py`

**Checklist:**
- [x] Tulis failing test untuk struktur pulse non-redundan + stats strip baru.
- [x] Hapus mini-panel pulse yang duplikatif.
- [x] Jadikan pulse tepat 4 tile utama.
- [x] Rapikan summary copy dan stats strip agar lebih jelas.
- [x] Run pytest static guard.
- [x] Update progress di `PLAN.md`.

**Acceptance criteria:**
- Tidak ada lagi `market-pulse-panels` duplikatif di fold pertama.
- `Market Pulse` hanya berisi empat insight primer.
- Stats strip lebih konsisten dengan hierarchy baru.

### Phase 2 — Internals regrouping
**Objective:** bikin `Market Internals` lebih rapi dan seimbang.

**Files:**
- Modify: `frontend/js/views/market.js`
- Modify: `frontend/style.css`
- Test: `backend/tests/test_market_view_static.py`

**Checklist:**
- [x] Perjelas breadth card hierarchy.
- [x] Seragamkan anatomy `Top Gainers` / `Top Losers`.
- [x] Benahi empty state losers agar tetap hidup.
- [x] Perkuat section summary dan spacing.

### Phase 3 — Flow & catalyst refinement
**Objective:** ubah lower data rows jadi lebih profesional dan lebih mudah discan.

**Files:**
- Modify: `frontend/js/views/market.js`
- Modify: `frontend/style.css`
- Test: `backend/tests/test_market_view_static.py`

**Checklist:**
- [x] Rapikan row hierarchy foreign flow.
- [x] Rapikan row hierarchy broker activity.
- [x] Clamp + rapikan catalysts/announcements metadata.
- [x] Samakan spacing dan density antar list cards.

### Phase 4 — Mobile-first polish
**Objective:** pastikan hasil redesign benar-benar enak di mobile.

**Files:**
- Modify: `frontend/style.css`
- Optional: `frontend/js/views/market.js`
- Test: `backend/tests/test_market_view_static.py`

**Checklist:**
- [x] Pastikan top fold tetap ringkas di <= 767px.
- [x] Hilangkan panel sempit yang memaksa wrap jelek.
- [x] Perbesar target tombol/CTA penting.
- [x] Rapikan order section di mobile.

### Phase 5 — Verification, deploy, git hygiene
**Objective:** verifikasi, update progress, commit, deploy.

**Checklist:**
- [x] Jalankan `pytest -q backend/tests/test_market_view_static.py`
- [x] Jalankan `python -m compileall -q frontend/js`
- [x] Browser QA halaman `#market`
- [x] Update `PLAN.md`
- [x] Commit
- [x] Sync runtime `/opt/swingaq/frontend`
- [x] Restart service bila perlu

---

## Progress Log

### 2026-05-02 18:00 WIB
- [done] Audit UI/UX live page `#market`.
- [done] Identifikasi problem utama: fold pertama terlalu padat, `Market Pulse` redundan, stats strip lemah.
- [done] Replace `PLAN.md` dengan plan redesign baru.
- [done] Phase 1 TDD static guards ditulis dulu untuk memaksa pulse 4 tile tanpa panel duplikat.
- [done] Implementasi phase 1: `Market Pulse` disederhanakan menjadi 4 tile primer, mini-panel winner/loser dihapus, stats strip diubah jadi `Breadth Ratio`, `Advancers`, `Decliners`, `Flat`.
- [done] Verifikasi: `pytest -q backend/tests/test_market_view_static.py` → `6 passed`; `python -m compileall -q frontend/js` → pass.
- [done] Phase 2 internals regrouping: breadth card diberi anatomy lebih jelas, `Top Gainers/Losers` punya summary head yang konsisten, dan density list card dibersihkan.
- [done] Git: commit `f2b9e19` (`refine market overview first folds and internals`) sudah di-push ke `origin/main`.
- [done] Deploy frontend: `frontend/js/views/market.js` dan `frontend/style.css` disalin ke `/opt/swingaq/frontend/...`; browser QA live mengonfirmasi `4` pulse tiles, `2` list-card heads, dan `market-breadth-card` tampil.
- [done] Phase 3 flow/catalyst refinement: row foreign flow + broker kini punya kicker/meta/value note yang lebih editorial, card feed diberi hierarchy lebih rapi, dan judul catalyst dipisah dari metadata.
- [done] Verifikasi ulang phase 3: `pytest -q backend/tests/test_market_view_static.py` → `6 passed`; `python -m compileall -q frontend/js` → pass.
- [done] Git: commit `98d279a` (`refine market overview feed sections`) sudah di-push ke `origin/main`.
- [done] Deploy ulang frontend: runtime live sekarang mengonfirmasi `4` pulse tiles, `4` feed cards, `8` catalyst titles, dan `8` value notes.
- [done] Phase 4 mobile-first polish: header mobile ditata ulang supaya title/session pill tidak saling menekan, meta rail ditumpuk vertikal, data-quality card full-width, CTA refresh/empty-state dibesarkan ke 44px, dan row detail kanan dipindah ke stack penuh agar tidak ada kolom sempit.
- [done] Verifikasi phase 4: `pytest -q backend/tests/test_market_view_static.py` → `7 passed`; `python -m compileall -q frontend/js` → pass.
- [done] Browser QA live final: public `#market` tetap render normal setelah sync runtime; live DOM mengonfirmasi `4` pulse tiles dan `4` feed cards tanpa regresi layout desktop.
- [done] Git: commit `bd3285c` (`polish market overview mobile layout`) sudah di-push ke `origin/main`.
- [done] Phase 5 ditutup: browser QA live final lulus, runtime frontend sudah sinkron, dan tidak perlu restart service karena deploy hanya menyentuh aset frontend statis.

---

## Current Slice Notes

**Slice aktif sekarang:** Phase complete — market overview redesign closed.

**Target patch minimum untuk slice ini:**
1. plan closure selesai,
2. progress final tersimpan,
3. commit + push status final,
4. siap pindah ke route berikutnya.
