import { apiFetch, showToast } from '../api.js?v=20260510';
import { nf, pf, money } from '../utils/format.js?v=20260507M';
import { observeElements } from '../main.js?v=20260507M';

export async function renderBacktest(root) {
  document.title = 'RetailBijak — Backtesting';
  root.innerHTML = `
    <section class="market-overview-page stagger-reveal">
      <div class="market-overview-head">
        <div class="market-head-copy">
          <div class="market-row-kicker">Simulasi Strategi</div>
          <h1 class="news-hero-title">Backtesting</h1>
          <p class="news-hero-sub">Uji strategi trading pada data historis. Hitung return, drawdown, Sharpe ratio, dan lihat equity curve.</p>
        </div>
      </div>
      <div class="market-section-group">
        <div class="market-card p-4">
          <div class="flex flex-wrap gap-3 items-end">
            <div class="flex-col gap-1" style="flex:1;min-width:120px">
              <label class="text-xs text-dim uppercase strong">Kode Saham</label>
              <input type="text" id="bt-ticker" class="form-input" value="BBCA" placeholder="BBCA" />
            </div>
            <div class="flex-col gap-1" style="flex:1;min-width:140px">
              <label class="text-xs text-dim uppercase strong">Strategi</label>
              <select id="bt-strategy" class="form-input">
                <option value="sma_cross">SMA Crossover (20/50)</option>
                <option value="rsi_reversal">RSI Reversal (30/70)</option>
                <option value="bb_breakout">Bollinger Breakout</option>
              </select>
            </div>
            <div class="flex-col gap-1" style="flex:1;min-width:120px">
              <label class="text-xs text-dim uppercase strong">Modal Awal (Rp)</label>
              <input type="number" id="bt-capital" class="form-input" value="10000000" step="1000000" />
            </div>
            <div style="flex-shrink:0">
              <button id="btn-run-backtest" type="button" class="btn btn-primary">Jalankan</button>
            </div>
          </div>
        </div>
      </div>
      <div id="bt-results" class="market-section-group">
        <div class="empty-state-v2"><h3>Jalankan Backtest</h3><p>Pilih saham dan strategi, lalu klik Jalankan untuk melihat hasil simulasi.</p></div>
      </div>
    </section>`;

  document.getElementById('btn-run-backtest').addEventListener('click', runBacktest);
  document.getElementById('bt-ticker').addEventListener('keydown', (e) => { if (e.key === 'Enter') runBacktest(); });
  observeElements();
}

