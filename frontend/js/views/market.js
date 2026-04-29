import { observeElements } from '../main.js';

export function renderMarket(root) {
    const SECTORS = [
        ['Finance', 1.2], ['Technology', -2.4], ['Energy', 1.8], 
        ['Consumer', 0.3], ['Property', -0.8], ['Basic', 0.5],
        ['Healthcare', 0.6], ['Infrastructure', 0.9], ['Trans & Log', -1.2], ['Industrials', 1.5]
    ];

    root.innerHTML = `
      <section class="grid grid-cols-12 stagger-reveal">
        <!-- Header -->
        <div class="col-span-12 flex justify-between items-end mb-4">
          <div>
            <h1 class="text-3xl mb-2" data-i18n="market_overview" style="color:var(--text-main); letter-spacing:-0.04em; font-weight:800;">Market Overview</h1>
            <p class="text-base" style="color:var(--text-muted);">Real-time sector performance & institutional flows</p>
          </div>
          <div class="badge" style="background:rgba(16,185,129,0.1); color:#34d399; border:1px solid rgba(16,185,129,0.2);">LIVE DATA</div>
        </div>

        <!-- Heatmap & Foreign Flow -->
        <div class="col-span-8 flex-col gap-6">
          <div class="panel">
            <div class="flex justify-between items-center mb-4 pb-4" style="border-bottom:1px solid var(--border-subtle);">
              <h3 class="text-xs uppercase text-dim strong" style="letter-spacing:0.08em;">Sector Performance</h3>
              <span class="mono text-xs text-dim">10 SECTORS</span>
            </div>
            
            <div class="grid grid-cols-5 gap-3">
              ${SECTORS.map(([name, val]) => `
                <div class="p-4" style="background:${val >= 0 ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)'}; border:1px solid ${val >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}; border-radius:var(--radius-md); transition: transform 0.2s;">
                  <div class="text-xs text-muted mb-2 uppercase truncate strong">${name}</div>
                  <div class="mono strong ${val >= 0 ? 'text-up' : 'text-down'} text-lg">${val > 0 ? '+' : ''}${val.toFixed(2)}%</div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="panel">
            <div class="flex justify-between items-center mb-4 pb-4" style="border-bottom:1px solid var(--border-subtle);">
              <h3 class="text-xs uppercase text-dim strong" style="letter-spacing:0.08em;">Net Foreign Flow</h3>
              <span class="mono text-xs text-up strong" style="background:rgba(16,185,129,0.1); padding:2px 8px; border-radius:4px;">NET BUY: Rp 842.5B</span>
            </div>
            
            <div class="table-wrapper">
              <table class="table">
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Action</th>
                    <th style="text-align:right">Volume</th>
                    <th style="text-align:right">Value (IDR)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td class="mono strong text-main">BBCA</td><td><span class="badge badge-up">NET BUY</span></td><td style="text-align:right" class="mono text-muted">128M</td><td style="text-align:right" class="mono strong text-up">1.2T</td></tr>
                  <tr><td class="mono strong text-main">BMRI</td><td><span class="badge badge-up">NET BUY</span></td><td style="text-align:right" class="mono text-muted">85M</td><td style="text-align:right" class="mono strong text-up">942B</td></tr>
                  <tr><td class="mono strong text-main">GOTO</td><td><span class="badge badge-down">NET SELL</span></td><td style="text-align:right" class="mono text-muted">450M</td><td style="text-align:right" class="mono strong text-down">45B</td></tr>
                  <tr><td class="mono strong text-main">TLKM</td><td><span class="badge badge-down">NET SELL</span></td><td style="text-align:right" class="mono text-muted">62M</td><td style="text-align:right" class="mono strong text-down">210B</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Sidebar Intel -->
        <div class="col-span-4 flex-col gap-4">
          <div class="panel flex-col">
            <h3 class="text-xs uppercase text-dim strong mb-4 border-b pb-2" style="border-bottom:1px solid var(--border-subtle); letter-spacing:0.08em;">Breadth Today</h3>
            <div class="flex-col gap-3">
              <div class="flex justify-between items-center">
                <span class="text-sm text-muted strong">Advancers</span>
                <span class="mono strong text-up text-base">328</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-muted strong">Decliners</span>
                <span class="mono strong text-down text-base">271</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-muted strong">Unchanged</span>
                <span class="mono strong text-main text-base">143</span>
              </div>
            </div>
            <div class="mt-4 pt-4" style="border-top:1px solid var(--border-subtle);">
              <div class="text-xs text-dim mb-2 strong uppercase" style="letter-spacing:0.05em;">BULLISH BIAS</div>
              <div style="height:6px; background:rgba(255,255,255,0.05); border-radius:3px; display:flex; overflow:hidden;">
                <div style="width:55%; background:var(--primary-color); border-radius:3px; box-shadow: 0 0 10px rgba(16,185,129,0.5);"></div>
                <div style="width:45%; background:transparent; border-radius:3px;"></div>
              </div>
            </div>
          </div>

          <div class="panel flex-col">
            <h3 class="text-xs uppercase text-dim strong mb-4 border-b pb-2" style="border-bottom:1px solid var(--border-subtle); letter-spacing:0.08em;">Most Active</h3>
            <div class="flex-col gap-1">
              <div class="flex justify-between items-center p-2 hover-bg" style="border-radius:8px;"><span class="mono strong text-main">GOTO</span><span class="mono text-sm text-muted">1.2B</span></div>
              <div class="flex justify-between items-center p-2 hover-bg" style="border-radius:8px;"><span class="mono strong text-main">BUMI</span><span class="mono text-sm text-muted">840M</span></div>
              <div class="flex justify-between items-center p-2 hover-bg" style="border-radius:8px;"><span class="mono strong text-main">BRMS</span><span class="mono text-sm text-muted">610M</span></div>
              <div class="flex justify-between items-center p-2 hover-bg" style="border-radius:8px;"><span class="mono strong text-main">DOID</span><span class="mono text-sm text-muted">450M</span></div>
            </div>
          </div>

          <div class="panel flex-col accent-top" style="flex:1;">
            <h3 class="text-xs uppercase strong mb-4 flex items-center gap-2" style="color:#a5b4fc; letter-spacing:0.05em;"><i data-lucide="zap" style="width:14px;"></i> Intelligence Notes</h3>
            <div class="flex-col gap-3 text-sm text-muted">
              <div class="p-3" style="background:rgba(255,255,255,0.02); border-radius:var(--radius-md); border:1px solid var(--border-subtle); border-left:2px solid var(--accent-indigo);">
                Big banks leading the index weight today. Foreign net buy focused heavily on BBCA & BMRI.
              </div>
              <div class="p-3" style="background:rgba(255,255,255,0.02); border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
                Energy sector showing momentum bounce following overnight oil price surge.
              </div>
              <div class="p-3" style="background:rgba(255,255,255,0.02); border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
                Tech sector consolidation continues, volume drying up on key constituents like GOTO and BUKA.
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
    observeElements();
    if (typeof lucide !== 'undefined') lucide.createIcons();
}
