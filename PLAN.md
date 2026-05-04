# Phase 1: AI Picks — Data Flow Change (DB-only) · Phase 2: UI/UX Enhancement

> **Model routing:** planning/reasoning → `deepseek-v4-pro` · coding/execution → `deepseek-v4-flash`

---

## 🔍 Current State Assessment

### Data Flow (saat ini)

```
Scheduler (08:00 WIB)
  └→ generate_and_store_daily_ai_pick_report()
      ├→ build_ai_picks_payload()        ← scoring + ranking dari OHLCV
      ├→ build_ai_picks_llm_payload()    ← LLM brief (OpenRouter)
      └→ store to DailyAIPickReport DB   ← tersimpan

Frontend fetchAiPicks()
  └→ GET /api/ai-picks?mode=swing&limit=5&llm=true&refresh=false
      ├→ refresh=true  → generate_and_store() (regenerasi + LLM)
      ├→ refresh=false → get_latest_ai_pick_report() (dari DB)
      │                   └→ jika None → build_ai_picks_payload() (on-demand fallback)
      └→ llm=true  → inject LLM brief ke response
```

### UI Layout (saat ini — terlalu banyak section)

```
┌─────────────────────────────────────────┐
│  Hero: PREMARKET BRIEFING + mode switch  │
│  [Swing] [Defensive] [Catalyst] [Refresh]│
├─────────────────────────────────────────┤
│  Briefing Meta: 3 cards (Briefing, Gen,  │
│  Status)                                 │
├─────────────────────────────────────────┤
│  Summary Strip: 3 cards (Tone, Universe, │
│  Market Bias)                            │
├──────────────┬──────────────────────────┤
│  Featured    │  Compare Lite (sidebar)   │
│  Card        │  + AI Desk Brief          │
│  (full card) │                          │
├──────────────┴──────────────────────────┤
│  Ranked List: N full cards               │
│  (header, metric, thesis, entry/stop/tp, │
│   risk, factors, 4 action buttons each)  │
└─────────────────────────────────────────┘
```

### Key Issues

| Issue | Detail |
|-------|--------|
| **Refresh button** | User bisa refresh kapan saja → regenerasi on-demand, tidak sesuai "hanya sekali sehari" |
| **LLM on-demand** | `llm=true` dipanggil setiap load page → delay + beban ke OpenRouter setiap kali |
| **On-demand fallback** | Jika DB kosong, backend generate on-demand → bypass scheduler |
| **Terlalu banyak section** | Hero + briefing meta + summary strip + featured + compare + ranked = 6 section berbeda |
| **Full reload on mode switch** | Ganti mode (Swing→Defensive) → loading flash di semua section |
| **Compare Lite tidak jelas** | Sidebar "Compare Lite" membingungkan — user jarang pakai |
| **Kartu terlalu berat** | Setiap kartu punya: ticker, nama, fit_label, score, confidence, metric strip, reason chips, thesis, entry/stop/tp, risk, factor meters, 4 action buttons |
| **AI Desk Brief terisolasi** | Brief AI disimpan di sidebar compare, bukan bagian terintegrasi |
| **Loading state flashy** | Setiap fetch ulang menampilkan skeleton + loading text |

---

## 🎯 Target End State

### Phase 1 — Data Flow: Scheduler-only + DB-read

```
Scheduler (08:00 WIB)
  └→ generate_and_store_daily_ai_pick_report() ← satu-satunya yg generate
      └→ store to DB

Frontend fetchAiPicks()
  └→ GET /api/ai-picks?mode=swing
      └→ get_latest_ai_pick_report() from DB
          └→ jika None → return fallback "briefing belum tersedia"
          └→ TIDAK ADA on-demand generation

HILANG:
  - Parameter `refresh` di frontend & backend
  - Parameter `llm` di frontend
  - On-demand fallback ke build_ai_picks_payload()
  - Tombol "Manual Refresh" di UI
```

