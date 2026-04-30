import { fetchNews, fetchMarketSummary } from '../api.js?v=20260430e';
import { observeElements, animateValue } from '../main.js?v=20260430e';

export async function renderDashboard(root) {
    root.innerHTML = `
      <section class="grid grid-cols-12 stagger-reveal dashboard-shell">
        <div class="col-span-12 panel dashboard-hero flex-col gap-4" style="padding:16px; overflow:hidden;">
          <div class="flex justify-between items-center gap-3 dashboard-hero-head">
            <div class="flex items-center gap-3">
              <div class="hero-mark">IDX</div>
              <div>
                <h2 class="text-lg strong text-main" style="margin-bottom:2px;">IHSG Composite</h2>
                <div class="text-xs text-dim strong" id="market-fold-status">Loading live snapshot...</div>
              </div>
            </div>
            <span id="market-fold-badge" class="badge">SYNC</span>
          </div>

          <div class="dashboard-price-row">
            <div>
              <div class="text-xs text-dim uppercase strong" style="letter-spacing:0.05em">IHSG</div>
              <div class="mono strong" id="ihsg-value" style="font-size:28px; line-height:1;">---</div>
            </div>
            <div class="text-right">
              <div class="text-xs text-dim uppercase strong" style="letter-spacing:0.05em">Change</div>
              <div class="mono strong" id="ihsg-change" style="font-size:18px;">---</div>
            </div>
          </div>

          <div class="dashboard-metrics">
            <div><span class="text-dim">Open</span><strong class="mono" id="ihsg-open">---</strong></div>
            <div><span class="text-dim">High</span><strong class="mono text-up" id="ihsg-high">---</strong></div>
            <div><span class="text-dim">Low</span><strong class="mono text-down" id="ihsg-low">---</strong></div>
          </div>

          <div class="dashboard-chip-row">
            <button class="btn btn-primary btn-mini">1D</button>
            <button class="btn btn-mini">1W</button>
            <button class="btn btn-mini">1M</button>
            <a href="#screener" class="btn btn-mini">Scanner</a>
          </div>

          <div class="dashboard-chart-wrap">
            <canvas id="ihsgMainChart"></canvas>
          </div>
        </div>

        <div class="col-span-12 panel dashboard-compact-grid">
          <div class="dashboard-card-lite">
            <div class="text-xs text-dim strong">ADV</div>
            <div class="mono strong text-up text-lg val-counter" data-val="328">328</div>
          </div>
          <div class="dashboard-card-lite">
            <div class="text-xs text-dim strong">DECL</div>
            <div class="mono strong text-down text-lg val-counter" data-val="271">271</div>
          </div>
          <div class="dashboard-card-lite">
            <div class="text-xs text-dim strong">UNC</div>
            <div class="mono strong text-lg val-counter text-main" data-val="143">143</div>
          </div>
          <div class="dashboard-card-lite dashboard-card-wide">
            <div class="text-xs text-dim strong">VOLUME / VALUE</div>
            <div class="mono strong" style="font-size:14px;">8.4T / Rp 9.2T</div>
          </div>
        </div>

        <div class="col-span-12 panel stagger-reveal dashboard-section-head" style="margin-top:8px;">
          <div class="flex justify-between items-center mb-4">
            <div>
              <h3 class="text-xs uppercase text-dim strong" style="letter-spacing:0.08em;">Top Movers</h3>
              <div class="text-xs text-dim">Quick look at active names</div>
            </div>
            <a href="#market" class="text-xs text-primary strong hover:underline">View All</a>
          </div>
          <div class="flex-col gap-2">
            ${['GOTO','BRPT','BBCA','TLKM'].map((t,i)=>row(t,['96','1,200','9,800','3,420'][i],['+9.09','+5.20','+3.15','+2.50'][i])).join('')}
          </div>
        </div>

        <div class="col-span-12 panel stagger-reveal dashboard-section-head" style="margin-top:8px;">
          <div class="flex justify-between items-center mb-4">
            <div>
              <h3 class="text-xs uppercase text-dim strong" style="letter-spacing:0.08em;">Latest Intelligence</h3>
              <div class="text-xs text-dim">Fresh news and fallback content</div>
            </div>
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
    loadMarketSummary();
    loadNews();
    if (typeof lucide !== 'undefined') lucide.createIcons();
    setTimeout(() => document.querySelectorAll('.val-counter').forEach(el => animateValue(el, 0, parseInt(el.getAttribute('data-val')), 1000)), 200);
}

async function loadMarketSummary() {
    const summary = await fetchMarketSummary();
    const isLive = !!summary && summary.status !== 'no_data';
    document.getElementById('market-fold-status').textContent = isLive ? 'Market first fold • live snapshot' : 'Market first fold • demo snapshot';
    const badge = document.getElementById('market-fold-badge');
    badge.textContent = isLive ? 'LIVE' : 'DEMO';
    badge.className = isLive ? 'badge badge-up' : 'badge';

    const value = summary?.value ?? summary?.close ?? '7,080.63';
    const change = summary?.change_pct != null ? `${summary.change_pct >= 0 ? '+' : ''}${summary.change_pct}%` : '+0.12%';
    document.getElementById('ihsg-value').textContent = typeof value === 'number' ? value.toLocaleString() : value;
    document.getElementById('ihsg-change').textContent = change;
    document.getElementById('ihsg-change').className = `mono strong ${String(change).startsWith('-') ? 'text-down' : 'text-up'}`;
    document.getElementById('ihsg-open').textContent = summary?.open?.toLocaleString?.() ?? '7,096.61';
    document.getElementById('ihsg-high').textContent = summary?.high?.toLocaleString?.() ?? '7,126.06';
    document.getElementById('ihsg-low').textContent = summary?.low?.toLocaleString?.() ?? '7,063.99';
}


const row = (ticker, price, change) => `
  <a href="#stock/${ticker}" class="flex items-center justify-between p-3" style="background:transparent; border:1px solid transparent; border-bottom: 1px solid var(--border-subtle); border-radius:0; transition:background 0.2s;">
    <div class="flex items-center gap-3">
      <div style="width:32px; height:32px; background:var(--accent-glow); border-radius:8px; display:grid; place-items:center; font-size:10px; font-weight:800; color:var(--accent-indigo); border:1px solid rgba(99,102,241,0.2);">${ticker.substring(0,2)}</div>
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
                    ${imageUrl ? imageElement : '<i data-lucide="newspaper" style="width:40px; color:var(--text-dim);"></i>'}
                    <div class="news-image-fallback" style="${imageUrl ? 'display:none;' : 'display:flex;'} align-items:center; justify-content:center; height:100%; width:100%;">
                       <i data-lucide="newspaper" style="width:40px; color:var(--text-dim);"></i>
                    </div>
                </div>
                <div class="news-content" style="padding:16px; flex:1;">
                    <span class="news-badge" style="background:var(--accent-glow); color:var(--accent-indigo); font-size:10px; font-weight:700; padding:3px 8px; border-radius:4px; margin-bottom:8px; display:inline-block;">${n.source || 'MARKET'}</span>
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
