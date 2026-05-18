// ─── Dividend Dashboard & Kalkulator ──────────────────────────
// 26.1.2 — Dividend Dashboard & Kalkulator
// 31.3.1 — Dividend view data: per-ticker API, history table, yield calc, ticker search
// API: GET /api/dividends, GET /api/dividends/aristocrats
// API: GET /api/stocks/{ticker}/dividends

import { apiFetch, showToast } from '../api.js';
import { nf, pct, money, fmt } from '../utils/format.js';
import { t as _t } from '../i18n.js?v=20260518I';
const t = (key, params) => (window.t ? window.t(key, params) : _t(key, params));

// ─── Module State ─────────────────────────────────────────────
let dividendsData = [];
let aristocratsData = [];
let sectorAverages = {};
let activeSector = 'all';
let sortKey = null;
let sortDir = 'asc';
let activeTab = 'overview'; // 'overview', 'aristocrats', 'ticker'

// 31.3.1 — per-ticker state
let tickerDetailData = [];   // array of dividend events from /api/stocks/{ticker}/dividends
let activeTicker = 'BBCA';   // current ticker for detail view
let tickerSortKey = null;
let tickerSortDir = 'asc';

// ─── Helpers ────────────────────────────────────────────────
function safeRows(payload, key = 'data') {
  const arr = Array.isArray(payload?.data) ? payload.data : [];
  return arr;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
    return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return dateStr; }
}

function fmtYield(val) {
  if (val == null) return '<span class="text-dim">—</span>';
  const n = Number(val);
  const cls = n > 0 ? 'text-up' : 'text-dim';
  return `<span class="${cls}">${pct(n)}</span>`;
}

function fmtCompare(yieldVal, sectorAvg) {
  if (yieldVal == null || sectorAvg == null) return '<span class="text-dim">—</span>';
  const diff = Number(yieldVal) - Number(sectorAvg);
  const cls = diff >= 0 ? 'text-up' : 'text-down';
  const sign = diff >= 0 ? '+' : '';
  return `<span class="${cls}">${sign}${pct(diff)}</span>`;
}

function skeletonRows(n = 6) {
  return `<div class="flex-col gap-2 p-4">${Array(n).fill('<div class="skeleton skeleton-card" style="height:44px;border-radius:8px"></div>').join('')}</div>`;
}

function emptyBlock(msg) {
  return `<div class="empty-state-card">
    <div class="empty-state-icon">📊</div>
    <strong class="empty-state-title">Belum Ada Data</strong>
    <span class="empty-state-desc">${msg || 'Data dividen belum tersedia.'}</span>
  </div>`;
}

// ─── Dummy fallback data (31.1.3) ────────────────────
const DUMMY_DIVIDENDS = [
  { ticker: 'BBCA', company_name: 'Bank Central Asia Tbk', sector: 'Keuangan', dividend_yield: 2.45, sector_avg_yield: 2.10, events: [{ event_date: '2026-06-15' }] },
  { ticker: 'TLKM', company_name: 'Telkom Indonesia Tbk', sector: 'Telekomunikasi', dividend_yield: 4.80, sector_avg_yield: 3.90, events: [{ event_date: '2026-07-01' }] },
  { ticker: 'ASII', company_name: 'Astra International Tbk', sector: 'Industri', dividend_yield: 3.20, sector_avg_yield: 2.75, events: [{ event_date: '2026-06-20' }] },
];

function errorBlock(msg) {
  return `<div class="empty-state-card">
    <div class="empty-state-icon">⚠️</div>
    <strong class="empty-state-title" style="color:var(--down-color)">Gagal Memuat Data</strong>
    <span class="empty-state-desc">${msg || 'Terjadi kesalahan saat mengambil data.'}</span>
  </div>`;
}

// ─── Tab rendering ───────────────────────────────────────────
function renderTabs(active) {
  const tabs = [
    { key: 'overview',    label: '📋 Dividen Overview' },
    { key: 'aristocrats', label: '👑 Dividend Aristocrats' },
    { key: 'ticker',      label: '🔍 Per Saham' },
  ];
  return `<div class="flex gap-2" style="margin-bottom:16px;flex-wrap:wrap" role="tablist">
    ${tabs.map(t => `<button class="btn ${active === t.key ? 'btn-primary' : ''}" data-dividend-tab="${t.key}" role="tab" aria-selected="${active === t.key}" style="font-size:12px;padding:6px 14px">${t.label}</button>`).join('')}
  </div>`;
}

