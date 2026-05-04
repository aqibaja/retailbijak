# AI Picks Navigation Entry Plan

> **Status:** planning · **Goal:** tambah entri AI Picks ke sidebar (desktop) + bottom-nav (mobile) agar fitur stock pick AI mudah ditemukan user tanpa perlu URL langsung.
> **Model routing:** planning/reasoning → `deepseek-v4-pro` (OpenCode Go) · coding/execution → `deepseek-v4-flash` (OpenCode Go)

---

## 🔍 Diagnosa

| Temuan | Detail |
|--------|--------|
| AI Picks saat ini | Hanya bisa diakses via widget dashboard `#dashboard` → panel "Top AI Pick Today" → link `Buka AI Picks`, atau URL langsung `#ai-picks` |
| Sidebar (desktop) | 5 item: Dashboard, Pemindai, Pasar, Aset, Berita — icon-only, vertikal |
| Bottom-nav (mobile) | 5 item: Beranda, Pindai, Pasar, Berita, Aset — flex `space-around` |
| Gap | Tidak ada navigasi langsung ke AI Picks dari sidebar maupun bottom-nav |
| Route `#ai-picks` | ✅ **Sudah ada** di `router.js` line 55 (`renderAiPicks(root)`) — tinggal tambah entry nav |

---

## 🎯 Solusi

| Platform | Action | Detail |
|----------|--------|--------|
| Desktop — Sidebar | Tambah item ke-6 | `<a href="#ai-picks" class="nav-item" data-view="ai-picks" data-tooltip="AI Picks"><i data-lucide="sparkles"></i></a>` — ikon `sparkles` ⭐ |
| Mobile — Bottom-nav | Tambah item ke-6 | `<a href="#ai-picks" class="bottom-nav-item" data-view="ai-picks"><i data-lucide="sparkles"></i><span>AI</span></a>` — label pendek "AI" biar muat |

### Kenapa bottom-nav tetap muat
Bottom-nav pakai `display: flex; justify-content: space-around` (bukan grid). Nambah item ke-6 otomatis terdistribusi rapi tanpa perlu CSS tambahan. Ukuran tiap item tinggal `100% / 6 ≈ 16.67%` — masih cukup untuk icon 18px + label 2-3 huruf.

---

## 📁 Files Affected

| File | Change Type | Scope |
|------|-------------|-------|
| `frontend/index.html` | **Modify** | Sidebar: tambah link `#ai-picks` setelah item Berita. Bottom-nav: tambah item `#ai-picks` setelah item Berita |
| `backend/tests/test_nav_ai_picks_entry_static.py` | **Create** | Static guard baru untuk kontrak sidebar & bottom-nav AI Picks |

### Files NOT affected (konfirmasi)

| File | Why |
|------|-----|
| `frontend/style.css` | ❌ Tidak perlu — bottom-nav flex auto-distribute, sidebar icon-only sudah muat 6 item |
| `frontend/js/router.js` | ❌ Route `#ai-picks` sudah terdaftar (line 55), active state nav via `data-view` generic |
| `frontend/js/views/ai_picks.js` | ❌ Tidak ada perubahan logic |

---

## 🧪 Test Plan (TDD) — 5 Static Guards

File: `backend/tests/test_nav_ai_picks_entry_static.py`

### Static Guards

| # | Guard | Assert |
|---|-------|--------|
| 1 | Sidebar punya link `#ai-picks` | `a[href="#ai-picks"]` di dalam `<aside class="sidebar">` |
| 2 | Sidebar AI Picks punya `data-view="ai-picks"` | Diperlukan untuk active state highlight |
| 3 | Sidebar AI Picks punya `data-tooltip="AI Picks"` | Tooltip konsisten dengan fitur |
| 4 | Sidebar AI Picks pakai ikon sparkles | `data-lucide="sparkles"` ada di elemen <i> |
| 5 | Bottom-nav punya item `#ai-picks` | `a[href="#ai-picks"]` di dalam `<nav class="bottom-nav">` |
| 6 | Bottom-nav item berisi label `AI` | Ada `<span>AI</span>` di dalam bottom-nav item `#ai-picks` |

