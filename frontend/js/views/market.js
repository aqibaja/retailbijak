import { observeElements } from '../main.js';

export function renderMarket(root) {
    const SECTORS = [
        ['Finance', 1.2], ['Technology', -2.4], ['Energy', 1.8], 
        ['Consumer', 0.3], ['Property', -0.8], ['Basic', 0.5],
        ['Healthcare', 0.6], ['Infrastructure', 0.9]
    ];

    root.innerHTML = `
      <section class="grid grid-cols-12 stagger-reveal">
        <!-- Header -->
        <div class="col-span-12 flex justify-between items-end mb-4">
          <div>
            <h1 class="text-2xl strong mb-2">Market Overview</h1>
            <p class="text-muted">Real-time sector performance & institutional flows</p>
          </div>
          <div class="badge">LIVE DATA</div>
        </div>

        <!-- Heatmap -->
        <div class="col-span-8 panel flex-col">
          <div class="flex justify-between items-center mb-4 pb-4" style="border-bottom:1px solid var(--border-subtle);">
            <h3 class="text-xs uppercase text-muted strong">Sector Performance</h3>
            <span class="mono text-xs text-dim">8 SECTORS</span>
          </div>
          
          <div class="grid grid-cols-4 gap-3">
            ${SECTORS.map(([name, val]) => `
              <div class="p-4" style="background:${val >= 0 ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)'}; border:1px solid ${val >= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}; border-radius:var(--radius-sm);">
                <div class="text-xs text-muted mb-2 uppercase truncate">${name}</div>
                <div class="mono strong ${val >= 0 ? 'text-up' : 'text-down'} text-lg">${val > 0 ? '+' : ''}${val.toFixed(2)}%</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Sidebar Intel -->
        <div class="col-span-4 flex-col gap-4">
          <div class="panel flex-col">
            <h3 class="text-xs uppercase text-muted strong mb-4">Breadth Today</h3>
            <div class="flex-col gap-3">
              <div class="flex justify-between items-center">
                <span class="text-sm text-dim">Advancers</span>
                <span class="mono strong text-up">328</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-dim">Decliners</span>
                <span class="mono strong text-down">271</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-dim">Unchanged</span>
                <span class="mono strong text-main">143</span>
              </div>
            </div>
            <div class="mt-4 pt-4" style="border-top:1px solid var(--border-subtle);">
              <div class="text-xs text-dim mb-2">BULLISH BIAS</div>
              <div style="height:4px; background:var(--border-subtle); border-radius:2px; display:flex;">
                <div style="width:55%; background:var(--up-color); border-radius:2px;"></div>
                <div style="width:45%; background:var(--down-color); border-radius:2px;"></div>
              </div>
            </div>
          </div>

          <div class="panel flex-col" style="flex:1;">
            <h3 class="text-xs uppercase text-warn strong mb-4 flex items-center gap-2"><i data-lucide="alert-triangle" style="width:14px;"></i> Intelligence Notes</h3>
            <div class="flex-col gap-3 text-sm text-muted">
              <div class="p-3" style="background:var(--bg-elevated); border-radius:var(--radius-sm); border:1px solid var(--border-subtle);">
                Big banks leading the index weight today. Foreign net buy focused on BBCA & BMRI.
              </div>
              <div class="p-3" style="background:var(--bg-elevated); border-radius:var(--radius-sm); border:1px solid var(--border-subtle);">
                Energy sector showing momentum bounce following overnight oil price surge.
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
    observeElements();
}
