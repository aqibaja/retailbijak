# RetailBijak Growth + UI/UX Queue Plan

> **For Hermes:** ini mode planning only. Jangan implementasi kode dari dokumen ini sebelum user memilih slice eksekusi.

**Goal:** menyusun antrean tugas implementasi terbaik berikutnya untuk RetailBijak, dengan prioritas tinggi pada peningkatan value produk, kualitas data, dan UI/UX yang terasa lebih premium serta hidup.

**Architecture:** pertahankan arsitektur sekarang: FastAPI + SQLite + vanilla JS SPA. Fokus roadmap dibagi menjadi 3 lapis: (1) trust/data quality, (2) decision-support features yang benar-benar membantu user trading/investing, (3) UI/UX polish agar setiap route terasa lebih actionable, konsisten, dan tidak kosong.

**Tech Stack:** FastAPI, SQLAlchemy, SQLite, APScheduler, vanilla JS SPA, LightweightCharts, Chart.js, pytest static/runtime guards, public resource-chain checker.

---

## 1. Context Ringkas

### Kondisi saat ini
- Shell SPA, dashboard, market, screener, stock detail, news, portfolio, settings, help sudah ada.
- Guard deploy/frontend parity/public resource chain sudah cukup kuat.
- Banyak surface copy/UI sudah lebih konsisten Indonesia.
- Scanner live sudah diarahkan ke OHLCV, bukan bergantung penuh ke `signals` table.
- UI sudah jauh lebih rapi, tetapi masih ada peluang besar untuk naik kelas dari “bagus” menjadi “terminal analisis yang benar-benar membantu keputusan”.

### Pain points / peluang terbesar
1. **Decision support belum cukup dalam**
   - user melihat data dan sinyal, tapi belum dapat “mengapa sekarang penting”.
2. **Summary backend-driven masih campur istilah teknikal mentah**
   - mis. `Below SMA20`, `Oversold`, `fair`, dst.
3. **Portfolio/watchlist belum terasa seperti workspace aktif**
   - belum ada performance insight, journal, alert context, atau next action.
4. **Market/dashboard belum cukup personal**
   - belum ada morning brief / watchlist-first / personalized quick actions.
5. **Empty/loading/error states bisa dibuat lebih premium lagi**
   - terutama di data tipis/sparse.
6. **Belum ada “workflow loop” harian user**
   - pagi cek pasar → scan → shortlist → review stock detail → simpan watchlist → pantau portfolio.

---

## 2. Prioritas Produk yang Paling Layak Dikerjakan

Urutan ini mempertimbangkan value user + dampak UI/UX + kompatibilitas arsitektur sekarang.

### P0 — High-impact next slices
1. **Normalisasi summary teknikal/fundamental ke bahasa keputusan yang natural**
2. **Upgrade portfolio menjadi performance cockpit**
3. **Upgrade watchlist menjadi actionable watchlist**
4. **Tambah stock detail thesis panel / bull vs bear case**
5. **Tambah dashboard personalized morning brief**

### P1 — Strong follow-up
6. **Scanner result explanation 2.0**
7. **Market breadth & sector rotation board yang lebih visual**
8. **Catalyst timeline per saham**
9. **Alert center / notification log internal**
10. **Screener preset builder ringan**

### P2 — Strategic but larger
11. **Portfolio journal & trade review**
12. **Multi-horizon stock scorecard**
13. **Backtest mini-lab untuk rule scanner**
14. **Data quality observability panel admin-lite**
15. **Personal workspace customization**

---

## 3. Detailed Queue per Initiative

---

## Initiative A — Natural Language Decision Layer

**Why:** ini ROI paling tinggi untuk kualitas experience. Data lama tetap dipakai, tapi presentasi menjadi jauh lebih manusiawi dan actionable.

### Outcome
- Semua route utama terasa “membimbing keputusan”, bukan hanya memuntahkan indikator.
- Residual mixed-language teknikal hilang.
- User lebih cepat menangkap bias, risk, dan next action.

### Scope
#### A1. Summary normalization engine
- Normalisasi phrase backend/front-end driven:
  - `Below SMA20` → `harga berada di bawah SMA20`
  - `Oversold` → `tekanan jual sudah dalam`
  - `Overbought` → `harga sudah jenuh beli`
  - `fair` → `valuasi wajar`
  - `weak` → `kualitas belum kuat`
