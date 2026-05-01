# Market Overview Enhancement Plan

> **Execution status:** phase-1 first fold, phase-2 deep insight regrouping, phase-3 breadth+movers polish, phase-4 flow+catalyst refinement, phase-5 mobile-first ordering + responsive polish, phase-6 breadth endpoint optimization + denser Market Pulse refinement, phase-7 SQLite datetime binding fix untuk breadth production, phase-8 hardening shared latest-session OHLCV pipeline untuk movers, phase-9 snapshot consistency hardening untuk market stats + foreign flow, phase-10 dashboard market-intelligence sync fix + top-movers losers sorting production, phase-11 SPA cache-bust hardening untuk boot/router/dashboard shell, phase-12 full frontend import-chain cache-bust normalization lintas views, phase-13 cleanup artifact boot modules lama di repo/runtime, phase-14 guardrail regression test untuk single boot entry + versioned import chain + route coverage, phase-15 nav hash/router parity + repo-runtime core asset parity checker, phase-16 version-token consistency guardrail + script pre-deploy frontend parity checker, phase-17 deploy workflow auto pre-restart parity check + static deploy-doc coverage, phase-18 post-deploy smoke checker untuk homepage + endpoint inti, dan phase-19 runtime parity guardrail untuk semua routed views plus smoke checker marker SPA sudah dijalankan pada 2026-05-02.alankan pada 2026-05-02. Fokus yang sudah dieksekusi: headline rail, session pill, premium pulse summary, hero micro-metrics, 4-panel Market Pulse, stats strip baru berbasis breadth ratio, regrouping section bawah menjadi Market Internals / Flow & Participation / Catalysts & Events, breadth visual bar, ranking dan alignment baru untuk Top Gainers/Losers, summary line untuk foreign/broker, metadata editorial untuk corporate actions dan announcements, penguatan mobile order, spacing, tap target, query breadth berbasis latest-session window + previous close lookup, pengencangan visual Market Pulse lewat mood card yang lebih lebar dan compact winner/loser heads, hardening literal datetime SQLite agar snapshot breadth production tidak kembali kosong, reuse helper latest-session pairs untuk menghapus risiko bug datetime/N+1 serupa di endpoint top movers, penyatuan snapshot `market-stats` dan `foreign-trading` agar seluruh first-fold market cards membaca sesi OHLCV terbaru yang sama, sinkronisasi dashboard hero/intelligence ke endpoint `market-breadth` + `top-movers?sort=gainers|losers` live, pembersihan r... [truncated]

**Goal:** Mendesain ulang halaman `Market Overview` agar terasa seperti terminal market profesional: lebih jelas hierarki informasinya, lebih konsisten secara visual, lebih mudah discan cepat di desktop, dan tetap sangat usable di tablet/mobile tanpa card overlap atau density berlebihan.

**Architecture:** Pertahankan arsitektur vanilla JS SPA yang ada, tetapi ubah struktur halaman market dari layout “sekumpulan card sejajar” menjadi **information hierarchy 3-layer**: (1) hero/market pulse summary, (2) quick decision panels, (3) deeper market lists. Perubahan fokus pada `frontend/js/views/market.js` dan `frontend/style.css`; backend hanya disentuh bila perlu untuk menambah metadata display yang memperjelas status data.

**Tech Stack:** Vanilla JS SPA, existing design tokens di `frontend/style.css`, FastAPI backend, browser verification, static regression tests di `backend/tests/test_market_view_static.py`.

---

## 1. Current UX Audit Summary

### Masalah utama yang terlihat sekarang

1. **Information density terlalu tinggi di fold pertama**
   - `IHSG Snapshot` dan `Market Pulse` sama-sama berat, tetapi belum ada prioritas visual yang benar-benar jelas.
   - User menangkap terlalu banyak angka dalam area yang masih sempit.

    21|2. **Market Pulse masih terasa seperti 5 box yang dipaksa hidup bersama**
   - Struktur saat ini: 3 KPI kecil + 2 mini panel.
   - Secara hierarchy, `Lead Gainer/Loser` dan `Top Gainer/Loser` masih berdekatan maknanya sehingga terasa redundant dan visually confusing.

