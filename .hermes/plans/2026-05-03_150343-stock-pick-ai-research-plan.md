# Stock Pick by AI for RetailBijak — Research & Implementation Plan

> **For Hermes:** planning/research only. Jangan implementasi sebelum user menyetujui slice eksekusi pertama.

**Goal:** merancang fitur baru **Stock Pick by AI** untuk RetailBijak yang terasa premium, explainable, dan realistis secara engineering — bukan sekadar chatbot yang menebak saham.

**Architecture:** fitur ini sebaiknya dibangun sebagai **ranking + explanation layer**, bukan AI murni end-to-end. Backend menghitung candidate universe dan feature scores dari data internal (OHLCV, fundamental, news/catalyst, breadth, scanner metrics), lalu AI dipakai terutama untuk *explanation synthesis*, *thesis formatting*, dan *user-facing decision language*. Dengan pendekatan ini, hasil lebih stabil, bisa diuji, lebih murah, dan lebih mudah di-debug.

**Tech Stack:** FastAPI, SQLAlchemy, SQLite, existing scanner/indicator stack, vanilla JS SPA, optional LLM provider via existing gateway user (`9router`) bila nanti diaktifkan, pytest static/contract/runtime tests.

---

## 1. Research Summary — What “Stock Pick by AI” Should Mean Here

### Kesimpulan utama
Untuk RetailBijak, **AI stock pick terbaik bukan model yang langsung bilang “beli BBCA” dari nol**.
Yang paling masuk akal adalah sistem 4-layer:

1. **Universe filter**  
   Menentukan saham layak masuk kandidat dari seluruh IDX.

2. **Scoring engine**  
   Menghitung skor explainable berdasarkan faktor teknikal, fundamental, liquidity, catalyst, dan risk.

3. **Ranking / pick selection**  
   Menghasilkan top picks per mode: swing, defensif, value, momentum, catalyst, dll.

4. **AI explanation layer**  
   Mengubah hasil mesin menjadi thesis yang enak dibaca:
   - kenapa dipilih
   - apa bull case / bear case
   - entry / invalidation / target idea
   - apa yang harus ditunggu user

### Kenapa bukan LLM murni?
Karena LLM murni punya masalah:
- hallucination tinggi
- sulit dites
- mahal bila dipakai ke banyak ticker
- tidak stabil antar-run
- sulit dipercaya untuk ranking sistematis

### Prinsip desain yang direkomendasikan
- **AI = narrator + thesis writer + explainer**
- **Rules/scoring = selector utama**
- **Semua pick harus punya alasan terstruktur**
- **Fallback tanpa AI tetap harus jalan**
- **Setiap pick harus jujur tentang source & confidence**

---

## 2. Product Vision

Fitur ini bukan cuma “list saham rekomendasi”.
Target experience:

### User story ideal
User buka halaman **Stock Pick AI** lalu langsung melihat:
- top 5 picks hari ini
- masing-masing ada skor, confidence, horizon, reason chips
- thesis singkat yang enak dibaca
- risk notes dan invalidation
- tombol cepat ke detail saham / watchlist / scanner compare

### Produk yang terasa premium harus punya:
1. **Pick of the Day / Best Ideas**
2. **Mode pilihan**: Swing / Momentum / Defensive / Value / Catalyst
3. **Explainability**: bukan black box
4. **Actionability**: ada next step
5. **Honesty**: no_data / derived / confidence jelas
6. **UI hidup**: tidak kosong, ada fallback preview state yang believable

---

## 3. Recommended Feature Shape

## Route baru
### `#ai-picks`
Route baru khusus untuk AI stock picks.

### First fold yang direkomendasikan
#### Hero section
- `Stock Pick AI`
- subtitle: “ide saham terkurasi dari sinyal teknikal, kualitas emiten, dan katalis terbaru”
- source/confidence rail
- quick filters

#### Summary strip
- jumlah kandidat dianalisis
- mode aktif
- pick terbaik hari ini
- market tone / breadth context

#### Main content
- featured top pick card
- top 5 ranked picks
- AI thesis panel
- market regime context
- “mengapa pick hari ini berubah?”

