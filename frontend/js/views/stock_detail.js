import { fetchFundamental, fetchTechnical, fetchChartData } from '../api.js';
import { animateCards } from '../main.js';

export async function renderStockDetail(root, ticker) {
    const fallback = {
        name: `${ticker} — Indonesian Stock Exchange`,
        price: 'Rp 7,080',
        change: '+0.12% (Demo)',
        badges: '<span class="chip neutral">IDX</span><span class="chip success">Demo Live</span>',
    };
    root.innerHTML = `
        <section class="section-grid reveal stock-detail-shell">
            <div class="card stock-header-card">
                <div class="stock-header">
                    <div>
                        <button onclick="window.history.back()" class="btn btn-outline mb-4" style="padding:4px 8px" aria-label="Go back">
                            <i data-lucide="arrow-left" style="width:16px;height:16px;"></i> Back
                        </button>
                        <div class="ticker-title">${ticker}</div>
                        <div class="company-name" id="stock-name">Loading...</div>
                        <div class="mt-2" id="stock-badges">
                            <span class="skeleton skeleton-text" style="width:100px; display:inline-block"></span>
                        </div>
                    </div>
                    <div class="stock-price-block">
                        <div class="current-price" id="stock-price"><span class="skeleton skeleton-text" style="width:120px; display:inline-block"></span></div>
                        <div id="stock-change"></div>
                        <div class="stock-actions">
                            <button class="btn btn-outline" title="Add to Watchlist" aria-label="Add to Watchlist"><i data-lucide="star"></i></button>
                            <button class="btn btn-outline" style="color:var(--danger); border-color:var(--danger)">Sell</button>
                            <button class="btn btn-primary">Buy</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="split-row">
                <div class="card" style="padding:0; overflow:hidden;">
                    <div class="timebar">
                        <button class="time-chip active">1D</button>
                        <button class="time-chip">1W</button>
                        <button class="time-chip">1M</button>
                        <button class="time-chip">3M</button>
                        <button class="time-chip">YTD</button>
                    </div>
                    <div id="tvchart" class="chart-container chart-container-large"></div>
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
    if (chartData && Array.isArray(chartData.data) && chartData.data.length > 0) {
        const last = chartData.data[chartData.data.length - 1];
        const prev = chartData.data[chartData.data.length - 2] || last;
        const latestPrice = Number(last.close) || 0;
        const prevClose = Number(prev.close) || latestPrice || 1;
        const change = latestPrice - prevClose;
        const pct = ((change / prevClose) * 100).toFixed(2);
        const isPos = change >= 0;

        document.getElementById('stock-price').innerHTML = `<span style="font-variant-numeric:tabular-nums;">Rp ${latestPrice.toLocaleString()}</span>`;
        document.getElementById('stock-change').innerHTML = `
            <span class="chip ${isPos ? 'success' : 'danger'}" style="font-size:14px;">
                ${isPos ? '▲' : '▼'} ${Math.abs(change).toLocaleString()} (${Math.abs(pct)}%)
            </span>
        `;
    } else {
        document.getElementById('stock-price').textContent = fallback.price;
        document.getElementById('stock-change').innerHTML = `<span class="chip success">${fallback.change}</span>`;
    }

    document.getElementById('stock-name').innerText = fallback.name;
    document.getElementById('stock-badges').innerHTML = fallback.badges;

    try {
        renderLightweightChart(chartData);
    } catch (error) {
        console.error('Failed rendering chart', error);
        document.getElementById('tvchart').innerHTML = '<div style="padding:40px; text-align:center; color:var(--text-muted);">Chart failed to load.</div>';
    }
    renderTechnicalPanel(techData);
    renderFundamentalPanel(fundData);
}

function renderLightweightChart(chartData) {
    const container = document.getElementById('tvchart');
    container.innerHTML = '';
    if (!chartData || !chartData.data || chartData.data.length === 0) {
        container.innerHTML = '<div style="padding:40px; text-align:center; color:var(--text-muted);">No chart data available.</div>';
        return;
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    
    const chart = LightweightCharts.createChart(container, {
        layout: {
            textColor: isDark ? '#e2faea' : '#111827',
            background: { type: 'solid', color: 'transparent' }
        },
        grid: {
            vertLines: { color: isDark ? 'rgba(74,222,128,0.06)' : 'rgba(22,163,74,0.06)' },
            horzLines: { color: isDark ? 'rgba(74,222,128,0.06)' : 'rgba(22,163,74,0.06)' }
        },
        timeScale: { timeVisible: true, secondsVisible: false }
    });
    
    const candlestickSeries = chart.addCandlestickSeries({
        upColor: isDark ? '#4ade80' : '#16a34a',
        downColor: isDark ? '#f87171' : '#dc2626',
        borderVisible: false,
        wickUpColor: isDark ? '#4ade80' : '#16a34a',
        wickDownColor: isDark ? '#f87171' : '#dc2626'
    });

    candlestickSeries.setData(chartData.data.map(d => ({
        time: d.date,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close
    })));
    
    chart.timeScale().fitContent();
    
    new ResizeObserver(entries => {
        if (entries.length === 0 || entries[0].target !== container) return;
        const { height, width } = entries[0].contentRect;
        chart.applyOptions({ height, width });
    }).observe(container);
}

function renderTechnicalPanel(techData) {
    const panel = document.getElementById('technical-panel');
    if (!techData || techData.status === 'no_data') {
        panel.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:12px;">
                <div class="flex-between"><span style="color:var(--text-muted);">Trend (SMA)</span><span class="chip success">Uptrend</span></div>
                <div class="flex-between"><span style="color:var(--text-muted);">RSI (14)</span><span style="display:flex; align-items:center; gap:8px;"><span class="mono">58.20</span><span class="chip neutral">Neutral</span></span></div>
                <div class="flex-between"><span style="color:var(--text-muted);">MACD</span><span style="display:flex; align-items:center; gap:8px;"><span class="mono">1.84</span><span class="chip success">Bullish Crossover</span></span></div>
                <div class="notice-box">Data teknikal belum lengkap dari backend, jadi mode demo ditampilkan agar halaman tetap terasa hidup.</div>
            </div>`;
        return;
    }
    
    const ind = techData.technical.indicators;
    panel.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:12px;">
            <div class="flex-between">
                <span style="color:var(--text-muted);">Trend (SMA)</span>
                <span class="chip ${ind.trend.status.includes('Up') ? 'success' : 'danger'}">${ind.trend.status}</span>
            </div>
            <div class="flex-between">
                <span style="color:var(--text-muted);">RSI (14)</span>
                <span style="display:flex; align-items:center; gap:8px;">
                    <span class="mono" style="font-variant-numeric:tabular-nums;">${ind.rsi.value}</span>
                    <span class="chip neutral">${ind.rsi.status}</span>
                </span>
            </div>
            <div class="flex-between">
                <span style="color:var(--text-muted);">MACD</span>
                <span style="display:flex; align-items:center; gap:8px;">
                    <span class="mono" style="font-variant-numeric:tabular-nums;">${ind.macd.macd_line}</span>
                    <span class="chip ${ind.macd.status.includes('Bullish') ? 'success' : 'danger'}">${ind.macd.status}</span>
                </span>
            </div>
        </div>
    `;
}

function renderFundamentalPanel(fundData) {
    const panel = document.getElementById('fundamental-panel');
    if (!fundData || !fundData.data) {
        panel.innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                <div><div style="font-size:11px; color:var(--text-muted);">P/E (Trailing)</div><div class="mono" style="font-size:14px; font-weight:600;">18.40</div></div>
                <div><div style="font-size:11px; color:var(--text-muted);">P/B Ratio</div><div class="mono" style="font-size:14px; font-weight:600;">2.15</div></div>
                <div><div style="font-size:11px; color:var(--text-muted);">EPS</div><div class="mono" style="font-size:14px; font-weight:600;">142.00</div></div>
                <div><div style="font-size:11px; color:var(--text-muted);">Div Yield</div><div class="mono" style="font-size:14px; font-weight:600;">3.20%</div></div>
                <div><div style="font-size:11px; color:var(--text-muted);">ROE</div><div class="mono" style="font-size:14px; font-weight:600;">17.90%</div></div>
                <div><div style="font-size:11px; color:var(--text-muted);">Status</div><div class="mono" style="font-size:14px; font-weight:600;">Demo ready</div></div>
            </div>
            <div style="font-size:10px; color:var(--text-faint); margin-top:16px;">Updated: Today, 09:00 WIB</div>`;
        return;
    }
    
    const d = fundData.data;
    const items = [
        ['P/E (Trailing)', d.trailing_pe ? d.trailing_pe.toFixed(2) : '-'],
        ['P/B Ratio', d.price_to_book ? d.price_to_book.toFixed(2) : '-'],
        ['EPS', d.trailing_eps ? d.trailing_eps.toFixed(2) : '-'],
        ['Div Yield', d.dividend_yield ? (d.dividend_yield * 100).toFixed(2) + '%' : '-'],
        ['ROE', d.roe ? (d.roe * 100).toFixed(2) + '%' : '-'],
    ];
    
    panel.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            ${items.map(([label, val]) => `
                <div>
                    <div style="font-size:11px; color:var(--text-muted);">${label}</div>
                    <div class="mono" style="font-size:14px; font-weight:600; font-variant-numeric:tabular-nums;">${val}</div>
                </div>
            `).join('')}
        </div>
        <div style="font-size:10px; color:var(--text-faint); margin-top:16px;">
            Updated: ${new Date(d.updated_at).toLocaleDateString()}
        </div>
    `;
}
