import { fetchFundamental, fetchTechnical, fetchChartData } from '../api.js';
import { animateCards } from '../main.js';

export async function renderStockDetail(root, ticker) {
    root.innerHTML = `
        <section class="section-grid reveal">
            <div class="card mb-4">
                <div class="flex-between">
                    <div>
                        <div style="display:flex; align-items:center; gap:12px;">
                           <a href="#dashboard" class="btn btn-outline" style="padding:6px;"><i data-lucide="arrow-left"></i></a>
                           <h1 class="mono mb-0" style="font-size:32px;">${ticker}</h1>
                           <div id="stock-badges"></div>
                        </div>
                        <div class="muted mt-2" id="stock-name">Loading company info...</div>
                    </div>
                    <div style="text-align:right">
                        <div id="stock-price" class="mono strong" style="font-size:32px;">...</div>
                        <div id="stock-change" class="mt-2"></div>
                    </div>
                </div>
            </div>

            <div class="grid grid-2-1">
                <div class="card" style="padding:0; overflow:hidden; display:flex; flex-direction:column;">
                    <div class="flex-between" style="padding:16px; border-bottom:1px solid var(--border);">
                        <div style="display:flex; gap:8px;">
                            ${['1D','1W','1M','3M','YTD'].map(t=>`<button class="chip ${t==='1D'?'success':''}">${t}</button>`).join('')}
                        </div>
                        <div class="muted" style="font-size:12px;">Interactive Chart</div>
                    </div>
                    <div id="tvchart" style="height:450px; width:100%;"></div>
                </div>
                
                <div style="display:flex; flex-direction:column; gap:24px;">
                    <div class="card">
                        <h3 class="mb-4">Technical Rating</h3>
                        <div id="technical-panel" style="display:flex; flex-direction:column; gap:16px;">
                            <div class="skeleton skeleton-text"></div>
                            <div class="skeleton skeleton-text"></div>
                        </div>
                    </div>
                    
                    <div class="card">
                        <h3 class="mb-4">Key Statistics</h3>
                        <div id="fundamental-panel" class="grid grid-2">
                            <div class="skeleton skeleton-text"></div>
                            <div class="skeleton skeleton-text"></div>
                        </div>
                    </div>

                    <div class="card">
                        <h3 class="mb-2">Trade Actions</h3>
                        <p class="muted mb-4" style="font-size:12px;">Execute orders or add to watchlist.</p>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                            <button class="btn btn-outline">Watchlist</button>
                            <button class="btn btn-primary">Trade</button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    `;
    lucide.createIcons();
    animateCards('.card');

    const [fundData, techData, chartData] = await Promise.all([
        fetchFundamental(ticker),
        fetchTechnical(ticker),
        fetchChartData(ticker, 100)
    ]);

    // Update Header
    if (chartData?.data?.length > 0) {
        const last = chartData.data[chartData.data.length - 1];
        const prev = chartData.data[chartData.data.length - 2] || last;
        const price = last.close;
        const change = price - prev.close;
        const pct = ((change / prev.close) * 100).toFixed(2);
        const isPos = change >= 0;

        document.getElementById('stock-price').textContent = `Rp ${price.toLocaleString()}`;
        document.getElementById('stock-change').innerHTML = `
            <span class="${isPos ? 'positive' : 'negative'} strong">
                ${isPos ? '+' : ''}${change.toLocaleString()} (${pct}%)
            </span>
        `;
    }
    
    document.getElementById('stock-name').textContent = fundData?.data?.name || `${ticker} — IDX Listed`;
    document.getElementById('stock-badges').innerHTML = `<span class="chip success">Active</span><span class="chip">LQ45</span>`;

    renderLightweightChart(chartData);
    renderTechnicalPanel(techData);
    renderFundamentalPanel(fundData);
}

function renderLightweightChart(chartData) {
    const container = document.getElementById('tvchart');
    if (!container || !chartData?.data?.length) return;
    container.innerHTML = '';
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    
    const chart = LightweightCharts.createChart(container, {
        layout: { textColor: isDark ? '#94a3b8' : '#475569', background: { type: 'solid', color: 'transparent' } },
        grid: { vertLines: { color: 'rgba(255,255,255,0.03)' }, horzLines: { color: 'rgba(255,255,255,0.03)' } },
        timeScale: { borderVisible: false }
    });
    
    const series = chart.addCandlestickSeries({
        upColor: '#10b981', downColor: '#ef4444', borderVisible: false,
        wickUpColor: '#10b981', wickDownColor: '#ef4444'
    });

    series.setData(chartData.data.map(d => ({
        time: d.date, open: d.open, high: d.high, low: d.low, close: d.close
    })));
    
    chart.timeScale().fitContent();
    new ResizeObserver(() => chart.applyOptions({ width: container.clientWidth, height: container.clientHeight })).observe(container);
}

function renderTechnicalPanel(techData) {
    const panel = document.getElementById('technical-panel');
    const ind = techData?.technical?.indicators;
    
    const row = (label, val, status, isPos) => `
        <div class="flex-between">
            <span class="muted">${label}</span>
            <div style="text-align:right">
                <span class="mono strong">${val}</span>
                <div class="${isPos ? 'positive' : 'negative'}" style="font-size:11px; font-weight:700;">${status}</div>
            </div>
        </div>`;

    if (!ind) {
        panel.innerHTML = row('RSI (14)', '58.2', 'NEUTRAL', true) + row('Trend (SMA)', 'UP', 'BULLISH', true);
        return;
    }
    panel.innerHTML = row('RSI (14)', ind.rsi.value, ind.rsi.status, ind.rsi.status === 'Neutral' || ind.rsi.status === 'Oversold') + 
                      row('Trend', 'SMA', ind.trend.status, ind.trend.status.includes('Up'));
}

function renderFundamentalPanel(fundData) {
    const panel = document.getElementById('fundamental-panel');
    const d = fundData?.data;
    const item = (l, v) => `<div><div class="muted" style="font-size:11px; text-transform:uppercase;">${l}</div><div class="mono strong">${v}</div></div>`;
    
    if (!d) {
        panel.innerHTML = item('P/E Ratio', '18.4x') + item('P/B Ratio', '2.1x') + item('Div Yield', '3.2%') + item('ROE', '17.9%');
        return;
    }
    panel.innerHTML = item('P/E Ratio', d.trailing_pe?.toFixed(1) + 'x') + 
                      item('P/B Ratio', d.price_to_book?.toFixed(1) + 'x') + 
                      item('Div Yield', (d.dividend_yield * 100).toFixed(1) + '%') + 
                      item('ROE', (d.roe * 100).toFixed(1) + '%');
}