// ─── Render sector filter dropdown ───────────────────────────
function renderSectorFilter(selected) {
  const sectors = [...new Set(dividendsData.map(d => d.sector).filter(Boolean))].sort();
  return `<select class="form-input" id="dividend-sector-filter" style="max-width:250px;font-size:12px;padding:6px 10px">
    <option value="all">Semua Sektor</option>
    ${sectors.map(s => `<option value="${s}" ${selected === s ? 'selected' : ''}>${s}</option>`).join('')}
  </select>`;
}

// ─── Overview table (dividend list) ──────────────────────────
function getOverviewColumns() {
  const mobile = window.innerWidth < 768;
  const all = [
    { key: 'ticker',   label: 'Ticker',    mobile: true },
    { key: 'company',  label: 'Nama',      mobile: false },
    { key: 'sector',   label: 'Sektor',    mobile: false },
    { key: 'yield',    label: 'Yield',     mobile: true },
    { key: 'vs_sector',label: 'vs Rerata Sektor', mobile: false },
    { key: 'next_date',label: 'Ex-Date Terdekat',  mobile: true },
  ];
  return mobile ? all.filter(c => c.mobile) : all;
}

function renderOverviewTable(data) {
  if (!data || !data.length) {
    return emptyBlock('Tidak ada data dividen untuk ditampilkan.');
  }

  // Filter by sector
  let filtered = data;
  if (activeSector !== 'all') {
    filtered = data.filter(d => d.sector === activeSector);
  }

  if (!filtered.length) {
    return emptyBlock('Tidak ada data dividen untuk sektor yang dipilih.');
  }

  // Sort
  if (sortKey) {
    filtered = [...filtered];
    filtered.sort((a, b) => {
      let va, vb;
      switch (sortKey) {
        case 'ticker': va = a.ticker; vb = b.ticker; break;
        case 'yield': va = a.dividend_yield; vb = b.dividend_yield; break;
        case 'next_date':
          va = (a.events && a.events[0]?.event_date) || '';
          vb = (b.events && b.events[0]?.event_date) || '';
          break;
        default: va = a[sortKey]; vb = b[sortKey];
      }
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      const cmp = typeof va === 'string' ? va.localeCompare(vb) : Number(va) - Number(vb);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }

  const cols = getOverviewColumns();
  const thead = `<thead><tr>${cols.map(col => {
    const isSorted = sortKey === col.key;
    const arrow = isSorted ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';
    const sortable = col.key !== 'company' && col.key !== 'vs_sector' && col.key !== 'sector';
    return `<th${sortable ? ` data-sort="${col.key}" class="sortable-th"` : ''}>${col.label}${arrow}</th>`;
  }).join('')}</tr></thead>`;

  const tbody = `<tbody>${filtered.map(item => {
    const latestEvent = (item.events && item.events[0]) || {};
    const nextDate = latestEvent.event_date || '';
    const hasMultiple = item.events && item.events.length > 1;
    return `<tr class="dividend-row" data-ticker="${item.ticker}">
      ${cols.map(col => {
        switch (col.key) {
          case 'ticker':
            return `<td><a href="#stock/${item.ticker}" class="mono strong">${item.ticker}</a></td>`;
          case 'company':
            return `<td class="text-dim text-truncate" style="max-width:160px">${item.company_name || '—'}</td>`;
          case 'sector':
            return `<td class="text-dim">${item.sector || '—'}</td>`;
          case 'yield':
            return `<td class="tabular-nums">${fmtYield(item.dividend_yield)}</td>`;
          case 'vs_sector':
            return `<td class="tabular-nums">${fmtCompare(item.dividend_yield, item.sector_avg_yield)}</td>`;
          case 'next_date':
            return `<td class="tabular-nums text-dim">${formatDate(nextDate)}${hasMultiple ? ` <span class="badge badge-sm">${item.events.length}x</span>` : ''}</td>`;
          default:
            return '<td>—</td>';
        }
      }).join('')}
    </tr>`;
  }).join('')}</tbody>`;

  return `<div class="table-wrapper" style="overflow-x:auto;border-radius:12px;border:1px solid var(--border-subtle)">
    <table class="table dividend-table">${thead}${tbody}</table>
  </div>
  <div class="text-xs text-dim mt-2">Menampilkan ${filtered.length} dari ${data.length} saham dengan dividen.</div>`;
}

// ─── Dividend Kalkulator ─────────────────────────────────────
function renderCalculator() {
  return `<div class="panel" style="margin-top:20px;padding:20px">
    <h2 style="font-size:16px;font-weight:700;margin:0 0 12px">🧮 Kalkulator Dividen</h2>
    <p class="text-xs text-dim" style="margin:0 0 16px">Hitung estimasi pendapatan dividen berdasarkan jumlah saham yang dimiliki.</p>
    <div class="grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px">
      <div class="flex-col gap-1">
        <label class="text-xs text-dim">Pilih Saham</label>
        <select class="form-input" id="calc-ticker" style="font-size:13px">
          <option value="">— Pilih saham —</option>
          ${dividendsData.map(d => `<option value="${d.ticker}" data-yield="${d.dividend_yield || 0}">${d.ticker}${d.company_name ? ` — ${d.company_name}` : ''}</option>`).join('')}
        </select>
      </div>
      <div class="flex-col gap-1">
        <label class="text-xs text-dim">Jumlah Saham (lembar)</label>
        <input type="number" class="form-input" id="calc-shares" min="1" value="100" step="100" style="font-size:13px">
      </div>
      <div class="flex-col gap-1">
        <label class="text-xs text-dim">Harga Pasar (Rp)</label>
        <input type="number" class="form-input" id="calc-price" min="1" value="1000" step="50" style="font-size:13px">
      </div>
      <div class="flex-col gap-1">
        <label class="text-xs text-dim">Frekuensi / Tahun</label>
        <select class="form-input" id="calc-frequency" style="font-size:13px">
          <option value="1">1x (tahunan)</option>
          <option value="2" selected>2x (semesteran)</option>
          <option value="4">4x (kuartalan)</option>
        </select>
      </div>
    </div>
    <div class="flex gap-3" style="margin-top:8px">
      <label class="flex items-center gap-1 text-xs" style="cursor:pointer">
        <input type="radio" name="tax-status" value="resident" checked> Residen (PPh 10%)
      </label>
      <label class="flex items-center gap-1 text-xs" style="cursor:pointer">
        <input type="radio" name="tax-status" value="nonresident"> Non-Residen (PPh 20%)
      </label>
    </div>
    <div id="calc-results" class="grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-top:16px;padding:16px;background:var(--bg-inset);border-radius:10px">
      <div class="flex-col gap-0">
        <span class="text-xs text-dim">Dividend Per Lembar (est.)</span>
        <strong class="text-lg" id="calc-dps">—</strong>
      </div>
      <div class="flex-col gap-0">
        <span class="text-xs text-dim">Dividend Bruto</span>
        <strong class="text-lg" id="calc-gross">—</strong>
      </div>
      <div class="flex-col gap-0">
        <span class="text-xs text-dim">Dividend Bersih (setelah pajak)</span>
        <strong class="text-lg text-up" id="calc-net">—</strong>
      </div>
      <div class="flex-col gap-0">
        <span class="text-xs text-dim">Pendapatan Tahunan</span>
        <strong class="text-lg text-up" id="calc-annual">—</strong>
      </div>
      <div class="flex-col gap-0">
        <span class="text-xs text-dim">Dividend Yield</span>
        <strong class="text-lg" id="calc-yield">—</strong>
      </div>
    </div>
  </div>`;
}

// ─── Dividend Aristocrats Section ────────────────────────────
function renderAristocratsTable(data) {
  if (!data || !data.length) {
    return `<div class="empty-state-card">
      <div class="empty-state-icon">👑</div>
      <strong class="empty-state-title">Belum Ada Aristokrat</strong>
      <span class="empty-state-desc">Belum ada perusahaan dengan ${5}+ tahun dividen beruntun tercatat.</span>
    </div>`;
  }

  const mobile = window.innerWidth < 768;
  const cols = mobile
    ? [
        { key: 'rank', label: '#' },
        { key: 'ticker', label: 'Ticker' },
        { key: 'yield', label: 'Yield' },
        { key: 'consecutive', label: 'Tahun' },
      ]
    : [
        { key: 'rank', label: '#' },
        { key: 'ticker', label: 'Ticker' },
        { key: 'company', label: 'Nama' },
        { key: 'sector', label: 'Sektor' },
        { key: 'yield', label: 'Yield' },
        { key: 'consecutive', label: 'Konsisten (thn)' },
        { key: 'range', label: 'Rentang Tahun' },
      ];

  const thead = `<thead><tr>${cols.map(col => `<th>${col.label}</th>`).join('')}</tr></thead>`;
  const tbody = `<tbody>${data.map((item, idx) => {
    return `<tr class="aristocrat-row" data-ticker="${item.ticker}">
      ${cols.map(col => {
        switch (col.key) {
          case 'rank': return `<td class="text-dim tabular-nums" style="font-size:11px;font-weight:700">${idx + 1}</td>`;
          case 'ticker': return `<td><a href="#stock/${item.ticker}" class="mono strong">${item.ticker}</a></td>`;
          case 'company': return `<td class="text-dim text-truncate" style="max-width:160px">${item.company_name || '—'}</td>`;
          case 'sector': return `<td class="text-dim">${item.sector || '—'}</td>`;
          case 'yield': return `<td class="tabular-nums">${fmtYield(item.dividend_yield)}</td>`;
          case 'consecutive': return `<td><span class="badge badge-success">${item.consecutive_years} thn</span></td>`;
          case 'range': return `<td class="text-dim text-xs">${item.years_range || '—'}</td>`;
          default: return '<td>—</td>';
        }
      }).join('')}
    </tr>`;
  }).join('')}</tbody>`;

  return `<div class="table-wrapper" style="overflow-x:auto;border-radius:12px;border:1px solid var(--border-subtle)">
    <table class="table aristocrat-table">${thead}${tbody}</table>
  </div>
  <div class="text-xs text-dim mt-2">${data.length} perusahaan dengan dividen beruntun ${5}+ tahun.</div>`;
}

// ─── 31.3.1: Ticker Search Bar ───────────────────────────────
function renderTickerSearch() {
  return `<div class="flex gap-2 items-center flex-wrap" style="margin-bottom:16px">
    <label class="text-xs text-dim" style="white-space:nowrap">Cari Saham:</label>
    <input type="text" id="ticker-search-input" class="form-input" placeholder="Contoh: BBCA, TLKM, ASII"
      value="${activeTicker}" maxlength="10"
      style="max-width:160px;font-size:13px;text-transform:uppercase;font-weight:600;letter-spacing:1px">
    <button class="btn btn-primary btn-sm" id="ticker-search-btn" type="button">Tampilkan</button>
    <span class="text-xs text-dim" id="ticker-search-status"></span>
  </div>`;
}

// ─── 31.3.1: Per-ticker dividend history table ────────────────
function renderTickerDividendTable(data, buyPrice) {
  if (!data || !data.length) {
    return emptyBlock(`Tidak ada riwayat dividen untuk <strong>${activeTicker}</strong>.`);
  }

  // Sort
  let rows = [...data];
  if (tickerSortKey) {
    rows.sort((a, b) => {
      let va, vb;
      switch (tickerSortKey) {
        case 'ex_date':      va = a.ex_date || '';      vb = b.ex_date || '';      break;
        case 'payment_date': va = a.payment_date || ''; vb = b.payment_date || ''; break;
        case 'amount':       va = Number(a.amount) || 0; vb = Number(b.amount) || 0; break;
        case 'type':         va = a.type || '';          vb = b.type || '';          break;
        case 'yield_pct':
          va = buyPrice > 0 ? (Number(a.amount) / buyPrice) * 100 : 0;
          vb = buyPrice > 0 ? (Number(b.amount) / buyPrice) * 100 : 0;
          break;
        default: va = ''; vb = '';
      }
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      const cmp = typeof va === 'string' ? va.localeCompare(vb) : Number(va) - Number(vb);
      return tickerSortDir === 'asc' ? cmp : -cmp;
    });
  }

  function sortTh(key, label) {
    const active = tickerSortKey === key;
    const arrow = active ? (tickerSortDir === 'asc' ? ' ▲' : ' ▼') : '';
    return `<th class="sortable-th" data-ticker-sort="${key}">${label}${arrow}</th>`;
  }

  const thead = `<thead><tr>
    ${sortTh('ex_date', 'Ex-Date')}
    ${sortTh('payment_date', 'Payment Date')}
    ${sortTh('amount', 'Amount (Rp/saham)')}
    ${sortTh('type', 'Type')}
    ${sortTh('yield_pct', 'Yield%')}
  </tr></thead>`;

  const tbody = `<tbody>${rows.map(row => {
    const amt = Number(row.amount) || 0;
    const yieldPct = buyPrice > 0 ? (amt / buyPrice) * 100 : null;
    const yieldStr = yieldPct != null
      ? `<span class="${yieldPct > 0 ? 'text-up' : 'text-dim'}">${yieldPct.toFixed(2)}%</span>`
      : '<span class="text-dim">—</span>';
    const typeLabel = row.type
      ? `<span class="badge badge-sm">${row.type}</span>`
      : '<span class="text-dim">—</span>';
    return `<tr>
      <td class="tabular-nums">${formatDate(row.ex_date)}</td>
      <td class="tabular-nums text-dim">${formatDate(row.payment_date)}</td>
      <td class="tabular-nums"><strong>${amt > 0 ? money(amt) : '—'}</strong></td>
      <td>${typeLabel}</td>
      <td class="tabular-nums">${yieldStr}</td>
    </tr>`;
  }).join('')}</tbody>`;

  return `<div class="table-wrapper" style="overflow-x:auto;border-radius:12px;border:1px solid var(--border-subtle)">
    <table class="table dividend-table" id="ticker-dividend-table">${thead}${tbody}</table>
  </div>
  <div class="text-xs text-dim mt-2">${rows.length} entri dividen untuk <strong>${activeTicker}</strong>.</div>`;
}

// ─── 31.3.1: Yield calculator (per-ticker) ───────────────────
function renderTickerYieldCalc() {
  return `<div class="panel" style="margin-top:20px;padding:20px">
    <h2 style="font-size:15px;font-weight:700;margin:0 0 10px">📐 Yield Calculator — ${activeTicker}</h2>
    <p class="text-xs text-dim" style="margin:0 0 14px">Masukkan harga beli untuk menghitung dividend yield otomatis pada tabel di atas.</p>
    <div class="flex gap-3 items-end flex-wrap">
      <div class="flex-col gap-1">
        <label class="text-xs text-dim" for="ticker-buy-price">Harga Beli (Rp/saham)</label>
        <input type="number" id="ticker-buy-price" class="form-input" min="1" step="50"
          placeholder="Contoh: 9500" style="max-width:180px;font-size:13px">
      </div>
      <div class="flex-col gap-1" style="min-width:140px">
        <span class="text-xs text-dim">Total Dividen (setahun terakhir)</span>
        <strong class="text-lg" id="ticker-total-div">—</strong>
      </div>
      <div class="flex-col gap-1" style="min-width:120px">
        <span class="text-xs text-dim">Yield (vs harga beli)</span>
        <strong class="text-lg text-up" id="ticker-yield-result">—</strong>
      </div>
    </div>
  </div>`;
}

// ─── 31.3.1: Wire ticker tab interactions ────────────────────
function wireTickerTab(container) {
  const searchInput = container.querySelector('#ticker-search-input');
  const searchBtn   = container.querySelector('#ticker-search-btn');
  const statusEl    = container.querySelector('#ticker-search-status');

  function doSearch() {
    const val = (searchInput?.value || '').trim().toUpperCase();
    if (!val) return;
    if (val === activeTicker && tickerDetailData.length) return;
    activeTicker = val;
    tickerSortKey = null;
    tickerSortDir = 'asc';
    loadTickerData();
  }

  searchBtn?.addEventListener('click', doSearch);
  searchInput?.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
  searchInput?.addEventListener('input', () => {
    searchInput.value = searchInput.value.toUpperCase();
  });

  // Wire yield calculator
  wireTickerYieldCalc(container);

  // Wire sort headers on ticker table
  wireTickerSortHeaders(container);
}

function wireTickerYieldCalc(container) {
  const priceInput  = container.querySelector('#ticker-buy-price');
  const totalEl     = container.querySelector('#ticker-total-div');
  const yieldEl     = container.querySelector('#ticker-yield-result');
  const tableWrap   = container.querySelector('#ticker-dividend-table');

  if (!priceInput) return;

  function recalc() {
    const buyPrice = parseFloat(priceInput.value) || 0;

    // Rerender table with new yield column
    const tableContainer = document.getElementById('ticker-table-container');
    if (tableContainer) {
      tableContainer.innerHTML = renderTickerDividendTable(tickerDetailData, buyPrice);
      wireTickerSortHeaders(document.getElementById('ticker-tab-content'));
    }

    // Compute total dividend from last 12 months
    if (!tickerDetailData.length) { totalEl && (totalEl.textContent = '—'); yieldEl && (yieldEl.textContent = '—'); return; }
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    const recent = tickerDetailData.filter(r => {
      const d = r.ex_date ? new Date(r.ex_date) : null;
      return d && d >= cutoff;
    });
    const totalDiv = recent.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    if (totalEl) totalEl.textContent = totalDiv > 0 ? money(totalDiv) : '—';
    if (yieldEl) {
      if (buyPrice > 0 && totalDiv > 0) {
        const y = (totalDiv / buyPrice) * 100;
        yieldEl.textContent = y.toFixed(2) + '%';
        yieldEl.className = 'text-lg ' + (y > 0 ? 'text-up' : 'text-dim');
      } else {
        yieldEl.textContent = '—';
      }
    }
  }

  priceInput.addEventListener('input', recalc);
  // Trigger once if value already set
  if (priceInput.value) recalc();
}

function wireTickerSortHeaders(container) {
  if (!container) return;
  container.querySelectorAll('th[data-ticker-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.tickerSort;
      if (!key) return;
      if (tickerSortKey === key) {
        tickerSortDir = tickerSortDir === 'asc' ? 'desc' : 'asc';
      } else {
        tickerSortKey = key;
        tickerSortDir = 'asc';
      }
      const buyPrice = parseFloat(document.getElementById('ticker-buy-price')?.value) || 0;
      const tableContainer = document.getElementById('ticker-table-container');
      if (tableContainer) {
        tableContainer.innerHTML = renderTickerDividendTable(tickerDetailData, buyPrice);
        wireTickerSortHeaders(document.getElementById('ticker-tab-content'));
      }
    });
  });
}

