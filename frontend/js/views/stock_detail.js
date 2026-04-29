import { fetchFundamental, fetchTechnical, fetchChartData, saveWatchlistItem, showToast } from '../api.js';
import { observeElements, flashUpdate } from '../main.js';

export async function renderStockDetail(root, ticker) {
    root.innerHTML = `
      <section class="grid grid-cols-12 stagger-reveal">
        <!-- Header -->
        <div class="col-span-12 panel flex-col mb-2" style="padding:16px 24px;">
            <div class="flex justify-between items-center">
                <div class="flex items-center gap-4">
                   <a href="#dashboard" class="btn btn-icon" style="border:none;"><i data-lucide="arrow-left" style="width:20px;"></i></a>
                   <div>
                      <div class="flex items-center gap-3 mb-1">
                        <h1 class="mono text-2xl strong m-0">${ticker}</h1>
                        <span class="badge badge-primary">EQ</span>
                        <span class="badge badge-up" id="live-badge">LIVE</span>
                      </div>
                      <div class="text-xs text-muted" id="stock-name">Loading issuer data...</div>
                   </div>
                </div>
                <div class="flex-col items-end">
                    <div class="mono text-3xl strong" id="stock-price" style="letter-spacing:-1px;">---</div>
                    <div class="mono text-sm mt-1" id="stock-change">0.00%</div>
                </div>
            </div>
        </div>

        <!-- Main Chart -->
        <div class="col-span-8 panel flex-col" style="padding:0; overflow:hidden; min-height:480px;">
            <div class="flex justify-between items-center p-4" style="border-bottom:1px solid var(--border-subtle);">
                <div class="flex gap-2">
                    ${['1D','1W','1M','3M','1Y'].map(t=>`<button class="btn ${t==='1D'?'':'text-muted'}" style="padding:4px 10px; font-size:11px; background:${t==='1D'?'var(--bg-elevated)':'transparent'}; border-color:${t==='1D'?'var(--border-strong)':'transparent'};">${t}</button>`).join('')}
                </div>
                <div class="flex items-center gap-3">
                    <span class="status-dot live"></span>
                    <span class="mono text-xs text-dim">CANDLESTICK</span>
                </div>
            </div>
            <div id="tvchart" style="flex:1; width:100%;"></div>
        </div>
        
        <!-- Sidebar Intel -->
        <div class="col-span-4 flex-col gap-4">
            <!-- Technicals -->
            <div class="panel flex-col">
                <h3 class="text-xs uppercase text-muted strong mb-4" style="border-bottom:1px solid var(--border-subtle); padding-bottom:8px;">Technical Rating</h3>
                <div id="technical-panel" class="flex-col gap-3">
                    <div class="skeleton skel-text"></div>
                    <div class="skeleton skel-text"></div>
                </div>
            </div>
            
            <!-- Fundamentals -->
            <div class="panel flex-col" style="flex:1;">
                <h3 class="text-xs uppercase text-muted strong mb-4" style="border-bottom:1px solid var(--border-subtle); padding-bottom:8px;">Key Statistics</h3>
                <div id="fundamental-panel" class="grid grid-cols-2 gap-4">
                    <div class="col-span-2 skeleton skel-text"></div>
                </div>
            </div>

            <!-- Execution -->
            <div class="panel flex-col" style="border-color:var(--primary-color); background:rgba(59,130,246,0.05);">
                <h3 class="text-xs uppercase text-primary strong mb-2">Order Execution</h3>
                <p class="text-xs text-muted mb-4">Route order to institutional broker.</p>
                <div class="grid grid-cols-2 gap-2">
                    <button id="btn-add-watchlist" class="btn" style="border-color:var(--border-focus);">WATCHLIST</button>
                    <button id="btn-trade" class="btn btn-primary">BUY / SELL</button>
                </div>
            </div>
        </div>
      </section>
    `;
    
    observeElements();
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Attach Event Listeners
    document.getElementById('btn-add-watchlist').addEventListener('click', async () => {
        const res = await saveWatchlistItem({ ticker: ticker.toUpperCase(), notes: 'Added from detail page' });
        if (res?.ok) showToast(`${ticker} added to Watchlist`, 'success');
        else showToast(`Failed to add ${ticker}`, 'error');
    });
    
    document.getElementById('btn-trade').addEventListener('click', () => {
        showToast(`Trade order for ${ticker} simulated successfully`, 'info');
    });

    let fundData, techData, chartData;
    try {
        [fundData, techData, chartData] = await Promise.all([
            fetchFundamental(ticker).catch(() => null),
            fetchTechnical(ticker).catch(() => null),
            fetchChartData(ticker, 100).catch(() => null)
        ]);
    } catch(e) {
        console.error("Error fetching detail data", e);
    }

    // Update Header
    if (chartData && Array.isArray(chartData.data) && chartData.data.length > 0) {
        const last = chartData.data[chartData.data.length - 1];
        const prev = chartData.data[chartData.data.length - 2] || last;
        const price = last.close;
        const change = price - prev.close;
        const pct = ((change / prev.close) * 100).toFixed(2);
        const isPos = change >= 0;

        const priceEl = document.getElementById('stock-price');
        priceEl.textContent = `Rp ${price.toLocaleString()}`;
        flashUpdate(priceEl, isPos);

        const chEl = document.getElementById('stock-change');
        chEl.textContent = `${isPos ? '+' : ''}${change.toLocaleString()} (${pct}%)`;
        chEl.className = `mono text-sm mt-1 ${isPos ? 'text-up' : 'text-down'} strong`;
    } else {
        document.getElementById('live-badge').className = 'badge badge-down';
        document.getElementById('live-badge').textContent = 'NO DATA';
    }
    
    document.getElementById('stock-name').textContent = fundData?.data?.name || `${ticker} — Data not available`;

    if (typeof LightweightCharts !== 'undefined') renderLightweightChart(chartData);
    renderTechnicalPanel(techData);
    renderFundamentalPanel(fundData);
}

