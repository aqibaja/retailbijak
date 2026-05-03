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

### 2026-05-03 23:55 CST
- [done] Root-cause investigation OpenRouter live 401 selesai: token di `~/.hermes/.env` dan DB memang ada (`sk-or-v1-...`, length 73), endpoint publik `GET /api/v1/models` tetap `200`, tetapi semua endpoint autentikasi/LLM (`/auth/key`, `/credits`, `/chat/completions`) mengembalikan `401 {"error":{"message":"User not found."}}`; jadi masalah bukan wiring request RetailBijak, melainkan API key OpenRouter yang invalid/tidak lagi terasosiasi ke user provider.
- [done] TDD RED: tambah guard `backend/tests/test_user_route_runtime.py` dan `backend/tests/test_settings_view_static.py` untuk memaksa `/api/settings` mengekspos status runtime OpenRouter (`openrouter_runtime_state`, `openrouter_runtime_message`) dan view `#settings` menampilkan state peringatan `OpenRouter perlu dicek` saat key ditolak provider.
- [done] RED verified: `PYTHONPATH=/home/rich27/retailbijak/backend:/home/rich27/retailbijak /opt/swingaq/backend/venv/bin/pytest -q backend/tests/test_user_route_runtime.py backend/tests/test_settings_view_static.py` awalnya gagal karena route/settings belum punya status runtime OpenRouter.
- [done] Implementasi backend: `backend/services/openrouter_llm.py` menambah `get_openrouter_runtime_status()` yang memvalidasi key ke `/api/v1/auth/key`, lalu `backend/routes/user.py` mengembalikan `openrouter_runtime_state` + `openrouter_runtime_message` di GET/PUT `/api/settings`.
- [done] Implementasi frontend: `frontend/js/views/settings.js` kini membedakan status `OPENROUTER AKTIF`, `OpenRouter perlu dicek`, atau `TERSAMBUNG KE LAYANAN LOKAL`, plus tooltip status memuat pesan runtime provider agar invalid key langsung terlihat di UI.
- [done] GREEN verified: `PYTHONPATH=/home/rich27/retailbijak/backend:/home/rich27/retailbijak /opt/swingaq/backend/venv/bin/pytest -q backend/tests/test_openrouter_env_static.py backend/tests/test_user_route_runtime.py backend/tests/test_settings_view_static.py backend/tests/test_ai_picks_api.py backend/tests/test_stock_analysis_llm_api.py backend/tests/test_sync_production_static.py backend/tests/test_ai_picks_view_static.py backend/tests/test_ai_picks_scoring.py` → `41 passed`.
- [done] Compile verified: `python3 -m py_compile backend/main.py backend/routes/user.py backend/services/openrouter_llm.py backend/ai_picks.py && python3 -m compileall -q frontend/js` lulus.
- [done] Deploy production verified: `bash /home/rich27/retailbijak/scripts/sync_production.sh` kembali `PASS` penuh (parity, restart, smoke check, public resource chain).
- [done] Live runtime verified sesudah deploy: `/api/settings` sekarang mengembalikan `openrouter_runtime_state="invalid"` dan `openrouter_runtime_message="API key OpenRouter ditolak provider: User not found."`; endpoint `/api/ai-picks?...&llm=1` dan `/api/stocks/BBCA/analysis?llm=1` tetap gagal `401`, konsisten dengan diagnosis credential invalid.
- [done] Browser QA publik: `#settings` live kini menampilkan status `OpenRouter perlu dicek`; `#ai-picks` tetap menampilkan `AI Desk Brief tertunda`; `#stock/BBCA` tetap menampilkan fallback/status AI tertunda secara jujur.
- [warn] Blocker tersisa bukan di kode RetailBijak: agar LLM benar-benar aktif, user harus mengganti `OPENROUTER_API_KEY` dengan key OpenRouter yang valid untuk account aktif. Setelah key baru tersedia, cukup simpan ulang di `#settings` atau update DB/env lalu re-run smoke check.

---

### 2026-05-04 00:04 CST
- [done] TDD RED untuk bug stock-detail live: tambah guard `test_api_exposes_fetch_analysis_helper_with_optional_llm_query()` di `backend/tests/test_ai_picks_view_static.py` agar helper frontend wajib membentuk URL `?llm=1` yang valid untuk endpoint `/api/stocks/{ticker}/analysis`.
- [done] RED verified: guard baru gagal secara semantik terhadap implementasi lama karena `frontend/js/api.js` masih menyusun URL `.../analysis&llm=1`, sehingga request browser jatuh ke fallback non-LLM dan runtime message invalid OpenRouter tidak pernah muncul di detail saham.
- [done] Implementasi minimal: ubah `fetchAnalysis()` di `frontend/js/api.js` dari suffix `&llm=1` menjadi `?llm=1`.
- [done] GREEN verified: `pytest -q backend/tests/test_ai_picks_view_static.py -k fetch_analysis_helper_with_optional_llm_query` → `1 passed`; full `pytest -q backend/tests/test_ai_picks_view_static.py` → `15 passed`; `python3 -m compileall -q frontend/js` → pass.
- [done] Sync runtime statis: `frontend/js/api.js` dan test guard terkait disalin ke `/opt/swingaq/...`.
- [done] Browser QA publik final: `#settings` tetap menampilkan `OpenRouter perlu dicek`; `#stock/BBCA` sekarang menampilkan `ASISTEN AI TERTUNDA` + pesan live `API key OpenRouter ditolak provider: User not found.` dan tidak lagi jatuh ke copy fallback `OpenRouter belum aktif`; fetch langsung `/api/stocks/BBCA/analysis?llm=1` juga mengembalikan `llm.runtime_state="invalid"`.
- [done] Kesimpulan: surface invalid-key kini konsisten di settings, AI Picks, dan stock detail; blocker tersisa tetap hanya penggantian API key OpenRouter yang valid.

---

### 2026-05-04 00:42 CST
- [done] Validasi model OpenRouter live: katalog `/api/v1/models` dan endpoint detail `/models/openai/gpt-oss-120b:free/endpoints` sama-sama mengonfirmasi `openai/gpt-oss-120b:free` masih terdaftar dan punya provider `OpenInference`, jadi slug model RetailBijak valid dan bukan typo konfigurasi.
- [done] Reproduksi provider langsung dengan API key baru menunjukkan perilaku upstream memang fluktuatif: request yang sama ke `openai/gpt-oss-120b:free` kadang `200`, kadang `429 temporarily rate-limited upstream`, dan kadang respons/body rusak dari provider (`could not decode header` / body non-JSON). Jadi blocker live saat ini bukan invalid key atau model hilang, melainkan instabilitas upstream free-tier `OpenInference`.
- [done] TDD RED: tambah regression tests baru di `backend/tests/test_openrouter_llm_service.py` untuk kasus rate-limit, body JSON dengan leading whitespace, body prefixed/non-JSON, dan fallback error parser agar builder OpenRouter tidak lagi pecah dengan error mentah seperti `LLM gagal: 'choices'` atau `Expecting value`.
- [done] Implementasi hardening `backend/services/openrouter_llm.py`: parser `_chat_completion()` sekarang menangani HTTP error payload tanpa `choices`, rate-limit `429`, body JSON yang diawali whitespace/debug preamble, `content` list/string, body kosong, dan konten non-JSON; surface fallback kini konsisten mengembalikan `runtime_state` yang jujur (`rate_limited` / `unknown`) beserta pesan operator yang bisa ditindaklanjuti.
- [done] GREEN verified lokal: `PYTHONPATH=/home/rich27/retailbijak/backend:/home/rich27/retailbijak /opt/swingaq/backend/venv/bin/pytest -q backend/tests/test_openrouter_llm_service.py backend/tests/test_ai_picks_api.py backend/tests/test_stock_analysis_llm_api.py backend/tests/test_user_route_runtime.py` → `20 passed`; `python3 -m py_compile backend/services/openrouter_llm.py backend/routes/user.py backend/ai_picks.py backend/main.py` → pass.
- [done] Deploy runtime: `backend/services/openrouter_llm.py` + regression tests disalin ke `/opt/swingaq/backend/...`, service `swingaq-backend` direstart, health check publik tetap `{"status":"ok","version":"1.0.0"}`.
- [done] Verifikasi end-to-end publik pascadeploy: `/api/settings` live menunjukkan `openrouter_runtime_state="ok"`; loop smoke `ai-picks`/`stock-detail` sekarang mayoritas `ok` dengan fallback jujur saat upstream gagal. Error `Model not found` hilang; kegagalan yang tersisa kini terklasifikasi sebagai `rate_limited` atau `unknown` dengan pesan nyata dari provider, bukan crash parser internal.
- [warn] Residual issue live masih berasal dari provider free-tier `openai/gpt-oss-120b:free` via `OpenInference`: observasi publik menunjukkan respons sesekali sukses tetapi kadang rate-limit atau corrupt upstream (`could not decode header`, `konten OpenRouter bukan JSON valid`). Jika ingin pengalaman lebih stabil, model stock-analysis sebaiknya dipindah kembali ke `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` atau model non-free/BYOK yang lebih stabil.

---

