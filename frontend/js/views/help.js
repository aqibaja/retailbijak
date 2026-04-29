import { observeElements } from '../main.js';

export function renderHelp(root) {
    root.innerHTML = `
      <section class="grid grid-cols-12 stagger-reveal">
        <div class="col-span-12 flex justify-between items-end mb-4">
          <div>
            <h1 class="text-2xl strong mb-2">Help Center</h1>
            <p class="text-muted">Documentation and operational workflows</p>
          </div>
          <div class="badge">MANUAL</div>
        </div>

        <div class="col-span-8 panel flex-col gap-4">
            <h2 class="text-xs uppercase text-muted strong border-b pb-2" style="border-bottom:1px solid var(--border-subtle);">Quick Start Guide</h2>
            <div class="flex-col gap-4 mt-2">
                <div class="flex gap-4 p-4" style="background:var(--bg-elevated); border:1px solid var(--border-subtle); border-radius:var(--radius-sm);">
                    <div class="mono text-xl text-dim">01</div>
                    <div>
                        <h3 class="strong text-sm mb-1 text-main">Configure Scanner</h3>
                        <p class="text-xs text-muted">Open the Scanner view and select your preferred timeframe and institutional algorithm.</p>
                    </div>
                </div>
                <div class="flex gap-4 p-4" style="background:var(--bg-elevated); border:1px solid var(--border-subtle); border-radius:var(--radius-sm);">
                    <div class="mono text-xl text-dim">02</div>
                    <div>
                        <h3 class="strong text-sm mb-1 text-main">Analyze Signals</h3>
                        <p class="text-xs text-muted">Execute the scan and click on any ticker in the result table to open its detailed breakdown.</p>
                    </div>
                </div>
                <div class="flex gap-4 p-4" style="background:var(--bg-elevated); border:1px solid var(--border-subtle); border-radius:var(--radius-sm);">
                    <div class="mono text-xl text-dim">03</div>
                    <div>
                        <h3 class="strong text-sm mb-1 text-main">Manage Portfolio</h3>
                        <p class="text-xs text-muted">Save promising tickers to your Watchlist or execute simulated trades in the Portfolio view.</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="col-span-4 panel flex-col justify-center items-center text-center" style="background:rgba(255,255,255,0.02); min-height:300px;">
            <div style="width:48px; height:48px; background:var(--primary-color); border-radius:12px; display:grid; place-items:center; color:#fff; box-shadow:0 0 24px rgba(59,130,246,0.4); margin-bottom:16px;">
                <i data-lucide="life-buoy"></i>
            </div>
            <h3 class="strong mb-2">Need Support?</h3>
            <p class="text-xs text-muted mb-4">Our institutional support desk is available 24/7 for technical inquiries.</p>
            <button class="btn btn-primary" style="width:100%;">Contact Support</button>
        </div>
      </section>
    `;
    observeElements();
    if (typeof lucide !== 'undefined') lucide.createIcons();
}
