export function renderScreener(root) {
    root.innerHTML = `
        <div class="flex-between mb-4">
            <h1>Stock Screener</h1>
        </div>
        
        <div class="split-row" style="grid-template-columns: 280px 1fr;">
            <!-- FILTER PANEL -->
            <div class="card" style="align-self: flex-start;">
                <h3 style="margin-bottom:16px;">Screener Setup</h3>
                
                <div class="mb-4">
                    <label style="display:block; font-size:12px; margin-bottom:4px; font-weight:600">Strategy</label>
                    <select class="form-input" style="width:100%; padding:8px; border-radius:var(--radius-sm); border:1px solid var(--color-border); background:var(--color-surface)">
                        <option>SwingAQ Custom (CCI+Magic)</option>
                        <option disabled>Golden Cross (Pro)</option>
                        <option disabled>RSI Oversold (Pro)</option>
                    </select>
                </div>
                
                <div class="mb-4">
                    <label style="display:block; font-size:12px; margin-bottom:4px; font-weight:600">Timeframe</label>
                    <select id="screener-tf" class="form-input" style="width:100%; padding:8px; border-radius:var(--radius-sm); border:1px solid var(--color-border); background:var(--color-surface)">
                        <option value="1d">Daily (1D)</option>
                        <option value="1h">1 Hour (H1)</option>
                        <option value="4h">4 Hours (H4)</option>
                        <option value="1wk">Weekly (1W)</option>
                    </select>
                </div>
                
                <hr style="border:0; border-top:1px solid var(--color-divider); margin:16px 0;">
                
                <button id="btn-run-screener" class="btn btn-primary" style="width:100%; justify-content:center;">
                    Run Screener
                </button>
                
                <div id="screener-progress" style="margin-top:16px; display:none;">
                    <div style="font-size:11px; margin-bottom:4px;" id="sp-text">Scanning... 0%</div>
                    <div style="width:100%; height:4px; background:var(--color-surface-offset); border-radius:4px; overflow:hidden;">
                        <div id="sp-fill" style="width:0%; height:100%; background:var(--color-primary); transition:width 0.2s;"></div>
                    </div>
                </div>
            </div>
            
            <!-- RESULTS TABLE -->
            <div class="card" style="padding:0; overflow:hidden;">
                <div style="padding:16px; border-bottom:1px solid var(--color-border);" class="flex-between">
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
                                <th>Signal</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody id="screener-tbody">
                            <tr>
                                <td colspan="7" style="text-align:center; padding:40px; color:var(--color-text-muted);">
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
    tbody.innerHTML = '';
    progBox.style.display = 'block';
    let matchCount = 0;
    countBadge.innerText = '0 matches';
    
    const eventSource = new EventSource(`http://127.0.0.1:8000/api/scan?timeframe=${tf}`);
    
    eventSource.onmessage = function(event) {
        const data = JSON.parse(event.data);
        
        if (data.type === 'progress') {
            progText.innerText = `Scanning ${data.ticker}... ${data.percent}%`;
            progFill.style.width = `${data.percent}%`;
        } 
        else if (data.type === 'result') {
            matchCount++;
            countBadge.innerText = `${matchCount} matches`;
            
            const r = data.data;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><a href="#stock/${r.ticker}" class="mono" style="font-weight:600;">${r.ticker}</a></td>
                <td class="mono">${r.date.split(' ')[0]}</td>
                <td class="mono">${r.close}</td>
                <td class="mono">${r.magic_line.toFixed(2)}</td>
                <td class="mono">${r.cci.toFixed(2)}</td>
                <td><span class="chip success">BUY</span></td>
                <td>
                    <a href="#stock/${r.ticker}" class="icon-btn" style="display:inline-flex; width:28px; height:28px;"><i data-lucide="eye" style="width:14px;"></i></a>
                </td>
            `;
            tbody.appendChild(tr);
            lucide.createIcons({root: tr});
        }
        else if (data.type === 'done') {
            progText.innerText = `Complete! Found ${data.total_signals} signals in ${data.duration_seconds}s`;
            btn.disabled = false;
            eventSource.close();
            
            if (matchCount === 0) {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:40px;">No signals found for this timeframe.</td></tr>`;
            }
        }
    };
    
    eventSource.onerror = function() {
        progText.innerText = 'Error connecting to scanner API';
        progFill.style.background = 'var(--color-danger)';
        btn.disabled = false;
        eventSource.close();
    };
}
