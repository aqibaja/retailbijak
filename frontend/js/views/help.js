import { observeElements } from '../main.js?v=20260506a';

export function renderHelp(root) {
    document.title = 'RetailBijak — Bantuan';
    root.innerHTML = `
      <section class="help-page-pro stagger-reveal">
        <div class="help-hero">
          <div class="help-hero-copy">
            <div class="help-meta-pill">PANDUAN</div>
            <h1>Pusat Bantuan</h1>
            <p>Panduan ringkas untuk alur pemindai, portofolio, daftar pantau, dan penanganan kendala operasional RetailBijak.</p>
          </div>
          <div class="help-hero-side">
            <div class="help-side-label">Jalur cepat</div>
            <div class="help-side-value">Mulai pemindaian, simpan kandidat, lalu atur pengaturan ruang kerja</div>
          </div>
        </div>

        <div class="help-layout">
          <div class="help-guide-panel panel flex-col gap-6">
            <div class="help-guide-head">
              <h2 class="help-section-title">Panduan Mulai Cepat</h2>
              <a href="#settings" class="btn btn-secondary help-inline-link">Buka Settings</a>
            </div>
            <div class="help-guide-grid">
                <div class="help-step-card">
                    <div class="help-step-index"><i data-lucide="search" class="help-step-icon"></i>01</div>
                    <div>
                        <h3>Buka Pemindai</h3>
                        <p>Masuk ke halaman pemindai, pilih timeframe aktif, lalu jalankan pemindaian SwingAQ untuk membaca kandidat terkuat.</p>
                    </div>
                </div>
                <div class="help-step-card">
                    <div class="help-step-index"><i data-lucide="bar-chart-3" class="help-step-icon"></i>02</div>
                    <div>
                        <h3>Analisis Hasil</h3>
                        <p>Periksa CCI, magic line, dan lonjakan volume dari hasil scan, lalu buka detail ticker untuk validasi struktur harga.</p>
                    </div>
                </div>
                <div class="help-step-card">
                    <div class="help-step-index"><i data-lucide="bookmark" class="help-step-icon"></i>03</div>
                    <div>
                        <h3>Kelola Kandidat</h3>
                        <p>Simpan saham pilihan ke daftar pantau atau portofolio agar pemantauan berikutnya lebih cepat dan konsisten.</p>
                    </div>
                </div>
            </div>

            <div class="help-guide-head mt-16">
              <h2 class="help-section-title">Pintasan Keyboard</h2>
            </div>
            <div class="help-shortcuts-grid">
                <div class="help-shortcut-card">
                    <kbd>Ctrl+K</kbd>
                    <span>Buka pencarian global</span>
                </div>
                <div class="help-shortcut-card">
                    <kbd>Esc</kbd>
                    <span>Tutup panel atau pencarian</span>
                </div>
                <div class="help-shortcut-card">
                    <kbd>↑↓</kbd>
                    <span>Navigasi hasil pencarian</span>
                </div>
                <div class="help-shortcut-card">
                    <kbd>Enter</kbd>
                    <span>Buka item terpilih</span>
                </div>
            </div>

            <div class="help-guide-head mt-16">
              <h2 class="help-section-title">Tanya Jawab</h2>
            </div>
            <div class="help-faq-stack">
                <details class="help-faq-item">
                    <summary>Apa itu SwingAQ?</summary>
                    <p>SwingAQ adalah mesin pemindaian institusional yang menganalisis akumulasi berdasarkan CCI, magic line (MA), dan lonjakan volume untuk mendeteksi kandidat swing trading potensial.</p>
                </details>
                <details class="help-faq-item">
                    <summary>Kenapa hasil scan kosong?</summary>
                    <p>Scanner membutuhkan data OHLCV yang diperbarui. Pastikan scheduler berjalan (cek jam 09:00 & 15:30 WIB). Jika masih kosong, coba refresh atau jalankan ulang scan.</p>
                </details>
                <details class="help-faq-item">
                    <summary>Bagaimana cara menambahkan saham ke portofolio?</summary>
                    <p>Buka halaman Portofolio, klik Tambah, lalu isi kode saham, jumlah lot, dan harga rata-rata. Data tersimpan di basis data dan sinkron antar sesi.</p>
                </details>
                <details class="help-faq-item">
                    <summary>Apa perbedaan Watchlist dan Portofolio?</summary>
                    <p>Watchlist untuk memantau saham incaran tanpa data kepemilikan. Portofolio untuk mencatat posisi yang sudah dimiliki beserta harga rata-rata dan lot.</p>
                </details>
                <details class="help-faq-item">
                    <summary>Data real-time atau tertunda?</summary>
                    <p>Data harga diperbarui melalui scheduler dari Yahoo Finance pada jam 09:00 dan 15:30 WIB. Bukan real-time streaming — gunakan indikator teknikal untuk konfirmasi.</p>
                </details>
                <details class="help-faq-item">
                    <summary>Bagaimana cara mengaktifkan AI Picks?</summary>
                    <p>Masuk ke Pengaturan, masukkan API key OpenRouter, lalu simpan. Setelah aktif, AI Picks akan menampilkan rekomendasi berbasis model bahasa setiap hari.</p>
                </details>
            </div>
          </div>

          <div class="help-support-panel panel flex-col justify-center items-center text-center">
            <div class="help-support-icon">
                <i data-lucide="life-buoy" class="lucide-xl"></i>
            </div>
            <h3>Butuh Bantuan?</h3>
            <p>Pelajari alur kerja RetailBijak: mulai dari pemindaian, analisis, hingga manajemen portofolio.</p>
            <div class="flex gap-3 help-cta-fix">
              <a href="#screener" class="btn btn-primary help-support-btn">Buka Pemindai</a>
              <a href="#portfolio" class="btn btn-secondary help-support-btn">Kelola Aset</a>
            </div>
          </div>
        </div>
      </section>
    `;
    observeElements();
    if (typeof lucide !== 'undefined') lucide.createIcons();
}
