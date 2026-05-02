# Market Overview Redesign Plan

> **Execution status:** phase-1 first-fold cleanup **IN PROGRESS** · phase-2 internals regrouping **PLANNED** · phase-3 flow/catalyst refinement **PLANNED** · phase-4 mobile polish **PLANNED** · phase-5 verification/deploy **PLANNED**

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
- [ ] Rapikan row hierarchy foreign flow.
- [ ] Rapikan row hierarchy broker activity.
- [ ] Clamp + rapikan catalysts/announcements metadata.
- [ ] Samakan spacing dan density antar list cards.

### Phase 4 — Mobile-first polish
**Objective:** pastikan hasil redesign benar-benar enak di mobile.

**Files:**
- Modify: `frontend/style.css`
- Optional: `frontend/js/views/market.js`
- Test: `backend/tests/test_market_view_static.py`

**Checklist:**
- [ ] Pastikan top fold tetap ringkas di <= 767px.
- [ ] Hilangkan panel sempit yang memaksa wrap jelek.
- [ ] Perbesar target tombol/CTA penting.
- [ ] Rapikan order section di mobile.

### Phase 5 — Verification, deploy, git hygiene
**Objective:** verifikasi, update progress, commit, deploy.

**Checklist:**
- [ ] Jalankan `pytest -q backend/tests/test_market_view_static.py`
- [ ] Jalankan `python -m compileall -q frontend/js`
- [ ] Browser QA halaman `#market`
- [ ] Update `PLAN.md`
- [ ] Commit
- [ ] Sync runtime `/opt/swingaq/frontend`
- [ ] Restart service bila perlu

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
- [in_progress] Menyiapkan phase 3: flow/catalyst refinement, lalu push + deploy.

---

## Current Slice Notes

**Slice aktif sekarang:** Phase 1 — first-fold cleanup.

**Target patch minimum untuk slice ini:**
1. hapus mini-panel pulse duplikatif,
2. jadikan pulse 4 tile utama,
3. rapikan stats strip agar mendukung hierarchy baru,
4. update progress setelah test pass.
