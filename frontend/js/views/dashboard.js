import { fetchNews } from '../api.js';
import { animateCards } from '../main.js';

export async function renderDashboard(root) {
    root.innerHTML = `
      <section class="grid grid-cols-12 reveal">
        <!-- Top Metrics -->
        <div class="span-3 card flex items-center justify-between">
          <div><div class="text-muted mb-2">IHSG INDEX</div><div class="mono strong" style="font-size:20px;">7,080.63</div></div>
          <div class="chip chip-up">+0.12%</div>
        </div>
        <div class="span-3 card flex items-center justify-between">
          <div><div class="text-muted mb-2">MARKET VOLUME</div><div class="mono strong" style="font-size:20px;">8.40T</div></div>
          <div class="chip">REGULAR</div>
        </div>
        <div class="span-3 card flex items-center justify-between">
          <div><div class="text-muted mb-2">ADVANCERS</div><div class="mono strong text-up" style="font-size:20px;">328</div></div>
          <div class="chip chip-up">BULLISH</div>
        </div>
        <div class="span-3 card flex items-center justify-between">
          <div><div class="text-muted mb-2">DECLINERS</div><div class="mono strong text-down" style="font-size:20px;">271</div></div>
          <div class="chip chip-down">BEARISH</div>
        </div>

        <!-- Main Chart & Sidebar Info -->
        <div class="span-8 card" style="min-height: 400px;">
          <div class="flex justify-between mb-4">
            <h3 class="strong">Market Performance</h3>
            <div class="flex gap-2">
              <button class="chip chip-up">1D</button>
              <button class="chip">1W</button>
              <button class="chip">1M</button>
            </div>
          </div>
          <div style="height:320px;"><canvas id="ihsgHeroChart"></canvas></div>
        </div>

        <div class="span-4 flex" style="flex-direction:column; gap:20px;">
          <div class="card" style="flex:1;">
            <h3 class="strong mb-4">Top Gainers</h3>
            <div class="stack-list">
              ${['GOTO','BRPT','BBCA','TLKM'].map((t,i)=>row(t,['96','1,200','9,800','3,420'][i],['+9.09','+5.20','+3.15','+2.50'][i])).join('')}
            </div>
          </div>
          <div class="card" style="flex:1;">
            <h3 class="strong mb-4">Market News</h3>
            <div id="news-container" class="stack-list">
              <div class="text-muted">Fetching latest insights...</div>
            </div>
          </div>
        </div>

        <!-- Heatmap / Bottom Grid -->
        <div class="span-12 card">
          <h3 class="strong mb-4">Sector Heatmap</h3>
          <div class="grid grid-cols-12">
            ${['Finance:+1.2','Tech:-2.4','Energy:+1.8','Consumer:+0.3','Property:-0.8','Basic:+0.5'].map(x=>heat(...x.split(':'))).join('')}
          </div>
        </div>
      </section>`;

    animateCards('.card');
    initDashboardCharts();
    loadNews();
}

const row = (ticker, price, change) => `
  <div class="stack-item">
    <div><div class="strong mono">${ticker}</div><div class="text-muted" style="font-size:11px;">IDX</div></div>
    <div style="text-align:right">
      <div class="mono">Rp ${price}</div>
      <div class="${change.startsWith('+') ? 'text-up' : 'text-down'} mono" style="font-size:11px;">${change}%</div>
    </div>
  </div>`;

const heat = (sector, change) => `
  <div class="span-2 card" style="background:var(--bg-elevated); padding:12px; border:none;">
    <div class="text-muted" style="font-size:11px;">${sector}</div>
    <div class="${change.startsWith('-') ? 'text-down' : 'text-up'} mono strong mt-2">${change}%</div>
  </div>`;

async function loadNews() {
    const container = document.getElementById('news-container');
    if (!container) return;
    const res = await fetchNews(3);
    if (!res?.data?.length) {
        container.innerHTML = `<div class="text-muted">No news available.</div>`;
        return;
    }
    container.innerHTML = res.data.map(n => `
      <div class="stack-item">
        <div style="width:100%">
          <div class="text-muted" style="font-size:10px;">${n.source}</div>
          <div class="strong" style="font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${n.title}</div>
        </div>
      </div>`).join('');
}

function initDashboardCharts() {
    const ctx = document.getElementById('ihsgHeroChart');
    if (ctx && typeof Chart !== 'undefined') {
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
            x: { grid: { display: false }, ticks: { color: '#475569' } }, 
            y: { position: 'right', grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#475569' } } 
          } 
        } 
      });
    }
}
