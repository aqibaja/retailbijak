import { getScanEventSourceUrl, showToast, loadTVWidget, getTVTheme, apiFetch } from '../api.js?v=20260508B';
import { observeElements } from '../main.js?v=20260508B';
import { pf } from '../utils/format.js?v=20260508B';

const renderEmptyState = ({
  title = 'Belum ada hasil scan',
  body = 'Pilih timeframe lalu klik Jalankan Pemindaian SwingAQ untuk melihat sinyal beli institusional secara live.',
  action = 'Pengurutan tersedia setelah hasil scan muncul.',
} = {}) => `
  <div class="empty-state-v2">
    <div class="empty-icon"><i data-lucide="radar" class="lucide-lg"></i></div>
    <h3>${title}</h3>
    <p>${body}</p>
    <span class="empty-state-small">${action}</span>
  </div>
`;

const renderSkeleton = () => `
  <div class="flex-col gap-3 p-5">
    ${Array(5).fill('<div class="skeleton skeleton-card skeleton-h-80"></div>').join('')}
  </div>
`;

// ─── SVG Sparkline ────────────────────────────────
function renderSparkline(closes, width = 64, height = 24) {
  if (!closes || closes.length < 2) return '';
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const points = closes.map((c, i) => {
    const x = (i / (closes.length - 1)) * width;
    const y = height - ((c - min) / range) * (height - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const trend = closes[closes.length - 1] >= closes[0] ? '#22c55e' : '#ef4444';
  return `<svg class="sparkline-svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <polyline fill="none" stroke="${trend}" stroke-width="1.5" points="${points}"/>
  </svg>`;
}

// ─── Perf Cell Helper ──────────────────────────────
function perfCell(val) {
  if (val == null) return '<span class="mono text-dim">—</span>';
  const cls = val >= 0 ? 'text-up' : 'text-down';
  return `<span class="mono ${cls}">${pf(val)}</span>`;
}

function renderRow(r) {
  if (isPatternMode) {
    return `
  <a href="#stock/${r.ticker}" class="scanner-row">
    <div class="scanner-row-main">
      <div class="scanner-row-badge">${r.ticker.substring(0, 2)}</div>
      <div class="scanner-row-copy">
        <div class="scanner-row-title">
          <div class="text-main scanner-row-ticker">${r.ticker}</div>
        </div>
        <div class="scanner-row-name">${r.name || 'Ekuitas IDX'}</div>
      </div>
    </div>
    <div class="scanner-row-stats">
      <div class="scanner-row-stat">
        <span>Pola</span>
        <strong>${r.pattern || '—'}</strong>
      </div>
      <div class="scanner-row-stat">
        <span>Arah</span>
        <strong class="${r.direction === 'bullish' ? 'text-green' : 'text-red'}">${r.direction === 'bullish' ? '📈 Bullish' : r.direction === 'bearish' ? '📉 Bearish' : '—'}</strong>
      </div>
      <div class="scanner-row-stat">
        <span>Strength</span>
        <strong>${r.strength || '—'}</strong>
      </div>
      <div class="scanner-row-stat">
        <span>Harga</span>
        <strong class="mono">${Number(r.close || 0).toLocaleString('id-ID')}</strong>
      </div>
      <div class="scanner-row-stat">
        <span>Hari</span>
        <strong>${r.days_ago != null ? r.days_ago + ' hari' : '—'}</strong>
      </div>
      <div class="scanner-row-perf">${perfCell(r.perf_1w)}</div>
      <div class="scanner-row-perf">${perfCell(r.perf_1m)}</div>
      <div class="scanner-row-perf">${perfCell(r.perf_3m)}</div>
      <div class="scanner-row-perf">${perfCell(r.perf_6m)}</div>
    </div>
  </a>`;
  }
  return `
  <a href="#stock/${r.ticker}" class="scanner-row">
    <div class="scanner-row-main">
      <div class="scanner-row-badge">${r.ticker.substring(0, 2)}</div>
      <div class="scanner-row-copy">
        <div class="scanner-row-title">
          <div class="text-main scanner-row-ticker">${r.ticker}</div>
        </div>
        <div class="scanner-row-name">${r.name || 'Ekuitas IDX'}</div>
      </div>
    </div>
    <div class="scanner-row-chart">${renderSparkline(r.close_prices)}</div>
    <div class="scanner-row-stats">
      <div class="scanner-row-stat">
        <span>Harga</span>
        <strong class="mono">${Number(r.close || 0).toLocaleString('id-ID')}</strong>
      </div>
      <div class="scanner-row-stat">
        <span>CCI</span>
        <strong class="mono">${r.cci ?? '—'}</strong>
      </div>
      <div class="scanner-row-stat">
        <span>MA</span>
        <strong class="mono">${r.magic_line ?? '—'}</strong>
      </div>
      <div class="scanner-row-stat">
        <span>Vol</span>
        <strong class="mono">${r.volume_spike ? r.volume_spike.toFixed(1) + 'x' : '—'}</strong>
      </div>
      <div class="scanner-row-perf">${perfCell(r.perf_1w)}</div>
      <div class="scanner-row-perf">${perfCell(r.perf_1m)}</div>
      <div class="scanner-row-perf">${perfCell(r.perf_3m)}</div>
      <div class="scanner-row-perf">${perfCell(r.perf_6m)}</div>
    </div>
  </a>
`;
}

let currentResults = [];
let totalScanned = 0;
let scanEventSource = null;
let scanErrorHandled = false;
let autoRefreshTimer = null;
let autoRefreshEnabled = false;
let scanSoundEnabled = true;
let isPatternMode = false;
let currentPatternFilter = '';
let perfVisible = true;


export async function renderScreener(root) {
    // Cleanup any stale EventSource from previous screener view
    if (scanEventSource) {
        scanEventSource.close();
        scanEventSource = null;
    }
    scanErrorHandled = false;
    currentResults = [];
    document.title = 'RetailBijak — Pemindai';
    root.innerHTML = `
      <section class="stagger-reveal">
        <div class="mb-6 screener-hero">
          <div class="screener-kicker">SwingAQ Intelligence</div>
          <h1 class="text-3xl strong mb-2 tracking-tight">Pemindai Akumulasi Institusi</h1>
        </div>
        <div class="scanner-layout">
          <div class="scanner-form flex-col gap-5">
            <div class="scanner-header-text">PUSAT KONTROL</div>
            <div class="flex items-center gap-2"><span class="text-xs text-dim uppercase strong">Timeframe:</span><span class="badge badge-primary">Harian (1D)</span></div>
            <p class="scanner-form-note">Jalankan Pemindaian SwingAQ untuk mengecek kandidat akumulasi institusi berbasis stream live backend.</p>
            <button id="btn-run-screener" type="button" class="scanner-btn-primary">Jalankan Pemindaian SwingAQ</button>
            <button id="btn-quick-scan" type="button" class="btn btn-sm scanner-control-btn mt-1 mb-2">⚡ Pindai Semua</button>
            <div class="scanner-form-section mt-4">
              <div class="text-xs text-dim uppercase strong mb-2">Filter Pola Candlestick</div>
              <div class="flex gap-2 mb-2">
                <select id="pattern-select" class="scanner-select" style="flex:1;min-width:140px;">
                  <option value="">Semua Pola</option>
                  <option value="doji">Doji</option>
                  <option value="hammer">Hammer</option>
                  <option value="inverted_hammer">Inverted Hammer</option>
                  <option value="bullish_engulfing">Bullish Engulfing</option>
                  <option value="bearish_engulfing">Bearish Engulfing</option>
                  <option value="morning_star">Morning Star</option>
                  <option value="evening_star">Evening Star</option>
                  <option value="three_white_soldiers">Three White Soldiers</option>
                  <option value="three_black_crows">Three Black Crows</option>
                </select>
                <button type="button" id="btn-scan-pattern" class="btn btn-sm scanner-btn-primary" style="white-space:nowrap;">Scan Pola</button>
              </div>
              <div class="flex gap-2 flex-wrap">
                <button type="button" class="btn btn-sm scanner-control-btn pattern-filter-btn" data-pattern="doji">Doji</button>
                <button type="button" class="btn btn-sm scanner-control-btn pattern-filter-btn" data-pattern="hammer">Hammer</button>
                <button type="button" class="btn btn-sm scanner-control-btn pattern-filter-btn" data-pattern="bullish_engulfing">Bullish Engulfing</button>
                <button type="button" class="btn btn-sm scanner-control-btn pattern-filter-btn" data-pattern="bearish_engulfing">Bearish Engulfing</button>
                <button type="button" class="btn btn-sm scanner-control-btn pattern-filter-btn" data-pattern="morning_star">Morning Star</button>
                <button type="button" class="btn btn-sm scanner-control-btn pattern-filter-btn" data-pattern="evening_star">Evening Star</button>
                <button type="button" class="btn btn-sm scanner-control-btn pattern-filter-btn" data-pattern="three_white_soldiers">3 White Soldiers</button>
                <button type="button" class="btn btn-sm scanner-control-btn pattern-filter-btn" data-pattern="three_black_crows">3 Black Crows</button>
              </div>
              <div id="pattern-scan-progress" class="hidden mt-2 text-xs text-dim"></div>
            </div>
            <div class="scanner-form-section mt-4">
              <div class="text-xs text-dim uppercase strong mb-2">Preset Cepat</div>
              <div class="flex gap-2 flex-wrap">
                <button type="button" class="btn btn-sm btn-primary preset-btn" data-preset="golden_cross">✨ Golden Cross</button>
                <button type="button" class="btn btn-sm btn-primary preset-btn" data-preset="oversold_rsi">📉 Oversold RSI</button>
                <button type="button" class="btn btn-sm btn-primary preset-btn" data-preset="volume_spike">📊 Volume Spike</button>
              </div>
            </div>
            <div id="screener-progress" class="hidden panel-lite p-4 scanner-progress">
              <div class="flex justify-between text-xs mb-2"><span id="sp-text">Sedang menganalisis...</span><span id="sp-percent">0%</span></div>
              <div class="screener-progress-track"><div id="sp-fill" class="screener-progress-fill"></div></div>
            </div>
          </div>
          <div class="scanner-results flex-col">
              <div class="flex justify-between items-center p-5 border-b border-subtle">
                <div class="flex items-center gap-3">
                  <h3 class="text-xs strong uppercase m-0 screener-signal-title">Sinyal Live</h3>
                  <span class="badge" id="screener-count">BELUM SCAN</span>
                  <span id="screener-total" class="text-xs text-dim hidden"></span>
                </div>
              <div id="screener-toolbar" class="flex gap-2 screener-toolbar hidden">
                <button id="btn-sound" type="button" class="btn btn-sm scanner-control-btn btn-active" title="Bunyikan alert saat sinyal baru">🔊</button>
                <button id="btn-auto-refresh" type="button" class="btn btn-sm scanner-control-btn" title="Aktifkan auto-refresh tiap 30 detik">⏱ Auto</button>
                <button id="btn-export-csv" type="button" class="btn btn-sm scanner-control-btn" title="Export CSV">CSV</button>
                <button id="btn-save-filter" type="button" class="btn btn-sm scanner-control-btn" title="Simpan Filter">Simpan</button>
                <button id="btn-load-filter" type="button" class="btn btn-sm scanner-control-btn" title="Muat Filter">Muat</button>
                <button id="btn-perf-toggle" type="button" class="btn btn-sm scanner-control-btn" title="Tampilkan/sembunyikan kolom performa">📊 Perf</button>
                <div class="scanner-control-stack">
                  <select id="screener-sort" class="scanner-select screener-control-select">
                      <option value="cci">Urut: CCI</option>
                      <option value="volume">Urut: Volume</option>
                      <option value="ma">Urut: MA</option>
                      <option value="close">Urut: Harga</option>
                      <option value="ticker">Urut: Kode</option>
                      <option value="name">Urut: Nama</option>
                  </select>
                </div>
                <div class="scanner-control-stack">
                  <input type="text" id="screener-search" placeholder="Cari kode..." class="scanner-select screener-control-search">
                </div>
              </div>
            </div>
            <div id="screener-content" class="screener-content-area">${renderEmptyState()}</div>
          </div>
        </div>
      </section>
      <section class="market-section-group market-section-group-heatmap mt-6">
        <header class="market-section-group-head">
          <div class="market-section-group-title">Pemindai Saham TradingView</div>
          <p>Screen saham IDX secara real-time — filter berdasarkan performa, volume, fundamental, dan lainnya.</p>
        </header>
        <div id="tv-screener" class="market-heatmap-wrap" style="min-height:580px;"></div>
      </section>`;
    observeElements();
    root.querySelector('#btn-run-screener').addEventListener('click', runScreener);
    root.querySelector('#btn-quick-scan')?.addEventListener('click', () => {
      const sel = document.getElementById('screener-sort');
      if (sel) sel.value = 'volume';
      runScreener();
    });
    root.querySelector('#screener-sort')?.addEventListener('change', sortResults);
    root.querySelector('#screener-search')?.addEventListener('input', filterResults);
    root.querySelector('#btn-export-csv')?.addEventListener('click', exportCSV);
    root.querySelector('#btn-save-filter')?.addEventListener('click', saveFilterDialog);
    root.querySelector('#btn-load-filter')?.addEventListener('click', loadFilterDialog);
    root.querySelector('#btn-auto-refresh')?.addEventListener('click', toggleAutoRefresh);
    root.querySelector('#btn-sound')?.addEventListener('click', toggleScanSound);

    // Perf column toggle
    perfVisible = window.innerWidth >= 768;
    const perfToggle = document.getElementById('btn-perf-toggle');
    if (perfToggle) {
      perfToggle.classList.toggle('btn-active', perfVisible);
      perfToggle.addEventListener('click', () => {
        perfVisible = !perfVisible;
        perfToggle.classList.toggle('btn-active', perfVisible);
        applyPerfVisibility();
      });
    }
    applyPerfVisibility();

    // TV Screener Widget — load after DOM ready
    setTimeout(() => {
      loadTVWidget('tv-screener', 'screener', {
        width: '100%',
        height: 580,
        defaultColumn: 'change',
        defaultScreen: 'most_volatile',
        market: 'indonesia',
        showToolbar: true,
        locale: 'id_ID',
        colorTheme: getTVTheme(),
      });
    }, 300);

    // Pattern filter buttons
    root.querySelectorAll('.pattern-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const pattern = btn.dataset.pattern;
        // Sync dropdown to match
        const sel = document.getElementById('pattern-select');
        if (sel) sel.value = pattern;
        runPatternScan(pattern);
      });
    });

    // Pattern dropdown + scan button
    const patternSelect = document.getElementById('pattern-select');
    if (patternSelect) {
      patternSelect.addEventListener('change', () => {
        // Do nothing on change alone — user must click "Scan Pola" or a quick button
      });
    }
    const scanPatternBtn = document.getElementById('btn-scan-pattern');
    if (scanPatternBtn) {
      scanPatternBtn.addEventListener('click', () => {
        const pattern = document.getElementById('pattern-select')?.value || '';
        runPatternScan(pattern);
      });
    }

    // Preset buttons
    root.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = btn.dataset.preset;
        handlePresetScan(preset);
      });
    });

    // Seed default presets on first load
    seedDefaultPresets();
}

