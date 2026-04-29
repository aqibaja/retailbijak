import { getScanEventSourceUrl, showToast } from '../api.js';
import { observeElements } from '../main.js';

export async function renderScreener(root) {
    root.innerHTML = `
      <section class="stagger-reveal">
        <div class="mb-4">
          <h1 class="text-2xl strong mb-2">Institutional Scanner</h1>
          <p class="text-muted">High-precision signal detection engine</p>
        </div>

        <div class="scanner-layout">
          <!-- Filter Panel (Left) -->
          <div class="scanner-form flex-col">
            <div class="scanner-header-text">SCAN PARAMETERS</div>
            
            <div class="mb-4">
              <label class="scanner-label">ALGORITHM</label>
              <div style="position:relative;">
                <select id="screener-strategy" class="scanner-select">
                  <option>retailbijak Momentum</option>
                  <option disabled>Trend Following (Pro)</option>
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
            <div class="flex justify-between items-center p-4" style="border-bottom:1px solid var(--border-subtle);">
              <div class="flex items-center gap-2">
                <h3 class="text-xs uppercase text-muted strong">Scan Results</h3>
                <span class="badge" id="screener-count">0 MATCHES</span>
              </div>
              <div class="flex gap-2">
                <div class="scanner-badge-off">AUTO-REFRESH: OFF</div>
                <div class="scanner-badge-status"><div class="scanner-pulse-dot"></div> SERVER: READY</div>
              </div>
            </div>
            
            <div class="table-wrapper" style="flex:1; overflow-y:auto;">
              <table class="table">
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Price</th>
                    <th>Magic Line</th>
                    <th>CCI</th>
                    <th>Stop Loss</th>
                    <th style="text-align:right">Signal</th>
                  </tr>
                </thead>
                <tbody id="screener-tbody">
                  <tr><td colspan="6" class="text-center text-dim" style="padding:80px 0;">Execute scan to retrieve market signals.</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>`;

    observeElements();
    if (typeof lucide !== 'undefined') lucide.createIcons();
    root.querySelector('#btn-run-screener').addEventListener('click', runScreener);
}

function runScreener() {
    const tf = document.getElementById('screener-tf').value;
    const btn = document.getElementById('btn-run-screener');
    const tbody = document.getElementById('screener-tbody');
    const progBox = document.getElementById('screener-progress');
    const progText = document.getElementById('sp-text');
    const progPercent = document.getElementById('sp-percent');
    const progFill = document.getElementById('sp-fill');
    const countBadge = document.getElementById('screener-count');

    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader" class="animate-spin" style="width:16px;"></i> EXECUTING`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    
    tbody.innerHTML = '';
    progBox.style.display = 'block';
    let matchCount = 0;

    const es = new EventSource(getScanEventSourceUrl(tf));
    
    es.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'progress') {
            progText.textContent = `Scanning ${data.ticker}...`;
            progPercent.textContent = `${data.percent}%`;
            progFill.style.width = `${data.percent}%`;
        } else if (data.type === 'result') {
            matchCount += 1;
            countBadge.textContent = `${matchCount} MATCHES`;
            const r = data.data;
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td class="mono strong text-up">
                <a href="#stock/${r.ticker}" class="flex items-center gap-2"><span style="width:20px;height:20px;background:var(--bg-elevated);border-radius:4px;display:grid;place-items:center;font-size:8px;color:var(--text-muted);border:1px solid var(--border-strong);">${r.ticker[0]}</span> ${r.ticker}</a>
              </td>
              <td class="mono text-sm">Rp ${r.close.toLocaleString()}</td>
              <td class="mono text-sm text-muted">${r.magic_line.toFixed(1)}</td>
              <td class="mono text-sm text-muted">${r.cci.toFixed(1)}</td>
              <td class="mono text-sm text-down">${r.stop_loss.toLocaleString()} <span class="text-xs">(${r.sl_pct.toFixed(1)}%)</span></td>
              <td style="text-align:right"><span class="badge badge-up">LONG</span></td>`;
            tbody.appendChild(tr);
        } else if (data.type === 'done') {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="search" style="width:16px;"></i> EXECUTE SCAN`;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            es.close();
            showToast(`Scan complete: ${matchCount} signals detected`, 'success');
            if (matchCount === 0) tbody.innerHTML = `<tr><td colspan="6" class="text-center text-dim" style="padding:80px 0;">No institutional signals detected in this timeframe.</td></tr>`;
        }
    };
    
    es.onerror = () => {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="search" style="width:16px;"></i> EXECUTE SCAN`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        es.close();
        showToast('Scanner connection lost', 'error');
    };
}