- Letakkan helper normalization di backend bila summary sumbernya backend.
- Gunakan satu mapping terpadu agar dashboard/stock detail/market konsisten.

#### A2. “Apa artinya untuk saya?” copy blocks
Tambahkan pada `stock_detail.js`:
- `Bias Saat Ini`
- `Risiko Utama`
- `Pemicu Perubahan Bias`
- `Apa yang perlu ditunggu`

#### A3. Confidence explanation
- Bukan hanya `Keyakinan 61/100`
- Tambah penjelasan pendek:
  - `cukup layak dipantau, tetapi belum konfirmasi kuat`
  - `konfirmasi teknikal cukup kuat untuk akumulasi bertahap`

### Files likely to change
- `backend/main.py`
- `backend/indicators_extended.py`
- `frontend/js/views/stock_detail.js`
- `frontend/js/views/dashboard.js`
- `frontend/js/views/market.js`
- `frontend/js/api.js`
- tests baru di `backend/tests/`

### UI/UX uplift
- lebih sedikit jargon mentah
- lebih banyak kalimat keputusan
- card hierarchy lebih jelas: *bias → alasan → tindakan*

### Validation
- static guard banned phrases Inggris residual
- API contract tests untuk normalized summary
- browser QA live route `#stock`, `#dashboard`, `#market`

---

## Initiative B — Portfolio Performance Cockpit

**Why:** saat ini portfolio/watchlist masih CRUD-heavy. Padahal ini bisa jadi sticky feature utama.

### Outcome
- route `#portfolio` terasa seperti cockpit, bukan tabel biasa.
- user bisa lihat performa, winner/loser, exposure, dan next action cepat.

### Scope
#### B1. Portfolio KPI rail
Tambahkan first fold KPI:
- Nilai portofolio total
- Unrealized P/L nominal
- Unrealized P/L %
- Win rate posisi hijau vs merah
- Largest winner / largest drawdown

#### B2. Allocation breakdown
Visual cards/pie/bar sederhana:
- alokasi per sektor
- alokasi per saham terbesar
- concentration risk

#### B3. Position health cards
Setiap posisi punya mini health:
- trend searah/lawan posisi
- jarak ke support/resistance
- RR kasar terhadap basis harga beli
- catalyst status tersedia/tidak

#### B4. Next actions strip
Contoh copy:
- `3 posisi butuh review karena momentum melemah`
- `2 posisi mendekati resistance`
- `1 posisi drawdown > 8%`

### Files likely to change
- `backend/main.py`
- `backend/database.py` bila perlu field tambahan ringan
- `frontend/js/views/portfolio.js`
- `frontend/js/api.js`
- `frontend/style.css`
- tests portfolio contract/static baru

### UI/UX uplift
- first fold portfolio jadi hidup
- table didukung summary cards, bukan berdiri sendiri
- mobile tetap bisa konsumsi insight cepat

### Validation
- endpoint summary portfolio baru
- fallback empty state yang believable
- browser QA `#portfolio` desktop/mobile-ish layout

---

## Initiative C — Actionable Watchlist Workspace

**Why:** watchlist harus jadi shortlist kerja, bukan sekadar daftar ticker.

### Outcome
- watchlist punya reason, status, bias, dan next review date/state.

### Scope
#### C1. Watchlist metadata ringan
Tambah field opsional:
- `reason`
- `setup_type`
- `horizon`
- `target_note`
- `risk_note`
- `last_reviewed_at`

#### C2. Watchlist board UI
Mode cards/table hybrid:
- ticker
- alasan masuk watchlist
- bias saat ini
- catalyst terbaru
- quick action: buka detail / pindah ke portfolio / hapus

#### C3. Review queue
Buat section:
- `Perlu ditinjau hari ini`
- `Bias membaik`
- `Risiko meningkat`

### Files likely to change
- `backend/database.py`
- `backend/main.py`
- `frontend/js/views/portfolio.js`
- migration ringan/manual SQLite compatibility
- tests CRUD + UI static

### UI/UX uplift
- watchlist lebih terasa sebagai workflow tool
- ada alasan & konteks, bukan ticker telanjang

---

## Initiative D — Stock Detail Thesis Panel

**Why:** stock detail adalah halaman keputusan inti. Ini perlu naik satu level lagi.