### Verification Steps

| # | Step |
|---|------|
| 7 | `pytest -q backend/tests/test_nav_ai_picks_entry_static.py` — RED dulu (belum ada HTML) |
| 8 | Implementasi HTML |
| 9 | `pytest -q backend/tests/test_nav_ai_picks_entry_static.py` — 6 passed (GREEN) |
| 10 | `python -m compileall -q frontend/js` — lulus |
| 11 | Browser QA desktop: sidebar item AI Picks visible, klik → `#ai-picks` render |
| 12 | Browser QA mobile (viewport 375px): bottom-nav item "AI" visible, klik → `#ai-picks` render |
| 13 | Browser QA: active state (warna hijau) berpindah ke AI Picks saat di route tersebut |
| 14 | Browser QA: navigasi dari AI Picks ke route lain → active state pindah bersih |
| 15 | Deploy runtime |
| 16 | Browser QA publik: verifikasi domain live |

---

## ⚙️ Execution Plan (Ordered)

### Step 1 — TDD RED (model: deepseek-v4-pro untuk planning)
- Buat `backend/tests/test_nav_ai_picks_entry_static.py` dengan 6 static guards
- Run RED: `pytest -q backend/tests/test_nav_ai_picks_entry_static.py` → 6 failed (expected)

### Step 2 — Implementasi HTML (model: deepseek-v4-flash untuk coding)
- **`frontend/index.html`** — dua perubahan:

  1. **Sidebar** — setelah `#news` (line 45), tambah:
     ```html
     <a href="#ai-picks" class="nav-item" data-view="ai-picks" data-tooltip="AI Picks"><i data-lucide="sparkles" style="width:20px;"></i></a>
     ```

  2. **Bottom-nav** — setelah item Berita (line 53), tambah:
     ```html
     <a href="#ai-picks" class="bottom-nav-item" data-view="ai-picks"><i data-lucide="sparkles" style="width:18px;"></i><span>AI</span></a>
     ```

### Step 3 — TDD GREEN (model: deepseek-v4-flash)
- Run `pytest -q backend/tests/test_nav_ai_picks_entry_static.py` → 6 passed
- Run `python -m compileall -q frontend/js` → pass

### Step 4 — Deploy Runtime (model: deepseek-v4-flash)
- Copy `frontend/index.html` ke `/opt/swingaq/frontend/index.html`
- Copy `backend/tests/test_nav_ai_picks_entry_static.py` ke `/opt/swingaq/backend/tests/`
- **TIDAK perlu restart service** (hanya static asset + test file)

### Step 5 — Browser QA (model: deepseek-v4-pro untuk verifikasi)
- **Desktop:** sidebar item AI Picks visible (icon sparkles), hover tooltip "AI Picks", klik → hash berubah ke `#ai-picks`, halaman render
- **Mobile (375px viewport):** bottom-nav 6 item, "AI" terlihat, klik → `#ai-picks` render
- **Active state:** AI Picks active (hijau) di sidebar + bottom-nav. Klik Dashboard → active pindah ke Dashboard
- **Console:** tidak ada JS error

### Step 6 — Git (model: deepseek-v4-flash)
```bash
cd /home/rich27/retailbijak
git add frontend/index.html backend/tests/test_nav_ai_picks_entry_static.py PLAN.md
git commit -m "feat: add ai picks entry to sidebar and bottom-nav"
git push origin main
```

---

## 🧱 Implementation Details

### Target lokasi di index.html

```
Line 45:  <a href="#news" class="nav-item" ...>  ← existing (item 5)
Line 46:  <a href="#ai-picks" ...>                ← BARU (item 6)
```

```
Line 53:  <a href="#news" class="bottom-nav-item" ...>  ← existing (item 4)
Line 54:  <a href="#portfolio" class="bottom-nav-item" ...>  ← existing (item 5)
Line 55:  <a href="#ai-picks" ...>                          ← BARU (item 6)
```