// ─── 31.3.1: Load per-ticker dividend data ───────────────────
async function loadTickerData() {
  const contentEl = document.getElementById('ticker-tab-content');
  if (!contentEl) return;

  const statusEl = document.getElementById('ticker-search-status');
  if (statusEl) statusEl.textContent = `Memuat ${activeTicker}…`;

  // Show skeleton in table area only
  const tableContainer = document.getElementById('ticker-table-container');
  if (tableContainer) tableContainer.innerHTML = skeletonRows(5);

  try {
    const res = await apiFetch(`/stocks/${activeTicker}/dividends`);
    tickerDetailData = Array.isArray(res?.data) ? res.data : [];

    if (statusEl) statusEl.textContent = tickerDetailData.length
      ? `${tickerDetailData.length} entri ditemukan`
      : 'Tidak ada data';

    const buyPrice = parseFloat(document.getElementById('ticker-buy-price')?.value) || 0;
    if (tableContainer) {
      tableContainer.innerHTML = renderTickerDividendTable(tickerDetailData, buyPrice);
    }

    // Update yield calc header ticker label
    const calcTitle = contentEl.querySelector('#ticker-calc-title');
    if (calcTitle) calcTitle.textContent = `📐 Yield Calculator — ${activeTicker}`;

    wireTickerSortHeaders(contentEl);
    wireTickerYieldCalc(contentEl);
  } catch (e) {
    console.error('Ticker dividend load error:', e);
    if (statusEl) statusEl.textContent = 'Gagal memuat data';
    if (tableContainer) tableContainer.innerHTML = errorBlock(`Gagal mengambil data dividen untuk ${activeTicker}.`);
  }
}

