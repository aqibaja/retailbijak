# RetailBijak × IDX-API Integration Guide

Dokumen ini menjelaskan cara RetailBijak memakai IDX-API sebagai sumber data harian utama agar aplikasi lebih mudah dipakai, tetap hidup, dan tidak blank saat data live belum lengkap.

## Status Saat Ini
- Backend dan frontend inti sudah terhubung dan terverifikasi.
- Browser smoke test untuk dashboard, stock detail, scanner, portfolio, dan settings sudah lolos.
- Backend contract test inti juga sudah lolos.
- Fokus berikutnya adalah menjaga stabilitas contract, bukan membangun integrasi dari nol.

## Tujuan
- memakai IDX-API sebagai sumber data real harian
- menyimpan hasil sync lokal agar frontend cepat
- membuat dashboard, detail saham, screener, dan portfolio lebih mudah dipakai
- memastikan UI tetap ada fallback/demo content ketika data kosong

---

## Prinsip Integrasi

1. **IDX-API adalah source data harian**, bukan realtime tick-by-tick.
2. **Backend RetailBijak hanya membaca API lokal/ter-cache**.
3. **Frontend tidak boleh fetch langsung ke source eksternal**.
4. **Jika data live belum tersedia, tampilkan fallback**.
5. **Semua endpoint penting harus punya test**.
6. **Contract response dijaga stabil dan terdokumentasi**.

---

## Alur Data yang Disarankan

```text
IDX-API
  -> sync harian
  -> SQLite lokal IDX cache
  -> backend RetailBijak
  -> normalization layer
  -> scanner/scoring engine
  -> frontend SPA
```

---

## Data yang Paling Penting untuk RetailBijak

### Dashboard
- market snapshot
- top movers
- news feed
- sector snapshot
- index summary

### Stock Detail
- company profile
- daily price
- financial ratio
- financial report
- dividend history
- broker summary
- stock summary

### Screener
- daily price snapshot
- valuation proxy
- swing score
- gorengan score
- dividend score
- risk label

### Portfolio
- watchlist
- user positions
- price snapshot
- profit/loss view

---

## Standard Response Internal

Agar frontend gampang dipakai, response internal sebaiknya distandarkan seperti ini:

```json
{
  "ticker": "BBCA",
  "name": "Bank Central Asia Tbk",
  "trade_date": "2026-04-29",
  "close": 10250,
  "change_pct": 1.2,
  "volume": 12345678,
  "market_cap": 1200000000000,
  "per": 19.3,
  "pbv": 3.8,
  "roe": 15.2,
  "dividend_yield": 2.1,
  "swing_score": 84,
  "value_score": 72,
  "gorengan_score": 18,
  "dividend_score": 65,
  "risk_label": "medium",
  "scan_tags": ["buy_candidate", "liquid"]
}
```

---

## Backend Tasks yang Perlu Ada

### 1. IDX API client adapter
- base URL configurable
- retry + timeout
- JSON parse
- safe fallback

### 2. Normalizer
- ubah response API ke format internal konsisten
- uppercase ticker
- aman untuk null / string / number

### 3. Daily sync job
- fetch harian
- update cache lokal
- lanjut walau satu endpoint gagal

### 4. Scoring engine
- swing score
- value score
- gorengan score
- dividend score

### 5. Scanner engine
- filter saham
- hasil siap pakai untuk frontend
- tidak blank saat data belum lengkap

---

## UI Rules untuk RetailBijak

### Jangan blank
Kalau data kosong, isi dengan:
- skeleton loader
- demo card
- fallback chart
- placeholder summary

### Mobile wajib nyaman
- menu utama harus terlihat
- aksi utama mudah dijangkau
- chart tidak merusak layout
- tabel bisa scroll horizontal

### First fold harus hidup
Dashboard harus langsung menampilkan:
- KPI
- top movers
- satu chart ringkas
- call-to-action

---

## Dokumentasi Pendukung

File yang relevan di project ini:

- `planning/README.md`
- `planning/API_SPEC.md`
- `planning/TASKS.md`
- `docs/IDX_API_BACKEND_LIVE.md`
- `docs/FRONTEND_BACKEND_INTEGRATION_AUDIT.md`

---

## Rekomendasi Implementasi Bertahap

1. pasang adapter IDX-API
2. normalisasi response
3. bikin cache harian
4. sambungkan dashboard
5. sambungkan stock detail
6. sambungkan screener
7. tambah fallback UI
8. verifikasi mobile
9. tambah test
10. commit + push

---

## Target Hasil

RetailBijak harus terasa:

- cepat
- stabil
- ada data nyata
- tetap hidup walau data live belum lengkap
- mudah dipakai untuk analisis harian
