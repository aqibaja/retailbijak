import { apiFetch, showToast } from '../api.js';
import { nf, pf, fmtRp } from '../utils/format.js';
import { observeElements } from '../utils/helpers.js';
import { t as _t } from '../i18n.js?v=20260518P';
const t = (key, params) => (window.t ? window.t(key, params) : _t(key, params));

let _compareTickers = [];
let _chartInstance = null;

function getCompareTickers() {
  const stored = sessionStorage.getItem('retailbijak.compare');
  return stored ? JSON.parse(stored) : [];
}

function saveCompareTickers(tickers) {
  _compareTickers = tickers;
  sessionStorage.setItem('retailbijak.compare', JSON.stringify(tickers));
}

export function addToCompare(ticker) {
  const current = getCompareTickers();
  if (current.includes(ticker)) {
    showToast(`${ticker} sudah di daftar banding`, 'info');
    return;
  }
  if (current.length >= 5) {
    showToast('Maksimal 5 saham untuk perbandingan', 'warning');
    return;
  }
  current.push(ticker);
  saveCompareTickers(current);
  showToast(`${ticker} ditambahkan ke perbandingan`, 'success');
}

function removeFromCompare(ticker) {
  const current = getCompareTickers().filter(t => t !== ticker);
  saveCompareTickers(current);
  return current;
}

export async function renderCompare(root) {
  document.title = 'RetailBijak — Perbandingan Saham';
  let stored = getCompareTickers();
  // Auto-seed default tickers jika belum ada
  if (stored.length === 0) {
    saveCompareTickers(['BBCA', 'BMRI', 'TLKM']);
    stored = getCompareTickers();
  }
  _compareTickers = stored;

  root.innerHTML = `
    <section class="market-overview-page stagger-reveal">
      <div class="market-overview-head">
        <div class="market-head-copy">
          <div class="market-row-kicker">Analisis Multi-Saham</div>
          <h1 class="news-hero-title">Perbandingan Saham</h1>
          <p class="news-hero-sub">Bandingkan performa, fundamental, dan pergerakan harga beberapa saham secara side-by-side.</p>
          <div class="market-meta-rail mt-10">
            <div class="market-session-pill is-muted" id="compare-count">${stored.length} SAHAM</div>
            <button id="btn-compare-clear" type="button" class="btn btn-sm ${stored.length ? '' : 'hidden'}">Hapus Semua</button>
          </div>
        </div>
      </div>
      <div class="market-section-group">
        <div class="market-card">
          <div class="flex items-center gap-2 p-3">
            <input type="text" id="compare-ticker-input" class="form-input" placeholder="Ketik kode saham (BBCA, BMRI...)" style="flex:1" />
            <button id="btn-compare-add" type="button" class="btn btn-primary">Tambah</button>
          </div>
          <div id="compare-chips" class="flex-wrap gap-2 px-3 pb-3">
            ${stored.map(t => `<span class="compare-chip" data-ticker="${t}">${t} <button type="button" class="compare-chip-remove" data-ticker="${t}">&times;</button></span>`).join('') || '<span class="text-xs text-dim px-3 pb-3">Belum ada saham. Ketik kode saham di atas untuk mulai.</span>'}
          </div>
        </div>
      </div>
      <div id="compare-results" class="market-section-group">
        ${stored.length >= 2 ? '<div class="skeleton skeleton-card skeleton-h-400"></div>' : '<div class="empty-state-card"><div class="empty-state-icon">📊</div><strong class="empty-state-title">Tambahkan Minimal 2 Saham</strong><span class="empty-state-desc">Masukkan kode saham di kolom di atas, lalu klik Tambah untuk memulai perbandingan.</span></div>'}
      </div>
    </section>`;

  // Event listeners
  document.getElementById('btn-compare-add').addEventListener('click', () => {
    const input = document.getElementById('compare-ticker-input');
    const val = (input.value || '').trim().toUpperCase();
    if (val) {
      addToCompare(val);
      renderCompare(root); // re-render
    }
  });
  document.getElementById('compare-ticker-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-compare-add').click();
  });
  document.getElementById('btn-compare-clear')?.addEventListener('click', () => {
    saveCompareTickers([]);
    renderCompare(root);
  });
  document.querySelectorAll('.compare-chip-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = btn.dataset.ticker;
      removeFromCompare(t);
      renderCompare(root);
    });
  });

  if (stored.length >= 2) {
    await loadComparison(stored);
  }
  observeElements();
}