### Phase 2 — UI/UX: Clean, Compact, Professional

```
┌─────────────────────────────────────────┐
│  Compact Hero                           │
│  AI Picks Hari Ini · [Swing|Def|Cat]    │
│  ┌────────┬─────────┬──────────┐        │
│  │Tone    │Universe │Market    │        │
│  │defensive│20 kandidat│melemah │        │
│  └────────┴─────────┴──────────┘        │
│  Brief: Premarket briefing 2026-05-04   │
│  ↓ AI Desk Brief (collapsible)          │
├─────────────────────────────────────────┤
│  Unified Compact Card List               │
│                                          │
│  #1 BUMI  ·  80.3  Keyakinan 80          │
│  Entry 236-244  Stop 230  TP 259  RR 1:9 │
│  [tren..] [volume..] [pullback..]        │
│  Thesis: BUMI cocok untuk mode swing...  │
│  [Buka Detail] [Simpan]  ▸▶              │
│  ─── faktor (expandable) ───             │
│                                          │
│  #2 GOTO  ·  75.9  Keyakinan 75          │
│  Entry 53-55  Stop 52  TP 58  RR 2.0    │
│  [tren..] [volume..] [pullback..]        │
│  [Buka Detail] [Simpan]  ▸▶              │
│  ...                                     │
└─────────────────────────────────────────┘
```

---

## 📁 Files Affected

| File | Phase | Change Type | Scope |
|------|-------|-------------|-------|
| `backend/services/openrouter_llm.py` | 1 | **Modify** | Hapus `build_ai_picks_llm_payload` dari endpoint public (optional — bisa tetap ada untuk scheduler) |
| `backend/ai_picks.py` | 1 | **Modify** | Hapus on-demand fallback di `get_latest_ai_pick_report()`, pastikan fungsi utama hanya dipanggil scheduler |
| `backend/main.py` | 1 | **Modify** | Ubah `/api/ai-picks` — hapus parameter `refresh`, `llm`, hapus on-demand generate. Hanya baca dari DB |
| `frontend/js/api.js` | 1 | **Modify** | Hapus `refresh` dan `llm` dari `fetchAiPicks()` |
| `frontend/js/views/ai_picks.js` | 2 | **Modify** | **Rewrite mayor** — layout compact, hapus compare tray, collapsible faktor, smoother mode switch |
| `frontend/style.css` | 2 | **Modify** | Tambah styling compact cards, collapsible, cleaner hero |
| `backend/tests/test_ai_picks_api.py` | 1 | **Modify** | Update test — hapus test yang pakai `refresh`/`llm`, pastikan DB-only flow |
| `backend/tests/test_ai_picks_view_static.py` | 2 | **Modify** | Update static guard sesuai layout baru |
| `backend/tests/test_nav_ai_picks_entry_static.py` | - | - | Tidak berubah |

---

## 🧪 Test Plan (TDD)

### Phase 1 — Data Flow Tests

| # | Guard | Assert |
|---|-------|--------|
| 1 | `GET /api/ai-picks` tanpa param → `source=db` atau fallback no_data | Response tidak mengandung `refresh` |
| 2 | `GET /api/ai-picks?refresh=true` → **ditolak** (400 / ignored) | Backend hapus/ignore param refresh |
| 3 | `GET /api/ai-picks?llm=true` → **ditolak** (400 / ignored) | Backend hapus/ignore param llm |
| 4 | Jika DB kosong → return fallback "briefing belum tersedia" | Tidak ada on-demand generate |
| 5 | `fetchAiPicks()` di `api.js` tidak lagi mengirim `refresh`/`llm` | Static guard file api.js |

### Phase 2 — UI/UX Tests

