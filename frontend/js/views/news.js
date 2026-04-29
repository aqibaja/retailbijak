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
        <div class="flex-between mb-4">
            <h1>News & Analysis</h1>
            <div class="chip neutral" id="news-count">Loading...</div>
        </div>
        <div class="card">
            <div id="news-list" style="display:flex; flex-direction:column; gap:16px;">
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text"></div>
            </div>
        </div>
    `;

    animateCards('.card');
    const res = await fetchNews(25);
    const list = document.getElementById('news-list');
    const badge = document.getElementById('news-count');
    const items = Array.isArray(res?.data) && res.data.length ? res.data : FALLBACK_NEWS;
    badge.textContent = `${items.length} items`;

    list.innerHTML = items.map((n) => {
        const dt = n.published_at ? new Date(n.published_at).toLocaleString() : '-';
        const summary = n.summary ? `<div style="font-size:13px; color:var(--text-muted); margin-top:6px;">${n.summary}</div>` : '';
        return `
            <article style="padding-bottom:14px; border-bottom:1px solid var(--border);">
                <div style="font-size:12px; color:var(--text-faint); margin-bottom:6px;">${n.source || 'Source'} • ${dt}</div>
                <a href="${n.link}" target="_blank" rel="noopener noreferrer" style="font-weight:600; line-height:1.4;">${n.title || 'Untitled'}</a>
                ${summary}
            </article>
        `;
    }).join('');
}
