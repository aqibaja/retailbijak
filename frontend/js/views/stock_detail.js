import { fetchFundamental, fetchTechnical, fetchChartData, fetchNews } from '../api.js';

export async function renderStockDetail(root, ticker) {
    // Scaffold UI with skeletons
    root.innerHTML = `
        <div class="stock-header">
            <div>
                <button onclick="window.history.back()" class="btn btn-outline mb-4" style="padding:4px 8px"><i data-lucide="arrow-left" style="width:16px;height:16px;"></i> Back</button>
                <div class="ticker-title">${ticker}</div>
                <div class="company-name" id="stock-name">Loading...</div>
                <div class="mt-2" id="stock-badges">
                    <span class="skeleton skeleton-text" style="width:100px; display:inline-block"></span>
                </div>
            </div>
            <div style="text-align:right">
                <div class="current-price" id="stock-price"><span class="skeleton skeleton-text" style="width:120px; display:inline-block"></span></div>
                <div id="stock-change"></div>
                <div class="mt-4 flex-between" style="gap:12px; justify-content:flex-end;">
                    <button class="btn btn-outline" title="Watchlist"><i data-lucide="star"></i></button>
                    <button class="btn btn-outline" style="color:var(--color-danger); border-color:var(--color-danger)">Sell</button>
                    <button class="btn btn-primary">Buy</button>
                </div>
            </div>
        </div>

        <div class="split-row">
            <div class="card" style="padding:0; overflow:hidden;">
                <div style="padding:16px; border-bottom:1px solid var(--color-border); display:flex; gap:16px;">
                    <span style="font-weight:600">1D</span>
                    <span style="color:var(--color-text-muted)">1W</span>
                    <span style="color:var(--color-text-muted)">1M</span>
                    <span style="color:var(--color-text-muted)">3M</span>
                    <span style="color:var(--color-text-muted)">YTD</span>
                </div>
                <div id="tvchart" class="chart-container" style="border:none; border-radius:0;"></div>
            </div>
            
            <div class="card">
                <h2>Technical Analysis</h2>
                <div id="technical-panel">
                    <div class="skeleton skeleton-block"></div>
                </div>
                
                <h2 style="margin-top:24px;">Fundamentals</h2>
                <div id="fundamental-panel">
                    <div class="skeleton skeleton-block"></div>
                </div>
            </div>
        </div>
    `;
    lucide.createIcons();

    // Fetch Data concurrently
    const [fundData, techData, chartData] = await Promise.all([
        fetchFundamental(ticker),
        fetchTechnical(ticker),
        fetchChartData(ticker, 100)
    ]);

    // Update Header
    let latestPrice = 0;
    if (chartData && chartData.data.length > 0) {
        const last = chartData.data[chartData.data.length - 1];
        const prev = chartData.data[chartData.data.length - 2] || last;
        latestPrice = last.close;
        const change = latestPrice - prev.close;
        const pct = ((change / prev.close) * 100).toFixed(2);
        const isPos = change >= 0;
        
        document.getElementById('stock-price').innerHTML = `Rp ${latestPrice.toLocaleString()}`;
        document.getElementById('stock-change').innerHTML = `
            <span class="chip ${isPos ? 'success' : 'danger'}" style="font-size:14px;">
                ${isPos ? '▲' : '▼'} ${Math.abs(change)} (${Math.abs(pct)}%)
            </span>
        `;
    }
    
    document.getElementById('stock-name').innerText = fundData && fundData.data.revenue ? `${ticker} - Indonesian Stock Exchange` : `Indonesian Stock Exchange`;
    document.getElementById('stock-badges').innerHTML = `
        <span class="chip neutral">IDX</span>
    `;

    // Render Chart
    renderLightweightChart(chartData);

    // Render Technical
    renderTechnicalPanel(techData);

    // Render Fundamental
    renderFundamentalPanel(fundData);
}

