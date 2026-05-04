     1|import { observeElements } from '../main.js?v=20260504e';
     2|
     3|export function renderHelp(root) {
     4|    document.title = 'RetailBijak — Bantuan';
     5|    root.innerHTML = `
     6|      <section class="help-page-pro stagger-reveal">
     7|        <div class="help-hero">
     8|          <div class="help-hero-copy">
     9|            <div class="help-meta-pill">PANDUAN</div>
    10|            <h1>Pusat Bantuan</h1>
    11|            <p>Panduan ringkas untuk alur pemindai, portofolio, daftar pantau, dan penanganan kendala operasional RetailBijak.</p>
    12|          </div>
    13|          <div class="help-hero-side">
    14|            <div class="help-side-label">Jalur cepat</div>
    15|            <div class="help-side-value">Mulai pemindaian, simpan kandidat, lalu atur pengaturan ruang kerja</div>
    16|          </div>
    17|        </div>
    18|
    19|        <div class="help-layout">
    20|          <div class="help-guide-panel panel flex-col gap-6">
    21|            <div class="help-guide-head">
    22|              <h2 class="help-section-title">Panduan Mulai Cepat</h2>
    23|              <a href="#settings" class="btn btn-secondary help-inline-link">Buka Settings</a>
    24|            </div>
    25|            <div class="help-guide-grid">
    26|                <div class="help-step-card">
    27|                    <div class="help-step-index"><i data-lucide="search" class="help-step-icon"></i>01</div>
    28|                    <div>
    29|                        <h3>Buka Pemindai</h3>
    30|                        <p>Masuk ke halaman pemindai, pilih timeframe aktif, lalu jalankan pemindaian SwingAQ untuk membaca kandidat terkuat.</p>
    31|                    </div>
    32|                </div>
    33|                <div class="help-step-card">
    34|                    <div class="help-step-index"><i data-lucide="bar-chart-3" class="help-step-icon"></i>02</div>
    35|                    <div>
    36|                        <h3>Analisis Hasil</h3>
    37|                        <p>Periksa CCI, magic line, dan lonjakan volume dari hasil scan, lalu buka detail ticker untuk validasi struktur harga.</p>
    38|                    </div>
    39|                </div>
    40|                <div class="help-step-card">
    41|                    <div class="help-step-index"><i data-lucide="bookmark" class="help-step-icon"></i>03</div>
    42|                    <div>
    43|                        <h3>Kelola Kandidat</h3>
    44|                        <p>Simpan saham pilihan ke daftar pantau atau portofolio agar pemantauan berikutnya lebih cepat dan konsisten.</p>
    45|                    </div>
    46|                </div>
    47|            </div>
    48|          </div>
    49|
    50|          <div class="help-support-panel panel flex-col justify-center items-center text-center">
    51|            <div class="help-support-icon">
    52|                <i data-lucide="life-buoy" class="lucide-xl"></i>
    53|            </div>
    54|            <h3>Butuh Bantuan?</h3>
    55|            <p>Pelajari alur kerja RetailBijak: mulai dari pemindaian, analisis, hingga manajemen portofolio.</p>
    56|            <div class="flex gap-3 help-cta-fix">
    57|              <a href="#screener" class="btn btn-primary help-support-btn">Buka Pemindai</a>
    58|              <a href="#portfolio" class="btn btn-secondary help-support-btn">Kelola Aset</a>
    59|            </div>
    60|          </div>
    61|        </div>
    62|      </section>
    63|    `;
    64|    observeElements();
    65|    if (typeof lucide !== 'undefined') lucide.createIcons();
    66|}
    67|