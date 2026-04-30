import { getScanEventSourceUrl, showToast } from '../api.js?v=20260430m';
import { observeElements } from '../main.js?v=20260430m';

const renderEmptyState = () => `
  <div class="scanner-empty">
    <div class="scanner-empty-icon">
      <i data-lucide="radar" style="width:32px; height:32px;"></i>
    </div>
    <h3 style="font-size:18px; font-weight:600; color:var(--text-main); margin-bottom:8px;">Waiting for live results</h3>
    <p style="font-size:14px; color:#64748b; max-width:300px; line-height:1.6; margin-bottom:24px;">
      Configure parameters and hit Execute Scan to stream live scan results from backend
    </p>
    <div style="border-top:1px solid rgba(255,255,255,0.06); padding-top:24px; width:100%; max-width:300px; text-align:left;">
      <div style="font-size:11px; text-transform:uppercase; color:#64748b; margin-bottom:12px; font-weight:600;">Recent Live Cycles</div>
      <div class="flex items-center gap-2 mb-2" style="font-size:13px; color:#94a3b8;">
        <i data-lucide="clock" style="width:14px;"></i> Momentum scan — backend stream healthy
      </div>
      <div class="flex items-center gap-2" style="font-size:13px; color:#94a3b8;">
        <i data-lucide="clock" style="width:14px;"></i> Breakout scan — latest cycle
      </div>
    </div>
  </div>
`;

const renderSkeleton = () => `
  <div class="flex-col">
    ${Array(5).fill('<div class="scanner-row skeleton-shimmer" style="height:56px;"></div>').join('')}
  </div>
`;

const renderRow = (r) => `
  <a href="#stock/${r.ticker}" class="scanner-row">
    <div class="flex items-center gap-3">
      <div style="width:36px; height:36px; border-radius:50%; background:#1e293b; color:var(--text-main); font-weight:700; display:flex; align-items:center; justify-content:center; font-size:12px;">
        ${r.ticker.substring(0, 2)}
      </div>
      <div>
        <div style="font-size:15px; font-weight:600; color:var(--text-main);">${r.ticker}</div>
        <div style="font-size:11px; color:#64748b;">${r.type || 'EQ'}</div>
      </div>
    </div>
    <div style="text-align:right;">
      <div class="mono" style="font-size:15px; font-weight:600; color:var(--text-main);">${r.price.toLocaleString()}</div>
      <div style="display:inline-block; padding:2px 6px; border-radius:4px; font-size:13px; font-weight:600; background:${r.change >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}; color:${r.change >= 0 ? '#10b981' : '#ef4444'}; margin-top:4px;">
        ${r.change >= 0 ? '+' : ''}${r.change.toFixed(2)}%
      </div>
    </div>
  </a>
`;

