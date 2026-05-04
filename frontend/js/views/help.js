import { observeElements } from '../main.js?v=20260504e';

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
          </div>

          <div class="help-support-panel panel flex-col justify-center items-center text-center">
            <div class="help-support-icon">
                <i data-lucide="life-buoy" style="width:24px; height:24px;"></i>
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
