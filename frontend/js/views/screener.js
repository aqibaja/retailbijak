import { getScanEventSourceUrl, showToast } from '../api.js';
import { animateCards, animateTableRows } from '../main.js';

export async function renderScreener(root) {
    root.innerHTML = `
      <section class="grid grid-cols-12 reveal">
        <div class="span-12 card mb-2">
          <div class="flex justify-between items-center">
            <div>
              <h2 class="strong">Institutional Scanner</h2>
              <p class="text-muted">High-precision signal detection engine</p>
            </div>
            <div class="flex gap-2">
              <div class="chip">AUTO-REFRESH: OFF</div>
              <div class="chip">SERVER: READY</div>
            </div>
          </div>
        </div>

        <div class="span-3 flex" style="flex-direction:column; gap:20px;">
          <div class="card">
            <h3 class="strong mb-4">Parameters</h3>
            <div class="flex" style="flex-direction:column; gap:16px;">
              <div>
                <label class="text-muted" style="font-size:10px; text-transform:uppercase; display:block; margin-bottom:6px;">Algorithm</label>
                <select id="screener-strategy" class="btn" style="width:100%; text-align:left; background:var(--bg-elevated);">
                  <option>retailbijak Momentum</option>
                  <option disabled>Trend Following (Pro)</option>
                </select>
              </div>
              <div>
                <label class="text-muted" style="font-size:10px; text-transform:uppercase; display:block; margin-bottom:6px;">Timeframe</label>
                <select id="screener-tf" class="btn" style="width:100%; text-align:left; background:var(--bg-elevated);">
                  <option value="1d">Daily (1D)</option>
                  <option value="1h">1 Hour (H1)</option>
                </select>
              </div>
              <button id="btn-run-screener" class="btn btn-primary" style="width:100%; margin-top:8px;">Execute Scan</button>
            </div>
          </div>

          <div id="screener-progress" class="card" style="display:none; padding:16px; background:var(--bg-elevated);">
            <div class="flex justify-between mb-2">
              <span id="sp-text" style="font-size:11px;">Scanning...</span>
              <span id="sp-percent" class="mono" style="font-size:11px;">0%</span>
            </div>
            <div style="height:2px; background:var(--border-strong); border-radius:99px; overflow:hidden;">
              <div id="sp-fill" style="height:100%; width:0%; background:var(--up); transition:width 0.3s ease;"></div>
            </div>
          </div>
        </div>

        <div class="span-9 card">
          <div class="flex justify-between items-center mb-4">
            <h3 class="strong">Scan Results</h3>
            <div class="chip" id="screener-count">0 MATCHES</div>
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
                  <th>SL %</th>
                  <th>Signal</th>
                </tr>
              </thead>
              <tbody id="screener-tbody">
                <tr><td colspan="7" class="text-muted" style="text-align:center; padding:60px;">Execute scan to retrieve institutional signals.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>`;

    animateCards('.card');
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
    btn.textContent = 'EXECUTING...';
    tbody.innerHTML = '';
    progBox.style.display = 'block';
    let matchCount = 0;

    const eventSource = new EventSource(getScanEventSourceUrl(tf));
    
    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'progress') {
            progText.textContent = `Analysing ${data.ticker}...`;
            progPercent.textContent = `${data.percent}%`;
            progFill.style.width = `${data.percent}%`;
        } else if (data.type === 'result') {
            matchCount += 1;
            countBadge.textContent = `${matchCount} MATCHES`;
            const r = data.data;
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td><a href="#stock/${r.ticker}" class="mono strong text-up">${r.ticker}</a></td>
              <td class="mono">Rp ${r.close.toLocaleString()}</td>
              <td class="mono text-muted">${r.magic_line.toFixed(1)}</td>
              <td class="mono text-muted">${r.cci.toFixed(1)}</td>
              <td class="mono text-down">${r.stop_loss.toLocaleString()}</td>
              <td class="mono text-down">${r.sl_pct.toFixed(2)}%</td>
              <td><span class="chip chip-up">LONG</span></td>`;
            tbody.appendChild(tr);
        } else if (data.type === 'done') {
            btn.disabled = false;
            btn.textContent = 'Execute Scan';
            eventSource.close();
            animateTableRows(tbody);
            showToast(`Scan complete: ${matchCount} signals detected`, 'success');
            if (matchCount === 0) tbody.innerHTML = `<tr><td colspan="7" class="text-muted" style="text-align:center; padding:60px;">No institutional signals detected in this timeframe.</td></tr>`;
        }
    };
    
    eventSource.onerror = () => {
        btn.disabled = false;
        btn.textContent = 'Execute Scan';
        eventSource.close();
        showToast('Scanner connection lost', 'error');
    };
}
