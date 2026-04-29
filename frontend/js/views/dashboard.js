import { fetchNews } from '../api.js';
import { animateCards, animateCountUp, animateSparklines } from '../main.js';

export async function renderDashboard(root) {
    root.innerHTML = `
      <section class="dashboard-shell reveal">
        <div class="card mobile-discover-hero">
          <div class="flex-between mb-3">
            <div class="chip neutral">Discover</div>
            <div class="chip success">IHSG +0.12%</div>
          </div>
          <h1>Discover market opportunities faster.</h1>
          <p>Cari kode saham, baca chart intraday, dan pantau movers tanpa keluar dari satu layar.</p>
          <div class="mobile-searchbar">
            <i data-lucide="search"></i>
            <input type="text" placeholder="Search by CODE or NAME" aria-label="Search by CODE or NAME">
          </div>
          <div class="mobile-segmented" role="tablist" aria-label="Market view">
            <button class="active">Stock</button>
            <button>Fund</button>
          </div>
        </div>

        <div class="card mobile-chart-hero">
          <div class="flex-between mb-2">
            <div>
              <div class="text-muted" style="font-size:12px;">IHSG</div>
              <div class="kpi-value" style="margin:4px 0 0; font-size:32px;">7,080.63</div>
            </div>
            <div style="text-align:right;">
              <div class="chip success">▲ 8.24</div>
              <div class="text-muted" style="margin-top:6px; font-size:12px;">+0.12%</div>
            </div>
          </div>
          <div class="chart-badge-row">
            ${['1D','1W','1M','3M','1Y','3Y'].map((x,i)=>`<button class="time-chip ${i===0?'active':''}">${x}</button>`).join('')}
          </div>
          <div style="height:240px; margin-top:10px;"><canvas id="ihsgChart"></canvas></div>
          <div class="intraday-strip">
            <div><span>Open</span><strong>7,096.61</strong></div>
            <div><span>High</span><strong class="positive">7,126.06</strong></div>
            <div><span>Low</span><strong class="negative">7,063.99</strong></div>
          </div>
        </div>

        <div class="kpi-row kpi-row-mobile-first">
          ${kpi('IHSG', 7080.63, '+0.12')}
          ${kpi('LQ45', 1043.18, '-0.18')}
          ${kpi('IDX30', 512.76, '+0.65')}
          ${kpi('KOMPAS100', 1189.33, '+0.21')}
        </div>

        <div class="card mobile-summary-card">
          <div class="flex-between mb-3"><h2 class="mb-0">Market Snapshot</h2><span class="chip neutral">Today</span></div>
          <div class="summary-scroll">
            ${['All Market','Regular','Nego'].map((name,i)=>`<div class="summary-card"><div class="summary-title">${name}</div><div class="summary-grid"><div><span>Value</span><strong>${['8.40T','8.06T','346B'][i]}</strong></div><div><span>Lot</span><strong>${['26.88B','26.51B','365M'][i]}</strong></div><div><span>Freq</span><strong>${['1.47M','1.47M','72K'][i]}</strong></div></div></div>`).join('')}
          </div>
          <div class="expand-row">Show Foreign Activity <i data-lucide="chevron-down"></i></div>
        </div>

        <div class="split-row">
          <div class="card">
            <div class="flex-between mb-3"><h2 class="mb-0">Market Pulse</h2><span class="chip neutral">1D</span></div>
            <div style="height:280px"><canvas id="ihsgChart"></canvas></div>
          </div>
          <div class="card">
            <div class="flex-between mb-3"><h2 class="mb-0">Top Gainers</h2><a href="#market" class="chip neutral">See all</a></div>
            <div class="stack-list">${['GOTO','BRPT','BBCA','TLKM','ASII','ANTM'].map((t,i)=>row(t,['GoTo Gojek Tokopedia','Barito Pacific','Bank Central Asia','Telkom Indonesia','Astra International','Aneka Tambang'][i],['96','1,200','9,800','3,420','5,300','1,920'][i],['+9.09','+5.20','+3.15','+2.50','+1.92','+1.50'][i])).join('')}</div>
          </div>
        </div>

        <div class="three-col-row">
          <div class="card">
            <div class="flex-between mb-3"><h2 class="mb-0">Watchlist</h2><a href="#watchlist" class="chip neutral">Manage</a></div>
            ${['BBRI','UNVR','PGAS','BUMI'].map((t,i)=>watch(t,['4,850','2,900','1,350','120'][i],['-1.20','+0.50','+2.10','-3.50'][i], [false,true,true,false][i])).join('')}
          </div>
          <div class="card">
            <h2 class="mb-3">Portfolio Summary</h2>
            <div class="hero-metrics" style="grid-template-columns: 1fr;">
              <div class="hero-metric"><div class="label">Total Value</div><div class="value">Rp 145.2M</div><div class="sub positive">+ Rp 2.4M (1.68%) today</div></div>
              <div style="height:160px"><canvas id="portfolioDonut"></canvas></div>
            </div>
          </div>
          <div class="card">
            <div class="flex-between mb-3"><h2 class="mb-0">Market News</h2><a href="#news" class="chip neutral">All news</a></div>
            <div id="news-container" class="stack-list">
              <div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text"></div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="flex-between mb-3"><h2 class="mb-0">Sector Heatmap</h2><span class="chip neutral">Relative strength</span></div>
          <div class="heatmap-grid">${['Finance:+1.2','Tech:-2.4','Consumer:+0.3','Property:-0.8','Energy:+1.8'].map(x=>heat(...x.split(':'))).join('')}</div>
        </div>
      </section>`;

    lucide.createIcons();
    animateCards('.card');
    animateSparklines();
    document.querySelectorAll('[data-countup]').forEach(el => animateCountUp(el, parseFloat(el.dataset.countup), el.dataset.prefix || '', el.dataset.suffix || ''));
    initDashboardCharts();
    loadNews();
}