### Outcome
- user bisa langsung melihat thesis singkat, bull case, bear case, trigger invalidation, dan catalyst map.

### Scope
#### D1. Thesis panel
Card besar baru:
- `Bull Case`
- `Bear Case`
- `Level Invalidation`
- `Konfirmasi Lanjutan`

#### D2. Catalyst timeline
Urutkan source berita/pengumuman menjadi timeline mini:
- waktu
- tipe catalyst
- source chip
- dampak potensial pendek

#### D3. Setup map visual
Di bawah chart/kanan chart:
- zone entry
- invalidation zone
- target ladder 1/2
- support/resistance visual chips

#### D4. Multi-timeframe compact summary
- harian
- swing mingguan
- positioning pendek

### Files likely to change
- `frontend/js/views/stock_detail.js`
- `backend/main.py`
- mungkin helper baru di backend untuk compose thesis payload
- tests static + contract

### UI/UX uplift
- halaman terasa seperti terminal analis profesional
- lebih sedikit scrolling membingungkan
- lebih banyak “so what?”

---

## Initiative E — Personalized Morning Brief Dashboard

**Why:** dashboard sekarang sudah rapi, tapi belum benar-benar jadi homepage kebiasaan harian.

### Outcome
- user masuk dashboard dan langsung mendapat brief yang relevan.

### Scope
#### E1. Morning brief / opening brief
Section atas:
- kondisi pasar hari ini
- sektor paling kuat/lemah
- 3 ticker pantau cepat
- 3 catalyst utama

#### E2. Watchlist-first dashboard mode
Jika watchlist ada:
- tampilkan watchlist pulse dulu sebelum general market cards

#### E3. Session-aware banner
Contoh mode:
- pra-pembukaan
- sesi berjalan
- setelah penutupan

#### E4. Quick actions yang lebih berguna
- buka ticker terakhir dilihat
- lanjutkan shortlist
- jalankan scan preset favorit

### Files likely to change
- `frontend/js/views/dashboard.js`
- `frontend/js/api.js`
- `backend/main.py`
- `frontend/style.css`

### UI/UX uplift
- dashboard terasa personal, bukan generik
- first fold jadi lebih berguna daripada sekadar informatif

---

## Initiative F — Screener Explanation 2.0

**Why:** screener akan jauh lebih kuat bila setiap hasil terasa explainable dan comparable.

### Outcome
- hasil scan lebih bisa dipercaya dan lebih mudah diprioritaskan.

### Scope
#### F1. Reason chips upgrade
Setiap row hasil scan punya chips jelas:
- `CCI kuat`
- `volume di atas rata-rata`
- `dekat support`
- `risk/reward menarik`

#### F2. Sort modes yang berguna
- terbaik menurut skor swing
- catalyst paling segar
- RR terbaik
- volume expansion tertinggi

#### F3. Compare mode
Panel mini untuk bandingkan 2-3 kandidat scan.

#### F4. Saved preset UX
- simpan preset filter favorit user
- quick toggle di toolbar

### Files likely to change
- `backend/scanner.py`
- `backend/main.py`
- `frontend/js/views/screener.js`
- `frontend/js/api.js`
- `backend/database.py` jika simpan preset di settings

### UI/UX uplift
- toolbar lebih powerful
- hasil scan lebih editorial dan lebih ranking-friendly

---

## Initiative G — Market Breadth + Sector Rotation Board

**Why:** route market bisa menjadi pusat konteks top-down yang sangat kuat.

### Outcome
- user paham “uang mengalir ke mana” lebih cepat.

### Scope
#### G1. Sector rotation cards
- sektor memimpin
- sektor melemah
- momentum perubahan per sektor

#### G2. Breadth heat blocks
- penguat/pelemah/flat
- distribusi breadth lebih visual

#### G3. Internal market pulse
- winners vs losers severity
- net foreign tone
- broker concentration tone

#### G4. Event radar
- corporate actions/high-priority announcements timeline

### Files likely to change
- `backend/main.py`
- `frontend/js/views/market.js`
- maybe helper aggregation backend

### UI/UX uplift
- route market naik kelas jadi control tower makro-mikro

---

## Initiative H — Alerts Center / Internal Notification Log

**Why:** user butuh tempat untuk melihat apa yang berubah, bukan hanya tarik data manual tiap kali.

### Outcome
- ada inbox internal ringan untuk perubahan penting.