// ─── 31.3.1: Render full ticker tab ──────────────────────────
function renderTickerTab() {
  const contentEl = document.getElementById('dividend-content');
  if (!contentEl) return;

  contentEl.innerHTML = `<div id="ticker-tab-content">
    <div class="panel" style="padding:20px">
      <h2 style="font-size:16px;font-weight:700;margin:0 0 4px">🔍 Riwayat Dividen Per Saham</h2>
      <p class="text-xs text-dim" style="margin:0 0 16px">Lihat riwayat dividen lengkap untuk satu saham. Masukkan ticker dan harga beli untuk kalkulasi yield.</p>
      ${renderTickerSearch()}
      <div id="ticker-table-container">
        ${skeletonRows(5)}
      </div>
    </div>
    ${renderTickerYieldCalc()}
  </div>`;

  wireTickerTab(contentEl);
  loadTickerData();
}

// ─── Wire Calculator ─────────────────────────────────────────
function wireCalculator() {
  const tickerEl = document.getElementById('calc-ticker');
  const sharesEl = document.getElementById('calc-shares');
  const priceEl = document.getElementById('calc-price');
  const freqEl = document.getElementById('calc-frequency');
  const taxRadios = document.querySelectorAll('input[name="tax-status"]');

  if (!tickerEl) return;

  function updateCalc() {
    const ticker = tickerEl.value;
    const shares = parseInt(sharesEl?.value || 0, 10);
    const price = parseFloat(priceEl?.value || 0);
    const freq = parseInt(freqEl?.value || 2, 10);
    const isNonResident = document.querySelector('input[name="tax-status"]:checked')?.value === 'nonresident';
    const taxRate = isNonResident ? 0.20 : 0.10;

    // Find ticker data
    const item = dividendsData.find(d => d.ticker === ticker);
    const yieldVal = item?.dividend_yield || 0;

    // Dividend per share = (yield/100) * price
    const dps = (yieldVal / 100) * price;
    const grossDiv = dps * shares;
    const netDiv = grossDiv * (1 - taxRate);
    const annualIncome = netDiv * freq;

    document.getElementById('calc-dps').textContent = dps > 0 ? money(dps) : '—';
    document.getElementById('calc-gross').textContent = grossDiv > 0 ? money(grossDiv) : '—';
    document.getElementById('calc-net').textContent = netDiv > 0 ? money(netDiv) : '—';
    document.getElementById('calc-annual').textContent = annualIncome > 0 ? money(annualIncome) : '—';
    document.getElementById('calc-yield').textContent = yieldVal > 0 ? pct(yieldVal) : '—';
  }

  tickerEl.addEventListener('change', updateCalc);
  sharesEl?.addEventListener('input', updateCalc);
  priceEl?.addEventListener('input', updateCalc);
  freqEl?.addEventListener('change', updateCalc);
  taxRadios.forEach(r => r.addEventListener('change', updateCalc));

  // Trigger initial calculation if a ticker is pre-selected
  if (tickerEl.value) updateCalc();
}

