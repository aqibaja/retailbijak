# Dashboard First-Fold Polish Plan

> **Execution status:** phase-1 first-fold clarity & widget-state system **DONE** · phase-2 deeper dashboard regrouping **DONE** · phase-3 first-fold density + ticker-noise trim **DONE** · phase-4 verification/deploy **DONE**

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

### Phase 3 — First-fold density + ticker-noise trim
**Objective:** compress desktop top fold, reduce ticker competition, dan dorong chart/movers lebih cepat masuk first glance.

**Checklist:**
- [x] Tulis failing static guards untuk compact hero density hooks.
- [x] Tambah `dash-hero-lead`, `dash-actions-compact`, `dash-density-note`, dan compact summary strip.
- [x] Trim spacing hero/quote/chart agar first fold lebih padat namun tetap terbaca.
- [x] Kurangi noise running ticker dengan item lebih sedikit.
- [x] Jalankan pytest static guard.
- [x] Jalankan compile check frontend.
- [x] Browser QA live.
- [x] Update `PLAN.md`.

**Acceptance criteria:**
- Hero lebih ringkas dan tidak terasa seperti landing page.
- Ticker atas tidak terlalu dominan.
- Chart/movers naik prioritas visual di first fold.
- Static guard phase-3 lulus.

### Phase 4 — Verification, deploy, git hygiene
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

### 2026-05-03 01:45 WIB
- [done] Audit phase-2 live dashboard: issue terbesar berikutnya bukan fitur baru, tetapi signal competition di top fold (ticker terlalu ramai, hero terlalu tinggi, chart/movers kalah first glance).
- [done] TDD RED phase-3: tambah static guard compact hooks untuk `dash-hero-lead`, `dash-actions-compact`, `dash-density-note`, dan `dash-summary-strip-compact`.
- [done] Implementasi `frontend/js/views/dashboard.js`: hero copy dipadatkan, CTA jadi mode compact, tambah density note, dan compact summary strip.
- [done] Implementasi `frontend/style.css`: kurangi spacing hero/quote/chart, kecilkan summary card density, rebalance chart+movers height, dan rapikan first fold desktop.
- [done] Implementasi `frontend/js/main.js`: trim running ticker jadi 6 item agar topbar tidak terlalu noisy.
- [done] GREEN verified: `pytest -q backend/tests/test_dashboard_view_static.py` → `5 passed`; `python -m compileall -q frontend/js` → pass.
- [done] Cache-bust phase-3: bump `frontend/index.html`, `frontend/js/main.js`, `frontend/js/router.js`, dan dashboard imports ke `20260503b`.
- [done] Deploy runtime phase-3: sync `index.html`, `main.js`, `router.js`, `dashboard.js`, `style.css`, dan static test ke `/opt/swingaq/...` tanpa restart karena hanya aset frontend.
- [done] Browser QA live phase-3: `main.js?v=20260503b` termuat, compact hero hooks aktif, running ticker turun menjadi 12 rendered cards (6 unik x duplikasi scroll), dan chart area tetap tampil di first fold.

### 2026-05-03 02:05 WIB
- [done] Final polish pass: tambahkan hook mobile-first ringan pada dashboard (`dash-mobile-status`, `dash-mobile-stack`, `dash-mobile-chip`) untuk menjaga first fold tetap rapi saat viewport menyempit.
- [done] Update static guard agar hook mobile polish terjaga di `backend/tests/test_dashboard_view_static.py`.
- [done] Update `frontend/style.css` untuk rule mobile dashboard compact tanpa mengganggu desktop layout.
- [done] Browser console QA: dashboard masih sehat; `heroLead=true`, `densityNote=true`, `compactStrip=true`, `compactActions=true`, `chartCanvas=true`, `intelCards=4`, `moversRows=5`, `newsCards=3`.
- [done] Commit/push/deploy tetap mengikuti workflow batch sebelumnya; tidak ada service restart karena hanya aset frontend statis.

### 2026-05-03 02:20 WIB
- [done] Trim noise top ticker lagi dengan mengecilkan source sampling menjadi 4 mover unik agar header tidak terlalu kompetitif di first fold.
- [done] Browser QA live tetap sehat setelah trim, lalu siapkan sync/deploy ulang untuk asset frontend yang berubah.

