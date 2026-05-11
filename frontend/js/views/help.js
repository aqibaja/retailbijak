import { observeElements } from '../utils/helpers.js?v=202605120200';

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

        <!-- Search Bar -->
        <div class="help-search-wrap">
          <i data-lucide="search" class="help-search-icon"></i>
          <input type="text" id="help-search" class="help-search-input" placeholder="Cari panduan, FAQ, atau fitur..." autocomplete="off" />
          <span class="help-search-hint" id="help-search-hint">${document.querySelectorAll('.help-faq-item, .help-step-card, .help-shortcut-card').length || 20} item</span>
        </div>

        <div class="help-layout">
          <div class="help-guide-panel panel flex-col gap-6">
            <div class="help-guide-head">
              <h2 class="help-section-title">Panduan Mulai Cepat</h2>
              <a href="#settings" class="btn btn-secondary help-inline-link">Buka Settings</a>
            </div>
            <div class="help-guide-grid" id="help-guide-grid">
                <div class="help-step-card" data-help-tags="screener scan pemindaian cci magic line volume">
                    <div class="help-step-index"><i data-lucide="search" class="help-step-icon"></i>01</div>
                    <div>
                        <h3>Buka Pemindai</h3>
                        <p>Masuk ke halaman pemindai, pilih timeframe aktif, lalu jalankan pemindaian SwingAQ untuk membaca kandidat terkuat.</p>
                    </div>
                </div>
                <div class="help-step-card" data-help-tags="analisis hasil detail ticker chart teknikal">
                    <div class="help-step-index"><i data-lucide="bar-chart-3" class="help-step-icon"></i>02</div>
                    <div>
                        <h3>Analisis Hasil</h3>
                        <p>Periksa CCI, magic line, dan lonjakan volume dari hasil scan, lalu buka detail ticker untuk validasi struktur harga.</p>
                    </div>
                </div>
                <div class="help-step-card" data-help-tags="kelola kandidat watchlist portfolio bookmark">
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
            <div class="help-shortcuts-grid" id="help-shortcuts-grid">
            <div class="help-shortcut-card" data-help-tags="slash search fokus">
                    <kbd>/</kbd>
                    <span>Fokus ke pencarian global</span>
                </div>
                <div class="help-shortcut-card" data-help-tags="ctrl+k cmd+k search buka pencarian">
                    <kbd>Ctrl+K</kbd>
                    <span>Buka pencarian global</span>
                </div>
                <div class="help-shortcut-card" data-help-tags="esc escape tutup modal panel">
                    <kbd>Esc</kbd>
                    <span>Tutup panel, modal, atau pencarian</span>
                </div>
                <div class="help-shortcut-card" data-help-tags="arrow up down navigasi hasil">
                    <kbd>↑↓</kbd>
                    <span>Navigasi hasil pencarian</span>
                </div>
                <div class="help-shortcut-card" data-help-tags="enter buka item pilih">
                    <kbd>Enter</kbd>
                    <span>Buka item terpilih</span>
                </div>
            </div>

            <div class="help-guide-head mt-16">
              <h2 class="help-section-title">Tanya Jawab</h2>
            </div>
            <div class="help-search-empty hidden" id="help-search-empty">
              <div class="empty-state-v2">
                <div class="empty-icon"><i data-lucide="search-x" class="lucide-lg"></i></div>
                <h3>Tidak Ditemukan</h3>
                <p>Coba kata kunci lain seperti "screener", "portofolio", atau "API".</p>
              </div>
            </div>
            <div class="help-faq-stack" id="help-faq-stack">
                <details class="help-faq-item" data-help-tags="swingaq apa itu scan cci magic line akumulasi">
                    <summary>Apa itu SwingAQ?</summary>
                    <p>SwingAQ adalah mesin pemindaian institusional yang menganalisis akumulasi berdasarkan CCI, magic line (MA), dan lonjakan volume untuk mendeteksi kandidat swing trading potensial.</p>
                </details>
                <details class="help-faq-item" data-help-tags="hasil scan kosong kosong data ohlcv scheduler">
                    <summary>Kenapa hasil scan kosong?</summary>
                    <p>Scanner membutuhkan data OHLCV yang diperbarui. Pastikan scheduler berjalan (cek jam 09:00 & 15:30 WIB). Jika masih kosong, coba refresh atau jalankan ulang scan.</p>
                </details>
                <details class="help-faq-item" data-help-tags="tambah portofolio saham lot harga rata-rata add">
                    <summary>Bagaimana cara menambahkan saham ke portofolio?</summary>
                    <p>Buka halaman Portofolio, klik Tambah, lalu isi kode saham, jumlah lot, dan harga rata-rata. Data tersimpan di basis data dan sinkron antar sesi.</p>
                </details>
                <details class="help-faq-item" data-help-tags="watchlist portofolio beda perbedaan pantau incaran">
                    <summary>Apa perbedaan Watchlist dan Portofolio?</summary>
                    <p>Watchlist untuk memantau saham incaran tanpa data kepemilikan. Portofolio untuk mencatat posisi yang sudah dimiliki beserta harga rata-rata dan lot.</p>
                </details>
                <details class="help-faq-item" data-help-tags="data realtime real-time tertunda yahoo finance scheduler">
                    <summary>Data real-time atau tertunda?</summary>
                    <p>Data harga diperbarui melalui scheduler dari Yahoo Finance pada jam 09:00 dan 15:30 WIB. Bukan real-time streaming — gunakan indikator teknikal untuk konfirmasi.</p>
                </details>
                <details class="help-faq-item" data-help-tags="ai picks aktifkan openrouter api key llm rekomendasi">
                    <summary>Bagaimana cara mengaktifkan AI Picks?</summary>
                    <p>Masuk ke Pengaturan, masukkan API key OpenRouter, lalu simpan. Setelah aktif, AI Picks akan menampilkan rekomendasi berbasis model bahasa setiap hari.</p>
                </details>
                <details class="help-faq-item" data-help-tags="alert harga notifikasi pantau pergerakan saham">
                    <summary>Bagaimana cara membuat Alert?</summary>
                    <p>Buka halaman Alert, klik "Alert Baru", masukkan kode saham, pilih tipe (Price >, Price <, RSI >, RSI <), dan tentukan nilai ambang. Alert dicek setiap 2 menit.</p>
                </details>
                <details class="help-faq-item" data-help-tags="backtest backtesting strategi sma rsi bolinger uji">
                    <summary>Apa itu Backtesting?</summary>
                    <p>Backtesting menguji strategi trading pada data historis. Pilih saham, strategi (SMA Crossover, RSI Reversal, Bollinger Breakout), lalu lihat equity curve dan Sharpe ratio.</p>
                </details>
                <details class="help-faq-item" data-help-tags="theme tema gelap dark light terang ganti">
                    <summary>Bagaimana cara ganti tema?</summary>
                    <p>Klik ikon bulan/matahari di pojok kanan atas topbar untuk toggle antara tema gelap dan terang. Pilihan tersimpan otomatis.</p>
                </details>
                <details class="help-faq-item" data-help-tags="screener filter cci volume harga perubahan exchange">
                    <summary>Filter apa saja yang tersedia di Screener?</summary>
                    <p>Screener mendukung filter: harga, perubahan %, volume, CCI, kualitas sinyal, dan magic line. Hasil bisa diurutkan dan diekspor ke CSV.</p>
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

    // ─── Live Search ─────────────────────────────
    const searchInput = document.getElementById('help-search');
    const faqStack = document.getElementById('help-faq-stack');
    const shortcutGrid = document.getElementById('help-shortcuts-grid');
    const guideGrid = document.getElementById('help-guide-grid');
    const searchHint = document.getElementById('help-search-hint');
    const searchEmpty = document.getElementById('help-search-empty');

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const q = searchInput.value.toLowerCase().trim();
        let visibleCount = 0;

        // Helper: show/hide items based on query
        const filterItems = (container) => {
          if (!container) return 0;
          let count = 0;
          container.querySelectorAll('[data-help-tags]').forEach(item => {
            const tags = (item.dataset.helpTags || '').toLowerCase();
            const text = item.textContent.toLowerCase();
            const match = !q || tags.includes(q) || text.includes(q);
            item.style.display = match ? '' : 'none';
            if (match) count++;
          });
          return count;
        };

        visibleCount += filterItems(faqStack);
        visibleCount += filterItems(shortcutGrid);
        visibleCount += filterItems(guideGrid);

        // Update hint and empty state
        if (searchHint) searchHint.textContent = `${visibleCount} item`;
        if (searchEmpty) {
          searchEmpty.classList.toggle('hidden', visibleCount > 0 || !q);
        }
      });
    }
}
