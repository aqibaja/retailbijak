import { getScanEventSourceUrl, showToast, loadTVWidget, getTVTheme, apiFetch } from '../api.js?v=20260510';
import { observeElements } from '../main.js?v=20260510';
import { pf } from '../utils/format.js?v=20260510';

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
let sortChain = []; // [{column, dir}, ...]
let activeFilterChips = new Set();
let visibleColumns = null;
const STORAGE_KEY_COLS = 'rbk_screener_cols';

const SCREENER_COLUMNS = [
  { key: 'ticker', label: 'Kode', group: 'main', default: true, sortable: true, align: 'left', width: 'minmax(80px,1fr)' },
  { key: 'name', label: 'Nama', group: 'main', default: true, sortable: true, align: 'left', width: 'minmax(80px,1fr)' },
  { key: 'chart',  label: '',     group: 'main', default: true, sortable: false, align: 'center', width: '68px' },
  { key: 'close',  label: 'Harga', group: 'price', default: true, sortable: true, align: 'right', width: 'minmax(60px,auto)' },
  { key: 'cci',    label: 'CCI',  group: 'tech', default: true, sortable: true, align: 'right', width: 'minmax(50px,auto)' },
  { key: 'ma',     label: 'MA',   group: 'tech', default: true, sortable: true, align: 'right', width: 'minmax(50px,auto)' },
  { key: 'volume', label: 'Vol',  group: 'volume', default: true, sortable: true, align: 'right', width: 'minmax(50px,auto)' },
  { key: 'perf_1w', label: '1W', group: 'perf', default: true, sortable: true, align: 'right', width: 'minmax(44px,auto)' },
  { key: 'perf_1m', label: '1M', group: 'perf', default: true, sortable: true, align: 'right', width: 'minmax(44px,auto)' },
  { key: 'perf_3m', label: '3M', group: 'perf', default: false, sortable: true, align: 'right', width: 'minmax(44px,auto)' },
  { key: 'perf_6m', label: '6M', group: 'perf', default: false, sortable: true, align: 'right', width: 'minmax(44px,auto)' },
];