#### Secondary content
- compare candidates
- rejected but close candidates
- catalyst monitor
- saved to watchlist quick actions

---

## 4. Recommended User Modes

Jangan hanya satu list. Buat beberapa mode agar fitur terasa berguna untuk banyak gaya user.

### Mode A — SwingAQ AI Picks
Fokus:
- setup swing 2–10 hari
- volume, momentum, support/resistance, RR

### Mode B — Momentum AI Picks
Fokus:
- strength + volume expansion + trend continuation

### Mode C — Defensive AI Picks
Fokus:
- likuiditas bagus, drawdown lebih terkendali, kualitas emiten relatif lebih aman

### Mode D — Value / Re-rating Picks
Fokus:
- valuasi lebih masuk akal + technical base building

### Mode E — Catalyst Picks
Fokus:
- news / announcement / corporate actions / unusual catalyst context

### Mode F — Watchlist AI Picks
Fokus:
- hanya dari saham yang user sudah pantau
- bikin produk terasa personal

---

## 5. Core System Design

## Layer 1 — Candidate Universe Builder

### Objective
Menyaring saham yang layak masuk perhitungan.

### Candidate filters yang direkomendasikan
- ada data OHLCV minimal N hari (mis. 60–120)
- harga valid
- volume minimum rata-rata
- tidak terlalu illiquid
- opsional: exclude saham yang datanya terlalu tipis

### Output shape
```json
{
  "ticker": "BBCA",
  "eligible": true,
  "reasons": ["has_history", "liquid_enough"]
}
```

---

## Layer 2 — Factor Engine

Setiap saham dihitung di beberapa dimensi.

### A. Technical factor
Contoh komponen:
- trend vs SMA20/SMA50
- MACD bias
- RSI regime
- volume ratio
- proximity to support/resistance
- ATR-based tradability

### B. Fundamental factor
Contoh komponen:
- ROE quality
- DER leverage risk
- valuation rough label (cheap/fair/expensive)
- revenue/profit data availability

### C. Liquidity factor
Contoh komponen:
- avg traded value
- avg volume
- spread proxy jika ada

### D. Catalyst factor
Contoh komponen:
- fresh news/announcement available
- relevance score to ticker
- positive/neutral/uncertain catalyst tone

### E. Risk factor
Contoh komponen:
- volatility
- drawdown depth recent
- overextended move
- weak confirmation despite score

### F. Market regime factor
Contoh komponen:
- breadth market
- sector leadership
- global/market mood proxy dari data internal yang tersedia

### Output factor shape
```json
{
  "ticker": "BBCA",
  "factors": {
    "technical": 74,
    "fundamental": 63,
    "liquidity": 92,
    "catalyst": 48,
    "risk": 58,
    "market_regime_fit": 66
  }
}
```

---

## Layer 3 — Pick Ranking Engine

### Formula philosophy
Gunakan weighted scoring berbeda per mode.

### Example
#### Swing mode
- technical 35%
- liquidity 20%
- risk-adjusted RR 20%
- catalyst 15%
- fundamental 10%

#### Defensive mode
- fundamental 30%
- liquidity 25%
- technical 20%
- risk 15%
- catalyst 10%

#### Catalyst mode
- catalyst 35%
- technical 25%
- liquidity 20%
- risk 10%
- fundamental 10%

### Output ranking shape
```json
{
  "ticker": "BBCA",
  "mode": "swing",
  "score": 78.4,
  "confidence": 72,
  "rank": 1,
  "reason_codes": [
    "trend_above_key_levels",
    "volume_supportive",
    "rr_acceptable",
    "liquid_large_cap"
  ]
}
```

---

## Layer 4 — AI Explanation Layer

Ini layer yang membuat fitur terasa “AI”.

### Recommended AI responsibilities
- ringkas alasan pick menjadi natural language
- tulis bull case / bear case
- ubah factor scores jadi thesis manusiawi
- buat action phrasing yang ringkas
- jelaskan confidence

### AI should NOT decide alone
AI tidak boleh menjadi satu-satunya selector.
Selector tetap ranking engine.

