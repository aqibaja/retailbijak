import { fetchNews } from '../api.js';
import { animateCards } from '../main.js';

export async function renderNews(root) {
    root.innerHTML = `
      <section class="reveal">
        <div class="card mb-6">
            <h1 style="font-size: 24px; font-weight: 700;">Intelligence</h1>
            <p style="color: var(--text-muted); font-size: 14px;">Market insights and news analysis</p>
        </div>
        <div class="card">
            <div id="news-list" style="display:flex; flex-direction:column;">
                <div class="text-dim">Aggregating sources...</div>
            </div>
        </div>
      </section>`;

    animateCards('.card');
    const res = await fetchNews(20);
    const list = document.getElementById('news-list');
    if (!res?.data?.length) {
        list.innerHTML = `<div class="text-dim">No news articles found.</div>`;
        return;
    }

    list.innerHTML = res.data.map((n) => `
        <a href="${n.link}" target="_blank" style="display:block; padding: 24px 0; border-bottom: 1px solid var(--border); text-decoration:none; transition: var(--transition);">
            <div style="color:var(--primary); font-size:10px; font-weight:800; text-transform:uppercase; margin-bottom:8px; letter-spacing:1px;">${n.source || 'MARKET'}</div>
            <h3 style="color:#fff; font-size:18px; margin-bottom:12px; line-height:1.4;">${n.title}</h3>
            ${n.summary ? `<p style="color:var(--text-muted); font-size:14px; line-height:1.6;">${n.summary}</p>` : ''}
        </a>`).join('');
}