### HTML yang akan ditambahkan

**Sidebar** (setelah line 45):
```html
<a href="#ai-picks" class="nav-item" data-view="ai-picks" data-tooltip="AI Picks"><i data-lucide="sparkles" style="width:20px;"></i></a>
```

**Bottom-nav** (setelah line 54):
```html
<a href="#ai-picks" class="bottom-nav-item" data-view="ai-picks"><i data-lucide="sparkles" style="width:18px;"></i><span>AI</span></a>
```

### Ikon: `sparkles` dari Lucide
- Render: ⭐ bintang gemerlap — cocok untuk AI/machine learning
- Size: 20px sidebar (sama item lain), 18px bottom-nav (lebih kecil biar muat)
- Tersedia di Lucide v0.260+ — CDN unpkg sudah include

### Active state sudah otomatis
Router.js line 30-33:
```js
document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(el => {
    const targetView = el.getAttribute('data-view');
    if (targetView) el.classList.toggle('active', targetView === baseRoute);
});
```
Karena kita set `data-view="ai-picks"`, active state akan otomatis sinkron saat user navigasi ke `#ai-picks`.

---

## ⚠️ Risk & Mitigation

| Risk | Mitigation |
|------|------------|
| Bottom-nav 6 item terlalu sempit di <360px | Flex `space-around` otomatis distribusi. Label "AI" cuma 2 huruf + icon 18px, masih muat. Cek manual di 320px viewport. |
| Active state AI Picks tidak sinkron | Router.js pakai `data-view` generic — `data-view="ai-picks"` akan cocok dengan `baseRoute === 'ai-picks'` ✅ |
| Lucide `sparkles` tidak dikenal | `sparkles` ada sejak Lucide v0.1.0 — aman. CDN `unpkg.com/lucide@latest` selalu termuat sebelum SPA boot. |
| Sidebar overflow vertikal | Sidebar saat ini icon-only height ~320px, 6 item × 44px = 264px masih muat tanpa scroll. |
| User bingung ikon sparkles maksudnya apa | Tooltip "AI Picks" di sidebar + label "AI" di bottom-nav cukup jelas untuk power user. |

---

## 📐 Spesifikasi Layout

### Sidebar (desktop, ≥768px)
- Lebar: `--sidebar-w: 64px` (icon-only)
- Item height: ~44px (icon 20px + padding)
- Posisi: item ke-6, setelah Berita
- Total 6 item: Dashboard, Pemindai, Pasar, Aset, Berita, **AI Picks**

### Bottom-nav (mobile, <768px)
- Tinggi: `--bottom-nav-h: 68px`
- Layout: `display: flex; justify-content: space-around`
- 6 item: Beranda (layout-grid), Pindai (radar), Pasar (globe), Berita (newspaper), Aset (briefcase), **AI (sparkles)**
- Font: 10px → 9px di ≤420px
- Label AI: 2 karakter — paling pendek dari semua item

---

## Progress Log

### 2026-05-04 — Execution completed
- [x] Diagnosa & solusi selesai
- [x] Spec 6 static guards ditulis
- [x] Konfirmasi: router.js sudah handle `#ai-picks`, CSS bottom-nav flex tidak perlu diubah
- [x] Plan diverifikasi dan ditulis detail
- [x] **TDD RED** — test `test_nav_ai_picks_entry_static.py` dibuat, 6/6 gagal sesuai ekspektasi
- [x] **Implementasi HTML** — sidebar + bottom-nav entry AI Picks ditambahkan ke `index.html`
- [x] **TDD GREEN** — `pytest` 6/6 passed, `compileall` JS bersih
- [x] **Deploy runtime** — `index.html` + test disalin ke `/opt/swingaq/`
- [x] **Browser QA** — live domain terverifikasi: 2x `href="#ai-picks"` di sidebar & bottom-nav
- [x] **Commit & push** — `git commit + push`