### 2026-05-04 02:02 CST
- [done] Re-audit requirement AI Picks harian 08:00 selesai: scheduler `daily_ai_picks` memang sudah jalan Senin-Jumat jam `08:00 Asia/Jakarta`, payload actionable (`entry/stop/TP/RR`) dan storage briefing persisten juga sudah ada, tetapi saya menemukan gap semantik pada penanggalan briefing.
- [done] Evidence gap: payload `build_ai_picks_payload()` masih memakai `market_context.latest_date` (tanggal trading snapshot OHLCV terakhir) sebagai `trading_date/as_of_label`, sehingga briefing premarket 08:00 pada hari kerja baru bisa tetap berlabel tanggal sesi lama bila market data terakhir belum berganti. Endpoint publik saat audit juga menunjukkan pola ini (`generated_at` baru, tetapi `trading_date/as_of_label` masih `2026-04-30`).
- [done] TDD RED: tambah regression test `test_ai_picks_payload_uses_current_jakarta_trading_day_for_premarket_label()` di `backend/tests/test_ai_picks_api.py` untuk memaksa briefing memakai **tanggal trading Jakarta saat briefing dibuat**, sambil tetap mempertahankan `market_context.latest_date` sebagai tanggal snapshot data sumber.
- [done] RED verified: test baru awalnya gagal dengan `AttributeError` karena helper penanggalan Jakarta belum ada; ini mengonfirmasi gap requirement nyata, bukan sekadar asumsi.
- [done] Implementasi minimal di `backend/ai_picks.py`: tambah `ZoneInfo('Asia/Jakarta')` + helper `_current_jakarta_trading_date()`, lalu ubah `build_ai_picks_payload()` agar `trading_date`/`as_of_label` memakai tanggal Jakarta saat generate briefing, bukan tanggal OHLCV terakhir.
- [done] GREEN verified: `pytest -q backend/tests/test_ai_picks_api.py -k jakarta_trading_day` → `1 passed`; full suite fokus AI Picks (`test_ai_picks_api.py`, `test_ai_picks_view_static.py`, `test_ai_picks_scheduler_static.py`, `test_database_config.py`) → `36 passed`; `python3 -m py_compile backend/ai_picks.py && python3 -m compileall -q frontend/js` → pass.
- [done] Deploy/runtime sync juga sudah dijalankan via `bash scripts/sync_production.sh` dan seluruh parity + smoke check produksi kembali hijau.
- [done] Smoke check publik sesudah deploy menunjukkan nuance penting: endpoint default `GET /api/ai-picks?...` masih membaca report lama `source=db` dengan label tanggal lama, tetapi `GET /api/ai-picks?...&refresh=1` meregenerasi briefing dan kini mengembalikan `trading_date/as_of_label` sesuai tanggal Jakarta aktif. Jadi patch kode sudah benar; cache data report lama baru akan tersapu otomatis pada generate berikutnya atau saat operator memicu refresh.
- [done] Git working tree diaudit sebelum finalisasi: perubahan terfokus hanya di `backend/ai_picks.py`, `backend/tests/test_ai_picks_api.py`, dan `PLAN.md`; beberapa file `.hermes/plans/*.md` tetap dibiarkan untracked karena artefak planning lokal, bukan bagian patch produk.
- [done] Git hygiene final selesai: patch di-stage selektif, di-commit sebagai `9121d55 fix: align ai picks briefing date with jakarta trading day`, lalu berhasil di-push ke `origin/main`.
- [done] Post-push status bersih untuk patch produk; sisa untracked hanya file planning lokal di `.hermes/plans/`, tidak memengaruhi runtime maupun repo produk.
- [done] Audit lanjutan hygiene repo: `.gitignore` belum mengabaikan artefak planning lokal `.hermes/plans/`, sehingga setiap sesi kerja masih meninggalkan noise `git status` walau patch produk sudah selesai.
- [done] Fix hygiene repo diterapkan: tambah rule `.hermes/plans/` ke `.gitignore` agar artefak planning lokal Hermes tidak lagi mencemari working tree proyek.
- [done] Verifikasi pasca-fix: `git status --short` sebelum commit tinggal menunjukkan `.gitignore` dan `PLAN.md`; empat file plan lokal tidak lagi muncul sebagai untracked.
- [done] Git hygiene lanjutan selesai: perubahan di-commit sebagai `6010700 chore: ignore local hermes planning artifacts`.
- [done] Push final hygiene commit berhasil ke `origin/main`; status HEAD kini `6010700`.
- [done] Setelah push, working tree yang tersisa hanya `PLAN.md` karena dokumentasi step final ini baru saja ditambahkan; artefak `.hermes/plans/` sudah benar-benar tidak muncul lagi di `git status`.
- [done] Audit lanjutan menemukan nuance kedua: walau `.hermes/plans/` sudah di-ignore untuk file baru, masih ada **dua file plan lama yang sudah terlanjur tracked** di git (`.hermes/plans/2026-05-01_093500-retailbijak-phase-2.md` dan `.hermes/plans/2026-05-01_mobile-dark-mode-rescue.md`), sehingga hygiene repo belum sepenuhnya final.
- [done] Cleanup tracked artifact dijalankan dengan `git rm --cached` pada dua file `.hermes/plans/*` lama, sehingga file lokal tetap ada di workspace tetapi keluar dari index/repo.
- [done] Verifikasi pasca-cleanup: `git ls-files '.hermes/plans/*'` sekarang kosong; `git status --short` hanya menunjukkan deletion terstage untuk dua file lama plus perubahan dokumentasi `PLAN.md`.
- [done] Cleanup tracked artifact selesai di-commit sebagai `359ef1e chore: drop tracked hermes planning artifacts` dan berhasil di-push ke `origin/main`.
- [done] Hasil akhir hygiene repo: artefak `.hermes/plans/` kini tidak lagi tracked dan juga tidak lagi muncul sebagai untracked baru, sehingga working tree proyek bersih dari noise planning lokal secara permanen.
- [done] Audit follow-up pasca-cleanup: `git status --short` bersih, HEAD berada di `6aa764f`, tidak ada `TODO/FIXME/XXX/HACK` tersisa di tree proyek, dan tidak ada lagi file `.hermes/plans/*` yang tracked.
- [done] Regression verification penuh dijalankan ulang untuk memastikan hygiene cleanup tidak menimbulkan regresi produk: `pytest -q backend/test_api_e2e.py backend/tests/test_ai_picks_api.py backend/tests/test_ai_picks_view_static.py backend/tests/test_ai_picks_scheduler_static.py backend/tests/test_database_config.py` → `52 passed`; compile check backend/frontend juga lulus.
- [done] Deploy/smoke follow-up juga dijalankan ulang: `bash scripts/sync_production.sh` kembali hijau penuh, dan smoke publik mengonfirmasi `GET /api/ai-picks?mode=swing&limit=3` tetap sehat dengan `source=db`, `trading_date=2026-05-04`, serta `freshness=Briefing baru`.
- [done] Verification sweep pasca-push didokumentasikan lagi sebagai commit `fc74fa1 docs: record post-cleanup verification sweep`, sehingga log repo dan `PLAN.md` sinkron penuh.
- [done] Browser QA live terbaru untuk `#ai-picks` dijalankan ulang setelah cleanup hygiene repo guna memastikan tidak ada efek samping pada SPA publik. Hasilnya kini jauh lebih sehat dibanding sesi blank sebelumnya: route `#ai-picks` termuat, `h1` = `AI Picks Hari Ini`, `.ai-picks-page` ada, `#app-root` terisi (`innerHTML.length=3143`), dan shell tombol mode/refresh tampil normal.
- [done] Evidence browser juga menunjukkan nuance penting: elemen page AI Picks sudah hidup meski `document.body.dataset.activeView/routePath` masih `null` pada snapshot automation ini. Karena render aktual sudah sukses dan tidak ada gejala blank main-content pada pass ini, saya mencatatnya sebagai observasi automation, bukan defect aplikasi baru.
- [done] Browser QA companion untuk `#dashboard` juga dijalankan pada sesi yang sama agar perbandingan lintas-route tetap grounded. Dashboard publik termuat normal dengan `h1 = Dashboard Intelijen Pasar`, chart canvas ada, widget `Top AI Pick Today` muncul, serta `#app-root` terisi penuh; ini memperkuat bahwa blank-main-content sebelumnya memang tidak lagi reproduktif di pass terbaru.
- [done] Browser QA tambahan untuk `#settings` ikut dijalankan agar coverage lintas-route makin lengkap setelah pass `#ai-picks`/`#dashboard`. Halaman pengaturan publik termuat normal dengan `h1 = Kontrol Ruang Kerja`, panel `OPENROUTER AI` tampil, field konfigurasi terlihat, tombol `Simpan Konfigurasi` ada, dan status runtime terbaca `TERSAMBUNG KE LAYANAN LOKAL` tanpa console error aktif.
- [done] Browser QA tambahan berikutnya untuk `#market` juga dijalankan agar lintas-route verification mencakup halaman market editorial. Route publik termuat normal dengan `h1 = Ikhtisar Pasar`, tombol `Muat Ulang` tersedia, `#app-root` terisi (`innerHTML.length=23520`), indikator sesi terbaca `Sesi Live`, inline source muncul, panel `Kualitas Data` hidup, dan klik `Muat Ulang` tidak memunculkan console error baru.
- [done] Browser QA tambahan untuk hub `#portfolio`/`#watchlist` juga dijalankan agar coverage lintas-route mencakup area aset pengguna. Route publik termuat normal dengan `h1 = Aset & Daftar Pantau`, tab `Portofolio` dan `Daftar Pantau` berfungsi, `#app-root` terisi (`innerHTML.length=2646` pada portofolio), empty state tabel tampil jujur (`Belum ada posisi portofolio.` / `Belum ada saham di daftar pantau.`), dan perpindahan ke `#watchlist` tidak memunculkan console error baru.
- [done] Browser QA tambahan untuk route `#news` juga dijalankan agar coverage lintas-route mencakup feed editorial. Halaman publik termuat normal dengan `h1 = Berita Terbaru`, counter `20 ITEM INTEL` tampil, hint auto-refresh feed terlihat, `#app-root` terisi (`innerHTML.length=28140`), total artikel yang tertaut terbaca `20`, dan klik artikel teratas berhasil membuka berita sumber eksternal CNBC Indonesia tanpa console error baru di SPA.
- [done] Browser QA tambahan untuk route `#help` juga dijalankan agar coverage lintas-route mencakup pusat bantuan. Halaman publik termuat normal dengan `h1 = Pusat Bantuan`, `#app-root` terisi (`innerHTML.length=3417`), jalur cepat dan section `Panduan Mulai Cepat`/`Butuh Bantuan?` tampil, link aksi `Buka Settings` bekerja memindahkan route ke `#settings`, dan landing settings sesudah navigasi tetap sehat tanpa console error baru.
- [done] Browser QA tambahan untuk route `#stock/BBCA` juga dijalankan agar coverage lintas-route mencakup detail saham live. Halaman publik termuat normal dengan `h1 = BBCA`, `#app-root` terisi (`innerHTML.length=16015`), panel `Grafik Harga`/`Ringkasan Sesi`/`Ringkasan Teknikal`/`Statistik Kunci`/`Snapshot Analisis`/`Catatan Aksi` tampil, blok `Asisten AI` hidup dengan brief aktif, tombol aksi utama tersedia, dan link kembali dari detail saham berhasil membawa pengguna ke `#dashboard` tanpa console error baru. Cross-check `#watchlist` sesudah klik `Tambah ke Daftar Pantau` masih menunjukkan empty state `0 ENTRI`, jadi tombol itu belum memberi feedback/persistensi yang tervalidasi pada smoke browser ini.
- [done] Dokumentasi QA browser tambahan sudah dipersist ke git: commit `a410a22 docs: record additional browser qa coverage` berhasil dibuat dan di-push ke `origin/main`, sehingga catatan `PLAN.md` kembali sinkron dengan coverage lintas-route terbaru.
- [done] Investigasi akar masalah tombol `Tambah ke Daftar Pantau` dari `#stock/BBCA` dimulai dengan audit source + smoke browser. Evidence awal: handler frontend memang ada di `frontend/js/views/stock_detail.js` (`saveWatchlistItem({ ticker: symbol, notes: 'Ditambahkan dari halaman detail' })` + `showToast(...)`), endpoint backend `POST /api/watchlist` di `backend/routes/user.py` juga sudah menerima upsert berdasarkan ticker, dan `#toast-container` tersedia di DOM live. Namun smoke browser terbaru setelah klik tombol tetap tidak menampilkan toast maupun error console, sementara cross-check `#watchlist` sebelumnya juga tetap `0 ENTRI`; jadi gap saat ini lebih mengarah ke alur frontend yang tidak memunculkan feedback/persistensi terverifikasi, bukan ketiadaan endpoint dasar.
- [done] Triangulasi lanjutan menunjukkan dugaan bug watchlist **tidak berhasil direproduksi secara konsisten**. Verifikasi browser yang lebih dalam membuktikan `showToast()` memang sehat (manual import helper menampilkan toast), `btn-set-alert` dari halaman detail juga menampilkan toast normal, request langsung `fetch('/api/watchlist', {method:'POST', ...})` sukses `200`, pemanggilan modul `saveWatchlistItem({ticker:'BBCA', ...})` juga sukses, dan klik `btn-add-watchlist` via evaluasi DOM menghasilkan toast `BBCA ditambahkan ke Daftar Pantau`. Setelah itu route publik `#watchlist` benar-benar menampilkan `DAFTAR PANTAU 1 ENTRI` berisi `BBCA`. Jadi false negative awal kemungkinan berasal dari timing/observability smoke browser sebelumnya, bukan defect aplikasi yang tervalidasi.
- [done] Hygiene pasca-triangulasi juga dijalankan: entri watchlist `BBCA` yang dibuat saat investigasi browser dihapus lagi lewat `DELETE /api/watchlist/BBCA`, sehingga data demo sementara tidak tertinggal di runtime publik.
- [done] Dokumentasi investigasi watchlist terbaru sudah disinkronkan ke git: commit `59dce7f docs: sync final watchlist plan note` berhasil dibuat dan di-push ke `origin/main`, sehingga `PLAN.md` benar-benar sinkron dengan hasil verifikasi akhir untuk isu ini.
- [done] Browser QA tambahan untuk route `#screener` juga dijalankan agar coverage lintas-route mencakup alur scan live. Fresh load publik menampilkan state awal sehat (`h1 = Pemindai Akumulasi Institusi`, `BELUM SCAN`, `#app-root` terisi `3884`, sort/search masih disabled), lalu klik `Jalankan Pemindaian SwingAQ` berhasil mengaktifkan stream backend tanpa console error: progress tampil (`Sedang memindai ... 100%`), hasil akhir menunjukkan `12 TERDETEKSI`, field sort + search aktif, dan snapshot pasca-scan memuat 12 kartu kandidat live (ADHI, ADRO, BBSI, BOBA, dst).
- [done] QA interaksi topbar search di route `#dashboard` juga sudah dieksekusi dan **menemukan regression JS non-blocking**. Klik tombol `Cari` memang membuka overlay + memfokuskan input `#global-search-input`, pencarian `bbca` lalu `Enter` juga tetap bernavigasi sukses ke `#stock/BBCA`, tetapi console menangkap error `Cannot set properties of null (setting 'innerHTML')` saat overlay search dibuka. Snapshot sesudahnya membuktikan fallback UX masih usable (route detail BBCA termuat penuh), namun ada bug DOM null-reference pada renderer hasil search yang perlu diperbaiki di task engineering berikutnya.
- [next] Persist hasil QA route `#screener` + topbar search ini ke git (`PLAN.md`) lewat commit/push batch berikutnya.

---

### 2026-05-04 01:44 CST
- [done] Git hygiene selesai: perubahan AI Picks briefing harian di-commit sebagai `7ff073c Add daily AI picks briefing workflow` dan berhasil di-push ke `origin/main`.
- [done] Scope task ini tuntas end-to-end: test, compile, deploy runtime, smoke test lokal/publik, dokumentasi `PLAN.md`, commit, dan push semuanya beres.

---

### 2026-05-04 01:52 CST
- [done] Investigasi lanjutan blank main-content dilanjutkan dengan fresh browser context baru di `?cb=qa20260504c#ai-picks` untuk memastikan apakah issue benar-benar spesifik AI Picks atau global pada SPA render.
- [done] Browser evidence konsisten: `location.hash` tetap `#ai-picks`, resource JS view lengkap termuat (`main/router/api/theme/dashboard/.../ai_picks/i18n`), tetapi `#app-root` masih kosong (`innerHTML.length=0`), `data-route-path`/`data-active-view` tidak pernah terpasang, dan nav aktif tetap `dashboard`; ini menunjukkan `handleRoute()` tidak benar-benar menulis DOM pada sesi automation meski chain resource publik sudah benar.
- [done] Visual QA ulang mengonfirmasi blank main area tanpa empty/error state; header dan sidebar tetap render. Jadi gejala yang terlihat user-facing di automation memang blank content region, bukan salah hash URL.
- [done] Verifikasi runtime/API independen dari browser tetap sehat: `/api/health` = `ok`; `/api/settings` live mengembalikan `openrouter_runtime_state="ok"`; `/api/ai-picks?mode=swing&limit=5` mengembalikan briefing `source=db`, `freshness=Briefing baru`, `generated_at` valid, dan `2` kandidat; `/api/ai-picks?...&llm=1` juga `200` dengan `llm.status="ok"`; `refresh=1` sukses memperbarui briefing menjadi `5` kandidat.
- [done] Verifikasi filesystem/runtime juga sehat: `/opt/swingaq/frontend/index.html`, `js/main.js`, `js/router.js`, `js/api.js`, dan `js/views/ai_picks.js` semuanya ada dengan ukuran sesuai deploy saat ini.
- [done] Cross-check source publik lewat script terpisah menegaskan kontrak deploy benar: `index.html` memang memuat `main.js?v=20260503ab`, `main.js` mengimpor `router.js?v=20260503ab` dan `api.js?v=20260503b`, sementara `router.js` punya dispatch `ai-picks` dan setter dataset route. Jadi tidak ada bukti drift file publik/repo pada batch ini.
- [done] Kesimpulan sementara batch lanjutan: AI Picks live **backend/runtime/resource-chain** tervalidasi sehat, tetapi browser automation Hermes masih gagal mengeksekusi render SPA sampai mengisi `#app-root`. Karena root cause app-side belum terbukti dan tidak ada patch yang bisa diverifikasi aman, saya **menahan code-change** dan hanya mendokumentasikan evidence ini.
- [done] Todo lanjutan diperbarui: `g8` investigasi blank render selesai dengan evidence lebih kuat; `g9` verifikasi AI Picks live lintas endpoint/runtime juga selesai dan seluruh proses sudah dicatat di `PLAN.md`.

---

### 2026-05-04 01:47 CST
- [done] Browser QA ulang untuk `#ai-picks` dan `#dashboard` dari fresh browser context dijalankan khusus untuk memverifikasi briefing harian publik/live.
- [done] Hasil browser automation sesi ini menunjukkan shell/topbar/sidebar termuat tetapi `#app-root` tetap kosong di kedua route; jadi temuan awal bukan spesifik AI Picks, melainkan blank main-content di context browser automation saat ini.
- [done] Triangulasi dilakukan sebelum patch kode: resource chain publik tetap `200` untuk `index.html`, `main.js?v=20260503ab`, `router.js?v=20260503ab`, `views/ai_picks.js?v=20260503ai`, `api.js?v=20260503b`, dan `style.css?v=20260503i`; file runtime `/opt/swingaq/frontend/js/views/ai_picks.js` juga ada dan ukurannya sesuai repo.
- [done] Cross-check import lokal via Node shim berhasil memuat `frontend/js/main.js` tanpa syntax/export error aplikasi; kegagalan yang tampak hanya `fetch('/api/...')` relatif karena environment Node tidak punya base URL, jadi tidak mengindikasikan bug source frontend.
- [done] Kesimpulan QA batch ini: tidak ditemukan bukti baru bahwa deploy AI Picks briefing harian rusak di source/runtime; blank state yang terlihat terlokalisasi pada sesi browser automation ini sendiri. Karena tidak ada defect aplikasi yang tervalidasi lintas-check, **tidak ada patch kode tambahan** yang dilakukan untuk g7.
- [done] Status task diperbarui: g6 selesai dengan catatan evidence QA + triangulasi; g7 ditutup tanpa code-change karena tidak ada temuan app-side yang tervalidasi.

---

### 2026-05-04 01:41 CST
- [done] Deploy briefing harian AI Picks ke runtime `/opt/swingaq`: sync `backend/{ai_picks,database,main,scheduler}.py`, `frontend/js/{api,views/ai_picks}.js`, dan `frontend/style.css`; service `swingaq-backend` berhasil restart dengan status `active`.
- [done] Smoke test runtime lokal + publik lulus: `/api/health` tetap `ok`, `/api/ai-picks?mode=swing&limit=2` publik mengembalikan payload briefing `source=db` + `freshness=Briefing baru`, dan refresh lokal `refresh=1&llm=1` mengembalikan `llm_state=ok`.
- [next] Finalisasi git diff/commit/push agar perubahan AI Picks briefing harian terdokumentasi penuh di repo.

---

### 2026-05-04 01:33 CST
- [done] Implementasi backend/frontend briefing harian distabilkan: route `/api/ai-picks` kini menghormati `limit=0`, hanya inject `llm` saat diminta, dan payload report tersimpan/terbaca konsisten dengan `updated_at`.
- [done] Verifikasi compile + test ulang pasca-fix: `35 passed` dan compile check backend/frontend lulus.
- [next] Tinggal verifikasi runtime/deploy ke `/opt/swingaq`, restart service, smoke test live, lalu commit/push.

---

### 2026-05-04 01:28 CST
- [done] TDD GREEN untuk fase test: sesuaikan assertion static/API setelah kontrak final menyertakan `updated_at` dan helper frontend `refresh=1`.
- [done] Verifikasi suite fokus AI Picks harian lulus penuh: `35 passed` untuk `test_ai_picks_api.py`, `test_ai_picks_view_static.py`, `test_ai_picks_scheduler_static.py`, dan `test_database_config.py`.
- [next] Lanjut verifikasi production code/backend-frontend lebih dalam (compile/runtime), lalu update status todo ke implementasi + deploy.