3. **Teks status source badge terlalu teknis dan terlalu panjang untuk jadi elemen hero**
   - `IDX INDEX SUMMARY · IDX CORPORATE LIVE · IDX ANNOUNCEMENT +4 · 23.02`
   - Elemen ini penting untuk trust, tapi sekarang lebih terasa seperti noise daripada assistive metadata.

4. **Summary sentence campur bahasa dan belum terdengar premium**
   - `Pulse: 145 advancers vs 600 decliners. HERO memimpin gainers ...`
   - Secara UI writing, tone belum konsisten dan belum cukup ringkas.

5. **Stat cards row (`Avg Price`, `Advancing`, `Declining`) masih seperti tempelan**
   - Belum punya konteks yang jelas: apakah ini overview stat, market internals, atau secondary facts?
   - Visual importance tidak sinkron dengan isi.

6. **List sections bawah belum cukup dibedakan berdasarkan use case**
   - `Market Breadth`, `Top Gainers`, `Top Losers`, `Corporate Actions`, `Foreign Flows`, `Announcements`, `Broker Activity`
   - Semuanya tampil sebagai “card sama level”, padahal nilai guna user berbeda.

7. **Kurang fitur UX yang membuat page terasa hidup dan actionable**
   - Belum ada timeframe chip, market status, last update quality, error state yang elegan, quick filters, compact/detailed mode, atau section-level refresh.

---

## 2. Product Direction (Senior UI/UX Recommendation)

### Target positioning
Halaman `Market Overview` sebaiknya bukan sekadar “kumpulan endpoint market”, tetapi menjadi:

> **Morning / intraday command center** untuk menjawab 3 pertanyaan user dalam 5 detik:
> 1. Market hari ini sehat atau lemah?
> 2. Siapa pendorong/perusak market?
> 3. Di area mana saya perlu scroll lebih dalam?

### Prinsip desain

1. **Scan-first, read-second**
   - Angka utama harus langsung terbaca tanpa user membaca subtitle panjang.

2. **Hierarchy over symmetry**
   - Tidak semua card perlu ukuran dan bobot visual yang sama.

3. **One idea per block**
   - Satu blok = satu pertanyaan yang dijawab.

4. **Trust-preserving metadata**
   - Status sumber data tetap ada, tapi jangan mengganggu hero narrative.

5. **Actionable liveliness**
   - Bila data kosong, tampilkan empty state yang informatif + next action.

6. **Desktop-first terminal, mobile-first prioritization**
   - Desktop: dashboard kaya informasi.
   - Mobile: urutan prioritas konten berubah, bukan hanya layout di-stack.

---

## 3. Proposed New Information Architecture

### Layer A — Hero band (fold pertama)

**A1. Market headline block**
- Judul tetap: `Market Overview`
- Subtitle dipendekkan dan dipisahkan dari pulse sentence.
- Tambahkan **market session badge**:
  - contoh: `Pre-open`, `Live Session`, `Post Close`, `Data Delayed`

**A2. Executive pulse summary**
- Satu sentence premium, ringkas, bilingual-consistent.
- Contoh:
  - `Tekanan pasar dominan: 145 naik vs 600 turun, dipimpin HERO (+24.74%) sementara BOBA melemah -14.91%.`
- Hindari campur style “Pulse: ... vs ... memimpin ...” yang terasa setengah debug string.

**A3. Metadata rail (bukan hero badge besar)**
- Ubah source badge panjang menjadi rail kecil berisi:
  - `Updated 23:02 WIB`
  - `Sources: Index, Movers, Corporate, Announcement`
  - optional status dot `Live / Mixed / Partial`

**A4. Primary market snapshot card**
- Tetap hero utama.
- Tambahkan 3 micro-metrics di dalam card, misalnya:
  - `Net change points`
  - `Breadth ratio`
  - `Flat count`
- Tujuannya agar card ini menjadi anchor visual utama.

### Layer B — Decision strip (quick scan panels)

Ganti struktur `Market Pulse` saat ini.