function renderLightweightChart(chartData) {
    const container = document.getElementById('tvchart');
    container.innerHTML = ''; // clear skeleton
    if (!chartData || !chartData.data || chartData.data.length === 0) {
        container.innerHTML = '<div style="padding:40px; text-align:center;">No chart data available.</div>';
        return;
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    
    const chartOptions = {
        layout: {
            textColor: isDark ? '#E8F5EC' : '#111C15',
            background: { type: 'solid', color: 'transparent' }
        },
        grid: {
            vertLines: { color: isDark ? '#1E2B22' : '#D0E5D4' },
            horzLines: { color: isDark ? '#1E2B22' : '#D0E5D4' }
        },
        timeScale: {
            timeVisible: true,
            secondsVisible: false,
        }
    };
    
    const chart = LightweightCharts.createChart(container, chartOptions);
    const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#18A058',
        downColor: '#C53030',
        borderVisible: false,
        wickUpColor: '#18A058',
        wickDownColor: '#C53030'
    });

    const formattedData = chartData.data.map(d => ({
        time: d.date, // YYYY-MM-DD
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close
    }));

    candlestickSeries.setData(formattedData);
    chart.timeScale().fitContent();
    
    // Handle resize
    new ResizeObserver(entries => {
        if (entries.length === 0 || entries[0].target !== container) return;
        const newRect = entries[0].contentRect;
        chart.applyOptions({ height: newRect.height, width: newRect.width });
    }).observe(container);
}

function renderTechnicalPanel(techData) {
    const panel = document.getElementById('technical-panel');
    if (!techData || techData.status === 'no_data') {
        panel.innerHTML = '<p class="mono">No technical data available.</p>';
        return;
    }
    
    const ind = techData.technical.indicators;
    panel.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:12px;">
            <div class="flex-between">
                <span>Trend (SMA)</span>
                <span class="chip ${ind.trend.status.includes('Up') ? 'success' : 'danger'}">${ind.trend.status}</span>
            </div>
            <div class="flex-between">
                <span>RSI (14)</span>
                <span style="display:flex; align-items:center; gap:8px;">
                    <span class="mono">${ind.rsi.value}</span>
                    <span class="chip neutral">${ind.rsi.status}</span>
                </span>
            </div>
            <div class="flex-between">
                <span>MACD</span>
                <span style="display:flex; align-items:center; gap:8px;">
                    <span class="mono">${ind.macd.macd_line}</span>
                    <span class="chip ${ind.macd.status.includes('Bullish') ? 'success' : 'danger'}">${ind.macd.status}</span>
                </span>
            </div>
        </div>
    `;
}

function renderFundamentalPanel(fundData) {
    const panel = document.getElementById('fundamental-panel');
    if (!fundData || !fundData.data) {
        panel.innerHTML = '<p class="mono">No fundamental data available.</p>';
        return;
    }
    
    const d = fundData.data;
    panel.innerHTML = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
            <div>
                <div style="font-size:11px; color:var(--color-text-muted)">P/E (Trailing)</div>
                <div class="mono" style="font-size:14px; font-weight:600">${d.trailing_pe ? d.trailing_pe.toFixed(2) : '-'}</div>
            </div>
            <div>
                <div style="font-size:11px; color:var(--color-text-muted)">P/B Ratio</div>
                <div class="mono" style="font-size:14px; font-weight:600">${d.price_to_book ? d.price_to_book.toFixed(2) : '-'}</div>
            </div>
            <div>
                <div style="font-size:11px; color:var(--color-text-muted)">EPS</div>
                <div class="mono" style="font-size:14px; font-weight:600">${d.trailing_eps ? d.trailing_eps.toFixed(2) : '-'}</div>
            </div>
            <div>
                <div style="font-size:11px; color:var(--color-text-muted)">Div Yield</div>
                <div class="mono" style="font-size:14px; font-weight:600">${d.dividend_yield ? (d.dividend_yield * 100).toFixed(2) + '%' : '-'}</div>
            </div>
            <div>
                <div style="font-size:11px; color:var(--color-text-muted)">ROE</div>
                <div class="mono" style="font-size:14px; font-weight:600">${d.roe ? (d.roe * 100).toFixed(2) + '%' : '-'}</div>
            </div>
        </div>
        <div style="font-size:10px; color:var(--color-text-faint); margin-top:16px;">
            Updated: ${new Date(d.updated_at).toLocaleDateString()}
        </div>
    `;
}
