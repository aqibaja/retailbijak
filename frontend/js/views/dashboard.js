import { fetchNews } from '../api.js';

export async function renderDashboard(root) {
    root.innerHTML = `
        <div class="dashboard-header flex-between mb-4">
            <h1>Dashboard Overview</h1>
            <div class="date-display" style="color:var(--color-text-muted); font-size:14px;">
                ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
        </div>

        <div class="dashboard-grid">
            <!-- ROW 1: KPIs -->
            <div class="kpi-row">
                ${renderKPICard('IHSG', '7,284.52', '+0.42', true)}
                ${renderKPICard('LQ45', '1,043.18', '-0.18', false)}
                ${renderKPICard('IDX30', '512.76', '+0.65', true)}
                ${renderKPICard('KOMPAS100', '1,189.33', '+0.21', true)}
            </div>

            <!-- ROW 2: Chart & Movers -->
            <div class="split-row">
                <div class="card chart-panel">
                    <div class="flex-between mb-4">
                        <h2 style="margin:0">IHSG (Jakarta Composite Index)</h2>
                        <div class="chip neutral">1D</div>
                    </div>
                    <div style="position: relative; height: 250px; width: 100%;">
                        <canvas id="ihsgChart"></canvas>
                    </div>
                </div>
                <div class="card movers-panel">
                    <h2>Top Gainers</h2>
                    <div class="movers-list" style="display:flex; flex-direction:column; gap:12px;">
                        ${renderMoverRow('GOTO', 'GoTo Gojek Tokopedia', '96', '+9.09')}
                        ${renderMoverRow('BRPT', 'Barito Pacific', '1,200', '+5.20')}
                        ${renderMoverRow('BBCA', 'Bank Central Asia', '9,800', '+3.15')}
                        ${renderMoverRow('TLKM', 'Telkom Indonesia', '3,420', '+2.50')}
                        ${renderMoverRow('ASII', 'Astra International', '5,300', '+1.92')}
                        ${renderMoverRow('ANTM', 'Aneka Tambang', '1,920', '+1.50')}
                    </div>
                </div>
            </div>

            <!-- ROW 3: Watchlist, Portfolio, News -->
            <div class="three-col-row">
                <div class="card">
                    <div class="flex-between mb-4">
                        <h2 style="margin:0">Watchlist</h2>
                        <button class="icon-btn" title="Add to Watchlist"><i data-lucide="plus"></i></button>
                    </div>
                    <div class="watchlist-mini">
                        ${renderWatchlistRow('BBRI', '4,850', '-1.20', false)}
                        ${renderWatchlistRow('UNVR', '2,900', '+0.50', true)}
                        ${renderWatchlistRow('PGAS', '1,350', '+2.10', true)}
                        ${renderWatchlistRow('BUMI', '120', '-3.50', false)}
                    </div>
                </div>
                
                <div class="card" style="text-align:center;">
                    <h2 style="text-align:left; margin-bottom:16px;">Portfolio Summary</h2>
                    <div style="font-size:12px; color:var(--color-text-muted)">Total Value</div>
                    <div class="price positive" style="font-size:32px; font-weight:700; margin:4px 0;">Rp 145.2M</div>
                    <div class="chip success mb-4">+ Rp 2.4M (1.68%) Today</div>
                    
                    <div style="height:150px; position:relative; width:150px; margin:0 auto;">
                        <canvas id="portfolioDonut"></canvas>
                    </div>
                </div>

                <div class="card">
                    <div class="flex-between mb-4">
                        <h2 style="margin:0">Market News</h2>
                        <button class="btn btn-outline" style="padding:4px 8px; font-size:11px;">View All</button>
                    </div>
                    <div id="news-container" style="display:flex; flex-direction:column; gap:16px;">
                        <div class="skeleton skeleton-text"></div>
                        <div class="skeleton skeleton-text"></div>
                        <div class="skeleton skeleton-text"></div>
                    </div>
                </div>
            </div>
            
            <!-- ROW 4: Sector Heatmap -->
            <div class="card">
                <h2>Sector Heatmap</h2>
                <div class="heatmap-grid" style="display:grid; grid-template-columns:repeat(5, 1fr); gap:8px; margin-top:16px; height: 120px;">
                    <div style="background:var(--color-success); border-radius:8px; padding:12px; color:white;">
                        <div style="font-size:12px;">Finance</div>
                        <div class="mono" style="font-size:16px; font-weight:bold;">+1.2%</div>
                    </div>
                    <div style="background:var(--color-danger); border-radius:8px; padding:12px; color:white;">
                        <div style="font-size:12px;">Tech</div>
                        <div class="mono" style="font-size:16px; font-weight:bold;">-2.4%</div>
                    </div>
                    <div style="background:var(--color-primary-highlight); border-radius:8px; padding:12px; color:var(--color-primary-active);">
                        <div style="font-size:12px;">Consumer</div>
                        <div class="mono" style="font-size:16px; font-weight:bold;">+0.3%</div>
                    </div>
                    <div style="background:var(--color-danger-bg); border-radius:8px; padding:12px; color:var(--color-danger);">
                        <div style="font-size:12px;">Property</div>
                        <div class="mono" style="font-size:16px; font-weight:bold;">-0.8%</div>
                    </div>
                    <div style="background:var(--color-success); border-radius:8px; padding:12px; color:white;">
                        <div style="font-size:12px;">Energy</div>
                        <div class="mono" style="font-size:16px; font-weight:bold;">+1.8%</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    lucide.createIcons();
    initDashboardCharts();
    loadNews();
}

function renderKPICard(title, val, change, isPositive) {
    const colorClass = isPositive ? 'success' : 'danger';
    const icon = isPositive ? '▲' : '▼';
    return `
        <div class="card kpi-card">
            <div class="kpi-title">${title}</div>
            <div class="kpi-value">${val}</div>
            <div class="kpi-change ${colorClass}">
                ${icon} ${change}%
            </div>
            <!-- Fake sparkline -->
            <svg class="kpi-sparkline" viewBox="0 0 60 30" preserveAspectRatio="none">
                <path d="${isPositive ? 'M0,25 Q15,10 30,20 T60,5' : 'M0,5 Q15,20 30,10 T60,25'}" 
                      fill="none" stroke="var(--color-${colorClass})" stroke-width="2" stroke-linecap="round"/>
            </svg>
        </div>
    `;
}

function renderMoverRow(ticker, name, price, change) {
    const isPositive = change.startsWith('+');
    return `
        <div class="flex-between" style="padding:4px 0;">
            <div style="display:flex; align-items:center; gap:12px;">
                <div class="chip neutral" style="width:48px; justify-content:center;">${ticker}</div>
                <div>
                    <div style="font-weight:500;">${name}</div>
                    <div class="mono price" style="font-size:12px; color:var(--color-text-muted)">Rp ${price}</div>
                </div>
            </div>
            <div class="chip ${isPositive ? 'success' : 'danger'}">${change}%</div>
        </div>
    `;
}

function renderWatchlistRow(ticker, price, change, isPositive) {
    return `
        <div class="flex-between" style="padding:12px 0; border-bottom:1px solid var(--color-divider);">
            <div>
                <a href="#stock/${ticker}" style="font-weight:600; text-decoration:none;" class="mono">${ticker}</a>
            </div>
            <div style="text-align:right;">
                <div class="mono price">${price}</div>
                <div class="mono change ${isPositive ? 'positive' : 'negative'}" style="font-size:12px;">${change}%</div>
            </div>
        </div>
    `;
}

async function loadNews() {
    const container = document.getElementById('news-container');
    if (!container) return;
    
    const res = await fetchNews(5);
    if (!res || res.data.length === 0) {
        container.innerHTML = '<p style="color:var(--color-text-muted)">No recent news available.</p>';
        return;
    }
    
    container.innerHTML = res.data.map(n => {
        const date = n.published_at ? new Date(n.published_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
        return `
            <a href="${n.link}" target="_blank" style="display:block;">
                <div style="font-size:11px; color:var(--color-text-faint); margin-bottom:4px;">${n.source} • ${date}</div>
                <div style="font-weight:500; font-size:13px; line-height:1.4; color:var(--color-text)">${n.title}</div>
            </a>
        `;
    }).join('<div style="height:1px; background:var(--color-divider)"></div>');
}

function initDashboardCharts() {
    // Check if Chart is available (loaded via CDN)
    if (typeof Chart === 'undefined') return;

    // Line Chart
    const ctxIHSG = document.getElementById('ihsgChart');
    if (ctxIHSG) {
        new Chart(ctxIHSG, {
            type: 'line',
            data: {
                labels: ['10:00', '11:00', '13:00', '14:00', '15:00', '16:00'],
                datasets: [{
                    label: 'IHSG',
                    data: [7250, 7265, 7240, 7270, 7280, 7284.52],
                    borderColor: '#0F7B43',
                    backgroundColor: 'rgba(15, 123, 67, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false } },
                    y: { position: 'right', grid: { color: 'rgba(200,200,200,0.1)' } }
                }
            }
        });
    }

    // Donut Chart
    const ctxDonut = document.getElementById('portfolioDonut');
    if (ctxDonut) {
        new Chart(ctxDonut, {
            type: 'doughnut',
            data: {
                labels: ['Banking', 'Tech', 'Consumer', 'Mining'],
                datasets: [{
                    data: [45, 25, 20, 10],
                    backgroundColor: ['#0F7B43', '#18A058', '#3DD68C', '#C8E6D3'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: { legend: { display: false } }
            }
        });
    }
}
