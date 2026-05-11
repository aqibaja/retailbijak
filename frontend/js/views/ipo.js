// ─── IPO Pipeline Tracker ──────────────────────────────────
// 26.4.1 — IPO Pipeline Tracker
// API: GET /api/ipo

import { apiFetch, showToast } from '../api.js?v=202605120200';
import { nf, pf, money, fmt } from '../utils/format.js?v=202605120200';

// ─── Module State ─────────────────────────────────────────────
let ipoData = { upcoming: [], past: [] };
let activeTab = 'upcoming'; // 'upcoming', 'past'

// ─── Helpers ────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
    return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return dateStr; }
}

function fmtPerformance(pct) {
  if (pct == null) return '<span class="text-dim">—</span>';
  const val = Number(pct);
  const cls = val >= 0 ? 'text-up' : 'text-down';
  const sign = val >= 0 ? '+' : '';
  return `<span class="${cls}" style="font-weight:700;font-size:14px">${sign}${val.toLocaleString('id-ID', { maximumFractionDigits: 2 })}%</span>`;
}

function fmtVolume(val) {
  if (val == null || val === 0) return '—';
  if (val >= 1_000_000_000) return (val / 1_000_000_000).toFixed(1) + 'M';
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'Jt';
  if (val >= 1_000) return (val / 1_000).toFixed(1) + 'Rb';
  return String(val);
}

function skeletonRows(n = 4) {
  return `<div class="flex-col gap-2 p-4">${Array(n).fill('<div class="skeleton skeleton-card" style="height:72px;border-radius:8px"></div>').join('')}</div>`;
}

function emptyBlock(msg) {
  return `<div class="empty-state-card">
    <div class="empty-state-icon">🚀</div>
    <strong class="empty-state-title">Belum Ada Data IPO</strong>
    <span class="empty-state-desc">${msg || 'Belum ada data IPO yang tersedia.'}</span>
  </div>`;
}

function errorBlock(msg) {
  return `<div class="empty-state-card">
    <div class="empty-state-icon">⚠️</div>
    <strong class="empty-state-title" style="color:var(--down-color)">Gagal Memuat Data</strong>
    <span class="empty-state-desc">${msg || 'Terjadi kesalahan saat mengambil data IPO.'}</span>
  </div>`;
}

// ─── Tab rendering ───────────────────────────────────────────
function renderTabs(active) {
  const tabs = [
    { key: 'upcoming', label: '📅 Akan Listing', icon: '' },
    { key: 'past', label: '📊 Sudah Listing', icon: '' },
  ];
  return `<div class="flex gap-2" style="margin-bottom:16px;flex-wrap:wrap" role="tablist">
    ${tabs.map(t => `<button class="btn ${active === t.key ? 'btn-primary' : ''}" data-ipo-tab="${t.key}" role="tab" aria-selected="${active === t.key}" style="font-size:12px;padding:6px 14px">${t.label}</button>`).join('')}
  </div>`;
}

// ─── Upcoming IPOs Table ─────────────────────────────────────
function renderUpcomingTable(items) {
  if (!items || !items.length) {
    return emptyBlock('Tidak ada IPO yang akan listing saat ini.');
  }

  const mobile = window.innerWidth < 768;

  return `<div class="table-wrapper" style="overflow-x:auto;border-radius:12px;border:1px solid var(--border-subtle)">
    <table class="table ipo-table">
      <thead><tr>
        <th>Ticker</th>
        <th>Perusahaan</th>
        <th>Sektor</th>
        ${mobile ? '' : '<th>Keterangan</th>'}
        <th>Tanggal Listing</th>
      </tr></thead>
      <tbody>${items.map(item => {
        // Parse offering period / price range from description
        const desc = item.description || item.title || '';
        return `<tr class="ipo-row" data-ticker="${item.ticker}">
          <td><a href="#stock/${item.ticker}" class="mono strong">${item.ticker || '—'}</a></td>
          <td class="text-truncate" style="max-width:180px">${item.company_name || item.title || '—'}</td>
          <td class="text-dim">${item.sector || '—'}</td>
          ${mobile ? '' : `<td class="text-xs text-dim text-truncate" style="max-width:220px">${desc || '—'}</td>`}
          <td class="tabular-nums">${formatDate(item.event_date)}${(() => {
            if (!item.event_date) return '';
            const days = Math.ceil((new Date(item.event_date) - new Date()) / 86400000);
            if (days < 0) return ' <span class="badge" style="font-size:9px;background:var(--text-muted)20;color:var(--text-muted)">Listed</span>';
            if (days === 0) return ' <span class="badge badge-up" style="font-size:9px">Hari Ini!</span>';
            return ` <span class="badge" style="font-size:9px;background:var(--color-up)18;color:var(--color-up)">${days}h lagi</span>`;
          })()}</td>
        </tr>`;
      }).join('')}</tbody>
    </table>
  </div>
  <div class="text-xs text-dim mt-2">Menampilkan ${items.length} IPO akan listing.</div>`;
}

