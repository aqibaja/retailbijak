import { fetchNews, fetchMarketSummary } from '../api.js';
import { observeElements, animateValue } from '../main.js';

export async function renderDashboard(root) {
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
        <div class="col-span-8 panel flex-col justify-between" style="padding:0; overflow:hidden;">
          <div class="flex justify-between items-center p-4" style="border-bottom:1px solid var(--border-subtle);">
            <div class="flex items-center gap-3">
              <h2 class="text-lg strong text-main">IHSG Composite</h2>
              ${isLive ? '<span class="badge badge-up">LIVE</span>' : '<span class="badge" style="background:rgba(245, 158, 11, 0.15); color:var(--warn-color); border-color:var(--warn-color);">DEMO DATA</span>'}
            </div>
            <div class="flex gap-2">
              <button class="btn btn-primary" style="padding:4px 8px; font-size:11px; height:24px; box-shadow:none;">1D</button>
              <button class="btn" style="padding:4px 8px; font-size:11px; height:24px;">1W</button>
              <button class="btn" style="padding:4px 8px; font-size:11px; height:24px;">1M</button>
            </div>
          </div>
          
          <div class="p-4 flex gap-6" style="background:var(--bg-elevated); border-bottom:1px solid var(--border-subtle);">
            <div><div class="text-xs text-dim uppercase strong" style="letter-spacing:0.05em">Open</div><div class="mono strong mt-1" style="font-size:16px;">7,096.61</div></div>
            <div><div class="text-xs text-dim uppercase strong" style="letter-spacing:0.05em">High</div><div class="mono strong text-up mt-1" style="font-size:16px;">7,126.06</div></div>
            <div><div class="text-xs text-dim uppercase strong" style="letter-spacing:0.05em">Low</div><div class="mono strong text-down mt-1" style="font-size:16px;">7,063.99</div></div>
          </div>

          <div style="flex:1; padding:16px; min-height: 300px;">
            <canvas id="ihsgMainChart"></canvas>
          </div>
        </div>

        <!-- Sidebar Widgets -->
        <div class="col-span-4 flex-col gap-4">
          <!-- Market Breadth Widget -->
          <div class="panel flex-col">
            <h3 class="text-xs uppercase text-dim mb-4 strong" style="letter-spacing:0.08em;">Market Breadth</h3>
            <div class="grid grid-cols-3 gap-2">
              <div class="text-center p-4" style="background:var(--bg-elevated); border-radius:var(--radius-md); border:1px solid var(--border-subtle); box-shadow:inset 0 1px 0 rgba(255,255,255,0.02);">
                <div class="text-xs text-dim mb-1 strong">ADV</div>
                <div class="mono strong text-up text-lg val-counter" data-val="328">0</div>
              </div>
              <div class="text-center p-4" style="background:var(--bg-elevated); border-radius:var(--radius-md); border:1px solid var(--border-subtle); box-shadow:inset 0 1px 0 rgba(255,255,255,0.02);">
                <div class="text-xs text-dim mb-1 strong">DECL</div>
                <div class="mono strong text-down text-lg val-counter" data-val="271">0</div>
              </div>
              <div class="text-center p-4" style="background:var(--bg-elevated); border-radius:var(--radius-md); border:1px solid var(--border-subtle); box-shadow:inset 0 1px 0 rgba(255,255,255,0.02);">
                <div class="text-xs text-dim mb-1 strong">UNC</div>
                <div class="mono strong text-lg val-counter text-main" data-val="143">0</div>
              </div>
            </div>
            <div class="flex justify-between mt-4 text-xs text-dim strong">
              <span>Volume: <span class="mono text-main">8.4T</span></span>
              <span>Value: <span class="mono text-main">Rp 9.2T</span></span>
            </div>
          </div>

          <!-- Top Movers Widget -->
          <div class="panel flex-col" style="flex:1;">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-xs uppercase text-dim strong" style="letter-spacing:0.08em;">Top Movers</h3>
              <a href="#market" class="text-xs text-primary strong hover:underline">View All</a>
            </div>
            <div class="flex-col gap-2">
              ${['GOTO','BRPT','BBCA','TLKM'].map((t,i)=>row(t,['96','1,200','9,800','3,420'][i],['+9.09','+5.20','+3.15','+2.50'][i])).join('')}
            </div>
          </div>
        </div>

        <!-- News Widget -->
        <div class="col-span-12 panel stagger-reveal" style="margin-top:8px;">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-xs uppercase text-dim strong" style="letter-spacing:0.08em;">Latest Intelligence</h3>
            <a href="#news" class="btn btn-icon"><i data-lucide="arrow-right"></i></a>
          </div>
          <div id="news-container" class="news-grid">
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
  <a href="#stock/${ticker}" class="flex items-center justify-between p-3" style="background:transparent; border:1px solid transparent; border-bottom: 1px solid var(--border-subtle); border-radius:0; transition:background 0.2s;">
    <div class="flex items-center gap-3">
      <div style="width:32px; height:32px; background:rgba(99,102,241,0.1); border-radius:8px; display:grid; place-items:center; font-size:10px; font-weight:800; color:#a5b4fc; border:1px solid rgba(99,102,241,0.2);">${ticker.substring(0,2)}</div>
      <div><div class="mono strong text-main">${ticker}</div><div class="text-xs text-dim strong">EQ</div></div>
    </div>
    <div style="text-align:right">
      <div class="mono strong text-main">${price}</div>
      <div class="${change.startsWith('+') ? 'text-up' : 'text-down'} mono text-xs strong">${change}%</div>
    </div>
  </a>`;

async function loadNews() {
    const container = document.getElementById('news-container');
    if (!container) return;
    const res = await fetchNews(3);
    
    let items = (res && Array.isArray(res.data) && res.data.length > 0) ? res.data : [];

    if (items.length === 0) {
        container.innerHTML = `<div class="text-dim text-sm">No news available.</div>`;
        return;
    }

    container.innerHTML = items.map(n => {
        // Extract image from summary if missing
        let imageUrl = n.image_url || '';
        if (!imageUrl && n.summary && n.summary.includes('<img')) {
            const match = n.summary.match(/src="([^"]+)"/);
            if (match) imageUrl = match[1];
        }

        const imageElement = imageUrl 
            ? `<img src="${imageUrl}" alt="News thumbnail" loading="lazy" style="width:100%; height:100%; object-fit:cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` 
            : '';

        return `
            <a href="${n.link}" target="_blank" class="news-card" style="border-radius:12px; background:var(--bg-elevated); border:1px solid var(--border-subtle); display:flex; flex-direction:column;">
                <div class="news-image-wrap" style="height:140px; display:flex; align-items:center; justify-content:center; background:rgba(99,102,241,0.05);">
                    ${imageUrl ? imageElement : '<i data-lucide="newspaper" style="width:40px; color:rgba(99,102,241,0.4);"></i>'}
                    <div class="news-image-fallback" style="${imageUrl ? 'display:none;' : 'display:flex;'} align-items:center; justify-content:center; height:100%; width:100%;">
                       <i data-lucide="newspaper" style="width:40px; color:rgba(99,102,241,0.4);"></i>
                    </div>
                </div>
                <div class="news-content" style="padding:16px; flex:1;">
                    <span class="news-badge" style="background:rgba(99,102,241,0.1); color:#a5b4fc; font-size:10px; font-weight:700; padding:3px 8px; border-radius:4px; margin-bottom:8px; display:inline-block;">${n.source || 'MARKET'}</span>
                    <h3 class="news-title" style="font-size:14px; font-weight:600; color:var(--text-main); line-height:1.4;">${n.title}</h3>
                </div>
            </a>`;
    }).join('');
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function initChart() {
    const ctx = document.getElementById('ihsgMainChart');
    if (ctx && typeof Chart !== 'undefined') {
      const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 300);
      gradient.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
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
                  backgroundColor: 'rgba(15, 23, 41, 0.95)', 
                  titleFont: { family: "'JetBrains Mono', monospace", size: 11 },
                  bodyFont: { family: "'JetBrains Mono', monospace", size: 13, weight: 'bold' },
                  padding: 12, cornerRadius: 8, displayColors: false,
                  borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1
              }
          }, 
          scales: { 
            x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10, weight: '600' } } }, 
            y: { position: 'right', grid: { color: 'rgba(255,255,255,0.02)' }, ticks: { color: '#64748b', font: { size: 11, family: "'JetBrains Mono', monospace", weight: '600' } } } 
          } 
        } 
      });
    }
}