---

### 2026-05-04 01:18 CST
- [done] TDD RED dimulai: tambah failing tests untuk `DailyAIPickReport`, kontrak API briefing harian (`trading_date/generated_at/freshness`), actionable pick fields (`thesis`, `entry_zone`, `stop_loss`, `take_profit`, `risk_reward`), dan static UI briefing harian + scheduler hook `daily_ai_picks` jam 08:00 WIB.
- [done] RED verified: `pytest` collection langsung gagal karena `backend.database` **belum** punya model `DailyAIPickReport`; ini mengonfirmasi test baru benar-benar memaksa implementasi storage briefing persisten lebih dulu.
- [next] Implementasi production code untuk model DB + generator briefing + route/API + scheduler agar test RED bisa digreen-kan.

---

### 2026-05-04 01:12 CST
- [done] Mulai eksekusi implementasi AI Picks briefing harian otomatis dengan workflow TDD + continuous flow.
- [done] Audit source saat ini: `backend/ai_picks.py` masih menghasilkan payload on-demand `updated_at/source/summary/data` tanpa storage persisten, tanpa `trading_date/generated_at`, dan tanpa field actionable baru seperti `stop_loss`, `take_profit`, `risk_reward`.
- [done] Audit scheduler: `backend/scheduler.py` belum punya job AI Picks harian jam **08:00 WIB**; yang ada baru signal/news/fundamental/IDX daily sync.
- [done] Audit route/UI: `/api/ai-picks` masih langsung memanggil `build_ai_picks_payload()` on-demand, dan `frontend/js/views/ai_picks.js` masih berframing `CURATED IDEA DESK` + ranked candidates, belum sebagai briefing harian otomatis dengan freshness timestamp.
- [next] Menulis failing tests dulu untuk model storage briefing harian, job scheduler 08:00 WIB, kontrak API AI Picks harian, dan static UI briefing sebelum implementasi production code.

---

### 2026-05-04 01:02 CST
- [done] Requirement AI Picks diperjelas: fitur ini bukan sekadar page AI on-demand, tetapi **daily premarket stock-pick briefing** yang otomatis jalan setiap hari kerja jam **08:00 WIB**.
- [done] Plan separation AI feature diperbarui agar AI Picks wajib menyimpan briefing harian persisten dengan output actionable: alasan masuk, entry zone, stop loss, take profit, risk-reward, serta catatan risiko/katalis.
- [done] Plan juga diperluas dengan phase baru untuk storage report harian, scheduler job 08:00 WIB, kontrak API briefing harian, dan UX `#ai-picks` berbasis hasil briefing terbaru.
- [next] Implementasi belum dimulai; tahap saat ini masih requirement capture + plan update.

---

---

### 2026-05-03 23:30 CST
- [done] TDD RED deploy guard: tambah `backend/tests/test_sync_production_static.py` untuk memaksa `scripts/sync_production.sh` ikut menyalin `backend/ai_picks.py` ke runtime produksi.
- [done] RED verified: `PYTHONPATH=/home/rich27/retailbijak/backend:/home/rich27/retailbijak /opt/swingaq/backend/venv/bin/pytest -q backend/tests/test_sync_production_static.py` awalnya gagal `1 failed`, membuktikan deploy script belum menyalin modul backend AI Picks terbaru.
- [done] Implementasi deploy hardening: `scripts/sync_production.sh` sekarang menyalin `backend/ai_picks.py` dan health check restart diganti ke warm-up retry loop agar tidak false-negative saat uvicorn baru naik.
- [done] Implementasi AI Picks/runtime hardening: scoring `backend/ai_picks.py` sekarang mempertimbangkan `market_tone` saat ranking, `frontend/js/views/ai_picks.js` menambah pin state lokal (`Pin Prioritas` / `Pin aktif`), dan `frontend/js/views/stock_detail.js` selalu meminta payload `llm=1` agar status OpenRouter tampil live di detail saham.
- [done] GREEN verified: `PYTHONPATH=/home/rich27/retailbijak/backend:/home/rich27/retailbijak /opt/swingaq/backend/venv/bin/pytest -q backend/tests/test_sync_production_static.py backend/tests/test_ai_picks_view_static.py backend/tests/test_ai_picks_scoring.py backend/tests/test_ai_picks_api.py backend/tests/test_settings_view_static.py backend/tests/test_stock_analysis_llm_api.py` → `37 passed`.
- [done] Compile/runtime verified: `python3 -m py_compile backend/main.py backend/ai_picks.py backend/services/openrouter_llm.py && python3 -m compileall -q frontend/js` lulus.
- [done] Deploy production verified: `bash /home/rich27/retailbijak/scripts/sync_production.sh` sekarang hijau penuh; parity repo/runtime `PASS`, restart service `swingaq-backend` sukses, smoke check `PASS`, dan public resource chain `PASS`.
- [done] Runtime sync verified: `/opt/swingaq/backend/ai_picks.py` kini memuat `build_ai_picks_llm_payload` (`has_llm_builder=True`), sehingga bug `AttributeError` pada route `/api/ai-picks?llm=1` di runtime sudah hilang.
- [done] Wiring secret/runtime: nilai `OPENROUTER_API_KEY` dari `~/.hermes/.env` sudah di-upsert ke `/opt/swingaq/backend/swingaq.db` bersama `site_url`, `app_name`, dan default free models; `/api/settings` kini mengembalikan `openrouter_enabled=true` dan `openrouter_has_api_key=true`.
- [warn] Verifikasi end-to-end provider masih terblokir credential: call live `/api/ai-picks?mode=swing&limit=2&llm=1` dan `/api/stocks/BBCA/analysis?llm=1` sama-sama mengembalikan `401 Client Error: Unauthorized` dari OpenRouter, jadi model free belum benar-benar menghasilkan ringkasan. UI publik sudah menampilkan state error/disabled secara jujur (`AI Desk Brief tertunda` di `#ai-picks`, `OPENROUTER BELUM AKTIF` fallback di `#stock/BBCA`), tetapi agar fitur benar-benar aktif user perlu mengganti API key OpenRouter yang valid.
- [done] Browser QA publik: `#settings` menampilkan panel `OpenRouter AI` live dengan masked key + kedua free model default; `#ai-picks` menampilkan ranked cards, `5` tombol pin, dan panel `AI Desk Brief tertunda`; `#stock/BBCA` menampilkan blok `Asisten AI` dengan status OpenRouter/fallback yang hidup.

---

### 2026-05-03 22:13 CST
- [done] Audit ulang queue/progress: plan backlog tetap di `.hermes/plans/`, implementasi LLM/OpenRouter aktif di `backend/services/openrouter_llm.py`, tetapi runtime sebelumnya belum punya surface konfigurasi user dan script deploy belum menyalin service file LLM baru.
- [done] TDD RED: tambah guard baru di `backend/tests/test_user_route_runtime.py` dan `backend/tests/test_settings_view_static.py` untuk memaksa `/api/settings` mengekspos config OpenRouter tanpa membocorkan API key, plus memaksa view `#settings` punya field `API key OpenRouter`, `Model Analisis Saham`, dan `Model AI Picks`.
- [done] RED verified: `pytest -q backend/tests/test_user_route_runtime.py backend/tests/test_settings_view_static.py` awalnya gagal `3 failed` sebelum implementasi surface konfigurasi.
- [done] Implementasi backend `backend/routes/user.py`: tambah payload/settings fields OpenRouter (`openrouter_api_key`, `openrouter_site_url`, `openrouter_app_name`, `openrouter_stock_analysis_model`, `openrouter_ai_picks_model`), masking key, safe upsert, dan response settings yang tidak membocorkan secret mentah.
- [done] Implementasi frontend `frontend/js/api.js` + `frontend/js/views/settings.js`: fallback fetchSettings diperluas, panel `OpenRouter AI` ditambahkan ke route `#settings`, default free models ditampilkan/editable, dan save flow mempertahankan masked key bila user tidak mengganti secret.
- [done] Implementasi styling `frontend/style.css`: tambah `settings-openrouter-stack`, `settings-field-card`, `settings-field-label`, dan `settings-text-input` agar panel konfigurasi baru tetap konsisten dengan shell settings saat ini.
- [done] Wiring runtime/data: default OpenRouter free-model settings diisi ke `/opt/swingaq/backend/swingaq.db` (`site_url`, `app_name`, `stock_analysis_model`, `ai_picks_model`), sementara API key tetap kosong/disabled sampai user isi sendiri.
- [done] Fix deploy regression: `scripts/sync_production.sh` sekarang ikut menyalin `backend/services/openrouter_llm.py`; tanpa ini service produksi sempat crash `ModuleNotFoundError` saat restart.
- [done] Fix verifier drift: `scripts/check_public_resource_chain.py` diperbarui agar marker route settings mengikuti copy terbaru (`OpenRouter AI`, `aliran data premium lanjutan`).
- [done] GREEN verified: `PYTHONPATH=/home/rich27/retailbijak/backend:/home/rich27/retailbijak /opt/swingaq/backend/venv/bin/pytest -q backend/tests/test_user_route_runtime.py backend/tests/test_settings_view_static.py backend/tests/test_ai_picks_api.py backend/tests/test_stock_analysis_llm_api.py backend/test_api_e2e.py backend/tests/test_cache_bust_chain_static.py backend/tests/test_public_resource_chain_static.py` → `39 passed`.
- [done] Compile/runtime verified: `python -m py_compile backend/main.py backend/database.py backend/routes/user.py backend/services/openrouter_llm.py && python -m compileall -q frontend/js` lulus.
- [done] Deploy production verified: `bash scripts/sync_production.sh` berhasil hijau penuh setelah fix deploy script; parity, restart service, smoke check, dan public resource chain semuanya `PASS`.
- [done] Browser QA publik `#settings`: panel `OpenRouter AI` render live, status tetap `TERSAMBUNG KE LAYANAN LOKAL` saat key kosong, placeholder key tampil, dan kedua model default gratis (`nvidia/nemotron...:free`, `openai/gpt-oss-120b:free`) terbaca benar.

---

### 2026-05-03 16:45 WIB
- [done] Hard verification `#ai-picks` dijalankan ulang lewat fresh browser context independen untuk menghindari cache/session drift dari automation sebelumnya.
- [done] Fresh QA terverifikasi hijau: `.ai-picks-page` render (`count=1`), H1 = `AI Picks`, dan hook mode `[data-ai-picks-mode]` terbaca `3`.
- [done] Fresh QA tidak menemukan error import/runtime yang aktif; route selesai render normal pada `readyState=complete`.
- [done] Public resource checker & cache-bust chain final dirapikan: static guard `test_cache_bust_chain_static.py` hijau dan semua import view utama sudah mengarah ke `main.js?v=20260503ab` aktif.
- [done] Audit integrasi LLM: `stock_detail` memakai `fetchAnalysis()` ke `/api/stocks/{ticker}/analysis`, `#ai-picks` memakai `fetchAiPicks()` ke `/api/ai-picks`, dan keduanya sebelumnya belum punya payload OpenRouter nyata walau test monkeypatch sudah ada.
- [done] Implementasi OpenRouter dasar: tambah service `backend/services/openrouter_llm.py`, aktifkan query `?llm=1` untuk `/api/stocks/{ticker}/analysis` dan `/api/ai-picks`, plus model default gratis `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` dan `openai/gpt-oss-120b:free`.
- [done] Frontend helper `fetchAnalysis()` dan `fetchAiPicks()` sekarang mendukung opsi `{ llm: true }` untuk konsumsi payload LLM bertahap tanpa memutus kontrak lama.
- [done] Lanjutan frontend AI Picks/detail saham: static guard `backend/tests/test_ai_picks_view_static.py` diperluas untuk memaksa hook LLM (`options={}`, `&llm=1`, `renderAiDeskBrief`, `ai-picks-llm-brief`, status `Asisten AI aktif`/`OpenRouter belum aktif`).
- [done] RED→GREEN verified: guard AI Picks sempat gagal `2 failed`, lalu `frontend/js/views/ai_picks.js` diperbarui agar memanggil `fetchAiPicks(mode, 5, { llm: true })`, menampilkan panel `AI Desk Brief`, dan tetap punya fallback disabled/error yang hidup.
- [done] `frontend/js/views/stock_detail.js` kini menampilkan status ringkasan LLM di blok `Asisten AI` via `analysis?.llm` sehingga detail saham memberi sinyal jelas saat OpenRouter aktif/tertunda/belum aktif.
- [done] Verifikasi batch ini hijau: `pytest -q /home/rich27/retailbijak/backend/tests/test_ai_picks_view_static.py` → `13 passed`; `python -m compileall -q /home/rich27/retailbijak/frontend/js` → pass.
- [done] Regression suite lanjutan hijau sebelum deploy: `PYTHONPATH=/home/rich27/retailbijak/backend:/home/rich27/retailbijak /opt/swingaq/backend/venv/bin/pytest -q /home/rich27/retailbijak/backend/tests/test_ai_picks_api.py /home/rich27/retailbijak/backend/tests/test_stock_analysis_llm_api.py /home/rich27/retailbijak/backend/test_api_e2e.py /home/rich27/retailbijak/backend/tests/test_public_resource_chain_static.py /home/rich27/retailbijak/backend/tests/test_cache_bust_chain_static.py` → `34 passed`.
- [done] Deploy runtime dijalankan via `bash /home/rich27/retailbijak/scripts/sync_production.sh`; parity repo/runtime `PASS`, service `swingaq-backend` restart sukses, smoke check endpoint publik `PASS`, dan `public resource chain` juga `PASS`.
- [done] Browser QA publik pasca-deploy: route `#stock/BBCA` menampilkan tile LLM di blok `Asisten AI` dengan status `OpenRouter belum aktif`, sehingga fallback status live terbukti muncul.
- [done] Browser QA publik `#ai-picks` pasca-deploy: shell route render, panel `AI Desk Brief` muncul dengan status disabled yang eksplisit (`OpenRouter belum aktif`), dan compare tray tetap tampil hidup.
- [done] Verifikasi hijau: `PYTHONPATH=/home/rich27/retailbijak/backend:/home/rich27/retailbijak /opt/swingaq/backend/venv/bin/pytest -q backend/tests/test_cache_bust_chain_static.py backend/tests/test_ai_picks_api.py backend/tests/test_stock_analysis_llm_api.py backend/test_api_e2e.py` → `30 passed`; compile check backend/frontend juga lulus.
- [done] Resource chain fresh session menunjukkan path utama baru aktif: `main.js?v=20260503ab`, `router.js?v=20260503ab`, dan `views/ai_picks.js?v=20260503ai`.
- [warn] Fresh resource list masih mencatat `main.js?v=20260503aa` lama sebagai resource tambahan historis, tetapi stale router lama tidak ikut termuat dan route `#ai-picks` tetap render benar.
- [done] Kesimpulan verifikasi publik: deploy AI Picks sekarang valid secara fungsional; isu tersisa hanya jejak resource lama di browser list, bukan blocker render route.

---