// ─── Wire Sort Headers ───────────────────────────────────────
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
      renderContent();
    });
  });
}

// ─── Render Content ──────────────────────────────────────────
function renderContent() {
  const contentEl = document.getElementById('dividend-content');
  if (!contentEl) return;

  if (activeTab === 'ticker') {
    renderTickerTab();
    return;
  }

  if (activeTab === 'aristocrats') {
    contentEl.innerHTML = `
      <div class="panel" style="padding:20px">
        <h2 style="font-size:16px;font-weight:700;margin:0 0 4px">👑 Dividend Aristocrats IDX</h2>
        <p class="text-xs text-dim" style="margin:0 0 16px">Perusahaan dengan riwayat pembayaran dividen beruntun ${5}+ tahun.</p>
        ${renderAristocratsTable(aristocratsData)}
      </div>
      <div style="margin-top:16px;padding:16px;background:var(--bg-panel);border-radius:12px;border:1px solid var(--border-subtle)">
        <div class="flex justify-between items-center">
          <span class="text-xs text-dim">Data diperbarui: ${new Date().toLocaleDateString('id-ID')}</span>
          <button class="btn btn-sm" id="dividend-export-csv">📥 CSV</button>
        </div>
      </div>`;
    wireExportCsv();
    return;
  }

  // Overview tab
  contentEl.innerHTML = `
    <div class="flex flex-wrap gap-2 justify-between items-center" style="margin-bottom:12px">
      <div class="flex gap-2 items-center">
        ${renderSectorFilter(activeSector)}
      </div>
      <div class="flex gap-2 items-center">
        <span class="text-xs text-dim">${dividendsData.length} saham</span>
        <button class="btn btn-sm" id="dividend-refresh" type="button">⟳ Refresh</button>
      </div>
    </div>
    <div id="dividend-table-container">
      ${renderOverviewTable(dividendsData)}
    </div>
    ${renderCalculator()}
  `;

  // Wire filters
  const sectorFilter = document.getElementById('dividend-sector-filter');
  if (sectorFilter) {
    sectorFilter.addEventListener('change', () => {
      activeSector = sectorFilter.value;
      renderContent();
    });
  }

  // Wire refresh
  const refreshBtn = document.getElementById('dividend-refresh');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => loadData(true));
  }

  // Wire sort
  wireSortHeaders(document.getElementById('dividend-table-container'));
  wireCalculator();
}

