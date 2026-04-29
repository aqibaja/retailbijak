import { fetchNews } from '../api.js';
import { animateCards } from '../main.js';

const FALLBACK_NEWS = [
    { source: 'Reuters', title: 'Banking and energy sectors lead intraday rotation on IDX', summary: 'Big caps hold the index while secondary names attract volume on the close.', link: '#news', published_at: new Date(Date.now() - 1000 * 60 * 35).toISOString() },
    { source: 'CNBC Indonesia', title: 'Retail traders keep an eye on breakout patterns in consumer names', summary: 'Momentum setups remain active as liquidity improves in selected counters.', link: '#news', published_at: new Date(Date.now() - 1000 * 60 * 95).toISOString() },
    { source: 'MarketBeat', title: 'Foreign flow turns mixed, but defensive sectors still look resilient', summary: 'Portfolio rotation favors balance sheets and steady dividend stories.', link: '#news', published_at: new Date(Date.now() - 1000 * 60 * 155).toISOString() },
    { source: 'Bisnis', title: 'Volatility compresses as traders wait for next macro catalyst', summary: 'Watch breadth, volume spikes, and index support areas for confirmation.', link: '#news', published_at: new Date(Date.now() - 1000 * 60 * 245).toISOString() },
];

export async function renderNews(root) {
    root.innerHTML = `
      <section class="reveal">
        <div class="flex-between mb-4">
            <h1 class="mb-0">News & Analysis</h1>
            <div class="chip" id="news-count">Loading...</div>
        </div>
        <div class="card">
            <div id="news-list" class="stack-list">
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text"></div>
            </div>
        </div>
      </section>
    `;

    animateCards('.card');
    const res = await fetchNews(25);
    const list = document.getElementById('news-list');
    const badge = document.getElementById('news-count');
    const items = Array.isArray(res?.data) && res.data.length ? res.data : FALLBACK_NEWS;
    badge.textContent = `${items.length} items`;

    list.innerHTML = items.map((n) => {
        const dt = n.published_at ? new Date(n.published_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '';
        const dateStr = n.published_at ? new Date(n.published_at).toLocaleDateString() : '';
        return `
            <a class="stack-item" href="${n.link}" target="_blank" rel="noopener" style="padding: 20px 0;">
                <div>
                  <div class="muted mb-2" style="font-size:11px; text-transform:uppercase; font-weight:700;">${n.source || 'Market'} • ${dateStr} ${dt}</div>
                  <h3 style="margin:0; font-size:18px; line-height:1.4;">${n.title || 'Untitled'}</h3>
                  ${n.summary ? `<p class="muted mt-2" style="font-size:14px; margin-bottom:0;">${n.summary}</p>` : ''}
                </div>
            </a>
        `;
    }).join('');
}