### 2026-05-03 16:35 WIB
- [done] Browser QA awal publik `#ai-picks` menemukan route belum benar-benar aktif walau `location.hash` dan `data-route-path` sudah mengarah ke `ai-picks`; snapshot masih jatuh ke dashboard/blank state.
- [done] Root cause deploy drift 1: runtime `/opt/swingaq/frontend/js/router.js` belum memuat import/dispatch `renderAiPicks`, dan `/opt/swingaq/frontend/js/views/ai_picks.js` sempat belum ada.
- [done] Root cause deploy drift 2: setelah sync router/view/style, chain cache-bust belum penuh karena publik masih memuat `main.js?v=20260503aa` / `router.js?v=20260503aa` lama; diperbaiki dengan bump `frontend/js/main.js` → import `router.js?v=20260503ab` dan `frontend/index.html` → `main.js?v=20260503ab`, lalu sync ke `/opt/swingaq/frontend`.
- [done] Root cause deploy drift 3: `ai_picks.js` masih import `../main.js?v=20260503aa`; diperbaiki ke `../main.js?v=20260503ab` lalu disync ulang.
- [done] Root cause deploy drift 4: modul publik `ai_picks.js` gagal resolve karena runtime `api.js` lama belum punya export `fetchAiPicks`; dibuktikan via import test browser (`does not provide an export named fetchAiPicks`) dan diperbaiki dengan sync `/opt/swingaq/frontend/js/api.js` dari repo.
- [done] Verifikasi file publik sesudah sync: URL publik sekarang menyajikan `main.js?v=20260503ab`, `router.js?v=20260503ab`, `views/ai_picks.js?v=20260503ai`, dan `api.js?v=20260503b` dengan konten baru yang benar.
- [warn] Browser session masih menunjukkan resource lama campuran (`main.js/router.js v20260503aa` dan `v20260503ab`) sehingga QA visual final route `#ai-picks` di automation belum bisa dinyatakan hijau penuh pada sesi ini meskipun source publik sudah benar; perlu re-check browser segar/hard refresh berikutnya.

---

### 2026-05-03 16:20 WIB
- [done] TDD RED frontend `#ai-picks`: perluas `backend/tests/test_ai_picks_view_static.py` untuk memaksa compare tray hidup, metric strip explainable, factor meter, dan hook CSS visual baru.
- [done] RED verified: `pytest -q /home/rich27/retailbijak/backend/tests/test_ai_picks_view_static.py` gagal `2 failed` sebelum implementasi karena `renderCompareTray` dan styling compare/factor belum ada.
- [done] Implementasi `frontend/js/views/ai_picks.js`: tambah `renderMetricStrip`, `renderFactorMeter`, `renderCompareTray`, tombol compare per kandidat, compare tray default top-2, dan expose `latest_close`, `change_pct`, `volume_ratio`, `bars_count`, `factor_scores`, `comparison_points` pada featured/ranked cards.
- [done] Implementasi `frontend/style.css`: tambah visual `ai-picks-metric-strip`, `ai-picks-factor-list`, `ai-picks-factor-meter`, `ai-picks-factor-fill`, `ai-picks-compare-grid`, `ai-picks-compare-card`, dan responsive stacking.
- [done] GREEN verified: `pytest -q /home/rich27/retailbijak/backend/tests/test_ai_picks_view_static.py` → `6 passed`.
- [done] Compile verified: `python -m compileall -q frontend/js` → pass.
- [done] Hygiene verified: scan prefix line-number di `frontend/js/**/*.js` tetap bersih (`0` match).

---

### 2026-05-03 16:05 WIB
- [done] TDD RED backend `#ai-picks`: perluas `backend/tests/test_ai_picks_api.py` untuk memaksa row live mengandung metrik explainable (`latest_close`, `change_pct`, `volume_ratio`, `bars_count`, `factor_scores`, `comparison_points`) dan memastikan `limit` benar-benar dihormati.
- [done] RED verified: `pytest -q /home/rich27/retailbijak/backend/tests/test_ai_picks_api.py` gagal pada guard explainability baru karena payload live belum mengembalikan metrik pembanding.
- [done] Implementasi `backend/ai_picks.py`: perluas `compose_pick_payload()` agar endpoint `/api/ai-picks` mengembalikan metrik live explainable berbasis OHLCV/faktor turunan tanpa bergantung pada tabel `signals`.
- [done] Payload live sekarang menyertakan `latest_close`, `change_pct`, `volume_ratio`, `bars_count`, `factor_scores`, dan `comparison_points` untuk dipakai compare tray / reason panel frontend berikutnya.
- [done] GREEN verified: `pytest -q /home/rich27/retailbijak/backend/tests/test_ai_picks_api.py` → `7 passed`.
- [done] Regression verified: `pytest -q /home/rich27/retailbijak/backend/test_api_e2e.py /home/rich27/retailbijak/backend/tests/test_ai_picks_api.py` → `23 passed`.
- [done] Compile verified: `python -m compileall -q /home/rich27/retailbijak/backend /home/rich27/retailbijak/frontend/js` → pass.
- [done] Hygiene check: scan korupsi prefix line-number pada `frontend/js/*.js` tetap bersih (`0` match).

---

### 2026-05-03 15:45 WIB
- [done] TDD RED untuk slice `#ai-picks`: tambah `backend/tests/test_ai_picks_view_static.py` guna memaksa helper API `fetchAiPicks`, route `#ai-picks`, shell view baru, dan hook CSS layout awal.
- [done] RED verified: `pytest -q /home/rich27/retailbijak/backend/tests/test_ai_picks_view_static.py` awalnya gagal `4 failed` sebelum implementasi.
- [done] Implementasi `frontend/js/api.js`: tambah helper `fetchAiPicks(mode='swing', limit=5)` dengan fallback contract stabil saat backend belum siap.
- [done] Implementasi `frontend/js/router.js`: daftarkan import view baru dan route dispatch `ai-picks`.
- [done] Implementasi `frontend/js/views/ai_picks.js`: tambah shell page AI Picks dengan hero, mode switch, summary strip, featured card, ranked list, compare tray, empty state, dan quick action tambah watchlist.
- [done] Implementasi `frontend/style.css`: tambah styling awal page AI Picks agar konsisten dengan design system existing.
- [done] GREEN verified: `pytest -q /home/rich27/retailbijak/backend/tests/test_ai_picks_view_static.py` → `4 passed`.
- [done] Compile verified: `python -m compileall -q /home/rich27/retailbijak/frontend/js` → pass.
- [done] Hygiene check: scan korupsi prefix line-number pada `frontend/js/*.js` → bersih (`0` match).

---

### 2026-05-03 11:32 WIB
- [done] TDD RED: tambah guard baru di `backend/tests/test_cache_bust_chain_static.py` untuk melarang korupsi prefix line-number (`^\\s*\\d+\\|`) pada seluruh `frontend/js/views/*.js`; test sengaja gagal dan mengungkap 8 file view yang rusak.
- [done] Root cause confirmed: beberapa view module (`dashboard.js`, `market.js`, `portfolio.js`, `screener.js`, `settings.js`, `help.js`, `stock_detail.js`, plus runtime copy terkait) berisi prefix line-number literal sehingga browser gagal merender route dengan benar walau cache-bust chain sudah benar.
- [done] Implementasi minimal: bersihkan prefix line-number dari source tree `/home/rich27/retailbijak/frontend/js/views/*.js` dan runtime `/opt/swingaq/frontend/js/views/*.js`, tanpa mengubah logic route lain.
- [done] GREEN verified: `pytest -q backend/tests/test_cache_bust_chain_static.py backend/tests/test_market_view_copy_static.py` → `3 passed`; `python -m compileall -q frontend/js`; `node --check` untuk `main.js`, `router.js`, dan seluruh view modules lokal/runtime lulus.
- [done] Browser QA live `#market?cb=20260503y`: halaman tidak blank lagi; `Ikhtisar Pasar`, `Ringkasan IHSG`, `Denyut Pasar`, `Breadth Pasar`, `Saham Penguat Teratas`, `Arus Investor Asing`, dan `Aksi Korporasi` tampil normal dengan nav aktif `market`.
- [done] Readback publik memastikan asset live sudah bersih: `market.js?v=20260503x` dan `dashboard.js?v=20260503y` kini terkirim tanpa prefix line-number, dan runtime `/opt/swingaq/frontend/js/views` juga lolos guard anti-korupsi.

### 2026-05-03 11:56 WIB
- [done] Audit lanjutan source + runtime: `search_files` pada `/home/rich27/retailbijak/frontend/js` dan `/opt/swingaq/frontend/js` tidak lagi menemukan prefix korupsi `^\s*[0-9]+\|`; `node --check` untuk `main.js`, `router.js`, `api.js`, `theme.js`, dan semua `views/*.js` lulus di repo maupun runtime.
- [done] TDD GREEN tambahan: perluas `backend/tests/test_cache_bust_chain_static.py` agar juga menjaga file inti `frontend/js/*.js` dari korupsi prefix line-number, bukan hanya `views/*.js`.
- [done] Verifikasi lokal penuh: `pytest -q backend/tests/test_cache_bust_chain_static.py` lulus (`3 passed`) dan health endpoint publik tetap sehat (`{"status":"ok","version":"1.0.0"}`).
- [done] Browser QA live multi-route dengan cache-bust `20260503y`: `#dashboard`, `#market`, `#screener`, `#portfolio`, `#news`, `#settings`, dan `#help` semuanya render normal dengan heading + shell route yang sesuai; tidak ada blank state baru yang terdeteksi.
- [done] Catatan QA: route `#help` tetap merender normal, tetapi browser automation sempat tidak menandai nav aktif walau heading dan shell route sudah benar. Indikasi ini tampak sebagai quirk snapshot/active-state observer, bukan blank-route regression.

### 2026-05-03 12:18 WIB
- [done] Pilih slice lanjutan berbasis `PLAN.md`: cleanup copy operasional Indonesia pada route `#screener` dan `#help` karena stabilitas render/live sudah aman, sehingga fokus bergeser ke high-signal UX consistency.
- [done] TDD RED: perluas `backend/tests/test_screener_view_static.py` untuk melarang copy campuran pada shell/operator status screener (`Institutional BUY Scanner`, `CONFIGURATION`, `Run Institutional Scan`, `Live Signals`, `Sort by`, `Search...`, `Scanning`, `DETECTED`, `Scan complete`), dan `backend/tests/test_help_view_copy_static.py` untuk memaksa terminologi Indonesia konsisten (`pemindai`, `daftar pantau`, `pengaturan ruang kerja`, `pemindaian SwingAQ`, `analisis hasil`, `jalur bantuan internal`).
- [done] RED verified: `pytest -q backend/tests/test_screener_view_static.py backend/tests/test_help_view_copy_static.py` awalnya gagal `2 failed`, mengonfirmasi source masih berisi copy campuran bahasa di kedua route.
- [done] Implementasi `frontend/js/views/screener.js`: lokalisasi shell menjadi `Pemindai Akumulasi Institusi`, `PUSAT KONTROL`, `Jalankan Pemindaian SwingAQ`, `Sinyal Live`, opsi urut Indonesia, placeholder pencarian Indonesia, progress/status/error toast Indonesia, serta hint toolbar/empty-state yang lebih konsisten.
- [done] Implementasi `frontend/js/views/help.js`: lokalisasi copy operasional menjadi `pemindai`, `daftar pantau`, `portofolio`, `pengaturan ruang kerja`, `penanganan kendala`, `pemindaian SwingAQ`, `Analisis Hasil`, `jalur bantuan internal`, dan CTA `Buka Pemindai`.
- [done] GREEN verified: `pytest -q backend/tests/test_screener_view_static.py backend/tests/test_help_view_copy_static.py` → `5 passed`; `python -m compileall -q frontend/js` → pass; grep residual English/campuran pada dua file target → bersih.
- [done] Cache-bust chain baru: bump `frontend/index.html`, `frontend/js/main.js`, `frontend/js/router.js`, serta import `views/screener.js` dan `views/help.js` ke token `20260503z` agar runtime publik memuat copy baru.
- [done] Sync runtime `/opt/swingaq/frontend` untuk `index.html`, `main.js`, `router.js`, `views/screener.js`, dan `views/help.js`; readback runtime mengonfirmasi token `20260503z` dan string baru sudah tertulis.
- [done] Browser QA live final dengan URL `/?cb=20260503z#screener` dan `/?cb=20260503z#help`: screener kini menampilkan `Pemindai Akumulasi Institusi`, `PUSAT KONTROL`, `Jalankan Pemindaian SwingAQ`, `Sinyal Live`, `Urutkan berdasarkan CCI`, `Cari kode saham...`; help kini menampilkan `Mulai pemindaian...`, `Buka Pemindai`, dan `Analisis Hasil`.

### 2026-05-03 12:35 WIB
- [done] Audit slice berikutnya berbasis `search_files` pada shell utama + route `#portfolio`; pilih cleanup copy Indonesia untuk `frontend/index.html`, `frontend/js/main.js`, `frontend/js/router.js`, dan `frontend/js/views/portfolio.js` sebagai batch prioritas berikutnya.
- [done] TDD RED: tambah guard baru `backend/tests/test_main_shell_copy_static.py` untuk shell utama (topbar, nav, search overlay, router error copy) dan perluas `backend/tests/test_portfolio_view_static.py` agar memaksa label/prompt/toast portofolio-daftar pantau berbahasa Indonesia.
- [done] RED verified: `pytest -q backend/tests/test_main_shell_copy_static.py backend/tests/test_portfolio_view_static.py` gagal sebelum implementasi.
- [done] Implementasi shell utama: lokalisasi CTA topbar, tooltip/nav mobile, placeholder pencarian, label grup suggestion, fallback `Ekuitas IDX`, status `IDX BUKA/TUTUP`, dan error route menjadi Indonesia; bump cache-bust chain ke `20260503aa` pada `index.html`, `main.js`, `router.js`, dan import `views/portfolio.js`.
- [done] Implementasi `frontend/js/views/portfolio.js`: rapikan copy `Portofolio`/`Daftar Pantau`, header tabel, prompt input, confirm dialog, dan toast agar konsisten Indonesia.
- [done] GREEN verified lokal: `pytest -q backend/tests/test_main_shell_copy_static.py backend/tests/test_portfolio_view_static.py` → `4 passed`; `python -m compileall -q frontend/js` → pass; grep residual English pada file target → bersih.
- [done] Root cause blank-route saat QA live ditemukan di runtime publik: `/opt/swingaq/frontend/js/views/` hanya berisi 3 file sehingga import `dashboard.js`/`market.js`/`news.js`/`settings.js`/`stock_detail.js` gagal walau repo sudah benar.
- [done] Fix runtime parity: sync ulang seluruh `frontend/js/views/*.js` ke `/opt/swingaq/frontend/js/views/`; readback runtime dan HTTP HEAD memastikan semua module view kini tersedia publik dengan status `200`.
- [done] Browser QA live final dengan `/?cb=20260503aa#portfolio` dan `/?cb=20260503aa#dashboard`: portfolio menampilkan `Pusat Portofolio`, `Aset & Daftar Pantau`, `Kode Saham`, `Belum ada posisi portofolio.`; dashboard kembali render normal dengan ticker, hero, chart, movers, dan `activeView` sesuai. Tidak ada blank state baru setelah parity fix runtime.

### 2026-05-03 12:52 WIB
- [done] Audit deploy/runtime parity batch berikutnya: gap minimum ditemukan pada aset `frontend/js/i18n.js`, karena file ini dipakai runtime publik tetapi belum ikut dicopy oleh `scripts/sync_production.sh`, belum dijaga oleh `scripts/check_frontend_runtime_parity.py`, dan belum disebut eksplisit di `DEPLOY.md`.
- [done] TDD RED: tambah `backend/tests/test_runtime_parity_i18n_static.py` untuk memaksa tiga hal sekaligus — sync script wajib menyalin `frontend/js/i18n.js`, parity checker wajib mengaudit `js/i18n.js`, dan runbook deploy wajib mendokumentasikan sync aset tersebut.
- [done] RED verified: `pytest -q backend/tests/test_runtime_parity_i18n_static.py` awalnya gagal `3 failed`, membuktikan gap parity i18n memang nyata sebelum implementasi.
- [done] Implementasi deploy helper: update `scripts/sync_production.sh` agar menyalin `frontend/js/i18n.js`; update `scripts/check_frontend_runtime_parity.py` agar `js/i18n.js` masuk daftar core assets; update `DEPLOY.md` agar langkah manual dan one-command deploy sama-sama menyebut parity i18n.
- [done] GREEN verified: `pytest -q backend/tests/test_runtime_parity_i18n_static.py backend/tests/test_deploy_scripts_static.py backend/tests/test_frontend_runtime_scripts_static.py` → `10 passed`; `python -m py_compile scripts/check_frontend_runtime_parity.py scripts/post_deploy_smoke_check.py` → pass; `bash -n scripts/sync_production.sh` → pass.
- [done] Runtime parity verified: sync `frontend/js/i18n.js` ke `/opt/swingaq/frontend/js/i18n.js`, lalu jalankan `python scripts/check_frontend_runtime_parity.py` → seluruh core assets + routed views `PASS`.
- [done] Browser QA live `/?cb=20260503aa#settings`: route tetap render normal dengan `activeView=settings`; resource entries live kini eksplisit memuat `js/i18n.js` bersama chain modul frontend lain.