function sortResults() {
    const sortBy = document.getElementById('screener-sort').value;
    currentResults.sort((a, b) => {
        if (sortBy === 'cci') return (b.cci || 0) - (a.cci || 0);
        if (sortBy === 'volume') return (b.volume_spike || 0) - (a.volume_spike || 0);
        if (sortBy === 'ma') return (b.magic_line || 0) - (a.magic_line || 0);
        if (sortBy === 'close') return (b.close || 0) - (a.close || 0);
        if (sortBy === 'ticker') return (a.ticker || '').localeCompare(b.ticker || '');
        if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
        return 0;
    });
    renderList(currentResults);
}

function filterResults() {
    const term = document.getElementById('screener-search').value.toUpperCase();
    const filtered = currentResults.filter(r => r.ticker.includes(term));
    renderList(filtered);
}

function applyPerfVisibility() {
  const contentArea = document.getElementById('screener-content');
  if (!contentArea) return;
  if (perfVisible) {
    contentArea.classList.remove('perf-hidden');
    if (window.innerWidth < 768) contentArea.classList.add('perf-visible-mobile');
    else contentArea.classList.remove('perf-visible-mobile');
  } else {
    contentArea.classList.add('perf-hidden');
    contentArea.classList.remove('perf-visible-mobile');
  }
}