const FILTER_CHIP_DEFS = [
  { id: 'gainers', label: '🚀 Gainers', check: r => (r.perf_1w || 0) > 0 },
  { id: 'volume_spike', label: '📊 Volume Spike', check: r => (r.volume_spike || 0) > 2.0 },
  { id: 'rsi_oversold', label: '📉 RSI Oversold', check: r => r.rsi != null && r.rsi < 30 },
  { id: 'rsi_overbought', label: '📈 RSI Overbought', check: r => r.rsi != null && r.rsi > 70 },
  { id: 'most_active', label: '🔥 Most Active', check: r => (r.volume_spike || 0) > 1.0 },
];


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
            <div class="scanner-form-section">
              <div class="text-xs text-dim uppercase strong mb-2">Filter Indeks</div>
              <div class="flex gap-2">
                <select id="index-filter-select" class="scanner-select" style="flex:1;min-width:140px;">
                  <option value="">Semua Saham</option>
                  <option value="LQ45">LQ45</option>
                  <option value="IDX30">IDX30</option>
                  <option value="KOMPAS100">KOMPAS100</option>
                  <option value="IDX80">IDX80</option>
                  <option value="IDXESGL">IDX ESG Leaders</option>
                </select>
              </div>
            </div>
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
                <button id="btn-save-filter" type="button" class="btn btn-sm scanner-control-btn" title="Simpan Filter Cepat">Simpan</button>
                <button id="btn-save-filter-as" type="button" class="btn btn-sm scanner-control-btn" title="Simpan Sebagai...">Simpan Sebagai...</button>
                <button id="btn-load-filter" type="button" class="btn btn-sm scanner-control-btn" title="Muat & Kelola Scan">Muat</button>
                <button id="btn-manage-scans" type="button" class="btn btn-sm scanner-control-btn" title="Kelola Scan Tersimpan">Kelola</button>
                <button id="btn-perf-toggle" type="button" class="btn btn-sm scanner-control-btn" title="Tampilkan/sembunyikan kolom performa">📊 Perf</button>
                <button id="btn-columns" type="button" class="btn btn-sm scanner-control-btn" title="Pilih kolom tampilan">☰ Kolom</button>
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
            <div id="screener-filter-bar" class="screener-filter-bar hidden"></div>
            <div id="screener-sort-bar" class="screener-sort-bar hidden"></div>
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
    root.querySelector('#btn-save-filter-as')?.addEventListener('click', saveFilterAsDialog);
    root.querySelector('#btn-load-filter')?.addEventListener('click', loadFilterDialog);
    root.querySelector('#btn-manage-scans')?.addEventListener('click', manageScansDialog);
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

    // Column toggle button
    root.querySelector('#btn-columns')?.addEventListener('click', toggleColumnDropdown);

    // Close column dropdown on outside click
    document.addEventListener('click', (e) => {
      const dd = document.getElementById('col-toggle-dropdown');
      const btn = document.getElementById('btn-columns');
      if (dd && !dd.contains(e.target) && e.target !== btn && !btn?.contains(e.target)) {
        dd.remove();
      }
    });

    // Filter chip clicks (delegated)
    root.querySelector('#screener-filter-bar')?.addEventListener('click', (e) => {
      const chip = e.target.closest('.screener-chip');
      if (chip) toggleFilterChip(chip.dataset.chip);
    });

    // Clear sort button (delegated)
    root.querySelector('#screener-sort-bar')?.addEventListener('click', (e) => {
      const clearBtn = e.target.closest('#btn-clear-sort');
      if (clearBtn) { sortChain = []; renderAll(); }
    });

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
    if (!contentArea) return;
    // Apply chip filters on top of passed results
    const chipFiltered = applyQuickFilters(results);
    // Apply multi-sort
    const sorted = applySorting(chipFiltered);
    const hasResults = sorted.length > 0;
    if (toolbar) toolbar.style.display = hasResults ? 'flex' : 'none';
    const sc = document.getElementById('screener-search');
    const totalEl = document.getElementById('screener-total');
    if (totalEl && totalScanned > 0) {
      totalEl.textContent = `${sorted.length} dari ${totalScanned} saham`;
      totalEl.classList.remove('hidden');
    }
    // Render filter & sort bars
    renderFilterBar();
    renderSortBar();

    if (hasResults) {
      if (isPatternMode) {
        // Keep existing pattern mode rendering
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
          <div class="flex-col gap-2">${sorted.map(r => renderRow(r)).join('')}</div>
        `;
      } else {
        // Dynamic column rendering
        const visCols = getVisibleColumns();
        const activeCols = SCREENER_COLUMNS.filter(c => visCols.has(c.key));
        const gridTemplate = activeCols.map(c => c.width).join(' ');
        // Build header
        const headerHtml = activeCols.map(c => {
          if (c.key === 'chart') {
            return `<span class="scanner-col-chart" data-col="chart"></span>`;
          }
          const sortInfo = sortChain.find(s => s.column === c.key);
          let cls = 'scanner-col-sortable';
          if (sortInfo) cls += sortInfo.dir === 'asc' ? ' sort-asc' : ' sort-desc';
          const num = sortInfo ? `<span class="sort-num">${sortChain.indexOf(sortInfo) + 1}</span>` : '';
          return `<span class="${cls}" data-col="${c.key}" data-sortable="${c.sortable}">${c.label}${num}</span>`;
        }).join('');
        // Build rows
        const rowsHtml = sorted.map(r => {
          const cells = activeCols.map(c => {
            if (c.key === 'ticker') {
              const badge = r.ticker.substring(0, 2);
              return `<span class="scanner-cell scanner-cell-ticker" data-col="ticker"><a href="#stock/${r.ticker}" class="scanner-link"><span class="scanner-cell-badge">${badge}</span><span class="scanner-cell-ticker-text">${r.ticker}</span></a></span>`;
            }
            if (c.key === 'name') {
              return `<span class="scanner-cell scanner-cell-name" data-col="name"><span class="scanner-cell-name-text">${r.name || 'Ekuitas IDX'}</span></span>`;
            }
            if (c.key === 'chart') {
              return `<span class="scanner-cell scanner-cell-chart" data-col="chart">${renderSparkline(r.close_prices)}</span>`;
            }
            if (c.key === 'close') {
              return `<span class="scanner-cell scanner-cell-close mono" data-col="close">${Number(r.close || 0).toLocaleString('id-ID')}</span>`;
            }
            if (c.key === 'cci') {
              return `<span class="scanner-cell scanner-cell-cci mono" data-col="cci">${r.cci ?? '—'}</span>`;
            }
            if (c.key === 'ma') {
              return `<span class="scanner-cell scanner-cell-ma mono" data-col="ma">${r.magic_line ?? '—'}</span>`;
            }
            if (c.key === 'volume') {
              return `<span class="scanner-cell scanner-cell-vol mono" data-col="volume">${r.volume_spike ? r.volume_spike.toFixed(1) + 'x' : '—'}</span>`;
            }
            if (c.key.startsWith('perf_')) {
              return `<span class="scanner-cell scanner-cell-perf" data-col="${c.key}">${perfCell(r[c.key])}</span>`;
            }
            return '';
          }).join('');
          return `<a href="#stock/${r.ticker}" class="scanner-row scanner-row-grid" style="grid-template-columns:${gridTemplate}">${cells}</a>`;
        }).join('');
        contentArea.innerHTML = `
          <div class="scanner-results-header" style="grid-template-columns:${gridTemplate}">${headerHtml}</div>
          <div class="flex-col gap-1">${rowsHtml}</div>
        `;
      }
      // Wire sortable headers — multi-sort
      contentArea.querySelectorAll('.scanner-col-sortable').forEach(el => {
        el.addEventListener('click', () => {
          const colKey = el.dataset.col;
          if (!colKey || el.dataset.sortable === 'false') return;
          handleSortClick(colKey);
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

    const indexEl = document.getElementById('index-filter-select');
    const indexVal = indexEl ? indexEl.value : '';
    let scanUrl = `${getScanEventSourceUrl('1d')}&rule=SwingAQ`;
    if (indexVal) scanUrl += `&index=${encodeURIComponent(indexVal)}`;
    scanEventSource = new EventSource(scanUrl);
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

// ─── Modal Helper ─────────────────────────────
function showModal(title, bodyHtml, footerHtml) {
  // Remove any existing modal
  const existing = document.getElementById('screener-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'screener-modal-overlay';
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.6);
    display:flex;align-items:center;justify-content:center;
    animation:fadeIn 0.15s ease;
  `;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  const modal = document.createElement('div');
  modal.style.cssText = `
    background:var(--card-bg);border-radius:16px;padding:24px;min-width:340px;
    max-width:520px;width:90%;max-height:80vh;overflow-y:auto;
    box-shadow:0 20px 60px rgba(0,0,0,0.3);
  `;

  modal.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h3 style="margin:0;font-size:16px;font-weight:700;color:var(--text-main)">${title}</h3>
      <button type="button" id="screener-modal-close" style="background:none;border:none;font-size:22px;color:var(--text-dim);cursor:pointer;padding:0;line-height:1">&times;</button>
    </div>
    <div id="screener-modal-body">${bodyHtml}</div>
    ${footerHtml ? `<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px" id="screener-modal-footer">${footerHtml}</div>` : ''}
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Close handlers
  document.getElementById('screener-modal-close')?.addEventListener('click', () => overlay.remove());

  return overlay;
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

// ─── Quick Save (existing prompt-based) ────────
async function saveFilterDialog() {
    const data = currentResults;
    if (!data.length) {
        showToast('Tidak ada hasil scan untuk disimpan', 'warning');
        return;
    }
    const name = prompt('Nama filter:');
    if (!name || !name.trim()) return;
    const filters = await getSavedFilters();
    const sortEl = document.getElementById('screener-sort');
    const searchEl = document.getElementById('screener-search');
    const config = {
        id: Date.now(),
        name: name.trim(),
        description: '',
        sort: sortEl?.value || 'cci',
        search: searchEl?.value || '',
        count: data.length,
        savedAt: new Date().toISOString(),
    };
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

// ─── Save As Dialog (Modal with name + description) ──
async function saveFilterAsDialog() {
    const data = currentResults;
    if (!data.length) {
        showToast('Tidak ada hasil scan untuk disimpan', 'warning');
        return;
    }
    const sortEl = document.getElementById('screener-sort');
    const searchEl = document.getElementById('screener-search');
    const currentName = searchEl?.value?.trim() || `Scan ${new Date().toLocaleDateString('id-ID')}`;

    const bodyHtml = `
      <div style="margin-bottom:12px">
        <label style="display:block;font-size:13px;font-weight:600;color:var(--text-main);margin-bottom:4px">Nama Scan <span style="color:var(--down-color)">*</span></label>
        <input type="text" id="smodal-name" value="${currentName.replace(/"/g, '&quot;')}" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border-subtle);background:var(--bg-color);color:var(--text-main);font-size:14px;box-sizing:border-box" placeholder="Nama untuk scan ini" required />
      </div>
      <div style="margin-bottom:12px">
        <label style="display:block;font-size:13px;font-weight:600;color:var(--text-main);margin-bottom:4px">Deskripsi</label>
        <textarea id="smodal-desc" rows="2" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border-subtle);background:var(--bg-color);color:var(--text-main);font-size:13px;box-sizing:border-box;resize:vertical;font-family:inherit" placeholder="Deskripsi opsional">${sortEl ? `Diurutkan: ${sortEl.options[sortEl.selectedIndex]?.text || sortEl.value}` : ''}</textarea>
      </div>
    `;
    const footerHtml = `
      <button type="button" class="btn" id="smodal-cancel" style="font-size:13px">Batal</button>
      <button type="button" class="btn btn-primary" id="smodal-save" style="font-size:13px">Simpan Scan</button>
    `;

    const overlay = showModal('Simpan Sebagai...', bodyHtml, footerHtml);

    document.getElementById('smodal-cancel')?.addEventListener('click', () => overlay.remove());
    document.getElementById('smodal-save')?.addEventListener('click', async () => {
      const nameInput = document.getElementById('smodal-name');
      const descInput = document.getElementById('smodal-desc');
      const name = nameInput?.value?.trim();
      if (!name) {
        showToast('Nama scan harus diisi', 'warning');
        nameInput?.focus();
        return;
      }
      const filters = await getSavedFilters();
      const config = {
        id: Date.now(),
        name: name,
        description: descInput?.value?.trim() || '',
        sort: sortEl?.value || 'cci',
        search: searchEl?.value || '',
        count: data.length,
        savedAt: new Date().toISOString(),
      };
      const existing = filters.findIndex(f => f.name.toLowerCase() === config.name.toLowerCase());
      if (existing >= 0) {
        if (!confirm(`Scan "${config.name}" sudah ada. Timpa?`)) return;
        filters[existing] = config;
      } else {
        filters.push(config);
      }
      await saveFilters(filters);
      overlay.remove();
      showToast(`Scan "${config.name}" disimpan (${data.length} hasil)`, 'success');
    });

    // Enter key to save
    document.getElementById('smodal-name')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('smodal-save')?.click();
    });
    // Focus name input
    setTimeout(() => document.getElementById('smodal-name')?.focus(), 100);
}

// ─── Load Filter Dialog (Modal with table) ──────
async function loadFilterDialog() {
    const filters = await getSavedFilters();
    if (!filters.length) {
        showToast('Belum ada scan tersimpan', 'info');
        return;
    }
    renderFilterListModal(filters, 'Pilih Scan untuk Dimuat');
}

// ─── Manage Scans Dialog ─────────────────────────
async function manageScansDialog() {
    const filters = await getSavedFilters();
    if (!filters.length) {
        showToast('Belum ada scan tersimpan', 'info');
        return;
    }
    renderFilterListModal(filters, 'Kelola Scan Tersimpan', true);
}

// ─── Common: Render filter list modal ────────────
function renderFilterListModal(filters, title, showDelete = false) {
    if (!filters.length) {
      showToast('Belum ada scan tersimpan', 'info');
      return;
    }

    let bodyHtml = `
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:12px">${filters.length} scan tersimpan. Klik untuk memuat.</div>
      <div style="max-height:360px;overflow-y:auto">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="border-bottom:1px solid var(--border-subtle)">
              <th style="text-align:left;padding:8px 6px;font-weight:600;color:var(--text-main)">Nama</th>
              <th style="text-align:left;padding:8px 6px;font-weight:600;color:var(--text-main)">Deskripsi</th>
              <th style="text-align:left;padding:8px 6px;font-weight:600;color:var(--text-main)">Hasil</th>
              <th style="text-align:left;padding:8px 6px;font-weight:600;color:var(--text-main)">Tanggal</th>
              ${showDelete ? '<th style="text-align:center;padding:8px 6px;font-weight:600;color:var(--text-main)">Aksi</th>' : ''}
            </tr>
          </thead>
          <tbody>
    `;

    filters.forEach((f, idx) => {
      const dateStr = f.savedAt ? f.savedAt.slice(0, 10) : '—';
      const desc = f.description || '';
      const resultCount = f.count != null ? `${f.count} hasil` : '—';
      bodyHtml += `
        <tr data-idx="${idx}" style="border-bottom:1px solid var(--border-subtle);cursor:pointer;transition:background 0.15s"
            onmouseover="this.style.background='var(--hover-bg, rgba(255,255,255,0.04))'"
            onmouseout="this.style.background='transparent'">
          <td style="padding:10px 6px;font-weight:600;color:var(--text-main)">${f.name || 'Tanpa Nama'}</td>
          <td style="padding:10px 6px;color:var(--text-muted);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${desc || '—'}</td>
          <td style="padding:10px 6px;color:var(--text-dim)">${resultCount}</td>
          <td style="padding:10px 6px;color:var(--text-dim);white-space:nowrap">${dateStr}</td>
          ${showDelete ? `<td style="padding:10px 6px;text-align:center">
            <button type="button" class="btn btn-sm" data-del-idx="${idx}" style="font-size:11px;padding:4px 8px;color:var(--down-color);border-color:var(--down-color)">Hapus</button>
          </td>` : ''}
        </tr>
      `;
    });

    bodyHtml += `
          </tbody>
        </table>
      </div>
    `;

    const footerHtml = `
      <button type="button" class="btn" id="smodal-close-btn" style="font-size:13px">Tutup</button>
    `;

    const overlay = showModal(title, bodyHtml, showDelete ? '' : footerHtml);
    if (!showDelete) {
      document.getElementById('smodal-close-btn')?.addEventListener('click', () => overlay.remove());
    } else {
      // For manage mode, use the close button in header
    }

    // Click on row to load filter
    overlay.querySelectorAll('tr[data-idx]').forEach(row => {
      row.addEventListener('click', async (e) => {
        // Don't load if clicking delete button
        if (e.target.closest('[data-del-idx]')) return;
        const idx = parseInt(row.dataset.idx);
        const filter = filters[idx];
        if (!filter) return;
        overlay.remove();
        await applyFilter(filter);
      });
    });

    // Delete buttons
    overlay.querySelectorAll('[data-del-idx]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.delIdx);
        const filter = filters[idx];
        if (!filter) return;
        if (!confirm(`Hapus scan "${filter.name}"?`)) return;
        filters.splice(idx, 1);
        await saveFilters(filters);
        overlay.remove();
        showToast(`Scan "${filter.name}" dihapus`, 'success');
        // Re-open manage if still relevant
        if (filters.length) manageScansDialog();
      });
    });
}

