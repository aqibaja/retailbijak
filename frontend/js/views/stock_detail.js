import { fetchFundamental, fetchTechnical, fetchChartData, saveWatchlistItem, showToast } from '../api.js';
import { observeElements, flashUpdate } from '../main.js';

export async function renderStockDetail(root, ticker) {
    root.innerHTML = `
      <section class="grid grid-cols-12 stagger-reveal">
        <!-- Header -->
        <div class="col-span-12 panel flex-col mb-4" style="padding:24px 32px; background:linear-gradient(180deg, rgba(15,23,41,0.8) 0%, rgba(11,18,32,0.8) 100%);">
            <div class="flex justify-between items-center">
                <div class="flex items-center gap-4">
                   <a href="#dashboard" class="btn btn-icon" style="border:none; background:rgba(255,255,255,0.05);"><i data-lucide="arrow-left" style="width:20px;"></i></a>
                   <div>
                      <div class="flex items-center gap-3 mb-1">
                        <h1 class="mono text-3xl strong m-0 text-main" style="letter-spacing:-1px;">${ticker}</h1>
                        <span class="badge" style="background:rgba(99,102,241,0.1); color:#a5b4fc; border:1px solid rgba(99,102,241,0.2);">EQ</span>
                        <span class="badge badge-up" id="live-badge">LIVE</span>
                      </div>
                      <div class="text-sm text-muted" id="stock-name" style="font-weight:500;">Loading issuer data...</div>
                   </div>
                </div>
                <div class="flex-col items-end">
                    <div class="mono text-3xl strong text-main" id="stock-price" style="letter-spacing:-1px;">---</div>
                    <div class="mono text-base mt-1" id="stock-change" style="font-weight:700;">0.00%</div>
                </div>
            </div>
        </div>

        <!-- Main Chart -->
        <div class="col-span-8 panel flex-col" style="padding:0; overflow:hidden; min-height:480px; box-shadow:0 8px 32px rgba(0,0,0,0.3);">
            <div class="flex justify-between items-center p-4" style="border-bottom:1px solid var(--border-subtle); background:rgba(15,22,41,0.6);">
                <div class="flex gap-2">
                    ${['1D','1W','1M','3M','1Y'].map(t=>`<button class="btn ${t==='1D'?'':'text-muted'}" style="padding:4px 12px; font-size:12px; height:28px; background:${t==='1D'?'var(--primary-glow)':'transparent'}; border-color:${t==='1D'?'var(--border-focus)':'transparent'}; color:${t==='1D'?'var(--primary-color)':''}">${t}</button>`).join('')}
                </div>
                <div class="flex items-center gap-3">
                    <span class="status-dot live"></span>
                    <span class="mono text-xs text-dim strong" style="letter-spacing:0.05em;">CANDLESTICK</span>
                </div>
            </div>
            <div id="tvchart" style="flex:1; width:100%; background:rgba(11,18,32,0.4);"></div>
        </div>
        
        <!-- Sidebar Intel -->
        <div class="col-span-4 flex-col gap-4">
            <!-- Technicals -->
            <div class="panel flex-col">
                <h3 class="text-xs uppercase text-dim strong mb-4" style="border-bottom:1px solid var(--border-subtle); padding-bottom:12px; letter-spacing:0.08em;">Technical Rating</h3>
                <div id="technical-panel" class="flex-col gap-4 mt-2">
                    <div class="skeleton skel-text"></div>
                    <div class="skeleton skel-text"></div>
                </div>
            </div>
            
            <!-- Fundamentals -->
            <div class="panel flex-col" style="flex:1;">
                <h3 class="text-xs uppercase text-dim strong mb-4" style="border-bottom:1px solid var(--border-subtle); padding-bottom:12px; letter-spacing:0.08em;">Key Statistics</h3>
                <div id="fundamental-panel" class="grid grid-cols-2 gap-6 mt-2">
                    <div class="col-span-2 skeleton skel-text"></div>
                </div>
            </div>

            <!-- Execution -->
            <div class="panel flex-col accent-top" style="background:linear-gradient(135deg, rgba(99,102,241,0.05), rgba(15,23,41,0.6));">
                <h3 class="text-xs uppercase strong mb-2" style="color:#a5b4fc; letter-spacing:0.05em;">Order Execution</h3>
                <p class="text-xs text-muted mb-4">Route order to institutional broker.</p>
                <div class="grid grid-cols-2 gap-3">
                    <button id="btn-add-watchlist" class="btn" style="border-color:rgba(255,255,255,0.1); height:42px;">WATCHLIST</button>
                    <button id="btn-trade" class="btn btn-primary" style="height:42px;">BUY / SELL</button>
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
        layout: { textColor: '#94a3b8', background: { type: 'solid', color: 'transparent' }, fontFamily: "'JetBrains Mono', monospace" },
        grid: { vertLines: { color: 'rgba(255,255,255,0.02)' }, horzLines: { color: 'rgba(255,255,255,0.02)' } },
        timeScale: { borderVisible: false, tickMarkFormatter: (time) => new Date(time).toLocaleDateString(undefined, {month:'short', day:'numeric'}) },
        rightPriceScale: { borderVisible: false },
        crosshair: { mode: LightweightCharts.CrosshairMode.Normal, vertLine: { color: 'rgba(255,255,255,0.1)', width: 1, style: 3 }, horzLine: { color: 'rgba(255,255,255,0.1)', width: 1, style: 3 } }
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
            <span class="text-xs text-dim uppercase strong" style="letter-spacing:0.05em;">${label}</span>
            <div class="text-right">
                <span class="mono strong text-main" style="font-size:14px;">${val}</span>
                <div class="${isPos ? 'text-up' : 'text-down'} text-xs strong mt-1" style="font-family:var(--font-mono);">${status}</div>
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
    const item = (l, v) => `<div><div class="text-xs text-dim uppercase strong mb-2" style="letter-spacing:0.05em;">${l}</div><div class="mono strong text-main" style="font-size:16px;">${v}</div></div>`;
    
    if (!d) {
        panel.innerHTML = `<div class="col-span-2 text-dim text-sm text-center">Fundamental data currently unavailable.</div>`;
        return;
    }
    panel.innerHTML = item('P/E Ratio', (d.trailing_pe?.toFixed(1) || 'N/A') + 'x') + 
                      item('P/B Ratio', (d.price_to_book?.toFixed(1) || 'N/A') + 'x') + 
                      item('Div Yield', ((d.dividend_yield * 100)?.toFixed(1) || 'N/A') + '%') + 
                      item('ROE', ((d.roe * 100)?.toFixed(1) || 'N/A') + '%');
}
