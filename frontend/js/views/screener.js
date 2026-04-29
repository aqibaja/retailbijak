import { getScanEventSourceUrl, showToast } from '../api.js';
import { animateCards, animateTableRows } from '../main.js';

export async function renderScreener(root) {
    root.innerHTML = `
      <section class="reveal">
        <div class="card mb-6">
          <div class="flex justify-between items-center">
            <div>
              <h1 style="font-size: 24px; font-weight: 700;">Stock Screener</h1>
              <p style="color: var(--text-muted); font-size: 14px;">Institutional signal detection engine</p>
            </div>
            <button id="btn-run-screener" class="btn btn-primary">Execute Full Scan</button>
          </div>
        </div>

        <div class="grid grid-cols-12">
          <!-- Filter Panel -->
          <div class="span-3">
            <div class="card">
              <h3 class="strong mb-4" style="font-size:14px;">Parameters</h3>
              <div class="flex" style="flex-direction:column; gap:20px;">
                <div>
                  <label style="font-size:11px; color:var(--text-muted); display:block; margin-bottom:8px; text-transform:uppercase; font-weight:600;">Strategy</label>
                  <select id="screener-tf" class="btn" style="width:100%; text-align:left; background: rgba(255,255,255,0.02);">
                    <option value="1d">Daily Trend</option>
                    <option value="1h">Hourly Scalping</option>
                  </select>
                </div>
                <div id="screener-progress" style="display:none; padding-top:10px;">
                  <div class="flex justify-between mb-2">
                    <span id="sp-text" style="font-size:11px; color:var(--primary);">Analysing...</span>
                    <span id="sp-percent" class="mono" style="font-size:11px;">0%</span>
                  </div>
                  <div style="height:2px; background:var(--border); border-radius:99px; overflow:hidden;">
                    <div id="sp-fill" style="height:100%; width:0%; background:var(--primary); transition: width 0.3s ease;"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Results Panel -->
          <div class="span-9">
            <div class="card" style="padding:0; overflow:hidden;">
              <div class="flex justify-between items-center" style="padding: 20px 24px; border-bottom: 1px solid var(--border);">
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
                      <th>Signal</th>
                      <th style="text-align:right">Risk</th>
                    </tr>
                  </thead>
                  <tbody id="screener-tbody">
                    <tr><td colspan="6" style="text-align:center; padding:80px; color:var(--text-dim);">Execute scan to retrieve market signals.</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
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
    btn.textContent = 'Scanning...';
    tbody.innerHTML = '';
    progBox.style.display = 'block';
    let matchCount = 0;

    const es = new EventSource(getScanEventSourceUrl(tf));
    
    es.onmessage = (event) => {
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
              <td><a href="#stock/${r.ticker}" class="mono strong" style="color:var(--primary);">${r.ticker}</a></td>
              <td class="mono">Rp ${r.close.toLocaleString()}</td>
              <td class="mono" style="color:var(--text-muted);">${r.magic_line.toFixed(1)}</td>
              <td class="mono" style="color:var(--text-muted);">${r.cci.toFixed(1)}</td>
              <td><span class="chip" style="background:rgba(16,185,129,0.1); color:var(--primary); border:none;">BUY</span></td>
              <td class="mono" style="text-align:right; color:var(--danger);">${r.sl_pct.toFixed(1)}%</td>`;
            tbody.appendChild(tr);
        } else if (data.type === 'done') {
            btn.disabled = false;
            btn.textContent = 'Execute Full Scan';
            es.close();
            animateTableRows(tbody);
            showToast(`Scan complete: ${matchCount} signals found`, 'success');
        }
    };
    
    es.onerror = () => {
        btn.disabled = false;
        btn.textContent = 'Execute Full Scan';
        es.close();
        showToast('Scanner error', 'error');
    };
}