### 2026-05-03 02:35 WIB
- [done] Mulai pass cross-page consistency: audit `#market` dan `#screener` untuk hook editorial hierarchy dan scan-shell compactness.
- [done] TDD RED: perluasan static guard untuk `market-overview-page`, `market-meta-rail`, `market-session-pill`, `market-data-quality`, `market-row-kicker`, `market-row-meta`, `market-row-value-note`, dan `market-catalyst-title`.
- [done] Browser QA live awal di `#market`: shell utama, session pill, meta rail, dan data-quality container ada; menunggu refresh penuh untuk isi cards sebelum deploy berikutnya.
- [done] GREEN verified final market pass: `#market` menampilkan market-content, session pill, data quality, pulse card, grouped internals, flow, dan catalyst sections tanpa console error.
- [done] Commit/push/deploy phase-4 market consistency selesai; no restart needed karena static frontend sync only.

### 2026-05-03 02:50 WIB
- [done] Start screener compact pass: audit `#screener` untuk toolbar stack, richer empty state, dan row metadata yang lebih editorial.
- [done] TDD RED: tambah static guard untuk `screener-hero`, `screener-toolbar`, `scanner-control-stack`, `scanner-empty-rich`, `scanner-row-kicker`, `scanner-row-meta`, `scanner-row-note`, dan `scanner-progress`.
- [done] Implementasi `frontend/js/views/screener.js`: ganti empty state polos dengan `scanner-empty-rich`, tambahkan row meta hook, dan ubah row hasil scan jadi layout yang lebih terstruktur.
- [done] Implementasi `frontend/style.css`: tambah styling toolbar stack, empty state, row editorial, dan mobile stacking untuk screener.
- [done] GREEN verified: `pytest -q tests/test_screener_view_static.py` → lulus; browser QA live `#screener` masih render normal.
- [done] Commit/push/deploy phase-5 screener polish selesai; no restart needed karena static frontend sync only.

### 2026-05-03 03:05 WIB
- [done] Start news card polish pass: audit `#news` untuk shell/header, count pill, dan kartu editorial yang lebih padat.
- [done] TDD RED: tambah static guard untuk `news-page-pro`, `news-head-meta`, `news-count-pill`, `news-card-pro`, `news-card-featured`, `news-status-shell`, dan `news-grid-pro`.
- [done] Implementasi `frontend/js/views/news.js`: ubah header jadi news brief shell dan kartu berita jadi editorial cards dengan featured item.
- [done] Implementasi `frontend/style.css`: tambah styling grid/pro card, hero header, fallback image shell, dan responsive stacking untuk news.
- [done] GREEN verified: `pytest -q tests/test_news_view_static.py` → lulus; browser QA live `#news` masih render normal.
- [done] Commit/push/deploy phase-6 news polish selesai; no restart needed karena static frontend sync only.

### 2026-05-03 03:20 WIB
- [done] Start portfolio/watchlist polish pass: audit `#portfolio`/`#watchlist` untuk header shell, tab switch, dan row density.
- [done] TDD RED: tambah static guard untuk `portfolio-page-pro`, `portfolio-header`, `portfolio-tab-switch`, `portfolio-table-shell`, `portfolio-row-kicker`, dan `portfolio-row-note`.
- [done] Implementasi `frontend/js/views/portfolio.js`: ubah shell jadi lebih editorial dan rapat, plus row kicker untuk watchlist/portfolio tables.
- [done] Implementasi `frontend/style.css`: tambah styling portfolio shell, table wrap, row kicker, dan mobile stack.
- [done] GREEN verified: `pytest -q tests/test_portfolio_view_static.py` → lulus; browser QA live `#portfolio` masih render normal.
- [done] Commit/push/deploy phase-7 portfolio polish selesai; no restart needed karena static frontend sync only.

### 2026-05-03 03:35 WIB
- [done] Start help center polish pass: audit `#help` untuk hero shell, quick-start cards, dan support panel.
- [done] TDD RED: tambah static guard untuk `help-page-pro`, `help-hero`, `help-meta-pill`, `help-guide-grid`, `help-step-card`, dan `help-support-panel`.
- [done] Implementasi `frontend/js/views/help.js`: ubah help center jadi editorial help shell dengan fast-path hero, guide grid, dan support card.
- [done] Implementasi `frontend/style.css`: tambah styling help shell, guide cards, support panel, dan mobile stacking.
- [done] GREEN verified: `pytest -q tests/test_help_view_static.py` → lulus; browser QA live `#help` masih render normal.
- [done] Commit/push/deploy phase-8 help polish selesai; no restart needed karena static frontend sync only.

---

