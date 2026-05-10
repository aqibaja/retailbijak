# RetailBijak AI Feature Separation Plan

> **For Hermes:** planning only. Jangan implement dulu. Eksekusi nanti per task dengan TDD ketat.

**Goal:** memisahkan dengan tegas dua fitur AI yang berbeda di RetailBijak: (1) halaman besar `#ai-picks` sebagai menu utama kurasi ide saham berbasis AI, dan (2) box AI khusus di halaman detail saham untuk analisis spesifik satu ticker.

**Architecture:** backend dan frontend harus memperlakukan AI Picks dan Stock Detail AI sebagai dua produk berbeda yang hanya berbagi provider OpenRouter/settings, tetapi berbeda route, kontrak payload, copy UI, dan model default. `AI Picks` tetap memakai `openai/gpt-oss-120b:free`. `Stock analysis specific` di detail saham wajib memakai `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`.

**Tech Stack:** FastAPI, SQLAlchemy/SQLite, Vanilla JS SPA, OpenRouter, pytest static/API tests.

---

## Requirement Lock

### Fitur A — AI Picks
- Lokasi: route/menu utama `#ai-picks`
- Sifat: halaman kurasi ide saham / stock pick AI
- Data utama: hasil ranking kandidat dari backend `ai_picks.py`
- LLM role: merangkum shortlist, market bias, dan pick notes
- Model wajib: `openai/gpt-oss-120b:free`
- Tidak boleh diposisikan sebagai fitur detail-saham tunggal
- **Perilaku wajib baru:** sistem menjalankan analisa otomatis **setiap hari kerja jam 08:00 WIB** sebelum market open
- **Output wajib per hari:** daftar saham yang layak dipertimbangkan untuk beli **hari itu** beserta alasan lengkap, area entry, stop loss, target profit/TP, horizon trade, dan catatan risiko/katalis penting
- **Mode konsumsi user:** user datang ke halaman `#ai-picks` untuk melihat briefing/picks harian yang sudah jadi, bukan selalu memicu analisa manual dari nol

### Fitur B — Stock Analysis Specific
- Lokasi: hanya di halaman detail saham `#stock/{ticker}`
- Sifat: box analisis spesifik untuk ticker aktif
- Data utama: snapshot, technical, fundamental, chart, catalysts ticker itu
- LLM role: menjawab / merangkum saham spesifik itu saja
- Model wajib: `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`
- Tidak boleh terlihat sebagai AI Picks mini-page

---

## Current Misalignment yang Harus Dibenahi

1. Secara implementasi model sempat terbalik/terseragamkan di runtime, sehingga stock-detail ikut memakai `gpt-oss-120b:free`.
2. Copy dan framing di stock detail masih terasa seperti “preview AI” generik, belum tegas sebagai box analisis spesifik saham.
3. Pengaturan OpenRouter memang sudah punya dua field model terpisah, tetapi perlu diaudit ulang agar wiring backend + fallback frontend + runtime production benar-benar konsisten.
4. Verifikasi sebelumnya terlalu fokus pada kestabilan parser/provider, belum mengunci pemisahan product semantics dua fitur ini.
5. AI Picks saat ini masih terlalu terasa seperti fetch on-demand, padahal requirement produk barunya adalah **daily premarket briefing otomatis jam 08:00 WIB**.
6. Belum ada penyimpanan briefing AI Picks harian yang persisten, sehingga hasil analisa pagi berisiko hilang atau ter-generate ulang secara tidak konsisten.
7. Kontrak output AI Picks belum dipaksa memuat struktur rekomendasi trading yang actionable: alasan, entry, stop, TP, risk/reward, dan catatan risiko.

---

## Target End State

### Product / UX
- Sidebar/nav memperlakukan `AI Picks` sebagai menu utama setara Dashboard/Market/Screener/Portfolio.
- `#ai-picks` menjadi halaman stock-pick AI penuh: summary, shortlist, compare tray, pick notes, market bias.
- `#stock/{ticker}` hanya memiliki box AI spesifik ticker, dengan copy seperti “Analisis AI Saham Ini” / “Tanya AI tentang BBCA”, bukan framing AI Picks.
- `#ai-picks` menampilkan **briefing harian otomatis** untuk tanggal perdagangan aktif, dengan timestamp run terakhir dan status freshness yang jelas.
- Setiap pick harian menampilkan minimal: thesis/alasan masuk, entry zone, stop loss, target profit, risk-reward, dan info penting tambahan.

