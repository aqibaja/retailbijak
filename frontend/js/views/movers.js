// ─── Market Movers Page — Gainers / Losers / Most Active ────
// 31.3.2 Enhanced: sector filter, timeframe toggle, volume filter, sort toggle
// API: GET /api/top-movers?limit=&sort=gainers|losers

import { apiFetch, showToast } from '../api.js';
import { nf, pf } from '../utils/format.js';
import { t as _t } from '../i18n.js?v=20260518H';
const t = (key, params) => (window.t ? window.t(key, params) : _t(key, params));

// ─── IDX Sector List ──────────────────────────────────────────
const IDX_SECTORS = [
  { value: '', label: 'Semua Sektor' },
  { value: 'ENERGY', label: 'Energi' },
  { value: 'BASICMAT', label: 'Bahan Baku' },
  { value: 'INDUST', label: 'Industri' },
  { value: 'NONCYC', label: 'Konsumer Non-Siklikal' },
  { value: 'CYCLIC', label: 'Konsumer Siklikal' },
  { value: 'HEALTH', label: 'Kesehatan' },
  { value: 'FINANCE', label: 'Keuangan' },
  { value: 'PROPERTY', label: 'Properti & Real Estat' },
  { value: 'TECH', label: 'Teknologi' },
  { value: 'INFRA', label: 'Infrastruktur' },
  { value: 'TRANSPORT', label: 'Transportasi & Logistik' },
];

// ─── Module State ─────────────────────────────────────────────────
let cache = {};        // { gainers: [], losers: [] }
let activeTab = 'gainers';
let sortKey = null;
let sortDir = 'asc';
let activeSector = '';       // '' = all
let activeTimeframe = '1D';  // '1D' | '1W' | '1M'
let volumeFilterOn = false;  // checkbox: volume > avg
let activeSortMode = 'change'; // 'change' | 'volume'

// ─── Tiny Helpers ─────────────────────────────────────────────
const safeRows = (payload) => (Array.isArray(payload?.data) ? payload.data : []);

// ─── Dummy fallback data (31.1.3) ────────────────────────────
const DUMMY_GAINERS = [
  { ticker: 'BBCA', name: 'Bank Central Asia Tbk',    sector: 'FINANCE',  price: 9500, change_pct: 4.40, volume: 12500000, avg_volume: 9000000,  perf_1w: 5.20, perf_1m: 8.10, perf_3m: 12.30, perf_6m: 18.50 },
  { ticker: 'TLKM', name: 'Telkom Indonesia Tbk',     sector: 'INFRA',    price: 3890, change_pct: 3.72, volume: 9800000,  avg_volume: 8000000,  perf_1w: 4.10, perf_1m: 6.50, perf_3m: 9.80,  perf_6m: 14.20 },
  { ticker: 'BMRI', name: 'Bank Mandiri Tbk',         sector: 'FINANCE',  price: 6250, change_pct: 3.15, volume: 8200000,  avg_volume: 7500000,  perf_1w: 3.80, perf_1m: 5.90, perf_3m: 8.40,  perf_6m: 11.70 },
  { ticker: 'ASII', name: 'Astra International Tbk',  sector: 'INDUST',   price: 5100, change_pct: 2.88, volume: 7600000,  avg_volume: 6000000,  perf_1w: 3.20, perf_1m: 4.70, perf_3m: 7.10,  perf_6m: 10.30 },
  { ticker: 'UNVR', name: 'Unilever Indonesia Tbk',   sector: 'NONCYC',   price: 2450, change_pct: 2.51, volume: 6100000,  avg_volume: 5500000,  perf_1w: 2.90, perf_1m: 4.10, perf_3m: 6.20,  perf_6m: 9.80  },
];
const DUMMY_LOSERS = [
  { ticker: 'GOTO', name: 'GoTo Gojek Tokopedia Tbk', sector: 'TECH',     price: 54,  change_pct: -4.42, volume: 18000000, avg_volume: 12000000, perf_1w: -5.10, perf_1m: -8.30, perf_3m: -12.10, perf_6m: -18.40 },
  { ticker: 'BUKA', name: 'Bukalapak.com Tbk',         sector: 'TECH',     price: 112, change_pct: -3.78, volume: 14200000, avg_volume: 10000000, perf_1w: -4.20, perf_1m: -7.10, perf_3m: -10.50, perf_6m: -15.60 },
  { ticker: 'EMTK', name: 'Elang Mahkota Teknologi',   sector: 'CYCLIC',   price: 680, change_pct: -3.12, volume: 5400000,  avg_volume: 6000000,  perf_1w: -3.50, perf_1m: -5.80, perf_3m: -8.90,  perf_6m: -13.20 },
  { ticker: 'MNCN', name: 'Media Nusantara Citra Tbk', sector: 'CYCLIC',   price: 890, change_pct: -2.74, volume: 4800000,  avg_volume: 5500000,  perf_1w: -3.10, perf_1m: -5.20, perf_3m: -7.80,  perf_6m: -11.90 },
  { ticker: 'SCMA', name: 'Surya Citra Media Tbk',     sector: 'CYCLIC',   price: 124, change_pct: -2.36, volume: 3900000,  avg_volume: 4500000,  perf_1w: -2.80, perf_1m: -4.60, perf_3m: -6.90,  perf_6m: -10.40 },
];