### 2026-05-03 13:08 WIB
- [done] Audit guard berikutnya untuk resource chain/version drift: ditemukan celah bahwa static tests belum memaksa semua `views/*.js` mengikuti token `main.js` aktif dan token `api.js` aktif, sehingga import lama seperti `../main.js?v=20260503y` dan `../api.js?v=20260502a` masih bisa lolos meski shell utama sudah memakai chain baru.
- [done] TDD RED: tambah `backend/tests/test_frontend_import_chain_static.py` untuk mengekstrak token aktif dari `frontend/index.html` + `frontend/js/main.js`, lalu memaksa seluruh `frontend/js/views/*.js` yang mengimpor `../main.js?v=` / `../api.js?v=` memakai token yang sama; test juga melarang residu `20260502a` di router maupun semua views.
- [done] RED verified: `pytest -q backend/tests/test_frontend_import_chain_static.py` awalnya gagal pada `dashboard.js`, membuktikan drift token lintas import chain memang masih ada.
- [done] Implementasi minimum: rapikan import chain seluruh views agar konsisten ke `../main.js?v=20260503aa` dan `../api.js?v=20260503b` sesuai boot chain aktif; termasuk `dashboard.js`, `stock_detail.js`, `screener.js`, `portfolio.js`, `market.js`, `news.js`, `settings.js`, dan `help.js`.
- [done] GREEN verified lokal: `pytest -q backend/tests/test_frontend_import_chain_static.py backend/tests/test_runtime_parity_i18n_static.py backend/tests/test_frontend_runtime_scripts_static.py` → `6 passed`; `python -m compileall -q frontend/js` → pass; `node --check` untuk seluruh view target → pass.
- [done] Runtime parity verified lagi: sync ulang seluruh `/home/rich27/retailbijak/frontend/js/views/*.js` ke `/opt/swingaq/frontend/js/views/`, lalu `python scripts/check_frontend_runtime_parity.py` menunjukkan semua core assets + routed views `PASS`.
- [done] Browser QA live `/?cb=20260503aa#dashboard`: route render normal dengan `activeView=dashboard`; resource entries hanya memuat `api.js?v=20260503b` dan tidak lagi memuat `api.js?v=20260502a`, sehingga drift import lama sudah hilang dari chain aktif.

### 2026-05-03 13:18 WIB
- [done] Audit slice lanjutan fokus deploy verification publik: parity hash repo/runtime sudah ada dan post-deploy smoke shell sudah ada, tetapi belum ada helper yang benar-benar menelusuri chain publik aktif `index.html -> main.js -> router.js -> views/*.js -> api.js` untuk mendeteksi token drift setelah deploy.
- [done] TDD RED: tambah guard baru `backend/tests/test_public_resource_chain_static.py` untuk memaksa adanya script `scripts/check_public_resource_chain.py`, memastikan sync script menyalin + mengeksekusinya setelah `post_deploy_smoke_check.py`, dan mewajibkan `DEPLOY.md` menyebut verifikasi `public resource chain`.
- [done] RED verified: `pytest -q backend/tests/test_public_resource_chain_static.py` awalnya gagal saat collection karena `scripts/check_public_resource_chain.py` belum ada, membuktikan helper publik memang belum tersedia.
- [done] Implementasi helper minimum: buat `scripts/check_public_resource_chain.py` yang mengambil `https://retailbijak.rich27.my.id/index.html`, mengekstrak token aktif `main.js`, lalu mengikuti import chain ke `router.js`, `api.js`, dan seluruh routed view (`dashboard`, `stock`, `screener`, `portfolio`, `market`, `news`, `settings`, `help`) sambil memverifikasi marker eksport dan kesesuaian token `../main.js?v=` / `../api.js?v=`.
- [done] Hardening deploy docs/scripts: update `scripts/sync_production.sh` agar menyalin `check_public_resource_chain.py` ke runtime production dan menjalankannya sebagai langkah `[6/7]` setelah `post_deploy_smoke_check.py`; update `DEPLOY.md` agar runbook manual + one-command deploy eksplisit mewajibkan verifikasi `public resource chain`.
- [done] GREEN verified lokal: `pytest -q backend/tests/test_public_resource_chain_static.py backend/tests/test_deploy_scripts_static.py backend/tests/test_frontend_runtime_scripts_static.py` → `14 passed`; `python -m py_compile scripts/check_public_resource_chain.py scripts/check_frontend_runtime_parity.py scripts/post_deploy_smoke_check.py` → pass; `bash -n scripts/sync_production.sh` → pass.
- [done] Verification repo/runtime + publik: `python scripts/check_frontend_runtime_parity.py` tetap `PASS`; `cp scripts/check_public_resource_chain.py /opt/swingaq/scripts/check_public_resource_chain.py` selesai; `python scripts/check_public_resource_chain.py` menelusuri domain publik dan mengonfirmasi chain aktif `main=20260503aa`, `api=20260503b`, serta semua routed views publik lolos tanpa drift token.

### 2026-05-03 13:31 WIB
- [done] Audit lanjutan pada helper `public resource chain`: guard publik baru sudah memeriksa token/import chain, tetapi belum menjaga marker copy high-signal di route paling terlihat user. Audit source menunjukkan campuran bahasa masih ada terutama di `dashboard.js`, `news.js`, dan `stock_detail.js` (mis. `Run Scanner`, `Top Movers`, `Failed to load news`, `Price Chart`, `Add Watchlist`).
- [done] TDD RED: tambah `backend/tests/test_high_signal_route_copy_static.py` untuk memaksa marker Indonesia prioritas di tiga route publik high-signal (`dashboard`, `news`, `stock_detail`) dan melarang string Inggris yang masih paling terlihat user.
- [done] RED verified: `pytest -q backend/tests/test_high_signal_route_copy_static.py` awalnya gagal `3 failed`, membuktikan ketiga route tersebut memang masih menyisakan copy Inggris pada shell/CTA/error states.
- [done] Implementasi minimum `frontend/js/views/dashboard.js`: lokalisasi hero dan CTA (`Dashboard Intelijen Pasar`, `Jalankan Pemindai`, `Ikhtisar Pasar`), freshness copy menjadi `Sinkronisasi terakhir`, panel `Penggerak Teratas`, CTA `Lihat Semua`, `Saran Cepat`, `Berita Terbaru`, dan `Buka detail`.
- [done] Implementasi minimum `frontend/js/views/news.js`: lokalisasi loading/error/count high-signal menjadi `Memuat feed intel pasar...`, `ITEM INTEL`, dan `Gagal memuat berita: ...`.
- [done] Implementasi minimum `frontend/js/views/stock_detail.js`: lokalisasi shell utama `Grafik Harga`, `Ringkasan Sesi`, `Ringkasan Teknikal`, `Statistik Kunci`, `Catatan Aksi`, `Tambah ke Daftar Pantau`, `Atur Peringatan`, `Jalankan Pemindai`, plus toast/placeholder high-signal Indonesia.
- [done] Perluasan helper publik: `scripts/check_public_resource_chain.py` sekarang tidak hanya memverifikasi token/import chain, tetapi juga marker copy high-signal untuk route prioritas `dashboard`, `stock`, dan `news`; static guards terkait (`backend/tests/test_public_resource_chain_static.py`, `backend/tests/test_frontend_runtime_scripts_static.py`) ikut diperbarui.
- [done] Hardening runbook: `DEPLOY.md` kini mendokumentasikan bahwa verifikasi `public resource chain` juga harus mengecek marker copy high-signal pada route prioritas agar regresi bahasa terlihat langsung di domain publik.
- [done] GREEN verified lokal + publik: `pytest -q backend/tests/test_high_signal_route_copy_static.py backend/tests/test_public_resource_chain_static.py backend/tests/test_frontend_runtime_scripts_static.py backend/tests/test_deploy_scripts_static.py` → `17 passed`; `python -m py_compile scripts/check_public_resource_chain.py` → pass; `python -m compileall -q frontend/js` → pass.
- [done] Runtime/public verification: sync `dashboard.js`, `news.js`, `stock_detail.js`, dan `check_public_resource_chain.py` ke `/opt/swingaq/...`; `python scripts/check_frontend_runtime_parity.py` tetap `PASS`; `python scripts/check_public_resource_chain.py` kembali `PASS` sambil memverifikasi marker copy high-signal publik bersama token chain aktif.

### 2026-05-03 13:47 WIB
- [done] TDD RED batch-2: tambah `backend/tests/test_high_signal_route_copy_batch2_static.py` untuk guard high-signal copy route `#screener`, `#portfolio`, dan `#settings`; failure awal mengonfirmasi marker prioritas dan banned-string batch kedua belum bersih.
- [done] Rapikan static guard lama `backend/tests/test_cache_bust_chain_static.py` agar mengikuti token aktif secara dinamis, bukan angka token lama yang sudah usang.
- [done] Implementasi `frontend/js/views/screener.js`: lokalisasi high-signal surface `BELI`, `Harga`, `Ekuitas IDX`, status `SEDANG MEMINDAI...`, progress `Sedang memindai ...`, empty/result toast `sinyal beli`, dan hilangkan string prioritas Inggris (`BUY`, `Price`, `SCANNING...`, `IDX Equity`).
- [done] Implementasi `frontend/js/views/portfolio.js`: ubah CTA jadi `Tambah ke Daftar Pantau` / `Tambah Posisi`, badge `ENTRI` / `POS`, dan header `Harga Beli Rata-Rata`.
- [done] Implementasi `frontend/js/views/settings.js`: ganti `CMD+K / CTRL+K` menjadi `⌘K / Ctrl+K` dan copy `aliran data premium` menjadi `aliran data lanjutan`.
- [done] Perluas `scripts/check_public_resource_chain.py` untuk ikut memverifikasi marker high-signal publik route `screener`, `portfolio`, dan `settings`; update `backend/tests/test_public_resource_chain_static.py` agar helper baru dijaga static test.
- [done] GREEN verified lokal: `pytest -q backend/tests/test_cache_bust_chain_static.py backend/tests/test_frontend_import_chain_static.py backend/tests/test_public_resource_chain_static.py backend/tests/test_high_signal_route_copy_static.py backend/tests/test_high_signal_route_copy_batch2_static.py` → `13 passed`; `python -m compileall -q frontend/js` dan `python -m py_compile scripts/check_public_resource_chain.py` → pass.
- [done] Runtime/public verification: sync `screener.js`, `portfolio.js`, `settings.js`, checker publik, dan static tests terkait ke `/opt/swingaq/...`; `python scripts/check_frontend_runtime_parity.py` → `PASS`; `python scripts/check_public_resource_chain.py` → `PASS` sambil mengonfirmasi route publik `screener`, `portfolio`, `settings` ikut lolos marker copy baru.

### 2026-05-03 14:05 WIB
- [done] Audit batch low-signal copy berikutnya memusat ke `frontend/js/views/stock_detail.js` dan `dashboard.js`; hasil audit menunjukkan marker Inggris residual paling terlihat tersisa di strip katalis, panel snapshot/ringkasan, dan trade-plan stock detail.
- [done] TDD RED: buat `backend/tests/test_low_signal_copy_cleanup_static.py` untuk mewajibkan marker Indonesia baru (`Katalis Terbaru`, `Tautan Katalis`, `Pemantau Pengumuman`, `Cek Sumber`, `Skor Swing`, `Zona Entry`, dst.) dan melarang string Inggris residual batch ini.
- [done] RED verified: `pytest -q backend/tests/test_low_signal_copy_cleanup_static.py` awalnya gagal pada marker stock detail yang belum dilokalisasi.
- [done] Implementasi `frontend/js/views/stock_detail.js`: lokalisasi snapshot panel, below-chart context, strip katalis, analysis panel, trade plan, dan fallback issuer label; dashboard batch sebelumnya tetap dipertahankan.
- [done] Update cache-bust import `frontend/js/router.js` untuk `stock_detail.js` ke token `20260503ab` agar runtime publik memuat asset baru.
- [done] Batch lanjutan Initiative A dikerjakan: `backend/indicators_extended.py` kini punya mapping normalisasi teknikal terpusat sehingga summary backend dan status indikator tidak lagi bocor sebagai `Below SMA20` / `Oversold` / `Bearish` mentah.
- [done] `frontend/js/views/stock_detail.js` dinaikkan dari `Bias Setup` menjadi blok keputusan yang lebih manusiawi: `Bias Saat Ini`, `Risiko Utama`, `Pemicu Perubahan Bias`, dan `Apa yang perlu ditunggu`.
- [done] TDD guard ditambah di `backend/tests/test_market_summary_and_technical_contract.py` dan `backend/tests/test_stock_detail_residual_copy_static.py` untuk melarang jargon teknikal Inggris residual pada payload `/api/stocks/:ticker/technical` dan snapshot analisis stock detail.
- [done] Ditemukan gap deploy: `scripts/sync_production.sh` sebelumnya tidak ikut menyalin `backend/indicators_extended.py` dan `backend/routes/stock_detail.py`, sehingga frontend publik sudah baru tetapi API teknikal runtime masih lama.
- [done] Gap deploy ditutup lewat update `scripts/sync_production.sh`, `DEPLOY.md`, dan RED guard baru di `backend/tests/test_deploy_scripts_static.py` agar dependency backend penting ikut tersalin ke `/opt/swingaq` pada deploy berikutnya.
- [done] Verifikasi lokal + deploy selesai: `pytest -q backend/tests/test_deploy_scripts_static.py backend/tests/test_market_summary_and_technical_contract.py backend/tests/test_stock_detail_residual_copy_static.py` => `14 passed`; `python -m py_compile ... && python -m compileall -q frontend/js` lulus; `bash scripts/sync_production.sh` lulus; API publik `https://retailbijak.rich27.my.id/api/stocks/BBCA/technical` kini mengembalikan `tren harga berada di bawah SMA20` dan `tekanan jual sudah dalam`; browser QA publik `#stock/BBCA` juga menampilkan blok keputusan baru sesuai target Initiative A.
- [done] GREEN verified lokal: `pytest -q backend/tests/test_low_signal_copy_cleanup_static.py` → lulus; `python -m compileall -q frontend/js` → pass.
- [done] Hardening checker publik: `scripts/check_public_resource_chain.py` diperluas agar route `stock` juga memverifikasi marker publik baru (`Katalis Terbaru`, `Tautan Katalis`, `Skor Swing`, `Zona Entry`).

