import { apiFetch, showToast } from '../api.js?v=20260510';
import { nf, pf, money } from '../utils/format.js?v=20260510';
import { observeElements } from '../main.js?v=20260510';
import { showSkeleton, hideSkeleton } from '../skeleton.js?v=20260510';

const INITIAL_CAPITAL = 100_000_000; // 100M virtual cash

export async function renderPaperTrades(root) {
  document.title = 'RetailBijak — Paper Trading';
  root.innerHTML = `
    <section class="market-overview-page stagger-reveal">
      <div class="market-overview-head">
        <div class="market-head-copy">
          <div class="market-row-kicker">Virtual Trading</div>
          <h1 class="news-hero-title">Paper Trading</h1>
          <p class="news-hero-sub">Simulasi trading tanpa risiko. Mulai dengan modal virtual Rp100.000.000. Buka posisi, pantau P&L, ukur kemampuan trading-mu!</p>
        </div>
      </div>
      <div id="pt-summary" class="market-section-group"><div class="skeleton skeleton-card skeleton-h-100"></div></div>
      <div id="pt-equity-chart" class="market-section-group" style="display:none">
        <div class="market-card p-4">
          <h3 class="panel-title mb-3">Equity Curve</h3>
          <div id="pt-chart-container" style="height:220px;width:100%"></div>
        </div>
      </div>
      <div class="market-section-group">
        <div class="market-card">
          <div class="flex justify-between items-center p-4 border-bottom-subtle">
            <h3 class="panel-title m-0">Buka Posisi Baru</h3>
          </div>
          <div class="p-4">
            <div class="flex flex-wrap gap-3 items-end">
              <div style="flex:1;min-width:100px">
                <label class="text-xs text-dim uppercase strong">Kode</label>
                <input type="text" id="pt-ticker" class="form-input" placeholder="BBCA" />
              </div>
              <div style="flex:1;min-width:80px">
                <label class="text-xs text-dim uppercase strong">Tipe</label>
                <select id="pt-type" class="form-input">
                  <option value="BUY">BUY (Long)</option>
                  <option value="SELL">SELL (Short)</option>
                </select>
              </div>
              <div style="flex:1;min-width:100px">
                <label class="text-xs text-dim uppercase strong">Jumlah</label>
                <input type="number" id="pt-qty" class="form-input" value="100" step="100" min="1" />
              </div>
              <div style="flex:1;min-width:100px">
                <label class="text-xs text-dim uppercase strong">Harga (Rp)</label>
                <input type="number" id="pt-price" class="form-input" placeholder="Otomatis" step="25" />
              </div>
              <div style="flex-shrink:0">
                <button id="btn-open-trade" type="button" class="btn btn-primary">Buka</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="market-section-group">
        <div class="flex gap-2 mb-3">
          <button id="pt-filter-all" type="button" class="btn btn-sm btn-primary">Semua</button>
          <button id="pt-filter-open" type="button" class="btn btn-sm">Terbuka</button>
          <button id="pt-filter-closed" type="button" class="btn btn-sm">Tertutup</button>
        </div>
        <div id="pt-trades-container"><div class="skeleton skeleton-card skeleton-h-200"></div></div>
      </div>
    </section>`;

  let filter = '';
  loadSummary();
  loadTrades(filter);

  document.getElementById('btn-open-trade').addEventListener('click', openTrade);
  document.getElementById('pt-ticker').addEventListener('keydown', e => { if (e.key === 'Enter') openTrade(); });
  document.getElementById('pt-filter-all').addEventListener('click', () => { filter = ''; loadTrades(filter); });
  document.getElementById('pt-filter-open').addEventListener('click', () => { filter = 'open'; loadTrades(filter); });
  document.getElementById('pt-filter-closed').addEventListener('click', () => { filter = 'closed'; loadTrades(filter); });
  observeElements();
}

