# Untranslated Hardcoded Text Audit

**Date:** May 15, 2026  
**Scope:** All frontend JS files and HTML  
**Total Untranslated Strings Found:** 220+

## Summary

This audit identifies all hardcoded text strings across the frontend that lack i18n translation using the `t()` function. These strings are currently hardcoded in Indonesian and should be moved to the translation system for proper i18n support.

---

## Audit by Category

### 1. Page Titles (document.title)

| File | Line | Text | Category |
|------|------|------|----------|
| ai_picks.js | 250 | `RetailBijak — AI Picks` | page_title |
| alerts.js | 22 | `RetailBijak — Alert Harga` | page_title |
| backtest.js | 15 | `RetailBijak — Backtesting` | page_title |
| compare.js | 41 | `RetailBijak — Perbandingan Saham` | page_title |
| dividend.js | 813 | `RetailBijak — Dividend Dashboard & Kalkulator` | page_title |
| help.js | 5 | `RetailBijak — Bantuan` | page_title |
| indices.js | - | (implied) | page_title |
| ipo.js | 290 | `RetailBijak — IPO Pipeline Tracker` | page_title |
| market.js | 175 | `RetailBijak — Pasar` | page_title |
| movers.js | 404 | `RetailBijak — Market Movers` | page_title |
| news.js | 40 | `RetailBijak — Berita` | page_title |
| paper_trades.js | 13 | `RetailBijak — Paper Trading` | page_title |
| screener.js | 68 | `RetailBijak — Pemindai` | page_title |
| settings.js | 13 | `RetailBijak — Pengaturan` | page_title |
| treemap.js | 303 | `RetailBijak — Treemap Pasar` | page_title |

### 2. Button Labels & Actions

| File | Line | Text | Category |
|------|------|------|----------|
| ai_picks.js | 234 | `▸ Faktor` / `▾ Faktor` | button_label |
| ai_picks.js | 242 | `Memuat...` | button_label |
| alerts.js | 399 | `Menyimpan…` | button_label |
| alerts.js | 424 | `Simpan` | button_label |
| backtest.js | 156 | `Memproses…` | button_label |
| backtest.js | 268 | `Jalankan` | button_label |
| movers.js | 488 | `⟳ Memuat...` | button_label |
| movers.js | 491 | `⟳ Refresh` | button_label |
| paper_trades.js | 432 | `Membuka...` | button_label |
| paper_trades.js | 459 | `Buka Posisi` | button_label |
| sector.js | 90 | `✕ Tutup` | button_label |
| sector.js | 94 | `🔄 Tampilkan` | button_label |
| sector.js | 576 | `⏳...` | button_label |
| sector.js | 627 | `🤖 Rotasi` | button_label |
| sector.js | 760 | `✕ Tutup Tabel Saham` | button_label |
| settings.js | 142 | `S` / `T` (toggle) | button_label |
| settings.js | 171 | `Sedang menyimpan...` | button_label |
| settings.js | 185 | `Simpan Konfigurasi` | button_label |
| settings.js | 191 | `Simpan Konfigurasi` | button_label |
| stock_detail.js | 159 | `✓ Dipantau` / `+ Pantau` | button_label |

### 3. Placeholder Text

| File | Line | Text | Category |
|------|------|------|----------|
| alerts.js | 53 | `Contoh: BBCA` | placeholder |
| alerts.js | 78 | `Contoh: 9500` | placeholder |
| backtest.js | 39 | `BBCA` | placeholder |
| compare.js | 66 | `Ketik kode saham (BBCA, BMRI...)` | placeholder |
| corporate.js | 59 | `Cari ticker atau nama perusahaan…` | placeholder |
| dividend.js | 313 | `Contoh: BBCA, TLKM, ASII` | placeholder |
| dividend.js | 398 | `Contoh: 9500` | placeholder |
| indices.js | 98 | `Cari konstituen…` | placeholder |
| paper_trades.js | 42 | `BBCA` | placeholder |
| paper_trades.js | 57 | `Otomatis dari data` | placeholder |
| paper_trades.js | 61 | `Strategi, alasan, dll` | placeholder |
| sector.js | 811 | `🔍 Cari kode/nama...` | placeholder |
| sector.js | 941 | `🔍 Cari sektor...` | placeholder |
| settings.js | 62 | `sk-or-...` | placeholder |
| settings.js | 70 | `https://retailbijak.rich27.my.id` | placeholder |
| settings.js | 75 | `RetailBijak` | placeholder |
| signal_overview.js | 99 | `Cari ticker…` | placeholder |