| # | Guard | Assert |
|---|-------|--------|
| 6 | Compact hero hooks ada | `ai-picks-hero-compact`, `ai-picks-summary-strip` |
| 7 | Unified card list hooks | `ai-picks-unified-list`, `ai-picks-compact-card` |
| 8 | Expandable faktor | `ai-picks-factor-expand`, `ai-picks-factor-expanded` |
| 9 | Hapus compare tray | elemen `ai-picks-compare-tray` TIDAK ada lagi |
| 10 | Hapus refresh button | `data-ai-picks-refresh` TIDAK ada |
| 11 | AI Desk Brief collapsible | `ai-picks-brief-collapsible`, toggle button |
| 12 | Mode switch tanpa loading flash | State dipertahankan saat ganti mode (skip reload jika data sudah ada) |

---

## ⚙️ Execution Plan

### Phase 1 — Data Flow (model: deepseek-v4-pro → planning, deepseek-v4-flash → coding)

#### Step 1.1 — Backend: hapus `refresh` & `llm` dari endpoint `/api/ai-picks`
- `backend/main.py` line 134-157
- Hapus parameter `refresh: bool = False` dan `llm: bool = False`
- Endpoint hanya panggil `get_latest_ai_pick_report(mode=mode, db=db)`
- Jika None → return fallback `build_ai_picks_fallback_payload(mode, trading_date=_current_jakarta_trading_date())`
- Hapus blok `if refresh:` dan `if llm:` dan import `build_ai_picks_llm_payload`

#### Step 1.2 — Frontend: hapus `refresh` & `llm` dari `fetchAiPicks()`
- `frontend/js/api.js` — cari fungsi `fetchAiPicks`
- Hapus parameter `refresh` dan `llm` dari URL builder
- Sederhanakan jadi: `fetch(\`/api/ai-picks?mode=${mode}&limit=${limit}\`)`

#### Step 1.3 — Hapus method on-demand dari ai_picks.py
- Di `build_ai_picks_payload()` — pastikan tidak dipanggil dari endpoint
- Atau biarkan saja untuk scheduler, hanya endpoint yang diubah

#### Step 1.4 — Test
- Update test yang bergantung pada `refresh` / `llm`
- Pastikan DB-only flow berfungsi

### Phase 2 — UI/UX Enhancement (model: deepseek-v4-flash)

#### Step 2.1 — Hero redesign
- Compact hero: judul "AI Picks Hari Ini" + mode switch (Swing/Defensive/Catalyst) inline
- Summary strip 3 card (Tone, Universe, Market Bias) langsung di bawah hero
- Info briefing (tanggal, generated_at, status) sebagai satu baris metadata
- **Hapus**: tombol "Manual Refresh"

#### Step 2.2 — AI Desk Brief → collapsible
- Pindah AI Desk Brief dari sidebar compare ke section collapsible di bawah summary strip
- Default: collapsed (closed), hanya judul "AI Desk Brief" + status icon
- Expand: tampilkan full brief + pick notes
- Model chip tetap ada

#### Step 2.3 — Unified compact card list
- Hapus **Compare Lite** section dan sidebar
- **Hapus** Featured Card (merge ke ranked list)
- Satu list berisi semua picks sebagai compact cards:
  - Header: rank + ticker + score
  - 1 baris: Entry/Stop/TP/RR
  - Reason chips (max 2)
  - Thesis (1 line)
  - Action: [Buka Detail] [Simpan] + expand toggle
  - Expandable: faktor meters (Teknikal/Likuiditas/Fundamental/Katalis) + risk notes

#### Step 2.4 — Smoother mode switch
- Cache hasil per-mode di memori (object `modeCache = {}`)
- Saat ganti mode:
  - Jika data mode tsb sudah pernah di-load → render dari cache (no loading)
  - Jika belum → loading hanya di card list area (bukan seluruh halaman)
- Persist `modeCache` di session/page lifetime

#### Step 2.5 — Remove pin feature
- Fitur "Pin Prioritas" (localStorage) jarang berguna dan menambah kompleksitas UI
- Simplifikasi: hanya "Simpan ke Watchlist" (backend persisten)

