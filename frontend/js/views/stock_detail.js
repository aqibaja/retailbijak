import { fetchFundamental, fetchTechnical, fetchAnalysis, fetchChartData, fetchStockDetail, saveWatchlistItem, showToast } from '../api.js?v=20260430n';
import { observeElements, flashUpdate } from '../main.js?v=20260430n';

const nf = (n, d = 2) => n == null || Number.isNaN(Number(n)) ? '—' : Number(n).toLocaleString('id-ID', { maximumFractionDigits: d });
const pf = (n) => n == null || Number.isNaN(Number(n)) ? '—' : `${Number(n) >= 0 ? '+' : ''}${Number(n).toFixed(2)}%`;
const money = (n) => n == null || Number.isNaN(Number(n)) ? '—' : `Rp ${nf(n, 0)}`;

export async function renderStockDetail(root, ticker) {
  const symbol = String(ticker || 'GOTO').toUpperCase().replace('.JK','');
  root.innerHTML = `
    <section class="stock-detail-pro stock-detail-compact stagger-reveal">
      <style>
        .stock-hero{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(135deg,rgba(15,23,42,.96),rgba(2,6,23,.92));box-shadow:0 18px 60px rgba(0,0,0,.24)}
        .stock-layout{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(320px,.85fr);gap:12px;margin-top:12px;align-items:stretch}.stock-chart-card{display:flex;flex-direction:column;min-height:calc(100vh - 150px)}.stock-chart-wrap{height:320px;border-radius:16px;background:radial-gradient(circle at top right,rgba(16,185,129,.08),transparent 42%),rgba(2,6,23,.45);border:1px solid rgba(255,255,255,.05);overflow:hidden}.stock-side{gap:10px!important}.compact-right-scroll{max-height:none;overflow:visible;padding-right:0}.stock-side .panel{border:1px solid rgba(255,255,255,.08);background:rgba(15,23,42,.72);padding:12px!important}.compact-grid-3{grid-template-columns:repeat(3,minmax(0,1fr))!important}.compact-notes{overflow:visible;scrollbar-width:thin}.chart-top-spacing{height:10px}.section-gap-large{height:18px}.decision-panel-gap{height:14px}.section-divider{height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.10),transparent);margin:14px 0 14px}.level-suggestions{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px}.sugg-chip{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:5px 8px;background:rgba(2,6,23,.48);border:1px solid rgba(255,255,255,.08);font-size:11px;color:var(--text-muted)}.sugg-chip strong{color:var(--text-main);text-transform:uppercase;letter-spacing:.08em}.sugg-chip small{color:var(--text-muted)}
        .technical-grid,.stats-grid,.insight-grid,.right-uniform-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(128px,1fr));gap:7px}.technical-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.metric-group{display:contents}.metric-group-title{grid-column:1/-1;font-size:10px;text-transform:uppercase;color:var(--text-muted);font-weight:900;letter-spacing:.08em;margin:6px 0 5px;display:flex;align-items:center;gap:6px}.decision-panel{display:grid;grid-template-columns:1fr;gap:10px}.below-chart-fill{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:10px}.below-chart-fill .stat-tile{min-height:72px}.ai-chat-placeholder{flex:1;margin-top:10px;min-height:220px;display:flex;flex-direction:column;border:1px dashed rgba(34,211,238,.25);background:linear-gradient(135deg,rgba(14,165,233,.08),rgba(15,23,42,.38));border-radius:16px;padding:14px}.ai-chat-box{display:flex;gap:10px;align-items:center;justify-content:space-between}.ai-thread-mock{flex:1;align-content:start}.ai-chat-input{margin-top:auto;height:42px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(2,6,23,.55);display:flex;align-items:center;padding:0 12px;color:var(--text-muted);font-size:13px}.decision-hero{padding:10px 12px;border-radius:16px;border:1px solid rgba(148,163,184,.20);background:linear-gradient(135deg,rgba(15,23,42,.84),rgba(2,6,23,.48))}.action-bar{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.chart-shell{position:relative}.level-overlay{position:absolute;inset:0;pointer-events:none}.stat-tile{min-height:72px;padding:8px 9px;border-radius:14px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.06)}.stat-tile span{display:block;font-size:10px;text-transform:uppercase;color:var(--text-dim);font-weight:800;letter-spacing:.06em}.stat-tile strong{display:block;margin-top:3px;font-size:14px;line-height:1.15}.stat-tile small{display:inline-flex;margin-top:2px;font-size:10px;color:var(--text-muted)}
        .metric-good{border-color:rgba(16,185,129,.35)!important;background:linear-gradient(180deg,rgba(16,185,129,.12),rgba(16,185,129,.035))!important}.metric-good strong,.metric-good .metric-value{color:#34d399!important}.metric-bad{border-color:rgba(239,68,68,.38)!important;background:linear-gradient(180deg,rgba(239,68,68,.13),rgba(239,68,68,.035))!important}.metric-bad strong,.metric-bad .metric-value{color:#fb7185!important}.metric-warn{border-color:rgba(245,158,11,.36)!important;background:linear-gradient(180deg,rgba(245,158,11,.12),rgba(245,158,11,.03))!important}.metric-warn strong,.metric-warn .metric-value{color:#fbbf24!important}.metric-neutral strong,.metric-neutral .metric-value{color:var(--text-main)!important}
        .signal-card{min-width:112px;padding:10px;border-radius:14px;background:rgba(2,6,23,.45);border:1px solid rgba(255,255,255,.08);text-align:right}.signal-card span{display:block;font-size:9px;text-transform:uppercase;color:var(--text-dim);font-weight:900;letter-spacing:.08em}.signal-card strong{display:block;margin-top:3px;font-size:20px}.signal-card small{display:block;margin-top:2px;font-size:10px;color:var(--text-muted)}.signal-pill{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:4px 8px;font-size:11px;font-weight:800;text-transform:uppercase}.pill-good{background:rgba(16,185,129,.14);color:#34d399;border:1px solid rgba(16,185,129,.32)}.pill-bad{background:rgba(239,68,68,.14);color:#fb7185;border:1px solid rgba(239,68,68,.32)}.pill-warn{background:rgba(245,158,11,.14);color:#fbbf24;border:1px solid rgba(245,158,11,.32)}.trade-plan{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.plan-card{padding:12px;border-radius:14px;background:rgba(2,6,23,.35);border:1px solid rgba(255,255,255,.06)}
        @media(max-width:1100px){.stock-layout{grid-template-columns:1fr}.stock-chart-wrap{height:300px}.stock-chart-card{min-height:auto}}@media(max-width:680px){.stock-hero{align-items:flex-start;gap:16px;flex-direction:column}.technical-grid,.stats-grid,.insight-grid,.trade-plan,.action-bar,.below-chart-fill{grid-template-columns:1fr}}
      </style>
      <div class="stock-hero panel">
        <div class="flex items-center gap-4">
          <a href="#dashboard" class="btn btn-icon"><i data-lucide="arrow-left"></i></a>
          <div>
            <div class="flex items-center gap-3"><h1 class="mono text-3xl strong m-0 text-main">${symbol}</h1><span class="badge">IDX EQUITY</span><span class="badge badge-up" id="live-badge">DB</span></div>
            <div class="text-sm text-muted" id="stock-name">Loading issuer data...</div>
          </div>
        </div>
        <div class="text-right"><div class="mono text-3xl strong text-main" id="stock-price">—</div><div class="mono text-base mt-1" id="stock-change">—</div></div>
      </div>
      <div class="stock-layout">
        <div class="panel stock-chart-card">
          <div class="flex justify-between items-center mb-3">
            <div><h3 class="panel-title">Price Chart</h3><p class="text-xs text-dim" id="chart-subtitle">OHLCV dari DB lokal IDX</p></div>
            <div class="dashboard-chip-row"><button class="btn btn-primary btn-mini stock-range" data-limit="7">7D</button><button class="btn btn-mini stock-range" data-limit="30">30D</button><button class="btn btn-mini stock-range" data-limit="120">ALL</button></div>
          </div>
          <div class="chart-top-spacing"></div>
          <div id="level-suggestions" class="level-suggestions"></div>
          <div class="chart-shell"><div id="tvchart" class="stock-chart-wrap"></div><div id="level-overlay" class="level-overlay"></div></div>
          <div class="decision-panel-gap"></div>
          <div id="decision-panel" class="decision-panel mt-3"></div>
          <div class="section-gap-large"></div>
          <div id="below-chart-fill" class="below-chart-fill"></div>
          <div class="section-divider"></div>
          <div class="ai-chat-placeholder ai-fill-panel"><div class="ai-chat-box"><div><div class="text-xs text-dim uppercase strong">AI Assistant</div><div class="text-sm text-main strong mt-1">Ask AI about this stock</div><div class="text-xs text-muted mt-1">UI placeholder — nanti terhubung ke AI analis RetailBijak.</div></div><span class="signal-pill pill-good">Coming Soon</span></div><div class="sample-prompts" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:14px"><div class="stat-tile metric-good"><span>Ask Risk</span><strong>Kenapa watch?</strong><small>risk / reward</small></div><div class="stat-tile metric-warn"><span>Ask Entry</span><strong>Area masuk?</strong><small>pullback plan</small></div><div class="stat-tile metric-neutral"><span>Ask News</span><strong>Katalis?</strong><small>ringkas berita</small></div><div class="stat-tile metric-good"><span>Ask Explain</span><strong>Alasan sinyal</strong><small>AI summary</small></div></div><div class="ai-thread-mock" style="display:grid;gap:8px;margin-top:12px"><div class="stat-tile metric-neutral"><span>AI Preview</span><div class="text-sm text-muted mt-1">Saya bisa bantu jelaskan kenapa sinyal watch, area entry ideal, dan risiko chasing.</div></div><div class="stat-tile metric-warn"><span>Risk Note</span><div class="text-sm text-muted mt-1">KONI sedang overbought; tunggu pullback sebelum ambil keputusan.</div></div><div class="stat-tile metric-good"><span>Plan Preview</span><div class="text-sm text-muted mt-1">Entry, stop, dan target akan dihitung agar R/R tetap sehat.</div></div><div class="stat-tile metric-neutral"><span>Next AI Module</span><div class="text-sm text-muted mt-1">Nanti chat ini akan pakai data chart, berita, fundamental, dan scanner.</div></div></div><div class="ai-chat-input">Tanya: risk, entry, news, atau alasan sinyal...</div></div>
        </div>
        <div class="stock-side compact-right-scroll flex-col gap-2">
          <div class="panel"><div class="flex justify-between items-start gap-3"><div><h3 class="panel-title mb-2">Technical Summary</h3><div id="technical-summary" class="intel-item">Loading technical...</div></div><div id="signal-card" class="signal-card"><span>Signal</span><strong>—</strong><small>Confidence —</small></div></div><div id="technical-panel" class="technical-grid right-uniform-grid mt-3"></div></div>
          <div class="panel"><h3 class="panel-title mb-3">Key Statistics</h3><div id="fundamental-panel" class="stats-grid right-uniform-grid compact-grid-3"></div></div>
          <div class="panel"><h3 class="panel-title mb-3">Analysis Snapshot</h3><div id="analysis-panel" class="insight-grid right-uniform-grid compact-grid-3"></div></div>
          <div class="panel"><h3 class="panel-title mb-3">Action Notes</h3><div id="insight-cards" class="compact-notes flex-col gap-2"></div></div>
          <div class="panel accent-top"><div class="action-bar"><button id="btn-add-watchlist" class="btn btn-primary" style="height:36px;">Add Watchlist</button><button id="btn-set-alert" class="btn" style="height:36px;">Set Alert</button><a href="#screener" class="btn" style="height:36px;display:flex;align-items:center;justify-content:center;">Run Scanner</a></div></div>
        </div>
      </div>
    </section>`;
  observeElements();
  if (typeof lucide !== 'undefined') lucide.createIcons();
  document.getElementById('btn-add-watchlist').addEventListener('click', async () => {
    const res = await saveWatchlistItem({ ticker: symbol, notes: 'Added from detail page' });
    showToast(res?.ok ? `${symbol} added to Watchlist` : `Failed to add ${symbol}`, res?.ok ? 'success' : 'error');
  });
  document.getElementById('btn-set-alert').addEventListener('click', () => showToast(`Alert placeholder for ${symbol}: use entry/stop/target levels`, 'info'));

  const [detail, fund, tech, chart, analysis] = await Promise.all([
    fetchStockDetail(symbol).catch(()=>null), fetchFundamental(symbol).catch(()=>null), fetchTechnical(symbol).catch(()=>null), fetchChartData(symbol, 160).catch(()=>null), fetchAnalysis(symbol).catch(()=>null)
  ]);
  const candles = normalizeCandles(chart?.data?.length ? chart.data : makeFallbackCandles(symbol));
  hydrateHeader(symbol, detail, fund, candles);
  try { renderStockChart(candles, 7); } catch (e) { console.warn('stock chart fallback', e); renderFallbackSvgChart(candles.slice(-7)); }
  document.querySelectorAll('.stock-range').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.stock-range').forEach(b => b.classList.remove('btn-primary'));
    btn.classList.add('btn-primary');
    try { renderStockChart(candles, Number(btn.dataset.limit || 30)); renderFallbackSvgChart(candles.slice(-Number(btn.dataset.limit || 30))); } catch (e) { renderFallbackSvgChart(candles.slice(-Number(btn.dataset.limit || 30))); }
  }));
  const technical = tech?.technical || {};
  const analysisData = analysis?.data || analysis?.analysis || {};
  renderTechnicalPanel(technical);
  renderFundamentalPanel(fund?.data || detail?.data || {}, candles, technical);
  renderAnalysisPanel(analysisData, technical);
  renderDecisionPanel(candles, technical);
  renderBelowChartFill(candles, technical);
  renderTradePlan(candles, technical);
  renderInsightCards(candles, technical, analysisData);
  renderLevelSuggestions(candles, technical);
  renderLevelOverlay(candles, technical);

  
  
  
  
  
  
  

}

