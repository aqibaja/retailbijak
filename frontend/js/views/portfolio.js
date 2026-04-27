export function renderPortfolio(root, activeTab) {
    const isPort = activeTab === 'portfolio';
    
    root.innerHTML = `
        <div class="flex-between mb-4">
            <h1>Holdings & Watchlist</h1>
        </div>
        
        <div style="display:flex; gap:16px; margin-bottom:24px; border-bottom:1px solid var(--color-divider);">
            <a href="#portfolio" style="padding:8px 16px; font-weight:600; border-bottom:2px solid ${isPort ? 'var(--color-primary)' : 'transparent'}; color:${isPort ? 'var(--color-text)' : 'var(--color-text-muted)'}">Portfolio</a>
            <a href="#watchlist" style="padding:8px 16px; font-weight:600; border-bottom:2px solid ${!isPort ? 'var(--color-primary)' : 'transparent'}; color:${!isPort ? 'var(--color-text)' : 'var(--color-text-muted)'}">Watchlist</a>
        </div>
        
        <div id="tab-content">
            ${isPort ? renderPortfolioContent() : renderWatchlistContent()}
        </div>
    `;
    
    lucide.createIcons();
}

function renderPortfolioContent() {
    return `
        <div class="kpi-row mb-4">
            <div class="card kpi-card">
                <div class="kpi-title">Total Portfolio Value</div>
                <div class="kpi-value positive">Rp 145,250,000</div>
                <div class="kpi-change success">▲ 1.68% Today</div>
            </div>
            <div class="card kpi-card">
                <div class="kpi-title">Unrealized P&L</div>
                <div class="kpi-value positive">+Rp 12,400,000</div>
                <div class="kpi-change success">▲ 9.33% All Time</div>
            </div>
            <div class="card kpi-card">
                <div class="kpi-title">Positions</div>
                <div class="kpi-value">5</div>
                <div class="kpi-change neutral">3 Green / 2 Red</div>
            </div>
            <div class="card kpi-card">
                <div class="kpi-title">Cash Balance</div>
                <div class="kpi-value">Rp 25,500,000</div>
                <div class="kpi-change neutral">15% of Total</div>
            </div>
        </div>
        
        <div class="card" style="padding:0; overflow:hidden;">
            <div style="padding:16px; border-bottom:1px solid var(--color-border);" class="flex-between">
                <h3 style="margin:0">Current Holdings</h3>
                <button class="btn btn-primary" style="padding:6px 12px; font-size:12px;"><i data-lucide="plus" style="width:14px;"></i> Add Position</button>
            </div>
            <div class="data-table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Ticker</th>
                            <th>Qty (Lots)</th>
                            <th>Avg Price</th>
                            <th>Last Price</th>
                            <th>Mkt Value</th>
                            <th>Unrealized P&L</th>
                            <th>P&L %</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${renderPortRow('BBCA', 500, 9200, 9800)}
                        ${renderPortRow('TLKM', 200, 3650, 3420)}
                        ${renderPortRow('GOTO', 10000, 88, 96)}
                        ${renderPortRow('ASII', 300, 5100, 5300)}
                        ${renderPortRow('ANTM', 1000, 1840, 1920)}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderPortRow(ticker, lots, avg, last) {
    const qty = lots * 100;
    const mkt = qty * last;
    const cost = qty * avg;
    const pnl = mkt - cost;
    const pct = (pnl / cost) * 100;
    const isPos = pnl >= 0;
    
    return `
        <tr>
            <td><a href="#stock/${ticker}" class="mono" style="font-weight:600">${ticker}</a></td>
            <td class="mono">${lots.toLocaleString()}</td>
            <td class="mono">${avg.toLocaleString()}</td>
            <td class="mono">${last.toLocaleString()}</td>
            <td class="mono">${mkt.toLocaleString()}</td>
            <td class="mono ${isPos ? 'positive' : 'negative'}">${isPos ? '+' : ''}${pnl.toLocaleString()}</td>
            <td><span class="chip ${isPos ? 'success' : 'danger'}">${Math.abs(pct).toFixed(2)}%</span></td>
            <td>
                <button class="icon-btn" style="width:28px; height:28px;"><i data-lucide="more-vertical" style="width:14px;"></i></button>
            </td>
        </tr>
    `;
}

function renderWatchlistContent() {
    return `
        <div class="card" style="padding:0; overflow:hidden;">
            <div style="padding:16px; border-bottom:1px solid var(--color-border);" class="flex-between">
                <h3 style="margin:0">My Watchlist</h3>
                <button class="btn btn-primary" style="padding:6px 12px; font-size:12px;"><i data-lucide="search" style="width:14px;"></i> Find Stock</button>
            </div>
            <div class="data-table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Ticker</th>
                            <th>Company</th>
                            <th>Sector</th>
                            <th>Last Price</th>
                            <th>1D Change</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><a href="#stock/BBRI" class="mono" style="font-weight:600">BBRI</a></td>
                            <td>Bank Rakyat Indonesia</td>
                            <td>Banking</td>
                            <td class="mono">4,850</td>
                            <td><span class="chip danger">-1.20%</span></td>
                            <td><button class="icon-btn" style="width:28px; height:28px; color:var(--color-danger);"><i data-lucide="trash-2" style="width:14px;"></i></button></td>
                        </tr>
                        <tr>
                            <td><a href="#stock/UNVR" class="mono" style="font-weight:600">UNVR</a></td>
                            <td>Unilever Indonesia</td>
                            <td>Consumer</td>
                            <td class="mono">2,900</td>
                            <td><span class="chip success">+0.50%</span></td>
                            <td><button class="icon-btn" style="width:28px; height:28px; color:var(--color-danger);"><i data-lucide="trash-2" style="width:14px;"></i></button></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
}
