// ─── Signal Overview Page ─────────────────────────
// Route: #signal-overview
// Shows all latest signals across the market with filtering

import { nf, pct } from '../utils/format.js?v=20260508B';

let currentSignalType = '';
let currentPage = 1;
let sortColumn = 'signal_date';
let sortDir = 'desc';

export async function render() {
  const app = document.getElementById('app-root');
  app.innerHTML = `
    <div class="dash-hero-pro" style="margin-bottom:20px">
      <div class="dash-summary-strip stagger-reveal" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
        <div>
          <h2 style="margin:0;font-size:22px;font-weight:800;letter-spacing:-.03em">📡 Signal Overview</h2>
          <p style="margin:4px 0 0;font-size:13px;color:var(--text-muted)">Semua sinyal trading terkini dari seluruh saham</p>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn btn-sm signal-filter-btn active" data-type="">Semua</button>
          <button class="btn btn-sm signal-filter-btn" data-type="buy">BUY</button>
          <button class="btn btn-sm signal-filter-btn" data-type="sell">SELL</button>
          <button class="btn btn-sm" id="btn-signal-refresh" style="padding:6px 10px"><i data-lucide="refresh-cw" style="width:14px"></i></button>
        </div>
      </div>
    </div>
    <div id="signal-summary-cards" class="dash-summary-strip" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px">
      <div class="dash-summary-card" id="signal-total-card" style="padding:14px;border-radius:14px;background:var(--bg-panel);border:1px solid var(--border-subtle)">
        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em">Total Sinyal</div>
        <div style="font-size:28px;font-weight:800;font-family:var(--font-mono);margin-top:4px" id="signal-total-count">—</div>
      </div>
      <div class="dash-summary-card" style="padding:14px;border-radius:14px;background:var(--bg-panel);border:1px solid var(--border-subtle)">
        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em">BUY</div>
        <div style="font-size:28px;font-weight:800;font-family:var(--font-mono);color:var(--up-color);margin-top:4px" id="signal-buy-count">—</div>
      </div>
      <div class="dash-summary-card" style="padding:14px;border-radius:14px;background:var(--bg-panel);border:1px solid var(--border-subtle)">
        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em">SELL</div>
        <div style="font-size:28px;font-weight:800;font-family:var(--font-mono);color:var(--down-color);margin-top:4px" id="signal-sell-count">—</div>
      </div>
      <div class="dash-summary-card" style="padding:14px;border-radius:14px;background:var(--bg-panel);border:1px solid var(--border-subtle)">
        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em">Buy/Sell Ratio</div>
        <div style="font-size:28px;font-weight:800;font-family:var(--font-mono);margin-top:4px" id="signal-ratio">—</div>
      </div>
    </div>
    <div class="panel" style="padding:0;overflow:hidden">
      <div class="table-wrap" style="overflow-x:auto">
        <table class="table" id="signal-table" style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr>
              <th data-sort="ticker" style="text-align:left;padding:12px 14px;cursor:pointer">Ticker <span class="sort-icon"></span></th>
              <th data-sort="company_name" style="text-align:left;padding:12px 14px;cursor:pointer">Nama <span class="sort-icon"></span></th>
              <th data-sort="signal_type" style="text-align:center;padding:12px 14px;cursor:pointer">Sinyal <span class="sort-icon"></span></th>
              <th data-sort="close" style="text-align:right;padding:12px 14px;cursor:pointer">Harga <span class="sort-icon"></span></th>
              <th data-sort="magic_line" style="text-align:right;padding:12px 14px;cursor:pointer">Magic Line <span class="sort-icon"></span></th>
              <th data-sort="signal_date" style="text-align:right;padding:12px 14px;cursor:pointer">Tanggal <span class="sort-icon"></span></th>
              <th style="text-align:center;padding:12px 14px">Aksi</th>
            </tr>
          </thead>
          <tbody id="signal-table-body">
            <tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted)">Memuat sinyal...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Event handlers
  document.querySelectorAll('.signal-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.signal-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSignalType = btn.dataset.type;
      fetchSignals();
    });
  });

  document.getElementById('btn-signal-refresh')?.addEventListener('click', fetchSignals);

  // Sort handler
  document.querySelectorAll('#signal-table th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.sort;
      if (sortColumn === col) {
        sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        sortColumn = col;
        sortDir = col === 'company_name' || col === 'ticker' ? 'asc' : 'desc';
      }
      document.querySelectorAll('#signal-table th[data-sort] .sort-icon').forEach(el => el.textContent = '');
      const icon = th.querySelector('.sort-icon');
      if (icon) icon.textContent = sortDir === 'asc' ? ' ▲' : ' ▼';
      renderTable();
    });
  });

  // Initial load
  fetchSignals();
  observeStagger();
}

async function fetchSignals() {
  const tbody = document.getElementById('signal-table-body');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px"><div class="loading-spinner" style="margin:0 auto"></div></td></tr>';

  try {
    const params = new URLSearchParams({ limit: 200, days_back: 30 });
    if (currentSignalType) params.set('signal_type', currentSignalType);
    const res = await apiFetch(`/signals/summary?${params}`, { timeout: 10000 });
    const data = res?.latest || [];

    // Update summary cards
    const counts = res?.counts || { buy: 0, sell: 0 };
    document.getElementById('signal-total-count').textContent = res?.total || 0;
    document.getElementById('signal-buy-count').textContent = counts.buy || 0;
    document.getElementById('signal-sell-count').textContent = counts.sell || 0;
    const ratio = counts.sell > 0 ? ((counts.buy / counts.sell) * 100).toFixed(1) : '—';
    document.getElementById('signal-ratio').textContent = counts.sell > 0 ? `${ratio}%` : '—';

    window._signalData = data;
    renderTable();
  } catch {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--down-color)">Gagal memuat sinyal</td></tr>';
  }
}

function renderTable() {
  const tbody = document.getElementById('signal-table-body');
  if (!tbody) return;
  const data = [...(window._signalData || [])];

  // Sort
  data.sort((a, b) => {
    let va = a[sortColumn] ?? '';
    let vb = b[sortColumn] ?? '';
    if (sortColumn === 'close' || sortColumn === 'magic_line') {
      va = parseFloat(va) || 0;
      vb = parseFloat(vb) || 0;
    }
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  tbody.innerHTML = data.map(row => {
    const signalBadge = row.signal_type === 'buy'
      ? '<span class="badge" style="background:var(--up-bg);color:var(--up-color);border-color:transparent">BUY</span>'
      : '<span class="badge" style="background:var(--down-bg);color:var(--down-color);border-color:transparent">SELL</span>';
    return `<tr style="border-bottom:1px solid var(--border-subtle);transition:background .15s">
      <td style="padding:10px 14px"><a href="#stock/${row.ticker_base}" class="mono strong" style="color:var(--text-main);text-decoration:none;font-weight:700">${row.ticker_base}</a></td>
      <td style="padding:10px 14px;color:var(--text-muted);font-size:12px;max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${row.company_name || '—'}</td>
      <td style="padding:10px 14px;text-align:center">${signalBadge}</td>
      <td style="padding:10px 14px;text-align:right;font-family:var(--font-mono);font-weight:600">${nf(row.close)}</td>
      <td style="padding:10px 14px;text-align:right;font-family:var(--font-mono);color:var(--text-muted)">${nf(row.magic_line)}</td>
      <td style="padding:10px 14px;text-align:right;font-size:12px;color:var(--text-dim)">${row.signal_date || '—'}</td>
      <td style="padding:10px 14px;text-align:center">
        <a href="#stock/${row.ticker_base}" class="btn btn-sm" style="padding:4px 10px;font-size:11px">Detail</a>
      </td>
    </tr>`;
  }).join('');
}

function observeStagger() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-visible'); observer.unobserve(e.target); }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.stagger-reveal').forEach(el => observer.observe(el));
}