async function loadSummary() {
  const el = document.getElementById('pt-summary');
  try {
    const res = await apiFetch('/paper-trades/summary');
    if (!res) return;
    const pnlCls = res.total_pnl >= 0 ? 'text-up' : 'text-down';
    const portfolioValue = INITIAL_CAPITAL + (res.total_pnl || 0);
    const pctReturn = ((portfolioValue - INITIAL_CAPITAL) / INITIAL_CAPITAL * 100);
    el.innerHTML = `<div class="market-card p-4">
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div class="bt-kpi"><span class="bt-kpi-label">Modal Virtual</span><strong class="bt-kpi-value">${money(INITIAL_CAPITAL)}</strong></div>
        <div class="bt-kpi"><span class="bt-kpi-label">Nilai Portfolio</span><strong class="bt-kpi-value ${pnlCls}">${money(portfolioValue)}</strong></div>
        <div class="bt-kpi"><span class="bt-kpi-label">Return</span><strong class="bt-kpi-value ${pnlCls}">${pctReturn > 0 ? '+' : ''}${pf(pctReturn)}</strong></div>
        <div class="bt-kpi"><span class="bt-kpi-label">Total P&L</span><strong class="bt-kpi-value ${pnlCls}">${res.total_pnl > 0 ? '+' : ''}${money(res.total_pnl)}</strong></div>
        <div class="bt-kpi"><span class="bt-kpi-label">Win Rate</span><strong class="bt-kpi-value">${res.win_rate || 0}%</strong></div>
      </div>
    </div>`;
    // Load equity curve if there are trades
    if (res.total > 0) renderEquityCurve();
  } catch (e) { el.innerHTML = ''; }
}

async function renderEquityCurve() {
  const chartContainer = document.getElementById('pt-chart-container');
  const section = document.getElementById('pt-equity-chart');
  if (!chartContainer || !section) return;
  if (typeof LightweightCharts === 'undefined') return;

  try {
    const res = await apiFetch('/paper-trades');
    const trades = res?.data || [];
    if (trades.length < 1) return;

    section.style.display = '';

    // Build equity curve: accumulate P&L over time
    let runningEquity = INITIAL_CAPITAL;
    const points = [{ time: trades[trades.length - 1]?.entry_date?.slice(0,10) || '2026-01-01', value: runningEquity }];
    // Sort by entry date
    const sorted = [...trades].sort((a, b) => new Date(a.entry_date) - new Date(b.entry_date));
    for (const t of sorted) {
      const pnl = t.pnl || 0;
      runningEquity += pnl;
      points.push({ time: t.exit_date?.slice(0,10) || t.entry_date?.slice(0,10), value: Math.round(runningEquity) });
    }

    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    const isLight = theme === 'light';
    const textColor = isLight ? '#64748b' : '#94a3b8';
    const gridColor = isLight ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.035)';
    const container = chartContainer;

    if (container._chart) { container._chart.remove(); }

    const chart = LightweightCharts.createChart(container, {
      width: container.clientWidth, height: 200,
      layout: { textColor, background: { type: 'solid', color: 'transparent' } },
      grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: false },
      crosshair: { mode: 0 },
    });
    container._chart = chart;

    const isUp = runningEquity >= INITIAL_CAPITAL;
    const line = chart.addLineSeries({
      color: isUp ? '#10b981' : '#f87171', lineWidth: 2, priceLineVisible: false,
      lastValueVisible: true, crosshairMarkerVisible: true,
    });
    line.setData(points);

    const baseLine = chart.addLineSeries({
      color: isLight ? 'rgba(100,116,139,0.4)' : 'rgba(148,163,184,0.3)',
      lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false,
    });
    baseLine.setData([{ time: points[0].time, value: INITIAL_CAPITAL }, { time: points[points.length - 1].time, value: INITIAL_CAPITAL }]);

    chart.timeScale().fitContent();
    new ResizeObserver(() => { if (container.clientWidth > 0) chart.applyOptions({ width: container.clientWidth }); }).observe(container);
  } catch (e) { /* silent */ }
}

