import { fetchNews } from '../api.js';

const FALLBACK_NEWS = [
    { source: 'CNBC Indonesia', title: 'Rusia Atur Cadangan Valas Perbankan Wajib Pakai Yuan', summary: '', link: '#', image_url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80', published_at: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
    { source: 'Bloomberg', title: 'Foreign Funds Flow Into Indonesian Banks as Rates Peak', summary: '', link: '#', image_url: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=800&q=80', published_at: new Date(Date.now() - 1000 * 60 * 240).toISOString() },
    { source: 'Reuters', title: 'Commodity Supercycle Propels IDX Energy Sector', summary: '', link: '#', image_url: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?auto=format&fit=crop&w=800&q=80', published_at: new Date(Date.now() - 1000 * 60 * 600).toISOString() },
    { source: 'Bisnis', title: 'Volatility compresses as traders wait for next macro catalyst', summary: '', link: '#', image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80', published_at: new Date(Date.now() - 1000 * 60 * 1400).toISOString() },
    { source: 'MarketBeat', title: 'Retail traders keep an eye on breakout patterns in consumer names', summary: '', link: '#', image_url: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=800&q=80', published_at: new Date(Date.now() - 1000 * 60 * 2800).toISOString() }
];

function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function observeNewsCards() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('news-card--visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.news-card').forEach((card, index) => {
    // Apply dynamic stagger delay based on DOM order
    card.style.transitionDelay = `${(index % 6) * 0.05}s`;
    observer.observe(card);
  });
}

export async function renderNews(root) {
    root.innerHTML = `
      <section class="news-container">
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
            ${Array(6).fill(`
            <article class="news-card news-skeleton" style="opacity:1; transform:none; transition:none; border-color:transparent;">
              <div class="news-image-wrap skeleton-shimmer" style="background:#1e293b;"></div>
              <div class="news-content">
                <div class="skeleton-shimmer" style="width: 40%; height:16px; margin-bottom: 12px; border-radius:4px; background:#1e293b;"></div>
                <div class="skeleton-shimmer" style="width: 100%; height:20px; margin-bottom: 8px; border-radius:4px; background:#1e293b;"></div>
                <div class="skeleton-shimmer" style="width: 80%; height:20px; border-radius:4px; background:#1e293b;"></div>
                <div class="news-meta" style="margin-top: auto; padding-top:16px;">
                   <div class="skeleton-shimmer" style="width: 30%; height:12px; border-radius:4px; background:#1e293b;"></div>
                </div>
              </div>
            </article>`).join('')}
        </div>
      </section>`;

    const res = await fetchNews(20);
    const list = document.getElementById('news-list');
    const items = Array.isArray(res?.data) && res.data.length ? res.data : FALLBACK_NEWS;
    
    document.getElementById('news-count').textContent = `${items.length} ARTICLES TODAY`;

    list.innerHTML = items.map((n) => {
        const time = timeAgo(n.published_at);
        const source = n.source || 'MARKET';
        const imageUrl = n.image_url || '';
        const imageElement = imageUrl 
            ? `<img src="${imageUrl}" alt="News thumbnail" loading="lazy" onerror="this.style.display='none'; this.parentElement.querySelector('.news-image-fallback').style.display='flex';">
               <div class="news-image-overlay"></div>
               <div class="news-image-fallback">📰</div>` 
            : `<div class="news-image-fallback" style="display:flex;">📰</div>`;

        return `
            <a href="${n.link}" target="_blank" class="news-card">
                <div class="news-image-wrap">
                    ${imageElement}
                </div>
                <div class="news-content">
                    <span class="news-badge">${source}</span>
                    <h3 class="news-title">${n.title}</h3>
                    <div class="news-meta">
                        <span class="news-source">${source}</span>
                        <span class="news-dot">-</span>
                        <span class="news-time">${time}</span>
                    </div>
                </div>
            </a>
        `;
    }).join('');
    
    observeNewsCards();
    
    // Quick tab click effect (aesthetic only)
    document.querySelectorAll('.news-tab').forEach(tab => {
       tab.addEventListener('click', () => {
          document.querySelectorAll('.news-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
       });
    });
}