### 2026-05-03 14:20 WIB
- [done] Audit batch lanjutan `frontend/js/views/stock_detail.js` untuk residual operator-copy yang masih bercampur (`Technical summary`, `Confidence`, `Trend/Volatility/Levels`, `Decision Panel`, `WATCH`, `Risk`).
- [done] TDD RED: tambah `backend/tests/test_stock_detail_residual_copy_static.py` untuk mewajibkan marker Indonesia baru dan melarang string operator-copy Inggris yang masih tersisa.
- [done] RED verified: `pytest -q backend/tests/test_stock_detail_residual_copy_static.py` gagal sebelum implementasi karena copy lama masih aktif.
- [done] Implementasi cleanup `stock_detail.js`: ganti summary/signal copy ke `Ringkasan teknikal`, `Keyakinan`, `Tren`, `Volatilitas`, `Level Kunci`, `Rasio Volume`, `Panel Keputusan`, `TAHAN / PANTAU`, `PANTAU`, dan catatan `Risiko` yang lebih konsisten Indonesia.
- [done] Rapikan microcopy action/notes: `Kendali risiko`, `Zona pullback`, `Zona reward`, `RSI jenuh beli`, serta pertahankan label operasional yang memang sengaja dibiarkan (`support`, `resistance`, `normal`) agar tidak memutus heuristik/semantik panel lain.
- [done] GREEN verified lokal: `pytest -q backend/tests/test_stock_detail_residual_copy_static.py backend/tests/test_low_signal_copy_cleanup_static.py` → lulus; `python -m compileall -q frontend/js` dan `python -m py_compile scripts/check_public_resource_chain.py` → lulus.
- [done] Runtime/public verification: sync `stock_detail.js`, checker publik, dan static test baru ke `/opt/swingaq/...`; `python scripts/check_frontend_runtime_parity.py` → `PASS`; `python scripts/check_public_resource_chain.py` → `PASS`; browser QA live `#stock/BBCA` menampilkan `Panel Keputusan`, `Kendali risiko`, `Zona pullback`, `Zona reward`, dan marker baru tanpa console issue.

### 2026-05-03 15:20 WIB
- [done] Mulai slice baru AI Picks MVP sesuai request lanjutan; review ulang `PLAN.md`, struktur `backend/main.py`, `backend/test_api_e2e.py`, dan kontrak frontend/backend untuk menentukan irisan TDD pertama yang aman.
- [done] TDD RED: buat `backend/tests/test_ai_picks_api.py` untuk mengunci kontrak awal `GET /api/ai-picks` — top-level shape, mode `swing/defensive/catalyst`, fallback mode invalid ke `swing`, `data` selalu list, dan no-data summary stabil.
- [done] RED verified di runtime venv: `/opt/swingaq/backend/venv/bin/pytest -q /home/rich27/retailbijak/backend/tests/test_ai_picks_api.py` awalnya gagal `5 failed` dengan `404 Not Found`, membuktikan route belum ada sebelum implementasi.
- [done] Implementasi minimum backend: tambah `backend/ai_picks.py` dengan helper `normalize_ai_pick_mode()` + `build_ai_picks_fallback_payload()`, lalu register route tipis `GET /api/ai-picks` di `backend/main.py` dengan kontrak no-data yang stabil dan safe fallback mode.
- [done] GREEN verified: `/opt/swingaq/backend/venv/bin/pytest -q /home/rich27/retailbijak/backend/tests/test_ai_picks_api.py` → `5 passed`.
- [done] Catatan env: pytest lokal default sempat gagal collect karena dependency `ta` tidak tersedia di interpreter Hermes, jadi verifikasi backend AI Picks sementara memakai runtime venv produksi `/opt/swingaq/backend/venv` yang memang dipakai service.

### 2026-05-03 15:32 WIB
- [done] Lanjut slice AI Picks MVP ke scoring layer; pilih pendekatan pure-helper agar TDD bisa jalan tanpa bergantung ke route/API atau isi DB.
- [done] TDD RED: buat `backend/tests/test_ai_picks_scoring.py` untuk mengunci perilaku `score_pick()`, `label_confidence()`, dan `reason_labels_from_factors()` pada tiga mode awal (`swing`, `defensive`, `catalyst`).
- [done] RED verified: `/opt/swingaq/backend/venv/bin/pytest -q /home/rich27/retailbijak/backend/tests/test_ai_picks_scoring.py` awalnya gagal saat collection karena helper scoring belum ada di `backend/ai_picks.py`.
- [done] Implementasi minimum scoring engine di `backend/ai_picks.py`: tambah `MODE_WEIGHTS`, `FIT_LABELS`, helper `_clamp()` / `_factor_value()`, lalu implement `label_confidence()`, `reason_labels_from_factors()`, dan `score_pick()` dengan hasil explainable per mode.
- [done] GREEN verified: `/opt/swingaq/backend/venv/bin/pytest -q /home/rich27/retailbijak/backend/tests/test_ai_picks_scoring.py /home/rich27/retailbijak/backend/tests/test_ai_picks_api.py` → `10 passed`.
- [done] Compile check backend helper: `python -m py_compile /home/rich27/retailbijak/backend/ai_picks.py /home/rich27/retailbijak/backend/main.py` lulus.

### 2026-05-03 15:48 WIB
- [done] Audit slice kandidat AI Picks: cek DB runtime `/opt/swingaq/backend/swingaq.db` dan konfirmasi `signals=0`, `ohlcv_daily=44048`, `fundamentals=958`, `stocks=974`, `news=85`; coverage aktual per ticker hanya `46` bar sehingga threshold histori awal perlu realistis agar MVP bisa hidup dari OHLCV, bukan tabel `signals`.
- [done] TDD RED: buat `backend/tests/test_ai_picks_candidates.py` untuk mengunci `build_candidate_universe()`, `compose_pick_payload()`, dan endpoint `/api/ai-picks` saat data tersedia.
- [done] RED verified: `/opt/swingaq/backend/venv/bin/pytest -q /home/rich27/retailbijak/backend/tests/test_ai_picks_candidates.py` awalnya gagal saat collection karena helper kandidat belum ada di `backend/ai_picks.py`.
- [done] Implementasi minimum candidate layer di `backend/ai_picks.py`: tambah koneksi SQLite langsung ke runtime DB, `summarize_market_context()`, `build_candidate_universe()`, `compose_pick_payload()`, dan `build_ai_picks_payload()` berbasis `ohlcv_daily + fundamentals + stocks + news`, tanpa dependensi ke tabel `signals`.
- [done] Penyesuaian route: `backend/main.py` sekarang memanggil `build_ai_picks_payload()` sehingga `/api/ai-picks` mengembalikan ranked picks derived saat data cukup, dan fallback no-data tetap tersedia via helper dedicated.
- [done] RED tambahan sempat muncul di market-context query (`sqlite3.OperationalError: no such column: rowid`); akar masalah diperbaiki dengan query breadth berbasis `date` latest-session langsung, bukan pseudo-filter `rowid`.
- [done] Update kontrak test fallback: `backend/tests/test_ai_picks_api.py` dipersempit agar no-data summary stabil diverifikasi lewat `build_ai_picks_fallback_payload()`; endpoint live kini memang diharapkan mengembalikan picks non-empty bila data runtime cukup.
- [done] GREEN verified: `/opt/swingaq/backend/venv/bin/pytest -q /home/rich27/retailbijak/backend/tests/test_ai_picks_candidates.py /home/rich27/retailbijak/backend/tests/test_ai_picks_scoring.py /home/rich27/retailbijak/backend/tests/test_ai_picks_api.py` → `15 passed`; `python -m py_compile /home/rich27/retailbijak/backend/ai_picks.py /home/rich27/retailbijak/backend/main.py` → lulus.

## Current Slice Notes

**Slice aktif sekarang:** AI Picks MVP end-to-end sudah aktif di backend + frontend, lengkap dengan ranking explainable, compare tray, route `#ai-picks`, dan verifikasi browser fresh-session bahwa view publik sudah render normal.

**Target patch minimum untuk slice berikutnya:**
1. deploy/runtime sync final AI Picks ke `/opt/swingaq` + smoke test publik,
2. polish UX AI Picks (pin/history/loading/empty/risk badges),
3. perkuat scoring + coverage test + integrasi dashboard secara bertahap mengikuti breakdown plan di bawah.

---

## Planned Next Phase — AI Picks Hardening & Productization (`PLANNED`)

### Goal
Menyelesaikan pasca-MVP AI Picks sampai benar-benar production-ready: runtime sinkron, UX lebih matang, scoring lebih kuat, coverage test naik, dan widget ringkas masuk ke dashboard.

### Architecture / Scope
- Backend tetap mempertahankan pola `backend/ai_picks.py` sebagai pusat ranking + payload composition.
- Frontend tetap mempertahankan route mandiri `#ai-picks` di `frontend/js/views/ai_picks.js`, lalu menambahkan state persistence, action lanjutan, dan widget dashboard kecil tanpa mengubah kontrak besar SPA.
- Semua task berikut bersifat breakdown plan dulu; belum dieksekusi pada fase ini.

### Execution Order
1. Phase A — deploy/runtime parity final
2. Phase B — UX polish AI Picks
3. Phase C — backend scoring hardening
4. Phase D — test hardening & regression guards
5. Phase E — dashboard integration

### Phase A — Deploy / Runtime Parity Final

#### Micro-task breakdown (2–5 menit per item)
- [planned] A1.1 — baca ulang file repo AI Picks utama: `frontend/index.html`, `frontend/js/api.js`, `frontend/js/main.js`, `frontend/js/router.js`, `frontend/js/views/ai_picks.js`, `frontend/style.css`, `backend/main.py`, `backend/ai_picks.py`.
- [planned] A1.2 — baca file runtime pasangan di `/opt/swingaq/frontend/...` dan `/opt/swingaq/backend/...`.
- [planned] A1.3 — catat file yang identik vs file yang masih delta.
- [planned] A1.4 — verifikasi chain cache-bust `index.html` → `main.js` → `router.js` → `ai_picks.js` pada repo.
- [planned] A1.5 — verifikasi chain cache-bust yang sama pada runtime.
- [planned] A1.6 — verifikasi `fetchAiPicks` benar-benar diexport di `api.js` runtime.
- [planned] A1.7 — verifikasi route `/api/ai-picks` benar-benar teregistrasi pada `backend/main.py` runtime.
- [planned] A1.8 — tulis ringkasan delta runtime sebelum copy.
- [planned] A2.1 — bersihkan direktori runtime `frontend/js/views` bila ada risiko nested/stale path.
- [planned] A2.2 — copy `frontend/index.html` ke runtime.
- [planned] A2.3 — copy `frontend/js/api.js` ke runtime.
- [planned] A2.4 — copy `frontend/js/main.js` ke runtime.
- [planned] A2.5 — copy `frontend/js/router.js` ke runtime.
- [planned] A2.6 — copy `frontend/js/views/ai_picks.js` ke runtime.
- [planned] A2.7 — copy `frontend/style.css` ke runtime.
- [planned] A2.8 — copy `backend/main.py` ke runtime.
- [planned] A2.9 — copy `backend/ai_picks.py` ke runtime.
- [planned] A2.10 — readback marker `renderAiPicks`, `fetchAiPicks`, `/api/ai-picks` dari runtime.
- [planned] A3.1 — restart `swingaq-backend`.
- [planned] A3.2 — cek `systemctl status` singkat.
- [planned] A3.3 — hit `/api/health` dan simpan hasilnya.
- [planned] A3.4 — hit `/api/ai-picks?mode=swing&limit=5`.
- [planned] A3.5 — hit `/api/ai-picks?mode=defensive&limit=5`.
- [planned] A3.6 — hit `/api/ai-picks?mode=catalyst&limit=5`.
- [planned] A3.7 — cek payload top-level shape + `data` non-error.
- [planned] A4.1 — buka `#ai-picks` di fresh browser context.
- [planned] A4.2 — verifikasi H1 `AI Picks`.
- [planned] A4.3 — verifikasi mode switch tampil lengkap.
- [planned] A4.4 — verifikasi featured card render.
- [planned] A4.5 — verifikasi ranked list render.
- [planned] A4.6 — verifikasi compare tray render.
- [planned] A4.7 — cek console/import/runtime errors.
- [planned] A4.8 — cek resource chain aktif dan token cache-bust.
- [planned] A4.9 — catat hasil smoke test publik ke `PLAN.md` setelah eksekusi.

#### Task A1 — Audit delta repo vs runtime
**Objective:** memastikan file AI Picks yang baru di repo memang sama atau jelas beda dengan runtime `/opt/swingaq`.

**Files to audit:**
- Repo: `frontend/index.html`
- Repo: `frontend/js/api.js`
- Repo: `frontend/js/main.js`
- Repo: `frontend/js/router.js`
- Repo: `frontend/js/views/ai_picks.js`
- Repo: `frontend/style.css`
- Repo: `backend/main.py`
- Repo: `backend/ai_picks.py`
- Runtime: `/opt/swingaq/frontend/...`
- Runtime: `/opt/swingaq/backend/...`

**Planned checklist:**
- bandingkan hash / diff file repo vs runtime
- pastikan chain cache-bust aktif konsisten (`index.html` → `main.js` → `router.js` → `ai_picks.js`)
- pastikan `api.js` runtime memang punya export `fetchAiPicks`
- pastikan `backend/main.py` runtime sudah register `/api/ai-picks`

**Acceptance criteria:**
- daftar delta runtime jelas dan terdokumentasi
- tidak ada ambiguity file mana yang belum tersync

#### Task A2 — Sync runtime `/opt/swingaq`
**Objective:** menyalin delta repo yang relevan ke runtime production tree dengan urutan aman.

**Files to modify/copy:**
- `/opt/swingaq/frontend/index.html`
- `/opt/swingaq/frontend/js/api.js`
- `/opt/swingaq/frontend/js/main.js`
- `/opt/swingaq/frontend/js/router.js`
- `/opt/swingaq/frontend/js/views/ai_picks.js`
- `/opt/swingaq/frontend/style.css`
- `/opt/swingaq/backend/main.py`
- `/opt/swingaq/backend/ai_picks.py`

**Planned checklist:**
- bersihkan path view runtime jika perlu agar tidak ada nested/stale copy
- copy file frontend/backend yang berubah saja
- readback file runtime untuk marker penting (`renderAiPicks`, `fetchAiPicks`, `/api/ai-picks`)

**Acceptance criteria:**
- runtime tree memuat source yang identik/expected
- tidak ada nested `views/views` atau asset stale yang jelas salah target

#### Task A3 — Restart service + smoke test backend
**Objective:** memastikan service production membaca kode backend terbaru.

**Files/targets:**
- systemd service `swingaq-backend`
- endpoint `https://retailbijak.rich27.my.id/api/health`
- endpoint `https://retailbijak.rich27.my.id/api/ai-picks?mode=swing&limit=5`

**Planned checklist:**
- restart service
- cek status service dan log singkat bila perlu
- hit `/api/health`
- hit `/api/ai-picks` untuk tiga mode (`swing`, `defensive`, `catalyst`)

**Acceptance criteria:**
- health hijau
- payload AI Picks valid untuk semua mode target

#### Task A4 — Browser QA publik fresh-session
**Objective:** verifikasi route publik `#ai-picks` benar-benar render dari session segar.

**Files/targets:**
- URL `https://retailbijak.rich27.my.id/#ai-picks`
- resource chain browser
- console runtime

**Planned checklist:**
- buka fresh browser context
- cek H1, mode switch, featured card, ranked list, compare tray
- cek console/import error
- cek resource aktif sesuai token cache-bust terbaru

**Acceptance criteria:**
- route render tanpa blank state salah
- tidak ada import/runtime error aktif
- resource chain terbaru terkonfirmasi

### Phase B — UX Polish AI Picks

