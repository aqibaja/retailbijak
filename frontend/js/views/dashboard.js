import { fetchNews, fetchMarketSummary } from '../api.js';
import { observeElements, animateValue } from '../main.js';

export async function renderDashboard(root) {
    // Determine if we have live data or fallback
    let isLive = true;
    try {
        const summary = await fetchMarketSummary();
        if (!summary || summary.status !== 'ok') isLive = false;
    } catch(e) {
        isLive = false;
    }

    root.innerHTML = `
      <section class="grid grid-cols-12 stagger-reveal">
        <!-- Main Chart Panel -->
        <div class="col-span-8 panel flex-col justify-between" style="min-height:480px; padding:0; overflow:hidden;">
          <div class="flex justify-between items-center p-4" style="border-bottom:1px solid var(--border-subtle);">
            <div class="flex items-center gap-3">
              <h2 class="text-lg strong">IHSG Composite</h2>
              ${isLive ? '<span class="badge badge-up">LIVE</span>' : '<span class="badge" style="background:rgba(245, 158, 11, 0.15); color:var(--warn-color); border-color:var(--warn-color);">DEMO DATA</span>'}
            </div>
            <div class="flex gap-2">
              <button class="btn btn-primary" style="padding:4px 8px; font-size:11px;">1D</button>
              <button class="btn" style="padding:4px 8px; font-size:11px;">1W</button>
              <button class="btn" style="padding:4px 8px; font-size:11px;">1M</button>
            </div>
          </div>
          
          <div class="p-4 flex gap-4" style="background:rgba(255,255,255,0.01); border-bottom:1px solid var(--border-subtle);">
            <div><div class="text-xs text-dim uppercase">Open</div><div class="mono strong mt-2">7,096.61</div></div>
            <div><div class="text-xs text-dim uppercase">High</div><div class="mono strong text-up mt-2">7,126.06</div></div>
            <div><div class="text-xs text-dim uppercase">Low</div><div class="mono strong text-down mt-2">7,063.99</div></div>
          </div>

          <div style="flex:1; padding:16px;">
            <canvas id="ihsgMainChart"></canvas>
          </div>
        </div>

        <!-- Sidebar Widgets -->
        <div class="col-span-4 flex-col gap-4">
          <!-- Market Breadth Widget -->
          <div class="panel flex-col">
            <h3 class="text-xs uppercase text-muted mb-4 strong">Market Breadth</h3>
            <div class="grid grid-cols-3 gap-2">
              <div class="text-center p-4" style="background:var(--bg-elevated); border-radius:var(--radius-sm); border:1px solid var(--border-subtle);">
                <div class="text-xs text-dim mb-2">ADV</div>
                <div class="mono strong text-up text-lg val-counter" data-val="328">0</div>
              </div>
              <div class="text-center p-4" style="background:var(--bg-elevated); border-radius:var(--radius-sm); border:1px solid var(--border-subtle);">
                <div class="text-xs text-dim mb-2">DECL</div>
                <div class="mono strong text-down text-lg val-counter" data-val="271">0</div>
              </div>
              <div class="text-center p-4" style="background:var(--bg-elevated); border-radius:var(--radius-sm); border:1px solid var(--border-subtle);">
                <div class="text-xs text-dim mb-2">UNC</div>
                <div class="mono strong text-lg val-counter" data-val="143">0</div>
              </div>
            </div>
            <div class="flex justify-between mt-4 text-xs text-dim">
              <span>Volume: <span class="mono strong text-main">8.4T</span></span>
              <span>Value: <span class="mono strong text-main">Rp 9.2T</span></span>
            </div>
          </div>

          <!-- Top Movers Widget -->
          <div class="panel flex-col" style="flex:1;">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-xs uppercase text-muted strong">Top Movers</h3>
              <a href="#market" class="text-xs text-primary">View All</a>
            </div>
            <div class="flex-col gap-2">
              ${['GOTO','BRPT','BBCA','TLKM'].map((t,i)=>row(t,['96','1,200','9,800','3,420'][i],['+9.09','+5.20','+3.15','+2.50'][i])).join('')}
            </div>
          </div>
        </div>

        <!-- News Widget -->
        <div class="col-span-12 panel stagger-reveal" style="margin-top:16px;">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-xs uppercase text-muted strong">Latest Intelligence</h3>
            <a href="#news" class="btn btn-icon"><i data-lucide="arrow-right"></i></a>
          </div>
          <div id="news-container" class="grid grid-cols-3 gap-4">
            <div class="skeleton skel-title"></div>
            <div class="skeleton skel-title"></div>
            <div class="skeleton skel-title"></div>
          </div>
        </div>
      </section>`;

    observeElements();
    initChart();
    loadNews();
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
    
    // Animate counters
    setTimeout(() => {
        document.querySelectorAll('.val-counter').forEach(el => {
            animateValue(el, 0, parseInt(el.getAttribute('data-val')), 1000);
        });
    }, 200);
}