// ─── Wire CSV Export ─────────────────────────────────────────
function wireExportCsv() {
  const btn = document.getElementById('dividend-export-csv');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const data = activeTab === 'aristocrats' ? aristocratsData : dividendsData;
    if (!data || !data.length) {
      showToast('Tidak ada data untuk diexport', 'warning');
      return;
    }

    let headers, rows;
    if (activeTab === 'aristocrats') {
      headers = ['Rank', 'Ticker', 'Nama', 'Sektor', 'Dividend Yield', 'Konsisten (thn)', 'Rentang Tahun'];
      rows = data.map((item, idx) => [
        idx + 1,
        item.ticker || '',
        item.company_name || '',
        item.sector || '',
        item.dividend_yield != null ? item.dividend_yield + '%' : '',
        item.consecutive_years || '',
        item.years_range || '',
      ]);
    } else {
      headers = ['Ticker', 'Nama', 'Sektor', 'Dividend Yield', 'Sector Avg Yield', 'Ex-Date Terdekat'];
      rows = data.map(item => [
        item.ticker || '',
        item.company_name || '',
        item.sector || '',
        item.dividend_yield != null ? item.dividend_yield + '%' : '',
        item.sector_avg_yield != null ? item.sector_avg_yield + '%' : '',
        (item.events && item.events[0]?.event_date) || '',
      ]);
    }

    const csv = '\uFEFF' + headers.join(',') + '\n' + rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retailbijak-dividends-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('CSV diunduh', 'success');
  });
}

