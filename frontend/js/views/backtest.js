import { apiFetch, showToast } from '../api.js?v=202605120001';
import { nf, pf, money } from '../utils/format.js?v=202605120001';
import { observeElements } from '../utils/helpers.js?v=202605120001';
import { exportCSV } from '../utils/export.js?v=202605120001';

// ─── State ──────────────────────────────────────────────
let activeTab = 'strategy'; // 'strategy' | 'pattern'
let patternSortKey = 'total_occurrences';
let patternSortDir = -1; // -1 = desc, 1 = asc
let patternTimeframe = '1d';
let patternData = null;

export async function renderBacktest(root) {
  document.title = 'RetailBijak — Backtesting';
  root.innerHTML = `
    <section class="market-overview-page stagger-reveal">
      <div class="market-overview-head">
        <div class="market-head-copy">
          <div class="market-row-kicker">Simulasi Strategi & Pola</div>
          <h1 class="news-hero-title">Backtesting</h1>
          <p class="news-hero-sub">Uji strategi trading dan pola candlestick pada data historis IDX.</p>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="bt-tabs" role="tablist">
        <button class="bt-tab active" data-tab="strategy" role="tab" aria-selected="true">📈 Strategy Backtest</button>
        <button class="bt-tab" data-tab="pattern" role="tab" aria-selected="false">🕯️ Pattern Backtest</button>
      </div>

      <!-- Strategy Backtest Tab -->
      <div id="bt-tab-strategy" class="bt-tab-content active">
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
          <div class="empty-state-card"><div class="empty-state-icon">📊</div><strong class="empty-state-title">Jalankan Backtest</strong><span class="empty-state-desc">Pilih saham dan strategi, lalu klik Jalankan untuk melihat hasil simulasi.</span></div>
        </div>
      </div>

      <!-- Pattern Backtest Tab -->
      <div id="bt-tab-pattern" class="bt-tab-content">
        <div class="market-section-group">
          <div class="market-card p-4">
            <div class="flex flex-wrap gap-3 items-end">
              <div class="flex-col gap-1" style="flex:1;min-width:120px">
                <label class="text-xs text-dim uppercase strong">Timeframe</label>
                <select id="bt-pattern-tf" class="form-input">
                  <option value="1d">1 Day</option>
                  <option value="4h">4 Hours</option>
                  <option value="1wk">1 Week</option>
                </select>
              </div>
              <div class="flex-col gap-1" style="flex:1;min-width:120px">
                <label class="text-xs text-dim uppercase strong">Data Limit</label>
                <select id="bt-pattern-limit" class="form-input">
                  <option value="200">200 Candle</option>
                  <option value="500" selected>500 Candle</option>
                  <option value="1000">1000 Candle</option>
                </select>
              </div>
              <div style="flex-shrink:0">
                <button id="btn-run-pattern-bt" type="button" class="btn btn-primary">Jalankan Backtest Pola</button>
              </div>
            </div>
          </div>
        </div>
        <div id="bt-pattern-results">
          <div class="empty-state-card"><div class="empty-state-icon">🕯️</div><strong class="empty-state-title">Backtest Pola Candlestick</strong><span class="empty-state-desc">Klik "Jalankan Backtest Pola" untuk melihat performa historis setiap pola candlestick di seluruh saham IDX.</span></div>
        </div>
      </div>
    </section>`;

  // Tab switching
  document.querySelectorAll('.bt-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Strategy backtest events
  document.getElementById('btn-run-backtest').addEventListener('click', runBacktest);
  document.getElementById('bt-ticker').addEventListener('keydown', (e) => { if (e.key === 'Enter') runBacktest(); });

  // Pattern backtest events
  document.getElementById('btn-run-pattern-bt').addEventListener('click', runPatternBacktest);
  document.getElementById('bt-pattern-tf').addEventListener('change', (e) => { patternTimeframe = e.target.value; });
  document.getElementById('bt-pattern-limit').addEventListener('change', () => {});

  observeElements();
}

// ─── Tab Switching ──────────────────────────────────────

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.bt-tab').forEach(t => {
    const isActive = t.dataset.tab === tab;
    t.classList.toggle('active', isActive);
    t.setAttribute('aria-selected', isActive);
  });
  document.querySelectorAll('.bt-tab-content').forEach(c => {
    c.classList.toggle('active', c.id === `bt-tab-${tab}`);
  });
}

