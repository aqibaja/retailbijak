# AI Picks MVP Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** membangun MVP fitur baru **Stock Pick AI / AI Picks** di RetailBijak sebagai route baru `#ai-picks` dengan backend ranking engine explainable, mode picks awal (`swing`, `defensive`, `catalyst`), featured top pick card, ranked list, market-context rail, compare-lite, dan quick action ke watchlist/detail saham.

**Architecture:** MVP ini **tidak memakai LLM dulu**. Selector utama adalah backend ranking engine berbasis faktor terstruktur dari data yang sudah ada: OHLCV, indikator teknikal, fundamental, likuiditas, catalyst/news, dan market context. Frontend hanya menampilkan payload derived yang sudah explainable. Struktur dibuat siap untuk V2 agar nanti bisa ditambah AI narrative layer tanpa membongkar arsitektur.

**Tech Stack:** FastAPI, SQLAlchemy, SQLite, existing scanner/indicator helpers, vanilla JS SPA, existing `api.js` / `router.js`, pytest static + contract tests, compile/runtime/browser verification.

---

## Product Scope MVP

### In scope
- route baru `#ai-picks`
- endpoint baru `GET /api/ai-picks?mode=<mode>&limit=<n>`
- mode awal: `swing`, `defensive`, `catalyst`
- featured top pick
- top ranked picks list
- score + confidence + reason labels + risk note
- market context rail
- compare-lite state di frontend
- quick action `Tambah ke Daftar Pantau`
- clear fallback / partial-data state

### Out of scope
- integrasi LLM explanation
- personalisasi watchlist/portfolio mendalam
- backtesting lab
- alert center
- cron precompute kompleks
- external push notifications

---

## UX Acceptance Criteria

Saat user membuka `#ai-picks`, halaman harus:
1. terasa seperti **curated idea desk**, bukan tabel sinyal mentah
2. punya featured card untuk pick #1
3. menampilkan minimal 5 pick bila data cukup, atau fallback jujur bila tidak
4. menunjukkan mode aktif dengan switch yang jelas
5. menampilkan score, confidence, alasan utama, risk note, dan quick action
6. menampilkan market context (`tone`, `breadth`, `source`, `updated_at`)
7. bisa membandingkan 2–3 kandidat secara ringan di panel compare
8. mobile first-fold tetap informatif dan tidak kosong

---

## API Contract Target

### Endpoint
`GET /api/ai-picks?mode=swing&limit=5`

### Response target
```json
{
  "mode": "swing",
  "updated_at": "2026-05-03T15:00:00+07:00",
  "source": "derived",
  "market_context": {
    "tone": "defensive",
    "breadth_label": "campuran",
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
      "entry_style": "tunggu pullback",
      "entry_zone": 5850,
      "invalidation": 5800,
      "target_zone": 6150,
      "catalyst": {
        "available": true,
        "label": "pengumuman emiten tersedia"
      },
      "source": "derived"
    }
  ]
}
```

### No-data response target
```json
{
  "mode": "swing",
  "updated_at": null,
  "source": "no_data",
  "market_context": {
    "tone": "unknown",
    "breadth_label": "data belum cukup",
    "latest_date": null
  },
  "summary": {
    "candidates_analyzed": 0,
    "eligible_count": 0,
    "featured_ticker": null
  },
  "data": []
}
```

---

## Files Expected to Change

### Create
- `backend/ai_picks.py`
- `backend/tests/test_ai_picks_api.py`
- `backend/tests/test_ai_picks_scoring.py`
- `backend/tests/test_ai_picks_view_static.py`
- `frontend/js/views/ai_picks.js`

### Modify
- `backend/main.py`
- `frontend/js/api.js`
- `frontend/js/router.js`
- `frontend/style.css`
- optionally `PLAN.md` when implementation starts (bukan di plan-only turn ini)

### Optional helper extraction later if needed
- `backend/ai_pick_factors.py` (jika `ai_picks.py` mulai terlalu besar)

---

# Task 1: Define contract tests for `/api/ai-picks`