**Opsi rekomendasi:**
Buat `Market Pulse` menjadi **4 panel jelas**, bukan 5 elemen yang saling rebut ruang.

1. `Breadth`
   - `145 ↑ / 600 ↓`
   - plus mini insight: `1 saham naik untuk 4.1 saham turun`

2. `Top Winner`
   - ticker, % change, price, optional name pendek

3. `Top Loser`
   - ticker, % change, price, optional name pendek

4. `Market Mood`
   - derived label: `Risk-off`, `Mixed`, `Broad Rally`
   - berdasarkan breadth + IHSG direction + dispersion

**Buang/merge redundancy**
- `Lead Gainer` dan `Top Gainer` tidak perlu dipisah jika sumbernya sama.
- `Lead Loser` dan `Top Loser` juga sama.
- Kalau tetap perlu pembedaan, definisikan jelas:
  - `Lead` = kontribusi ke index / volume leader / headline mover
  - `Top` = persentase mover tertinggi
- Bila backend belum punya definisi ini, sementara **hapus duplication**.

### Layer C — Deep insight grid

Reorganisasi lower sections menjadi 3 kelompok:

**C1. Market internals**
- `Market Breadth`
- `Top Gainers`
- `Top Losers`

**C2. Flow & participation**
- `Foreign Investor Flows`
- `Broker Trading Activity`

**C3. Catalyst & events**
- `Corporate Actions`
- `Corporate News & Announcements`

Dengan grouping ini user paham:
- internals = apa yang terjadi di market
- flow = siapa yang mendorong
- catalysts = kenapa bisa terjadi

---

## 4. Detailed Feature Enhancements

### 4.1 Header UX enhancements

**Objective:** bikin area atas terasa premium, bukan seperti dump data.

**Enhancements:**
- Tambah `market-session-pill`
- Tambah `last-updated` + `source quality` dalam bentuk inline metadata row
- Ringkas subtitle menjadi 1 kalimat pendek
- Refactor pulse sentence jadi human-readable summary
- Tambah optional `Refresh all` + `Auto refresh` toggle di desktop

**Files likely to change:**
- `frontend/js/views/market.js`
- `frontend/style.css`
- Optional: `frontend/js/main.js` jika auto-refresh di-global-kan

---

### 4.2 Hero IHSG card enhancements

**Objective:** hero card jadi pusat orientasi market.

**Enhancements:**
- Besarkan separation antara index level dan change badge
- Tambahkan secondary stats grid kecil dalam card
- Tambah directional accent line / subtle gradient by trend
- Tambahkan context row:
  - `Advancers`, `Decliners`, `Flat`
  - atau `Range`, `Breadth ratio`, `Session`
- Perjelas negative badge styling; pastikan minus sign bukan terlihat seperti `~2.03%`

**Potential issue to fix:**
- badge red saat ini secara visual bisa kebaca ambigu dari screenshot.

**Files:**
- `frontend/js/views/market.js`
- `frontend/style.css`

---

### 4.3 Market Pulse redesign

**Objective:** hilangkan overlap semantics dan density problem.

**Recommended final content:**
- Card title: `Market Pulse`
- Subtitle: pendek, satu baris
- 4 panels only:
  1. `Breadth`
  2. `Top Winner`
  3. `Top Loser`
  4. `Market Mood`

**Optional additions:**
- sentiment indicator icon
- breadth ratio text
- section-level tooltip/help copy

**Remove or redefine:**
- `Lead Gainer`
- `Lead Loser`

**Need backend clarification (optional):**
Jika user memang ingin `lead` ≠ `top`, backend perlu endpoint / field baru untuk pemimpin berdasarkan nilai transaksi / kontribusi indeks.

**Files:**
- `frontend/js/views/market.js`
- `frontend/style.css`
- Optional backend contract notes in `backend/main.py` if semantics expanded

---

### 4.4 Stats strip redesign

**Objective:** ubah row `Avg Price / Advancing / Declining` menjadi section yang lebih bernilai.

**Recommended replacement:**
Ganti jadi `Market Internals Strip` berisi 4 item:
- `Advancers`
- `Decliners`
- `Flat`
- `Avg Price` atau `Breadth Ratio`

