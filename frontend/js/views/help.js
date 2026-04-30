import { observeElements } from '../main.js';

export function renderHelp(root) {
    root.innerHTML = `
      <section class="grid grid-cols-12 stagger-reveal">
        <div class="col-span-12 flex justify-between items-end mb-6">
          <div>
            <h1 class="text-3xl mb-2" style="color:var(--text-main); letter-spacing:-0.04em; font-weight:800;">Help Center</h1>
            <p class="text-base" style="color:var(--text-muted);">Documentation and operational workflows</p>
          </div>
          <div class="badge" style="background:rgba(255,255,255,0.05); color:var(--text-muted);">MANUAL</div>
        </div>

        <div class="col-span-8 panel flex-col gap-6">
            <h2 class="text-xs uppercase text-dim strong border-b pb-3" style="border-bottom:1px solid var(--border-subtle); letter-spacing:0.08em;">Quick Start Guide</h2>
            <div class="flex-col gap-4">
                <div class="flex gap-4 p-5" style="background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.04); border-radius:12px; transition:transform 0.2s;">
                    <div class="mono text-2xl strong text-dim" style="color:rgba(255,255,255,0.2);">01</div>
                    <div>
                        <h3 class="strong text-base mb-1 text-main">Configure Scanner</h3>
                        <p class="text-sm text-muted" style="line-height:1.6;">Open the Scanner view and select your preferred timeframe and institutional algorithm.</p>
                    </div>
                </div>
                <div class="flex gap-4 p-5" style="background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.04); border-radius:12px; transition:transform 0.2s;">
                    <div class="mono text-2xl strong text-dim" style="color:rgba(255,255,255,0.2);">02</div>
                    <div>
                        <h3 class="strong text-base mb-1 text-main">Analyze Signals</h3>
                        <p class="text-sm text-muted" style="line-height:1.6;">Execute the scan and click on any ticker in the result table to open its detailed breakdown.</p>
                    </div>
                </div>
                <div class="flex gap-4 p-5" style="background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.04); border-radius:12px; transition:transform 0.2s;">
                    <div class="mono text-2xl strong text-dim" style="color:rgba(255,255,255,0.2);">03</div>
                    <div>
                        <h3 class="strong text-base mb-1 text-main">Manage Portfolio</h3>
                        <p class="text-sm text-muted" style="line-height:1.6;">Save promising tickers to your Watchlist or execute simulated trades in the Portfolio view.</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="col-span-4 panel flex-col justify-center items-center text-center" style="background:rgba(99,102,241,0.05); min-height:300px; border-color:rgba(99,102,241,0.2);">
            <div style="width:56px; height:56px; background:linear-gradient(135deg, #6366f1, #4f46e5); border-radius:16px; display:grid; place-items:center; color:var(--text-main); box-shadow:0 12px 32px rgba(99,102,241,0.4); margin-bottom:24px;">
                <i data-lucide="life-buoy" style="width:24px; height:24px;"></i>
            </div>
            <h3 class="strong text-lg mb-2 text-main">Need Support?</h3>
            <p class="text-sm text-muted mb-6" style="line-height:1.6;">Our institutional support desk is available 24/7 for technical inquiries.</p>
            <button class="btn btn-primary" style="width:100%; height:48px; background:linear-gradient(135deg, #6366f1, #4f46e5); box-shadow:0 0 20px rgba(99,102,241,0.3);">Contact Support</button>
        </div>
      </section>
    `;
    observeElements();
    if (typeof lucide !== 'undefined') lucide.createIcons();
}