// ─── Data helpers ─────────────────────────────────────────────
function getVisibleData() {
  let data;
  if (activeTab === 'gainers') {
    data = cache.gainers || [];
  } else if (activeTab === 'losers') {
    data = cache.losers || [];
  } else {
    // Most Active: merge gainers + losers, dedup by ticker, sort by volume desc
    const merged = new Map();
    for (const r of [...(cache.gainers || []), ...(cache.losers || [])]) {
      if (!merged.has(r.ticker)) merged.set(r.ticker, r);
    }
    data = Array.from(merged.values());
    data.sort((a, b) => (Number(b.volume) || 0) - (Number(a.volume) || 0));
  }

  // ── Sector filter ──
  if (activeSector) {
    data = data.filter(r => (r.sector || '').toUpperCase() === activeSector);
  }

  // ── Volume > avg filter ──
  if (volumeFilterOn) {
    data = data.filter(r => {
      const vol = Number(r.volume) || 0;
      const avg = Number(r.avg_volume) || 0;
      return avg > 0 ? vol > avg : true; // if no avg_volume, keep row
    });
  }

  // ── Sort mode override (% Change | Volume) ──
  if (activeSortMode === 'volume') {
    data = [...data].sort((a, b) => (Number(b.volume) || 0) - (Number(a.volume) || 0));
  } else if (activeSortMode === 'change') {
    data = [...data].sort((a, b) => {
      const va = Math.abs(Number(a.change_pct) || 0);
      const vb = Math.abs(Number(b.change_pct) || 0);
      return vb - va;
    });
  }

  return data;
}

// ─── Timeframe-aware change_pct ──────────────────────────────
function getChangePct(item) {
  if (activeTimeframe === '1W') return item.perf_1w ?? item.change_pct;
  if (activeTimeframe === '1M') return item.perf_1m ?? item.change_pct;
  return item.change_pct;
}

function applySort(data) {
  if (!sortKey || sortKey === 'rank') return data;
  const arr = [...data];
  arr.sort((a, b) => {
    const va = a[sortKey];
    const vb = b[sortKey];
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    const cmp = typeof va === 'string'
      ? va.localeCompare(vb)
      : Number(va) - Number(vb);
    return sortDir === 'asc' ? cmp : -cmp;
  });
  return arr;
}

// ─── Template Builders ────────────────────────────────────────