**Objective:** mengunci response shape AI Picks sebelum implementasi backend.

**Files:**
- Create: `backend/tests/test_ai_picks_api.py`
- Modify later: `backend/main.py`
- Reference: `backend/test_api_e2e.py`, `backend/main.py`

**Step 1: Write failing tests**

Create tests for:
- endpoint exists and returns `200`
- payload has keys: `mode`, `updated_at`, `source`, `market_context`, `summary`, `data`
- supported modes: `swing`, `defensive`, `catalyst`
- invalid mode falls back or returns safe validation error (recommend: safe fallback to `swing` or `400`; choose one and keep it explicit)
- `data` is always a list
- empty dataset returns valid no-data shape, not `500`

Suggested test names:
```python
def test_ai_picks_endpoint_returns_expected_top_level_shape(): ...
def test_ai_picks_endpoint_returns_list_for_data_even_when_empty(): ...
def test_ai_picks_endpoint_supports_known_modes(): ...
def test_ai_picks_endpoint_handles_unknown_mode_safely(): ...
```

**Step 2: Run test to verify failure**

Run:
```bash
pytest -q backend/tests/test_ai_picks_api.py
```
Expected: FAIL because route not implemented.

**Step 3: Minimal implementation target**
- add placeholder route in `backend/main.py`
- return valid static fallback shape first

**Step 4: Run test to verify pass**

Run:
```bash
pytest -q backend/tests/test_ai_picks_api.py
```
Expected: PASS

**Step 5: Commit**
```bash
git add backend/tests/test_ai_picks_api.py backend/main.py
git commit -m "feat: add ai picks api contract"
```

---

# Task 2: Build backend fallback endpoint with stable no-data contract

**Objective:** memastikan frontend bisa dibangun lebih dulu tanpa menunggu ranking engine selesai.

**Files:**
- Modify: `backend/main.py`
- Test: `backend/tests/test_ai_picks_api.py`

**Step 1: Extend tests if needed**
Add a test that checks:
- `source` is one of `derived`, `db`, `no_data`
- `summary` object has default numeric values

**Step 2: Run test to verify failure**
```bash
pytest -q backend/tests/test_ai_picks_api.py::test_ai_picks_endpoint_returns_expected_top_level_shape -v
```

**Step 3: Implement minimal safe payload**
Return hardcoded empty structure with selected mode echoed back.

**Step 4: Run tests to verify pass**
```bash
pytest -q backend/tests/test_ai_picks_api.py
```

**Step 5: Commit**
```bash
git add backend/main.py backend/tests/test_ai_picks_api.py
git commit -m "feat: add ai picks no-data fallback"
```

---

# Task 3: Add scoring-engine unit tests

**Objective:** lock behavior of ranking logic before implementing it.

**Files:**
- Create: `backend/tests/test_ai_picks_scoring.py`
- Create later: `backend/ai_picks.py`

**Step 1: Write failing tests**
Test pure functions, not route handlers first.

Suggested functions to target:
```python
score_pick(factors: dict, mode: str) -> dict
label_confidence(score: float, factors: dict) -> int
reason_labels_from_factors(factors: dict, mode: str) -> list[str]
```

Suggested test cases:
- higher technical + liquidity should rank better in `swing`
- higher fundamental + lower risk should rank better in `defensive`
- stronger catalyst should matter more in `catalyst`
- confidence always stays in 0–100
- reason labels are never empty for eligible picks

**Step 2: Run test to verify failure**
```bash
pytest -q backend/tests/test_ai_picks_scoring.py
```
Expected: FAIL because module/functions not present.

**Step 3: Implement minimal pure scoring module**
Create `backend/ai_picks.py` with:
- mode weights map
- pure `score_pick`
- pure confidence helper
- pure reason-label helper

**Step 4: Run tests to verify pass**
```bash
pytest -q backend/tests/test_ai_picks_scoring.py
```

**Step 5: Commit**
```bash
git add backend/ai_picks.py backend/tests/test_ai_picks_scoring.py
git commit -m "feat: add ai picks scoring engine"
```

---

