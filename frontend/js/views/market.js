import { animateCards } from '../main.js';

const SECTORS = [
    ['Finance', 1.2],
    ['Technology', -2.4],
    ['Consumer', 0.3],
    ['Property', -0.8],
    ['Energy', 1.8],
    ['Healthcare', 0.6],
];

export function renderMarket(root) {
    root.innerHTML = `
        <div class="flex-between mb-4">
            <h1>Market Overview</h1>
            <div class="chip neutral">Live snapshot</div>
        </div>
        <div class="card mb-4">
            <h2>Sector Heatmap</h2>
            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); gap:10px; margin-top:14px;">
                ${SECTORS.map(([name, val]) => {
                    const pos = val >= 0;
                    return `<div style="padding:12px; border-radius:12px; background:${pos ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)'}; border:1px solid ${pos ? 'rgba(22,163,74,0.35)' : 'rgba(220,38,38,0.35)'};"><div style="font-size:12px; color:var(--text-muted);">${name}</div><div class="mono" style="font-size:18px; font-weight:700;">${val > 0 ? '+' : ''}${val.toFixed(2)}%</div></div>`;
                }).join('')}
            </div>
        </div>
        <div class="card">
            <h2>Market Breadth</h2>
            <div style="display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-top:14px;">
                <div><div style="font-size:12px; color:var(--text-muted);">Advancers</div><div class="mono" style="font-size:24px; font-weight:700; color:var(--success);">328</div></div>
                <div><div style="font-size:12px; color:var(--text-muted);">Decliners</div><div class="mono" style="font-size:24px; font-weight:700; color:var(--danger);">271</div></div>
                <div><div style="font-size:12px; color:var(--text-muted);">Unchanged</div><div class="mono" style="font-size:24px; font-weight:700;">143</div></div>
            </div>
        </div>
    `;
    animateCards('.card');
}