Atau jadikan hanya 3 item tapi lebih meaningful:
- `Breadth Ratio`
- `Advancers`
- `Decliners`

**Rationale:**
`Avg Price` saja tanpa konteks kurang kuat secara decision value.

**Files:**
- `frontend/js/views/market.js`
- `frontend/style.css`

---

### 4.5 Market Breadth section enhancements

**Objective:** section breadth harus menjadi insight panel, bukan hanya list statik.

**Enhancements:**
- Tampilkan ratio jelas: `145 up / 600 down / 214 flat`
- Tambah progress bar horizontal atau stacked bar visual
- Top advancers/decliners diberi small chip / mini spark feel
- Tambah helper copy kecil:
  - `Breadth negatif luas, tekanan dominan di mayoritas saham.`

**Files:**
- `frontend/js/views/market.js`
- `frontend/style.css`

---

### 4.6 Movers sections enhancements

**Objective:** `Top Gainers` dan `Top Losers` lebih cepat dibaca.

**Enhancements:**
- Tambah rank number `#1..#4`
- Tambah compact company name handling
- Consistent column alignment untuk ticker / pct / price
- Tambah hover affordance yang lebih jelas
- Pertimbangkan mini delta badge di kanan

**Files:**
- `frontend/js/views/market.js`
- `frontend/style.css`

---

### 4.7 Foreign flow & broker activity enhancements

**Objective:** section flow tidak terasa seperti raw logs.

**Enhancements:**
- Tambah section summary line di atas list
- Untuk broker activity no-data state, tampilkan alasan yang lebih premium:
  - `Belum ada snapshot broker yang valid untuk sesi ini`
- Tambah badge source per row bila berguna
- Highlight net buy vs net sell dengan chip yang lebih terstruktur

**Files:**
- `frontend/js/views/market.js`
- `frontend/style.css`
- Optional backend if source metadata needs normalization

---

### 4.8 Corporate actions & announcements enhancements

**Objective:** block catalyst lebih editorial dan less raw-dump.

**Enhancements:**
- Tambah visual distinction per event type
  - `LISTING`, `DIVIDEND`, `SUSPENSION`, `ANNOUNCEMENT`
- Better title truncation / multiline clamp
- Tambah date prominence dan code chip
- Tambah CTA per row jika nanti ada detail route

**Files:**
- `frontend/js/views/market.js`
- `frontend/style.css`

---

### 4.9 Mobile-specific experience redesign

**Objective:** mobile bukan sekadar stacked desktop.

**Mobile order recommendation:**
1. Header + session + update time
2. IHSG Snapshot
3. Market Pulse (4 panel stack)
4. Market Internals strip
5. Top Gainers
6. Top Losers
7. Market Breadth
8. Foreign Flows
9. Corporate Actions
10. Announcements
11. Broker Activity

**Why reorder?**
User mobile biasanya scan mover dan pulse dulu, bukan broker activity.

**Mobile UX enhancements:**
- sticky refresh bar optional
- tighter vertical rhythm
- larger tap targets for rows linking to stock detail
- reduce duplicate subtitles on mobile

**Files:**
- `frontend/js/views/market.js`
- `frontend/style.css`

---

## 5. Design System / Visual Rules to Enforce

### Typography hierarchy
- Page title: largest
- Hero metric (IHSG): dominant numeric
- Panel metric: medium
- Labels: uppercase but reduced tracking if too dense
- Metadata: subtle, never competing with primary numbers

### Spacing rules
- Hero card > Pulse card > list cards
- Use bigger top-level spacing between major sections
- Use smaller internal spacing inside stat cards

### Color usage
- Green/red reserved for directional meaning only
- Cyan/indigo for structure, not for metric semantics
- Neutral text should carry most labels

### Border / depth rules
- Hero cards can have stronger elevation
- Lower cards flatter and more list-like
- Avoid equal glow on everything

---

## 6. Backend / Data Contract Opportunities (Optional but Strongly Recommended)

These are not mandatory for the first UI pass, but they unlock a more professional experience.

