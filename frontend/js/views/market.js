import { animateCards } from '../main.js';

export function renderMarket(root) {
    const SECTORS = [
        ['Finance', 1.2], ['Technology', -2.4], ['Energy', 1.8], 
        ['Consumer', 0.3], ['Property', -0.8], ['Basic', 0.5]
    ];

    root.innerHTML = `
      <section class="reveal">
        <div class="card mb-6">
          <h1 style="font-size: 24px; font-weight: 700;">Market Intelligence</h1>
          <p style="color: var(--text-muted); font-size: 14px;">Sectoral performance and market breadth analysis</p>
        </div>

        <div class="grid grid-cols-12">
          <div class="span-8">
            <div class="card">
              <h3 class="strong mb-6">Sectoral Heatmap</h3>
              <div class="grid grid-cols-12" style="gap:16px;">
                ${SECTORS.map(([name, val]) => `
                  <div class="span-4 card" style="background:rgba(255,255,255,0.02); border:none; padding:20px;">
                    <div class="text-muted mb-2" style="font-size:11px; font-weight:700;">${name.toUpperCase()}</div>
                    <div class="mono strong ${val >= 0 ? 'text-up' : 'text-down'}" style="font-size:20px;">${val > 0 ? '+' : ''}${val}%</div>
                    <div style="height:2px; background:var(--border); margin-top:12px; border-radius:99px; overflow:hidden;">
                        <div style="height:100%; width:${Math.min(Math.abs(val) * 20, 100)}%; background:${val >= 0 ? 'var(--primary)' : 'var(--danger)'}; opacity:0.6;"></div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <div class="span-4">
            <div class="card mb-6">
              <h3 class="strong mb-4">Market Breadth</h3>
              <div class="flex justify-between items-center mb-4">
                <span class="text-muted">Advancers</span>
                <span class="mono strong text-up">328</span>
              </div>
              <div class="flex justify-between items-center mb-4">
                <span class="text-muted">Decliners</span>
                <span class="mono strong text-down">271</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-muted">Unchanged</span>
                <span class="mono strong">143</span>
              </div>
            </div>

            <div class="card">
              <h3 class="strong mb-4">Top Liquidity</h3>
              <div style="display:flex; flex-direction:column; gap:12px;">
                ${['BBCA','BBRI','TLKM','BMRI'].map(t => `
                  <div class="flex justify-between items-center">
                    <span class="mono strong">${t}</span>
                    <span class="text-muted" style="font-size:12px;">Rp 1.2T</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      </section>`;

    animateCards('.card');
}