// ─── Load Data ────────────────────────────────────────────────
async function loadData(forceRefresh = false) {
  const contentEl = document.getElementById('dividend-content');
  const skeletonEl = document.getElementById('dividend-skeleton');

  if (!contentEl) return false;

  try {
    const [dividendsRes, aristocratsRes] = await Promise.all([
      apiFetch('/dividends'),
      apiFetch('/dividends/aristocrats'),
    ]);

    dividendsData = safeRows(dividendsRes);
    sectorAverages = dividendsRes?.sector_averages || {};
    aristocratsData = safeRows(aristocratsRes);

    // Dummy fallback if API returned nothing (31.1.3)
    if (!dividendsData.length) {
      dividendsData = DUMMY_DIVIDENDS;
    }

    // Attach sector averages
    dividendsData.forEach(d => {
      if (!d.sector_avg_yield && sectorAverages[d.sector]) {
        d.sector_avg_yield = sectorAverages[d.sector];
      }
    });

    // Hide skeleton, show content
    if (skeletonEl) skeletonEl.style.display = 'none';
    contentEl.style.display = 'block';
    contentEl.innerHTML = ''; // Will be populated by renderContent

    renderContent();
    return true;
  } catch (e) {
    console.error('Dividend load error:', e);
    if (skeletonEl) skeletonEl.style.display = 'none';
    contentEl.style.display = 'block';
    contentEl.innerHTML = errorBlock('Gagal mengambil data dividen. Periksa koneksi dan coba lagi.');
    return false;
  }
}

