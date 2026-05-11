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
                <details class="help-faq-item" data-help-tags="sinyal buy sell beli jual cara baca signal">
                    <summary>Bagaimana cara membaca sinyal Buy/Sell?</summary>
                    <p>Sinyal <strong>Buy</strong> muncul saat CCI menembus ke atas +100 disertai lonjakan volume dan harga di atas magic line (MA). Sinyal <strong>Sell</strong> muncul saat CCI turun di bawah -100 atau harga memotong magic line ke bawah. Selalu konfirmasi dengan price action sebelum eksekusi.</p>
                </details>
                <details class="help-faq-item" data-help-tags="rsi relative strength index interpretasi overbought oversold">
                    <summary>Apa itu RSI dan bagaimana interpretasinya?</summary>
                    <p>RSI (Relative Strength Index) mengukur kecepatan dan perubahan pergerakan harga, skala 0–100. RSI di atas 70 menandakan <strong>overbought</strong> (potensi koreksi), di bawah 30 menandakan <strong>oversold</strong> (potensi rebound). RSI 40–60 adalah zona netral. Gunakan bersama indikator lain untuk konfirmasi.</p>
                </details>
                <details class="help-faq-item" data-help-tags="price alert set harga notifikasi target ambang batas">
                    <summary>Bagaimana cara set price alert?</summary>
                    <p>Buka halaman <strong>Alert</strong>, klik "Alert Baru", pilih kode saham, tipe kondisi (Price &gt;, Price &lt;, RSI &gt;, RSI &lt;), dan masukkan nilai target. Alert dicek otomatis setiap 2 menit. Notifikasi dikirim via Telegram jika sudah dikonfigurasi di Pengaturan.</p>
                </details>
                <details class="help-faq-item" data-help-tags="paper trade portfolio nyata perbedaan simulasi virtual">
                    <summary>Apa perbedaan Paper Trade vs Portfolio nyata?</summary>
                    <p><strong>Paper Trade</strong> adalah simulasi trading tanpa uang nyata — cocok untuk menguji strategi. <strong>Portfolio nyata</strong> mencatat posisi yang benar-benar kamu miliki beserta harga rata-rata dan lot. Keduanya tersimpan di database dan bisa dipantau P&amp;L-nya secara terpisah.</p>
                </details>
                <details class="help-faq-item" data-help-tags="swingaq apa itu scan cci magic line akumulasi">
                    <summary>Apa itu SwingAQ?</summary>
                    <p>SwingAQ adalah mesin pemindaian institusional yang menganalisis akumulasi berdasarkan CCI, magic line (MA), dan lonjakan volume untuk mendeteksi kandidat swing trading potensial.</p>
                </details>
                <details class="help-faq-item" data-help-tags="hasil scan kosong kosong data ohlcv scheduler">
                    <summary>Kenapa hasil scan kosong?</summary>
                    <p>Scanner membutuhkan data OHLCV yang diperbarui. Pastikan scheduler berjalan (cek jam 09:00 &amp; 15:30 WIB). Jika masih kosong, coba refresh atau jalankan ulang scan.</p>
                </details>
                <details class="help-faq-item" data-help-tags="ai picks aktifkan openrouter api key llm rekomendasi">
                    <summary>Bagaimana cara mengaktifkan AI Picks?</summary>
                    <p>Masuk ke Pengaturan, masukkan API key OpenRouter, lalu simpan. Setelah aktif, AI Picks akan menampilkan rekomendasi berbasis model bahasa setiap hari.</p>
                </details>
                <details class="help-faq-item" data-help-tags="backtest backtesting strategi sma rsi bolinger uji">
                    <summary>Apa itu Backtesting?</summary>
                    <p>Backtesting menguji strategi trading pada data historis. Pilih saham, strategi (SMA Crossover, RSI Reversal, Bollinger Breakout), lalu lihat equity curve dan Sharpe ratio.</p>
                </details>
                <details class="help-faq-item" data-help-tags="tambah portofolio saham lot harga rata-rata add">
                    <summary>Bagaimana cara menambahkan saham ke portofolio?</summary>
                    <p>Buka halaman Portofolio, klik Tambah, lalu isi kode saham, jumlah lot, dan harga rata-rata. Data tersimpan di basis data dan sinkron antar sesi.</p>
                </details>
                <details class="help-faq-item" data-help-tags="data realtime real-time tertunda yahoo finance scheduler">
                    <summary>Data real-time atau tertunda?</summary>
                    <p>Data harga diperbarui melalui scheduler dari Yahoo Finance pada jam 09:00 dan 15:30 WIB. Bukan real-time streaming — gunakan indikator teknikal untuk konfirmasi.</p>
                </details>
            </div>

            <!-- ─── Keyboard Shortcuts Table ──────────────── -->
            <div class="help-guide-head mt-16">
              <h2 class="help-section-title">Pintasan Keyboard Lengkap</h2>
            </div>
            <div class="help-shortcuts-table-wrap" style="overflow-x:auto">
              <table class="help-shortcuts-table" style="width:100%;border-collapse:collapse;font-size:13px">
                <thead>
                  <tr style="border-bottom:1px solid var(--border-subtle)">
                    <th style="text-align:left;padding:8px 12px;color:var(--text-dim);font-weight:600;white-space:nowrap">Pintasan</th>
                    <th style="text-align:left;padding:8px 12px;color:var(--text-dim);font-weight:600">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr data-help-tags="g d dashboard navigasi goto">
                    <td style="padding:8px 12px"><kbd>G</kbd> <kbd>D</kbd></td>
                    <td style="padding:8px 12px;color:var(--text-main)">Buka Dashboard</td>
                  </tr>
                  <tr data-help-tags="g s screener navigasi goto pemindai">
                    <td style="padding:8px 12px"><kbd>G</kbd> <kbd>S</kbd></td>
                    <td style="padding:8px 12px;color:var(--text-main)">Buka Screener</td>
                  </tr>
                  <tr data-help-tags="g p portfolio navigasi goto portofolio">
                    <td style="padding:8px 12px"><kbd>G</kbd> <kbd>P</kbd></td>
                    <td style="padding:8px 12px;color:var(--text-main)">Buka Portfolio</td>
                  </tr>
                  <tr data-help-tags="g w watchlist navigasi goto pantau">
                    <td style="padding:8px 12px"><kbd>G</kbd> <kbd>W</kbd></td>
                    <td style="padding:8px 12px;color:var(--text-main)">Buka Watchlist</td>
                  </tr>
                  <tr data-help-tags="slash search fokus pencarian quick">
                    <td style="padding:8px 12px"><kbd>/</kbd></td>
                    <td style="padding:8px 12px;color:var(--text-main)">Quick search — fokus ke pencarian global</td>
                  </tr>
                  <tr data-help-tags="ctrl+k cmd+k search buka pencarian palette">
                    <td style="padding:8px 12px"><kbd>Ctrl+K</kbd></td>
                    <td style="padding:8px 12px;color:var(--text-main)">Buka palet perintah / pencarian global</td>
                  </tr>
                  <tr data-help-tags="esc escape tutup modal panel close">
                    <td style="padding:8px 12px"><kbd>Esc</kbd></td>
                    <td style="padding:8px 12px;color:var(--text-main)">Tutup modal, panel, atau pencarian</td>
                  </tr>
                  <tr data-help-tags="r refresh reload halaman aktif">
                    <td style="padding:8px 12px"><kbd>R</kbd></td>
                    <td style="padding:8px 12px;color:var(--text-main)">Refresh halaman aktif</td>
                  </tr>
                  <tr data-help-tags="arrow up down navigasi hasil pencarian">
                    <td style="padding:8px 12px"><kbd>↑</kbd> <kbd>↓</kbd></td>
                    <td style="padding:8px 12px;color:var(--text-main)">Navigasi hasil pencarian</td>
                  </tr>
                  <tr data-help-tags="enter buka item pilih select">
                    <td style="padding:8px 12px"><kbd>Enter</kbd></td>
                    <td style="padding:8px 12px;color:var(--text-main)">Buka item terpilih</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- ─── Changelog ─────────────────────────────── -->
            <div class="help-guide-head mt-16">
              <h2 class="help-section-title">📋 Changelog</h2>
            </div>
            <div class="help-changelog-stack" style="display:flex;flex-direction:column;gap:12px" data-help-tags="changelog update versi rilis history">
              <div class="help-changelog-item" style="padding:14px 16px;border-radius:10px;background:var(--bg-panel);border:1px solid var(--border-subtle)">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
                  <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;background:var(--accent,#3b82f6);color:#fff">v1.2.0</span>
                  <span class="text-xs text-dim">Terbaru — Mei 2026</span>
                </div>
                <ul style="margin:0;padding-left:18px;font-size:13px;color:var(--text-main);line-height:1.7">
                  <li>Share link saham — salin link langsung dari header stock detail</li>
                  <li>404 fallback page — halaman tidak ditemukan yang informatif</li>
                  <li>Dashboard refresh button — perbarui data tanpa reload penuh</li>
                  <li>Calendar export ICS — download event kalender ke aplikasi kalender</li>
                  <li>Screener filter sektor & market cap — pindai berdasarkan sektor dan ukuran perusahaan</li>
                  <li>Market cap di header stock detail — lihat kapitalisasi pasar langsung di price board</li>
                  <li>Badge sektor & industry di stock detail header</li>
                  <li>News category count — jumlah artikel per kategori di filter pill</li>
                  <li>Badge "Baru" untuk artikel berita terbaru (&lt; 2 jam)</li>
                  <li>Tombol "Tambah ke Portfolio" langsung dari stock detail</li>
                  <li>Quick screener preset links di dashboard</li>
                  <li>Alert harga kini vs threshold — lihat seberapa dekat harga dengan target alert</li>
                  <li>Watchlist sort by % change default</li>
                  <li>Settings: versi aplikasi & tombol clear cache</li>
                  <li>TradingView link di chart tab stock detail</li>
                  <li>IPO countdown hari menuju listing</li>
                </ul>
              </div>
              <div class="help-changelog-item" style="padding:14px 16px;border-radius:10px;background:var(--bg-panel);border:1px solid var(--border-subtle)">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
                  <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;background:var(--accent,#3b82f6);color:#fff">v29</span>
                  <span class="text-xs text-dim">Terbaru</span>
                </div>
                <ul style="margin:0;padding-left:18px;font-size:13px;color:var(--text-main);line-height:1.7">
                  <li>Paper trades CRUD — simulasi trading tanpa modal nyata</li>
                  <li>Backtest connect — uji strategi SMA, RSI, Bollinger pada data historis</li>
                  <li>Financials 870 baris — laporan keuangan lengkap per emiten</li>
                  <li>Market briefing harian otomatis (AI + fallback)</li>
                </ul>
              </div>
              <div class="help-changelog-item" style="padding:14px 16px;border-radius:10px;background:var(--bg-panel);border:1px solid var(--border-subtle)">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
                  <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;background:var(--bg-card,#334155);color:var(--text-main)">v28</span>
                </div>
                <ul style="margin:0;padding-left:18px;font-size:13px;color:var(--text-main);line-height:1.7">
                  <li>User auth — Device ID, PIN akses, nickname akun</li>
                  <li>PWA offline — install ke homescreen, cache aset statis</li>
                  <li>Onboarding flow — panduan interaktif untuk pengguna baru</li>
                  <li>Telegram &amp; SMTP alert integration</li>
                </ul>
              </div>
              <div class="help-changelog-item" style="padding:14px 16px;border-radius:10px;background:var(--bg-panel);border:1px solid var(--border-subtle)">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
                  <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;background:var(--bg-card,#334155);color:var(--text-main)">v27</span>
                </div>
                <ul style="margin:0;padding-left:18px;font-size:13px;color:var(--text-main);line-height:1.7">
                  <li>AI Picks harian — rekomendasi berbasis LLM via OpenRouter</li>
                  <li>Market briefing — ringkasan pasar IDX otomatis setiap hari</li>
                  <li>25 views — dashboard, screener, portofolio, watchlist, dan lebih banyak lagi</li>
                  <li>Gamification — streak login, XP, dan badge pencapaian</li>
                </ul>
              </div>
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
            <button id="help-replay-onboarding" class="btn btn-secondary" style="margin-top:16px;width:100%;justify-content:center;">
              <i data-lucide="play-circle" style="width:16px;height:16px;margin-right:6px"></i>
              Lihat Onboarding Lagi
            </button>
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

    // ─── Replay Onboarding ───────────────────────────
    const replayBtn = document.getElementById('help-replay-onboarding');
    if (replayBtn) {
      replayBtn.addEventListener('click', () => {
        localStorage.removeItem('retailbijak.onboarded.v1');
        if (typeof showOnboarding === 'function') {
          showOnboarding();
        } else {
          location.reload();
        }
      });
    }

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
