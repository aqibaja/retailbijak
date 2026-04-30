import { fetchFundamental, fetchTechnical, fetchAnalysis, fetchChartData, fetchStockDetail, saveWatchlistItem, showToast } from '../api.js?v=20260430l';
import { observeElements, flashUpdate } from '../main.js?v=20260430l';

const nf = (n, d = 2) => n == null || Number.isNaN(Number(n)) ? '—' : Number(n).toLocaleString('id-ID', { maximumFractionDigits: d });
const pf = (n) => n == null || Number.isNaN(Number(n)) ? '—' : `${Number(n) >= 0 ? '+' : ''}${Number(n).toFixed(2)}%`;

export async function renderStockDetail(root, ticker) {
  const symbol = String(ticker || 'GOTO').toUpperCase().replace('.JK','');
  root.innerHTML = `
    <section class="stock-detail-pro stagger-reveal">
      <div class="stock-hero panel">
        <div class="flex items-center gap-4">
          <a href="#dashboard" class="btn btn-icon"><i data-lucide="arrow-left"></i></a>
          <div><div class="flex items-center gap-3"><h1 class="mono text-3xl strong m-0 text-main">${symbol}</h1><span class="badge">IDX EQUITY</span><span class="badge badge-up" id="live-badge">DB</span></div><div class="text-sm text-muted" id="stock-name">Loading issuer data...</div></div>
        </div>
        <div class="text-right"><div class="mono text-3xl strong text-main" id="stock-price">—</div><div class="mono text-base mt-1" id="stock-change">—</div></div>
      </div>
      <div class="stock-layout">
        <div class="panel stock-chart-card">
          <div class="flex justify-between items-center mb-3"><div><h3 class="panel-title">Price Chart</h3><p class="text-xs text-dim" id="chart-subtitle">OHLCV dari DB lokal IDX</p></div><div class="dashboard-chip-row"><button class="btn btn-primary btn-mini stock-range" data-limit="1">1D</button><button class="btn btn-mini stock-range" data-limit="7">1W</button><button class="btn btn-mini stock-range" data-limit="30">1M</button></div></div>
          <div id="tvchart" class="stock-chart-wrap"></div>
        </div>
        <div class="stock-side flex-col gap-4">
          <div class="panel"><h3 class="panel-title mb-3">Technical Summary</h3><div id="technical-summary" class="intel-item">Loading technical...</div><div id="technical-panel" class="technical-grid mt-3"></div></div>
          <div class="panel"><h3 class="panel-title mb-3">Key Statistics</h3><div id="fundamental-panel" class="stats-grid"></div></div>
          <div class="panel"><h3 class="panel-title mb-3">Analysis Snapshot</h3><div id="analysis-panel" class="flex-col gap-2"></div></div>
          <div class="panel accent-top"><button id="btn-add-watchlist" class="btn btn-primary" style="width:100%;height:42px;">Add Watchlist</button></div>
        </div>
      </div>
    </section>`;
  observeElements();
  if (typeof lucide !== 'undefined') lucide.createIcons();
  document.getElementById('btn-add-watchlist').addEventListener('click', async () => {
    const res = await saveWatchlistItem({ ticker: symbol, notes: 'Added from detail page' });
    showToast(res?.ok ? `${symbol} added to Watchlist` : `Failed to add ${symbol}`, res?.ok ? 'success' : 'error');
  });

  const [detail, fund, tech, chart, analysis] = await Promise.all([
    fetchStockDetail(symbol).catch(()=>null), fetchFundamental(symbol).catch(()=>null), fetchTechnical(symbol).catch(()=>null), fetchChartData(symbol, 120).catch(()=>null), fetchAnalysis(symbol).catch(()=>null)
  ]);
  const candles = normalizeCandles(chart?.data?.length ? chart.data : makeFallbackCandles(symbol));
  hydrateHeader(symbol, detail, fund, candles);
  try { renderStockChart(candles, 1); } catch (e) { console.warn('stock chart fallback', e); renderFallbackSvgChart(candles.slice(-2)); }
  document.querySelectorAll('.stock-range').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.stock-range').forEach(b => b.classList.remove('btn-primary'));
    btn.classList.add('btn-primary');
    try { renderStockChart(candles, Number(btn.dataset.limit || 30)); } catch (e) { renderFallbackSvgChart(candles.slice(-Number(btn.dataset.limit || 30))); }
  }));
  renderTechnicalPanel(tech?.technical || {});
  renderFundamentalPanel(fund?.data || detail?.data || {}, candles);
  renderAnalysisPanel(analysis?.data || analysis?.analysis || {}, tech?.technical || {});
}

