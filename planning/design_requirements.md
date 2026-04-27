# Kebutuhan Desain UI/UX: SwingAQ MVP

Dokumen ini adalah panduan spesifikasi antarmuka dan interaksi (UI/UX) untuk **Minimum Viable Product (MVP) SwingAQ**. Desain ini merangkum kebutuhan untuk Phase 1 hingga Phase 3, dan dirancang mengikuti pedoman *UI/UX Pro Max* untuk menghasilkan pengalaman layaknya *Trading Terminal* profesional.

*(Catatan: Phase 4 / Bandarmologi dikeluarkan dari dokumen ini karena ditunda pasca-MVP).*

---

## 1. Fondasi Desain & Sistem Visual (Global)

- **Style Match (`style-match`)**: Tema desain berorientasi pada data dan kecepatan (*Data-heavy / Trading Tool*).
- **Tema Warna (`color-semantic`)**:
  - **Background**: *Deep Dark Mode* (contoh: `#0d1117` untuk latar utama, `#161b22` untuk kartu/panel) untuk mengurangi *eye strain* trader.
  - **Aksen Teks**: Teks primer warna putih keabu-abuan (`#e6edf3`), teks sekunder/label abu-abu redup (`#8b949e`).
  - **Semantic Action**: Hijau (`#3fb950`) KHUSUS untuk sinyal Buy / Uptrend / Profit. Merah (`#f85149`) KHUSUS untuk sinyal Sell / Downtrend / Loss. Biru (`#388bfd`) untuk tombol interaksi utama.
- **Tipografi (`number-tabular` & `weight-hierarchy`)**:
  - Font San-Serif modern yang bersih (seperti Inter atau Roboto).
  - **SANGAT PENTING**: Semua data angka di tabel dan widget WAJIB menggunakan varian angka tabular (*monospace/tabular figures*) agar lebar angka selalu konsisten dan tabel tidak "bergoyang" (layout shift) saat angka berubah.

---

## 2. Phase 1: Dashboard & Scanner (Tampilan Utama)

Halaman pertama yang dilihat pengguna untuk memindai pasar saham.

### A. Control Panel & Filter
- **Timeframe Selector**: Gunakan desain `Segmented Control` atau grup tombol yang rapi untuk memilih (Daily, H1, H4). Tombol yang aktif menggunakan warna aksen (Biru) dan teks tebal.
- **Action Button (`loading-buttons`)**: Tombol "Start Scan" yang besar. Ketika proses scan berjalan, tombol harus dalam *disabled state* dan menampilkan animasi progres (misal: "Scanning... 45%") di dalam tombol atau di bilah progres terpisah.
- **Search & Filter**: Sediakan kolom input pencarian saham (`<input type="search">`) yang langsung merespon saat diketik (*debounce* / *real-time filtering*).

### B. Tabel Hasil Scanner (Data Table)
- **Sticky Header**: Header kolom tabel harus tetap terlihat (sticky) saat pengguna men-scroll ke bawah.
- **Kolom Tabel**: No, Ticker, TF, Close Price, Magic Line, CCI, Stop Loss, Aksi.
- **Sortable (`sortable-table`)**: Berikan ikon *chevron* kecil pada header tabel untuk menandakan bahwa kolom (seperti harga atau persentase SL) bisa diurutkan.
- **Row Highlight (`hover-vs-tap`)**: Berikan efek *hover* yang lembut (contoh: ubah warna latar baris dari transparan ke `rgba(255,255,255, 0.05)`) dan kursor `pointer` untuk mengindikasikan baris bisa diklik (menuju Halaman Detail).

---

## 3. Phase 1.5: Market News Aggregator (Widget)

Panel yang berisi berita terbaru dari CNBC Indonesia / Kontan. Posisinya bisa di sidebar dashboard atau di *bottom panel*.

### A. List Item Berita
- **Struktur Kartu Berita (`spacing-scale`)**:
  - **Judul**: Maksimal 2 baris (gunakan `text-overflow: ellipsis` jika berlebih).
  - **Meta**: Sumber (CNBC) dan Waktu Tayang (contoh: "15 menit lalu"). Gunakan teks ukuran kecil (`12px` - `14px`) berwarna abu-abu.
