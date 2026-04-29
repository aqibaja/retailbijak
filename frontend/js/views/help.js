import { animateCards } from '../main.js';

export function renderHelp(root) {
    root.innerHTML = `
        <div class="flex-between mb-4"><h1>Help Center</h1></div>
        <div class="card">
            <h2>Quick Guide</h2>
            <ol style="margin:12px 0 0 18px; display:flex; flex-direction:column; gap:8px; color:var(--text-muted);">
                <li>Open <b>Screener</b> and choose timeframe.</li>
                <li>Run scan and click ticker on result table.</li>
                <li>Review chart, technical, and fundamental panel.</li>
                <li>Save ticker to watchlist for monitoring.</li>
            </ol>
        </div>
    `;
    animateCards('.card');
}