async function runBacktest() {
  const ticker = document.getElementById('bt-ticker').value.trim().toUpperCase();
  const strategy = document.getElementById('bt-strategy').value;
  const capital = parseFloat(document.getElementById('bt-capital').value) || 10000000;
  if (!ticker) { showToast('Masukkan kode saham', 'warning'); return; }

  const container = document.getElementById('bt-results');
  container.innerHTML = '<div class="text-center py-8"><div class="skeleton skeleton-text skeleton-w-60 mb-2"></div><div class="skeleton skeleton-text short"></div></div>';

  try {
    const res = await apiFetch(`/backtest?ticker=${ticker}&strategy=${strategy}&initial_capital=${capital}`);
    if (res?.status === 'error') {
      container.innerHTML = `<div class="empty-state-v2"><h3>Gagal</h3><p>${res.message || 'Error tidak diketahui'}</p></div>`;
      return;
    }
    if (!res || res.total_trades === undefined) {
      container.innerHTML = '<div class="empty-state-v2"><h3>Gagal memuat</h3><p>Backtest engine tidak merespon.</p></div>';
      return;
    }

    const data = res;
    const pnlCls = data.total_return >= 0 ? 'text-up' : 'text-down';
    const ddCls = data.max_drawdown < 20 ? 'text-up' : data.max_drawdown < 35 ? 'text-warn' : 'text-down';
    const shCls = data.sharpe_ratio >= 1 ? 'text-up' : data.sharpe_ratio >= 0 ? 'text-warn' : 'text-down';
    const wrCls = data.win_rate >= 50 ? 'text-up' : data.win_rate >= 30 ? 'text-warn' : 'text-down';

    const stratLabels = { sma_cross: 'SMA Crossover (20/50)', rsi_reversal: 'RSI Reversal (30/70)', bb_breakout: 'Bollinger Breakout' };

    // KPI cards
    let html = `<div class="market-card p-4">
      <div class="flex justify-between items-center mb-3">
        <h3 class="panel-title m-0">Hasil ${data.ticker} — ${stratLabels[strategy] || strategy}</h3>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="bt-kpi"><span class="bt-kpi-label">Total Return</span><strong class="bt-kpi-value ${pnlCls}">${data.total_return > 0 ? '+' : ''}${pf(data.total_return)}</strong></div>
        <div class="bt-kpi"><span class="bt-kpi-label">Max Drawdown</span><strong class="bt-kpi-value ${ddCls}">${pf(data.max_drawdown)}</strong></div>
        <div class="bt-kpi"><span class="bt-kpi-label">Sharpe Ratio</span><strong class="bt-kpi-value ${shCls}">${nf(data.sharpe_ratio, 2)}</strong></div>
        <div class="bt-kpi"><span class="bt-kpi-label">Win Rate</span><strong class="bt-kpi-value ${wrCls}">${pf(data.win_rate)}</strong></div>
        <div class="bt-kpi"><span class="bt-kpi-label">Total Trade</span><strong class="bt-kpi-value">${data.total_trades}</strong></div>
        <div class="bt-kpi"><span class="bt-kpi-label">Modal Awal</span><strong class="bt-kpi-value">${money(data.initial_capital)}</strong></div>
        <div class="bt-kpi"><span class="bt-kpi-label">Nilai Akhir</span><strong class="bt-kpi-value ${pnlCls}">${money(data.final_equity)}</strong></div>
      </div>
    </div>`;

    // Equity curve chart
    if (data.equity_curve?.length) {
      html += `<div class="market-card mt-3 p-4">
        <h3 class="panel-title mb-3">Equity Curve</h3>
        <div id="bt-chart-container" style="height:300px;width:100%"></div>
      </div>`;
    }

    // Trades table
    if (data.trades?.length) {
      html += `<div class="market-card mt-3 p-4">
        <h3 class="panel-title mb-3">Riwayat Trade (${data.trades.length})</h3>
        <div style="overflow-x:auto">
          <table class="bt-table">
            <thead><tr><th>#</th><th>Beli</th><th>Harga</th><th>Jual</th><th>Harga</th><th>Saham</th><th>P&L</th><th>Return</th></tr></thead>
            <tbody>${data.trades.map((t, i) => {
              const tCls = t.pnl >= 0 ? 'text-up' : 'text-down';
              return `<tr>
                <td>${i+1}</td>
                <td class="mono text-xs">${t.date}</td>
                <td class="mono text-xs">${money(t.price)}</td>
                <td class="mono text-xs">${t.sell_date || '—'}</td>
                <td class="mono text-xs">${t.sell_price ? money(t.sell_price) : '—'}</td>
                <td class="mono text-xs">${nf(t.shares, 0)}</td>
                <td class="mono text-xs ${tCls}">${t.pnl != null ? (t.pnl > 0 ? '+' : '') + money(t.pnl) : '—'}</td>
                <td class="mono text-xs ${tCls}">${t.pnl_pct != null ? (t.pnl_pct > 0 ? '+' : '') + pf(t.pnl_pct) : '—'}</td>
              </tr>`;
            }).join('')}</tbody>
          </table>
        </div>
      </div>`;
    }

    if (data.total_trades === 0) {
      html += `<div class="market-card mt-3 p-4"><div class="empty-state-v2"><h3>Tidak Ada Trade</h3><p>Strategi ${stratLabels[strategy] || strategy} tidak menghasilkan sinyal beli untuk ${data.ticker} pada rentang data yang tersedia. Coba ticker lain atau strategi berbeda.</p></div></div>`;
    }

    container.innerHTML = html;

    // Render equity curve
    if (data.equity_curve?.length) {
      renderEquityCurve(data.equity_curve, data.initial_capital);
    }

  } catch (e) {
    container.innerHTML = `<div class="empty-state-v2"><h3>Error</h3><p>${e.message || 'Gagal menjalankan backtest'}</p></div>`;
  }
}

function renderEquityCurve(curve, initialCapital) {
  const container = document.getElementById('bt-chart-container');
  if (!container || typeof LightweightCharts === 'undefined') {
    // Lazy load
    if (typeof LightweightCharts === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js';
      script.onload = () => renderEquityCurve(curve, initialCapital);
      document.head.appendChild(script);
    }
    return;
  }

  const theme = document.documentElement.getAttribute('data-theme') || 'dark';
  const isLight = theme === 'light';
  const textColor = isLight ? '#64748b' : '#94a3b8';
  const gridColor = isLight ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.035)';

  const chart = LightweightCharts.createChart(container, {
    width: container.clientWidth,
    height: 280,
    layout: { textColor, background: { type: 'solid', color: 'transparent' } },
    grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
    rightPriceScale: { borderVisible: false },
    timeScale: { borderVisible: false, timeVisible: false },
    crosshair: { mode: 0 },
  });

  const seriesData = curve.map(p => ({ time: p.date.slice(0, 10), value: p.equity }));
  const lastVal = curve[curve.length - 1]?.equity || initialCapital;
  const isUp = lastVal >= initialCapital;

  const line = chart.addLineSeries({
    color: isUp ? '#10b981' : '#f87171',
    lineWidth: 2,
    priceLineVisible: false,
    lastValueVisible: true,
    crosshairMarkerVisible: true,
  });
  line.setData(seriesData);

  // Baseline at initial capital
  if (curve.length) {
    const baseLine = chart.addLineSeries({
      color: isLight ? 'rgba(100,116,139,0.4)' : 'rgba(148,163,184,0.3)',
      lineWidth: 1,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    baseLine.setData([
      { time: curve[0].date.slice(0, 10), value: initialCapital },
      { time: curve[curve.length - 1].date.slice(0, 10), value: initialCapital },
    ]);
  }

  chart.timeScale().fitContent();
  new ResizeObserver(() => { if (container.clientWidth > 0) chart.applyOptions({ width: container.clientWidth }); }).observe(container);
}