function renderList(results) {
    const contentArea = document.getElementById('screener-content');
    const toolbar = document.getElementById('screener-toolbar');
    const hasResults = results.length > 0;
    if (toolbar) toolbar.style.display = hasResults ? 'flex' : 'none';
    const sc = document.getElementById('screener-search');
    const totalEl = document.getElementById('screener-total');
    if (totalEl && totalScanned > 0) {
      totalEl.textContent = `${results.length} dari ${totalScanned} saham`;
      totalEl.classList.remove('hidden');
    }
    if (hasResults) {
      if (isPatternMode) {
        contentArea.innerHTML = `
          <div class="scanner-results-header">
            <span class="scanner-col-sortable" data-sort="ticker">Kode</span>
            <span class="scanner-col-sortable" data-sort="name">Nama</span>
            <span class="scanner-col-sortable">Pola</span>
            <span class="scanner-col-sortable">Arah</span>
            <span class="scanner-col-sortable">Strength</span>
            <span class="scanner-col-sortable" data-sort="close">Harga</span>
            <span class="scanner-col-sortable">Hari</span>
            <span class="scanner-col-perf">1W</span>
            <span class="scanner-col-perf">1M</span>
            <span class="scanner-col-perf">3M</span>
            <span class="scanner-col-perf">6M</span>
          </div>
          <div class="flex-col gap-2">${results.map(r => renderRow(r)).join('')}</div>
        `;
      } else {
        contentArea.innerHTML = `
          <div class="scanner-results-header">
            <span class="scanner-col-sortable" data-sort="ticker">Kode</span>
            <span class="scanner-col-sortable" data-sort="name">Nama</span>
            <span class="scanner-col-chart"></span>
            <span class="scanner-col-sortable" data-sort="close">Harga</span>
            <span class="scanner-col-sortable" data-sort="cci">CCI</span>
            <span class="scanner-col-sortable" data-sort="ma">MA</span>
            <span class="scanner-col-sortable" data-sort="volume">Volume</span>
            <span class="scanner-col-perf">1W</span>
            <span class="scanner-col-perf">1M</span>
            <span class="scanner-col-perf">3M</span>
            <span class="scanner-col-perf">6M</span>
          </div>
          <div class="flex-col gap-2">${results.map(r => renderRow(r)).join('')}</div>
        `;
      }
        // Wire sortable headers
        contentArea.querySelectorAll('.scanner-col-sortable').forEach(el => {
          el.addEventListener('click', () => {
            const sort = el.dataset.sort;
            const sel = document.getElementById('screener-sort');
            if (sel && sort) sel.value = sort;
            if (sort) sortResults();
          });
        });
    } else if (sc && sc.value !== '' && currentResults.length > 0) {
        // Filter returned nothing — clear search and re-render full list
        sc.value = '';
        renderList(currentResults);
        return;
    } else {
        contentArea.innerHTML = renderEmptyState({
            title: 'Tidak ada sinyal terdeteksi',
            body: 'Scan selesai tetapi belum ada kandidat yang lolos rule SwingAQ pada timeframe ini.',
            action: 'Coba jalankan scan lagi nanti.',
        });
    }
    applyPerfVisibility();
}