---

## 🧱 Layout Spec (Phase 2)

```
┌─────────────────────────────────────────────┐
│ AI Picks Hari Ini                            │
│ [Swing] [Defensive] [Catalyst]   Brief:  │
│ 2026-05-04 · generated 08:00               │
├────────────────┬──────────────┬─────────────┤
│ Tone           │ Universe     │ Market Bias │
│ defensive      │ 20 kandidat  │ melemah     │
├────────────────┴──────────────┴─────────────┤
│ ▸ AI Desk Brief (collapsed)                 │
│   ⓘ model: google/gemma-4-26b-a4b-it       │
├─────────────────────────────────────────────┤
│                                             │
│ ┌─ #1 BUMI ────────────────────── Score 80.3 ─┐ │
│ │ Bumi Resources Tbk · swing terkonfirmasi     │ │
│ │ Keyakinan 80 · konfirmasi teknikal cukup ... │ │
│ │ Entry 236-244  Stop 230  TP 259  RR 1:1.9   │ │
│ │ [tren di atas..] [volume dorong breakout..]  │ │
│ │ Thesis: BUMI cocok untuk mode swing karena   │ │
│ │ tren di atas rata-rata 20 hari...            │ │
│ │ [Buka Detail] [Simpan]  ▸ Faktor             │ │
│ │ ─ (expand) Teknikal 63 · Likuiditas 100  ─   │ │
│ └───────────────────────────────────────────────┘ │
│ ┌─ #2 GOTO ────────────────────── Score 75.9 ─┐ │
│ │ ...                                          │ │
│ └───────────────────────────────────────────────┘ │
│ ┌─ #3 BNBR ────────────────────── Score 74.9 ─┐ │
│ │ ...                                          │ │
│ └───────────────────────────────────────────────┘ │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## ⚠️ Risk & Mitigation

| Risk | Mitigation |
|------|------------|
| Scheduler gagal generate jam 08:00 → DB kosong seharian | Fallback: response "Briefing belum tersedia. Coba lagi nanti." + info kapan scheduler terakhir jalan. Jangan on-demand generate. |
| User buka AI Picks sebelum 08:00 | Tampilkan state "Briefing hari ini akan siap pukul 08:00 WIB. Data kemarin masih bisa diakses." |
| Mode switch loading masih terasa | Cache per-mode di memori — data yang sudah di-load tidak perlu fetch ulang |
| Collapsible AI Brief tidak intuitif | Gunakan ikon ▸/▾ yang standar, animasi smooth |
| Hapus pin fitur → user kehilangan data pin | Pin sebelumnya disimpan di localStorage, setelah hapus tombol otomatis tidak aktif. Data lama tidak hilang tapi tidak ada UI untuk mengaksesnya. |

---

## Progress Log

### 2026-05-04 — Phase 2 done (UI/UX enhancement)
- [x] **Step 2.1** — UI: Hero redesign compact (`ai-picks-compact-hero`, `ai-picks-hero-row`, `ai-picks-hero-title`)
- [x] **Step 2.2** — UI: AI Desk Brief collapsible (`ai-picks-brief-collapsible` with `<details>` toggle)
- [x] **Step 2.3** — UI: Unified compact card list (`ai-picks-card`, featured merged into list, `compare-tray` removed)
- [x] **Step 2.4** — UI: Smoother mode switch (`modeCache` in-memory, `extractHeroHtml`/`extractSummaryHtml` render from cache)
- [x] **Step 2.5** — UI: Remove pin, simplify actions to [Detail] [Simpan] [Faktor toggle]
- [x] **Test** — 37/37 passed, static guards updated for new classes
- [x] **Deploy** — sync CSS + JS ke `/opt/swingaq/`
- [x] **Browser QA** — live domain verified: new CSS classes loaded, API return DB data
- [x] **Commit & push**