// ═══════════════════════════════════════════════════════════
// ─── EXISTING STRATEGY BACKTEST ───────────────────────────
// ═══════════════════════════════════════════════════════════

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
      container.innerHTML = `<div class="empty-state-card"><div class="empty-state-icon">⚠️</div><strong class="empty-state-title">Gagal</strong><span class="empty-state-desc">${res.message || 'Error tidak diketahui'}</span></div>`;
      return;
    }
    if (!res || res.total_trades === undefined) {
      container.innerHTML = '<div class="empty-state-card"><div class="empty-state-icon">⚠️</div><strong class="empty-state-title">Gagal memuat</strong><span class="empty-state-desc">Backtest engine tidak merespon.</span></div>';
      return;
    }

    const data = res;
    const pnlCls = data.total_return >= 0 ? 'text-up' : 'text-down';
    const ddCls = data.max_drawdown < 20 ? 'text-up' : data.max_drawdown < 35 ? 'text-warn' : 'text-down';
    const shCls = data.sharpe_ratio >= 1 ? 'text-up' : data.sharpe_ratio >= 0 ? 'text-warn' : 'text-down';
    const wrCls = data.win_rate >= 50 ? 'text-up' : data.win_rate >= 30 ? 'text-warn' : 'text-down';

    const stratLabels = { sma_cross: 'SMA Crossover (20/50)', rsi_reversal: 'RSI Reversal (30/70)', bb_breakout: 'Bollinger Breakout' };

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

    if (data.equity_curve?.length) {
      html += `<div class="market-card mt-3 p-4">
        <h3 class="panel-title mb-3">Equity Curve</h3>
        <div id="bt-chart-container" style="height:300px;width:100%"></div>
      </div>`;
    }

    if (data.trades?.length) {
      const trades = data.trades;
      html += `<div class="market-card mt-3 p-4">
        <div class="flex justify-between items-center mb-3">
          <h3 class="panel-title m-0">Riwayat Trade (${trades.length})</h3>
          <button type="button" class="btn btn-sm" id="bt-export-csv" style="font-size:11px"><i data-lucide="download" style="width:14px"></i> CSV</button>
        </div>
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
      html += `<div class="market-card mt-3 p-4"><div class="empty-state-card"><div class="empty-state-icon">📊</div><strong class="empty-state-title">Tidak Ada Trade</strong><span class="empty-state-desc">Strategi ${stratLabels[strategy] || strategy} tidak menghasilkan sinyal beli untuk ${data.ticker} pada rentang data yang tersedia. Coba ticker lain atau strategi berbeda.</span></div></div>`;
    }

    container.innerHTML = html;

    if (data.equity_curve?.length) {
      renderEquityCurve(data.equity_curve, data.initial_capital);
    }

    const exportBtn = document.getElementById('bt-export-csv');
    if (exportBtn && data.trades?.length) {
      exportBtn.addEventListener('click', () => {
        const headers = ['#', 'Buy Date', 'Buy Price', 'Sell Date', 'Sell Price', 'Shares', 'P&L', 'Return%'];
        const rows = data.trades.map((t, i) => [
          (i+1).toString(),
          t.date || '',
          (t.price || 0).toString(),
          t.sell_date || '',
          (t.sell_price || 0).toString(),
          (t.shares || 0).toString(),
          (t.pnl || 0).toString(),
          t.pnl_pct != null ? t.pnl_pct.toString() : '',
        ]);
        exportCSV(`retailbijak-backtest-${data.ticker}-${new Date().toISOString().slice(0,10)}.csv`, headers, rows);
        showToast(`${rows.length} trade diekspor ke CSV`, 'success');
      });
    }

  } catch (e) {
    container.innerHTML = `<div class="empty-state-card"><div class="empty-state-icon">⚠️</div><strong class="empty-state-title">Error</strong><span class="empty-state-desc">${e.message || 'Gagal menjalankan backtest'}</span></div>`;
  }
}

function renderEquityCurve(curve, initialCapital) {
  const container = document.getElementById('bt-chart-container');
  if (!container || typeof LightweightCharts === 'undefined') {
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

// ═══════════════════════════════════════════════════════════
// ─── PATTERN BACKTEST ─────────────────────────────────────
// ═══════════════════════════════════════════════════════════

async function runPatternBacktest() {
  const tf = document.getElementById('bt-pattern-tf').value;
  const limit = document.getElementById('bt-pattern-limit').value;
  const container = document.getElementById('bt-pattern-results');

  container.innerHTML = '<div class="text-center py-8"><div class="skeleton skeleton-text skeleton-w-60 mb-2"></div><div class="skeleton skeleton-text short"></div></div>';

  try {
    const res = await apiFetch(`/backtest/patterns?timeframe=${tf}&limit=${limit}`, { timeout: 60000 });
    if (!res || res.status === 'error') {
      container.innerHTML = `<div class="empty-state-card"><div class="empty-state-icon">⚠️</div><strong class="empty-state-title">Gagal</strong><span class="empty-state-desc">${res?.message || 'Backtest pola tidak merespon.'}</span></div>`;
      return;
    }

    patternData = res;
    renderPatternResults(res, container);
  } catch (e) {
    container.innerHTML = `<div class="empty-state-card"><div class="empty-state-icon">⚠️</div><strong class="empty-state-title">Error</strong><span class="empty-state-desc">${e.message || 'Gagal menjalankan backtest pola'}</span></div>`;
  }
}

function renderPatternResults(data, container) {
  const patterns = data.patterns || [];
  const topPattern = data.top_pattern_month;
  const recentAccuracy = data.recent_accuracy || {};
  const scanned = data.scanned || 0;
  const skipped = data.skipped || 0;
  const duration = data.duration_seconds || 0;

  if (!patterns.length) {
    container.innerHTML = `<div class="market-section-group"><div class="empty-state-card"><div class="empty-state-icon">🕯️</div><strong class="empty-state-title">Tidak Ada Data</strong><span class="empty-state-desc">Tidak cukup data historis untuk menghitung performa pola. Coba timeframe atau limit yang berbeda.</span></div></div>`;
    return;
  }

  // ─── Top Pattern Highlight Card ───
  let topHtml = '';
  if (topPattern) {
    const topInfo = patterns.find(p => p.pattern === topPattern.pattern);
    const accCls = topPattern.accuracy_30d >= 60 ? 'text-up' : topPattern.accuracy_30d >= 50 ? 'text-warn' : 'text-down';
    topHtml = `
      <div class="market-card p-4 mb-3" style="border-left:4px solid var(--primary-color)">
        <div class="flex justify-between items-center">
          <div>
            <div class="text-xs text-dim uppercase strong mb-1">🏆 Pola Terbaik Bulan Ini</div>
            <h3 class="panel-title m-0">${topInfo ? topInfo.label : topPattern.pattern}</h3>
            <div class="flex gap-3 mt-2">
              <span class="text-xs text-dim">Akurasi 30 hari: <strong class="${accCls}">${topPattern.accuracy_30d}%</strong></span>
              ${topInfo ? `<span class="text-xs text-dim">Arah: <strong>${topInfo.direction === 'bullish' ? '🔺 Bullish' : topInfo.direction === 'bearish' ? '🔻 Bearish' : '➡️ Netral'}</strong></span>` : ''}
            </div>
          </div>
          <div class="text-right text-xs text-dim">
            ${scanned} saham dipindai • ${duration}s
          </div>
        </div>
      </div>`;
  } else {
    const hasRecent = Object.keys(recentAccuracy).length > 0;
    if (hasRecent) {
      const best = Object.entries(recentAccuracy).sort((a, b) => b[1].accuracy_30d - a[1].accuracy_30d)[0];
      const accCls = best[1].accuracy_30d >= 60 ? 'text-up' : 'text-warn';
      const bestInfo = patterns.find(p => p.pattern === best[0]);
      topHtml = `
        <div class="market-card p-4 mb-3" style="border-left:4px solid var(--primary-color)">
          <div class="flex justify-between items-center">
            <div>
              <div class="text-xs text-dim uppercase strong mb-1">🏆 Pola Terbaik (30 Hari)</div>
              <h3 class="panel-title m-0">${bestInfo ? bestInfo.label : best[0]}</h3>
              <div class="flex gap-3 mt-2">
                <span class="text-xs text-dim">Akurasi: <strong class="${accCls}">${best[1].accuracy_30d}%</strong></span>
                <span class="text-xs text-dim">Sampel: <strong>${best[1].total_30d}</strong></span>
                <span class="text-xs text-dim">Rata-rata return: <strong>${pf(best[1].avg_return_30d)}</strong></span>
              </div>
            </div>
            <div class="text-right text-xs text-dim">
              ${scanned} saham dipindai • ${duration}s
            </div>
          </div>
        </div>`;
    }
  }

  // ─── Sort Controls ───
  const sortOptions = [
    { key: 'total_occurrences', label: 'Total Kejadian' },
    { key: 'win_rate_5d', label: 'Win Rate 5D' },
    { key: 'win_rate_10d', label: 'Win Rate 10D' },
    { key: 'avg_return_5d', label: 'Rata-rata Return 5D' },
    { key: 'win_rate_20d', label: 'Win Rate 20D' },
  ];

  // Apply current sort
  const sorted = [...patterns].sort((a, b) => {
    const aVal = a[patternSortKey] ?? 0;
    const bVal = b[patternSortKey] ?? 0;
    return (aVal - bVal) * patternSortDir;
  });

  const sortButtonsHtml = sortOptions.map(opt => `
    <button class="btn btn-sm bt-sort-btn ${patternSortKey === opt.key ? 'active' : ''}" data-sort="${opt.key}">
      ${opt.label}
      ${patternSortKey === opt.key ? (patternSortDir === -1 ? ' ▼' : ' ▲') : ''}
    </button>
  `).join('');

  // ─── Pattern Table ───
  let tableHtml = `
    <div class="market-card p-4">
      <div class="flex justify-between items-center mb-3">
        <h3 class="panel-title m-0">Performa Pola Candlestick (${patterns.length} pola)</h3>
        <div class="flex flex-wrap gap-1">
          ${sortButtonsHtml}
        </div>
      </div>
      <div style="overflow-x:auto">
        <table class="bt-table pattern-bt-table">
          <thead>
            <tr>
              <th>Pola</th>
              <th>Arah</th>
              <th>Kekuatan</th>
              <th>Kejadian</th>
              <th>WR 5D</th>
              <th>WR 10D</th>
              <th>WR 20D</th>
              <th>Return 5D</th>
              <th>Median 5D</th>
              <th>Max</th>
              <th>Min</th>
              <th style="min-width:120px">Win Rate Chart</th>
            </tr>
          </thead>
          <tbody>
            ${sorted.map(p => {
              const wrCls5 = p.win_rate_5d >= 60 ? 'text-up' : p.win_rate_5d >= 50 ? 'text-warn' : 'text-down';
              const wrCls10 = p.win_rate_10d >= 60 ? 'text-up' : p.win_rate_10d >= 50 ? 'text-warn' : 'text-down';
              const wrCls20 = p.win_rate_20d >= 60 ? 'text-up' : p.win_rate_20d >= 50 ? 'text-warn' : 'text-down';
              const returnCls = p.avg_return_5d >= 0 ? 'text-up' : 'text-down';
              const dirIcon = p.direction === 'bullish' ? '🔺' : p.direction === 'bearish' ? '🔻' : '➡️';
              const strengthBadge = p.strength === 'strong' ? 'badge-up' : p.strength === 'moderate' ? 'badge-warn' : 'badge-down';

              // Sparkline bars for win rates (5d, 10d, 20d)
              const wrSpark = sparklineBars([p.win_rate_5d, p.win_rate_10d, p.win_rate_20d], 100);

              return `<tr>
                <td><strong>${p.label}</strong></td>
                <td class="text-center">${dirIcon}</td>
                <td><span class="badge ${strengthBadge}">${p.strength}</span></td>
                <td class="mono text-xs">${nf(p.total_occurrences, 0)}</td>
                <td class="mono text-xs ${wrCls5}">${pf(p.win_rate_5d, 1)}</td>
                <td class="mono text-xs ${wrCls10}">${pf(p.win_rate_10d, 1)}</td>
                <td class="mono text-xs ${wrCls20}">${pf(p.win_rate_20d, 1)}</td>
                <td class="mono text-xs ${returnCls}">${p.avg_return_5d >= 0 ? '+' : ''}${pf(p.avg_return_5d, 2)}</td>
                <td class="mono text-xs">${p.median_return_5d >= 0 ? '+' : ''}${pf(p.median_return_5d, 2)}</td>
                <td class="mono text-xs text-up">+${pf(p.max_profit, 1)}</td>
                <td class="mono text-xs text-down">${pf(p.max_loss, 1)}</td>
                <td>${wrSpark}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div class="text-xs text-dim mt-2 flex justify-between">
        <span>Dipindai: ${nf(scanned, 0)} saham (${nf(skipped, 0)} dilewati)</span>
        <span>Waktu eksekusi: ${duration}s</span>
      </div>
    </div>`;

  // ─── Recent Accuracy Cards ───
  let recentHtml = '';
  const recentKeys = Object.keys(recentAccuracy);
  if (recentKeys.length > 0) {
    const recentSorted = recentKeys.sort((a, b) => recentAccuracy[b].accuracy_30d - recentAccuracy[a].accuracy_30d);
    recentHtml = `
      <div class="market-card p-4 mt-3">
        <h3 class="panel-title mb-3">Akurasi 30 Hari Terakhir</h3>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          ${recentSorted.slice(0, 12).map(k => {
            const r = recentAccuracy[k];
            const info = patterns.find(p => p.pattern === k);
            const accCls = r.accuracy_30d >= 60 ? 'text-up' : r.accuracy_30d >= 50 ? 'text-warn' : 'text-down';
            return `<div class="bt-kpi" style="padding:10px">
              <span class="bt-kpi-label">${info ? info.label : k}</span>
              <strong class="bt-kpi-value ${accCls}" style="font-size:18px">${pf(r.accuracy_30d, 1)}</strong>
              <span class="text-xs text-dim">n=${r.total_30d} · avg ${r.avg_return_30d >= 0 ? '+' : ''}${pf(r.avg_return_30d, 1)}</span>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  container.innerHTML = topHtml + tableHtml + recentHtml;

  // Bind sort events
  container.querySelectorAll('.bt-sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.sort;
      if (patternSortKey === key) {
        patternSortDir *= -1; // toggle direction
      } else {
        patternSortKey = key;
        patternSortDir = -1; // default desc
      }
      renderPatternResults(patternData, container);
    });
  });
}

// ─── Sparkline Bars (SVG, zero deps) ─────────────────────

function sparklineBars(values, maxVal) {
  if (!values || !values.length) return '';
  const barW = 22;
  const barH = 28;
  const gap = 3;
  const w = values.length * (barW + gap) - gap;
  const h = barH + 6;

  const bars = values.map((v, i) => {
    const pct = Math.min(Math.abs(v) / maxVal, 1);
    const bh = Math.max(pct * barH, 2);
    const x = i * (barW + gap);
    const y = barH - bh;
    const color = v >= 60 ? '#10b981' : v >= 50 ? '#f59e0b' : '#ef4444';
    return `<rect x="${x}" y="${y}" width="${barW - 2}" height="${bh}" rx="2" fill="${color}" opacity="0.85">
      <title>${v.toFixed(1)}%</title>
    </rect>`;
  }).join('');

  // Labels
  const labels = ['5D', '10D', '20D'];
  const labelEls = labels.map((l, i) => {
    const x = i * (barW + gap) + (barW - 2) / 2;
    return `<text x="${x}" y="${h - 1}" text-anchor="middle" font-size="8" fill="var(--text-muted, #94a3b8)">${l}</text>`;
  }).join('');

  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:inline-block;vertical-align:middle">
    ${bars}
    ${labelEls}
  </svg>`;
}
