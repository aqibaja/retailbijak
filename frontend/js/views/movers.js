// ─── Market Movers Page — Gainers / Losers / Most Active ────
// Dedicated page with multi-timeframe performance columns (1W, 1M, 3M, 6M)

import { apiFetch, showToast } from '../api.js?v=20260510';
import { nf, pf } from '../utils/format.js?v=20260510';

// ─── Module State ─────────────────────────────────────────────
let cache = {};        // { gainers: [], losers: [] }
let activeTab = 'gainers';
let sortKey = null;
let sortDir = 'asc';

// ─── Tiny Helpers ─────────────────────────────────────────────
const safeRows = (payload) => (Array.isArray(payload?.data) ? payload.data : []);

function getVisibleData() {
  if (activeTab === 'gainers') return cache.gainers || [];
  if (activeTab === 'losers') return cache.losers || [];
  // Most Active: merge gainers + losers, dedup by ticker, sort by volume desc
  const merged = new Map();
  for (const r of [...(cache.gainers || []), ...(cache.losers || [])]) {
    if (!merged.has(r.ticker)) merged.set(r.ticker, r);
  }
  const arr = Array.from(merged.values());
  arr.sort((a, b) => (Number(b.volume) || 0) - (Number(a.volume) || 0));
  return arr;
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
  const all = [
    { key: 'rank',     label: '#',     mobile: true },
    { key: 'ticker',   label: 'Ticker', mobile: true },
    { key: 'name',     label: 'Name',   mobile: false },
    { key: 'price',    label: 'Price',  mobile: true },
    { key: 'change_pct', label: 'Chg%', mobile: true },
    { key: 'volume',   label: 'Volume', mobile: false },
    { key: 'perf_1w',  label: '1W%',    mobile: true },
    { key: 'perf_1m',  label: '1M%',    mobile: false },
    { key: 'perf_3m',  label: '3M%',    mobile: false },
    { key: 'perf_6m',  label: '6M%',    mobile: false },
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
    return `<tr class="movers-row" data-ticker="${ticker}" onclick="window.location.hash='#stock/${ticker}'">
      ${cols.map(col => {
        switch (col.key) {
          case 'rank': return `<td class="text-dim tabular-nums" style="font-size:11px;font-weight:700">${rank}</td>`;
          case 'ticker': return `<td><a href="#stock/${ticker}" class="mono strong" onclick="event.stopPropagation()">${ticker}</a></td>`;
          case 'name': return `<td class="text-dim text-truncate" style="max-width:160px">${name || '—'}</td>`;
          case 'price': return `<td class="tabular-nums">${fmtPrice(item.price)}</td>`;
          case 'change_pct': return `<td>${fmtPct(item.change_pct)}</td>`;
          case 'volume': return `<td>${fmtVol(item.volume)}</td>`;
          case 'perf_1w': return `<td>${fmtPct(item.perf_1w)}</td>`;
          case 'perf_1m': return `<td>${fmtPct(item.perf_1m)}</td>`;
          case 'perf_3m': return `<td>${fmtPct(item.perf_3m)}</td>`;
          case 'perf_6m': return `<td>${fmtPct(item.perf_6m)}</td>`;
          default: return '<td>—</td>';
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
    { key: 'gainers', label: 'Gainers', icon: '📈' },
    { key: 'losers', label: 'Losers', icon: '📉' },
    { key: 'volume', label: 'Most Active', icon: '🔊' },
  ];
  return `<div class="flex gap-2" style="margin-bottom:16px;flex-wrap:wrap" role="tablist">
    ${tabs.map(t => `<button class="btn ${active === t.key ? 'btn-primary' : ''}" data-tab="${t.key}" role="tab" aria-selected="${active === t.key}" style="font-size:12px;padding:6px 14px">${t.icon} ${t.label}</button>`).join('')}
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
    return true;
  } catch (e) {
    console.error('Movers load error:', e);
    return false;
  }
}

// ─── Render the table body into the container ─────────────────
function renderContent(container) {
  const data = getVisibleData();
  if (data.length === 0) {
    container.innerHTML = emptyBlock('Belum ada data market movers untuk sesi ini. Coba refresh beberapa saat lagi.');
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

// ─── Wire tab clicks ──────────────────────────────────────────
function wireTabs(root, contentContainer) {
  root.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      if (tab === activeTab) return;
      activeTab = tab;
      sortKey = null;
      sortDir = 'asc';

      // Update tab buttons
      root.querySelectorAll('[data-tab]').forEach(b => {
        b.classList.toggle('btn-primary', b.dataset.tab === tab);
        b.setAttribute('aria-selected', b.dataset.tab === tab);
      });

      // If volume tab and we don't have enough data, we can still show what we have
      contentContainer.innerHTML = skeletonRows(8);
      // Small delay for UI feedback
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

  root.innerHTML = `
    <div class="movers-page">
      <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:20px">
        <div>
          <h1 style="font-size:22px;font-weight:700;color:var(--text-main);margin:0">Market Movers</h1>
          <p class="page-subtitle" style="font-size:13px;color:var(--text-muted);margin-top:4px">Saham IDX dengan pergerakan terbesar — gainers, losers, dan most active dengan multi-timeframe performance.</p>
        </div>
        <div class="flex gap-2" style="align-items:center">
          <button class="btn" id="movers-export-csv" type="button" style="font-size:12px;padding:8px 16px">📥 CSV</button>
          <button class="btn btn-primary" id="movers-refresh" type="button" style="font-size:12px;padding:8px 16px">⟳ Refresh</button>
        </div>
      </div>

      <div id="movers-tabs">${renderTabs('gainers')}</div>
      <div id="movers-content">${skeletonRows(10)}</div>
    </div>
  `;

  const contentEl = document.getElementById('movers-content');
  const refreshBtn = document.getElementById('movers-refresh');
  const exportBtn = document.getElementById('movers-export-csv');

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
      return cols.map(col => {
        let val;
        switch (col.key) {
          case 'rank': val = idx + 1; break;
          case 'ticker': val = item.ticker || ''; break;
          case 'name': val = item.name || ''; break;
          case 'price': val = item.price ?? ''; break;
          case 'change_pct': val = item.change_pct != null ? item.change_pct + '%' : ''; break;
          case 'volume': val = item.volume ?? ''; break;
          case 'perf_1w': val = item.perf_1w != null ? item.perf_1w + '%' : ''; break;
          case 'perf_1m': val = item.perf_1m != null ? item.perf_1m + '%' : ''; break;
          case 'perf_3m': val = item.perf_3m != null ? item.perf_3m + '%' : ''; break;
          case 'perf_6m': val = item.perf_6m != null ? item.perf_6m + '%' : ''; break;
          default: val = '';
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

  // Wire tabs
  wireTabs(root, contentEl);

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
