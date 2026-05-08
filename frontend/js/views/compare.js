import { apiFetch, showToast } from '../api.js?v=20260509';
import { nf, pf, money } from '../utils/format.js?v=20260509B';
import { observeElements } from '../main.js?v=20260509B';

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
  const stored = getCompareTickers();
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

    // Price chart (LightweightCharts)
    let chartHtml = '<div class="market-card"><div class="p-3"><h3 class="panel-title">Perbandingan Harga (Normalized 100)</h3></div><div id="compare-chart-container" style="height:400px;width:100%"></div></div>';

    // Stats table
    const colors = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#06b6d4'];
    const legendColors = validTickers.map((t, i) => colors[i % colors.length]);
    chartHtml += `<div class="market-card mt-3"><div class="p-3"><h3 class="panel-title">Ringkasan Performa</h3></div><div style="overflow-x:auto"><table class="compare-table"><thead><tr><th>Metrik</th>${validTickers.map((t, i) => `<th style="color:${legendColors[i]}">${t}</th>`).join('')}</tr></thead><tbody>`;

    // Row helper
    function row(label, values) {
      return `<tr><td class="compare-label">${label}</td>${values.map((v, i) => `<td class="${v?.startsWith('+') ? 'text-up' : v?.startsWith('-') ? 'text-down' : ''}">${v || '—'}</td>`).join('')}</tr>`;
    }

    const funds = validTickers.map(t => d.fundamentals[t] || {});
    const stats = validTickers.map(t => d.stats[t] || {});

    chartHtml += row('Nama', funds.map(f => f.name || '—'));
    chartHtml += row('Sektor', funds.map(f => f.sector || '—'));
    chartHtml += row('Market Cap', funds.map(f => f.market_cap != null ? money(f.market_cap) : '—'));
    chartHtml += row('Harga', stats.map(s => s.current_price != null ? money(s.current_price) : '—'));
    chartHtml += row('Return 1B', stats.map(s => s.return_1m != null ? `${s.return_1m > 0 ? '+' : ''}${pf(s.return_1m)}` : '—'));
    chartHtml += row('Return 3B', stats.map(s => s.return_3m != null ? `${s.return_3m > 0 ? '+' : ''}${pf(s.return_3m)}` : '—'));
    chartHtml += row('Return Total', stats.map(s => s.return_total != null ? `${s.return_total > 0 ? '+' : ''}${pf(s.return_total)}` : '—'));
    chartHtml += row('High 90H', stats.map(s => s.high_90d != null ? money(s.high_90d) : '—'));
    chartHtml += row('Low 90H', stats.map(s => s.low_90d != null ? money(s.low_90d) : '—'));
    chartHtml += row('Rata Volume', stats.map(s => s.avg_volume != null ? nf(s.avg_volume, 0) : '—'));
    chartHtml += row('PE', funds.map(f => f.pe != null ? nf(f.pe, 2) : '—'));
    chartHtml += row('PBV', funds.map(f => f.pbv != null ? nf(f.pbv, 2) : '—'));
    chartHtml += row('ROE', funds.map(f => f.roe != null ? pf(f.roe) : '—'));
    chartHtml += row('DER', funds.map(f => f.der != null ? nf(f.der, 2) : '—'));
    chartHtml += row('Dividend Yield', funds.map(f => f.dividend_yield != null ? pf(f.dividend_yield) : '—'));

    chartHtml += '</tbody></table></div></div>';

    container.innerHTML = chartHtml;

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