// ─── Past/Recent IPOs Table ──────────────────────────────────
function renderPastTable(items) {
  if (!items || !items.length) {
    return emptyBlock('Tidak ada data IPO yang sudah listing.');
  }

  const mobile = window.innerWidth < 768;

  return `<div class="table-wrapper" style="overflow-x:auto;border-radius:12px;border:1px solid var(--border-subtle)">
    <table class="table ipo-table">
      <thead><tr>
        <th>Ticker</th>
        ${mobile ? '' : '<th>Perusahaan</th>'}
        <th>Sektor</th>
        <th>Listing</th>
        <th>Performa</th>
        ${mobile ? '' : '<th>Volume</th>'}
      </tr></thead>
      <tbody>${items.map(item => {
        const hasPerf = item.performance_pct != null;
        const volTrend = (item.latest_volume && item.listing_volume)
          ? ((item.latest_volume / item.listing_volume) - 1) * 100
          : null;
        return `<tr class="ipo-row" data-ticker="${item.ticker}">
          <td><a href="#stock/${item.ticker}" class="mono strong">${item.ticker || '—'}</a></td>
          ${mobile ? '' : `<td class="text-truncate" style="max-width:150px">${item.company_name || '—'}</td>`}
          <td class="text-dim text-xs">${item.sector || '—'}</td>
          <td class="tabular-nums text-xs text-dim">${formatDate(item.event_date)}</td>
          <td class="tabular-nums">${fmtPerformance(item.performance_pct)}</td>
          ${mobile ? '' : `<td class="text-xs text-dim tabular-nums">
            ${volTrend != null
              ? `<span class="${volTrend >= 0 ? 'text-up' : 'text-down'}">${volTrend >= 0 ? '▲' : '▼'} ${fmtVolume(item.latest_volume)}</span>`
              : '—'}
          </td>`}
        </tr>`;
      }).join('')}</tbody>
    </table>
  </div>
  <div class="text-xs text-dim mt-2">Menampilkan ${items.length} IPO historis.</div>`;
}

// ─── CSV Export ─────────────────────────────────────────────
function wireExportCsv() {
  const btn = document.getElementById('ipo-export-csv');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const data = activeTab === 'upcoming' ? ipoData.upcoming : ipoData.past;
    if (!data || !data.length) {
      showToast('Tidak ada data untuk diexport', 'warning');
      return;
    }

    let headers, rows;
    if (activeTab === 'upcoming') {
      headers = ['Ticker', 'Perusahaan', 'Sektor', 'Tanggal Listing', 'Keterangan'];
      rows = data.map(item => [
        item.ticker || '',
        item.company_name || '',
        item.sector || '',
        item.event_date || '',
        item.description || '',
      ]);
    } else {
      headers = ['Ticker', 'Perusahaan', 'Sektor', 'Tanggal Listing', 'Harga Listing', 'Harga Terkini', 'Performa (%)'];
      rows = data.map(item => [
        item.ticker || '',
        item.company_name || '',
        item.sector || '',
        item.event_date || '',
        item.listing_price != null ? String(item.listing_price) : '',
        item.latest_price != null ? String(item.latest_price) : '',
        item.performance_pct != null ? String(item.performance_pct) : '',
      ]);
    }

    const csv = '\uFEFF' + headers.join(',') + '\n' + rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retailbijak-ipo-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('CSV diunduh', 'success');
  });
}

