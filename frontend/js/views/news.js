import { fetchNews } from '../api.js';
import { observeElements } from '../main.js';

const FALLBACK_NEWS = [
    { source: 'Bloomberg', title: 'Foreign Funds Flow Into Indonesian Banks as Rates Peak', summary: 'Major foreign inflows detected in BBCA and BMRI.', link: '#', published_at: new Date().toISOString() },
    { source: 'Reuters', title: 'Commodity Supercycle Propels IDX Energy Sector', summary: 'Coal and oil names rally on global supply constraints.', link: '#', published_at: new Date(Date.now()-3600000).toISOString() },
    { source: 'CNBC', title: 'Tech Stocks Consolidate Following Recent Tech Sell-Off', summary: 'GOTO and BUKA find a floor as retail selling exhausts.', link: '#', published_at: new Date(Date.now()-7200000).toISOString() }
];

export async function renderNews(root) {
    root.innerHTML = `
      <section class="grid grid-cols-12 stagger-reveal">
        <div class="col-span-12 flex justify-between items-end mb-4">
          <div>
            <h1 class="text-2xl strong mb-2">Market Intelligence</h1>
            <p class="text-muted">Aggregated financial news & macroeconomic updates</p>
          </div>
          <div class="badge badge-primary" id="news-count">LIVE FEED</div>
        </div>
        
        <div class="col-span-12 panel flex-col" style="padding:0;">
          <div id="news-list" class="flex-col">
            <div class="p-4" style="border-bottom:1px solid var(--border-subtle);"><div class="skeleton skel-title"></div><div class="skeleton skel-text"></div></div>
            <div class="p-4" style="border-bottom:1px solid var(--border-subtle);"><div class="skeleton skel-title"></div><div class="skeleton skel-text"></div></div>
          </div>
        </div>
      </section>`;

    observeElements();
    
    const res = await fetchNews(20);
    const list = document.getElementById('news-list');
    const items = Array.isArray(res?.data) && res.data.length ? res.data : FALLBACK_NEWS;
    
    document.getElementById('news-count').textContent = `${items.length} ARTICLES`;

    list.innerHTML = items.map((n, i) => {
        const time = n.published_at ? new Date(n.published_at).toLocaleTimeString([],{hour:'2-digit', minute:'2-digit'}) : '';
        const delay = i * 50;
        return `
            <a href="${n.link}" target="_blank" class="p-4" style="border-bottom:1px solid var(--border-subtle); transition:background var(--duration-fast); animation: fadeUp 0.4s var(--ease-spring) ${delay}ms both;">
                <div class="flex items-center gap-2 mb-2">
                    <span class="badge" style="background:var(--bg-elevated); border:none; color:var(--primary-color);">${n.source || 'MARKET'}</span>
                    <span class="text-xs text-dim mono">${time}</span>
                </div>
                <h3 class="text-lg strong mb-2" style="color:var(--text-main); line-height:1.4;">${n.title}</h3>
                ${n.summary ? `<p class="text-muted text-sm" style="line-height:1.6; max-width:800px;">${n.summary}</p>` : ''}
            </a>
        `;
    }).join('');
}

// Inject animation keyframes for news items
if (!document.getElementById('news-keyframes')) {
    const style = document.createElement('style');
    style.id = 'news-keyframes';
    style.innerHTML = `@keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                       #news-list a:hover { background: rgba(255,255,255,0.02); }`;
    document.head.appendChild(style);
}