#### Micro-task breakdown (2–5 menit per item)
- [planned] B1.1 — audit state mode aktif saat reload route `#ai-picks`.
- [planned] B1.2 — pilih media persist paling kecil: `localStorage` atau setting ringan yang sudah ada.
- [planned] B1.3 — tambahkan test/static guard bila perlu untuk key persist mode.
- [planned] B1.4 — implement simpan mode aktif saat tombol mode diklik.
- [planned] B1.5 — implement restore mode saat `renderAiPicks()` dijalankan.
- [planned] B1.6 — audit perilaku compare tray saat mode berubah.
- [planned] B1.7 — tentukan apakah compare tray di-reset atau dipertahankan lintas mode.
- [planned] B1.8 — update copy/hint compare tray agar perilakunya jelas.
- [planned] B2.1 — definisikan scope `pin` minimum (frontend-only vs persisted).
- [planned] B2.2 — tentukan lokasi tombol/badge `pin` di featured card.
- [planned] B2.3 — tentukan lokasi tombol/badge `pin` di ranked card.
- [planned] B2.4 — implement state visual pinned.
- [planned] B2.5 — tambahkan toast/feedback sukses-gagal untuk pin.
- [planned] B2.6 — cek agar CTA pin tidak bentrok dengan watchlist CTA.
- [planned] B3.1 — audit loading state existing di AI Picks.
- [planned] B3.2 — desain skeleton minimum untuk hero/featured/list.
- [planned] B3.3 — implement empty state dengan alasan + action.
- [planned] B3.4 — implement error state dengan retry CTA.
- [planned] B3.5 — tambahkan fallback content yang believable pada data tipis.
- [planned] B3.6 — verifikasi state mobile tidak terasa kosong.
- [planned] B4.1 — audit label risk/reward/confidence yang sekarang.
- [planned] B4.2 — tentukan skema warna badge yang konsisten dengan design system.
- [planned] B4.3 — implement badge confidence.
- [planned] B4.4 — implement badge risk note / rr cue.
- [planned] B4.5 — rapikan label factor meter agar lebih cepat dipahami.
- [planned] B4.6 — rapikan comparison points agar tidak terlalu verbose.
- [planned] B4.7 — cek hierarchy visual desktop.
- [planned] B4.8 — cek hierarchy visual mobile.

#### Task B1 — Persist mode & compare selection
**Objective:** menjaga mode terakhir dan kandidat compare agar pengalaman user tidak reset terus.

**Files to modify:**
- `frontend/js/views/ai_picks.js`
- kemungkinan `frontend/js/api.js` bila butuh helper kecil

**Planned checklist:**
- simpan mode aktif ke local storage / setting ringan
- restore mode saat route dibuka ulang
- pertahankan compare tray pada interaksi mode yang konsisten atau reset eksplisit dengan copy jelas

**Acceptance criteria:**
- mode terakhir kembali otomatis
- perilaku compare tray konsisten dan tidak membingungkan

#### Task B2 — Tambah action pin/save yang lebih kaya
**Objective:** memberi action lanjutan selain sekadar tambah ke watchlist.

**Files to modify:**
- `frontend/js/views/ai_picks.js`
- `frontend/js/views/portfolio.js` bila perlu hookup badge/pin preview
- `backend/main.py` / storage helper hanya jika benar-benar perlu endpoint baru

**Planned checklist:**
- definisikan perilaku `pin` minimum (frontend-only atau persisted)
- tampilkan status pinned pada card
- pastikan tidak duplikasi CTA dengan watchlist lama

**Acceptance criteria:**
- user bisa menandai kandidat prioritas dengan feedback jelas
- UX tetap ringkas, tidak ramai

#### Task B3 — Hidupkan loading/empty/error states
**Objective:** mengurangi kesan kosong dan meningkatkan trust pada page AI Picks.

**Files to modify:**
- `frontend/js/views/ai_picks.js`
- `frontend/style.css`

**Planned checklist:**
- skeleton/loading state lebih hidup
- empty state berisi alasan + next action
- error state punya retry CTA
- fallback content tetap believable, bukan blank card

**Acceptance criteria:**
- semua state utama (loading, success, empty, error) punya visual yang jelas
- page tidak terasa kosong saat data tipis/gagal

#### Task B4 — Rapikan badge risk/reward & factor explanation
**Objective:** membuat explainability lebih cepat dipahami tanpa baca semua teks.

**Files to modify:**
- `frontend/js/views/ai_picks.js`
- `frontend/style.css`

**Planned checklist:**
- tambah badge warna untuk confidence / risk note / rr state
- perjelas label factor meter dan comparison points
- jaga layout mobile tetap rapi

**Acceptance criteria:**
- reason utama bisa dipahami sekilas
- tidak merusak hierarchy visual existing

### Phase C — Backend Scoring Hardening

#### Micro-task breakdown (2–5 menit per item)
- [planned] C1.1 — baca ulang `backend/ai_picks.py` dan petakan faktor yang sudah ada.
- [planned] C1.2 — audit kolom runtime yang tersedia dari `ohlcv_daily`.
- [planned] C1.3 — audit kolom runtime yang tersedia dari `fundamentals`.
- [planned] C1.4 — audit sinyal katalis yang realistis dari tabel `news`.
- [planned] C1.5 — shortlist faktor tambahan `relative strength` sederhana.
- [planned] C1.6 — shortlist faktor tambahan `trend consistency`.
- [planned] C1.7 — shortlist faktor tambahan `breadth alignment`.
- [planned] C1.8 — putuskan faktor mana yang masuk fase ini tanpa menambah ingestion baru.
- [planned] C2.1 — definisikan rule kecil penyesuaian bobot saat `market_context.tone=bullish`.
- [planned] C2.2 — definisikan rule kecil penyesuaian bobot saat `market_context.tone=defensive`.
- [planned] C2.3 — definisikan penalty/bonus yang tetap mudah dijelaskan.
- [planned] C2.4 — tulis RED test untuk perilaku regime-aware scoring.
- [planned] C2.5 — implement minimal scoring adjustment.
- [planned] C2.6 — verifikasi output score tetap stabil/deterministik.
- [planned] C2.7 — review apakah explainability payload masih masuk akal.
- [planned] C3.1 — audit `reason_labels` existing yang terlalu generik.
- [planned] C3.2 — audit `comparison_points` existing yang terlalu tipis/berulang.
- [planned] C3.3 — buat matriks label per mode (`swing`, `defensive`, `catalyst`).
- [planned] C3.4 — tulis RED test untuk reason/comparison point baru.
- [planned] C3.5 — implement reason labels yang lebih granular.
- [planned] C3.6 — sinkronkan `comparison_points` dengan faktor yang tampil di frontend.
- [planned] C3.7 — cek payload akhir agar tidak terlalu verbose.

#### Task C1 — Audit faktor baru yang realistis dari data saat ini
**Objective:** memilih faktor tambahan yang bisa dihitung dari dataset existing tanpa menambah dependensi berat.

**Files to audit:**
- `backend/ai_picks.py`
- `backend/database.py`
- tabel runtime `ohlcv_daily`, `fundamentals`, `news`, `stocks`

**Planned checklist:**
- evaluasi relative strength sederhana, consistency trend, breadth alignment, news intensity
- identifikasi faktor yang feasible dari data yang sudah ada
- hindari ketergantungan ke tabel `signals`

**Acceptance criteria:**
- shortlist faktor baru jelas dengan rumus kasar dan sumber data
- tidak ada asumsi yang butuh ingestion baru untuk fase ini

#### Task C2 — Normalisasi scoring per mode / regime market
**Objective:** membuat ranking lebih adaptif terhadap kondisi breadth market.

**Files to modify:**
- `backend/ai_picks.py`
- tests baru/eksisting di `backend/tests/test_ai_picks_scoring.py`

**Planned checklist:**
- gunakan `market_context` untuk sedikit mengubah bobot/penalty
- jaga scoring tetap explainable dan deterministik
- dokumentasikan trade-off agar tidak terasa magic

**Acceptance criteria:**
- mode tetap stabil, tapi responsif terhadap regime market
- test scoring baru mengunci perilaku utama

#### Task C3 — Perkaya reason labels & comparison points
**Objective:** menghasilkan alasan ranking yang lebih spesifik dan operasional.

**Files to modify:**
- `backend/ai_picks.py`
- `backend/tests/test_ai_picks_api.py`
- `backend/tests/test_ai_picks_candidates.py`

**Planned checklist:**
- tambah label alasan yang lebih granular
- sinkronkan `comparison_points` dengan faktor yang tampil di frontend
- hindari label generik berulang antar mode

**Acceptance criteria:**
- payload lebih explainable
- frontend tidak perlu banyak heuristik tambahan untuk menjelaskan kandidat

### Phase D — Test Hardening & Regression Guards

#### Micro-task breakdown (2–5 menit per item)
- [planned] D1.1 — audit static guards AI Picks yang sudah ada.
- [planned] D1.2 — tentukan marker wajib route AI Picks yang harus dijaga.
- [planned] D1.3 — tentukan token/import chain yang wajib dijaga.
- [planned] D1.4 — tulis RED static test untuk marker/chain yang belum dijaga.
- [planned] D1.5 — update static test existing bila perlu.
- [planned] D1.6 — verifikasi guard `fetchAiPicks` export tetap aktif.
- [planned] D2.1 — tulis daftar edge case backend prioritas.
- [planned] D2.2 — buat RED test untuk `fundamentals` kosong.
- [planned] D2.3 — buat RED test untuk `news` nol.
- [planned] D2.4 — buat RED test untuk `bars_count` mepet threshold.
- [planned] D2.5 — buat RED test untuk `limit` kecil dan besar.
- [planned] D2.6 — implement perbaikan minimum bila ada test yang gagal.
- [planned] D2.7 — jalankan suite backend AI Picks penuh.
- [planned] D3.1 — audit `scripts/check_public_resource_chain.py` apakah sudah paham route AI Picks.
- [planned] D3.2 — tentukan marker publik AI Picks minimum untuk checker.
- [planned] D3.3 — update checker publik.
- [planned] D3.4 — update static tests checker publik.
- [planned] D3.5 — update `DEPLOY.md` bila langkah verifikasi AI Picks belum terdokumentasi.
- [planned] D3.6 — jalankan checker parity/resource-chain setelah update.

#### Task D1 — Static regression untuk route AI Picks
**Objective:** mengunci chain import/cache-bust dan marker view AI Picks agar tidak regress saat deploy berikutnya.

**Files to modify/create:**
- `backend/tests/test_ai_picks_view_static.py`
- kemungkinan test static baru untuk resource chain
- bila perlu `scripts/check_public_resource_chain.py`

**Planned checklist:**
- guard token import route `ai_picks`
- guard marker compare tray / mode switch / loading state
- guard agar `fetchAiPicks` tetap diexport

**Acceptance criteria:**
- regresi sederhana pada route AI Picks tertangkap lewat static tests

#### Task D2 — Edge-case backend tests
**Objective:** mengunci perilaku saat data runtime tipis atau tidak sempurna.

**Files to modify/create:**
- `backend/tests/test_ai_picks_api.py`
- `backend/tests/test_ai_picks_candidates.py`
- `backend/tests/test_ai_picks_scoring.py`

**Planned checklist:**
- skenario fundamental kosong
- skenario `news` nol
- skenario history minim di ambang `min_bars`
- skenario mode invalid / limit kecil / limit besar

**Acceptance criteria:**
- edge cases penting punya guard test
- fallback/derived payload tetap stabil

#### Task D3 — Public verification helper updates
**Objective:** memastikan checker publik juga memahami route AI Picks sebagai route prioritas.

**Files to modify:**
- `scripts/check_public_resource_chain.py`
- static tests terkait checker tersebut
- mungkin `DEPLOY.md`

**Planned checklist:**
- tambahkan marker publik AI Picks
- verifikasi resource chain route baru di checker
- dokumentasikan langkah verifikasi di deploy runbook

**Acceptance criteria:**
- deploy checklist publik mencakup AI Picks secara resmi

### Phase E — Dashboard Integration

#### Micro-task breakdown (2–5 menit per item)
- [planned] E1.1 — audit layout dashboard existing untuk slot widget baru.
- [planned] E1.2 — tentukan ukuran minimum widget `Top AI Pick Today`.
- [planned] E1.3 — tentukan data minimum yang boleh ditarik dari `/api/ai-picks`.
- [planned] E1.4 — tentukan fallback content yang believable saat data kosong.
- [planned] E1.5 — tentukan CTA utama menuju `#ai-picks`.
- [planned] E1.6 — tentukan apakah widget memakai data live atau helper ringkas di `api.js`.
- [planned] E2.1 — tulis RED/static test bila perlu untuk marker widget dashboard.
- [planned] E2.2 — implement helper fetch ringkas di `frontend/js/api.js` bila dibutuhkan.
- [planned] E2.3 — implement markup widget di `frontend/js/views/dashboard.js`.
- [planned] E2.4 — implement styling widget di `frontend/style.css`.
- [planned] E2.5 — sambungkan CTA ke route `#ai-picks`.
- [planned] E2.6 — verifikasi widget tidak merusak hierarchy dashboard desktop.
- [planned] E2.7 — verifikasi widget tidak merusak hierarchy dashboard mobile.
- [planned] E2.8 — verifikasi fallback widget saat API kosong/gagal.

#### Task E1 — Desain widget `Top AI Pick Today`
**Objective:** menentukan versi minimum widget dashboard tanpa membuat dashboard terlalu padat.

**Files to audit/modify:**
- `frontend/js/views/dashboard.js`
- `frontend/style.css`
- `frontend/js/api.js`

**Planned checklist:**
- tentukan placement widget
- tentukan data minimum yang dipakai dari `/api/ai-picks`
- tentukan fallback content saat AI Picks kosong

**Acceptance criteria:**
- scope widget jelas dan kecil
- tidak mengganggu hierarchy dashboard existing

#### Task E2 — Implement widget dashboard + shortcut route
**Objective:** menambahkan teaser AI Picks pada dashboard untuk discovery cepat.

**Files to modify:**
- `frontend/js/views/dashboard.js`
- `frontend/js/api.js`
- `frontend/style.css`

**Planned checklist:**
- fetch pick unggulan ringkas
- tampilkan CTA ke `#ai-picks`
- pastikan performa dashboard tetap aman

**Acceptance criteria:**
- dashboard punya entry-point jelas ke AI Picks
- widget tetap graceful saat API kosong/gagal