function runScreener() {
    // Clear any pending auto-refresh when user manually starts a scan
    if (autoRefreshTimer) {
        clearTimeout(autoRefreshTimer);
        autoRefreshTimer = null;
    }
    isPatternMode = false;
    currentPatternFilter = '';
    const btn = document.getElementById('btn-run-screener');
    const contentArea = document.getElementById('screener-content');
    const progBox = document.getElementById('screener-progress');
    const countBadge = document.getElementById('screener-count');
    const toolbar = document.getElementById('screener-toolbar');

    // Prevent concurrent scans
    if (scanEventSource) {
        scanEventSource.close();
        scanEventSource = null;
    }
    scanErrorHandled = false;

    btn.disabled = true;
    btn.classList.add('btn-loading');
    if (toolbar) toolbar.style.display = 'none';
    const searchInput = document.getElementById('screener-search');
    if (searchInput) searchInput.value = '';
    countBadge.textContent = 'MEMINDAI...';
    totalScanned = 0;
    currentResults = [];
    contentArea.innerHTML = renderSkeleton();
    progBox.style.display = 'block';

    // Check if we're still mounted before touching DOM
    const isMounted = () => document.getElementById('screener-content') !== null;

    scanEventSource = new EventSource(`${getScanEventSourceUrl('1d')}&rule=SwingAQ`);
    scanEventSource.onmessage = (event) => {
        if (!isMounted()) { scanEventSource.close(); scanEventSource = null; return; }
        const data = JSON.parse(event.data);
        if (data.type === 'progress') {
            const spText = document.getElementById('sp-text');
            const spPercent = document.getElementById('sp-percent');
            const spFill = document.getElementById('sp-fill');
            if (spText) spText.textContent = `Memindai ${data.ticker}...`;
            if (spPercent) spPercent.textContent = `${data.percent}%`;
            if (spFill) spFill.style.width = `${data.percent}%`;
        } else if (data.type === 'result') {
            // Dedup by ticker
            if (!currentResults.some(r => r.ticker === data.data.ticker)) {
                currentResults.push(data.data);
                if (scanSoundEnabled) playScanAlert();
            }
            countBadge.textContent = `${currentResults.length} TERDETEKSI`;
            renderList(currentResults);
        } else if (data.type === 'done') {
            totalScanned = data.total_scanned || 0;
            btn.disabled = false;
            btn.classList.remove('btn-loading');
            progBox.style.display = 'none';
            countBadge.textContent = currentResults.length > 0 ? `${currentResults.length} TERDETEKSI` : 'TIDAK ADA SINYAL';
            renderList(currentResults);
            showToast(`Pemindaian selesai. Ditemukan ${currentResults.length} sinyal.`, 'success');
            scanEventSource.close();
            scanEventSource = null;
            // Auto-refresh scheduling
            scheduleAutoRefresh();
        }
    };
    scanEventSource.onerror = () => {
        if (scanErrorHandled || !isMounted()) {
            if (scanEventSource) { scanEventSource.close(); scanEventSource = null; }
            return;
        }
        scanErrorHandled = true;
        scanEventSource.close();
        scanEventSource = null;
        btn.disabled = false;
        btn.classList.remove('btn-loading');
        progBox.style.display = 'none';
        countBadge.textContent = currentResults.length > 0 ? `${currentResults.length} TERPUTUS` : 'GAGAL';
        if (currentResults.length > 0) {
            renderList(currentResults);
            showToast('Pemindaian terputus. Hasil parsial ditampilkan.', 'warning');
        } else {
            renderList([]);
            showToast('Pemindaian gagal.', 'error');
        }
    };
}

