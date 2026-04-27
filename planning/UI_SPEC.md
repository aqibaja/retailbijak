# SwingAQ Scanner — UI Specification

---

## 1. Konsep Desain

- **Tema**: Dark mode premium — seperti terminal trading profesional
- **Warna**: Deep dark background, accent biru/hijau untuk sinyal
- **Font**: Inter (Google Fonts)
- **Layout**: Single page, no navigation
- **Responsif**: Desktop-first (trader biasanya pakai desktop/laptop)

---

## 2. Color Palette

```css
:root {
  /* Background */
  --bg-primary    : #0d1117;   /* Latar utama */
  --bg-secondary  : #161b22;   /* Card/panel */
  --bg-tertiary   : #21262d;   /* Input, tabel row */
  --bg-hover      : #30363d;   /* Hover state */

  /* Border */
  --border-color  : #30363d;
  --border-accent : #388bfd;   /* Border aktif/focus */

  /* Text */
  --text-primary  : #e6edf3;   /* Teks utama */
  --text-secondary: #8b949e;   /* Teks sekunder */
  --text-muted    : #484f58;   /* Teks disabled */

  /* Accent */
  --accent-blue   : #388bfd;   /* Primary action */
  --accent-green  : #3fb950;   /* BUY signal, success */
  --accent-red    : #f85149;   /* SL, error */
  --accent-yellow : #d29922;   /* Warning, pending */

  /* Progress */
  --progress-bg   : #21262d;
  --progress-fill : #388bfd;
}
```

---

## 3. Layout Struktur

```
┌─────────────────────────────────────────────────────┐
│  HEADER                                             │
│  [Logo: SwingAQ Scanner]  [Tagline]                 │
├─────────────────────────────────────────────────────┤
│  CONTROL PANEL                                      │
│  ┌──────────────────┐  ┌──────────────────────────┐ │
│  │ Timeframe Select │  │  [▶ START SCAN] button   │ │
│  └──────────────────┘  └──────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│  PROGRESS SECTION (tampil hanya saat scanning)      │
│  [===========================-------] 42% (380/900) │
│  ⏳ Scanning: BBCA.JK                               │
├─────────────────────────────────────────────────────┤
│  STATS BAR (tampil setelah/saat scan)               │
│  ✅ Signals Found: 12  |  📊 Scanned: 895  |  ⏱ 145s│
├─────────────────────────────────────────────────────┤
│  RESULTS TABLE                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │ Filter: [Search ticker...]                   │   │
│  ├──────────┬───────┬────────┬───────┬──────────┤   │
│  │ Ticker   │ Close │ Magic  │  CCI  │    SL    │   │
│  │ TF | Date│       │  Line  │       │  (%)     │   │
│  ├──────────┼───────┼────────┼───────┼──────────┤   │
│  │ BBCA.JK  │ 9,450 │  9,200 │ -87.3 │ 8,900    │   │
│  │ Daily    │       │        │       │ (-5.8%)  │   │
│  └──────────┴───────┴────────┴───────┴──────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## 4. Komponen Detail

### 4.1 Header
```
SwingAQ Scanner
IDX Stock Scanner — SwingByAQib Signal
```
- Logo/nama di kiri
- Badge versi kecil di kanan (`v1.0`)

---

### 4.2 Control Panel

**Timeframe Selector** (dropdown/button group):
```
[Daily] [H1] [H4] [Weekly] [Monthly]
```
- Default: Daily
- Style: Toggle button group, yang dipilih highlight biru

**Scan Button**:
```
[▶ Start Scan]          (default state)
[■ Scanning... 42%]     (saat scanning — disabled)
[↺ Scan Again]          (setelah selesai)
```

---

### 4.3 Progress Section

Tampil hanya saat `scanning = true`:

```html
<div class="progress-section">
  <div class="progress-bar">
    <div class="progress-fill" style="width: 42%"></div>
  </div>
  <div class="progress-info">
    <span class="progress-percent">42%</span>
    <span class="progress-count">(380 / 900)</span>
    <span class="progress-ticker">⏳ BBCA.JK</span>
  </div>