### Backend
- `build_ai_picks_llm_payload()` selalu memakai `config['ai_picks_model']` dan default `openai/gpt-oss-120b:free`.
- `build_stock_analysis_llm_payload()` selalu memakai `config['stock_analysis_model']` dan default `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`.
- `/api/ai-picks?llm=1` dan `/api/stocks/{ticker}/analysis?llm=1` diverifikasi menghasilkan model yang berbeda sesuai fungsi.
- Ada job terjadwal **08:00 WIB setiap hari kerja** untuk membangkitkan/refresh briefing AI Picks harian.
- Hasil AI Picks harian disimpan persisten agar halaman bisa menampilkan hasil terakhir tanpa harus menunggu inferensi baru setiap load.
- Kontrak data AI Picks harian menyertakan tanggal trading, run timestamp, shortlist picks, dan field rekomendasi trading (`entry_zone`, `stop_loss`, `take_profit`, `risk_notes`, dll).

### Settings / Config
- Settings tetap menampilkan dua model terpisah dan copy penjelas yang jelas:
  - Model AI Picks
  - Model Analisis Saham Spesifik
- Fallback `fetchSettings()` di frontend mengikuti nilai default yang benar.

### Verification
- Static tests mengunci semantics route/menu/copy.
- API tests mengunci model routing terpisah.
- Browser/live smoke memverifikasi pemisahan fitur tampak jelas di UI.

---

## Files Likely to Audit / Modify

### Backend
- `backend/services/openrouter_llm.py`
- `backend/main.py`
- `backend/routes/user.py`
- `backend/ai_picks.py`
- `backend/routes/stock_detail.py` atau file route analisis terkait bila ada

### Frontend
- `frontend/js/views/ai_picks.js`
- `frontend/js/views/stock_detail.js`
- `frontend/js/views/settings.js`
- `frontend/js/api.js`
- `frontend/js/router.js`
- `frontend/index.html`
- `frontend/style.css`

### Tests
- `backend/tests/test_ai_picks_api.py`
- `backend/tests/test_stock_analysis_llm_api.py`
- `backend/tests/test_ai_picks_view_static.py`
- `backend/tests/test_settings_view_static.py`
- `backend/tests/test_user_route_runtime.py`
- kemungkinan test baru khusus semantic separation, mis. `backend/tests/test_ai_feature_separation_static.py`

---

## Execution Plan

## Phase 1 — Audit + semantic test guards
**Status:** PLANNED

**Objective:** kunci requirement bahwa AI Picks dan Stock Detail AI adalah dua fitur berbeda sebelum implementasi lebih lanjut.

### Task 1.1 — Audit source of truth untuk model default dan wiring
**Files:**
- Read: `backend/services/openrouter_llm.py`
- Read: `frontend/js/api.js`
- Read: `frontend/js/views/ai_picks.js`
- Read: `frontend/js/views/stock_detail.js`
- Read: `backend/main.py`
- Read: `backend/routes/user.py`

**Checklist:**
- Pastikan default backend untuk `stock_analysis_model` = `nvidia/...:free`
- Pastikan default backend untuk `ai_picks_model` = `openai/gpt-oss-120b:free`
- Pastikan fallback frontend settings sama persis
- Catat semua copy UI yang masih mengaburkan pemisahan fitur

### Task 1.2 — TDD RED static guard untuk semantic separation
**Files:**
- Create/modify: `backend/tests/test_ai_feature_separation_static.py`
- Test: file baru ini

**Guard yang harus dipaksa:**
- `ai_picks.js` mengandung identity page-level seperti `AI Picks`, `Compare Lite`, `AI Desk Brief`, shortlist/curation copy
- `stock_detail.js` mengandung identity ticker-specific seperti `Tanya AI tentang saham ini` / `Analisis AI saham ini`
- `stock_detail.js` tidak memakai framing `AI Picks` sebagai judul fitur utama box AI
- `fetchAnalysis(..., { llm: true })` tetap hanya untuk detail saham, bukan untuk seluruh semantic AI Picks page

**Run:**
- `pytest -q backend/tests/test_ai_feature_separation_static.py`

**Expected RED:**
- gagal bila copy/wiring semantic masih kabur

