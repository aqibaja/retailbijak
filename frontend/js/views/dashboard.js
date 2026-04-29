import { fetchNews } from '../api.js';
import { animateCards, animateCountUp, animateSparklines } from '../main.js';

export async function renderDashboard(root) {
    root.innerHTML = `
      <section class="dashboard-shell reveal">
        <div class="grid grid-2-1">
          <div class="card">
            <div class="chip mb-2">Market Pulse</div>
            <h1 class="mb-2">Selamat datang kembali.</h1>
            <p class="muted mb-4">IHSG bergerak konsolidasi hari ini. Pantau watchlist Anda untuk peluang breakout di sektor perbankan dan energi.</p>
            
            <div class="grid grid-3 mt-4">
              ${metric('IHSG', '7,080.63', '<span class="positive">+0.12%</span>')}
              ${metric('Advance', '328', 'Market Breadth')}
              ${metric('Volume', '8.40T', 'Reg Session')}
            </div>

            <div class="hero-actions mt-4">
              <a href="#screener" class="btn btn-primary">Run Screener</a>
              <a href="#market" class="btn btn-outline">Market Overview</a>
            </div>
          </div>

          <div class="card">
            <div class="flex-between mb-4">
              <h3 class="mb-0">IHSG Intraday</h3>
              <div class="chip success">Live</div>
            </div>
            <div style="height:200px;"><canvas id="ihsgHeroChart"></canvas></div>
            <div class="grid grid-3 mt-4">
              <div><span class="muted" style="font-size:10px; text-transform:uppercase;">Open</span><div class="mono strong">7,096</div></div>
              <div><span class="muted" style="font-size:10px; text-transform:uppercase;">High</span><div class="mono strong positive">7,126</div></div>
              <div><span class="muted" style="font-size:10px; text-transform:uppercase;">Low</span><div class="mono strong negative">7,063</div></div>
            </div>
          </div>
        </div>

        <div class="grid grid-2">
          <div class="card">
            <div class="flex-between mb-4">
              <h2 class="mb-0">Top Gainers</h2>
              <a href="#market" class="chip">See all</a>
            </div>
            <div class="stack-list">
              ${['GOTO','BRPT','BBCA','TLKM','ASII'].map((t,i)=>row(t,['GoTo','Barito','BCA','Telkom','Astra'][i],['96','1,200','9,800','3,420','5,300'][i],['+9.09','+5.20','+3.15','+2.50','+1.92'][i])).join('')}
            </div>
          </div>

          <div class="card">
            <div class="flex-between mb-4">
              <h2 class="mb-0">Latest News</h2>
              <a href="#news" class="chip">All news</a>
            </div>
            <div id="news-container" class="stack-list">
              <div class="skeleton skeleton-text"></div>
              <div class="skeleton skeleton-text"></div>
              <div class="skeleton skeleton-text"></div>
            </div>
          </div>
        </div>

        <div class="grid grid-3">
          <div class="card">
             <div class="flex-between mb-4">
              <h2 class="mb-0">Watchlist</h2>
              <a href="#watchlist" class="chip">Manage</a>
            </div>
            <div class="stack-list">
               ${['BBRI','UNVR','PGAS'].map((t,i)=>watch(t,['4,850','2,900','1,350'][i],['-1.20','+0.50','+2.10'][i], [false,true,true][i])).join('')}
            </div>
          </div>
          <div class="card" style="grid-column: span 2;">
            <div class="flex-between mb-4">
              <h2 class="mb-0">Sector Heatmap</h2>
              <span class="muted">Relative strength (1D)</span>
            </div>
            <div class="grid grid-3">
              ${['Finance:+1.2','Tech:-2.4','Energy:+1.8','Consumer:+0.3','Property:-0.8','Basic:+0.5'].map(x=>heat(...x.split(':'))).join('')}
            </div>
          </div>
        </div>
      </section>`;

    lucide.createIcons();
    animateCards('.card');
    initDashboardCharts();
    loadNews();
}

const metric = (label, value, sub) => `
  <div class="hero-metric">
    <div class="label">${label}</div>
    <div class="value">${value}</div>
    <div class="muted" style="font-size: 11px; margin-top:2px;">${sub}</div>
  </div>`;

const row = (ticker, name, price, change) => `
  <a class="stack-item" href="#stock/${ticker}">
    <div>
      <div class="stack-title mono">${ticker}</div>
      <div class="stack-sub">${name}</div>
    </div>
    <div style="text-align:right">
      <div class="mono strong">Rp ${price}</div>
      <div class="positive" style="font-size:12px; font-weight:600;">${change}%</div>
    </div>
  </a>`;

const watch = (ticker, price, change, pos) => `
  <a class="stack-item" href="#stock/${ticker}">
    <div>
      <div class="stack-title mono">${ticker}</div>
    </div>
    <div style="text-align:right">
      <div class="mono strong">${price}</div>
      <div class="${pos ? 'positive' : 'negative'}" style="font-size:12px; font-weight:600;">${change}%</div>
    </div>
  </a>`;

const heat = (sector, change) => `
  <div class="card" style="padding: 12px; background: var(--surface-elevated); border-radius: var(--radius-md);">
    <div class="muted" style="font-size: 11px; text-transform:uppercase; font-weight:700;">${sector}</div>
    <div class="${change.startsWith('-') ? 'negative' : 'positive'} mono strong mt-2" style="font-size:16px;">${change}%</div>
  </div>`;

async function loadNews() {
    const container = document.getElementById('news-container');
    if (!container) return;
    const res = await fetchNews(5);
    if (!res || !res.data?.length) {
        container.innerHTML = `<p class="muted">Belum ada berita baru.</p>`;
        return;
    }
    container.innerHTML = res.data.map(n => `
      <a class="stack-item" href="${n.link}" target="_blank" rel="noopener">
        <div>
          <div class="stack-sub">${n.source}</div>
          <div style="font-weight:600; font-size:14px; margin-top:2px; line-height:1.4;">${n.title}</div>
        </div>
      </a>`).join('');
}

function initDashboardCharts() {
    if (typeof Chart === 'undefined') return;
    const dark = document.documentElement.getAttribute('data-theme') !== 'light';
    const ctx = document.getElementById('ihsgHeroChart');
    if (ctx) {
      new Chart(ctx, { 
        type: 'line', 
        data: { 
          labels: ['10:00','11:00','13:00','14:00','15:00','16:00'], 
          datasets: [{ 
            data: [7250,7265,7240,7270,7280,7284], 
            borderColor: '#10b981', 
            backgroundColor: 'rgba(16,185,129,0.05)', 
            fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2 
          }] 
        }, 
        options: { 
          responsive: true, maintainAspectRatio: false, 
          plugins: { legend: { display: false } }, 
          scales: { 
            x: { display: false }, 
            y: { display: false } 
          } 
        } 
      });
    }
}