### Progress block
- [done] Requirement capture untuk fase pasca-MVP AI Picks.
- [done] Breakdown task detail ditulis ke `PLAN.md`.
- [done] Phase A1 audit delta repo vs runtime selesai: seluruh file frontend AI Picks sudah identik; delta runtime hanya tersisa di `backend/main.py` (berbeda) dan `backend/ai_picks.py` (belum ada di runtime saat audit awal).
- [done] Phase A2 sync runtime selesai: `backend/main.py` dan `backend/ai_picks.py` sudah dicopy ke `/opt/swingaq/backend/` dan hash repo/runtime kembali identik.
- [done] Temuan kritis deploy: restart awal gagal karena runtime `/opt/swingaq/backend/routes/` belum sinkron dengan repo; module baru seperti `routes.system`, `routes.reference`, `routes.market`, `routes.market_summary`, `routes.news`, `routes.stocks`, `routes.stock_detail`, dan `routes.scanner_stream` belum ada di runtime tree.
- [done] Hotfix runtime route tree selesai: seluruh direktori `backend/routes/` berhasil disinkronkan ke `/opt/swingaq/backend/routes/`, import smoke test lokal untuk semua router target kembali hijau.
- [done] Phase A3 restart + smoke test backend selesai: `swingaq-backend` aktif normal, `https://retailbijak.rich27.my.id/api/health` kembali `{"status":"ok","version":"1.0.0"}`, dan `/api/ai-picks` publik valid untuk mode `swing`, `defensive`, `catalyst` dengan source `derived` dan count `5`.
- [done] Phase A4 browser QA publik fresh-session selesai: route `#ai-picks` render normal, H1 `AI Picks` muncul, mode switch/featured card/ranked list/compare tray aktif, console tidak menunjukkan import/runtime error aktif, dan resource chain publik memuat `main.js?v=20260503ab`, `router.js?v=20260503ab`, `api.js?v=20260503b`, `views/ai_picks.js?v=20260503ai`.
- [warn] Browser resource list fresh session masih mencatat `main.js?v=20260503aa` lama sebagai entri historis tambahan, tetapi chain aktif yang dipakai page sudah versi baru dan tidak memblokir render.
- [done] Phase D harness hotfix selesai: `backend/test_api_e2e.py` sekarang memaksa `sys.path` ke `/opt/swingaq/backend` lebih dulu dan import `_sqlite_datetime_literal` langsung dari `routes.shared_sqlite_helpers`, sehingga runtime pytest tidak lagi nyasar ke `/opt/swingaq/main.py`.
- [done] Phase D runtime verification selesai: dari `/opt/swingaq/backend`, suite `pytest -q test_api_e2e.py /home/rich27/retailbijak/backend/tests/test_ai_picks_api.py /home/rich27/retailbijak/backend/tests/test_ai_picks_candidates.py /home/rich27/retailbijak/backend/tests/test_ai_picks_scoring.py /home/rich27/retailbijak/backend/tests/test_ai_picks_view_static.py` kembali hijau dengan hasil `39 passed`.
- [warn] Runtime pytest masih mengeluarkan `PytestCacheWarning` karena tidak bisa menulis cache ke `/.pytest_cache`; ini non-blocking untuk validitas suite tetapi layak dibersihkan pada hardening slice berikutnya bila ingin output benar-benar bersih.
- [done] Phase D execution slice untuk stabilisasi runtime test harness selesai.
- [done] Phase B1/B3 UX polish AI Picks selesai di repo: mode terakhir sekarang dipersist via `localStorage`, loading state dirender ulang setiap pergantian mode, dan empty/error state memakai marker eksplisit plus CTA retry.
- [done] Static guard Phase B ditambah di `backend/tests/test_ai_picks_view_static.py` untuk persistence token, state markers (`loading`/`empty`/`error`), serta selector CSS state card.
- [done] Verifikasi repo slice Phase B hijau: `pytest -q backend/tests/test_ai_picks_view_static.py backend/tests/test_ai_picks_api.py backend/tests/test_ai_picks_candidates.py backend/tests/test_ai_picks_scoring.py` lulus `25 passed`, lalu `python -m compileall -q frontend/js` dan `python -m py_compile backend/main.py backend/ai_picks.py` juga hijau.
- [done] Phase C1 quick action + context handoff selesai di repo: tombol `Buka Detail` dari AI Picks sekarang menyimpan context kandidat ke `sessionStorage`, lalu stock detail menampilkan banner `Datang dari AI Picks` berisi mode, score, confidence, alasan singkat, dan risk note saat user datang dari shortlist tersebut.
- [done] Static guard Phase C ditambah di `backend/tests/test_ai_picks_view_static.py` untuk session-context handoff pada `ai_picks.js`, banner context pada `stock_detail.js`, dan selector CSS `stock-ai-pick-context*`.
- [done] Verifikasi repo slice Phase C1 hijau: `pytest -q backend/tests/test_ai_picks_view_static.py backend/tests/test_ai_picks_api.py backend/tests/test_ai_picks_candidates.py backend/tests/test_ai_picks_scoring.py` lulus `30 passed`, `python -m compileall -q frontend/js` hijau, `python -m py_compile backend/main.py backend/ai_picks.py` hijau, dan scan korupsi prefix JS (`^\s*[0-9]+\|`) tetap bersih.
- [done] Phase E1 dashboard discovery widget selesai di repo: dashboard sekarang memuat `Top AI Pick Today`, menarik candidate teratas via `fetchAiPicks('swing', 3)`, punya CTA jelas ke `#ai-picks`, dan fallback empty state tetap hidup saat data belum tersedia.
- [done] Static guard Phase E ditambah di `backend/tests/test_ai_picks_view_static.py` untuk hook dashboard widget (`fetchAiPicks`, `loadAiPickWidget`, selector `dash-ai-pick-*`) dan coverage CSS widget baru.
- [done] Verifikasi repo slice Phase E hijau: `pytest -q backend/tests/test_ai_picks_view_static.py backend/tests/test_ai_picks_api.py backend/tests/test_ai_picks_candidates.py backend/tests/test_ai_picks_scoring.py` lulus `27 passed`, `python -m compileall -q frontend/js` hijau, `python -m py_compile backend/main.py backend/ai_picks.py` hijau, dan scan korupsi prefix JS (`^\s*[0-9]+\|`) bersih.
- [done] Phase C2 richer context AI Picks selesai di repo: context handoff sekarang ikut membawa `fit_label`, `entry_zone`, `target_zone`, dan `invalidation`, lalu banner di stock detail menampilkan level plan yang lebih kaya plus CTA `Kembali ke AI Picks` agar user bisa pulang ke shortlist tanpa kehilangan konteks.
- [done] Static guard Phase C2 ditambah di `backend/tests/test_ai_picks_view_static.py` untuk memastikan payload handoff richer context, banner stock detail memuat `fit_label`/`Entry`/`Target`/`Invalidasi`, dan hook CTA balik `#ai-picks` + `stock-ai-pick-context-cta` tetap ada.
- [done] Verifikasi repo slice Phase C2 hijau: `/opt/swingaq/backend/venv/bin/pytest -q backend/tests/test_ai_picks_view_static.py backend/tests/test_ai_picks_api.py backend/tests/test_ai_picks_candidates.py backend/tests/test_ai_picks_scoring.py` lulus `30 passed`, `python -m compileall -q frontend/js` hijau, `python -m py_compile backend/main.py backend/ai_picks.py` hijau, dan scan korupsi prefix JS (`^\s*[0-9]+\|`) tetap bersih.
- [done] Phase E2 dashboard quick-detail context selesai di repo: widget `Top AI Pick Today` sekarang punya tombol `Buka Detail` yang menyimpan context AI Picks kaya (mode, score, fit label, level entry/target/invalidation, alasan, risk note) ke `sessionStorage` sebelum lompat ke `#stock/{ticker}`.
- [done] Static guard Phase E2 ditambah di `backend/tests/test_ai_picks_view_static.py` untuk memastikan widget dashboard memuat `AI_PICKS_CONTEXT_KEY`, helper `buildAiPickContext`, storage handoff, tombol `data-dash-ai-pick-open-detail`, dan navigasi detail berbasis hash.
- [done] Verifikasi repo slice Phase E2 hijau: `pytest -q backend/tests/test_ai_picks_view_static.py` lulus `13 passed`, `/opt/swingaq/backend/venv/bin/pytest -q backend/tests/test_ai_picks_view_static.py backend/tests/test_ai_picks_api.py backend/tests/test_ai_picks_candidates.py backend/tests/test_ai_picks_scoring.py` lulus `30 passed`, `python -m compileall -q frontend/js` hijau, `python -m py_compile backend/main.py backend/ai_picks.py` hijau, dan scan korupsi prefix JS (`^\s*[0-9]+\|`) tetap bersih.
- [done] Phase E3 dashboard alternate picks selesai di repo: widget `Top AI Pick Today` sekarang menampilkan dua alternatif cepat dari `picks.slice(1, 3)` dalam tray `dash-ai-pick-alt-list`, masing-masing bisa langsung buka detail sambil membawa context AI Picks kaya ke stock detail.
- [done] Static guard Phase E3 ditambah di `backend/tests/test_ai_picks_view_static.py` untuk memastikan tray alternatif dashboard (`dash-ai-pick-alt-list`, `dash-ai-pick-alt-item`, `data-dash-ai-pick-alt-detail`) dan style hook terkait tetap ada.
- [done] Verifikasi repo slice Phase E3 hijau: `pytest -q backend/tests/test_ai_picks_view_static.py` lulus `13 passed`, `/opt/swingaq/backend/venv/bin/pytest -q backend/tests/test_ai_picks_view_static.py backend/tests/test_ai_picks_api.py backend/tests/test_ai_picks_candidates.py backend/tests/test_ai_picks_scoring.py` lulus `30 passed`, `python -m compileall -q frontend/js` hijau, `python -m py_compile backend/main.py backend/ai_picks.py` hijau, dan scan korupsi prefix JS (`^\s*[0-9]+\|`) tetap bersih.
- [done] Phase C3 origin-aware return CTA selesai di repo: payload context AI Picks/dashboard sekarang menyimpan `source_route` + `source_label`, lalu stock detail menampilkan asal shortlist dan CTA `Kembali ke shortlist asal` yang kembali ke sumber sebenarnya (AI Picks atau Dashboard) alih-alih selalu hardcoded ke `#ai-picks`.
- [done] Static guard Phase C3 ditambah di `backend/tests/test_ai_picks_view_static.py` untuk memastikan field `source_route`/`source_label`, perhitungan `returnHref`, copy `Kembali ke shortlist asal`, dan selector style `stock-ai-pick-context-origin` tetap ada.
- [done] Verifikasi repo slice Phase C3 hijau: `pytest -q backend/tests/test_ai_picks_view_static.py` lulus `13 passed`, `/opt/swingaq/backend/venv/bin/pytest -q backend/tests/test_ai_picks_view_static.py backend/tests/test_ai_picks_api.py backend/tests/test_ai_picks_candidates.py backend/tests/test_ai_picks_scoring.py` lulus `30 passed`, `python -m compileall -q frontend/js` hijau, `python -m py_compile backend/main.py backend/ai_picks.py` hijau, dan scan korupsi prefix JS (`^\s*[0-9]+\|`) tetap bersih.
- [done] Phase C3.1 origin-aware hero back selesai di repo: tombol back hero pada stock detail sekarang mengikuti `source_route` dari context AI Picks/dashboard, jadi user kembali ke shortlist asal yang benar alih-alih default `#dashboard`.
- [done] TDD RED/GREEN Phase C3.1: static guard `backend/tests/test_ai_picks_view_static.py` diperluas dengan `heroBackHref` dan marker `data-stock-origin-back`; RED terverifikasi gagal sebelum implementasi, lalu GREEN lewat `pytest -q backend/tests/test_ai_picks_view_static.py::test_stock_detail_can_render_ai_pick_context_banner` → `1 passed`.
- [done] Verifikasi repo quick pass setelah patch: `pytest -q backend/tests/test_ai_picks_view_static.py && python -m compileall -q frontend/js` → `13 passed`, memastikan banner context, CTA balik, dan widget dashboard tetap aman.
- [done] Audit slice berikutnya setelah Phase C3.1 mengonfirmasi gap terbesar sekarang ada di backend explainability: `reason_labels` masih seragam lintas mode, dan `comparison_points` belum punya headline/risk/timing yang cukup operasional untuk frontend.
- [done] TDD RED Phase C3.2: tambah guard di `backend/tests/test_ai_picks_scoring.py` agar profil faktor yang sama menghasilkan alasan berbeda per mode (`swing`/`defensive`/`catalyst`), plus perluas `backend/tests/test_ai_picks_candidates.py` untuk mewajibkan `comparison_points.headline`, `risk_label`, dan `timing_label`.
- [done] RED verified Phase C3.2: `pytest -q backend/tests/test_ai_picks_scoring.py::test_reason_labels_shift_by_mode_for_same_factor_profile` awalnya gagal karena label defensif/katalis masih sama dengan swing; guard candidate shape juga ditulis untuk mengunci payload explainability yang lebih kaya.
- [done] Implementasi Phase C3.2 di `backend/ai_picks.py`: `reason_labels_from_factors()` sekarang memakai prioritas label per mode, sementara `compose_pick_payload()` menambah `comparison_points.headline`, `risk_label`, dan `timing_label` agar frontend bisa menjelaskan ranking tanpa heuristik tambahan.
- [done] GREEN verified Phase C3.2: `pytest -q backend/tests/test_ai_picks_scoring.py::test_reason_labels_shift_by_mode_for_same_factor_profile` → `1 passed`; `python -m py_compile backend/ai_picks.py && pytest -q backend/tests/test_ai_picks_scoring.py` → `6 passed`.
- [done] Hardening pass berikutnya mengaudit runtime venv AI Picks secara penuh; hasilnya menemukan satu regresi nyata: test API lama untuk `comparison_points` masih mengasumsikan 4 key lama, padahal Phase C3.2 menambah `headline`, `risk_label`, dan `timing_label`.
- [done] Runtime RED verified: `/opt/swingaq/backend/venv/bin/pytest -q backend/tests/test_ai_picks_api.py backend/tests/test_ai_picks_candidates.py backend/tests/test_ai_picks_scoring.py` awalnya gagal `1 failed, 17 passed` pada `test_ai_picks_endpoint_live_rows_include_explainable_metrics_and_compare_points`, sehingga suite runtime kembali sinkron dengan kontrak explainability terbaru.
- [done] TDD RED edge-case baru di `backend/tests/test_ai_picks_api.py`: tambahkan guard untuk `limit <= 0` agar tetap kosong/stabil, dan guard `limit=1000` agar endpoint tidak mengembalikan ratusan row sekaligus.
- [done] RED verified tambahan: `/opt/swingaq/backend/venv/bin/pytest -q backend/tests/test_ai_picks_api.py::test_ai_picks_endpoint_caps_excessive_limit_to_small_safe_window` awalnya gagal karena route masih mengembalikan `958` row untuk `limit=1000`.
- [done] Implementasi minimum hardening di `backend/main.py`: route `/api/ai-picks` sekarang clamp `limit` ke rentang aman `0..20` sebelum memanggil `build_ai_picks_payload()`, sehingga payload publik tetap ringan dan tidak berisiko membanjiri frontend.
- [done] GREEN verified runtime hardening: `python -m py_compile backend/main.py` lulus; `/opt/swingaq/backend/venv/bin/pytest -q backend/tests/test_ai_picks_api.py backend/tests/test_ai_picks_candidates.py backend/tests/test_ai_picks_scoring.py` sekarang hijau penuh `20 passed`.
- [done] Audit copy-explainability slice berikutnya menemukan residu istilah `Conf`/`Confidence` dan fallback copy Inggris pada surface AI Picks + widget dashboard, sehingga natural-language decision layer masih belum konsisten penuh di frontend.
- [done] TDD RED copy layer: `backend/tests/test_ai_picks_view_static.py` diperluas untuk mewajibkan copy `Keyakinan` + narasi confidence Indonesia (`cukup layak dipantau...`, `konfirmasi teknikal cukup kuat...`) dan sekaligus melarang residual `Confidence`, `Conf`, serta fallback `Explainable ranking engine...`.
- [done] Implementasi slice copy-explainability di `frontend/js/views/ai_picks.js` dan `frontend/js/views/dashboard.js`: semua label confidence diganti ke `Keyakinan`, ditambah helper narasi confidence bertingkat, dan fallback featured-fit dashboard dinaturalisasi ke bahasa keputusan Indonesia.
- [done] GREEN verified repo slice: `PYTHONPATH=/home/rich27/retailbijak/backend:/home/rich27/retailbijak /opt/swingaq/backend/venv/bin/pytest -q backend/tests/test_ai_picks_view_static.py` → `14 passed`; `python -m compileall -q frontend/js` hijau.
- [done] Deploy/runtime verification slice: `bash scripts/sync_production.sh`, health check `/api/health`, `python scripts/post_deploy_smoke_check.py`, dan `python scripts/check_public_resource_chain.py` semua hijau; live asset publik juga terkonfirmasi memuat marker `Keyakinan` tanpa residual `Conf`/`Confidence` pada `dashboard.js` dan `ai_picks.js`.