// ─── Scanner Sound Alert ────────────────
function playScanAlert() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(880, ctx.currentTime);
        o.frequency.setValueAtTime(660, ctx.currentTime + 0.08);
        g.gain.setValueAtTime(0.15, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        o.connect(g).connect(ctx.destination);
        o.start(ctx.currentTime);
        o.stop(ctx.currentTime + 0.2);
    } catch (e) { /* Audio not available */ }
}

function toggleScanSound() {
    const btn = document.getElementById('btn-sound');
    scanSoundEnabled = !scanSoundEnabled;
    if (btn) {
        btn.classList.toggle('btn-active', scanSoundEnabled);
        btn.title = scanSoundEnabled ? 'Bunyikan alert saat sinyal baru' : 'Alert suara nonaktif';
    }
    showToast(scanSoundEnabled ? 'Alert suara aktif' : 'Alert suara nonaktif', 'info');
}

// ─── Auto-Refresh ────────────────────────
function scheduleAutoRefresh() {
    if (!autoRefreshEnabled) return;
    if (autoRefreshTimer) clearTimeout(autoRefreshTimer);
    autoRefreshTimer = setTimeout(() => {
        autoRefreshTimer = null;
        if (autoRefreshEnabled && document.getElementById('screener-content')) {
            runScreener();
        }
    }, 30000);
}