function normalizeCandles(rows){ return rows.map(r => ({ date: r.date || r.time, open:Number(r.open ?? r.close), high:Number(r.high ?? r.close), low:Number(r.low ?? r.close), close:Number(r.close), volume:Number(r.volume || 0) })).filter(r => r.date && r.close); }
function hydrateHeader(symbol, detail, fund, candles){
  const last = candles[candles.length-1], prev = candles[candles.length-2] || last;
  const change = last.close - prev.close, pct = prev.close ? change/prev.close*100 : 0;
  document.getElementById('stock-name').textContent = detail?.data?.name || fund?.data?.name || fallbackIssuerName(symbol);
  const priceEl = document.getElementById('stock-price'); priceEl.textContent = money(last.close); flashUpdate(priceEl, change >= 0);
  const chEl = document.getElementById('stock-change'); chEl.textContent = `${change >= 0 ? '+' : ''}${nf(change,0)} (${pf(pct)})`; chEl.className = `mono text-base mt-1 strong ${change >= 0 ? 'text-up' : 'text-down'}`;
}
function renderStockChart(candles, limit){
  const data = candles.slice(-Math.min(limit, candles.length));
  const container = document.getElementById('tvchart'); if (!container) return;
  document.getElementById('chart-subtitle').textContent = `${data[0]?.date || '—'} → ${data[data.length-1]?.date || '—'} · ${data.length} candle`;
  if (typeof LightweightCharts !== 'undefined') {
    container.innerHTML = '';
    const chart = LightweightCharts.createChart(container, { width:container.clientWidth, height:container.clientHeight, layout:{ textColor:'#94a3b8', background:{ type:'solid', color:'transparent' }}, grid:{ vertLines:{ color:'rgba(255,255,255,.035)'}, horzLines:{ color:'rgba(255,255,255,.035)'}}, rightPriceScale:{ borderVisible:false }, timeScale:{ borderVisible:false, timeVisible:false }});
    const series = chart.addCandlestickSeries({ upColor:'#10b981', downColor:'#ef4444', borderVisible:false, wickUpColor:'#10b981', wickDownColor:'#ef4444' });
    series.setData(data.map(d => ({ time:String(d.date).slice(0,10), open:d.open, high:d.high, low:d.low, close:d.close })));
    const vol = chart.addHistogramSeries({ priceFormat:{type:'volume'}, priceScaleId:'', color:'#64748b55' });
    vol.setData(data.map(d => ({ time:String(d.date).slice(0,10), value:d.volume, color:d.close >= d.open ? '#10b98155' : '#ef444455' })));
    chart.priceScale('').applyOptions({ scaleMargins:{ top:.82, bottom:0 }});
    chart.timeScale().fitContent();
    new ResizeObserver(() => chart.applyOptions({ width: container.clientWidth, height: container.clientHeight })).observe(container);
  } else renderFallbackSvgChart(data);
}
function sentimentClass(label, value, metric = ''){
  const s = String(label || '').toLowerCase(); const v = Number(value);
  if (['bullish','above sma20','spike','strong','fair','low','support'].some(x => s.includes(x))) return 'metric-good';
  if (['bearish','below','weak','high risk','expensive','danger'].some(x => s.includes(x))) return 'metric-bad';
  if (['overbought','volatile','resistance','insufficient','watch'].some(x => s.includes(x))) return 'metric-warn';
  if (metric === 'rsi' && v >= 70) return 'metric-warn';
  if (metric === 'rsi' && v <= 30) return 'metric-bad';
  if (metric === 'roe' && v > 15) return 'metric-good';
  if (metric === 'roe' && v < 5) return 'metric-bad';
  if (metric === 'der' && v > 2) return 'metric-bad';
  return 'metric-neutral';
}
function tile(label, value, status = '', cls = ''){ return `<div class="stat-tile ${cls || sentimentClass(status, value)}"><span>${label}</span><strong class="mono metric-value">${value}</strong>${status ? `<small>${status}</small>` : ''}</div>`; }
function renderTechnicalPanel(t){
  const ind = t.indicators || {}; const isNoData = String(t.rating || '').toUpperCase().includes('NO DATA'); const score = isNoData ? null : Number(t.score ?? 0); const ratingCls = isNoData ? 'metric-neutral' : sentimentClass(t.rating, score);
  document.getElementById('technical-summary').innerHTML = `<span class="signal-pill ${ratingCls === 'metric-good' ? 'pill-good' : ratingCls === 'metric-bad' ? 'pill-bad' : 'pill-warn'}">${t.rating || 'NEUTRAL'}</span><div class="mt-2 text-sm text-muted">${t.summary || 'Technical summary belum tersedia lengkap.'}</div>`;
  const signal = document.getElementById('signal-card'); signal.classList.add(ratingCls); signal.querySelector('strong').textContent = t.rating || 'NEUTRAL'; signal.querySelector('small').textContent = score == null ? 'Confidence —' : `Confidence ${nf(score,0)}/100`;
  const groups = [
    ['Momentum', [['RSI 14', nf(ind.rsi?.value,2), ind.rsi?.status, sentimentClass(ind.rsi?.status, ind.rsi?.value, 'rsi')], ['Stoch %K', nf(ind.stochastic?.k,2), ind.stochastic?.status], ['MACD', nf(ind.macd?.histogram,2), ind.macd?.status]]],
    ['Trend', filterValidCards([['SMA 20', nf(ind.trend?.sma_20,2), ind.trend?.status], ['SMA 50', nf(ind.trend?.sma_50,2), 'medium'], ['SMA 200', nf(ind.trend?.sma_200,2), 'long']])],
    ['Volatility', filterValidCards([['ATR 14', nf(ind.atr?.value,2), ind.atr?.status], ['Boll Upper', nf(ind.bollinger_bands?.upper,2), 'resistance', 'metric-warn'], ['Boll Lower', nf(ind.bollinger_bands?.lower,2), 'support', 'metric-good']])],
    ['Levels', filterValidCards([['Volume Ratio', nf(ind.volume?.ratio,2), ind.volume?.status], ['Support', isValidLevel(ind.support_resistance?.support_20d) ? money(ind.support_resistance.support_20d) : '—', 'support', 'metric-good'], ['Resistance', isValidLevel(ind.support_resistance?.resistance_20d) ? money(ind.support_resistance.resistance_20d) : '—', 'resistance', 'metric-warn']])],
  ];
  document.getElementById('technical-panel').innerHTML = groups.map(([title, cards]) => renderMetricGroup(title, cards)).join('');
}

