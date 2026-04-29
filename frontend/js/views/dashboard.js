import { fetchNews } from '../api.js';
import { animateCards } from '../main.js';

export async function renderDashboard(root) {
    root.innerHTML = `
      <section class="reveal">
        <div class="flex justify-between items-center mb-6">
          <div>
            <h1 style="font-size: 24px; font-weight: 700;">Market Pulse</h1>
            <p style="color: var(--text-muted); font-size: 14px;">Real-time overview of the Indonesian Stock Exchange</p>
          </div>
          <div class="flex gap-2">
            <div class="card" style="padding: 8px 16px; display:flex; align-items:center; gap:8px;">
              <span style="width:8px; height:8px; background:var(--primary); border-radius:50%; box-shadow: 0 0 10px var(--primary);"></span>
              <span class="mono strong" style="font-size:12px;">MARKET LIVE</span>
            </div>
          </div>
        </div>

        <!-- Top Metrics Row -->
        <div class="grid grid-cols-12 mb-6">
          <div class="span-3 card">
            <div style="color: var(--text-muted); font-size: 11px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">IHSG Index</div>
            <div class="flex items-center gap-4 mt-2">
              <div class="mono strong" style="font-size:24px;">7,080.63</div>
              <div style="color: var(--primary); font-weight:700; font-size:12px;">+0.12%</div>
            </div>
          </div>
          <div class="span-3 card">
            <div style="color: var(--text-muted); font-size: 11px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Advancers</div>
            <div class="mono strong mt-2" style="font-size:24px; color: var(--primary);">328</div>
          </div>
          <div class="span-3 card">
            <div style="color: var(--text-muted); font-size: 11px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Decliners</div>
            <div class="mono strong mt-2" style="font-size:24px; color: var(--danger);">271</div>
          </div>
          <div class="span-3 card">
            <div style="color: var(--text-muted); font-size: 11px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Turnover</div>
            <div class="mono strong mt-2" style="font-size:24px;">8.40T</div>
          </div>
        </div>

        <div class="grid grid-cols-12">
          <!-- Main Chart -->
          <div class="span-8 card" style="display:flex; flex-direction:column; padding: 0; overflow:hidden;">
            <div class="flex justify-between items-center" style="padding: 20px 24px; border-bottom: 1px solid var(--border);">
              <h3 class="strong">Performance</h3>
              <div class="flex gap-2">
                <button class="btn" style="padding: 4px 12px; font-size:11px; background: rgba(16, 185, 129, 0.1); border-color: var(--primary); color: var(--primary);">1D</button>
                <button class="btn" style="padding: 4px 12px; font-size:11px;">1W</button>
                <button class="btn" style="padding: 4px 12px; font-size:11px;">1M</button>
              </div>
            </div>
            <div style="padding: 24px; flex:1; min-height:350px;">
              <canvas id="ihsgHeroChart"></canvas>
            </div>
          </div>

          <!-- Sidebar Widgets -->
          <div class="span-4 flex" style="flex-direction:column; gap:24px;">
            <div class="card">
              <h3 class="strong mb-4">Top Gainers</h3>
              <div style="display:flex; flex-direction:column; gap:16px;">
                ${['GOTO','BRPT','BBCA','TLKM'].map((t,i)=>row(t,['96','1,200','9,800','3,420'][i],['+9.09','+5.20','+3.15','+2.50'][i])).join('')}
              </div>
            </div>
            
            <div class="card" style="flex:1;">
              <h3 class="strong mb-4">Market News</h3>
              <div id="news-container" style="display:flex; flex-direction:column; gap:16px;">
                <div style="color: var(--text-muted); font-size:13px;">Streaming intelligence...</div>
              </div>
            </div>
          </div>
        </div>
      </section>`;

    animateCards('.card');
    initCharts();
    loadNews();
}

const row = (ticker, price, change) => `
  <div style="display:flex; align-items:center; justify-content:space-between;">
    <div class="flex items-center gap-3">
      <div style="width:32px; height:32px; background:rgba(255,255,255,0.03); border-radius:8px; display:grid; place-items:center; font-size:10px; font-weight:800; border:1px solid var(--border);">${ticker[0]}</div>
      <div>
        <div class="mono strong" style="font-size:13px;">${ticker}</div>
        <div style="color: var(--text-muted); font-size:10px;">BEI</div>
      </div>
    </div>
    <div style="text-align:right">
      <div class="mono strong" style="font-size:13px;">${price}</div>
      <div style="color: var(--primary); font-size:11px; font-weight:700;">${change}%</div>
    </div>
  </div>`;

async function loadNews() {
    const container = document.getElementById('news-container');
    if (!container) return;
    const res = await fetchNews(3);
    if (!res?.data?.length) return;
    container.innerHTML = res.data.map(n => `
      <div style="padding-bottom:12px; border-bottom:1px solid var(--border);">
        <div style="color:var(--text-muted); font-size:10px; margin-bottom:4px;">${n.source}</div>
        <div class="strong" style="font-size:12px; line-height:1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${n.title}</div>
      </div>`).join('');
}

function initCharts() {
    const ctx = document.getElementById('ihsgHeroChart');
    if (ctx && typeof Chart !== 'undefined') {
      new Chart(ctx, { 
        type: 'line', 
        data: { 
          labels: ['10:00','11:00','12:00','13:00','14:00','15:00','16:00'], 
          datasets: [{ 
            data: [7060, 7075, 7070, 7085, 7080, 7095, 7080.63], 
            borderColor: '#10b981', 
            backgroundColor: 'rgba(16, 185, 129, 0.05)', 
            fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#10b981', borderWidth: 2 
          }] 
        }, 
        options: { 
          responsive: true, maintainAspectRatio: false, 
          plugins: { legend: { display: false } }, 
          scales: { 
            x: { grid: { display: false }, ticks: { color: '#475569', font: { size: 10 } } }, 
            y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#475569', font: { size: 10 } } } 
          } 
        } 
      });
    }
}