### 4. Error Messages

| File | Line | Text | Category |
|------|------|------|----------|
| backtest.js | 169 | `Error tidak diketahui` | error_message |
| backtest.js | 173 | `Gagal memuat` / `Backtest engine tidak merespon.` | error_message |
| backtest.js | 265 | `Error` / `Gagal menjalankan backtest` | error_message |
| backtest.js | 344 | `Gagal` / `Backtest pola tidak merespon.` | error_message |
| backtest.js | 351 | `Error` / `Gagal menjalankan backtest pola` | error_message |
| backtest.js | 364 | `Tidak Ada Data` / `Tidak cukup data historis...` | error_message |
| breadth.js | 94 | `⚠️ Gagal memuat data breadth` | error_message |
| breadth.js | 135 | `Chart library not loaded` | error_message |
| chart.js | 224 | `Data tidak tersedia` / `Tidak ada data harga untuk timeframe ini.` | error_message |
| chart.js | 225 | `Data tidak tersedia` | error_message |
| chart.js | 265 | `Gagal memuat chart` / `Coba timeframe lain.` | error_message |
| chart.js | 266 | `Gagal memuat data` | error_message |
| compare.js | 115 | `Gagal memuat data` / `Data perbandingan tidak tersedia...` | error_message |
| compare.js | 300 | `Gagal memuat` / `Terjadi kesalahan saat mengambil data...` | error_message |
| compare.js | 456 | `Gagal render chart` | error_message |
| router.js | 84 | `Gagal memuat tampilan.` | error_message |
| sector.js | 750 | `Gagal: ${e.message}` | error_message |
| sector.js | 778 | `Tidak ada data saham untuk sektor ini.` | error_message |
| sector.js | 786 | `Gagal: ${e.message}` | error_message |
| signal_overview.js | 225 | `Gagal memuat sinyal. Coba refresh.` | error_message |
| stock_detail.js | 875 | `Belum ada berita terkait` / `Berita spesifik untuk saham ini...` | error_message |
| stock_detail.js | 892 | `Belum ada pengumuman` / `Pengumuman IDX untuk saham ini...` | error_message |
| treemap.js | 329 | `Data Belum Tersedia` / `Silakan coba lagi nanti.` | error_message |
| treemap.js | 335 | `Gagal Memuat Treemap` / `Terjadi kesalahan saat mengambil data...` | error_message |

### 5. Empty State Messages

| File | Line | Text | Category |
|------|------|------|----------|
| ai_picks.js | 313 | `Memuat pick unggulan` / `Menarik kandidat untuk mode...` | empty_state |
| ai_picks.js | 333 | `Belum ada kandidat` / `Mode ini belum menemukan kandidat...` | empty_state |
| ai_picks.js | 344 | `Gagal memuat` / `Koneksi atau API sedang bermasalah...` | empty_state |
| alerts.js | 207 | `Belum ada alert. Buat alert pertama kamu!` | empty_state |
| alerts.js | 218 | `Tidak ada alert` / `Tidak ada alert untuk filter...` | empty_state |
| backtest.js | 68 | `Jalankan Backtest` / `Pilih saham dan strategi...` | empty_state |
| backtest.js | 100 | `Backtest Pola Candlestick` / `Klik "Jalankan Backtest Pola"...` | empty_state |
| backtest.js | 236 | `Tidak Ada Trade` / `Strategi ${stratLabels}...` | empty_state |
| calendar.js | 383 | `Pilih tanggal untuk melihat event` | empty_state |
| main.js | 100 | `Tidak ada hasil yang benar-benar cocok.` | empty_state |
| main.js | 124 | `Ketik kode saham atau nama emiten.` | empty_state |
| paper_trades.js | 298 | `Gagal memuat posisi terbuka` | empty_state |
| paper_trades.js | 391 | `Gagal memuat riwayat` | empty_state |
| sector.js | 639 | `Data rotasi belum tersedia` | empty_state |
| sector.js | 778 | `Tidak ada data saham untuk sektor ini.` | empty_state |
| stock_detail.js | 837 | `Menunggu katalis terbaru` / `Belum ada berita atau pengumuman...` | empty_state |
| stock_detail.js | 991 | `Belum ada peringatan aktif.` | empty_state |