# Task 4: Add candidate-universe builder using existing OHLCV + fundamentals

**Objective:** produce eligible candidates from data yang sudah ada tanpa bergantung pada tabel `signals`.

**Files:**
- Modify: `backend/ai_picks.py`
- Modify: `backend/main.py`
- Test: `backend/tests/test_ai_picks_api.py`
- Optional reference: `backend/scanner.py`, `backend/database.py`

**Step 1: Write failing tests**
Add tests that verify:
- rows with insufficient history are excluded
- endpoint still returns valid shape if eligible_count is `0`
- endpoint uses derived candidates even if `signals` table empty

**Step 2: Run tests to verify failure**
```bash
pytest -q backend/tests/test_ai_picks_api.py backend/tests/test_ai_picks_scoring.py
```

**Step 3: Implement minimal candidate builder**
Suggested behavior:
- query latest OHLCV coverage per ticker
- require minimum bars (e.g. 60)
- require minimum avg volume / last volume threshold
- load optional fundamentals if present
- build candidate dicts

Suggested function shapes:
```python
def build_candidate_universe(db, mode: str, limit_universe: int | None = None) -> list[dict]: ...
def summarize_market_context(db) -> dict: ...
```

**Step 4: Run tests to verify pass**
```bash
pytest -q backend/tests/test_ai_picks_api.py backend/tests/test_ai_picks_scoring.py
```

**Step 5: Commit**
```bash
git add backend/ai_picks.py backend/main.py backend/tests/test_ai_picks_api.py
git commit -m "feat: derive ai pick candidates from ohlcv"
```

---

# Task 5: Populate ranked payload for real picks

**Objective:** endpoint returns non-empty ranked data when DB coverage exists.

**Files:**
- Modify: `backend/ai_picks.py`
- Modify: `backend/main.py`
- Test: `backend/tests/test_ai_picks_api.py`

**Step 1: Write failing tests**
Add tests asserting each pick item contains:
- `ticker`
- `name`
- `rank`
- `score`
- `confidence`
- `fit_label`
- `reason_labels`
- `risk_note`
- `entry_style`
- `source`

If data exists in runtime DB, also assert sorted descending by score.

**Step 2: Run test to verify failure**
```bash
pytest -q backend/tests/test_ai_picks_api.py -v
```

**Step 3: Implement payload composer**
Suggested helper:
```python
def compose_pick_payload(candidate: dict, rank: int, mode: str) -> dict: ...
```
Include safe fallbacks for missing fundamentals/catalysts.

**Step 4: Run tests to verify pass**
```bash
pytest -q backend/tests/test_ai_picks_api.py backend/tests/test_ai_picks_scoring.py
```

**Step 5: Commit**
```bash
git add backend/ai_picks.py backend/main.py backend/tests/test_ai_picks_api.py
git commit -m "feat: return ranked ai picks payload"
```

---

# Task 6: Add frontend API helper for AI Picks

**Objective:** expose endpoint cleanly to frontend with stable fallback shape.

**Files:**
- Modify: `frontend/js/api.js`
- Test later: `backend/tests/test_ai_picks_view_static.py`

**Step 1: Write failing static test**
Create/extend `backend/tests/test_ai_picks_view_static.py` to require `fetchAiPicks` helper import/use.

**Step 2: Run test to verify failure**
```bash
pytest -q backend/tests/test_ai_picks_view_static.py
```

**Step 3: Implement minimal helper**
Add:
```javascript
export async function fetchAiPicks(mode = 'swing', limit = 5) {
  const safeMode = encodeURIComponent(mode || 'swing');
  const safeLimit = Number(limit || 5);
  return apiFetch(`/ai-picks?mode=${safeMode}&limit=${safeLimit}`) || {
    mode: mode || 'swing',
    updated_at: null,
    source: 'no_data',
    market_context: { tone: 'unknown', breadth_label: 'data belum cukup', latest_date: null },
    summary: { candidates_analyzed: 0, eligible_count: 0, featured_ticker: null },
    data: []
  };
}
```

