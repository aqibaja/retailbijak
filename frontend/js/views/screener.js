import { getScanEventSourceUrl, showToast, fetchSettings } from '../api.js';
import { animateCards, animateTableRows } from '../main.js';

export async function renderScreener(root) {
    root.innerHTML = `
        <div class="flex-between mb-4">
            <h1>Stock Screener</h1>
        </div>
        
        <div class="split-row" style="grid-template-columns: 280px 1fr;">
            <!-- FILTER PANEL -->
            <div class="card" style="align-self:flex-start;">
                <h3 style="margin-bottom:16px;">Screener Setup</h3>
                
                <div class="mb-4">
                    <label style="display:block; font-size:12px; margin-bottom:4px; font-weight:600; color:var(--text-muted);">Strategy</label>
                    <select style="width:100%; padding:8px; border-radius:var(--radius-md); border:1px solid var(--border); background:var(--surface); color:var(--text); font-size:14px;">
                        <option>SwingAQ Custom (CCI+Magic)</option>
                        <option disabled>Golden Cross (Pro)</option>
                        <option disabled>RSI Oversold (Pro)</option>
                    </select>
                </div>
                
                <div class="mb-4">
                    <label style="display:block; font-size:12px; margin-bottom:4px; font-weight:600; color:var(--text-muted);">Timeframe</label>
                    <select id="screener-tf" style="width:100%; padding:8px; border-radius:var(--radius-md); border:1px solid var(--border); background:var(--surface); color:var(--text); font-size:14px;">
                        <option value="1d">Daily (1D)</option>
                        <option value="1h">1 Hour (H1)</option>
                        <option value="4h">4 Hours (H4)</option>
                        <option value="1wk">Weekly (1W)</option>
                    </select>
                </div>
                
                <hr style="border:0; border-top:1px solid var(--border); margin:16px 0;">
                
                <button id="btn-run-screener" class="btn btn-primary" style="width:100%; justify-content:center;">
                    Run Screener
                </button>
                
                <div id="screener-progress" style="margin-top:16px; display:none;">
                    <div style="font-size:11px; margin-bottom:4px; color:var(--text-muted);" id="sp-text">Scanning... 0%</div>
                    <div style="width:100%; height:4px; background:var(--surface-2); border-radius:var(--radius-full); overflow:hidden;">
                        <div id="sp-fill" style="width:0%; height:100%; background:var(--primary); transition:width 0.2s;"></div>
                    </div>
                </div>
            </div>
            
            <!-- RESULTS TABLE -->
            <div class="card" style="padding:0; overflow:hidden;">
                <div style="padding:16px; border-bottom:1px solid var(--border);" class="flex-between">
                    <h3 style="margin:0;">Results</h3>
                    <div class="chip neutral" id="screener-count">0 matches</div>
                </div>
                <div class="data-table-wrapper" style="max-height:600px; overflow-y:auto;">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Ticker</th>
                                <th>Date</th>
                                <th>Close</th>
                                <th>Magic Line</th>
                                <th>CCI</th>
                                <th>Stop Loss</th>
                                <th>SL %</th>
                                <th>Signal</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody id="screener-tbody">
                            <tr>
                                <td colspan="9" style="text-align:center; padding:40px; color:var(--text-muted);">
                                    Click "Run Screener" to find trading opportunities.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('btn-run-screener').addEventListener('click', runScreener);
    lucide.createIcons();
    animateCards('.card');

    const settings = await fetchSettings();
    if (settings.compact_table_rows) {
        const table = root.querySelector('.data-table');
        if (table) table.classList.add('compact-rows');
    }
}


function runScreener() {
    const tf = document.getElementById('screener-tf').value;
    const btn = document.getElementById('btn-run-screener');
    const tbody = document.getElementById('screener-tbody');
    const progBox = document.getElementById('screener-progress');
    const progText = document.getElementById('sp-text');
    const progFill = document.getElementById('sp-fill');
    const countBadge = document.getElementById('screener-count');
    
    btn.disabled = true;
    btn.textContent = 'Scanning...';
    tbody.innerHTML = '';
    progBox.style.display = 'block';
    let matchCount = 0;
    countBadge.innerText = '0 matches';
    
    const eventSource = new EventSource(getScanEventSourceUrl(tf));
    
    eventSource.onmessage = function(event) {
        const data = JSON.parse(event.data);
        
        if (data.type === 'progress') {
            progText.innerText = `Scanning ${data.ticker}... ${data.percent}%`;
            progFill.style.width = `${data.percent}%`;
        } 
        else if (data.type === 'result') {
            matchCount++;
            countBadge.innerText = `${matchCount} match${matchCount > 1 ? 'es' : ''}`;
            
            const r = data.data;
            const tr = document.createElement('tr');
            tr.style.opacity = '0';
            tr.innerHTML = `
                <td><a href="#stock/${r.ticker}" class="mono" style="font-weight:600;">${r.ticker}</a></td>
                <td class="mono">${r.date.split(' ')[0]}</td>
                <td class="mono">${r.close.toLocaleString()}</td>
                <td class="mono">${r.magic_line.toFixed(2)}</td>
                <td class="mono">${r.cci.toFixed(2)}</td>
                <td class="mono">${r.stop_loss.toFixed(2)}</td>
                <td class="mono negative">${r.sl_pct.toFixed(2)}%</td>
                <td><span class="chip success">BUY</span></td>
                <td>
                    <a href="#stock/${r.ticker}" class="icon-btn" style="display:inline-flex; width:28px; height:28px;" aria-label="View ${r.ticker}">
                        <i data-lucide="eye" style="width:14px;"></i>
                    </a>
                </td>
            `;
            tbody.appendChild(tr);
            lucide.createIcons({root: tr});
            
            // Animate row in
            if (typeof gsap !== 'undefined') {
                gsap.to(tr, { opacity: 1, duration: 0.3, ease: 'power1.out' });
            } else {
                tr.style.opacity = '1';
            }
        }
        else if (data.type === 'done') {
            progText.innerText = `Complete! Found ${data.total_signals} signals in ${data.duration_seconds}s`;
            btn.disabled = false;
            btn.textContent = 'Run Screener';
            eventSource.close();
            showToast(`Scan complete: ${data.total_signals} signals found`, 'success');
            
            if (matchCount === 0) {
                tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:40px; color:var(--text-muted);">No signals found for this timeframe.</td></tr>`;
            }
        }
    };
    
    eventSource.onerror = function() {
        progText.innerText = 'Error connecting to scanner API';
        progFill.style.background = 'var(--danger)';
        btn.disabled = false;
        btn.textContent = 'Run Screener';
        eventSource.close();
        showToast('Connection error. Please try again.', 'error');
    };
}