function renderMetricGroup(title, cards){
  if (!cards.length) return '';
  return `<div class="metric-group-title full-row">${title}</div>${cards.map(([l,v,s,c]) => tile(l,v,s,c)).join('')}`;
}
function isValidLevel(value){ return Number.isFinite(Number(value)) && Number(value) > 0; }
function filterValidCards(cards){ return cards.filter(([, value]) => value !== '—' && !String(value).match(/^Rp\s*0$/)); }
function getLevels(candles, tech){
  const last = candles[candles.length-1] || {}; const sr = tech?.indicators?.support_resistance || {}; const atr = Number(tech?.indicators?.atr?.value || 0);
  const entry = last.close; const rawStop = isValidLevel(sr.support_20d) ? Number(sr.support_20d) : entry - (atr || entry*.06); const tightStop = entry - Math.min(atr ? atr*.5 : entry*.06, entry*.06); const stop = Math.max(rawStop, tightStop); const rawTarget = isValidLevel(sr.resistance_20d) ? Number(sr.resistance_20d) : entry + (atr || entry*.08); const rrFloor = 1.8; const minReward = Math.max(entry - stop, 1) * rrFloor; const minTarget = entry + minReward; const target = Math.max(rawTarget, minTarget);
  return { entry, stop: Math.max(1, stop), target, support: isValidLevel(sr.support_20d) ? Number(sr.support_20d) : null, resistance: isValidLevel(sr.resistance_20d) ? Number(sr.resistance_20d) : null, atr };
}
function renderDecisionPanel(candles, tech){
  const levels = getLevels(candles, tech); const rsi = tech?.indicators?.rsi?.value; const rating = tech?.rating || 'NEUTRAL';
  const risk = Math.max(levels.entry - levels.stop, 1), reward = Math.max(levels.target - levels.entry, 0); const rr = reward/risk;
  const action = rating === 'BEARISH' ? 'HINDARI DULU' : (rsi >= 70 || rr < 1) ? 'TAHAN / WATCH' : rating === 'BULLISH' ? 'AKUMULASI BERTAHAP' : 'WATCH';
  const caution = rr < 1 ? 'Risk/reward kurang ideal — jangan chasing, tunggu pullback/level lebih murah.' : 'Setup boleh dipantau, tetap tunggu konfirmasi volume dan candle.';
  document.getElementById('decision-panel').innerHTML = `<div class="decision-hero"><div class="text-xs text-dim uppercase strong">Decision Panel</div><div class="flex justify-between items-center mt-2"><strong class="text-main">${action}</strong><span class="signal-pill ${action.includes('HINDARI') ? 'pill-bad' : action.includes('TAHAN') ? 'pill-warn' : 'pill-good'}">R/R ${nf(rr,2)}x</span></div><div class="text-sm text-muted mt-2">${caution}</div><div class="text-xs text-dim mt-2">Area pantau ${money(levels.entry)} · invalid bawah ${money(levels.stop)} · target ${money(levels.target)}</div></div>`;
}
function renderLevelOverlay(candles, tech){
  const overlay=document.getElementById('level-overlay'); if(!overlay) return; overlay.innerHTML = '';
}
function renderLevelSuggestions(candles, tech){
  const el=document.getElementById('level-suggestions'); if(!el) return; const levels=getLevels(candles, tech);
  const items=[['STOP', levels.stop, 'risk control', 'metric-bad'], ['ENTRY', levels.entry, 'pullback zone', 'metric-good'], ['TARGET', levels.target, 'reward zone', 'metric-warn']];
  el.innerHTML = items.map(([label, price, note, cls]) => `<span class="sugg-chip ${cls}"><strong>${label}</strong> ${money(price)} <small>${note}</small></span>`).join('');
}
function renderFundamentalPanel(d, candles, tech){
  const last = candles[candles.length-1] || {}; const volRatio = tech?.indicators?.volume?.ratio;
  const stats = [
    ['Last Price', money(last.close), tech?.rating || '', sentimentClass(tech?.rating, last.close)], ['Volume', nf(last.volume,0), volRatio ? `${nf(volRatio,2)}x avg` : '', sentimentClass('spike', volRatio)], ['P/E', d.trailing_pe ? `${nf(d.trailing_pe,1)}x` : '—', d.trailing_pe ? (d.trailing_pe < 12 ? 'cheap' : d.trailing_pe > 25 ? 'expensive' : 'fair') : 'no data'], ['P/B', d.price_to_book ? `${nf(d.price_to_book,1)}x` : '—', d.price_to_book ? (d.price_to_book < 1.5 ? 'cheap' : d.price_to_book > 3 ? 'expensive' : 'fair') : 'no data'], ['ROE', d.roe ? pf(Number(d.roe) * (Math.abs(d.roe) <= 1 ? 100 : 1)) : '—', 'profitability', sentimentClass('', d.roe, 'roe')], ['DER', nf(d.debt_to_equity,2), 'leverage', sentimentClass('', d.debt_to_equity, 'der')], ['Revenue', nf(d.revenue,0), d.revenue ? 'reported' : 'no data'], ['Updated', d.updated_at ? String(d.updated_at).slice(0,10) : 'DB IDX', 'source']
  ];
  document.getElementById('fundamental-panel').innerHTML = stats.map(([l,v,s,c]) => tile(l,v,s,c)).join('');
}