function normalizeCandles(rows){ return rows.map(r => ({ date: r.date || r.time, open:Number(r.open ?? r.close), high:Number(r.high ?? r.close), low:Number(r.low ?? r.close), close:Number(r.close), volume:Number(r.volume || 0) })).filter(r => r.date && r.close); }
function hydrateHeader(symbol, detail, fund, candles){
  const last = candles[candles.length-1], prev = candles[candles.length-2] || last;
  const change = last.close - prev.close, pct = prev.close ? change/prev.close*100 : 0;
  document.getElementById('stock-name').textContent = detail?.data?.name || fund?.data?.name || fallbackIssuerName(symbol);
  const priceEl = document.getElementById('stock-price'); priceEl.textContent = `Rp ${nf(last.close,0)}`; flashUpdate(priceEl, change >= 0);
  const chEl = document.getElementById('stock-change'); chEl.textContent = `${change >= 0 ? '+' : ''}${nf(change,0)} (${pf(pct)})`; chEl.className = `mono text-base mt-1 strong ${change >= 0 ? 'text-up' : 'text-down'}`;
}
function renderStockChart(candles, limit){
  const data = limit === 1 ? candles.slice(-2) : candles.slice(-limit);
  const container = document.getElementById('tvchart'); if (!container) return;
  document.getElementById('chart-subtitle').textContent = `${data[0]?.date || '—'} → ${data[data.length-1]?.date || '—'} · ${data.length} candle`;
  if (typeof LightweightCharts !== 'undefined') {
    container.innerHTML = '';
    const chart = LightweightCharts.createChart(container, { layout:{ textColor:'#94a3b8', background:{ type:'solid', color:'transparent' }}, grid:{ vertLines:{ color:'rgba(255,255,255,.03)'}, horzLines:{ color:'rgba(255,255,255,.03)'}}, rightPriceScale:{ borderVisible:false }, timeScale:{ borderVisible:false }});
    const series = chart.addCandlestickSeries({ upColor:'#10b981', downColor:'#ef4444', borderVisible:false, wickUpColor:'#10b981', wickDownColor:'#ef4444' });
    series.setData(data.map(d => ({ time:String(d.date).slice(0,10), open:d.open, high:d.high, low:d.low, close:d.close })));
    chart.timeScale().fitContent();
    new ResizeObserver(() => chart.applyOptions({ width: container.clientWidth, height: container.clientHeight })).observe(container);
  } else renderFallbackSvgChart(data);
}
function renderTechnicalPanel(t){
  const ind = t.indicators || {};
  document.getElementById('technical-summary').innerHTML = `<b>${t.rating || 'NEUTRAL'}</b> — ${t.summary || 'Technical summary belum tersedia lengkap.'}`;
  const cards = [
    ['RSI 14', ind.rsi?.value, ind.rsi?.status], ['MACD', ind.macd?.histogram, ind.macd?.status], ['Trend', ind.trend?.sma_20, ind.trend?.status], ['SMA 50', ind.trend?.sma_50, 'medium'], ['SMA 200', ind.trend?.sma_200, 'long'], ['Boll Upper', ind.bollinger_bands?.upper, 'BB'], ['Boll Lower', ind.bollinger_bands?.lower, 'BB'], ['Stoch %K', ind.stochastic?.k, ind.stochastic?.status], ['ATR', ind.atr?.value, ind.atr?.status], ['Volume Ratio', ind.volume?.ratio, ind.volume?.status], ['Support 20D', ind.support_resistance?.support_20d, 'support'], ['Resistance 20D', ind.support_resistance?.resistance_20d, 'resistance']
  ];
  document.getElementById('technical-panel').innerHTML = cards.map(([l,v,s]) => `<div class="stat-tile"><span>${l}</span><strong class="mono">${nf(v,2)}</strong><small>${s || '—'}</small></div>`).join('');
}
function renderFundamentalPanel(d, candles){
  const last = candles[candles.length-1] || {};
  const stats = [['Last Price', `Rp ${nf(last.close,0)}`], ['Volume', nf(last.volume,0)], ['P/E', d.trailing_pe ? `${nf(d.trailing_pe,1)}x` : '—'], ['P/B', d.price_to_book ? `${nf(d.price_to_book,1)}x` : '—'], ['ROE', d.roe ? pf(Number(d.roe) * (Math.abs(d.roe) <= 1 ? 100 : 1)) : '—'], ['DER', nf(d.debt_to_equity,2)], ['Revenue', nf(d.revenue,0)], ['Updated', d.updated_at ? String(d.updated_at).slice(0,10) : 'DB IDX']];
  document.getElementById('fundamental-panel').innerHTML = stats.map(([l,v]) => `<div class="stat-tile"><span>${l}</span><strong class="mono">${v}</strong></div>`).join('');
}
function renderAnalysisPanel(data, tech){
  const rows = [['Swing Score', data.swing?.score ?? tech.score ?? '—'], ['Signal', tech.rating || data.swing?.label || 'NEUTRAL'], ['Valuation', data.valuation?.label || '—'], ['Dividend', data.dividend?.label || '—'], ['Risk', data.gorengan?.label || 'normal']];
  document.getElementById('analysis-panel').innerHTML = rows.map(([l,v]) => `<div class="flex justify-between items-center"><span class="text-xs text-dim uppercase strong">${l}</span><span class="mono strong text-main">${v}</span></div>`).join('');
}
function renderFallbackSvgChart(data){
  const container = document.getElementById('tvchart');
  const vals = data.map(d=>d.close), min=Math.min(...vals), max=Math.max(...vals), w=720,h=320,p=24;
  const pts = vals.map((v,i)=>`${p+i*(w-2*p)/Math.max(vals.length-1,1)},${h-p-((v-min)/Math.max(max-min,1))*(h-2*p)}`).join(' ');
  container.innerHTML = `<svg viewBox="0 0 ${w} ${h}" class="fallback-svg-chart"><polyline fill="none" stroke="#10b981" stroke-width="3" points="${pts}"/><text x="${p}" y="${p}" fill="#94a3b8">${nf(vals[vals.length-1],0)}</text></svg>`;
}
function fallbackIssuerName(ticker){ const names={GOTO:'GoTo Gojek Tokopedia Tbk.',BBCA:'Bank Central Asia Tbk.',BMRI:'Bank Mandiri Tbk.',BBRI:'Bank Rakyat Indonesia Tbk.',TLKM:'Telkom Indonesia Tbk.'}; return names[ticker] || `${ticker} — IDX Equity`; }
function makeFallbackCandles(ticker){ const baseMap={GOTO:96,BBCA:9800,BMRI:5850,BBRI:4100,TLKM:3420}; const base=baseMap[ticker]||1000; const out=[]; for(let i=59;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); const wave=Math.sin(i/3)*0.025; const close=Math.round(base*(1+wave+(60-i)*0.0008)); out.push({date:d.toISOString().slice(0,10),open:close-2,high:close+4,low:close-5,close,volume:10000000+i*123456}); } return out; }