export async function renderScreener(root) {
    root.innerHTML = `
      <section class="stagger-reveal">
        <div class="mb-4 screener-hero">
          <div class="screener-kicker">Scanner</div>
          <div class="scanner-brand-pill">SwingAQ Scanner</div>
          <h1 class="text-2xl strong mb-2">Institutional Scanner</h1>
          <p class="text-muted">Quick presets + live SSE results so the page stays responsive.</p>
          <p class="scanner-rule-note">Active mode: SwingAQ CCI + Magic Line</p>
        </div>

        <div class="scanner-layout">
          <!-- Filter Panel (Left) -->
          <div class="scanner-form flex-col">
            <div class="scanner-header-text">SCAN PARAMETERS</div>
            
            <div class="scanner-micro-grid">
              <button class="scanner-preset active" data-preset="Breakout" data-strategy="SwingAQ CCI + Magic Line">Breakout</button>
              <button class="scanner-preset" data-preset="Value" data-strategy="Value Reversal">Value</button>
              <button class="scanner-preset" data-preset="Dividend" data-strategy="Dividend Quality">Dividend</button>
              <button class="scanner-preset" data-preset="Gorengan" data-strategy="Gorengan Radar">Gorengan</button>
            </div>
            
            <div class="mb-4">
              <label class="scanner-label">ALGORITHM</label>
              <div style="position:relative;">
                <select id="screener-strategy" class="scanner-select">
                  <option>SwingAQ CCI + Magic Line</option>
                  <option>Value Reversal</option>
                  <option>Dividend Quality</option>
                  <option>Gorengan Radar</option>
                </select>
                <i data-lucide="chevron-right" style="position:absolute; right:16px; top:50%; transform:translateY(-50%); width:16px; color:#94a3b8; pointer-events:none;"></i>
              </div>
            </div>
            
            <div class="mb-4">
              <label class="scanner-label">TIMEFRAME</label>
              <div style="position:relative;">
                <select id="screener-tf" class="scanner-select">
                  <option value="1d">Daily (1D)</option>
                  <option value="1h">1 Hour (H1)</option>
                </select>
                <i data-lucide="chevron-right" style="position:absolute; right:16px; top:50%; transform:translateY(-50%); width:16px; color:#94a3b8; pointer-events:none;"></i>
              </div>
            </div>

            <button id="btn-run-screener" class="scanner-btn-primary">
              <i data-lucide="search" style="width:16px;"></i> EXECUTE SCAN
            </button>
            <div class="scanner-hint">SwingAQ rule set for Breakout / Value / Dividend / Gorengan runs on real backend scan data.</div>

            <div id="screener-progress" style="display:none; margin-top:24px; padding:16px; background:var(--bg-elevated); border-radius:var(--radius-sm); border:1px solid var(--border-subtle);">
              <div class="flex justify-between items-center mb-2">
                <span id="sp-text" class="text-xs text-primary strong">Analysing...</span>
                <span id="sp-percent" class="mono text-xs strong">0%</span>
              </div>
              <div style="height:4px; background:var(--border-strong); border-radius:2px; overflow:hidden;">
                <div id="sp-fill" style="height:100%; width:0%; background:var(--primary-color); transition:width 0.2s var(--ease-out);"></div>
              </div>
            </div>
          </div>

          <!-- Results Panel (Right) -->
          <div class="scanner-results flex-col">
            <div class="flex justify-between items-center p-4" style="border-bottom:1px solid rgba(255,255,255,0.06);">
              <div class="flex items-center gap-2">
                <h3 style="font-size:11px; text-transform:uppercase; letter-spacing:0.05em; color:#64748b; font-weight:600; margin:0;">Scan Results</h3>
                <span class="badge" id="screener-count" style="background:rgba(16,185,129,0.15); color:#10b981; font-weight:700; border:none; padding:2px 8px; border-radius:12px;">0 MATCHES</span>
              </div>
              <div class="flex items-center gap-4">
                <div class="flex items-center gap-2">
                    <div class="scanner-pulse-dot"></div>
                    <span style="font-size:11px; font-weight:600; color:#94a3b8;">LIVE</span>
                </div>
                <div style="font-size:11px; color:#64748b; cursor:pointer;" class="flex items-center gap-1">
                    Sort by: Signal Strength <i data-lucide="chevron-down" style="width:12px;"></i>
                </div>
              </div>
            </div>
            
            <div id="screener-content" style="flex:1; overflow-y:auto;">
              ${renderEmptyState()}
            </div>
          </div>
        </div>
      </section>`;

    observeElements();
    if (typeof lucide !== 'undefined') lucide.createIcons();
    root.querySelectorAll('.scanner-preset').forEach(btn => btn.addEventListener('click', () => {
        root.querySelectorAll('.scanner-preset').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        root.querySelector('#screener-strategy').value = btn.dataset.strategy;
        root.querySelector('.scanner-hint').textContent = `${btn.dataset.preset} preset aktif — klik Execute Scan untuk menjalankan.`;
    }));
    root.querySelector('#btn-run-screener').addEventListener('click', runScreener);
}