### 6.1 Add normalized market pulse payload
Create or extend endpoint for a dedicated pulse object, e.g.:
- `market_mood`
- `breadth_ratio`
- `top_winner`
- `top_loser`
- `session_label`
- `last_update_label`
- `data_quality`

**Possible files:**
- `backend/main.py`
- `backend/test_api_e2e.py`

### 6.2 Clarify mover semantics
If keeping both `lead` and `top`, backend must define distinct meaning.

### 6.3 Add stale/partial data markers
Frontend should not guess whether data is fresh.
Return explicit flags like:
- `is_partial`
- `updated_at`
- `session_state`

---

## 7. Detailed Execution Plan (Implementation Phases)

## Phase 0 — Planning & benchmark capture

### Task 0.1: Capture current UI baseline
**Objective:** Simpan referensi visual dan DOM saat ini sebelum redesign.

**Files:**
- Read only: `frontend/js/views/market.js`
- Read only: `frontend/style.css`
- Optional evidence: screenshots in local scratch area

**Checklist:**
- Screenshot desktop current fold pertama
- Screenshot mobile current fold pertama
- Note sections yang paling padat
- Note duplicate semantics (`lead` vs `top`)

### Task 0.2: Freeze target IA
**Objective:** Putuskan final first-fold structure sebelum coding.

**Decision required:**
- Apakah `lead` akan dihapus atau didefinisikan berbeda?
- Apakah stats strip tetap ada atau diganti internals strip?
- Apakah mobile section order diubah?

---

## Phase 1 — Header & hero cleanup

### Task 1.1: Refactor top header markup
**Objective:** Pisahkan title, subtitle, pulse sentence, dan metadata rail.

**Files:**
- Modify: `frontend/js/views/market.js`
- Modify: `frontend/style.css`
- Test: `backend/tests/test_market_view_static.py`

**Planned checks:**
- Header tidak lagi terasa bertumpuk
- Source metadata tidak mendominasi hero area
- Refresh control tetap terlihat jelas

### Task 1.2: Improve pulse copywriting
**Objective:** Ubah kalimat pulse jadi lebih ringkas dan premium.

**Files:**
- Modify: `frontend/js/views/market.js`
- Test: `backend/tests/test_market_view_static.py`

**Acceptance criteria:**
- Bahasa konsisten
- Tidak terdengar seperti debug string
- Tetap informatif dalam satu kalimat

### Task 1.3: Enhance IHSG card hierarchy
**Objective:** Perjelas hubungan antara index value, badge change, dan micro context.

**Files:**
- Modify: `frontend/js/views/market.js`
- Modify: `frontend/style.css`

---

## Phase 2 — Market Pulse redesign

### Task 2.1: Simplify pulse content model
**Objective:** Kurangi elemen pulse menjadi 4 panel utama.

**Files:**
- Modify: `frontend/js/views/market.js`
- Test: `backend/tests/test_market_view_static.py`

**Target structure:**
- breadth
- top winner
- top loser
- market mood

### Task 2.2: Add derived market mood helper
**Objective:** Tambahkan helper frontend sederhana untuk memberi label mood market.

**Files:**
- Modify: `frontend/js/views/market.js`
- Optional backend follow-up later

**Initial heuristics (frontend-only acceptable):**
- breadth sangat negatif + IHSG negatif => `Risk-off`
- breadth mixed + IHSG flat => `Mixed`
- breadth positif + IHSG positif => `Broad Rally`

### Task 2.3: Redesign pulse card CSS
**Objective:** Pastikan pulse rapi di desktop/tablet/mobile tanpa semantik overlap.

**Files:**
- Modify: `frontend/style.css`
- Test: `backend/tests/test_market_view_static.py`

---

## Phase 3 — Stats strip & market internals

### Task 3.1: Replace current stats row with clearer internals strip
**Objective:** Jadikan row stat lebih decision-oriented.

**Files:**
- Modify: `frontend/js/views/market.js`
- Modify: `frontend/style.css`

### Task 3.2: Upgrade breadth section with mini visualization
**Objective:** Tambah bar/ratio visual agar breadth langsung kebaca.