// ─── Render Content ──────────────────────────────────────────
function renderContent() {
  const contentEl = document.getElementById('ipo-content');
  if (!contentEl) return;

  const items = activeTab === 'upcoming' ? ipoData.upcoming : ipoData.past;

  contentEl.innerHTML = `
    <div class="flex flex-wrap gap-2 justify-between items-center" style="margin-bottom:12px">
      <div class="flex items-center gap-2">
        <span class="text-xs text-dim">
          ${activeTab === 'upcoming'
            ? `${ipoData.upcoming.length} IPO akan datang`
            : `${ipoData.past.length} IPO historis`}
        </span>
      </div>
      <div class="flex gap-2 items-center">
        <button class="btn btn-sm" id="ipo-refresh" type="button">⟳ Refresh</button>
        <button class="btn btn-sm" id="ipo-export-csv">📥 CSV</button>
      </div>
    </div>
    <div id="ipo-table-container">
      ${activeTab === 'upcoming' ? renderUpcomingTable(items) : renderPastTable(items)}
    </div>
  `;

  // Wire refresh
  const refreshBtn = document.getElementById('ipo-refresh');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => loadData(true));
  }

  // Wire CSV export
  wireExportCsv();
}

// ─── Wire Tabs ─────────────────────────────────────────────────
function wireTabs(root) {
  root.querySelectorAll('[data-ipo-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.ipoTab;
      if (tab === activeTab) return;
      activeTab = tab;

      root.querySelectorAll('[data-ipo-tab]').forEach(b => {
        b.classList.toggle('btn-primary', b.dataset.ipoTab === tab);
        b.setAttribute('aria-selected', b.dataset.ipoTab === tab);
      });

      const contentEl = document.getElementById('ipo-content');
      if (contentEl) {
        contentEl.innerHTML = skeletonRows(6);
        requestAnimationFrame(() => renderContent());
      }
    });
  });
}

// ─── Load Data ────────────────────────────────────────────────
async function loadData(forceRefresh = false) {
  const contentEl = document.getElementById('ipo-content');
  const skeletonEl = document.getElementById('ipo-skeleton');

  if (!contentEl) return false;

  try {
    const res = await apiFetch('/ipo');

    ipoData = {
      upcoming: Array.isArray(res?.upcoming) ? res.upcoming : [],
      past: Array.isArray(res?.past) ? res.past : [],
    };

    // Hide skeleton, show content
    if (skeletonEl) skeletonEl.style.display = 'none';
    contentEl.style.display = 'block';
    contentEl.innerHTML = '';

    renderContent();
    return true;
  } catch (e) {
    console.error('IPO load error:', e);
    if (skeletonEl) skeletonEl.style.display = 'none';
    contentEl.style.display = 'block';
    contentEl.innerHTML = errorBlock('Gagal mengambil data IPO. Periksa koneksi dan coba lagi.');
    return false;
  }
}

// ─── Main Export ──────────────────────────────────────────────
export async function renderIpo(root) {
  if (!root) return;
  document.title = 'RetailBijak — IPO Pipeline Tracker';

  // Reset state
  ipoData = { upcoming: [], past: [] };
  activeTab = 'upcoming';

  root.innerHTML = `
    <div class="ipo-page">
      <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:20px">
        <div>
          <h1 style="font-size:22px;font-weight:700;color:var(--text-main);margin:0">🚀 IPO Pipeline Tracker</h1>
          <p class="page-subtitle" style="font-size:13px;color:var(--text-muted);margin-top:4px">Pantau IPO saham IDX — listing mendatang dan performa pasca-listing.</p>
        </div>
      </div>

      <div id="ipo-tabs">${renderTabs('upcoming')}</div>

      <div id="ipo-skeleton">
        ${skeletonRows(6)}
      </div>
      <div id="ipo-content" style="display:none">
        <div class="flex items-center justify-center" style="padding:40px;color:var(--text-dim)">
          <span>Memuat data IPO...</span>
        </div>
      </div>
    </div>
  `;

  // Wire tabs
  wireTabs(root);

  // Initial load
  await loadData();

  // Expose refresh
  root._ipoRefresh = () => loadData(true);
}