**Step 4: Run test to verify pass**
```bash
pytest -q backend/tests/test_ai_picks_view_static.py
```

**Step 5: Commit**
```bash
git add frontend/js/api.js backend/tests/test_ai_picks_view_static.py
git commit -m "feat: add ai picks frontend api helper"
```

---

# Task 7: Register new route `#ai-picks`

**Objective:** make the SPA recognize and render the new page.

**Files:**
- Modify: `frontend/js/router.js`
- Create later: `frontend/js/views/ai_picks.js`
- Test: `backend/tests/test_ai_picks_view_static.py`

**Step 1: Write failing static tests**
Require:
- import `renderAiPicks`
- route branch for `ai-picks`
- fallback behavior remains safe

Suggested test names:
```python
def test_router_registers_ai_picks_view(): ...
def test_ai_picks_view_exports_render_function(): ...
```

**Step 2: Run test to verify failure**
```bash
pytest -q backend/tests/test_ai_picks_view_static.py
```

**Step 3: Implement minimal route wiring**
- import `renderAiPicks` from `./views/ai_picks.js?...`
- add branch in `handleRoute`

**Step 4: Run test to verify pass**
```bash
pytest -q backend/tests/test_ai_picks_view_static.py
```

**Step 5: Commit**
```bash
git add frontend/js/router.js backend/tests/test_ai_picks_view_static.py
git commit -m "feat: register ai picks route"
```

---

# Task 8: Build initial `ai_picks.js` view shell with loading/fallback states

**Objective:** create page shell yang terasa hidup bahkan sebelum data real ter-render.

**Files:**
- Create: `frontend/js/views/ai_picks.js`
- Modify: `frontend/style.css`
- Test: `backend/tests/test_ai_picks_view_static.py`

**Step 1: Write failing static tests**
Require page hooks like:
- `ai-picks-page`
- `ai-picks-hero`
- `ai-picks-mode-switch`
- `ai-picks-featured`
- `ai-picks-ranked-list`
- `ai-picks-compare`
- `ai-picks-empty`

**Step 2: Run test to verify failure**
```bash
pytest -q backend/tests/test_ai_picks_view_static.py
```

**Step 3: Implement minimal render shell**
View should:
- render hero
- mode tabs/chips
- featured skeleton card
- ranked list skeletons
- compare tray placeholder
- no-data shell helper
- call `lucide.createIcons()` and `observeElements()` as needed

**Step 4: Run test to verify pass**
```bash
pytest -q backend/tests/test_ai_picks_view_static.py
```

**Step 5: Commit**
```bash
git add frontend/js/views/ai_picks.js frontend/style.css backend/tests/test_ai_picks_view_static.py
git commit -m "feat: add ai picks view shell"
```

---

# Task 9: Hydrate AI Picks page with live backend data

**Objective:** connect frontend shell ke endpoint backend dan render featured + ranked content.

**Files:**
- Modify: `frontend/js/views/ai_picks.js`
- Modify: `frontend/js/api.js`
- Modify: `frontend/style.css`
- Test: `backend/tests/test_ai_picks_view_static.py`

**Step 1: Write failing static tests**
Require:
- use of `fetchAiPicks`
- rendering of featured card labels (`Pick Unggulan`, `Kandidat Teratas`, `Risiko Utama`, etc.)
- rendering of score/confidence/reason chips

**Step 2: Run test to verify failure**
```bash
pytest -q backend/tests/test_ai_picks_view_static.py
```

**Step 3: Implement hydration**
Render:
- featured top pick card from `data[0]`
- list cards for remaining picks
- market context rail
- summary strip
- empty state if `data.length === 0`

**Step 4: Run test to verify pass**
```bash
pytest -q backend/tests/test_ai_picks_view_static.py
```

**Step 5: Commit**
```bash
git add frontend/js/views/ai_picks.js frontend/style.css backend/tests/test_ai_picks_view_static.py

git commit -m "feat: render ai picks ranked content"
```

---

# Task 10: Add mode switch behavior (`swing`, `defensive`, `catalyst`)

**Objective:** allow user to switch pick styles without leaving the route.

