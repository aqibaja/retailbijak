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
      <section class="section-grid reveal">
        <div class="card mb-4">
          <h1 class="mb-2">Market Overview</h1>
          <p class="muted">Pantau sentimen harian, pergerakan sektoral, dan breadth market secara real-time.</p>
        </div>

        <div class="grid grid-2">
          <div class="card">
            <h3 class="mb-4">Sector Heatmap</h3>
            <div class="grid grid-2">
              ${SECTORS.map(([name, val, strength]) => `
                <div class="card" style="padding:16px; background:var(--surface-elevated);">
                  <div class="muted" style="font-size:11px; text-transform:uppercase; font-weight:700;">${name}</div>
                  <div class="mono strong mt-2 ${val >= 0 ? 'positive' : 'negative'}" style="font-size:18px;">${val > 0 ? '+' : ''}${val.toFixed(2)}%</div>
                  <div style="height:4px; background:var(--surface-3); border-radius:99px; margin-top:12px; overflow:hidden;">
                    <div style="height:100%; width:${strength}%; background:${val >= 0 ? 'var(--success)' : 'var(--danger)'}; opacity:0.6;"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:24px;">
            <div class="card">
              <h3 class="mb-4">Market Breadth</h3>
              <div class="grid grid-3">
                <div style="text-align:center">
                  <div class="muted" style="font-size:11px;">Advancers</div>
                  <div class="mono strong positive" style="font-size:24px;">328</div>
                </div>
                <div style="text-align:center">
                  <div class="muted" style="font-size:11px;">Decliners</div>
                  <div class="mono strong negative" style="font-size:24px;">271</div>
                </div>
                <div style="text-align:center">
                  <div class="muted" style="font-size:11px;">Unchanged</div>
                  <div class="mono strong" style="font-size:24px;">143</div>
                </div>
              </div>
            </div>

            <div class="card">
              <h3 class="mb-4">Market Intelligence</h3>
              <div class="stack-list">
                <div class="stack-item">
                  <div class="muted" style="font-size:12px; line-height:1.6;">Perbankan memimpin rotasi intraday, dengan aliran dana asing yang stabil pada saham Big Caps.</div>
                </div>
                <div class="stack-item">
                  <div class="muted" style="font-size:12px; line-height:1.6;">Sektor energi menunjukkan momentum setelah harga komoditas global menguat semalam.</div>
                </div>
                <div class="stack-item">
                  <div class="muted" style="font-size:12px; line-height:1.6;">Waspadai volatilitas menjelang penutupan sesi 2 pada hari Jumat.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
    animateCards('.card');
}
