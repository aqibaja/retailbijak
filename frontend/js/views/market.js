import { animateCards } from '../main.js';

const SECTORS = [
    ['Finance', 1.2, 78],
    ['Technology', -2.4, 41],
    ['Consumer', 0.3, 55],
    ['Property', -0.8, 33],
    ['Energy', 1.8, 84],
    ['Healthcare', 0.6, 61],
    ['Materials', -1.1, 47],
    ['Infrastructure', 0.9, 69],
];

export function renderMarket(root) {
    root.innerHTML = `
        <section class="mb-4">
            <div class="eyebrow">Market intelligence</div>
            <div class="flex-between" style="gap:16px; align-items:flex-end; flex-wrap:wrap;">
                <div>
                    <h1>Market Overview</h1>
                    <p class="text-muted" style="max-width:720px; margin-top:8px;">Pantau sentimen harian, pergerakan sektoral, dan breadth market untuk membaca apakah pasar sedang risk-on atau defensif.</p>
                </div>
                <div class="chip neutral">Live snapshot • 09:00 WIB</div>
            </div>
        </section>

        <section class="card mb-4">
            <div class="flex-between mb-3">
                <h2 style="margin:0;">Sector Heatmap</h2>
                <span class="text-muted mono">8 sectors</span>
            </div>
            <div class="responsive-grid">
                ${SECTORS.map(([name, val, strength]) => {
                    const pos = val >= 0;
                    return `
                        <article class="metric-card" style="background:${pos ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)'}; border-color:${pos ? 'rgba(22,163,74,0.24)' : 'rgba(220,38,38,0.24)'};">
                            <div class="text-muted" style="font-size:12px;">${name}</div>
                            <div class="mono" style="font-size:20px; font-weight:700; margin-top:6px;">${val > 0 ? '+' : ''}${val.toFixed(2)}%</div>
                            <div class="progress-track" style="margin-top:12px;">
                                <span class="progress-fill ${pos ? 'positive' : 'negative'}" style="width:${strength}%;"></span>
                            </div>
                        </article>`;
                }).join('')}
            </div>
        </section>

        <section class="split-row">
            <div class="card">
                <div class="flex-between mb-3">
                    <h2 style="margin:0;">Market Breadth</h2>
                    <span class="chip neutral">Today</span>
                </div>
                <div class="three-col-stats">
                    <div class="metric-card"><div class="text-muted">Advancers</div><div class="mono" style="font-size:28px; font-weight:700; color:var(--success);">328</div></div>
                    <div class="metric-card"><div class="text-muted">Decliners</div><div class="mono" style="font-size:28px; font-weight:700; color:var(--danger);">271</div></div>
                    <div class="metric-card"><div class="text-muted">Unchanged</div><div class="mono" style="font-size:28px; font-weight:700;">143</div></div>
                </div>
            </div>

            <div class="card">
                <div class="flex-between mb-3">
                    <h2 style="margin:0;">Market Notes</h2>
                    <span class="chip warning">Watchlist bias</span>
                </div>
                <div class="stack" style="gap:12px;">
                    <div class="notice-box">Perbankan masih memimpin rotasi intraday, tetapi momentum mulai menyebar ke energi dan material.</div>
                    <div class="notice-box">Jika breadth bertahan di atas 55%, peluang follow-through pada indeks utama tetap terbuka.</div>
                    <div class="notice-box">Cek saham ber-volume tinggi untuk menghindari sinyal palsu saat market mendekati penutupan.</div>
                </div>
            </div>
        </section>
    `;
    animateCards('.card');
}
