import { fetchFundamental, fetchTechnical, fetchAnalysis, fetchChartData, fetchStockDetail, saveWatchlistItem, showToast } from '../api.js?v=20260430j';
import { observeElements, flashUpdate } from '../main.js?v=20260430j';
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

            <!-- Analysis -->
            <div class="panel flex-col">
                <h3 class="text-xs uppercase text-dim strong mb-4" style="border-bottom:1px solid var(--border-subtle); padding-bottom:12px; letter-spacing:0.08em;">Analysis Snapshot</h3>
                <div id="analysis-panel" class="flex-col gap-3 mt-2">
                    <div class="skeleton skel-text"></div>
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

    let fundData, techData, chartData, analysisData;

    const detailMeta = await fetchStockDetail(ticker).catch(() => null);
    try {
        [fundData, techData, chartData, analysisData] = await Promise.all([
            fetchFundamental(ticker).catch(() => null),
            fetchTechnical(ticker).catch(() => null),
            fetchChartData(ticker, 100).catch(() => null),
            fetchAnalysis(ticker).catch(() => null),
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
        const fallback = makeFallbackCandles(ticker);
        const last = fallback[fallback.length - 1];
        const prev = fallback[fallback.length - 2];
        const change = last.close - prev.close;
        const pct = ((change / prev.close) * 100).toFixed(2);
        document.getElementById('stock-price').textContent = `Rp ${last.close.toLocaleString('id-ID')}`;
        document.getElementById('stock-change').textContent = `${change >= 0 ? '+' : ''}${change.toLocaleString('id-ID')} (${pct}%)`;
        document.getElementById('stock-change').className = `mono text-sm mt-1 ${change >= 0 ? 'text-up' : 'text-down'} strong`;
        document.getElementById('live-badge').className = 'badge';
        document.getElementById('live-badge').textContent = 'DEMO';
        chartData = { data: fallback };
    }
    
    const issuerName = detailMeta?.data?.name || fundData?.data?.name || fallbackIssuerName(ticker);
    document.getElementById('stock-name').textContent = issuerName;

    try {
        if (typeof LightweightCharts !== 'undefined') renderLightweightChart(chartData);
        else renderFallbackSvgChart(chartData);
    } catch (e) {
        console.warn('Chart render fallback', e);
        renderFallbackSvgChart(chartData);
    }
    try { renderTechnicalPanel(techData); } catch (e) { console.warn('technical fallback', e); document.getElementById('technical-panel').innerHTML = fallbackTechnicalHtml(); }
    try { renderFundamentalPanel(fundData); } catch (e) { console.warn('fundamental fallback', e); document.getElementById('fundamental-panel').innerHTML = fallbackFundamentalHtml(); }
    try { renderAnalysisPanel(analysisData); } catch (e) { console.warn('analysis fallback', e); document.getElementById('analysis-panel').innerHTML = fallbackAnalysisHtml(); }
}

function renderLightweightChart(chartData) {
    const container = document.getElementById('tvchart');
    if (!container) return;
    
    if (!chartData || !chartData.data || chartData.data.length === 0) {
        const t = document.querySelector('.mono.text-3xl')?.textContent?.trim() || 'STOCK';
        chartData = { data: makeFallbackCandles(t) };
        const badge = document.getElementById('live-badge');
        if (badge) { badge.className = 'badge'; badge.textContent = 'DEMO'; }
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
        panel.innerHTML = fallbackTechnicalHtml();
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
        panel.innerHTML = fallbackFundamentalHtml();
        return;
    }
    panel.innerHTML = item('P/E Ratio', (d.trailing_pe?.toFixed(1) || 'N/A') + 'x') + 
                      item('P/B Ratio', (d.price_to_book?.toFixed(1) || 'N/A') + 'x') + 
                      item('Div Yield', ((d.dividend_yield * 100)?.toFixed(1) || 'N/A') + '%') + 
                      item('ROE', ((d.roe * 100)?.toFixed(1) || 'N/A') + '%');
}

function renderAnalysisPanel(analysisData) {
    const panel = document.getElementById('analysis-panel');
    const data = analysisData?.data || analysisData?.analysis || null;

    if (!panel) return;
    if (!data) {
        panel.innerHTML = fallbackAnalysisHtml();
        return;
    }

    const scoreLine = (label, value, cls='text-main') => `
      <div class="flex justify-between items-center">
        <span class="text-xs text-dim uppercase strong" style="letter-spacing:0.05em;">${label}</span>
        <span class="mono strong ${cls}">${value}</span>
      </div>`;

    panel.innerHTML = `
      ${scoreLine('Ticker', data.ticker || 'N/A')}
      ${scoreLine('Swing Score', data.swing?.score ?? 'N/A', (data.swing?.label === 'strong' ? 'text-up' : 'text-main'))}
      ${scoreLine('Valuation', data.valuation?.label || 'N/A')}
      ${scoreLine('Dividend', data.dividend?.label || 'N/A')}
      ${scoreLine('Gorengan', data.gorengan?.label || 'N/A', (data.gorengan?.score >= 60 ? 'text-down' : 'text-main'))}
      <div class="text-xs text-dim" style="line-height:1.6;">Tags: ${(data.tags || []).join(', ') || 'none'}</div>
    `;
}


function fallbackIssuerName(ticker) {
  const names = { GOTO:'GoTo Gojek Tokopedia Tbk.', BBCA:'Bank Central Asia Tbk.', BMRI:'Bank Mandiri Tbk.', BBRI:'Bank Rakyat Indonesia Tbk.', TLKM:'Telkom Indonesia Tbk.' };
  return names[String(ticker).toUpperCase()] || `${String(ticker).toUpperCase()} — IDX Equity`;
}
function makeFallbackCandles(ticker) {
  const baseMap = { GOTO: 96, BBCA: 9800, BMRI: 11750, BBRI: 4100, TLKM: 3420 };
  const base = baseMap[String(ticker).toUpperCase()] || 1000;
  const out = [];
  for (let i = 59; i >= 0; i--) {
    const date = new Date(); date.setDate(date.getDate() - i);
    const wave = Math.sin(i / 4) * base * 0.035;
    const close = Math.max(1, Math.round(base + wave + (30 - i) * base * 0.0008));
    const open = Math.max(1, Math.round(close * (1 + Math.sin(i) * 0.01)));
    const high = Math.max(open, close) + Math.max(1, Math.round(base * 0.018));
    const low = Math.max(1, Math.min(open, close) - Math.max(1, Math.round(base * 0.015)));
    out.push({ date: date.toISOString().slice(0,10), open, high, low, close });
  }
  return out;
}
function fallbackTechnicalHtml(){
  return `<div class="flex justify-between"><span class="text-xs text-dim uppercase strong">RSI (14)</span><b class="mono text-main">52.4</b></div><div class="flex justify-between"><span class="text-xs text-dim uppercase strong">Trend</span><b class="mono text-up">SIDEWAYS-UP</b></div><div class="text-xs text-dim">Demo technical fallback — data live belum tersedia.</div>`;
}
function fallbackFundamentalHtml(){
  return `<div><div class="text-xs text-dim uppercase strong mb-2">P/E Ratio</div><div class="mono strong text-main">N/A</div></div><div><div class="text-xs text-dim uppercase strong mb-2">P/B Ratio</div><div class="mono strong text-main">N/A</div></div><div><div class="text-xs text-dim uppercase strong mb-2">Div Yield</div><div class="mono strong text-main">N/A</div></div><div><div class="text-xs text-dim uppercase strong mb-2">ROE</div><div class="mono strong text-main">N/A</div></div>`;
}
function fallbackAnalysisHtml(){
  return `<div class="flex justify-between"><span class="text-xs text-dim uppercase strong">Signal</span><b class="mono text-main">WATCH</b></div><div class="flex justify-between"><span class="text-xs text-dim uppercase strong">Risk</span><b class="mono text-down">MEDIUM</b></div><div class="text-xs text-dim" style="line-height:1.6;">Belum ada analisis live. Gunakan chart fallback + scanner sebagai konteks awal.</div>`;
}

function renderFallbackSvgChart(chartData) {
  const container = document.getElementById('tvchart');
  const data = chartData?.data || makeFallbackCandles('STOCK');
  const closes = data.map(d => Number(d.close || 0));
  const min = Math.min(...closes), max = Math.max(...closes);
  const pts = closes.map((v,i)=>`${(i/(closes.length-1))*100},${90-((v-min)/Math.max(max-min,1))*70}`).join(' ');
  container.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:100%;display:block"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(16,185,129,.42)"/><stop offset="1" stop-color="rgba(16,185,129,0)"/></linearGradient></defs><polyline points="0,95 ${pts} 100,95" fill="url(#g)" stroke="none"/><polyline points="${pts}" fill="none" stroke="#10b981" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>`;
}