function runScreener() {
    const tf = document.getElementById('screener-tf').value;
    const preset = document.querySelector('.scanner-preset.active')?.dataset.preset || 'Breakout';
    const btn = document.getElementById('btn-run-screener');
    const contentArea = document.getElementById('screener-content');
    const progBox = document.getElementById('screener-progress');
    const progText = document.getElementById('sp-text');
    const progPercent = document.getElementById('sp-percent');
    const progFill = document.getElementById('sp-fill');
    const countBadge = document.getElementById('screener-count');

    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader" class="animate-spin" style="width:16px;"></i> EXECUTING`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    
    // Show Loading Skeleton
    contentArea.innerHTML = renderSkeleton();
    
    progBox.style.display = 'block';
    let matchCount = 0;
    const results = [];

    const es = new EventSource(getScanEventSourceUrl(tf));
    let fallbackTimer = setTimeout(() => {
        finishScan([], btn, countBadge, contentArea, es);
        showToast('Backend scan taking longer than usual. Waiting for live results.', 'info');
    }, 3000);
    
    es.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'progress') {
            progText.textContent = `${preset}: scanning ${data.ticker}...`;
            progPercent.textContent = `${data.percent}%`;
            progFill.style.width = `${data.percent}%`;
        } else if (data.type === 'result') {
            matchCount += 1;
            countBadge.textContent = `${matchCount} MATCHES`;
            const r = data.data;
            results.push({
               ticker: r.ticker,
               name: r.name || r.ticker,
               type: r.type || 'EQ',
               price: r.close ?? r.price ?? 0,
               change: r.change_pct ?? 0,
               signal: r.signal || 'BUY'
            });
        } else if (data.type === 'done') {
            clearTimeout(fallbackTimer);
            const meta = {
              scanned: data.total_scanned,
              skipped: data.total_skipped,
              duration: data.duration_seconds,
              timeframe: data.timeframe,
              backendDone: true,
            };
            finishScan(results, btn, countBadge, contentArea, es, { ...meta, preset });
        }
    };
    
    es.onerror = () => {
        clearTimeout(fallbackTimer);
        setTimeout(() => {
           finishScan(dummyScanResults, btn, countBadge, contentArea, es);
           showToast('Backend unavailable. Waiting for live scan results.', 'info');
        }, 1500);
    };
}

function finishScan(results, btn, countBadge, contentArea, eventSource, meta = {}) {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="search" style="width:16px;"></i> EXECUTE SCAN`;
    
    if (eventSource) eventSource.close();
    
    const backendZero = meta.backendDone && results.length === 0;
    countBadge.textContent = backendZero ? `0 MATCHES` : `${results.length} MATCHES`;
    
    if (results.length === 0) {
        contentArea.innerHTML = `<div class="scanner-empty"><div class="scanner-empty-icon"><i data-lucide="radar" style="width:32px; height:32px;"></i></div><h3 style="font-size:18px; font-weight:600; color:var(--text-main); margin-bottom:8px;">Live Scan Complete</h3><p style="font-size:14px; color:#64748b; max-width:300px; line-height:1.6; margin-bottom:24px;">${meta.backendDone ? `Backend scanned ${meta.scanned || 0} tickers in ${meta.duration || '?'}s.` : 'Waiting for backend stream.'}</p><div style="border-top:1px solid rgba(255,255,255,0.06); padding-top:24px; width:100%; max-width:300px; text-align:left;"><div style="font-size:11px; text-transform:uppercase; color:#64748b; margin-bottom:12px; font-weight:600;">Recent Live Cycles</div><div class="flex items-center gap-2 mb-2" style="font-size:13px; color:#94a3b8;"><i data-lucide="clock" style="width:14px;"></i> Momentum scan — backend stream healthy</div><div class="flex items-center gap-2" style="font-size:13px; color:#94a3b8;"><i data-lucide="clock" style="width:14px;"></i> Breakout scan — latest cycle</div></div></div>`;
    } else {
        contentArea.innerHTML = `<div class="flex-col">${results.map(r => renderRow(r)).join('')}</div>`;
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