function skeletonRows(n = 10) {
  return `<div class="flex-col gap-2 p-4">${Array(n).fill('<div class="skeleton skeleton-card" style="height:44px;border-radius:8px"></div>').join('')}</div>`;
}

function emptyBlock(msg) {
  return `<div class="empty-state-card">
    <div class="empty-state-icon">📊</div>
    <strong class="empty-state-title">Belum Ada Data</strong>
    <span class="empty-state-desc">${msg || 'Data market movers belum tersedia untuk sesi ini.'}</span>
  </div>`;
}

function errorBlock(msg) {
  return `<div class="empty-state-card">
    <div class="empty-state-icon">⚠️</div>
    <strong class="empty-state-title" style="color:var(--down-color)">Gagal Memuat Data</strong>
    <span class="empty-state-desc">${msg || 'Terjadi kesalahan saat mengambil data. Silakan coba lagi.'}</span>
  </div>`;
}

function fmtPct(val) {
  if (val == null) return '<span class="text-dim">—</span>';
  const n = Number(val);
  const cls = n >= 0 ? 'text-up' : 'text-down';
  return `<span class="${cls}">${pf(val)}</span>`;
}

function fmtPrice(val) {
  return val != null ? `<span class="tabular-nums">${nf(val)}</span>` : '<span class="text-dim">—</span>';
}

function fmtVol(val) {
  return val != null ? `<span class="tabular-nums text-dim">${nf(val, 0)}</span>` : '<span class="text-dim">—</span>';
}

// ─── Get columns based on screen width ────────────────────────
function getColumns() {
  const mobile = window.innerWidth < 768;
  const chgLabel = activeTimeframe === '1W' ? '1W%' : activeTimeframe === '1M' ? '1M%' : 'Chg%';
  const all = [
    { key: 'rank',       label: '#',       mobile: true },
    { key: 'ticker',     label: 'Ticker',  mobile: true },
    { key: 'name',       label: 'Name',    mobile: false },
    { key: 'sector',     label: 'Sektor',  mobile: false },
    { key: 'price',      label: 'Price',   mobile: true },
    { key: 'change_pct', label: chgLabel,  mobile: true },
    { key: 'volume',     label: 'Volume',  mobile: false },
    { key: 'perf_1w',    label: '1W%',     mobile: false },
    { key: 'perf_1m',    label: '1M%',     mobile: false },
    { key: 'perf_3m',    label: '3M%',     mobile: false },
    { key: 'perf_6m',    label: '6M%',     mobile: false },
  ];
  return mobile ? all.filter(c => c.mobile) : all;
}

function renderThead() {
  const cols = getColumns();
  return `<thead><tr>${cols.map(col => {
    const isSorted = sortKey === col.key;
    const arrow = isSorted ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';
    const sortable = col.key !== 'rank';
    return `<th${sortable ? ` data-sort="${col.key}" class="sortable-th"` : ''}>${col.label}${arrow}</th>`;
  }).join('')}</tr></thead>`;
}

function renderTbody(data) {
  if (!data || !data.length) {
    return `<tbody><tr><td colspan="${getColumns().length}" style="text-align:center;padding:40px 16px;color:var(--text-dim)">Tidak ada data untuk ditampilkan.</td></tr></tbody>`;
  }
  const cols = getColumns();
  return `<tbody>${data.map((item, idx) => {
    const rank = idx + 1;
    const ticker = item.ticker || '—';
    const name = item.name || '';
    const chgVal = getChangePct(item);
    return `<tr class="movers-row" data-ticker="${ticker}" onclick="window.location.hash='#stock/${ticker}'">
      ${cols.map(col => {
        switch (col.key) {
          case 'rank':       return `<td class="text-dim tabular-nums" style="font-size:11px;font-weight:700">${rank}</td>`;
          case 'ticker':     return `<td><a href="#stock/${ticker}" class="mono strong" onclick="event.stopPropagation()">${ticker}</a></td>`;
          case 'name':       return `<td class="text-dim text-truncate" style="max-width:160px">${name || '—'}</td>`;
          case 'sector':     return `<td><span class="movers-sector-chip">${item.sector || '—'}</span></td>`;
          case 'price':      return `<td class="tabular-nums">${fmtPrice(item.price)}</td>`;
          case 'change_pct': return `<td>${fmtPct(chgVal)}</td>`;
          case 'volume':     return `<td>${fmtVol(item.volume)}</td>`;
          case 'perf_1w':    return `<td>${fmtPct(item.perf_1w)}</td>`;
          case 'perf_1m':    return `<td>${fmtPct(item.perf_1m)}</td>`;
          case 'perf_3m':    return `<td>${fmtPct(item.perf_3m)}</td>`;
          case 'perf_6m':    return `<td>${fmtPct(item.perf_6m)}</td>`;
          default:           return '<td>—</td>';
        }
      }).join('')}
    </tr>`;
  }).join('')}</tbody>`;
}