function renderBelowChartFill(candles, tech){
  const el = document.getElementById('below-chart-fill'); if (!el) return;
  const data = candles.slice(-7); const last = candles[candles.length-1] || {}; const first = data[0] || last;
  const highs = data.map(d=>d.high).filter(Number.isFinite), lows = data.map(d=>d.low).filter(Number.isFinite);
  const rangePct = first?.close ? ((last.close - first.close) / first.close) * 100 : null;
  const volumeRatio = tech?.indicators?.volume?.ratio; const rsi = tech?.indicators?.rsi?.value; const levels = getLevels(candles, tech);
  const cards = [
    ['Range 7D', rangePct == null ? '—' : pf(rangePct), `${money(Math.min(...lows))} - ${money(Math.max(...highs))}`, rangePct >= 0 ? 'metric-good' : 'metric-bad'],
    ['Volume Context', volumeRatio ? `${nf(volumeRatio,2)}x avg` : '—', volumeRatio >= 1.5 ? 'active' : 'normal', volumeRatio >= 1.5 ? 'metric-good' : 'metric-neutral'],
    ['Level Plan', `${money(levels.stop)} / ${money(levels.target)}`, 'stop / target', 'metric-neutral'],
    ['Quick Read', rsi >= 70 ? 'Wait pullback' : (tech.rating || 'Watch'), rsi >= 70 ? 'overbought' : 'setup', rsi >= 70 ? 'metric-warn' : sentimentClass(tech.rating, tech.score)],
  ];
  el.innerHTML = cards.map(([l,v,s,c]) => tile(l,v,s,c)).join('');
}