### Example AI output
```json
{
  "ticker": "BBCA",
  "headline": "Kandidat defensif paling stabil di sesi ini",
  "thesis": "BBCA menonjol karena likuiditas kuat, struktur harga relatif rapi, dan profil risiko lebih terkendali dibanding kandidat lain.",
  "bull_case": "Jika harga bertahan di area support dan volume tetap sehat, peluang continuation swing masih terbuka.",
  "bear_case": "Jika momentum gagal pulih dan area invalidation ditembus, setup berubah menjadi wait-and-see.",
  "action_note": "Lebih cocok dipantau untuk entry bertahap daripada dikejar agresif.",
  "confidence_note": "Keyakinan menengah karena struktur teknikal cukup baik, tetapi katalis jangka pendek belum dominan."
}
```

---

## 6. UX Design Recommendation

## Route name
- `AI Picks`
- atau `Pilihan AI`
- saya sarankan UI bilingual brand style: **Stock Pick AI** sebagai nama fitur, dengan copy isi tetap Indonesia.

## Core layout
### Section 1 — Hero + market regime rail
Tampilkan:
- mode aktif
- jumlah kandidat
- market tone
- last updated
- source badges

### Section 2 — Featured pick
Card besar untuk rank #1:
- ticker, nama, score, confidence
- thesis ringkas
- bull/bear case
- entry / invalidation / target idea
- quick buttons

### Section 3 — Ranked ideas list
Top 5–10 picks:
- skor
- confidence
- reason chips
- horizon chip
- small catalyst tag
- quick add to watchlist

### Section 4 — Why these names now?
Editorial panel:
- momentum memimpin
- value mulai menarik
- catalyst tertentu aktif

### Section 5 — Rejected but close
Sangat bagus untuk trust.
Tampilkan 3 ticker yang hampir lolos dan alasan kenapa belum.
Contoh:
- `skor teknikal kuat, tapi risk terlalu tinggi`
- `valuasi oke, tapi volume belum mendukung`

### Section 6 — Compare drawer
Pilih 2-3 pick lalu bandingkan:
- score
- confidence
- trend
- catalyst
- risk
- fit per mode

---

## 7. Must-Have Explainability Rules

Setiap pick wajib punya:
- `score`
- `confidence`
- `horizon`
- `top 3 reasons`
- `top risk`
- `source`
- `updated_at`

### Confidence should mean something
Misalnya:
- 80–100: konfirmasi kuat & faktor selaras
- 60–79: layak dipantau / setup masuk akal
- 40–59: ide spekulatif / butuh konfirmasi
- <40: jangan tampil sebagai top pick utama

### Rejection reasons matter
Agar user percaya sistem tidak asal pilih.

---

## 8. Recommended MVP

## MVP scope yang realistis
Saya sarankan MVP **tanpa LLM dulu**, tetapi dengan struktur siap-AI.

### MVP v1
- route baru `#ai-picks`
- backend endpoint ranking picks
- mode: `swing`, `defensive`, `catalyst`
- factor engine sederhana
- top 5 picks + top 3 reasons + risk note
- featured pick card
- compare ringan
- save to watchlist
- fallback no-data state yang believable

### Why MVP without LLM first?
- lebih cepat dibangun
- lebih mudah dites
- lebih murah
- bisa validasi UX/value dulu
- nanti tinggal tambah LLM sebagai enhancement layer

---

## 9. Recommended V2

### V2 = AI explanation on top of MVP
Setelah ranking engine stabil:
- panggil LLM hanya untuk top N picks, bukan semua universe
- cache hasil explanation
- tampilkan thesis panel yang lebih kaya
- optional “ask AI why this pick?”

### Optional enhancements
- personalize by watchlist/portfolio
- daily brief summary generated by AI
- compare mode narrative
- “what changed since yesterday?”

---

## 10. Data Contract Recommendation

## Backend endpoint suggestion
### `GET /api/ai-picks?mode=swing&limit=5`