function renderTable(data) {
  const sorted = applySort(data);
  return `<div class="table-wrapper" style="overflow-x:auto;border-radius:12px;border:1px solid var(--border-subtle)">
    <table class="table movers-table">${renderThead()}${renderTbody(sorted)}</table>
  </div>`;
}

// ─── Tab bar ─────────────────────────────────────────────────
function renderTabs(active) {
  const tabs = [
    { key: 'gainers', label: 'Gainers',     icon: '📈' },
    { key: 'losers',  label: 'Losers',      icon: '📉' },
    { key: 'volume',  label: 'Most Active', icon: '🔊' },
  ];
  return `<div class="flex gap-2" style="margin-bottom:16px;flex-wrap:wrap" role="tablist">
    ${tabs.map(t => `<button class="btn ${active === t.key ? 'btn-primary' : ''}" data-tab="${t.key}" role="tab" aria-selected="${active === t.key}" style="font-size:12px;padding:6px 14px">${t.icon} ${t.label}</button>`).join('')}
  </div>`;
}

// ─── Filter toolbar ───────────────────────────────────────────
function renderFilterBar() {
  const sectorOptions = IDX_SECTORS.map(s =>
    `<option value="${s.value}"${activeSector === s.value ? ' selected' : ''}>${s.label}</option>`
  ).join('');

  const tfChips = ['1D', '1W', '1M'].map(tf =>
    `<button class="movers-tf-chip${activeTimeframe === tf ? ' active' : ''}" data-tf="${tf}">${tf}</button>`
  ).join('');

  const sortChips = [
    { key: 'change', label: '% Change' },
    { key: 'volume', label: 'Volume' },
  ].map(s =>
    `<button class="movers-sort-chip${activeSortMode === s.key ? ' active' : ''}" data-sortmode="${s.key}">${s.label}</button>`
  ).join('');

  return `<div class="movers-filter-bar" id="movers-filter-bar">
    <div class="movers-filter-group">
      <label class="movers-filter-label">Sektor</label>
      <select class="movers-sector-select" id="movers-sector-select" aria-label="Filter sektor">
        ${sectorOptions}
      </select>
    </div>
    <div class="movers-filter-group">
      <label class="movers-filter-label">Timeframe</label>
      <div class="movers-chip-group">${tfChips}</div>
    </div>
    <div class="movers-filter-group">
      <label class="movers-filter-label">Urutkan</label>
      <div class="movers-chip-group">${sortChips}</div>
    </div>
    <div class="movers-filter-group movers-filter-group-vol">
      <label class="movers-vol-label" for="movers-vol-filter">
        <input type="checkbox" id="movers-vol-filter" ${volumeFilterOn ? 'checked' : ''}>
        Volume &gt; rata-rata
      </label>
    </div>
  </div>`;
}