function renderAnalysisPanel(data, tech){
  const noData = String(tech.rating || '').toUpperCase().includes('NO DATA');
  const rows = noData
    ? [['Swing Score', '—', 'no data'], ['Signal', 'NO DATA', 'no data'], ['Valuation', '—', 'no data'], ['Quality', '—', 'no data'], ['Risk', '—', 'no data']]
    : [['Swing Score', data.swing?.score ?? tech.score ?? '—', tech.score >= 60 ? 'bullish' : 'watch'], ['Signal', tech.rating || data.swing?.label || 'NEUTRAL', tech.rating], ['Valuation', data.valuation?.label || 'fair', data.valuation?.label || 'fair'], ['Quality', data.dividend?.label || 'weak', data.dividend?.label || 'weak'], ['Risk', data.gorengan?.label || 'normal', data.gorengan?.label || 'normal']];
  document.getElementById('analysis-panel').innerHTML = rows.map(([l,v,s]) => tile(l, v, s)).join('');
}
function renderTradePlan(candles, tech){
  const last = candles[candles.length-1] || {}; const sr = tech?.indicators?.support_resistance || {}; const atr = tech?.indicators?.atr?.value;
  const entry = last.close, stop = sr.support_20d && sr.support_20d > 0 ? sr.support_20d : (entry - (atr || entry*.08)); const target = sr.resistance_20d || (entry + (atr || entry*.1));
  const el = document.getElementById('trade-plan'); if (el) el.innerHTML = [ ['Entry Zone', `${money(entry)} ± ${nf((atr || entry*.03),0)}`, 'wait pullback'], ['Stop Area', money(Math.max(1, stop)), 'risk control'], ['Target Near', money(target), 'resistance'] ].map(([l,v,s]) => `<div class="plan-card"><div class="text-xs text-dim uppercase strong">${l}</div><div class="mono strong text-main mt-1">${v}</div><div class="text-xs text-muted mt-1">${s}</div></div>`).join('');
}
function renderInsightCards(candles, tech, data){
  const pct = tech?.change_pct; const vol = tech?.indicators?.volume?.ratio; const rsi = tech?.indicators?.rsi?.value;
  const notes = [
    {t:'Momentum', v: pct >= 0 ? `Harga naik ${pf(pct)}; trend sedang kuat.` : `Harga turun ${pf(pct)}; tunggu konfirmasi.`, c: pct >= 0 ? 'metric-good' : 'metric-bad'},
    {t:'Volume', v: vol ? `Volume ${nf(vol,2)}x rata-rata 20 hari.` : 'Volume belum lengkap.', c: vol >= 1.5 ? 'metric-good' : 'metric-neutral'},
    {t:'Risk', v: rsi >= 70 ? 'RSI overbought — jangan chasing, tunggu pullback.' : 'Risk relatif terkendali.', c: rsi >= 70 ? 'metric-warn' : 'metric-good'}
  ];
  document.getElementById('insight-cards').innerHTML = notes.map(n => `<div class="stat-tile ${n.c}"><span>${n.t}</span><div class="text-sm text-muted mt-1">${n.v}</div></div>`).join('');
}
function renderFallbackSvgChart(data){
  const container = document.getElementById('tvchart');
  const vals = data.map(d=>d.close), min=Math.min(...vals), max=Math.max(...vals), w=720,h=320,p=24;
  const pts = vals.map((v,i)=>`${p+i*(w-2*p)/Math.max(vals.length-1,1)},${h-p-((v-min)/Math.max(max-min,1))*(h-2*p)}`).join(' ');
  container.innerHTML = `<svg viewBox="0 0 ${w} ${h}" class="fallback-svg-chart"><polyline fill="none" stroke="#10b981" stroke-width="3" points="${pts}"/><text x="${p}" y="${p}" fill="#94a3b8">${nf(vals[vals.length-1],0)}</text></svg>`;
}
function fallbackIssuerName(ticker){ const names={GOTO:'GoTo Gojek Tokopedia Tbk.',BBCA:'Bank Central Asia Tbk.',BMRI:'Bank Mandiri Tbk.',BBRI:'Bank Rakyat Indonesia Tbk.',TLKM:'Telkom Indonesia Tbk.'}; return names[ticker] || `${ticker} — IDX Equity`; }
function makeFallbackCandles(ticker){ const baseMap={GOTO:96,BBCA:9800,BMRI:5850,BBRI:4100,TLKM:3420}; const base=baseMap[ticker]||1000; const out=[]; for(let i=59;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); const wave=Math.sin(i/3)*0.025; const close=Math.round(base*(1+wave+(60-i)*0.0008)); out.push({date:d.toISOString().slice(0,10),open:close-2,high:close+4,low:close-5,close,volume:10000000+i*123456}); } return out; }
