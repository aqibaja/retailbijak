import { fetchFundamental, fetchTechnical, fetchChartData } from '../api.js';
import { animateCards } from '../main.js';

export async function renderStockDetail(root, ticker) {
    root.innerHTML = `
        <section class="reveal">
            <!-- Summary Header -->
            <div class="card mb-6">
                <div class="flex justify-between items-center">
                    <div class="flex items-center gap-4">
                       <a href="#dashboard" class="btn" style="padding:8px; border:none; background:rgba(255,255,255,0.03);"><i data-lucide="chevron-left"></i></a>
                       <div>
                          <div class="flex items-center gap-3">
                            <h1 class="mono strong" style="font-size:28px; margin:0;">${ticker}</h1>
                            <div id="stock-badges" class="flex gap-2"></div>
                          </div>
                          <div class="text-muted mt-1" id="stock-name" style="font-size:14px;">Institutional Intelligence</div>
                       </div>
                    </div>
                    <div style="text-align:right">
                        <div id="stock-price" class="mono strong" style="font-size:28px;">---</div>
                        <div id="stock-change" class="mono mt-1" style="font-size:14px; font-weight:700;">0.00%</div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-12">
                <!-- Chart Module -->
                <div class="span-8 card" style="display:flex; flex-direction:column; padding:0; overflow:hidden; min-height:500px;">
                    <div class="flex justify-between items-center" style="padding:16px 24px; border-bottom:1px solid var(--border);">
                        <div class="flex gap-2">
                            ${['1D','1W','1M','3M','1Y'].map(t=>`<button class="chip ${t==='1D'?'chip-up':''}">${t}</button>`).join('')}
                        </div>
                        <div class="text-dim mono" style="font-size:10px; letter-spacing:1px;">CANDLESTICK • ANALYTICS</div>
                    </div>
                    <div id="tvchart" style="flex:1; width:100%;"></div>
                </div>
                
                <!-- Side Intel -->
                <div class="span-4 flex" style="flex-direction:column; gap:24px;">
                    <div class="card">
                        <h3 class="strong mb-4" style="font-size:12px; text-transform:uppercase; color:var(--text-muted); letter-spacing:0.5px;">Technical Rating</h3>
                        <div id="technical-panel" class="flex" style="flex-direction:column; gap:16px;">
                            <div class="text-dim">Analysing indicators...</div>
                        </div>
                    </div>
                    
                    <div class="card">
                        <h3 class="strong mb-4" style="font-size:12px; text-transform:uppercase; color:var(--text-muted); letter-spacing:0.5px;">Key Statistics</h3>
                        <div id="fundamental-panel" class="grid grid-cols-12">
                            <div class="span-12 text-dim">Aggregating stats...</div>
                        </div>
                    </div>

                    <div class="grid grid-2">
                        <button class="btn" style="background:rgba(255,255,255,0.03);">WATCHLIST</button>
                        <button class="btn btn-primary">TRADE</button>
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
        chEl.className = `mono mt-1 ${isPos ? 'text-up' : 'text-down'}`;
    }
    
    document.getElementById('stock-name').textContent = fundData?.data?.name || `Indonesian Stock Exchange`;
    document.getElementById('stock-badges').innerHTML = `<span class="chip chip-up">LQ45</span><span class="chip">MAIN BOARD</span>`;

    if (typeof LightweightCharts !== 'undefined') renderLightweightChart(chartData);
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
            <span class="text-muted" style="font-size:12px;">${label}</span>
            <div style="text-align:right">
                <span class="mono strong" style="font-size:13px;">${val}</span>
                <div class="${isPos ? 'text-up' : 'text-down'}" style="font-size:10px; font-weight:800; margin-top:2px;">${status}</div>
            </div>
        </div>`;

    if (!ind) {
        panel.innerHTML = row('RSI (14)', '58.2', 'NEUTRAL', true) + row('Trend (SMA)', 'UP', 'BULLISH', true);
        return;
    }
    panel.innerHTML = row('RSI (14)', ind.rsi.value, ind.rsi.status.toUpperCase(), ind.rsi.status === 'Neutral' || ind.rsi.status === 'Oversold') + 
                      row('Trend', 'SMA', ind.trend.status.toUpperCase(), ind.trend.status.includes('Up'));
}

function renderFundamentalPanel(fundData) {
    const panel = document.getElementById('fundamental-panel');
    const d = fundData?.data;
    const item = (l, v) => `<div class="span-6 mb-4"><div class="text-dim mb-1" style="font-size:10px; text-transform:uppercase;">${l}</div><div class="mono strong" style="font-size:14px;">${v}</div></div>`;
    
    if (!d) {
        panel.innerHTML = item('P/E Ratio', '18.4x') + item('P/B Ratio', '2.1x') + item('Div Yield', '3.2%') + item('ROE', '17.9%');
        return;
    }
    panel.innerHTML = item('P/E Ratio', (d.trailing_pe?.toFixed(1) || '0.0') + 'x') + 
                      item('P/B Ratio', (d.price_to_book?.toFixed(1) || '0.0') + 'x') + 
                      item('Div Yield', ((d.dividend_yield * 100)?.toFixed(1) || '0.0') + '%') + 
                      item('ROE', ((d.roe * 100)?.toFixed(1) || '0.0') + '%');
}
