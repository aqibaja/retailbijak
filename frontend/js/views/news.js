import { fetchNews } from '../api.js';
import { animateCards } from '../main.js';

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
    const items = Array.isArray(res?.data) ? res.data : [];
    badge.textContent = `${items.length} items`;

    if (items.length === 0) {
        list.innerHTML = '<p style="color:var(--text-muted);">No news available right now.</p>';
        return;
    }

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