const metric = (label, value, sub) => `<div class="hero-metric"><div class="label">${label}</div><div class="value">${value}</div><div class="sub">${sub}</div></div>`;
const kpi = (title, val, change) => `<div class="card kpi-card"><div class="kpi-title">${title}</div><div class="kpi-value" data-countup="${val}">0</div><div class="kpi-change ${String(change).startsWith('-') ? 'danger' : 'success'}">${String(change).startsWith('-') ? '▼' : '▲'} ${change}%</div><svg class="kpi-sparkline" viewBox="0 0 60 30"><path class="sparkline-path" d="M0,18 Q10,10 20,14 T40,8 T60,5" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round"/></svg></div>`;
const row = (ticker, name, price, change) => `<a class="stack-item" href="#stock/${ticker}"><div><div class="stack-title mono">${ticker}</div><div class="stack-sub">${name}</div></div><div class="stack-right"><div class="mono">Rp ${price}</div><div class="chip ${change.startsWith('+') ? 'success' : 'danger'}">${change}%</div></div></a>`;
const watch = (ticker, price, change, pos) => `<a class="stack-item" href="#stock/${ticker}"><div><div class="stack-title mono">${ticker}</div><div class="stack-sub">Watchlist</div></div><div class="stack-right"><div class="mono">${price}</div><div class="mono ${pos ? 'positive' : 'negative'}">${change}%</div></div></a>`;
const heat = (sector, change) => `<div class="heatmap-tile ${change.startsWith('-') ? 'neg' : 'pos'}"><div>${sector}</div><strong>${change}%</strong></div>`;

async function loadNews() {
    const container = document.getElementById('news-container');
    if (!container) return;
    const res = await fetchNews(5);
    if (!res || !res.data?.length) { container.innerHTML = '<p class="muted">No recent news.</p>'; return; }
    container.innerHTML = res.data.map(n => `<a class="news-item" href="${n.link}" target="_blank" rel="noopener"><div class="news-meta">${n.source}${n.published_at ? ' • ' + new Date(n.published_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ''}</div><div class="news-title">${n.title}</div></a>`).join('');
}

function initDashboardCharts() {
    if (typeof Chart === 'undefined') return;
    const dark = document.documentElement.getAttribute('data-theme') !== 'light';
    const ctx = document.getElementById('ihsgChart');
    if (!ctx) return;
    new Chart(ctx, { type: 'line', data: { labels: ['10:00','11:00','13:00','14:00','15:00','16:00'], datasets: [{ data: [7250,7265,7240,7270,7280,7284.52], borderColor: dark ? '#7ce6a0' : '#0f9d58', backgroundColor: dark ? 'rgba(124,230,160,0.10)' : 'rgba(15,157,88,0.08)', fill: true, tension: 0.35, pointRadius: 0, borderWidth: 2 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: 'transparent' }, ticks: { color: dark ? '#93b8a1' : '#5c6d62' } }, y: { grid: { color: dark ? 'rgba(124,230,160,0.08)' : 'rgba(15,23,18,0.06)' }, ticks: { color: dark ? '#93b8a1' : '#5c6d62' } } } } });
    const donut = document.getElementById('portfolioDonut');
    if (donut) new Chart(donut, { type: 'doughnut', data: { labels:['Core','Opportunistic','Cash'], datasets:[{ data:[56,29,15], backgroundColor:[dark ? '#7ce6a0' : '#0f9d58', '#3b82f6', dark ? '#1f2937' : '#d1d5db'], borderWidth:0 }] }, options:{ plugins:{ legend:{ position:'bottom', labels:{ color: dark ? '#eaf7ef' : '#0f1720' } } }, cutout:'72%' } });
}