// ─── Load data ────────────────────────────────────────────────
async function loadData() {
  try {
    const [gainersRes, losersRes] = await Promise.all([
      apiFetch('/top-movers?limit=50&sort=gainers'),
      apiFetch('/top-movers?limit=50&sort=losers'),
    ]);
    cache.gainers = safeRows(gainersRes);
    cache.losers = safeRows(losersRes);
    cache.total = gainersRes.total || 0; // Store total count from API

    // Dummy fallback if API returned nothing (31.1.3)
    if (!cache.gainers.length) cache.gainers = DUMMY_GAINERS;
    if (!cache.losers.length)  cache.losers  = DUMMY_LOSERS;

    updateTotalBadge();
    return true;
  } catch (e) {
    console.error('Movers load error:', e);
    cache.gainers = DUMMY_GAINERS;
    cache.losers  = DUMMY_LOSERS;
    cache.total = 0;
    updateTotalBadge();
    return true;
  }
}

function updateTotalBadge() {
  const badge = document.getElementById('movers-total-badge');
  if (!badge) return;
  const total = cache.total || 0;
  badge.textContent = total > 0 ? `Total: ${total} saham` : '';
}

// ─── Render the table body into the container ─────────────────
function renderContent(container) {
  const data = getVisibleData();
  if (data.length === 0) {
    container.innerHTML = emptyBlock('Tidak ada data yang cocok dengan filter saat ini.');
    return;
  }
  container.innerHTML = renderTable(data);
  wireSortHeaders(container);
}

function wireSortHeaders(container) {
  container.querySelectorAll('th.sortable-th').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (!key) return;
      if (sortKey === key) {
        sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        sortKey = key;
        sortDir = 'asc';
      }
      renderContent(container);
    });
  });
}

// ─── Wire filter bar controls ─────────────────────────────────
function wireFilterBar(root, contentContainer) {
  // Sector dropdown
  const sectorSel = root.querySelector('#movers-sector-select');
  if (sectorSel) {
    sectorSel.addEventListener('change', () => {
      activeSector = sectorSel.value;
      renderContent(contentContainer);
    });
  }

  // Timeframe chips
  root.querySelectorAll('[data-tf]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTimeframe = btn.dataset.tf;
      root.querySelectorAll('[data-tf]').forEach(b => b.classList.toggle('active', b.dataset.tf === activeTimeframe));
      renderContent(contentContainer);
    });
  });

  // Sort mode chips
  root.querySelectorAll('[data-sortmode]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeSortMode = btn.dataset.sortmode;
      root.querySelectorAll('[data-sortmode]').forEach(b => b.classList.toggle('active', b.dataset.sortmode === activeSortMode));
      renderContent(contentContainer);
    });
  });

  // Volume checkbox
  const volCb = root.querySelector('#movers-vol-filter');
  if (volCb) {
    volCb.addEventListener('change', () => {
      volumeFilterOn = volCb.checked;
      renderContent(contentContainer);
    });
  }
}

// ─── Wire tab clicks ──────────────────────────────────────────
function wireTabs(root, contentContainer) {
  root.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      if (tab === activeTab) return;
      activeTab = tab;
      sortKey = null;
      sortDir = 'asc';

      root.querySelectorAll('[data-tab]').forEach(b => {
        b.classList.toggle('btn-primary', b.dataset.tab === tab);
        b.setAttribute('aria-selected', b.dataset.tab === tab);
      });

      contentContainer.innerHTML = skeletonRows(8);
      requestAnimationFrame(() => renderContent(contentContainer));
    });
  });
}