### 6. Tooltip & Title Attributes

| File | Line | Text | Category |
|------|------|------|----------|
| alerts.js | 268 | `Nonaktifkan` / `Aktifkan` | tooltip |
| alerts.js | 276 | `Hapus alert` | tooltip |
| breadth.js | 35 | `Export CSV` | tooltip |
| breadth.js | 38 | `Refresh` | tooltip |
| calendar.js | 81 | `Export kalender bulan ini sebagai .ics` | tooltip |
| calendar.js | 83 | `Grid` | tooltip |
| calendar.js | 84 | `List` | tooltip |
| chart.js | 57 | `Trend Line` | tooltip |
| chart.js | 58 | `Horizontal Line` | tooltip |
| chart.js | 59 | `Fibonacci Retracement` | tooltip |
| chart.js | 60 | `Support/Resistance Line` | tooltip |
| chart.js | 61 | `Clear Drawings` | tooltip |
| chart.js | 62 | `Save Drawings` | tooltip |
| chart.js | 63 | `Load Drawings` | tooltip |
| chart.js | 64 | `Download PNG` | tooltip |
| chart.js | 65 | `Set Price Alert` | tooltip |
| chart.js | 66 | `Fullscreen` | tooltip |
| chart.js | 1011 | `Exit Fullscreen` | tooltip |
| chart.js | 1014 | `Fullscreen` | tooltip |
| corporate.js | 46 | `Refresh` | tooltip |
| corporate.js | 299 | `${escHtml(item.title)}` | tooltip |
| corporate.js | 302 | `${escHtml(item.description)}` | tooltip |
| indices.js | 50 | `Refresh data` | tooltip |
| macro.js | 150 | `Refresh data makro` | tooltip |
| paper_trades.js | 234 | `Hapus` | tooltip |
| paper_trades.js | 361 | `Hapus` | tooltip |
| sector.js | 31 | `Analisis Rotasi Sektor` | tooltip |
| sector.js | 166 | `${s.sector} — ${s.count} saham` | tooltip |
| sector.js | 232 | `${ticker}: ${val}%` | tooltip |
| sector.js | 530 | `${name}` | tooltip |
| sector.js | 829 | `${st.name}` | tooltip |
| sector.js | 866 | `${st.name}` | tooltip |
| sector.js | 934 | `Kembali ke Sektor` | tooltip |
| settings.js | 63 | `Tampilkan/sembunyikan key` | tooltip |
| settings.js | 143 | `Sembunyikan key` / `Tampilkan key` | tooltip |
| settings.js | 163 | `${settings?.openrouter_runtime_message}` | tooltip |
| settings.js | 206 | `${saved?.openrouter_runtime_message}` | tooltip |
| stock_detail.js | 818 | `Berita` / `Pengumuman Perusahaan` / `Pulse Pasar` | tooltip |

### 7. Status & Loading Messages