**Files:**
- Modify: `frontend/js/views/ai_picks.js`
- Test: `backend/tests/test_ai_picks_view_static.py`

**Step 1: Write failing tests**
Require mode controls and state markers.

Suggested hooks:
- `data-ai-picks-mode`
- `data-ai-picks-active-mode`

**Step 2: Run tests to verify failure**
```bash
pytest -q backend/tests/test_ai_picks_view_static.py
```

**Step 3: Implement minimal mode switching**
- default `swing`
- click chip triggers re-fetch
- disable active chip state while loading
- preserve compare selections only if ticker still visible or reset safely

**Step 4: Run tests to verify pass**
```bash
pytest -q backend/tests/test_ai_picks_view_static.py
```

**Step 5: Commit**
```bash
git add frontend/js/views/ai_picks.js backend/tests/test_ai_picks_view_static.py
git commit -m "feat: add ai picks mode switching"
```

---

# Task 11: Add compare-lite tray

**Objective:** give users a practical way to compare 2–3 candidates.

**Files:**
- Modify: `frontend/js/views/ai_picks.js`
- Modify: `frontend/style.css`
- Test: `backend/tests/test_ai_picks_view_static.py`

**Step 1: Write failing tests**
Require:
- compare toggle hook per card
- compare tray container
- max compare count handling (2–3)

**Step 2: Run tests to verify failure**
```bash
pytest -q backend/tests/test_ai_picks_view_static.py
```

**Step 3: Implement minimal compare tray**
Show compact compare cards with:
- ticker
- score
- confidence
- fit label
- top reason
- risk note

**Step 4: Run tests to verify pass**
```bash
pytest -q backend/tests/test_ai_picks_view_static.py
```

**Step 5: Commit**
```bash
git add frontend/js/views/ai_picks.js frontend/style.css backend/tests/test_ai_picks_view_static.py
git commit -m "feat: add ai picks compare tray"
```

---

# Task 12: Add quick watchlist action from AI Picks cards

**Objective:** convert AI picks into immediate workflow action.

**Files:**
- Modify: `frontend/js/views/ai_picks.js`
- Use existing: `frontend/js/api.js`
- Test: `backend/tests/test_ai_picks_view_static.py`

**Step 1: Write failing tests**
Require CTA/button hooks for save-to-watchlist on featured and ranked cards.

**Step 2: Run tests to verify failure**
```bash
pytest -q backend/tests/test_ai_picks_view_static.py
```

**Step 3: Implement quick action**
Use existing `saveWatchlistItem({ ticker, notes })`.
Suggested note:
- `Ditambahkan dari AI Picks (mode swing)`

**Step 4: Run tests to verify pass**
```bash
pytest -q backend/tests/test_ai_picks_view_static.py
```

**Step 5: Commit**
```bash
git add frontend/js/views/ai_picks.js backend/tests/test_ai_picks_view_static.py
git commit -m "feat: add ai picks watchlist action"
```

---

# Task 13: Polish CSS for premium AI Picks experience

**Objective:** make the page feel premium and consistent with latest RetailBijak UI language.

**Files:**
- Modify: `frontend/style.css`
- Modify: `frontend/js/views/ai_picks.js`
- Test: `backend/tests/test_ai_picks_view_static.py`

**Step 1: Write failing tests**
Require class hooks for:
- featured prominence
- reason chips
- market context rail
- compare tray
- mobile summary stack

**Step 2: Run tests to verify failure**
```bash
pytest -q backend/tests/test_ai_picks_view_static.py
```

**Step 3: Implement styles**
Minimum selectors:
- `.ai-picks-page`
- `.ai-picks-hero`
- `.ai-picks-summary-strip`
- `.ai-picks-featured-card`
- `.ai-picks-rank-card`
- `.ai-picks-reason-chip`
- `.ai-picks-compare-tray`
- responsive block under `@media (max-width: 768px)`

**Step 4: Run tests to verify pass**
```bash
pytest -q backend/tests/test_ai_picks_view_static.py
```