const row = (ticker, price, change) => `
  <a href="#stock/${ticker}" class="flex items-center justify-between p-4" style="background:var(--bg-elevated); border:1px solid var(--border-subtle); border-radius:var(--radius-sm); transition:background 0.2s;">
    <div class="flex items-center gap-3">
      <div style="width:32px; height:32px; background:var(--bg-base); border-radius:var(--radius-sm); display:grid; place-items:center; font-size:10px; font-weight:800; color:var(--text-muted); border:1px solid var(--border-strong);">${ticker[0]}</div>
      <div><div class="mono strong">${ticker}</div><div class="text-xs text-dim">EQ</div></div>
    </div>
    <div style="text-align:right">
      <div class="mono strong">${price}</div>
      <div class="${change.startsWith('+') ? 'text-up' : 'text-down'} mono text-xs strong">${change}%</div>
    </div>
  </a>`;

async function loadNews() {
    const container = document.getElementById('news-container');
    if (!container) return;
    const res = await fetchNews(3);
    
    // Fallback if API fails or empty
    let items = res?.data?.length ? res.data : [
        { source: 'CNBC Indonesia', title: 'Rusia Atur Cadangan Valas Perbankan Wajib Pakai Yuan', link: '#', image_url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80' },
        { source: 'Bloomberg', title: 'Foreign Funds Flow Into Indonesian Banks as Rates Peak', link: '#', image_url: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=800&q=80' },
        { source: 'Reuters', title: 'Commodity Supercycle Propels IDX Energy Sector', link: '#', image_url: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?auto=format&fit=crop&w=800&q=80' }
    ];

    container.innerHTML = items.slice(0,3).map(n => {
        const imageUrl = n.image_url || 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80';
        const imageElement = `<img src="${imageUrl}" alt="News thumbnail" loading="lazy" onerror="this.style.display='none'; this.parentElement.querySelector('.news-image-fallback').style.display='flex';">
               <div class="news-image-overlay"></div>
               <div class="news-image-fallback">📰</div>`;

        return `
            <a href="${n.link}" target="_blank" class="news-card" style="opacity:1; transform:none; transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); border-color:var(--border-subtle);">
                <div class="news-image-wrap" style="height:120px;">
                    ${imageElement}
                </div>
                <div class="news-content" style="padding:12px;">
                    <span class="news-badge" style="font-size:10px; padding:2px 6px; margin-bottom:8px;">${n.source || 'MARKET'}</span>
                    <h3 class="news-title" style="font-size:13px;">${n.title}</h3>
                </div>
            </a>`;
    }).join('');
}

function initChart() {
    const ctx = document.getElementById('ihsgMainChart');
    if (ctx && typeof Chart !== 'undefined') {
      const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 300);
      gradient.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
      gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');

      new Chart(ctx, { 
        type: 'line', 
        data: { 
          labels: ['09:00','10:00','11:00','13:00','14:00','15:00','16:00'], 
          datasets: [{ 
            data: [7060, 7075, 7070, 7085, 7080, 7095, 7080.63], 
            borderColor: '#10b981', 
            backgroundColor: gradient,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#10b981',
            fill: true, tension: 0.4
          }] 
        }, 
        options: { 
          responsive: true, maintainAspectRatio: false, 
          interaction: { intersect: false, mode: 'index' },
          plugins: { 
              legend: { display: false },
              tooltip: { 
                  backgroundColor: 'rgba(22, 27, 34, 0.9)', 
                  titleFont: { family: "'JetBrains Mono', monospace", size: 11 },
                  bodyFont: { family: "'JetBrains Mono', monospace", size: 13, weight: 'bold' },
                  padding: 12, cornerRadius: 4, displayColors: false
              }
          }, 
          scales: { 
            x: { grid: { display: false }, ticks: { color: '#6e7681', font: { size: 10 } } }, 
            y: { position: 'right', grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6e7681', font: { size: 10, family: "'JetBrains Mono', monospace" } } } 
          } 
        } 
      });
    }
}