Response example:
```json
{
  "mode": "swing",
  "updated_at": "2026-05-03T15:00:00+07:00",
  "source": "derived",
  "market_context": {
    "breadth": "mixed",
    "tone": "defensive",
    "latest_date": "2026-05-03"
  },
  "summary": {
    "candidates_analyzed": 220,
    "eligible_count": 74,
    "featured_ticker": "BBCA"
  },
  "data": [
    {
      "ticker": "BBCA",
      "name": "Bank Central Asia Tbk.",
      "rank": 1,
      "score": 78.4,
      "confidence": 72,
      "horizon": "swing",
      "fit_label": "defensif berkualitas",
      "reason_codes": ["trend_stable", "liquid", "rr_ok"],
      "reason_labels": ["tren relatif rapi", "likuiditas kuat", "risk/reward masih masuk akal"],
      "risk_note": "katalis jangka pendek belum dominan",
      "entry_idea": "wait for pullback",
      "entry_zone": 5850,
      "invalidation": 5800,
      "target_zone": 6150,
      "catalyst": {
        "available": true,
        "label": "pengumuman emiten tersedia"
      },
      "ai": null
    }
  ]
}
```

### V2 endpoint with AI explanation
Tambahkan field `ai`.

---

## 11. Backend Architecture Proposal

### Create dedicated module(s)
Disarankan jangan taruh semua di `main.py` langsung.

#### Candidate files
- `backend/ai_picks.py` ← ranking engine utama
- `backend/ai_pick_factors.py` ← factor calculators
- `backend/ai_pick_explanations.py` ← formatter / optional LLM layer
- `backend/tests/test_ai_picks_*.py`

### Function boundaries
- `build_candidate_universe(session, mode)`
- `compute_pick_factors(ticker, rows, fundamentals, context)`
- `score_pick(factors, mode)`
- `rank_picks(candidates, mode, limit)`
- `compose_pick_payload(pick)`
- `generate_ai_pick_explanation(pick_payload)` optional v2

### Important note
Karena project ini masih punya `main.py` besar, extraction modular kecil akan jauh lebih sehat daripada menambah logika ranking panjang langsung di route handler.

---

## 12. Frontend Architecture Proposal

### New view
- `frontend/js/views/ai_picks.js`

### API helper
- tambah `fetchAiPicks(mode, limit)` di `frontend/js/api.js`

### Router
- route baru `#ai-picks`

### UI blocks to build
- hero shell
- mode switch tabs/chips
- featured pick card
- ranked list cards
- compare tray
- no-data / partial-data state
- loading skeleton state

### Reuse opportunities
- chips, stat-tiles, CTA buttons, action bars, source rails, badges
- card language style dari dashboard/market/stock_detail terbaru

---

## 13. UI/UX Recommendations Specific to This Feature

### A. Jangan tampil seperti daftar sinyal mentah
Harus terasa seperti **curated idea desk**.

### B. Featured card must be strong
Top pick #1 harus punya visual prominence yang jelas.

### C. Reasons should be chips + narrative
Contoh:
- `Likuiditas kuat`
- `Volume mendukung`
- `Dekat area pantau`
- `Katalis tersedia`

### D. Use “why not” cards
Ini trust booster besar.

### E. Market context harus selalu ada
Pick tanpa konteks market akan terasa random.

### F. Jangan overclaim
Hindari copy seperti:
- “pasti naik”
- “rekomendasi beli terbaik”
Lebih baik:
- “kandidat paling menarik saat ini”
- “layak dipantau”
- “fit terbaik untuk mode ini”

### G. Mobile summary first
Di mobile, featured pick + top 3 alasan + quick action harus muncul cepat.

---

## 14. Risk & Safety Notes

### Product risk
User bisa salah persepsi bahwa ini advisory absolut.

### Mitigasi UI copy
Tambahkan note ringan:
- `Bersifat ide terstruktur, bukan saran investasi personal.`
- `Gunakan bersama disiplin risiko dan analisis mandiri.`

### Engineering risk
- data sparse → ranking misleading
- catalyst coverage tidak merata
- LLM explanation bisa drift dari data

### Mitigasi engineering
- source labels wajib
- confidence note wajib
- fallback non-AI wajib
- explanation harus berasal dari payload terstruktur, bukan prompt bebas

---

## 15. Recommended Phased Implementation

## Phase 1 — MVP ranking engine (tanpa LLM)
**Goal:** route `#ai-picks` hidup dengan picks derived yang explainable.