**Files:**
- Modify: `frontend/js/views/market.js`
- Modify: `frontend/style.css`

---

## Phase 4 — Lists refinement

### Task 4.1: Improve movers list readability
**Objective:** Rank, alignment, truncation, spacing.

**Files:**
- Modify: `frontend/js/views/market.js`
- Modify: `frontend/style.css`

### Task 4.2: Improve flow cards readability
**Objective:** Ubah foreign/broker sections jadi lebih structured.

**Files:**
- Modify: `frontend/js/views/market.js`
- Modify: `frontend/style.css`

### Task 4.3: Improve catalyst cards readability
**Objective:** Actions + announcements lebih editorial.

**Files:**
- Modify: `frontend/js/views/market.js`
- Modify: `frontend/style.css`

---

## Phase 5 — Mobile-first ordering and responsive polish

### Task 5.1: Reorder sections for mobile priority
**Objective:** Mobile order mengikuti use case scan cepat.

**Files:**
- Modify: `frontend/js/views/market.js`
- Modify: `frontend/style.css`

### Task 5.2: Tighten mobile spacing system
**Objective:** Pastikan vertical rhythm konsisten dan tidak capek dibaca.

**Files:**
- Modify: `frontend/style.css`

### Task 5.3: Validate tap usability
**Objective:** Link row, refresh button, chips aman di touch screen.

**Files:**
- Modify: `frontend/style.css`

---

## Phase 6 — Trust and data clarity

### Task 6.1: Add freshness/status treatment
**Objective:** User paham data live, delayed, mixed, atau partial.

**Files:**
- Modify: `frontend/js/views/market.js`
- Optional modify: `backend/main.py`
- Test: `backend/test_api_e2e.py`

### Task 6.2: Normalize empty/loading/error microcopy
**Objective:** Semua no-data state terdengar profesional dan helpful.

**Files:**
- Modify: `frontend/js/views/market.js`
- Modify: `frontend/style.css`

---

## 8. Files Likely to Change

### Frontend primary
- `frontend/js/views/market.js`
- `frontend/style.css`
- `frontend/js/router.js` *(only if route-level mobile behavior / lazy state changes needed)*
- `frontend/js/main.js` *(only if adding auto-refresh/shared UI controls)*
- `frontend/index.html` *(only if cache-bust or meta changes needed)*

### Backend optional
- `backend/main.py`
- `backend/test_api_e2e.py`

### Tests
- `backend/tests/test_market_view_static.py`

### Docs / planning
- `PLAN.md` *(if execution starts and progress must be reflected there)*

---

## 9. Testing & Validation Plan

### Static / contract checks
- `python3 -m py_compile backend/main.py backend/database.py`
- `python3 -m compileall -q frontend/js`
- `cd backend && /opt/swingaq/backend/venv/bin/pytest -q tests/test_market_view_static.py test_api_e2e.py`

### Browser verification
- Desktop viewport: verify fold pertama hierarchy
- Tablet viewport: verify pulse panels no overlap
- Mobile viewport: verify section order + tap targets + no cramped cards
- Browser console: no JS errors

### Visual acceptance checklist
- Hero area langsung menjawab kondisi market
- Source/status metadata lebih tenang dan tidak noisy
- Market Pulse tidak redundant
- No overlapping semantics between lead/top
- Fold pertama nyaman discan dalam 3–5 detik
- Mobile tidak terasa sekadar desktop yang ditumpuk

---

## 10. Risks / Trade-offs

1. **Menambah terlalu banyak polish tanpa menyederhanakan IA**
   - Risiko: page tetap terasa “cantik tapi ramai”.
   - Mitigasi: selesaikan struktur informasi dulu sebelum visual polish.

2. **Frontend memalsukan semantic distinctions**
   - Risiko: `lead` vs `top` misleading.
   - Mitigasi: merge sekarang, pisahkan hanya jika backend punya definisi nyata.

3. **Over-design untuk data yang belum stabil**
   - Risiko: UI terlalu canggih tapi source data kosong/partial.
   - Mitigasi: trust-state dan empty-state harus dirancang dari awal.