// ─── Apply a saved filter ────────────────────────
async function applyFilter(filter) {
    const sortEl = document.getElementById('screener-sort');
    if (sortEl && filter.sort) sortEl.value = filter.sort;
    const searchEl = document.getElementById('screener-search');
    if (searchEl && filter.search) {
        searchEl.value = filter.search;
        filterResults();
    } else {
        sortResults();
    }
    showToast(`Scan "${filter.name}" diterapkan`, 'success');
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
    golden_cross: { label: 'Golden Cross', description: 'SMA20 > SMA50 (golden cross) dengan multiple sinyal beli' },
    oversold_rsi: { label: 'Oversold RSI', description: 'RSI oversold dengan sinyal reversal' },
    volume_spike: { label: 'Volume Spike', description: 'Volume > 1.5x rata-rata (peningkatan aktivitas)' },
  };

  const p = presets[preset];
  if (!p) return;

  const contentArea = document.getElementById('screener-content');
  const countBadge = document.getElementById('screener-count');
  const toolbar = document.getElementById('screener-toolbar');
  const progBox = document.getElementById('screener-progress');

  if (contentArea) contentArea.innerHTML = renderSkeleton();
  if (countBadge) countBadge.textContent = `MEMUAT ${p.label.toUpperCase()}...`;
  if (toolbar) toolbar.style.display = 'none';
  if (progBox) { progBox.style.display = 'block';
    document.getElementById('sp-text').textContent = `Menjalankan preset ${p.label}...`;
    document.getElementById('sp-percent').textContent = '50%';
    document.getElementById('sp-fill').style.width = '50%';
  }

  currentResults = [];
  isPatternMode = false;

  fetch(`/api/scan/preset/${preset}?limit=30`)
    .then(r => r.json())
    .then(data => {
      const items = Array.isArray(data?.data) ? data.data : [];
      currentResults = items.map(item => ({
        ticker: item.ticker,
        name: item.name || item.ticker,
        close: item.close || 0,
        cci: item.cci,
        magic_line: item.magic_line,
        signal: item.signal || preset,
        volume_spike: item.volume_spike,
      }));
      totalScanned = items.length;
      if (progBox) progBox.style.display = 'none';
      if (countBadge) countBadge.textContent = items.length > 0 ? `${items.length} ${p.label}` : 'TIDAK ADA';
      if (toolbar && items.length) toolbar.style.display = 'flex';
      renderList(currentResults);
      showToast(`Preset ${p.label}: ${items.length} saham ditemukan`, items.length ? 'success' : 'info');
    })
    .catch(e => {
      if (progBox) progBox.style.display = 'none';
      if (contentArea) contentArea.innerHTML = renderEmptyState({ title: `Gagal: ${p.label}`, body: 'Terjadi kesalahan saat memuat preset.', action: 'Coba lagi nanti.' });
      if (countBadge) countBadge.textContent = 'GAGAL';
      showToast('Gagal memuat preset', 'error');
    });
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