</div>
```

---

### 4.4 Stats Bar

Tampil setelah scan selesai (atau live update saat scanning):

| Elemen              | Deskripsi                                |
|---------------------|------------------------------------------|
| ✅ Signals Found: N | Jumlah ticker dengan sinyal BUY aktif    |
| 📊 Scanned: N        | Total ticker yang berhasil diproses      |
| ⚠️ Skipped: N        | Ticker yang di-skip (data kurang/error)  |
| ⏱ Duration: Ns       | Waktu total scan dalam detik             |

---

### 4.5 Results Table

**Kolom**:
| Kolom         | Deskripsi                                                   | Alignment |
|---------------|-------------------------------------------------------------|-----------|
| **#**         | Nomor urut                                                  | Center    |
| **Ticker**    | Ticker IDX (tanpa .JK) + nama perusahaan (kecil di bawah)  | Left      |
| **TF**        | Timeframe yang di-scan                                      | Center    |
| **Date**      | Tanggal sinyal (bar terakhir)                               | Center    |
| **Close**     | Harga close (format: 9,450)                                 | Right     |
| **Magic Line**| Nilai Magic Line                                            | Right     |
| **CCI**       | Nilai CCI saat sinyal (antara -100 dan 0)                   | Right     |
| **Stop Loss** | Level SL (harga)                                            | Right     |
| **SL %**      | Jarak SL dari close dalam % (merah, negatif)                | Right     |

**Row highlight**: Row baru yang masuk di-highlight hijau sebentar (CSS animation).

**Filter**: Input text di atas tabel untuk filter by ticker (client-side, real-time).

**Empty state**: Jika belum ada data, tampilkan pesan:
```
Belum ada hasil. Pilih timeframe dan klik "Start Scan".
```

**Sort**: Klik header kolom untuk sort (ascending/descending).

---

### 4.6 Notifikasi

Toast notification kecil di pojok kanan bawah untuk:
- ✅ "Scan selesai! Ditemukan N sinyal."
- ❌ "Scan gagal. Coba lagi."

---

## 5. States UI

| State         | Deskripsi                                              |
|---------------|--------------------------------------------------------|
| `idle`        | Awal — belum scan. Tombol "Start Scan" aktif           |
| `scanning`    | Scanning berjalan. Progress bar aktif, tombol disabled |
| `done`        | Scan selesai. Stats bar tampil. Tombol jadi "Scan Again"|
| `error`       | Error fatal. Toast merah muncul                        |

---

## 6. JavaScript Logic (`app.js`)

### State Management
```javascript
const state = {
  scanning   : false,
  timeframe  : '1d',
  results    : [],    // Array of result objects
  progress   : { current: 0, total: 0, ticker: '' },
  stats      : { signals: 0, scanned: 0, skipped: 0, duration: 0 }
};
```

### SSE Handler
```javascript
function startScan() {
  const tf = state.timeframe;
  const evtSource = new EventSource(`/api/scan?timeframe=${tf}`);
  
  evtSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    switch (data.type) {
      case 'start':
        handleStart(data);
        break;
      case 'progress':
        handleProgress(data);
        break;
      case 'result':
        handleResult(data);
        break;
      case 'error':
        handleTickerError(data);
        break;
      case 'done':
        handleDone(data);
        evtSource.close();
        break;
    }
  };
  
  evtSource.onerror = () => {
    showToast('Koneksi terputus.', 'error');
    evtSource.close();
    setState('error');
  };
}
```

### Tabel Rendering
- Append row ke tabel saat `result` event diterima (tidak re-render seluruh tabel)
- Animasi fade-in hijau untuk row baru
- Format angka: `9450` → `9,450` (separator ribuan)
- Format persen: `-5.82` → `-5.82%` (merah)

### Filter
```javascript
searchInput.addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  document.querySelectorAll('.result-row').forEach(row => {
    const ticker = row.dataset.ticker.toLowerCase();
    row.style.display = ticker.includes(q) ? '' : 'none';
  });
});
```

---

## 7. Responsif (Mobile — Optional v1)

Untuk mobile (≤768px):
- Sembunyikan kolom Magic Line dan CCI
- Tabel scroll horizontal
- Tombol full width

---

## 8. HTML Structure Skeleton

```html
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SwingAQ Scanner — IDX Stock Scanner</title>
  <meta name="description" content="...">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/static/style.css">
</head>
<body>
  <header id="header">...</header>
  
  <main>
    <section id="control-panel">...</section>
    <section id="progress-section" class="hidden">...</section>
    <section id="stats-bar" class="hidden">...</section>
    <section id="results-section">
      <div id="filter-bar">...</div>
      <div id="table-wrapper">
        <table id="results-table">
          <thead>...</thead>
          <tbody id="results-body">...</tbody>
        </table>
      </div>
      <div id="empty-state">...</div>
    </section>
  </main>
  
  <div id="toast-container"></div>
  <script src="/static/app.js"></script>
</body>
</html>
```