### Scope
- scanner hit log
- watchlist ticker berubah bias
- catalyst baru untuk ticker watchlist
- posisi portfolio mendekati alert threshold

### Minimal version
- tanpa push notification eksternal dulu
- simpan di DB + tampilkan pada route baru `#alerts` atau panel dashboard

### Files likely to change
- `backend/database.py`
- `backend/main.py`
- `frontend/js/router.js`
- `frontend/js/views/alerts.js` (baru)
- `frontend/style.css`

### UI/UX uplift
- experience lebih proaktif
- user merasa workspace “bekerja untuknya”

---

## Initiative I — Portfolio Journal & Trade Review

**Why:** ini sangat sticky dan menaikkan value di luar sekadar scanner.

### Outcome
- user bisa catat alasan entry, hasil, dan evaluasi.

### Scope
- trade notes
- thesis before/after
- exit reason
- mistakes / lessons
- review cards mingguan

### Value
- produk lebih dari scanner; jadi operating system belajar trading user.

---

## Initiative J — Workspace Customization

**Why:** setelah fitur inti kuat, personalisasi akan meningkatkan kenyamanan dan retensi.

### Scope
- pin widget dashboard
- pilih CTA utama
- sort default screener
- hide/show cards tertentu
- compact mode / dense mode

### UI/UX uplift
- dashboard lebih cocok dengan gaya kerja user

---

## 4. UI/UX Master Improvement Themes

Ini tema lintas route yang sebaiknya diterapkan konsisten.

### Theme 1 — First-fold should always answer “what now?”
Setiap halaman utama harus menjawab tindakan berikutnya:
- Dashboard → apa fokus hari ini?
- Screener → kandidat mana dulu?
- Stock detail → entry sekarang atau tunggu?
- Portfolio → posisi mana perlu review?
- Watchlist → mana yang naik prioritas?

### Theme 2 — Replace blank/tabular feel with editorial decision blocks
- kurangi rasa “raw table app”
- tambah insight strips, status rails, action cards, summary chips

### Theme 3 — Stronger visual hierarchy
Prioritas visual per halaman:
1. bias/status utama
2. angka penting
3. alasan
4. next action
5. details/tables

### Theme 4 — Better micro-interactions
- skeleton lebih premium
- refresh states lebih jelas
- row hover/selection lebih meaningful
- toasts lebih spesifik dan actionable

### Theme 5 — Mobile deserves first-class summaries
- mobile bukan hanya shrink desktop
- setiap route perlu ringkasan top 1–3 insight di first fold

### Theme 6 — Trust cues everywhere
- source
- last updated
- no_data vs derived vs db
- confidence explanation
- fallback content harus jujur, bukan misleading

---

## 5. Recommended Execution Order

Kalau dikerjakan bertahap, urutan paling bagus:

### Phase Q1 — Decision Language + Stock Detail Depth
1. Initiative A — Natural Language Decision Layer
2. Initiative D — Stock Detail Thesis Panel

**Alasan:** paling cepat menaikkan perceived intelligence dan kualitas UX.

### Phase Q2 — Sticky User Workspace
3. Initiative B — Portfolio Performance Cockpit
4. Initiative C — Actionable Watchlist Workspace

**Alasan:** bikin user punya alasan balik rutin ke platform.

### Phase Q3 — Daily Workflow Upgrade
5. Initiative E — Personalized Morning Brief Dashboard
6. Initiative F — Screener Explanation 2.0

**Alasan:** menyatukan loop harian user dari top-down ke bottom-up.

### Phase Q4 — Advanced Control Tower
7. Initiative G — Market Breadth + Sector Rotation Board
8. Initiative H — Alerts Center

### Phase Q5 — Retention / Premium Layer
9. Initiative I — Portfolio Journal & Trade Review
10. Initiative J — Workspace Customization

---

## 6. Best Immediate Next Slice Recommendation

Kalau harus pilih **1 task terbaik berikutnya**, saya rekomendasikan:

## **Next Best Task: Stock Detail Intelligence Upgrade**
Gabungkan scope kecil-menengah dari Initiative A + D.

### Kenapa ini terbaik
- route `#stock` adalah halaman keputusan paling penting
- dampak UX langsung terlihat user
- reuse data yang sudah ada
- tidak perlu migrasi besar dulu
- cocok dengan progress cleanup copy yang baru selesai