async function loadTrades(filter) {
  const el = document.getElementById('pt-trades-container');
  try {
    const q = filter ? `?status=${filter}` : '';
    const res = await apiFetch(`/paper-trades${q}`);
    const trades = res?.data || [];
    if (!trades.length) {
      el.innerHTML = '<div class="market-card p-4"><div class="empty-state-v2"><h3>Belum ada trade</h3><p>Buka posisi baru untuk memulai paper trading.</p></div></div>';
      return;
    }
    el.innerHTML = `<div class="market-card p-4"><div style="overflow-x:auto">
      <table class="bt-table">
        <thead><tr><th>#</th><th>Kode</th><th>Tipe</th><th>Entry</th><th>Exit</th><th>Qty</th><th>Harga</th><th>P&L</th><th>Return</th><th>Status</th><th class="text-right">Aksi</th></tr></thead>
        <tbody>${trades.map((t, i) => {
          const pnlCls = (t.pnl || 0) >= 0 ? 'text-up' : 'text-down';
          return `<tr>
            <td>${i+1}</td>
            <td><a href="#stock/${t.ticker}" class="mono strong">${t.ticker}</a></td>
            <td><span class="badge ${t.trade_type === 'BUY' ? 'badge-primary' : 'badge-warn'}">${t.trade_type}</span></td>
            <td class="mono text-xs">${t.entry_date.slice(0,10)}</td>
            <td class="mono text-xs">${t.exit_date ? t.exit_date.slice(0,10) : '—'}</td>
            <td class="mono">${nf(t.quantity, 0)}</td>
            <td class="mono text-xs">${money(t.entry_price)}${t.exit_price ? ` → ${money(t.exit_price)}` : ''}</td>
            <td class="mono ${pnlCls}">${t.pnl != null ? (t.pnl > 0 ? '+' : '') + money(t.pnl) : '—'}</td>
            <td class="mono ${pnlCls}">${t.pnl_pct != null ? (t.pnl_pct > 0 ? '+' : '') + pf(t.pnl_pct) : '—'}</td>
            <td><span class="badge ${t.status === 'open' ? 'badge-primary' : 'badge-dim'}">${t.status}</span></td>
            <td class="text-right">${t.status === 'open' ? `<button type="button" class="btn btn-sm btn-outline pt-close-btn" data-id="${t.id}" data-ticker="${t.ticker}">Tutup</button>` : ''}
              <button type="button" class="btn-icon pt-delete-btn" data-id="${t.id}"><i data-lucide="trash-2" class="lucide-md"></i></button></td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div></div>`;

    // Close buttons
    el.querySelectorAll('.pt-close-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const ticker = btn.dataset.ticker;
        // Auto-close at current price
        const price = prompt(`Harga tutup untuk ${ticker}:`, '');
        if (!price || isNaN(price)) return;
        try {
          const res = await apiFetch(`/paper-trades/${id}/close?price=${parseFloat(price)}`, { method: 'POST' });
          if (res?.ok) { showToast(res.message, 'success'); loadTrades(filter); loadSummary(); }
          else showToast(res?.message || 'Gagal tutup', 'error');
        } catch (e) { showToast('Gagal menutup trade', 'error'); }
      });
    });
    // Delete buttons
    el.querySelectorAll('.pt-delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (!confirm('Hapus trade ini?')) return;
        try {
          const res = await apiFetch(`/paper-trades/${id}`, { method: 'DELETE' });
          if (res?.ok) { showToast('Trade dihapus', 'success'); loadTrades(filter); loadSummary(); }
        } catch (e) { showToast('Gagal hapus', 'error'); }
      });
    });
  } catch (e) { el.innerHTML = '<div class="empty-state-v2"><h3>Gagal memuat</h3></div>'; }
}

async function openTrade() {
  const ticker = document.getElementById('pt-ticker').value.trim().toUpperCase();
  const tradeType = document.getElementById('pt-type').value;
  const qty = parseInt(document.getElementById('pt-qty').value) || 100;
  const priceInput = document.getElementById('pt-price').value;
  if (!ticker) { showToast('Masukkan kode saham', 'warning'); return; }

  let price = parseFloat(priceInput);
  if (!price || price <= 0) {
    // Try to get current price
    try {
      const chart = await apiFetch(`/stocks/${ticker}/chart-data?limit=1`);
      if (chart?.data?.length) price = chart.data[chart.data.length - 1].close;
    } catch (e) {}
    if (!price || price <= 0) { showToast('Masukkan harga', 'warning'); return; }
  }

  try {
    const res = await apiFetch('/paper-trades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker, trade_type: tradeType, quantity: qty, price }),
    });
    if (res?.ok) {
      showToast(res.message, 'success');
      document.getElementById('pt-ticker').value = '';
      document.getElementById('pt-price').value = '';
      loadTrades('');
      loadSummary();
    }
  } catch (e) { showToast('Gagal buka trade', 'error'); }
}