// ══════════════════════════════════════════════════
// 11.5.1 — Column Toggle
// ══════════════════════════════════════════════════

function getVisibleColumns() {
  if (visibleColumns) return visibleColumns;
  try {
    const stored = localStorage.getItem(STORAGE_KEY_COLS);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length) {
        visibleColumns = new Set(parsed);
        return visibleColumns;
      }
    }
  } catch (e) { /* ignore */ }
  // Default: all ON except perf_3m, perf_6m
  const defaults = new Set(SCREENER_COLUMNS.filter(c => c.default !== false).map(c => c.key));
  visibleColumns = defaults;
  return defaults;
}

function saveVisibleColumns() {
  try {
    localStorage.setItem(STORAGE_KEY_COLS, JSON.stringify([...visibleColumns]));
  } catch (e) { /* ignore */ }
}

function toggleColumnDropdown() {
  // Remove existing dropdown if open
  const existing = document.getElementById('col-toggle-dropdown');
  if (existing) { existing.remove(); return; }
  const toolbar = document.getElementById('screener-toolbar');
  if (!toolbar) return;
  const vis = getVisibleColumns();
  const groups = [...new Set(SCREENER_COLUMNS.map(c => c.group))];
  let html = '<div class="col-toggle-dropdown" id="col-toggle-dropdown"><div class="col-toggle-header">Pilih Kolom</div>';
  groups.forEach(group => {
    const cols = SCREENER_COLUMNS.filter(c => c.group === group);
    if (!cols.length) return;
    html += `<div class="col-toggle-group-label">${group}</div>`;
    cols.forEach(c => {
      const checked = vis.has(c.key) ? 'checked' : '';
      html += `<label class="col-toggle-item"><input type="checkbox" data-col="${c.key}" ${checked}><span>${c.label || c.key}</span></label>`;
    });
  });
  html += '</div>';
  // Append to toolbar as last child
  toolbar.insertAdjacentHTML('beforeend', html);
  // Wire toggles
  document.querySelectorAll('.col-toggle-item input').forEach(cb => {
    cb.addEventListener('change', () => {
      toggleColumn(cb.dataset.col);
    });
  });
}

