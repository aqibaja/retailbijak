import { getScanEventSourceUrl, showToast, fetchSettings } from '../api.js';
import { animateCards, animateTableRows } from '../main.js';

let autoRefreshTimer = null;

export async function renderScreener(root) {
    root.innerHTML = `
      <section class="section-grid reveal">
        <div class="card mb-4">
          <div class="flex-between">
            <div>
              <h1 class="mb-2">Stock Screener</h1>
              <p class="muted">Cari setup teknikal yang layak dieksekusi. Fokus pada momentum dan volume.</p>
            </div>
            <button id="btn-run-screener-mobile" class="btn btn-primary">Run Screener</button>
          </div>
        </div>

        <div class="grid grid-1-2">
          <div class="card">
            <h3 class="mb-4">Filters</h3>
            <div style="display:flex; flex-direction:column; gap:20px;">
              <div>
                <label class="muted" style="font-size:11px; text-transform:uppercase; font-weight:700; display:block; margin-bottom:8px;">Strategy</label>
                <select id="screener-strategy" class="btn btn-outline" style="width:100%; text-align:left; justify-content:space-between;">
                  <option>retailbijak Momentum</option>
                  <option disabled>Golden Cross (Pro)</option>
                  <option disabled>RSI Oversold (Pro)</option>
                </select>
              </div>

              <div>
                <label class="muted" style="font-size:11px; text-transform:uppercase; font-weight:700; display:block; margin-bottom:8px;">Timeframe</label>
                <select id="screener-tf" class="btn btn-outline" style="width:100%; text-align:left;">
                  <option value="1d">Daily (1D)</option>
                  <option value="1h">1 Hour (H1)</option>
                  <option value="4h">4 Hours (H4)</option>
                </select>
              </div>

              <div>
                <label class="muted" style="font-size:11px; text-transform:uppercase; font-weight:700; display:block; margin-bottom:8px;">Preset</label>
                <div style="display:flex; gap:8px;">
                  <button class="chip success">Breakout</button>
                  <button class="chip">Trend</button>
                  <button class="chip">Reversion</button>
                </div>
              </div>

              <button id="btn-run-screener" class="btn btn-primary" style="width:100%; margin-top:12px;">Run Full Scan</button>
              
              <div id="screener-progress" style="display:none; margin-top:12px;">
                <div class="flex-between mb-2">
                  <span id="sp-text" style="font-size:12px;">Scanning...</span>
                  <span id="sp-percent" class="mono" style="font-size:12px;">0%</span>
                </div>
                <div style="height:4px; background:var(--surface-3); border-radius:99px; overflow:hidden;">
                  <div id="sp-fill" style="height:100%; width:0%; background:var(--primary); transition:width 0.3s ease;"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="flex-between mb-4">
              <h2 class="mb-0">Results</h2>
              <div class="chip" id="screener-count">0 matches</div>
            </div>
            
            <div class="data-table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Price</th>
                    <th>Magic Line</th>
                    <th>CCI</th>
                    <th>Stop Loss</th>
                    <th>Signal</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody id="screener-tbody">
                  <tr><td colspan="7" class="muted" style="text-align:center; padding:40px;">Select filters and run screener to see results.</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>`;

    lucide.createIcons();
    animateCards('.card');

    root.querySelector('#btn-run-screener').addEventListener('click', runScreener);
    root.querySelector('#btn-run-screener-mobile').addEventListener('click', runScreener);
}

function runScreener() {
    const tf = document.getElementById('screener-tf').value;
    const btn = document.getElementById('btn-run-screener');
    const btnMobile = document.getElementById('btn-run-screener-mobile');
    const tbody = document.getElementById('screener-tbody');
    const progBox = document.getElementById('screener-progress');
    const progText = document.getElementById('sp-text');
    const progPercent = document.getElementById('sp-percent');
    const progFill = document.getElementById('sp-fill');
    const countBadge = document.getElementById('screener-count');

    [btn, btnMobile].forEach(b => { if (b) { b.disabled = true; b.textContent = 'Scanning...'; } });
    tbody.innerHTML = '';
    progBox.style.display = 'block';
    let matchCount = 0;
    countBadge.textContent = '0 matches';

    const eventSource = new EventSource(getScanEventSourceUrl(tf));
    
    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'progress') {
            progText.textContent = `Scanning ${data.ticker}...`;
            progPercent.textContent = `${data.percent}%`;
            progFill.style.width = `${data.percent}%`;
        } else if (data.type === 'result') {
            matchCount += 1;
            countBadge.textContent = `${matchCount} matches`;
            const r = data.data;
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td><a href="#stock/${r.ticker}" class="mono strong">${r.ticker}</a></td>
              <td class="mono">Rp ${r.close.toLocaleString()}</td>
              <td class="mono muted">${r.magic_line.toFixed(1)}</td>
              <td class="mono muted">${r.cci.toFixed(1)}</td>
              <td class="mono negative">${r.stop_loss.toLocaleString()}</td>
              <td><span class="chip success">BUY</span></td>
              <td style="text-align:right">
                <a href="#stock/${r.ticker}" class="btn btn-outline" style="padding:4px 8px;"><i data-lucide="chevron-right"></i></a>
              </td>`;
            tbody.appendChild(tr);
            lucide.createIcons({ root: tr });
        } else if (data.type === 'done') {
            [btn, btnMobile].forEach(b => { if (b) { b.disabled = false; b.textContent = 'Run Full Scan'; } });
            eventSource.close();
            animateTableRows(tbody);
            showToast(`Scan complete: ${matchCount} matches`, 'success');
            if (matchCount === 0) tbody.innerHTML = `<tr><td colspan="7" class="muted" style="text-align:center; padding:40px;">No signals found for this timeframe.</td></tr>`;
        }
    };
    
    eventSource.onerror = () => {
        [btn, btnMobile].forEach(b => { if (b) { b.disabled = false; b.textContent = 'Run Full Scan'; } });
        eventSource.close();
        showToast('Connection error', 'error');
    };
}