async function loadComparison(tickers) {
  const container = document.getElementById('compare-results');
  if (!container) return;
  try {
    const res = await apiFetch(`/compare?tickers=${tickers.join(',')}`);
    if (!res?.data?.tickers?.length) {
      container.innerHTML = '<div class="empty-state-card"><div class="empty-state-icon">📊</div><strong class="empty-state-title">Gagal memuat data</strong><span class="empty-state-desc">Data perbandingan tidak tersedia untuk saham yang dipilih.</span></div>';
      return;
    }
    const d = res.data;
    const validTickers = d.tickers;

    // ─── Color palette ──────────────────────────────
    const colors = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#06b6d4'];
    const legendColors = validTickers.map((t, i) => colors[i % colors.length]);
    const funds = validTickers.map(t => d.fundamentals[t] || {});
    const stats = validTickers.map(t => d.stats[t] || {});

    // ─── Helper: best-value highlighting ────────────
    function bestColor(values, higherIsBetter) {
      // Returns index of best value, or -1 if all same/null
      const nums = values.map(v => v == null || v === '—' ? null : Number(v));
      if (nums.every(n => n == null)) return -1;
      const best = higherIsBetter ? Math.max(...nums.filter(n => n != null)) : Math.min(...nums.filter(n => n != null));
      return nums.indexOf(best);
    }

    // ─── Helper: Pearson correlation (defined early, reused) ─────
    function pearsonCorr(a, b) {
      const n = Math.min(a.length, b.length);
      if (n < 5) return null;
      let sumA = 0, sumB = 0, sumAB = 0, sumA2 = 0, sumB2 = 0;
      for (let i = 0; i < n; i++) {
        sumA += a[i]; sumB += b[i];
        sumAB += a[i] * b[i];
        sumA2 += a[i] * a[i]; sumB2 += b[i] * b[i];
      }
      const num = n * sumAB - sumA * sumB;
      const den = Math.sqrt((n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB));
      return den === 0 ? null : num / den;
    }

    // ─── Pre-compute correlation badge for header ────────────
    function corrLabel(r) {
      if (r == null) return '';
      const abs = Math.abs(r);
      const level = abs >= 0.8 ? 'Tinggi' : abs >= 0.5 ? 'Sedang' : 'Rendah';
      const badgeColor = abs >= 0.8 ? '#10b981' : abs >= 0.5 ? '#f59e0b' : '#94a3b8';
      return `<span class="corr-inline-badge" style="background:${badgeColor}20;color:${badgeColor};border:1px solid ${badgeColor}40;border-radius:999px;padding:2px 10px;font-size:11px;font-weight:700;margin-left:10px;vertical-align:middle">Korelasi: ${r.toFixed(2)} (${level})</span>`;
    }
    const _norm0 = (d.prices[`${validTickers[0]}_norm`] || []).map(p => p.value);
    const _norm1 = validTickers.length >= 2 ? (d.prices[`${validTickers[1]}_norm`] || []).map(p => p.value) : [];
    const _corrR = validTickers.length >= 2 ? pearsonCorr(_norm0, _norm1) : null;
    const _corrBadge = validTickers.length >= 2 ? corrLabel(_corrR) : '';

    // ─── Build all sections ──────────────────────────
    let html = '';

    // 1a. Normalized % Return Chart (Chart.js) — NEW
    html += `<div class="market-card">
      <div class="p-3" style="display:flex;align-items:center;flex-wrap:wrap;gap:8px">
        <h3 class="panel-title" style="margin:0">Return vs Awal (%)${_corrBadge}</h3>
        <span style="font-size:11px;color:var(--text-dim);margin-left:auto">Base = 100 di tanggal pertama</span>
      </div>
      <div style="position:relative;height:320px;padding:0 12px 12px">
        <canvas id="compare-return-chart"></canvas>
      </div>
    </div>`;

    // 1b. Price Chart (existing LightweightCharts)
    html += '<div class="market-card mt-3"><div class="p-3"><h3 class="panel-title">Perbandingan Harga (Normalized 100)</h3></div><div id="compare-chart-container" style="height:400px;width:100%"></div></div>';

    // 2. Sector + Market Cap Badges per ticker
    html += '<div class="market-card mt-3"><div class="p-3"><h3 class="panel-title">Informasi Emiten</h3></div><div class="compare-badges-wrap">';
    validTickers.forEach((t, i) => {
      const f = funds[i] || {};
      const name = f.name || t;
      const sector = f.sector || '—';
      const industry = f.industry || '';
      const mcap = f.market_cap != null ? fmtRp(f.market_cap) : '—';
      html += `<div class="compare-badge-card" style="border-left:3px solid ${legendColors[i]}">
        <div class="compare-badge-ticker">${t}</div>
        <div class="compare-badge-name">${name}</div>
        <div class="compare-badge-meta"><span class="compare-badge-pill">${sector}</span>${industry ? `<span class="compare-badge-pill">${industry}</span>` : ''}<span class="compare-badge-pill">${mcap}</span></div>
      </div>`;
    });
    html += '</div></div>';

    // 3. Fundamental Comparison Table — 8 metrics, best-cell green highlight
    const fundaMetrics = [
      { label: 'P/E Ratio',       key: 'pe',             higherIsBetter: false, fmt: (v) => v != null ? nf(v, 2) : '—' },
      { label: 'P/B Ratio',       key: 'pbv',            higherIsBetter: false, fmt: (v) => v != null ? nf(v, 2) : '—' },
      { label: 'ROE',             key: 'roe',            higherIsBetter: true,  fmt: (v) => v != null ? pf(v)    : '—' },
      { label: 'ROA',             key: 'roa',            higherIsBetter: true,  fmt: (v) => v != null ? pf(v)    : '—' },
      { label: 'Debt/Equity',     key: 'der',            higherIsBetter: false, fmt: (v) => v != null ? nf(v, 2) : '—' },
      { label: 'Market Cap',      key: 'market_cap',     higherIsBetter: true,  fmt: (v) => v != null ? fmtRp(v) : '—' },
      { label: 'Revenue Growth',  key: 'revenue_growth', higherIsBetter: true,  fmt: (v) => v != null ? pf(v)    : '—' },
      { label: 'Net Margin',      key: 'net_margin',     higherIsBetter: true,  fmt: (v) => v != null ? pf(v)    : '—' },
      { label: 'Dividend Yield',  key: 'dividend_yield', higherIsBetter: true,  fmt: (v) => v != null ? pf(v)    : '—' },
    ];
    html += '<div class="market-card mt-3"><div class="p-3"><h3 class="panel-title">Perbandingan Fundamental</h3></div><div style="overflow-x:auto"><table class="compare-table"><thead><tr><th>Metrik</th>';
    validTickers.forEach((t, i) => { html += `<th style="color:${legendColors[i]}">${t}</th>`; });
    html += '</tr></thead><tbody>';
    fundaMetrics.forEach(m => {
      const rawVals = funds.map(f => f[m.key] != null ? Number(f[m.key]) : null);
      const vals = funds.map(f => m.fmt(f[m.key] != null ? f[m.key] : null));
      const bestIdx = bestColor(rawVals, m.higherIsBetter);
      html += `<tr><td class="compare-label">${m.label}</td>`;
      vals.forEach((v, i) => {
        const isBest = i === bestIdx && bestIdx >= 0 && rawVals[i] != null;
        const style = isBest ? ' style="background:rgba(16,185,129,0.13);color:#10b981;font-weight:700;border-radius:4px"' : '';
        html += `<td${style}>${v}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table></div></div>';

    // 4. Performance Comparison Table
    html += '<div class="market-card mt-3"><div class="p-3"><h3 class="panel-title">Perbandingan Performa</h3></div><div style="overflow-x:auto"><table class="compare-table"><thead><tr><th>Periode</th>';
    validTickers.forEach((t, i) => { html += `<th style="color:${legendColors[i]}">${t}</th>`; });
    html += '</tr></thead><tbody>';
    const perfMetrics = [
      { label: 'YTD', key: 'return_ytd' },
      { label: '1 Bulan', key: 'return_1m' },
      { label: '3 Bulan', key: 'return_3m' },
      { label: '1 Tahun', key: 'return_1y' },
      { label: 'Total (Periode)', key: 'return_total' },
    ];
    perfMetrics.forEach(m => {
      const vals = stats.map(s => s[m.key] != null ? pf(s[m.key]) : '—');
      const rawVals = stats.map(s => s[m.key] != null ? Number(s[m.key]) : null);
      const bestIdx = bestColor(rawVals, true);
      html += `<tr><td class="compare-label">${m.label}</td>`;
      vals.forEach((v, i) => {
        const rv = rawVals[i];
        let cls = '';
        if (rv != null) cls = rv >= 0 ? 'text-up' : 'text-down';
        if (i === bestIdx && bestIdx >= 0) cls += ' compare-best';
        html += `<td class="${cls}">${v}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table></div></div>';

    // 5. Price Correlation Section (uses pearsonCorr defined above)
    html += '<div class="market-card mt-3"><div class="p-3"><h3 class="panel-title">Korelasi Harga</h3></div><div class="correlation-grid">';
    const firstNorm = d.prices[`${validTickers[0]}_norm`] || [];
    const firstVals = firstNorm.map(p => p.value);
    validTickers.forEach((t, i) => {
      if (i === 0) {
        html += `<div class="correlation-card"><div class="correlation-ticker" style="color:${legendColors[i]}">${t}</div><div class="correlation-value" style="color:${legendColors[i]}">1.00</div><div class="correlation-label">Referensi</div></div>`;
      } else {
        const normData = d.prices[`${t}_norm`] || [];
        const vals = normData.map(p => p.value);
        const r = pearsonCorr(firstVals, vals);
        const rDisplay = r != null ? r.toFixed(4) : '—';
        const strength = r != null ? (Math.abs(r) >= 0.8 ? 'Sangat Kuat' : Math.abs(r) >= 0.5 ? 'Kuat' : Math.abs(r) >= 0.3 ? 'Sedang' : 'Lemah') : '';
        const barWidth = r != null ? Math.abs(r) * 100 : 0;
        html += `<div class="correlation-card"><div class="correlation-ticker" style="color:${legendColors[i]}">${t}</div><div class="correlation-value">${rDisplay}</div><div class="correlation-bar-wrap"><div class="correlation-bar" style="width:${barWidth}%"></div></div><div class="correlation-label">${strength}</div></div>`;
      }
    });
    html += '</div></div>';

    container.innerHTML = html;

    // ─── Render Normalized % Return Chart (Chart.js) ─────────
    renderReturnChart(validTickers, d, legendColors);

    // Radar Chart
    const radarHtml = buildRadarChart(validTickers, funds, stats);
    container.innerHTML += radarHtml;

    // Render LightweightCharts
    const colorsForChart = {
      'BBCA': '#10b981', 'BMRI': '#6366f1', 'BBRI': '#f59e0b',
      'TLKM': '#06b6d4', 'ASII': '#ef4444', 'ADRO': '#8b5cf6',
      'GOTO': '#ec4899', 'BYAN': '#14b8a6', 'UNVR': '#f97316',
      'INDF': '#84cc16',
    };
    const chartColors = validTickers.map(t => colorsForChart[t] || colors[validTickers.indexOf(t) % colors.length]);

    if (typeof LightweightCharts !== 'undefined') {
      renderCompareChart(validTickers, d, chartColors);
    } else {
      // Lazy load
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js';
      script.onload = () => renderCompareChart(validTickers, d, chartColors);
      document.head.appendChild(script);
    }
  } catch (e) {
    container.innerHTML = '<div class="empty-state-card"><div class="empty-state-icon">⚠️</div><strong class="empty-state-title">Gagal memuat</strong><span class="empty-state-desc">Terjadi kesalahan saat mengambil data perbandingan.</span></div>';
  }
}

// ─── Normalized % Return Chart (Chart.js) ─────────────────────
function renderReturnChart(tickers, data, colors) {
  const canvas = document.getElementById('compare-return-chart');
  if (!canvas) return;

  const theme = document.documentElement.getAttribute('data-theme') || 'dark';
  const isLight = theme === 'light';
  const textColor = isLight ? '#64748b' : '#94a3b8';
  const gridColor = isLight ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.04)';

  // Build datasets: convert norm value (base=100) → % return = value - 100
  const datasets = tickers.map((t, i) => {
    const normData = data.prices[`${t}_norm`] || [];
    return {
      label: t,
      data: normData.map(p => ({ x: p.date.slice(0, 10), y: parseFloat((p.value - 100).toFixed(2) )})),
      borderColor: colors[i],
      backgroundColor: colors[i] + '18',
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.3,
      fill: false,
    };
  });

  // Collect all labels (dates) from first ticker
  const firstNorm = data.prices[`${tickers[0]}_norm`] || [];
  const labels = firstNorm.map(p => p.date.slice(0, 10));

  // Destroy existing Chart.js instance on this canvas if any
  if (canvas._chartjsInstance) {
    canvas._chartjsInstance.destroy();
  }

  if (typeof Chart === 'undefined') {
    // Chart.js not loaded — skip silently (LightweightCharts chart still shows)
    return;
  }

  const ctx = canvas.getContext('2d');
  canvas._chartjsInstance = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: textColor,
            font: { size: 11, weight: '600' },
            boxWidth: 12,
            padding: 16,
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y >= 0 ? '+' : ''}${ctx.parsed.y.toFixed(2)}%`,
          },
        },
      },
      scales: {
        x: {
          type: 'category',
          ticks: {
            color: textColor,
            maxTicksLimit: 8,
            maxRotation: 0,
            font: { size: 10 },
          },
          grid: { color: gridColor },
        },
        y: {
          ticks: {
            color: textColor,
            font: { size: 10 },
            callback: (v) => (v >= 0 ? '+' : '') + v + '%',
          },
          grid: { color: gridColor },
          title: {
            display: true,
            text: 'Return vs Awal (%)',
            color: textColor,
            font: { size: 11 },
          },
        },
      },
    },
  });
}

function renderCompareChart(tickers, data, colors) {
  const container = document.getElementById('compare-chart-container');
  if (!container) return;
  const theme = document.documentElement.getAttribute('data-theme') || 'dark';
  const isLight = theme === 'light';
  const textColor = isLight ? '#64748b' : '#94a3b8';
  const gridColor = isLight ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.035)';

  if (_chartInstance) {
    _chartInstance.remove();
    _chartInstance = null;
  }

  try {
    const chart = LightweightCharts.createChart(container, {
      width: container.clientWidth,
      height: 380,
      layout: {
        textColor,
        background: { type: 'solid', color: 'transparent' },
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: false },
      crosshair: { mode: 0 },
    });

    tickers.forEach((t, i) => {
      const normData = data.prices[`${t}_norm`] || [];
      if (!normData.length) return;
      const seriesData = normData.map(p => ({
        time: p.date.slice(0, 10),
        value: p.value,
      }));
      const line = chart.addLineSeries({
        color: colors[i],
        lineWidth: 2,
        title: t,
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerVisible: true,
      });
      line.setData(seriesData);
    });

    chart.timeScale().fitContent();
    _chartInstance = chart;

    new ResizeObserver(() => {
      if (_chartInstance && container.clientWidth > 0) {
        _chartInstance.applyOptions({ width: container.clientWidth });
      }
    }).observe(container);
  } catch (e) {
    container.innerHTML = '<div class="empty-state-card"><div class="empty-state-icon">📊</div><strong class="empty-state-title">Gagal render chart</strong></div>';
  }
}
// ─── Radar Chart (18.5) ────────────────────────
function buildRadarChart(tickers, funds, stats) {
  // Normalize metrics to 0-100 scale for radar
  const metrics = [
    { label: 'Momentum', key: 'return_1m', getter: (s) => s.return_1m, higher: true },
    { label: 'Volume', key: 'avg_volume', getter: (s) => s.avg_volume, higher: true },
    { label: 'PE Ratio', key: 'pe', getter: (f) => f.pe, higher: false },
    { label: 'PBV', key: 'pbv', getter: (f) => f.pbv, higher: false },
    { label: 'ROE', key: 'roe', getter: (f) => f.roe, higher: true },
    { label: 'Yield', key: 'dividend_yield', getter: (f) => f.dividend_yield, higher: true },
  ];
  const colors = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#06b6d4'];

  // Collect raw values and normalize
  const raw = tickers.map((t, i) => {
    return metrics.map(m => {
      const val = m.getter(m.key === 'return_1m' || m.key === 'avg_volume' ? (stats[i] || {}) : (funds[i] || {}));
      return val != null ? val : 0;
    });
  });

  // Find min/max for each metric
  const mins = metrics.map((_, mi) => Math.min(...raw.map(r => r[mi])));
  const maxs = metrics.map((_, mi) => Math.max(...raw.map(r => r[mi])));

  // Normalize 0-100
  const normalized = raw.map(r => r.map((v, mi) => {
    const mn = mins[mi], mx = maxs[mi];
    if (mx === mn) return 50;
    const norm = ((v - mn) / (mx - mn)) * 100;
    return metrics[mi].higher ? norm : 100 - norm;
  }));

  const centerX = 160, centerY = 160, radius = 120;
  const count = metrics.length;
  const angleStep = (2 * Math.PI) / count;

  // Create SVG
  let circles = '';
  for (let r = 0.25; r <= 1; r += 0.25) {
    const pts = [];
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + i * angleStep;
      pts.push(`${centerX + radius * r * Math.cos(angle)},${centerY + radius * r * Math.sin(angle)}`);
    }
    circles += `<polygon points="${pts.join(' ')}" fill="none" stroke="rgba(148,163,184,0.15)" stroke-width="1" />`;
  }

  // Axis lines + labels
  let axes = '';
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + i * angleStep;
    const ex = centerX + radius * Math.cos(angle);
    const ey = centerY + radius * Math.sin(angle);
    const lx = centerX + (radius + 18) * Math.cos(angle);
    const ly = centerY + (radius + 18) * Math.sin(angle);
    axes += `<line x1="${centerX}" y1="${centerY}" x2="${ex}" y2="${ey}" stroke="rgba(148,163,184,0.12)" stroke-width="1" />`;
    axes += `<text x="${lx}" y="${ly}" text-anchor="${Math.cos(angle) > 0.1 ? 'start' : Math.cos(angle) < -0.1 ? 'end' : 'middle'}" dominant-baseline="middle" fill="var(--text-muted)" font-size="10" font-weight="600">${metrics[i].label}</text>`;
  }

  // Data polygons
  const polygons = normalized.map((vals, ti) => {
    const pts = vals.map((v, i) => {
      const angle = -Math.PI / 2 + i * angleStep;
      return `${centerX + (v / 100) * radius * Math.cos(angle)},${centerY + (v / 100) * radius * Math.sin(angle)}`;
    });
    return `<polygon points="${pts.join(' ')}" fill="${colors[ti]}30" stroke="${colors[ti]}" stroke-width="2" opacity="0.8" />`;
  }).join('');

  // Legend
  const legend = tickers.map((t, i) =>
    `<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;margin:0 8px"><span style="width:10px;height:10px;border-radius:2px;background:${colors[i]}"></span>${t}</span>`
  ).join('');

  const svgW = centerX * 2 + 40, svgH = centerY * 2 + 40;

  return `<div class="market-card mt-3">
    <div class="p-3">
      <h3 class="panel-title">Radar Perbandingan</h3>
      <div style="font-size:10px;color:var(--text-dim);margin-top:2px">Berdasarkan: Momentum, Volume, PE, PBV, ROE, Dividend Yield (dinormalisasi 0-100)</div>
    </div>
    <div style="text-align:center;padding:0 12px 12px">
      <svg width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" style="max-width:100%;height:auto">
        ${circles}${axes}${polygons}
      </svg>
      <div style="margin-top:8px;display:flex;justify-content:center;flex-wrap:wrap;gap:4px">${legend}</div>
    </div>
  </div>`;
}
