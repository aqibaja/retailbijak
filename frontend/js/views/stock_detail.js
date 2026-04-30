     1|import { fetchFundamental, fetchTechnical, fetchAnalysis, fetchChartData, fetchStockDetail, saveWatchlistItem, showToast } from '../api.js';
     2|import { observeElements, flashUpdate } from '../main.js';
     3|
     4|export async function renderStockDetail(root, ticker) {
     5|    root.innerHTML = `
     6|      <section class="grid grid-cols-12 stagger-reveal">
     7|        <!-- Header -->
     8|        <div class="col-span-12 panel flex-col mb-4" style="padding:24px 32px; background:linear-gradient(180deg, rgba(15,23,41,0.8) 0%, rgba(11,18,32,0.8) 100%);">
     9|            <div class="flex justify-between items-center">
    10|                <div class="flex items-center gap-4">
    11|                   <a href="#dashboard" class="btn btn-icon" style="border:none; background:rgba(255,255,255,0.05);"><i data-lucide="arrow-left" style="width:20px;"></i></a>
    12|                   <div>
    13|                      <div class="flex items-center gap-3 mb-1">
    14|                        <h1 class="mono text-3xl strong m-0 text-main" style="letter-spacing:-1px;">${ticker}</h1>
    15|                        <span class="badge" style="background:rgba(99,102,241,0.1); color:#a5b4fc; border:1px solid rgba(99,102,241,0.2);">EQ</span>
    16|                        <span class="badge badge-up" id="live-badge">LIVE</span>
    17|                      </div>
    18|                      <div class="text-sm text-muted" id="stock-name" style="font-weight:500;">Loading issuer data...</div>
    19|                   </div>
    20|                </div>
    21|                <div class="flex-col items-end">
    22|                    <div class="mono text-3xl strong text-main" id="stock-price" style="letter-spacing:-1px;">---</div>
    23|                    <div class="mono text-base mt-1" id="stock-change" style="font-weight:700;">0.00%</div>
    24|                </div>
    25|            </div>
    26|        </div>
    27|
    28|        <!-- Main Chart -->
    29|        <div class="col-span-8 panel flex-col" style="padding:0; overflow:hidden; min-height:480px; box-shadow:0 8px 32px rgba(0,0,0,0.3);">
    30|            <div class="flex justify-between items-center p-4" style="border-bottom:1px solid var(--border-subtle); background:rgba(15,22,41,0.6);">
    31|                <div class="flex gap-2">
    32|                    ${['1D','1W','1M','3M','1Y'].map(t=>`<button class="btn ${t==='1D'?'':'text-muted'}" style="padding:4px 12px; font-size:12px; height:28px; background:${t==='1D'?'var(--primary-glow)':'transparent'}; border-color:${t==='1D'?'var(--border-focus)':'transparent'}; color:${t==='1D'?'var(--primary-color)':''}">${t}</button>`).join('')}
    33|                </div>
    34|                <div class="flex items-center gap-3">
    35|                    <span class="status-dot live"></span>
    36|                    <span class="mono text-xs text-dim strong" style="letter-spacing:0.05em;">CANDLESTICK</span>
    37|                </div>
    38|            </div>
    39|            <div id="tvchart" style="flex:1; width:100%; background:rgba(11,18,32,0.4);"></div>
    40|        </div>
    41|        
    42|        <!-- Sidebar Intel -->
    43|        <div class="col-span-4 flex-col gap-4">
    44|            <!-- Technicals -->
    45|            <div class="panel flex-col">
    46|                <h3 class="text-xs uppercase text-dim strong mb-4" style="border-bottom:1px solid var(--border-subtle); padding-bottom:12px; letter-spacing:0.08em;">Technical Rating</h3>
    47|                <div id="technical-panel" class="flex-col gap-4 mt-2">
    48|                    <div class="skeleton skel-text"></div>
    49|                    <div class="skeleton skel-text"></div>
    50|                </div>
    51|            </div>
    52|            
    53|            <!-- Fundamentals -->
    54|            <div class="panel flex-col" style="flex:1;">
    55|                <h3 class="text-xs uppercase text-dim strong mb-4" style="border-bottom:1px solid var(--border-subtle); padding-bottom:12px; letter-spacing:0.08em;">Key Statistics</h3>
    56|                <div id="fundamental-panel" class="grid grid-cols-2 gap-6 mt-2">
    57|                    <div class="col-span-2 skeleton skel-text"></div>
    58|                </div>
    59|            </div>
    60|
    61|            <!-- Analysis -->
    62|            <div class="panel flex-col">
    63|                <h3 class="text-xs uppercase text-dim strong mb-4" style="border-bottom:1px solid var(--border-subtle); padding-bottom:12px; letter-spacing:0.08em;">Analysis Snapshot</h3>
    64|                <div id="analysis-panel" class="flex-col gap-3 mt-2">
    65|                    <div class="skeleton skel-text"></div>
    66|                </div>
    67|            </div>
    68|
    69|            <!-- Execution -->
    70|            <div class="panel flex-col accent-top" style="background:linear-gradient(135deg, rgba(99,102,241,0.05), rgba(15,23,41,0.6));">
    71|                <h3 class="text-xs uppercase strong mb-2" style="color:#a5b4fc; letter-spacing:0.05em;">Order Execution</h3>
    72|                <p class="text-xs text-muted mb-4">Route order to institutional broker.</p>
    73|                <div class="grid grid-cols-2 gap-3">
    74|                    <button id="btn-add-watchlist" class="btn" style="border-color:rgba(255,255,255,0.1); height:42px;">WATCHLIST</button>
    75|                    <button id="btn-trade" class="btn btn-primary" style="height:42px;">BUY / SELL</button>
    76|                </div>
    77|            </div>
    78|        </div>
    79|      </section>
    80|    `;
    81|    
    82|    observeElements();
    83|    if (typeof lucide !== 'undefined') lucide.createIcons();
    84|
    85|    // Attach Event Listeners
    86|    document.getElementById('btn-add-watchlist').addEventListener('click', async () => {
    87|        const res = await saveWatchlistItem({ ticker: ticker.toUpperCase(), notes: 'Added from detail page' });
    88|        if (res?.ok) showToast(`${ticker} added to Watchlist`, 'success');
    89|        else showToast(`Failed to add ${ticker}`, 'error');
    90|    });
    91|    
    92|    document.getElementById('btn-trade').addEventListener('click', () => {
    93|        showToast(`Trade order for ${ticker} simulated successfully`, 'info');
    94|    });
    95|
    96|    let fundData, techData, chartData, analysisData;

    const detailMeta = await fetchStockDetail(ticker).catch(() => null);
    97|    try {
    98|        [fundData, techData, chartData, analysisData] = await Promise.all([
    99|            fetchFundamental(ticker).catch(() => null),
   100|            fetchTechnical(ticker).catch(() => null),
   101|            fetchChartData(ticker, 100).catch(() => null),
   102|            fetchAnalysis(ticker).catch(() => null),
   103|        ]);
   104|    } catch(e) {
   105|        console.error("Error fetching detail data", e);
   106|    }
   107|
   108|    // Update Header
   109|    if (chartData && Array.isArray(chartData.data) && chartData.data.length > 0) {
   110|        const last = chartData.data[chartData.data.length - 1];
   111|        const prev = chartData.data[chartData.data.length - 2] || last;
   112|        const price = last.close;
   113|        const change = price - prev.close;
   114|        const pct = ((change / prev.close) * 100).toFixed(2);
   115|        const isPos = change >= 0;
   116|
   117|        const priceEl = document.getElementById('stock-price');
   118|        priceEl.textContent = `Rp ${price.toLocaleString()}`;
   119|        flashUpdate(priceEl, isPos);
   120|
   121|        const chEl = document.getElementById('stock-change');
   122|        chEl.textContent = `${isPos ? '+' : ''}${change.toLocaleString()} (${pct}%)`;
   123|        chEl.className = `mono text-sm mt-1 ${isPos ? 'text-up' : 'text-down'} strong`;
   124|    } else {
   125|        document.getElementById('live-badge').className = 'badge badge-down';
   126|        document.getElementById('live-badge').textContent = 'NO DATA';
   127|    }
   128|    
   129|    const issuerName = detailMeta?.data?.name || fundData?.data?.name || `${ticker} — Data not available`;
    document.getElementById('stock-name').textContent = issuerName;
   130|
   131|    if (typeof LightweightCharts !== 'undefined') renderLightweightChart(chartData);
   132|    renderTechnicalPanel(techData);
   133|    renderFundamentalPanel(fundData);
   134|    renderAnalysisPanel(analysisData);
   135|}
   136|
   137|function renderLightweightChart(chartData) {
   138|    const container = document.getElementById('tvchart');
   139|    if (!container) return;
   140|    
   141|    if (!chartData || !chartData.data || chartData.data.length === 0) {
   142|        container.innerHTML = `<div class="flex items-center justify-center text-dim" style="height:100%;">Chart data unavailable for this ticker.</div>`;
   143|        return;
   144|    }
   145|    
   146|    container.innerHTML = '';
   147|    
   148|    const chart = LightweightCharts.createChart(container, {
   149|        layout: { textColor: '#94a3b8', background: { type: 'solid', color: 'transparent' }, fontFamily: "'JetBrains Mono', monospace" },
   150|        grid: { vertLines: { color: 'rgba(255,255,255,0.02)' }, horzLines: { color: 'rgba(255,255,255,0.02)' } },
   151|        timeScale: { borderVisible: false, tickMarkFormatter: (time) => new Date(time).toLocaleDateString(undefined, {month:'short', day:'numeric'}) },
   152|        rightPriceScale: { borderVisible: false },
   153|        crosshair: { mode: LightweightCharts.CrosshairMode.Normal, vertLine: { color: 'rgba(255,255,255,0.1)', width: 1, style: 3 }, horzLine: { color: 'rgba(255,255,255,0.1)', width: 1, style: 3 } }
   154|    });
   155|    
   156|    const series = chart.addCandlestickSeries({
   157|        upColor: '#10b981', downColor: '#ef4444', borderVisible: false,
   158|        wickUpColor: '#10b981', wickDownColor: '#ef4444'
   159|    });
   160|
   161|    series.setData(chartData.data.map(d => ({
   162|        time: d.date, open: d.open, high: d.high, low: d.low, close: d.close
   163|    })));
   164|    
   165|    chart.timeScale().fitContent();
   166|    new ResizeObserver(() => chart.applyOptions({ width: container.clientWidth, height: container.clientHeight })).observe(container);
   167|}
   168|
   169|function renderTechnicalPanel(techData) {
   170|    const panel = document.getElementById('technical-panel');
   171|    const ind = techData?.technical?.indicators;
   172|    
   173|    const row = (label, val, status, isPos) => `
   174|        <div class="flex justify-between items-center">
   175|            <span class="text-xs text-dim uppercase strong" style="letter-spacing:0.05em;">${label}</span>
   176|            <div class="text-right">
   177|                <span class="mono strong text-main" style="font-size:14px;">${val}</span>
   178|                <div class="${isPos ? 'text-up' : 'text-down'} text-xs strong mt-1" style="font-family:var(--font-mono);">${status}</div>
   179|            </div>
   180|        </div>`;
   181|
   182|    if (!ind) {
   183|        panel.innerHTML = `<div class="text-dim text-sm p-4 text-center">Technical data currently unavailable.</div>`;
   184|        return;
   185|    }
   186|    panel.innerHTML = row('RSI (14)', ind.rsi.value, ind.rsi.status.toUpperCase(), ind.rsi.status === 'Neutral' || ind.rsi.status === 'Oversold') + 
   187|                      row('Trend', 'SMA', ind.trend.status.toUpperCase(), ind.trend.status.includes('Up'));
   188|}
   189|
   190|function renderFundamentalPanel(fundData) {
   191|    const panel = document.getElementById('fundamental-panel');
   192|    const d = fundData?.data;
   193|    const item = (l, v) => `<div><div class="text-xs text-dim uppercase strong mb-2" style="letter-spacing:0.05em;">${l}</div><div class="mono strong text-main" style="font-size:16px;">${v}</div></div>`;
   194|    
   195|    if (!d) {
   196|        panel.innerHTML = `<div class="col-span-2 text-dim text-sm text-center">Fundamental data currently unavailable.</div>`;
   197|        return;
   198|    }
   199|    panel.innerHTML = item('P/E Ratio', (d.trailing_pe?.toFixed(1) || 'N/A') + 'x') + 
   200|                      item('P/B Ratio', (d.price_to_book?.toFixed(1) || 'N/A') + 'x') + 
   201|                      item('Div Yield', ((d.dividend_yield * 100)?.toFixed(1) || 'N/A') + '%') + 
   202|                      item('ROE', ((d.roe * 100)?.toFixed(1) || 'N/A') + '%');
   203|}
   204|
   205|function renderAnalysisPanel(analysisData) {
   206|    const panel = document.getElementById('analysis-panel');
   207|    const data = analysisData?.data || analysisData?.analysis || null;
   208|
   209|    if (!panel) return;
   210|    if (!data) {
   211|        panel.innerHTML = `<div class="text-dim text-sm text-center">Analysis data currently unavailable.</div>`;
   212|        return;
   213|    }
   214|
   215|    const scoreLine = (label, value, cls='text-main') => `
   216|      <div class="flex justify-between items-center">
   217|        <span class="text-xs text-dim uppercase strong" style="letter-spacing:0.05em;">${label}</span>
   218|        <span class="mono strong ${cls}">${value}</span>
   219|      </div>`;
   220|
   221|    panel.innerHTML = `
   222|      ${scoreLine('Ticker', data.ticker || 'N/A')}
   223|      ${scoreLine('Swing Score', data.swing?.score ?? 'N/A', (data.swing?.label === 'strong' ? 'text-up' : 'text-main'))}
   224|      ${scoreLine('Valuation', data.valuation?.label || 'N/A')}
   225|      ${scoreLine('Dividend', data.dividend?.label || 'N/A')}
   226|      ${scoreLine('Gorengan', data.gorengan?.label || 'N/A', (data.gorengan?.score >= 60 ? 'text-down' : 'text-main'))}
   227|      <div class="text-xs text-dim" style="line-height:1.6;">Tags: ${(data.tags || []).join(', ') || 'none'}</div>
   228|    `;
   229|}
   230|