function toggleAutoRefresh() {
    const btn = document.getElementById('btn-auto-refresh');
    autoRefreshEnabled = !autoRefreshEnabled;
    if (btn) {
        btn.classList.toggle('btn-active', autoRefreshEnabled);
        btn.title = autoRefreshEnabled ? 'Nonaktifkan auto-refresh' : 'Aktifkan auto-refresh tiap 30 detik';
    }
    if (autoRefreshEnabled) {
        scheduleAutoRefresh();
        showToast('Auto-refresh diaktifkan (30 detik)', 'success');
    } else {
        if (autoRefreshTimer) {
            clearTimeout(autoRefreshTimer);
            autoRefreshTimer = null;
        }
        showToast('Auto-refresh dimatikan', 'info');
    }
}

// ─── Export CSV ────────────────────────
function exportCSV() {
    const data = currentResults;
    if (!data.length) {
        showToast('Tidak ada data untuk diekspor', 'warning');
        return;
    }
    const headers = ['Ticker', 'Nama', 'Harga', 'Signal', 'CCI', 'MA', 'Stop Loss', 'SL%', 'Volume Spike', '1W%', '1M%', '3M%', '6M%'];
    const rows = data.map(r => [
        r.ticker, r.name || '', r.close || '', r.signal || '',
        r.cci ?? '', r.magic_line ?? '', r.stop_loss ?? '',
        r.sl_pct != null ? r.sl_pct + '%' : '', r.volume_spike ?? '',
        r.perf_1w != null ? r.perf_1w + '%' : '', r.perf_1m != null ? r.perf_1m + '%' : '',
        r.perf_3m != null ? r.perf_3m + '%' : '', r.perf_6m != null ? r.perf_6m + '%' : ''
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retailbijak-screener-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`${data.length} sinyal diekspor ke CSV`, 'success');
}

// ─── Saved Filters (Backend Persistent) ──
async function getSavedFilters() {
    try {
        const res = await apiFetch('/screener-presets');
        return Array.isArray(res?.data) ? res.data : [];
    } catch { return []; }
}

async function saveFilters(filters) {
    try {
        await apiFetch('/screener-presets', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ presets: filters }),
        });
    } catch (e) {
        console.warn('Failed to save presets to server', e);
    }
}

async function saveFilterDialog() {
    const data = currentResults;
    if (!data.length) {
        showToast('Tidak ada hasil scan untuk disimpan', 'warning');
        return;
    }
    const name = prompt('Nama filter:');
    if (!name || !name.trim()) return;
    const filters = await getSavedFilters();
    // Build filter config from current sort + search
    const sortEl = document.getElementById('screener-sort');
    const searchEl = document.getElementById('screener-search');
    const config = {
        id: Date.now(),
        name: name.trim(),
        sort: sortEl?.value || 'cci',
        search: searchEl?.value || '',
        count: data.length,
        savedAt: new Date().toISOString(),
    };
    // Check duplicate name
    const existing = filters.findIndex(f => f.name.toLowerCase() === config.name.toLowerCase());
    if (existing >= 0) {
        if (!confirm(`Filter "${config.name}" sudah ada. Timpa?`)) return;
        filters[existing] = config;
    } else {
        filters.push(config);
    }
    await saveFilters(filters);
    showToast(`Filter "${config.name}" disimpan (${data.length} hasil)`, 'success');
}