### Task 1.3 — TDD RED API guard untuk model routing terpisah
**Files:**
- Modify: `backend/tests/test_ai_picks_api.py`
- Modify: `backend/tests/test_stock_analysis_llm_api.py`

**Guard yang harus dipaksa:**
- test AI Picks assert model = `openai/gpt-oss-120b:free`
- test stock analysis assert model = `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`
- test settings/runtime assert dua field model tetap terpisah

**Run:**
- `PYTHONPATH=/home/rich27/retailbijak/backend:/home/rich27/retailbijak /opt/swingaq/backend/venv/bin/pytest -q backend/tests/test_ai_picks_api.py backend/tests/test_stock_analysis_llm_api.py backend/tests/test_user_route_runtime.py`

---

## Phase 2 — Backend model routing cleanup
**Status:** PLANNED

**Objective:** memastikan backend tidak pernah mencampur model AI Picks dan stock-specific analysis.

### Task 2.1 — Rapikan default model constants bila drift
**Files:**
- Modify: `backend/services/openrouter_llm.py`

**Implementation target:**
- `DEFAULT_STOCK_ANALYSIS_MODEL = 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free'`
- `DEFAULT_AI_PICKS_MODEL = 'openai/gpt-oss-120b:free'`

### Task 2.2 — Audit getter config dan fallback env/db
**Files:**
- Modify if needed: `backend/services/openrouter_llm.py`

**Implementation target:**
- `get_openrouter_config()` harus mengembalikan dua key terpisah tanpa saling fallback silang
- tidak boleh ada logic yang menyamakan `stock_model` dengan `picks_model`

### Task 2.3 — Audit route `/api/ai-picks`
**Files:**
- Read/modify if needed: `backend/main.py`
- Read/modify if needed: `backend/ai_picks.py`

**Implementation target:**
- route AI Picks hanya memanggil `build_ai_picks_llm_payload()`
- payload AI Picks tidak meminjam struktur stock-specific

### Task 2.4 — Audit route stock detail analysis
**Files:**
- Search/modify: backend route analysis detail saham
- Likely: `backend/routes/stock_detail.py` atau logic terkait di `main.py`

**Implementation target:**
- route detail saham hanya memanggil `build_stock_analysis_llm_payload()`
- model yang kembali di response benar-benar `nvidia/...:free`

### Task 2.5 — GREEN verify backend
**Run:**
- `PYTHONPATH=/home/rich27/retailbijak/backend:/home/rich27/retailbijak /opt/swingaq/backend/venv/bin/pytest -q backend/tests/test_ai_picks_api.py backend/tests/test_stock_analysis_llm_api.py backend/tests/test_user_route_runtime.py backend/tests/test_openrouter_llm_service.py`
- `python3 -m py_compile backend/services/openrouter_llm.py backend/main.py backend/ai_picks.py backend/routes/user.py`

---

## Phase 3 — Frontend semantic separation cleanup
**Status:** PLANNED

**Objective:** memastikan user merasakan dua fitur yang berbeda, bukan satu fitur yang dibelah.

### Task 3.1 — Rapikan identity page `#ai-picks`
**Files:**
- Modify: `frontend/js/views/ai_picks.js`
- Modify if needed: `frontend/style.css`

**Implementation target:**
- copy tetap menegaskan ini adalah halaman stock picks / shortlist / curation
- tidak ada copy yang membuatnya terasa seperti box tanya jawab ticker tunggal

### Task 3.2 — Rapikan box AI di stock detail
**Files:**
- Modify: `frontend/js/views/stock_detail.js`
- Modify if needed: `frontend/style.css`

**Implementation target:**
- judul/desc box AI jelas untuk analisis spesifik saham aktif
- contoh prompt fokus pada ticker aktif: risiko, entry, valuasi, katalis, alasan sinyal saham itu
- hilangkan framing yang terasa seperti “AI Picks preview” bila masih ada

### Task 3.3 — Rapikan settings copy
**Files:**
- Modify: `frontend/js/views/settings.js`
- Modify if needed: `frontend/js/api.js`

**Implementation target:**
- field settings memakai label eksplisit:
  - `Model AI Picks (stock pick AI)`
  - `Model Analisis Saham Spesifik`
- helper/fallback frontend tetap mengembalikan default model yang benar

### Task 3.4 — Static guard frontend
**Files:**
- Modify: `backend/tests/test_ai_picks_view_static.py`
- Modify/create: `backend/tests/test_ai_feature_separation_static.py`
- Modify: `backend/tests/test_settings_view_static.py`

