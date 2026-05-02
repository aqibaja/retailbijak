import { observeElements } from '../main.js?v=20260502c';

export function renderHelp(root) {
    root.innerHTML = `
      <section class="help-page-pro stagger-reveal">
        <div class="help-hero">
          <div class="help-hero-copy">
            <div class="help-meta-pill">MANUAL</div>
            <h1>Help Center</h1>
            <p>Dokumentasi ringkas untuk alur kerja scanner, portfolio, dan troubleshooting operasional.</p>
          </div>
          <div class="help-hero-side">
            <div class="help-side-label">Fast path</div>
            <div class="help-side-value">Quick start + support desk</div>
          </div>
        </div>

        <div class="help-layout">
          <div class="help-guide-panel panel flex-col gap-6">
            <h2 class="help-section-title">Quick Start Guide</h2>
            <div class="help-guide-grid">
                <div class="help-step-card">
                    <div class="help-step-index">01</div>
                    <div>
                        <h3>Configure Scanner</h3>
                        <p>Open the Scanner view and select your preferred timeframe and institutional algorithm.</p>
                    </div>
                </div>
                <div class="help-step-card">
                    <div class="help-step-index">02</div>
                    <div>
                        <h3>Analyze Signals</h3>
                        <p>Execute the scan and click on any ticker in the result table to open its detailed breakdown.</p>
                    </div>
                </div>
                <div class="help-step-card">
                    <div class="help-step-index">03</div>
                    <div>
                        <h3>Manage Portfolio</h3>
                        <p>Save promising tickers to your Watchlist or execute simulated trades in the Portfolio view.</p>
                    </div>
                </div>
            </div>
          </div>

          <div class="help-support-panel panel flex-col justify-center items-center text-center">
            <div class="help-support-icon">
                <i data-lucide="life-buoy" style="width:24px; height:24px;"></i>
            </div>
            <h3>Need Support?</h3>
            <p>Our institutional support desk is available 24/7 for technical inquiries.</p>
            <button class="btn btn-primary help-support-btn">Contact Support</button>
          </div>
        </div>
      </section>
    `;
    observeElements();
    if (typeof lucide !== 'undefined') lucide.createIcons();
}