function renderLightweightChart(chartData) {
    const container = document.getElementById('tvchart');
    if (!container) return;
    
    if (!chartData || !chartData.data || chartData.data.length === 0) {
        container.innerHTML = `<div class="flex items-center justify-center text-dim" style="height:100%;">Chart data unavailable for this ticker.</div>`;
        return;
    }
    
    container.innerHTML = '';
    
    const chart = LightweightCharts.createChart(container, {
        layout: { textColor: '#6e7681', background: { type: 'solid', color: 'transparent' }, fontFamily: "'JetBrains Mono', monospace" },
        grid: { vertLines: { color: 'rgba(255,255,255,0.03)' }, horzLines: { color: 'rgba(255,255,255,0.03)' } },
        timeScale: { borderVisible: false, tickMarkFormatter: (time) => new Date(time).toLocaleDateString(undefined, {month:'short', day:'numeric'}) },
        rightPriceScale: { borderVisible: false },
        crosshair: { mode: LightweightCharts.CrosshairMode.Normal }
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
        <div class="flex justify-between items-center">
            <span class="text-xs text-dim uppercase">${label}</span>
            <div class="text-right">
                <span class="mono strong text-sm">${val}</span>
                <div class="${isPos ? 'text-up' : 'text-down'} text-xs strong mt-1">${status}</div>
            </div>
        </div>`;

    if (!ind) {
        panel.innerHTML = `<div class="text-dim text-sm p-4 text-center">Technical data currently unavailable.</div>`;
        return;
    }
    panel.innerHTML = row('RSI (14)', ind.rsi.value, ind.rsi.status.toUpperCase(), ind.rsi.status === 'Neutral' || ind.rsi.status === 'Oversold') + 
                      row('Trend', 'SMA', ind.trend.status.toUpperCase(), ind.trend.status.includes('Up'));
}

function renderFundamentalPanel(fundData) {
    const panel = document.getElementById('fundamental-panel');
    const d = fundData?.data;
    const item = (l, v) => `<div><div class="text-xs text-dim uppercase mb-1">${l}</div><div class="mono strong text-base">${v}</div></div>`;
    
    if (!d) {
        panel.innerHTML = `<div class="col-span-2 text-dim text-sm text-center">Fundamental data currently unavailable.</div>`;
        return;
    }
    panel.innerHTML = item('P/E Ratio', (d.trailing_pe?.toFixed(1) || 'N/A') + 'x') + 
                      item('P/B Ratio', (d.price_to_book?.toFixed(1) || 'N/A') + 'x') + 
                      item('Div Yield', ((d.dividend_yield * 100)?.toFixed(1) || 'N/A') + '%') + 
                      item('ROE', ((d.roe * 100)?.toFixed(1) || 'N/A') + '%');
}
