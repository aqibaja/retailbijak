import { fetchNews } from '../api.js';
import { observeElements } from '../main.js';

const FALLBACK_NEWS = [
    { source: 'CNBC Indonesia', title: 'Rusia Atur Cadangan Valas Perbankan Wajib Pakai Yuan', summary: '', link: '#', published_at: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
    { source: 'Bloomberg', title: 'Foreign Funds Flow Into Indonesian Banks as Rates Peak', summary: '', link: '#', published_at: new Date(Date.now() - 1000 * 60 * 240).toISOString() },
    { source: 'Reuters', title: 'Commodity Supercycle Propels IDX Energy Sector', summary: '', link: '#', published_at: new Date(Date.now() - 1000 * 60 * 600).toISOString() },
    { source: 'Bisnis', title: 'Volatility compresses as traders wait for next macro catalyst', summary: '', link: '#', published_at: new Date(Date.now() - 1000 * 60 * 1400).toISOString() },
    { source: 'MarketBeat', title: 'Retail traders keep an eye on breakout patterns in consumer names', summary: '', link: '#', published_at: new Date(Date.now() - 1000 * 60 * 2800).toISOString() }
];

function getRelativeTime(dateStr) {
    if (!dateStr) return 'Just now';
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) {
        const mins = Math.floor(diff / 60000);
        return mins <= 1 ? 'Just now' : \`\${mins} mins ago\`;
    }
    if (hours < 24) return \`\${hours} hours ago\`;
    return \`\${Math.floor(hours / 24)} days ago\`;
}

export async function renderNews(root) {
    root.innerHTML = \`
      <section class="news-container stagger-reveal">
        <div class="news-header">
          <div>
            <h1 style="font-size: 24px; font-weight: 700; color: #f8fafc; margin-bottom: 8px;">Market Intelligence</h1>
            <p style="font-size: 14px; color: #64748b;">Aggregated financial news & macroeconomic updates</p>
          </div>
          <div style="height: 32px; background: rgba(59,130,246,0.15); color: #60a5fa; border-radius: 16px; padding: 0 16px; font-size: 12px; font-weight: 600; display: flex; align-items: center;" id="news-count">
            LOADING...
          </div>
        </div>

        <div class="news-tabs">
            <button class="news-tab active">All</button>
            <button class="news-tab">Stocks</button>
            <button class="news-tab">Macro</button>
            <button class="news-tab">Crypto</button>
            <button class="news-tab">Commodities</button>
        </div>
        
        <div id="news-list" class="news-grid">
            \${Array(6).fill(\`
            <article class="news-card">
              <div class="news-image-wrap skeleton"></div>
              <div class="news-content">
                <div class="skeleton skel-text" style="width: 40%; margin-bottom: 10px;"></div>
                <div class="skeleton skel-title" style="width: 100%;"></div>
                <div class="skeleton skel-title" style="width: 80%;"></div>
                <div class="news-meta" style="margin-top: 12px;">
                   <div class="skeleton skel-text" style="width: 30%;"></div>
                </div>
              </div>
            </article>\`).join('')}
        </div>
      </section>\`;

    observeElements();

    const res = await fetchNews(20);
    const list = document.getElementById('news-list');
    const items = Array.isArray(res?.data) && res.data.length ? res.data : FALLBACK_NEWS;
    
    document.getElementById('news-count').textContent = \`\${items.length} ARTICLES TODAY\`;

    list.innerHTML = items.map((n) => {
        const time = getRelativeTime(n.published_at);
        const source = n.source || 'MARKET';
        const imageUrl = n.image_url || '';
        const imageElement = imageUrl 
            ? \`<img src="\${imageUrl}" alt="\${n.title}" loading="lazy"><div class="news-image-fallback" style="display:none">📰</div>\` 
            : \`<div class="news-image-fallback" style="display:flex;">📰</div>\`;

        return \`
            <a href="\${n.link}" target="_blank" class="news-card">
                <div class="news-image-wrap">
                    \${imageElement}
                </div>
                <div class="news-content">
                    <span class="news-badge">\${source}</span>
                    <h3 class="news-title">\${n.title}</h3>
                    <div class="news-meta">
                        <span class="news-source">\${source}</span>
                        <span class="news-dot">-</span>
                        <span class="news-time">\${time}</span>
                    </div>
                </div>
            </a>
        \`;
    }).join('');
    
    // Quick tab click effect (aesthetic only)
    document.querySelectorAll('.news-tab').forEach(tab => {
       tab.addEventListener('click', () => {
          document.querySelectorAll('.news-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
       });
    });
}