4. **Responsive by CSS only tanpa reorder content**
   - Risiko: mobile tetap lemah walau technically responsive.
   - Mitigasi: reorder content untuk mobile use case.

---

## 11. Recommended Final Scope for Next Execution Pass

Jika ingin hasil maksimal tanpa over-boil, saya sarankan next implementation dibagi 3 paket:

### Paket A — First Fold Excellence
- header cleanup
- pulse copy rewrite
- IHSG hero refinement
- Market Pulse redesign 4-panel

### Paket B — Section Intelligence
- internals strip
- breadth visualization
- movers list refinement
- foreign/broker/catalyst section cleanup

### Paket C — Trust + Mobile Excellence
- mobile reorder
- freshness/status UX
- empty/loading/error microcopy
- final responsive polish

---

## 12. Senior Recommendation (What I would do first)

Kalau saya yang memimpin redesign ini, saya akan **mulai dari menyederhanakan semantik fold pertama** dulu:
1. hapus redundancy `lead` vs `top`
2. bikin hero area lebih editorial dan lebih tegas
3. jadikan `Market Pulse` hanya 4 panel penting
4. pindahkan source metadata ke rail kecil
5. baru setelah itu bereskan grid bawah dan mobile order

Itu akan memberi dampak UX terbesar paling cepat.

---

## 13. Open Questions Before Execution

1. Anda mau `lead gainer/loser` **dihapus** atau **dipertahankan dengan definisi baru**?
2. Anda ingin tone copy full Indonesia atau bilingual tetap boleh?
3. Untuk first fold, Anda prefer gaya:
   - **lebih terminal/professional dense**, atau
   - **lebih editorial/luxury spacious**?
4. Apakah `Market Overview` ini ingin lebih fokus ke:
   - trader intraday,
   - swing trader,
   - atau general investor?

---

## 14. Execution Update

### Done — Phase 6.1 freshness/status treatment
- `frontend/js/views/market.js`
  - tambah `freshnessTone()` untuk klasifikasi `Live Session`, `Data Delayed`, `Mixed Sources`, `Partial Data`
  - tambah panel `market-data-quality` di header kanan
  - session pill sekarang mengikuti trust/freshness state, bukan sekadar warna perubahan indeks
  - source rail tetap ringkas, tapi sekarang quality note menampilkan konteks source campuran/terlambat

### Done — Phase 6.2 microcopy normalization
- `frontend/js/views/market.js`
  - tambah helper `emptyState()` untuk empty state yang konsisten dan actionable
  - empty state gainers/losers/foreign/corporate actions/broker/announcements diganti ke copy Indonesia yang lebih profesional
- `frontend/style.css`
  - tambah style `.market-data-quality`
  - tambah style `.market-empty-rich`
  - tambah tone variant untuk `.market-session-pill.is-warn` dan `.market-session-pill.is-muted`

### Validation
- `cd backend && /opt/swingaq/backend/venv/bin/pytest -q tests/test_market_view_static.py` ✅
- `python3 -m py_compile backend/main.py backend/database.py` ✅
- `python3 -m compileall -q frontend/js` ✅

### Current Status
- **Status:** IMPLEMENTED LOCALLY — belum deploy/push

### Done — Phase 6.3 broker activity fallback hardening
- `backend/main.py`
  - import `BrokerSummary` di bootstrap utama agar endpoint broker tidak perlu dynamic import berulang
  - tambah helper `_derived_broker_activity_rows()` berbasis latest OHLCV snapshot untuk fallback hidup saat tabel `broker_summary` kosong
  - `/api/broker-activity` sekarang prioritas pakai snapshot DB asli, lalu otomatis turun ke snapshot `derived` jika feed broker belum ada
- `backend/test_api_e2e.py`
  - tambah regression test untuk fallback `derived` saat `broker_summary` kosong
  - tambah regression test bahwa snapshot DB tetap menang bila row broker nyata tersedia
- Validasi RED/GREEN:
  - `/opt/swingaq/backend/venv/bin/python -m pytest -q backend/test_api_e2e.py -k broker` ✅