function toggleColumn(colKey) {
  const vis = getVisibleColumns();
  if (vis.has(colKey)) vis.delete(colKey);
  else vis.add(colKey);
  visibleColumns = vis;
  saveVisibleColumns();
  // Re-render
  const results = document.getElementById('screener-content');
  if (results) renderList(currentResults);
}

// ══════════════════════════════════════════════════
// 11.5.2 — Multi-Sort
// ══════════════════════════════════════════════════

function handleSortClick(colKey) {
  const idx = sortChain.findIndex(s => s.column === colKey);
  if (idx >= 0) {
    const entry = sortChain[idx];
    if (entry.dir === 'asc') {
      // asc → desc
      entry.dir = 'desc';
    } else {
      // desc → remove
      sortChain.splice(idx, 1);
    }
  } else {
    // Add new with asc
    sortChain.push({ column: colKey, dir: 'asc' });
  }
  renderList(currentResults);
}

function applySorting(arr) {
  if (!arr || !arr.length || !sortChain.length) return arr || [];
  const result = [...arr];
  // Apply sorts in reverse order (stable sort)
  for (let i = sortChain.length - 1; i >= 0; i--) {
    const { column, dir } = sortChain[i];
    const multiplier = dir === 'asc' ? 1 : -1;
    result.sort((a, b) => {
      let va, vb;
      switch (column) {
        case 'ticker': va = a.ticker || ''; vb = b.ticker || ''; return va.localeCompare(vb) * multiplier;
        case 'name': va = a.name || ''; vb = b.name || ''; return va.localeCompare(vb) * multiplier;
        case 'close': va = a.close || 0; vb = b.close || 0; return (va - vb) * multiplier;
        case 'cci': va = a.cci || 0; vb = b.cci || 0; return (va - vb) * multiplier;
        case 'ma': va = a.magic_line || 0; vb = b.magic_line || 0; return (va - vb) * multiplier;
        case 'volume': va = a.volume_spike || 0; vb = b.volume_spike || 0; return (va - vb) * multiplier;
        case 'perf_1w': va = a.perf_1w || 0; vb = b.perf_1w || 0; return (va - vb) * multiplier;
        case 'perf_1m': va = a.perf_1m || 0; vb = b.perf_1m || 0; return (va - vb) * multiplier;
        case 'perf_3m': va = a.perf_3m || 0; vb = b.perf_3m || 0; return (va - vb) * multiplier;
        case 'perf_6m': va = a.perf_6m || 0; vb = b.perf_6m || 0; return (va - vb) * multiplier;
        default: return 0;
      }
    });
  }
  return result;
}