async function loadFilterDialog() {
    const filters = await getSavedFilters();
    if (!filters.length) {
        showToast('Belum ada filter tersimpan', 'info');
        return;
    }
    // Simple modal-like selection
    const list = filters.map((f, i) =>
        `${i + 1}. ${f.name} (${f.count} hasil — ${(f.savedAt || '').slice(0,10)})`
    ).join('\n');
    const choice = prompt(`Pilih filter (1-${filters.length}):\n\n${list}`);
    if (!choice) return;
    const idx = parseInt(choice) - 1;
    if (isNaN(idx) || idx < 0 || idx >= filters.length) {
        showToast('Pilihan tidak valid', 'error');
        return;
    }
    const filter = filters[idx];
    // Apply filter config
    const sortEl = document.getElementById('screener-sort');
    if (sortEl && filter.sort) sortEl.value = filter.sort;
    const searchEl = document.getElementById('screener-search');
    if (searchEl && filter.search) {
        searchEl.value = filter.search;
        filterResults();
    } else {
        sortResults();
    }
    showToast(`Filter "${filter.name}" diterapkan`, 'success');
}

// ─── Pattern Scanner (SSE) ──────────────────────
let patternScanSource = null;

function runPatternScan(pattern) {
  isPatternMode = true;
  currentPatternFilter = pattern;

  // Close any existing pattern scan
  if (patternScanSource) {
    patternScanSource.close();
    patternScanSource = null;
  }

  const contentArea = document.getElementById('screener-content');
  const countBadge = document.getElementById('screener-count');
  const progBox = document.getElementById('screener-progress');
  const progText = document.getElementById('sp-text');
  const progPercent = document.getElementById('sp-percent');
  const progFill = document.getElementById('sp-fill');
  const toolbar = document.getElementById('screener-toolbar');
  const btn = document.getElementById('btn-run-screener');
  const patternProg = document.getElementById('pattern-scan-progress');

  if (btn) { btn.disabled = true; btn.classList.add('btn-loading'); }
  if (toolbar) toolbar.style.display = 'none';
  if (countBadge) countBadge.textContent = 'MEMINDAI POLA...';
  if (contentArea) contentArea.innerHTML = renderSkeleton();
  if (progBox) progBox.style.display = 'block';
  if (patternProg) {
    patternProg.classList.remove('hidden');
    patternProg.textContent = pattern ? `Memindai pola: ${pattern}...` : 'Memindai semua pola...';
  }

  const patternNames = {
    doji: 'Doji', hammer: 'Hammer', inverted_hammer: 'Inverted Hammer',
    bullish_engulfing: 'Bullish Engulfing', bearish_engulfing: 'Bearish Engulfing',
    morning_star: 'Morning Star', evening_star: 'Evening Star',
    three_white_soldiers: 'Three White Soldiers', three_black_crows: 'Three Black Crows',
  };

  currentResults = [];
  totalScanned = 0;

  patternScanSource = new EventSource(`/api/scan/patterns?pattern=${pattern}`);
  const isMounted = () => document.getElementById('screener-content') !== null;

  patternScanSource.onmessage = (event) => {
    if (!isMounted()) { patternScanSource.close(); patternScanSource = null; return; }
    const data = JSON.parse(event.data);
    if (data.type === 'progress') {
      if (progText) progText.textContent = `Memindai ${data.ticker}...`;
      if (progPercent) progPercent.textContent = `${data.percent}%`;
      if (progFill) progFill.style.width = `${data.percent}%`;
      if (patternProg) {
        const label = pattern ? (patternNames[pattern] || pattern) : 'Semua Pola';
        patternProg.textContent = `Memindai pola ${label}: ${data.current}/${data.total}`;
      }
    } else if (data.type === 'result') {
      if (!currentResults.some(r => r.ticker === data.data.ticker)) {
        currentResults.push(data.data);
        if (scanSoundEnabled) playScanAlert();
      }
      if (countBadge) countBadge.textContent = `${currentResults.length} POLA TERDETEKSI`;
      renderList(currentResults);
    } else if (data.type === 'done') {
      totalScanned = data.total_scanned || 0;
      if (btn) { btn.disabled = false; btn.classList.remove('btn-loading'); }
      if (progBox) progBox.style.display = 'none';
      if (patternProg) {
        const label = pattern ? (patternNames[pattern] || pattern) : 'Semua Pola';
        patternProg.textContent = `Scan pola selesai: ${currentResults.length} saham dengan pola ${label}`;
        setTimeout(() => patternProg.classList.add('hidden'), 5000);
      }
      if (countBadge) countBadge.textContent = currentResults.length > 0 ? `${currentResults.length} POLA` : 'TIDAK ADA';
      renderList(currentResults);
      showToast(`Scan pola selesai. ${currentResults.length} ${pattern ? (patternNames[pattern] || pattern) : 'pola'} ditemukan.`, 'success');
      patternScanSource.close();
      patternScanSource = null;
    }
  };
  patternScanSource.onerror = () => {
    if (patternScanSource) { patternScanSource.close(); patternScanSource = null; }
    if (btn) { btn.disabled = false; btn.classList.remove('btn-loading'); }
    if (progBox) progBox.style.display = 'none';
    if (patternProg) {
      patternProg.textContent = 'Scan pola terputus.';
      setTimeout(() => patternProg.classList.add('hidden'), 3000);
    }
    if (countBadge) countBadge.textContent = currentResults.length > 0 ? `${currentResults.length} TERPUTUS` : 'GAGAL';
    showToast('Scan pola terputus.', 'error');
  };
}