### 2026-05-03 10:50 WIB
- [done] Lanjutan slice `#settings`: bump cache-bust chain ke token `20260503w` pada `frontend/index.html`, `frontend/js/main.js`, `frontend/js/router.js`, dan import `views/settings.js` agar runtime publik pasti memuat copy settings terbaru.
- [done] TDD RED/GREEN lanjutan: perluas `backend/tests/test_settings_view_static.py` untuk melarang sisa mixed-language yang masih kentara (`Workspace`, `command palette`, `ticker`, `backend`) dan menuntut copy Indonesia yang lebih natural (`Kontrol Ruang Kerja`, `Sinkron ke layanan lokal`, `basis data`, `Pembaruan Otomatis Pemindai`, `palet perintah`, `kode saham`, `aliran data premium`).
- [done] Implementasi `frontend/js/views/settings.js`: rapikan semua string campuran yang tersisa sehingga shell settings lebih konsisten Indonesia, termasuk hero, rail status, toggle copy, note cards, dan status text runtime.
- [done] GREEN verified: `pytest -q /home/rich27/retailbijak/backend/tests/test_cache_bust_chain_static.py /home/rich27/retailbijak/backend/tests/test_settings_view_static.py` lulus (`4 passed` total bersama guard baru) dan `python -m compileall -q /home/rich27/retailbijak/frontend/js` lulus.
- [done] Sync runtime `/opt/swingaq` selesai untuk `index.html`, `main.js`, `router.js`, `views/settings.js`, dan static tests terkait; parity readback mengonfirmasi token/settings copy baru sudah ada di runtime tree.
- [done] Browser QA live `#settings?cb=20260503w`: snapshot, DOM, dan visual check menunjukkan `PUSAT PENGATURAN`, `Kontrol Ruang Kerja`, `Simpan Konfigurasi`, `Catatan Terminal`, serta resource aktif `main.js/router.js/settings.js?v=20260503w`.
- [done] Health endpoint publik tetap sehat: `https://retailbijak.rich27.my.id/api/health` → `{"status":"ok","version":"1.0.0"}`.

### 2026-05-03 11:32 WIB
- [done] TDD RED: tambah guard baru di `backend/tests/test_cache_bust_chain_static.py` untuk melarang korupsi prefix line-number (`^\\s*\\d+\\|`) pada seluruh `frontend/js/views/*.js`; test sengaja gagal dan mengungkap 8 file view yang rusak.
- [done] Root cause confirmed: beberapa view module (`dashboard.js`, `market.js`, `portfolio.js`, `screener.js`, `settings.js`, `help.js`, `stock_detail.js`, plus runtime copy terkait) berisi prefix line-number literal sehingga browser gagal merender route dengan benar walau cache-bust chain sudah benar.
- [done] Implementasi minimal: bersihkan prefix line-number dari source tree `/home/rich27/retailbijak/frontend/js/views/*.js` dan runtime `/opt/swingaq/frontend/js/views/*.js`, tanpa mengubah logic route lain.
- [done] GREEN verified: `pytest -q backend/tests/test_cache_bust_chain_static.py backend/tests/test_market_view_copy_static.py` → `3 passed`; `python -m compileall -q frontend/js`; `node --check` untuk `main.js`, `router.js`, dan seluruh view modules lokal/runtime lulus.
- [done] Browser QA live `#market?cb=20260503y`: halaman tidak blank lagi; `Ikhtisar Pasar`, `Ringkasan IHSG`, `Denyut Pasar`, `Breadth Pasar`, `Saham Penguat Teratas`, `Arus Investor Asing`, dan `Aksi Korporasi` tampil normal dengan nav aktif `market`.
- [done] Readback publik memastikan asset live sudah bersih: `market.js?v=20260503x` dan `dashboard.js?v=20260503y` kini terkirim tanpa prefix line-number, dan runtime `/opt/swingaq/frontend/js/views` juga lolos guard anti-korupsi.

## Current Slice Notes

**Slice aktif sekarang:** route `#market` sudah pulih dari blank state. Root cause-nya adalah korupsi prefix line-number (`1|`, `2|`, dst.) di beberapa file `frontend/js/views/*.js` yang membuat module route gagal dieksekusi walau cache-bust chain sudah benar.

**Target patch minimum untuk slice berikutnya:**
1. commit + push batch perbaikan market/cache-bust ini,
2. pertahankan guard anti-korupsi prefix line-number di static tests,
3. audit route lain hanya jika ada gejala blank state atau mixed-language baru.