**Step 5: Commit**
```bash
git add frontend/style.css frontend/js/views/ai_picks.js backend/tests/test_ai_picks_view_static.py
git commit -m "feat: polish ai picks ui"
```

---

# Task 14: End-to-end verification for MVP

**Objective:** verify backend, frontend, route, and fallback behavior together.

**Files:**
- Modify tests as needed
- Verify runtime/browser

**Step 1: Add/adjust final tests**
Make sure test coverage includes:
- API contract
- scoring engine
- static route/view hooks

**Step 2: Run full relevant suite**
```bash
pytest -q backend/tests/test_ai_picks_api.py backend/tests/test_ai_picks_scoring.py backend/tests/test_ai_picks_view_static.py
python -m compileall -q frontend/js
python -m py_compile backend/main.py backend/ai_picks.py
```
Expected: PASS

**Step 3: Browser/local verification**
Check route `#ai-picks`:
- page renders
- mode switch works
- featured card visible
- compare tray works
- watchlist add CTA works
- no console errors

**Step 4: Runtime/public verification after deploy**
If deploying:
```bash
python scripts/check_frontend_runtime_parity.py
python scripts/check_public_resource_chain.py
```
Then browser QA on public route.

**Step 5: Commit**
```bash
git add .
git commit -m "feat: ship ai picks mvp"
```

---

## Suggested Implementation Notes

### Backend factor suggestions for MVP
Keep simple and explainable.

#### Technical proxy
- above/below SMA20
- RSI regime
- MACD histogram sign
- volume ratio
- distance to support/resistance

#### Fundamental proxy
- ROE
- debt-to-equity
- valuation rough label

#### Liquidity proxy
- average recent volume
- average traded value if derivable

#### Catalyst proxy
- issuer announcement/news availability
- relevance score using ticker/title matching

#### Risk proxy
- overextended move
- volatility / ATR
- weak RR

### Confidence recommendation
Do not make confidence equal score directly.
Use a small clamp helper, for example:
- start from mode score
- subtract for missing catalyst / missing fundamental / weak risk profile
- clamp 35–95 for eligible picks

### Fit label recommendation
Map best style to short labels:
- `defensif berkualitas`
- `swing terkonfirmasi`
- `momentum dengan dukungan volume`
- `kandidat katalis`
- `base-building menarik`

---

## Risks / Trade-offs

### Risk 1 — Sparse data reduces pick quality
Mitigation:
- keep `source` explicit
- return fewer picks if confidence weak
- show honest fallback state

### Risk 2 — Scoring too arbitrary
Mitigation:
- pure tests per mode
- reason labels derived from factors
- do not overfit formulas too early

### Risk 3 — UI becomes too complex for MVP
Mitigation:
- ship compare-lite, not full comparison lab
- no LLM yet
- keep only 3 modes first

### Risk 4 — Main backend file grows too much
Mitigation:
- keep ranking logic in `backend/ai_picks.py`
- route handler in `main.py` should stay thin

---

## Recommended First Execution Slice

Kalau langsung dieksekusi, slice pertama terbaik adalah:

1. Task 1 — API contract tests
2. Task 2 — no-data fallback endpoint
3. Task 3 — scoring engine unit tests
4. Task 4 — candidate universe builder

Alasannya:
- frontend bisa dibangun di atas contract stabil
- selector logic bisa benar dulu
- UI tidak dibangun di atas payload yang belum mapan

---

## Definition of Done (MVP)

MVP dianggap selesai jika:
- `#ai-picks` route tersedia
- endpoint `/api/ai-picks` stabil
- 3 modes berjalan
- featured card + ranked list tampil
- compare-lite berfungsi
- add-to-watchlist berfungsi
- no-data state jujur dan tidak blank
- tests/compile/runtime checks lulus
- browser QA route lulus tanpa console error

---

## Final Recommendation

Jangan langsung lompat ke “AI explanation” / LLM layer.
Bangun dulu **selector engine yang explainable** dan route `#ai-picks` yang benar-benar usable. Setelah itu, layer AI bisa ditambahkan dengan jauh lebih aman dan premium.
