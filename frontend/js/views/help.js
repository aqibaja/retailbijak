import { observeElements } from '../main.js?v=20260503y';

export function renderHelp(root) {
    root.innerHTML = `
      <section class="help-page-pro stagger-reveal">
        <div class="help-hero">
          <div class="help-hero-copy">
            <div class="help-meta-pill">PANDUAN</div>
            <h1>Pusat Bantuan</h1>
            <p>Panduan ringkas untuk alur scanner, portfolio, watchlist, dan troubleshooting operasional RetailBijak.</p>
          </div>
          <div class="help-hero-side">
            <div class="help-side-label">Jalur cepat</div>
            <div class="help-side-value">Mulai scan, simpan kandidat, lalu atur workspace</div>
          </div>
        </div>

        <div class="help-layout">
          <div class="help-guide-panel panel flex-col gap-6">
            <div class="flex justify-between items-center gap-4" style="flex-wrap:wrap;">
              <h2 class="help-section-title">Panduan Mulai Cepat</h2>
              <a href="#settings" class="btn btn-secondary help-inline-link">Buka Settings</a>
            </div>
            <div class="help-guide-grid">
                <div class="help-step-card">
                    <div class="help-step-index">01</div>
                    <div>
                        <h3>Buka Scanner</h3>
                        <p>Masuk ke halaman scanner, pilih timeframe aktif, lalu jalankan institutional scan untuk membaca kandidat terkuat.</p>
                    </div>
                </div>
                <div class="help-step-card">
                    <div class="help-step-index">02</div>
                    <div>
                        <h3>Analisa Hasil</h3>
                        <p>Cek CCI, magic line, dan volume spike dari hasil scan, lalu buka detail ticker untuk validasi struktur harga.</p>
                    </div>
                </div>
                <div class="help-step-card">
                    <div class="help-step-index">03</div>
                    <div>
                        <h3>Kelola Kandidat</h3>
                        <p>Simpan saham pilihan ke watchlist atau portfolio agar monitoring berikutnya lebih cepat dan konsisten.</p>
                    </div>
                </div>
            </div>
          </div>

          <div class="help-support-panel panel flex-col justify-center items-center text-center">
            <div class="help-support-icon">
                <i data-lucide="life-buoy" style="width:24px; height:24px;"></i>
            </div>
            <h3>Butuh Bantuan?</h3>
            <p>Gunakan jalur support internal untuk pengecekan pengaturan workspace atau kembali ke scanner untuk mengulang proses inti.</p>
            <div class="flex gap-3" style="flex-wrap:wrap; justify-content:center;">
              <a href="#settings" class="btn btn-primary help-support-btn">Hubungi Support</a>
              <a href="#screener" class="btn btn-secondary help-support-btn">Buka Scanner</a>
            </div>
          </div>
        </div>
      </section>
    `;
    observeElements();
    if (typeof lucide !== 'undefined') lucide.createIcons();
}