### Sub-scope ideal
1. normalisasi summary teknikal/fundamental ke bahasa Indonesia natural
2. tambah `Bull Case / Bear Case / Trigger Invalidation / Konfirmasi Lanjutan`
3. tambah confidence explanation
4. rapikan timeline catalyst mini
5. perkuat setup map visual

### Expected impact
- halaman saham terasa jauh lebih premium
- user lebih cepat ambil keputusan
- fondasi untuk portfolio/watchlist insight berikutnya jadi lebih kuat

---

## 7. Suggested Concrete Backlog Tickets

Berikut kandidat ticket yang siap dieksekusi satu per satu.

### Ticket 1 — Normalize backend-driven stock summaries
**Type:** backend + frontend polish  
**Impact:** high  
**Complexity:** medium

### Ticket 2 — Add stock thesis panel (bull/bear/invalidation)
**Type:** frontend-heavy + payload composition  
**Impact:** very high  
**Complexity:** medium

### Ticket 3 — Add portfolio KPI cockpit
**Type:** backend aggregate + UI cards  
**Impact:** very high  
**Complexity:** medium

### Ticket 4 — Add watchlist reasons + review queue
**Type:** DB + CRUD + UI/UX  
**Impact:** high  
**Complexity:** medium-high

### Ticket 5 — Add personalized dashboard morning brief
**Type:** aggregate endpoint + dashboard UX  
**Impact:** high  
**Complexity:** medium

### Ticket 6 — Add screener compare mode
**Type:** frontend interaction  
**Impact:** medium-high  
**Complexity:** medium

### Ticket 7 — Add alerts center
**Type:** backend event model + new route  
**Impact:** high  
**Complexity:** medium-high

### Ticket 8 — Add sector rotation visual board
**Type:** market analytics + UI  
**Impact:** medium-high  
**Complexity:** medium

### Ticket 9 — Add portfolio journal
**Type:** sticky feature  
**Impact:** high  
**Complexity:** high

### Ticket 10 — Add workspace customization
**Type:** settings/UI system  
**Impact:** medium  
**Complexity:** medium

---

## 8. Validation Strategy for Future Slices

Setiap slice implementasi sebaiknya tetap mengikuti pola yang sudah berhasil:

1. **Audit dulu** route live + source terkait
2. **TDD RED** dengan static/contract test baru
3. **Implement minimal but complete**
4. **Compile/test/runtime parity/public check**
5. **Browser QA live**
6. **Update `PLAN.md`**
7. **Commit + push**

### Minimum commands yang biasanya dipakai
- `pytest -q <relevant-tests>`
- `python -m compileall -q frontend/js`
- `python -m py_compile scripts/check_public_resource_chain.py`
- `python scripts/check_frontend_runtime_parity.py`
- `python scripts/check_public_resource_chain.py`

---

## 9. Risks / Trade-offs

### Risk 1 — Feature creep di vanilla SPA
Mitigasi:
- tetap modular per view
- normalisasi di `api.js` atau backend helper, bukan logic acak di banyak tempat

### Risk 2 — SQLite + sparse data limits
Mitigasi:
- fallback derived data harus jujur
- jangan bergantung pada tabel yang belum terisi stabil

### Risk 3 — UI jadi terlalu padat
Mitigasi:
- prioritaskan hierarchy
- gunakan collapsible/secondary sections
- mobile summary tetap singkat

### Risk 4 — Inconsistent semantics antar route
Mitigasi:
- buat shared helper/mapping untuk status/bias/summary labels

---

## 10. Recommended Next Action for User

Jika ingin eksekusi paling bernilai dulu, pilih salah satu:

1. **Stock Detail Intelligence Upgrade** ← rekomendasi utama
2. **Portfolio Performance Cockpit**
3. **Personalized Morning Brief Dashboard**
4. **Actionable Watchlist Workspace**

---

## 11. Execution Recommendation

Urutan kerja terbaik saya:
1. kerjakan **Stock Detail Intelligence Upgrade** dulu,
2. lanjut **Portfolio Performance Cockpit**,
3. lalu **Watchlist Workspace**,
4. baru **Dashboard Morning Brief**.

Itu akan membuat RetailBijak terasa jauh lebih premium, lebih membantu keputusan, dan UI/UX-nya naik kelas secara nyata — bukan hanya kosmetik.