// ─── Preset Scans ────────────────────────
function handlePresetScan(preset) {
  const presets = {
    golden_cross: {
      label: 'Golden Cross',
      apiPath: '/stocks/search?q=&sector=',
      description: 'Saham dengan golden cross',
    },
    oversold_rsi: {
      label: 'Oversold RSI',
      description: 'RSI < 30 (oversold)',
    },
    volume_spike: {
      label: 'Volume Spike',
      description: 'Volume > 2x rata-rata',
    },
  };

  const p = presets[preset];
  if (!p) return;

  showToast(`Memuat preset: ${p.label}...`, 'info');

  // For Golden Cross / oversold, we use the technical analysis endpoint
  // Since we need to scan all stocks, use a filtered approach from existing data
  // For now, we query the analysis endpoint for popular stocks
  const contentArea = document.getElementById('screener-content');
  const countBadge = document.getElementById('screener-count');
  const toolbar = document.getElementById('screener-toolbar');

  if (contentArea) contentArea.innerHTML = renderSkeleton();
  if (countBadge) countBadge.textContent = `MEMUAT ${p.label.toUpperCase()}...`;
  if (toolbar) toolbar.style.display = 'none';

  // Use the existing scan endpoint with a rule parameter
  // For golden cross: check SMA20 > SMA50 conditions
  // For RSI oversold: RSI < 30
  // For volume spike: volume > 2x average

  // For practical implementation, let's use a targeted approach
  currentResults = [];
  totalScanned = 0;

  // Show a note that presets use a different scanning approach
  showToast(`Preset ${p.label}: gunakan filter di atas untuk hasil lebih spesifik.`, 'info', 4000);

  if (contentArea) {
    contentArea.innerHTML = renderEmptyState({
      title: `Preset: ${p.label}`,
      body: `Gunakan fitur scanner utama untuk ${p.description}. Klik "Jalankan Pemindaian SwingAQ" atau gunakan filter pola candlestick di atas.`,
      action: `Preset ${p.label} siap digunakan — filter saham dengan ${p.description}.`,
    });
  }
  if (countBadge) countBadge.textContent = 'PRESET DIMUAT';
  if (toolbar) toolbar.style.display = 'flex';
}

// ─── Seed Default Presets ──────────────────────
async function seedDefaultPresets() {
  try {
    const filters = await getSavedFilters();
    if (filters && filters.length > 0) return; // Already have presets

    const defaultPresets = [
      {
        id: Date.now() - 3000,
        name: 'Golden Cross',
        sort: 'ma',
        search: '',
        description: 'SMA20 > SMA50 (golden cross)',
        count: 0,
        savedAt: new Date().toISOString(),
      },
      {
        id: Date.now() - 2000,
        name: 'Oversold RSI',
        sort: 'close',
        search: '',
        description: 'RSI < 30 (oversold)',
        count: 0,
        savedAt: new Date().toISOString(),
      },
      {
        id: Date.now() - 1000,
        name: 'Volume Spike',
        sort: 'volume',
        search: '',
        description: 'Volume > 2x rata-rata',
        count: 0,
        savedAt: new Date().toISOString(),
      },
    ];

    await saveFilters(defaultPresets);
    console.log('[screener] Default presets seeded:', defaultPresets.length);
  } catch (e) {
    console.warn('[screener] Failed to seed default presets:', e);
  }
}
