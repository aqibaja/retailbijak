# RetailBijak — Mobile Dark Mode Rescue Plan

## Goal

Memperbaiki tampilan **dark mode di mobile** yang saat ini terlalu terang/abu, belum responsif, dan terasa buruk di layar kecil. Targetnya: dark mode mobile benar-benar **hitam / near-black**, layout rapi di HP, dan semua halaman utama nyaman dipakai tanpa merusak desktop.

## Background / Context

- Proyek: `RetailBijak`
- Fokus keluhan: dark mode mobile terlihat jelek, tidak cukup hitam, dan belum responsive.
- User meminta **full plan fokus mobile**.
- Prinsip produk:
  - dark mode harus terasa hitam / near-black, bukan abu kusam
  - mobile dan desktop boleh beda layout
  - dashboard/market/screener/settings harus nyaman di HP
  - jangan mengorbankan desktop saat memperbaiki mobile

## Current Suspected Issues

1. **Token dark mode belum benar-benar hitam** di beberapa surface.
2. **Mobile spacing & grid** masih terlalu desktop-like.
3. **Topbar / sidebar / bottom nav** belum optimal untuk layar kecil.
4. **Market Overview** dan dashboard mungkin masih punya layout yang terlalu lebar.
5. Ada kemungkinan **inline styles hardcoded** yang mengganggu dark mode mobile.
6. Beberapa panel/kartu mungkin masih terlalu terang karena shadow/border/background token.

## Proposed Approach

### Phase 1 — Audit dark mode mobile
- Audit token warna di `frontend/style.css`:
  - background base
  - panel / elevated / card surfaces
  - border / divider / shadow
  - text primary / muted / dim
- Audit view utama yang paling sering dipakai di mobile:
  - `frontend/js/views/dashboard.js`
  - `frontend/js/views/market.js`
  - `frontend/js/views/screener.js`
  - `frontend/js/views/news.js`
  - `frontend/js/views/portfolio.js`
  - `frontend/js/views/stock_detail.js`
  - `frontend/js/views/settings.js`
- Identifikasi hardcoded color / inline background / border yang bikin mobile dark mode terasa terang.

### Phase 2 — Rebuild dark mode mobile tokens
- Ubah dark mode supaya basisnya benar-benar near-black:
  - body background lebih gelap
  - panel/card sedikit lebih terang dari base, tapi tetap black-ish
  - border lebih halus
  - shadow lebih subtil
- Pastikan semantic colors tetap aman:
  - up = hijau
  - down = merah
  - warning/info tetap jelas

### Phase 3 — Responsive layout per page
- **Dashboard**:
  - stack layout jadi 1 kolom di mobile
  - kurangi card padding
  - chart dan summary harus fit layar
- **Market**:
  - susun card vertikal di mobile
  - hindari 2-column layout yang bikin sempit
  - loading state dan cards harus tetap enak dilihat
- **Screener**:
  - filter panel full width
  - hasil list jadi single-column
  - tombol dan chip mudah ditekan
- **Settings**:
  - form controls full width
  - spacing lebih lega tapi tidak boros
- **Stock detail**:
  - chart container dan side panel harus stack
  - metrics harus terbaca tanpa horizontal scroll yang mengganggu
- **Portfolio / News**:
  - card list lebih rapat
  - teks dan badge tetap jelas

### Phase 4 — Topbar, sidebar, bottom nav mobile
- Pastikan mobile UX memakai navigasi yang jelas:
  - topbar ringkas
  - sidebar disembunyikan / ditukar dengan bottom nav
  - bottom nav jelas, kontras, dan mudah dijangkau jempol
- Brand/logo di mobile dark mode harus tetap terlihat.
- Ticker strip harus tidak memakan terlalu banyak tinggi layar.

### Phase 5 — Polish components
- Rapikan komponen yang paling sering muncul:
  - card / panel
  - table / row
  - button / chip / badge
  - modal / search overlay
  - loading / skeleton / empty state
- Pastikan font size mobile tidak terlalu kecil.
- Pastikan card shadows tidak membuat surface terlihat abu.

### Phase 6 — Validation & rollout
- Compile check frontend JS.
- Browser QA pada ukuran mobile:
  - iPhone SE
  - iPhone 14 / 15
  - Pixel / Android umum
  - tablet kecil bila perlu
- Test route utama:
  - `#dashboard`
  - `#market`
  - `#screener`
  - `#settings`
  - `#stock/BBCA`
- Verify:
  - dark mode benar-benar gelap
  - layout tidak overflow
  - navigation enak dipakai
  - tidak ada console error
- Sync ke production `/opt/swingaq/` setelah final.
- Update `PLAN.md` setiap subtask selesai.
- Commit + push final.

## Files Likely to Change

- `frontend/style.css`
- `frontend/js/views/dashboard.js`
- `frontend/js/views/market.js`
- `frontend/js/views/screener.js`
- `frontend/js/views/news.js`
- `frontend/js/views/portfolio.js`
- `frontend/js/views/stock_detail.js`
- `frontend/js/views/settings.js`
- `frontend/js/main.js` jika perlu
- `frontend/index.html` jika perlu meta/boot/layout
- `PLAN.md` untuk progress tracking

## Validation Checklist

- [ ] Dark mode mobile background benar-benar hitam / near-black
- [ ] Panel/card tetap punya depth tanpa terlihat abu kusam
- [ ] Teks utama dan muted text tetap terbaca
- [ ] Brand/logo visible di mobile
- [ ] Bottom nav mudah dipakai dengan jempol
- [ ] Market Overview dan Dashboard tidak overflow
- [ ] Screener dan Settings tetap nyaman di HP
- [ ] Tidak ada console error baru
- [ ] Production sync sukses dan health check hijau

## Suggested Execution Order

1. Audit token dan layout mobile dark mode
2. Fix global dark mode surfaces
3. Fix mobile layout per page
4. Polish components dan inline hardcoded styles
5. Browser QA mobile
6. Sync production, update `PLAN.md`, commit/push

## Notes

- Jangan sekadar invert light mode; dark mode harus dirancang ulang sebagai true dark / near-black.
- Mobile dan desktop boleh beda treatment.
- Prioritas tertinggi: readability, usable touch targets, dan visual depth.