// ─── Wire Tabs ─────────────────────────────────────────────────
function wireTabs(root) {
  root.querySelectorAll('[data-dividend-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.dividendTab;
      if (tab === activeTab) return;
      activeTab = tab;
      sortKey = null;
      sortDir = 'asc';

      root.querySelectorAll('[data-dividend-tab]').forEach(b => {
        b.classList.toggle('btn-primary', b.dataset.dividendTab === tab);
        b.setAttribute('aria-selected', b.dataset.dividendTab === tab);
      });

      const contentEl = document.getElementById('dividend-content');
      if (contentEl) {
        contentEl.innerHTML = skeletonRows(8);
        requestAnimationFrame(() => renderContent());
      }
    });
  });
}

// ─── Main Export ──────────────────────────────────────────────
export async function renderDividends(root) {
  document.title = 'RetailBijak — Dividend Dashboard & Kalkulator';

  // 31.3.1 — parse ticker from URL hash: #dividend/BBCA
  const hashParts = window.location.hash.replace('#', '').split('/');
  if (hashParts[0] === 'dividend' && hashParts[1]) {
    activeTicker = hashParts[1].toUpperCase();
  }

  // Reset state
  dividendsData = [];
  aristocratsData = [];
  sectorAverages = {};
  activeSector = 'all';
  sortKey = null;
  sortDir = 'asc';
  activeTab = 'overview';
  tickerDetailData = [];
  tickerSortKey = null;
  tickerSortDir = 'asc';

  root.innerHTML = `
    <div class="dividend-page">
      <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:20px">
        <div>
          <h1 style="font-size:22px;font-weight:700;color:var(--text-main);margin:0">💰 Dividend Dashboard & Kalkulator</h1>
          <p class="page-subtitle" style="font-size:13px;color:var(--text-muted);margin-top:4px">Pantau dividen, hitung estimasi pendapatan, dan temukan dividend aristocrats IDX.</p>
        </div>
      </div>

      <div id="dividend-tabs">${renderTabs('overview')}</div>

      <div id="dividend-skeleton">
        ${skeletonRows(8)}
      </div>
      <div id="dividend-content" style="display:none">
        <div class="flex items-center justify-center" style="padding:40px;color:var(--text-dim)">
          <span>Memuat data dividen...</span>
        </div>
      </div>
    </div>
  `;

  // Wire tabs
  wireTabs(root);

  // Initial load
  await loadData();

  // Expose refresh
  root._dividendRefresh = () => loadData(true);
}