- **Interaksi Buka Tautan (`target="_blank"`)**: Ketika berita diklik, BUKA DI TAB BARU. Jangan menavigasi paksa halaman utama agar state Scanner yang sedang berjalan/hasil pencarian tidak ter-reset.
- **Empty State (`empty-states`)**: Tampilkan ilustrasi kecil dan teks "Berita belum tersedia" jika RSS feed gagal ditarik atau sedang kosong.

---

## 4. Phase 2: Halaman Detail & Fundamental

Halaman khusus (*Sub-page* atau *Full-screen Modal*) yang terbuka saat baris tabel di-klik.

### A. Layout Struktur (`mobile-first`)
- **Navigasi (`breadcrumb-web` / `escape-routes`)**: Sediakan tombol `← Kembali ke Scanner` di pojok kiri atas untuk keluar dari halaman ini tanpa kehilangan data halaman sebelumnya.
- **Header Info Saham**: Ticker raksasa (misal `BBCA.JK`), Nama Perusahaan, Harga Penutupan Terakhir dengan badge % Perubahan (Hijau/Merah).
- **Responsive Grid**:
  - Desktop: Kiri lebar untuk Chart, Kanan sempit untuk Fundamental & Indikator.
  - Mobile: Ditumpuk atas-bawah.

### B. Tabel / Panel Fundamental
- Tampilkan metrik valuasi: PER, PBV, EPS, Dividend Yield, ROE, ROA, DER.
- **Format Label-Nilai (`whitespace-balance`)**: Label di sisi kiri (warna pudar), Nilai di sisi kanan (rata kanan, tebal/terang). Pisahkan kelompok metrik dengan garis pembatas tipis.

---

## 5. Phase 3: Technical Analysis Enhanced

Integrasi indikator lanjutan (RSI, MACD, MA) di halaman Detail atau disematkan ke tabel Dashboard.

### A. Charting Component (`chart-type` & `progressive-loading`)
- Integrasikan *TradingView Lightweight Charts* di panel atas halaman detail.
- Tampilkan Candlestick, Volume di bawahnya, dan layer indikator (seperti garis SMA/EMA) yang bisa di-*toggle* (nyala/mati).
- **Skeleton Shimmer**: Gunakan animasi pemuatan blok abu-abu pada kotak chart saat menunggu grafik dirender dari API. Jangan biarkan kotak kosong.

### B. Indikator Status Badges
- Di bawah tabel fundamental, buat sub-panel **Technical Signals**.
- Gunakan badge warna (*Pills*) untuk merangkum sentimen teknikal.
  - Contoh: **RSI**: `Overbought` (Merah), **MACD**: `Bullish Crossover` (Hijau).
  - Ini mempercepat user dalam mencerna data numerik mentah menjadi kesimpulan aksi.

---

## 6. Standar Aksesibilitas & Responsivitas Mutlak (Checklist)

1. **Target Sentuhan Mobile (`touch-target-size`)**: Semua tab menu, dropdown, dan tombol *Start Scan* harus memiliki tinggi area sentuh minimal **44px**.
2. **Kontras Warna (`color-contrast`)**: Jangan buat teks sekunder Anda terlalu gelap hingga tak terbaca. Rasio kontras teks abu-abu terhadap background hitam harus minimal 4.5:1.
3. **Mencegah Scroll Horizontal (`horizontal-scroll`)**: Di layar HP, elemen besar seperti Tabel Scanner harus dibungkus `<div class="overflow-x-auto">` agar hanya tabelnya saja yang dapat di-scroll ke samping (swipe), BUKAN keseluruhan halaman.
4. **Kecepatan Respons Sentuh (`hover-vs-tap`)**: Jangan gunakan *Hover Menu* untuk aksi penting. Di layar sentuh, *hover* tidak bekerja. Semua kontrol utama harus bisa ditekan secara eksplisit (tap).
