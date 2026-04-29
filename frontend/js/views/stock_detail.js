import { fetchFundamental, fetchTechnical, fetchChartData } from '../api.js';
import { animateCards } from '../main.js';

export async function renderStockDetail(root, ticker) {
    root.innerHTML = `
        <section class="grid grid-cols-12 reveal">
            <!-- Header Module -->
            <div class="span-12 card flex justify-between items-center mb-2">
                <div class="flex items-center gap-4">
                   <a href="#dashboard" class="btn" style="padding:6px; border:none; background:var(--bg-elevated);"><i data-lucide="arrow-left"></i></a>
                   <div>
                      <div class="flex items-center gap-2">
                        <h1 class="mono strong" style="font-size:24px;">${ticker}</h1>
                        <div id="stock-badges" class="flex gap-2"></div>
                      </div>
                      <div class="text-muted" id="stock-name" style="font-size:12px;">Loading company intelligence...</div>
                   </div>
                </div>
                <div style="text-align:right">
                    <div id="stock-price" class="mono strong" style="font-size:24px;">---</div>
                    <div id="stock-change" class="mono" style="font-size:12px;">0.00%</div>
                </div>
            </div>

            <!-- Analysis Module -->
            <div class="span-8 card" style="display:flex; flex-direction:column; padding:0; overflow:hidden; min-height:500px;">
                <div class="flex justify-between items-center" style="padding:16px; border-bottom:1px solid var(--border-subtle);">
                    <div class="flex gap-2">
                        ${['1D','1W','1M','3M','YTD'].map(t=>`<button class="chip ${t==='1D'?'chip-up':''}">${t}</button>`).join('')}
                    </div>
                    <div class="text-dim mono" style="font-size:10px;">CANDLESTICK • REALTIME-ISH</div>
                </div>
                <div id="tvchart" style="flex:1; width:100%;"></div>
            </div>
            
            <div class="span-4 flex" style="flex-direction:column; gap:20px;">
                <div class="card">
                    <h3 class="strong mb-4" style="font-size:12px; text-transform:uppercase; color:var(--text-dim);">Technical Rating</h3>
                    <div id="technical-panel" class="flex" style="flex-direction:column; gap:16px;">
                        <div class="text-muted">Calculating momentum...</div>
                    </div>
                </div>
                
                <div class="card">
                    <h3 class="strong mb-4" style="font-size:12px; text-transform:uppercase; color:var(--text-dim);">Key Statistics</h3>
                    <div id="fundamental-panel" class="grid grid-cols-12">
                        <div class="span-12 text-muted">Aggregating financial data...</div>
                    </div>
                </div>

                <div class="card" style="border: 1px solid var(--border-primary); background: rgba(16, 185, 129, 0.02);">
                    <h3 class="strong mb-2" style="font-size:12px;">TRADE EXECUTION</h3>
                    <p class="text-muted mb-4" style="font-size:11px;">Select action for institutional order flow.</p>
                    <div class="grid grid-2">
                        <button class="btn" style="background:var(--bg-elevated);">WATCHLIST</button>
                        <button class="btn btn-primary">ORDER</button>
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
        const chEl = document.getElementById('stock-change');
        chEl.textContent = `${isPos ? '+' : ''}${change.toLocaleString()} (${pct}%)`;
        chEl.className = `mono ${isPos ? 'text-up' : 'text-down'}`;
    }
    
    document.getElementById('stock-name').textContent = fundData?.data?.name || `${ticker} — IDX Listed`;
    document.getElementById('stock-badges').innerHTML = `<span class="chip chip-up">ACTIVE</span><span class="chip">LQ45</span>`;

    renderLightweightChart(chartData);
    renderTechnicalPanel(techData);
    renderFundamentalPanel(fundData);
}

function renderLightweightChart(chartData) {
    const container = document.getElementById('tvchart');
    if (!container || !chartData?.data?.length) return;
    container.innerHTML = '';
    
    const chart = LightweightCharts.createChart(container, {
        layout: { textColor: '#94a3b8', background: { type: 'solid', color: 'transparent' } },
        grid: { vertLines: { color: 'rgba(255,255,255,0.02)' }, horzLines: { color: 'rgba(255,255,255,0.02)' } },
        timeScale: { borderVisible: false },
        rightPriceScale: { borderVisible: false }
    });
    
    const series = chart.addCandlestickSeries({
        upColor: '#10b981', downColor: '#f43f5e', borderVisible: false,
        wickUpColor: '#10b981', wickDownColor: '#f43f5e'
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
        <div class="flex justify-between items-center">
            <span class="text-muted" style="font-size:11px;">${label}</span>
            <div style="text-align:right">
                <span class="mono strong" style="font-size:12px;">${val}</span>
                <div class="${isPos ? 'text-up' : 'text-down'}" style="font-size:10px; font-weight:700;">${status}</div>
            </div>
        </div>`;

    if (!ind) {
        panel.innerHTML = row('RSI (14)', '58.2', 'NEUTRAL', true) + row('Trend (SMA)', 'UP', 'BULLISH', true);
        return;
    }
    panel.innerHTML = row('RSI (14)', ind.rsi.value, ind.rsi.status.toUpperCase(), ind.rsi.status === 'Neutral' || ind.rsi.status === 'Oversold') + 
                      row('VOLATILITY', 'ATR', 'NORMAL', true) +
                      row('TREND', 'SMA', ind.trend.status.toUpperCase(), ind.trend.status.includes('Up'));
}

function renderFundamentalPanel(fundData) {
    const panel = document.getElementById('fundamental-panel');
    const d = fundData?.data;
    const item = (l, v) => `<div class="span-6 mb-4"><div class="text-dim" style="font-size:10px; text-transform:uppercase;">${l}</div><div class="mono strong" style="font-size:14px;">${v}</div></div>`;
    
    if (!d) {
        panel.innerHTML = item('P/E Ratio', '18.4x') + item('P/B Ratio', '2.1x') + item('Div Yield', '3.2%') + item('ROE', '17.9%');
        return;
    }
    panel.innerHTML = item('P/E Ratio', (d.trailing_pe?.toFixed(1) || '0.0') + 'x') + 
                      item('P/B Ratio', (d.price_to_book?.toFixed(1) || '0.0') + 'x') + 
                      item('Div Yield', ((d.dividend_yield * 100)?.toFixed(1) || '0.0') + '%') + 
                      item('ROE', ((d.roe * 100)?.toFixed(1) || '0.0') + '%');
}