| File | Line | Text | Category |
|------|------|------|----------|
| dashboard.js | 373 | `Data IHSG menunggu scheduler.` | status_message |
| dividend.js | 460 | `—` (dash for empty values) | status_message |
| dividend.js | 475 | `—` | status_message |
| dividend.js | 540 | `Gagal memuat data` | status_message |
| main.js | 230 | (number formatting) | status_message |
| main.js | 234 | (percentage formatting) | status_message |
| main.js | 240 | `IDX BUKA` / `IDX TUTUP` | status_message |
| main.js | 288 | `Koneksi tersambung kembali.` / `Koneksi terputus — beberapa fitur...` | status_message |
| news.js | 145 | (label clearing) | status_message |
| settings.js | 201 | (runtime state display) | status_message |
| signal_overview.js | 214-218 | (count displays) | status_message |
| stock_detail.js | 159 | `✓ Dipantau` / `+ Pantau` | status_message |
| stock_detail.js | 386 | (stock name display) | status_message |
| stock_detail.js | 387 | (price display) | status_message |
| stock_detail.js | 395 | `WIB ${wibTime}` | status_message |
| stock_detail.js | 462 | `${tvSymbol} · live dari TradingView` | status_message |
| stock_detail.js | 478 | `${data[0]?.date} → ${data[data.length-1]?.date} · ${data.length} candle · LightweightCharts` | status_message |
| stock_detail.js | 578 | `NETRAL` / `Ringkasan teknikal belum tersedia lengkap.` | status_message |
| stock_detail.js | 579 | `NETRAL` / `—` | status_message |
| stock_detail.js | 914 | `Aktivitas Broker (5 hari)` | status_message |
| stock_detail.js | 992 | `Peringatan Aktif` | status_message |
| stock_detail.js | 1019 | `Peer Comparison` | status_message |
| treemap.js | 146 | `Harga: ${stock.price}` / `Perubahan: ${pct}` / `Kap: ${stock.market_cap}` | status_message |

### 8. Form Labels & Descriptions

| File | Line | Text | Category |
|------|------|------|----------|
| alerts.js | 201 | `${data.length} alert` | form_label |
| calendar.js | 278 | `${cfg.label}` | form_label |
| dividend.js | 313 | (search input) | form_label |
| portfolio.js | 48 | `${f.placeholder}` | form_label |
| sector.js | 811 | (search input) | form_label |
| stock_detail.js | 665 | (suggestion chips) | form_label |
| stock_detail.js | 707 | (stat tiles) | form_label |
| stock_detail.js | 730 | (stat tiles with labels) | form_label |
| stock_detail.js | 745 | (stat tiles) | form_label |
| stock_detail.js | 804 | (catalyst cards) | form_label |
| stock_detail.js | 848 | (analysis panel) | form_label |
| stock_detail.js | 853 | `Zona Entry` / `Area Stop` / `Target Dekat` | form_label |
| stock_detail.js | 862 | (insight cards) | form_label |

---

## Files with Most Untranslated Strings

1. **stock_detail.js** - 45+ strings
2. **sector.js** - 35+ strings
3. **backtest.js** - 20+ strings
4. **alerts.js** - 15+ strings
5. **chart.js** - 15+ strings
6. **settings.js** - 12+ strings
7. **paper_trades.js** - 12+ strings
8. **ai_picks.js** - 10+ strings
9. **compare.js** - 8+ strings
10. **main.js** - 8+ strings

---

## Recommendations

### Priority 1: High Impact (User-Facing)
- Page titles (all 15 instances)
- Button labels (20+ instances)
- Error messages (25+ instances)
- Empty state messages (15+ instances)
- Placeholder text (17+ instances)

### Priority 2: Medium Impact
- Tooltip & title attributes (35+ instances)
- Status messages (20+ instances)
- Form labels (15+ instances)

### Priority 3: Low Impact
- Internal messages
- Debug/logging text
- Temporary UI states

---

## Implementation Strategy

1. **Create translation keys** in `frontend/locales/en.json` and `frontend/locales/id.json`
2. **Replace hardcoded strings** with `t('key')` calls
3. **Group related strings** by feature/view for easier maintenance
4. **Test translations** in both languages
5. **Update this audit** after implementation

---

## Translation Key Naming Convention

```
view.element.type
Example: stock_detail.button.watch, alerts.error.failed_load
```

---

## Notes

- Some strings contain dynamic content (e.g., `${variable}`) - these should use parameter interpolation
- Emoji icons are preserved as-is (not translated)
- HTML structure within strings should be extracted to templates
- Some strings appear in multiple files - consider consolidating to common keys

---

**Status:** Audit Complete  
**Next Step:** Create translation keys and implement i18n replacements