function renderSortBar() {
  const bar = document.getElementById('screener-sort-bar');
  if (!bar) return;
  if (!sortChain.length) {
    bar.classList.add('hidden');
    bar.innerHTML = '';
    return;
  }
  bar.classList.remove('hidden');
  const chips = sortChain.map((s, i) => {
    const arrow = s.dir === 'asc' ? '↑' : '↓';
    const label = (SCREENER_COLUMNS.find(c => c.key === s.column) || {}).label || s.column;
    return `<span class="sort-chip">${i + 1}. ${label} ${arrow}</span>`;
  }).join('');
  bar.innerHTML = `<div class="sort-bar-inner"><span class="sort-bar-label">Urut:</span> ${chips} <button type="button" class="btn btn-sm sort-clear-btn" id="btn-clear-sort">✕ Hapus</button></div>`;
}

// ══════════════════════════════════════════════════
// 11.5.3 — Quick Filter Chips
// ══════════════════════════════════════════════════

function toggleFilterChip(chipId) {
  if (activeFilterChips.has(chipId)) {
    activeFilterChips.delete(chipId);
  } else {
    activeFilterChips.add(chipId);
  }
  renderList(currentResults);
}

function applyQuickFilters(results) {
  if (!results || !results.length || !activeFilterChips.size) return results;
  return results.filter(r => {
    for (const chipId of activeFilterChips) {
      const def = FILTER_CHIP_DEFS.find(d => d.id === chipId);
      if (def && !def.check(r)) return false;
    }
    return true;
  });
}

function renderFilterBar() {
  const bar = document.getElementById('screener-filter-bar');
  if (!bar) return;
  const hasResults = currentResults.length > 0;
  if (!hasResults) {
    bar.classList.add('hidden');
    bar.innerHTML = '';
    return;
  }
  bar.classList.remove('hidden');
  const chips = FILTER_CHIP_DEFS.map(c => {
    const active = activeFilterChips.has(c.id) ? ' active' : '';
    return `<span class="screener-chip${active}" data-chip="${c.id}">${c.label}</span>`;
  }).join('');
  bar.innerHTML = `<div class="screener-filter-bar-inner">${chips}</div>`;
}

// ─── Re-render helper ───────────────────────────
function renderAll() {
  renderList(currentResults);
}