**Run:**
- `pytest -q backend/tests/test_ai_picks_view_static.py backend/tests/test_settings_view_static.py backend/tests/test_ai_feature_separation_static.py`
- `python3 -m compileall -q frontend/js`

---

## Phase 4 — AI Picks daily-run architecture
**Status:** PLANNED

**Objective:** menambahkan mesin briefing harian otomatis untuk AI Picks agar user mendapat pick saham siap pakai setiap pagi.

### Task 4.1 — Definisikan storage briefing harian
**Files:**
- Modify: `backend/database.py`
- Modify/create: migration/init logic terkait
- Test: test model/storage baru

**Implementation target:**
- tambah storage persisten khusus output AI Picks harian, mis. tabel `DailyAIPickReport`
- field minimum: `trading_date`, `generated_at`, `mode`, `market_bias`, `summary`, `runtime_state`, `runtime_message`, `model`, `payload_json`
- payload picks menyimpan array picks lengkap: ticker, thesis, entry_zone, stop_loss, take_profit, risk_reward, catalysts, risk_notes

### Task 4.2 — Definisikan kontrak generator AI Picks harian
**Files:**
- Modify: `backend/ai_picks.py`
- Modify: `backend/services/openrouter_llm.py`
- Test: `backend/tests/test_ai_picks_api.py`

**Implementation target:**
- bedakan generator shortlist/scoring mentah vs generator report briefing harian final
- prompt/formatter AI Picks wajib meminta output actionable untuk trade hari itu
- fallback non-LLM tetap menghasilkan struktur pick yang terisi semampunya agar halaman tidak kosong

### Task 4.3 — Tambah scheduler job jam 08:00 WIB
**Files:**
- Modify: `backend/scheduler.py`
- Modify if needed: `backend/main.py`
- Test: scheduler/static runtime guard

**Implementation target:**
- job baru weekday `08:00` Asia/Jakarta
- job memanggil generator AI Picks harian untuk mode default utama
- job idempotent untuk `trading_date` yang sama agar refresh aman dan tidak duplikat liar

### Task 4.4 — Tambah API briefing harian
**Files:**
- Modify: `backend/main.py` atau route AI picks terkait
- Test: `backend/tests/test_ai_picks_api.py`

**Implementation target:**
- `GET /api/ai-picks` default mengembalikan briefing harian terbaru + freshness metadata
- optional parameter manual refresh tetap boleh ada, tetapi UX utama membaca report tersimpan
- response memuat `generated_at`, `trading_date`, `as_of_label`, `picks`, `market_bias`, `runtime_state`

### Task 4.5 — TDD guards untuk actionable picks
**Files:**
- Modify/create: `backend/tests/test_ai_picks_api.py`
- Modify/create: static view tests terkait AI Picks

**Guard yang harus dipaksa:**
- setiap pick punya alasan/thesis
- setiap pick punya `entry_zone`, `stop_loss`, `take_profit`
- payload membawa info penting lain: catalysts atau risk_notes
- briefing page menampilkan tanggal briefing + status freshness

---

## Phase 5 — Frontend AI Picks daily briefing UX
**Status:** PLANNED

**Objective:** mengubah `#ai-picks` dari sekadar trigger AI menjadi halaman briefing harian yang langsung berguna saat dibuka.

### Task 5.1 — Render shell briefing harian
**Files:**
- Modify: `frontend/js/views/ai_picks.js`
- Modify: `frontend/style.css`

**Implementation target:**
- tampilkan heading seperti `AI Picks Hari Ini`
- tampilkan timestamp `Generated 08:00 WIB` / freshness badge
- tampilkan summary market bias + shortlist picks cards

### Task 5.2 — Render detail pick actionable
**Files:**
- Modify: `frontend/js/views/ai_picks.js`
- Modify: `frontend/style.css`

**Implementation target:**
- setiap kartu pick menampilkan ticker, alasan masuk, entry zone, stop, TP, RR, dan catatan penting
- layout tetap padat, trading-terminal feel, tidak terasa blog/article kosong

### Task 5.3 — Manual refresh operator controls
**Files:**
- Modify: `frontend/js/views/ai_picks.js`
- Modify if needed: `frontend/js/api.js`