// ─── Main export ──────────────────────────────────────────────
export async function renderMovers(root) {
  document.title = 'RetailBijak — Market Movers';

  // Reset state
  cache = {};
  activeTab = 'gainers';
  sortKey = null;
  sortDir = 'asc';
  activeSector = '';
  activeTimeframe = '1D';
  volumeFilterOn = false;
  activeSortMode = 'change';

  root.innerHTML = `
    <div class="movers-page">
      <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:20px">
        <div>
          <h1 style="font-size:22px;font-weight:700;color:var(--text-main);margin:0">Market Movers</h1>
          <p class="page-subtitle" style="font-size:13px;color:var(--text-muted);margin-top:4px">Saham IDX dengan pergerakan terbesar — gainers, losers, dan most active dengan multi-timeframe performance.</p>
          <span id="movers-total-badge" class="badge badge-mini" style="font-size:11px;margin-top:4px;display:inline-block"></span>
        </div>
        <div class="flex gap-2" style="align-items:center">
          <button class="btn" id="movers-export-csv" type="button" style="font-size:12px;padding:8px 16px">📥 CSV</button>
          <button class="btn btn-primary" id="movers-refresh" type="button" style="font-size:12px;padding:8px 16px">⟳ Refresh</button>
        </div>
      </div>

      <div id="movers-tabs">${renderTabs('gainers')}</div>
      ${renderFilterBar()}
      <div id="movers-content">${skeletonRows(10)}</div>
    </div>
  `;

  const contentEl = document.getElementById('movers-content');
  const refreshBtn = document.getElementById('movers-refresh');
  const exportBtn  = document.getElementById('movers-export-csv');

  // Export CSV handler
  exportBtn.addEventListener('click', () => {
    const data = getVisibleData();
    if (!data.length) {
      showToast('Tidak ada data untuk diexport', 'warning');
      return;
    }
    const cols = getColumns();
    const headers = cols.map(c => c.label);
    const csvRows = data.map((item, idx) => {
      const chgVal = getChangePct(item);
      return cols.map(col => {
        let val;
        switch (col.key) {
          case 'rank':       val = idx + 1; break;
          case 'ticker':     val = item.ticker || ''; break;
          case 'name':       val = item.name || ''; break;
          case 'sector':     val = item.sector || ''; break;
          case 'price':      val = item.price ?? ''; break;
          case 'change_pct': val = chgVal != null ? chgVal + '%' : ''; break;
          case 'volume':     val = item.volume ?? ''; break;
          case 'perf_1w':    val = item.perf_1w != null ? item.perf_1w + '%' : ''; break;
          case 'perf_1m':    val = item.perf_1m != null ? item.perf_1m + '%' : ''; break;
          case 'perf_3m':    val = item.perf_3m != null ? item.perf_3m + '%' : ''; break;
          case 'perf_6m':    val = item.perf_6m != null ? item.perf_6m + '%' : ''; break;
          default:           val = '';
        }
        return '"' + String(val).replace(/"/g, '""') + '"';
      }).join(',');
    });
    const csv = '\uFEFF' + headers.join(',') + '\n' + csvRows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const tabLabel = activeTab === 'gainers' ? 'gainers' : activeTab === 'losers' ? 'losers' : 'most-active';
    a.download = `retailbijak-movers-${tabLabel}-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`CSV diunduh (${data.length} saham)`, 'success');
  });

  // Refresh handler
  const doRefresh = async () => {
    contentEl.innerHTML = skeletonRows(10);
    refreshBtn.disabled = true;
    refreshBtn.textContent = '⟳ Memuat...';
    const ok = await loadData();
    refreshBtn.disabled = false;
    refreshBtn.textContent = '⟳ Refresh';
    if (!ok) {
      contentEl.innerHTML = errorBlock('Gagal mengambil data market movers. Periksa koneksi dan coba lagi.');
      return;
    }
    renderContent(contentEl);
  };

  refreshBtn.addEventListener('click', doRefresh);

  // Wire tabs + filter bar
  wireTabs(root, contentEl);
  wireFilterBar(root, contentEl);

  // Initial load
  const ok = await loadData();
  if (!ok) {
    contentEl.innerHTML = errorBlock('Gagal mengambil data market movers. Periksa koneksi dan coba lagi.');
    return;
  }
  renderContent(contentEl);

  // Expose refresh for potential external use
  root._moversRefresh = doRefresh;
}