### Tasks high-level
1. buat endpoint `GET /api/ai-picks`
2. buat candidate builder
3. buat factor scoring dasar
4. buat ranked payload
5. buat route frontend `#ai-picks`
6. buat featured + ranked cards
7. add save-to-watchlist quick action
8. add tests + browser QA

## Phase 2 — Better reasoning & compare UX
**Goal:** trust dan kegunaan meningkat.

### Tasks
1. add rejection reasons
2. add compare tray
3. add market regime explanation
4. add watchlist-only mode

## Phase 3 — AI narrative layer
**Goal:** menambahkan rasa “AI” yang kuat tapi tetap aman.

### Tasks
1. integrate optional explanation composer
2. add thesis panel
3. cache explanation per ticker/mode/date
4. add “what changed since prior run?”

## Phase 4 — Personalization
**Goal:** picks terasa milik user.

### Tasks
1. prioritize watchlist/portfolio context
2. favorite modes
3. user settings for risk style
4. morning brief integration

---

## 16. Best MVP Scope Recommendation

Kalau mau fitur ini cepat jadi dan tetap bagus, saya sarankan **MVP scope tepat** seperti ini:

### Build now
- `#ai-picks`
- top 5 picks
- 3 modes: `swing`, `defensive`, `catalyst`
- score + confidence + reasons + risk
- featured card
- market context
- compare lite
- add to watchlist

### Do NOT build yet
- full LLM auto-pick for all tickers
- chat interface dulu
- backtest lab dulu
- user personalization yang terlalu dalam
- external notification dulu

---

## 17. Concrete Files Likely to Change

### Backend
- `backend/main.py`
- `backend/ai_picks.py` ← new
- `backend/ai_pick_factors.py` ← new
- `backend/tests/test_ai_picks_api.py` ← new
- `backend/tests/test_ai_picks_scoring.py` ← new
- `backend/tests/test_ai_picks_fallback.py` ← new

### Frontend
- `frontend/js/api.js`
- `frontend/js/router.js`
- `frontend/js/views/ai_picks.js` ← new
- `frontend/style.css`

### Optional later
- `backend/ai_pick_explanations.py` ← new (V2)
- `backend/tests/test_ai_pick_explanations.py`

---

## 18. Testing Strategy Recommendation

### Backend tests
- candidate eligibility logic
- score ranking order
- mode-specific weighting differences
- no-data fallback shape
- market context shape

### Frontend static tests
- route registered
- featured card hooks present
- compare hooks present
- no-data state copy present
- explainability labels present

### Runtime/browser checks
- route renders normal
- no console errors
- empty/fallback state believable
- mode switching works
- quick add to watchlist works

---

## 19. Recommended Naming & Copy

### Feature names candidates
- `Stock Pick AI` ← best
- `Pilihan AI`
- `Idea Desk AI`
- `AI Picks`

### Recommended labels
- `Pick Unggulan`
- `Kandidat Teratas`
- `Mengapa Masuk Pilihan`
- `Risiko Utama`
- `Hampir Lolos`
- `Konteks Pasar`
- `Keyakinan`
- `Mode Swing`
- `Mode Defensif`
- `Mode Katalis`

---

## 20. Final Recommendation

### Kesimpulan research
Fitur **Stock Pick by AI** sangat layak untuk RetailBijak, **asal dibangun sebagai explainable ranking system dengan AI sebagai explanation layer**, bukan AI black box.

### Rekomendasi terbaik
Mulai dari:
1. **MVP non-LLM yang solid**
2. validasi UX + trust
3. baru tambahkan AI narrative layer di V2

### Kenapa ini approach terbaik
- lebih cepat dirilis
- lebih stabil
- bisa dites
- bisa dipoles UI/UX dengan kuat
- bisa tumbuh menjadi fitur premium yang benar-benar membedakan RetailBijak

---

## 21. Recommended Next Action

Kalau mau saya lanjut, langkah terbaik berikutnya adalah:

### **buat implementation plan detail untuk MVP `#ai-picks`**
Isi plan itu nanti akan mencakup:
- task TDD per langkah
- exact files
- payload API
- design route baru
- UI/UX hooks
- verification & deploy

Itu menurut saya next step paling tepat.