**Implementation target:**
- tetap sediakan tombol refresh/manual rerun untuk operator
- tetapi state default page selalu membaca hasil briefing tersimpan terbaru

### Task 5.4 — Static/view guards
**Files:**
- Modify: `backend/tests/test_ai_picks_view_static.py`
- Modify/create: `backend/tests/test_ai_feature_separation_static.py`

**Guard yang harus dipaksa:**
- page AI Picks punya copy briefing harian, generated/freshness, dan field entry-stop-TP
- stock detail tetap tidak memakai framing briefing harian ini

---

## Phase 6 — Runtime verification + deploy
**Status:** PLANNED

**Objective:** verifikasi lokal, sync runtime, smoke test publik, dan pastikan dua fitur benar-benar terpisah setelah deploy.

### Task 6.1 — Local/API verification
**Run:**
- `python3 - <<'PY'`
- check `/api/settings`
- check `/api/ai-picks?mode=swing&limit=2&llm=1`
- check `/api/stocks/BBCA/analysis?llm=1`
- assert model AI Picks = `openai/gpt-oss-120b:free`
- assert model Stock Detail = `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`
- assert AI Picks payload punya `trading_date`, `generated_at`, `picks[*].entry_zone`, `stop_loss`, `take_profit`
- `PY`

### Task 6.2 — Scheduler verification
**Run:**
- test job registration di scheduler
- trigger manual generator untuk satu `trading_date`
- assert report tersimpan dan bisa dibaca ulang tanpa inferensi baru

### Task 6.3 — Sync production
**Files to sync minimal:**
- backend changed files
- frontend changed files
- relevant test files

**Run:**
- copy ke `/opt/swingaq/...`
- `sudo systemctl restart swingaq-backend`
- `curl -sS https://retailbijak.rich27.my.id/api/health`

### Task 4.3 — Public smoke test
**Checklist:**
- `#ai-picks` terlihat sebagai menu/page utama stock pick AI
- `#stock/BBCA` hanya punya box AI spesifik BBCA
- `/api/settings` menunjukkan dua model berbeda
- `/api/ai-picks?...&llm=1` mengembalikan model `gpt-oss-120b:free`
- `/api/stocks/BBCA/analysis?llm=1` mengembalikan model `nvidia/...:free`

### Task 4.4 — Progress logging + git hygiene
**Files:**
- Modify: `PLAN.md`

**Checklist:**
- catat hasil implementasi di `PLAN.md`
- commit terpisah per slice bila memungkinkan
- push `main`

---

## Acceptance Criteria

### Functional
- `AI Picks` dan `Stock Detail AI` jelas merupakan dua fitur berbeda.
- `AI Picks` memakai `openai/gpt-oss-120b:free`.
- `Stock Analysis Specific` memakai `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`.
- Settings menampilkan dua model itu secara eksplisit.

### UX
- User tidak lagi mengira AI Picks berada “di dalam” detail saham.
- User tidak lagi melihat box detail saham sebagai halaman AI Picks mini.

### Technical
- Test static + API untuk separation lulus.
- Compile lulus.
- Smoke test publik lulus.
- `PLAN.md` ter-update setelah eksekusi.

---

## Risks / Trade-offs

1. `gpt-oss-120b:free` tetap rawan rate-limit / provider instability pada AI Picks page. Itu acceptable bila memang khusus dipakai untuk fitur kurasi besar, tetapi harus ada fallback/status jujur.
2. `nvidia/nemotron...:free` lebih stabil untuk stock-specific summary, tapi kualitas reasoning/copy mungkin berbeda dengan AI Picks. Itu justru sesuai requirement karena fungsinya beda.
3. Static copy changes di stock detail perlu hati-hati agar tidak merusak layout chart/right-rail yang sudah padat.

---

## Suggested Execution Order

1. Phase 1 semantic tests
2. Phase 2 backend model routing
3. Phase 3 frontend/copy separation
4. Phase 4 verify + deploy + update `PLAN.md`

---

## Progress Log

### 2026-05-04 00:50 CST
- [done] Requirement clarified: AI Picks adalah menu utama terpisah; stock detail hanya punya AI box spesifik ticker.
- [done] Requirement clarified: model AI Picks = `openai/gpt-oss-120b:free`; model stock analysis specific = `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`.
- [done] Plan lengkap implementasi pemisahan semantics + model routing ditulis.
- [pending] Belum ada implementasi dari plan ini pada turn ini.
