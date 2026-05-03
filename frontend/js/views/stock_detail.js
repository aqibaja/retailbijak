import { fetchFundamental, fetchTechnical, fetchAnalysis, fetchChartData, fetchStockDetail, fetchNews, apiFetch, saveWatchlistItem, showToast } from '../api.js?v=20260503b';
import { observeElements, flashUpdate } from '../main.js?v=20260503aa';

const nf = (n, d = 2) => n == null || Number.isNaN(Number(n)) ? '—' : Number(n).toLocaleString('id-ID', { maximumFractionDigits: d });
const pf = (n) => n == null || Number.isNaN(Number(n)) ? '—' : `${Number(n) >= 0 ? '+' : ''}${Number(n).toFixed(2)}%`;
const money = (n) => n == null || Number.isNaN(Number(n)) ? '—' : `Rp ${nf(n, 0)}`;

export async function renderStockDetail(root, ticker) {
  const symbol = String(ticker || 'GOTO').toUpperCase().replace('.JK','');
  root.innerHTML = `
    <section class="stock-detail-pro stock-detail-compact stagger-reveal">
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
          <div id="catalyst-strip" class="below-chart-fill"></div>
          <div class="section-divider"></div>
          <div class="ai-chat-placeholder ai-fill-panel"><div class="ai-chat-box"><div><div class="text-xs text-dim uppercase strong">AI Assistant</div><div class="text-sm text-main strong mt-1">Ask AI about this stock</div><div class="text-xs text-muted mt-1">Preview AI berbasis chart, fundamental, berita, dan scanner RetailBijak.</div></div><span class="signal-pill pill-good">AI Preview</span></div><div class="sample-prompts" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:14px"><div class="stat-tile metric-good"><span>Ask Risk</span><strong>Kenapa watch?</strong><small>risk / reward</small></div><div class="stat-tile metric-warn"><span>Ask Entry</span><strong>Area masuk?</strong><small>pullback plan</small></div><div class="stat-tile metric-neutral"><span>Ask News</span><strong>Katalis?</strong><small>ringkas berita</small></div><div class="stat-tile metric-good"><span>Ask Explain</span><strong>Alasan sinyal</strong><small>AI summary</small></div></div><div class="ai-thread-mock" style="display:grid;gap:8px;margin-top:12px"></div><div class="ai-chat-input">Tanya: risk, entry, news, atau alasan sinyal...</div></div>
        </div>
        <div class="stock-side compact-right-scroll flex-col gap-2">
          <div class="panel"><h3 class="panel-title mb-3">Session Snapshot</h3><div id="snapshot-panel" class="snapshot-grid right-uniform-grid compact-grid-3"></div></div>
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

  const [detail, fund, tech, chart, analysis, news, announcements] = await Promise.all([
    fetchStockDetail(symbol).catch(()=>null), fetchFundamental(symbol).catch(()=>null), fetchTechnical(symbol).catch(()=>null), fetchChartData(symbol, 160).catch(()=>null), fetchAnalysis(symbol).catch(()=>null),
    fetchNews(6).catch(()=>null), apiFetch(`/company-announcements?companyCode=${encodeURIComponent(symbol)}&limit=4`).catch(()=>null)
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
  renderSnapshotPanel(fund?.data || detail?.data || {}, candles, technical);
  renderFundamentalPanel(fund?.data || detail?.data || {}, candles, technical);
  renderAnalysisPanel(analysisData, technical);
  renderDecisionPanel(candles, technical);
  renderBelowChartFill(candles, technical);
  renderCatalystStrip(symbol, news, announcements);
  renderAiPreview(symbol, fund?.data || detail?.data || {}, candles, technical, analysisData);
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

function renderSnapshotPanel(d, candles, tech){
  const el = document.getElementById('snapshot-panel'); if (!el) return;
  const last = candles[candles.length-1] || {}; const prev = candles[candles.length-2] || last;
  const delta = Number(last.close || 0) - Number(prev.close || 0); const pct = prev.close ? (delta / prev.close) * 100 : null;
  const hasFundamental = Boolean(d && (d.trailing_pe || d.price_to_book || d.roe || d.revenue || d.updated_at));
  const cards = [
    ['Open', money(last.open), 'today setup', 'metric-neutral'],
    ['High / Low', `${money(last.high)} / ${money(last.low)}`, 'session range', 'metric-neutral'],
    ['Prev Close', money(prev.close), pct == null ? 'daily baseline' : pf(pct), delta >= 0 ? 'metric-good' : 'metric-bad'],
    ['Volume Pace', nf(last.volume,0), tech?.indicators?.volume?.ratio ? `${nf(tech.indicators.volume.ratio,2)}x avg` : 'flow monitor', sentimentClass('spike', tech?.indicators?.volume?.ratio)],
    ['Fundamental Coverage', hasFundamental ? 'ready' : 'fundamental pending', hasFundamental ? 'db snapshot' : 'waiting richer DB', hasFundamental ? 'metric-good' : 'metric-warn'],
    ['Trend Bias', tech?.rating || 'WATCH', tech?.summary || 'technical snapshot', sentimentClass(tech?.rating, tech?.score)],
  ];
  el.innerHTML = cards.map(([l,v,s,c]) => tile(l,v,s,c)).join('');
}

function renderAiPreview(symbol, d, candles, tech, analysis){
  const host = document.querySelector('.ai-thread-mock'); if (!host) return;
  const levels = getLevels(candles, tech); const last = candles[candles.length-1] || {}; const rsi = Number(tech?.indicators?.rsi?.value);
  const hasFundamental = Boolean(d && (d.trailing_pe || d.price_to_book || d.roe || d.revenue || d.updated_at));
  const valuation = d.trailing_pe ? (d.trailing_pe < 12 ? 'valuasi murah' : d.trailing_pe > 25 ? 'valuasi premium' : 'valuasi fair') : 'valuasi belum lengkap';
  const setupBias = tech?.rating === 'BULLISH' ? 'Bias bullish, fokus akumulasi bertahap.' : tech?.rating === 'BEARISH' ? 'Bias defensif, hindari entry agresif.' : 'Bias netral, tunggu konfirmasi lanjutan.';
  const quickTake = rsi >= 70 ? `${symbol} mulai panas; utamakan disiplin entry dan jangan chasing.` : `${symbol} masih layak dipantau untuk setup berikutnya.`;
  const tradeMap = `Pantau ${money(levels.entry)} · invalid ${money(levels.stop)} · target ${money(levels.target)}.`;
  const catalyst = analysis?.valuation?.label || analysis?.swing?.label || 'belum ada katalis dominan';
  host.innerHTML = `<div class="stat-tile metric-neutral"><span>AI Quick Take</span><div class="text-sm text-muted mt-1">${quickTake}</div></div><div class="stat-tile ${sentimentClass(tech?.rating, tech?.score)}"><span>Setup Bias</span><div class="text-sm text-muted mt-1">${setupBias}</div></div><div class="stat-tile ${hasFundamental ? 'metric-good' : 'metric-warn'}"><span>Valuation Read</span><div class="text-sm text-muted mt-1">${valuation}; ${hasFundamental ? 'fundamental sudah bisa dibaca.' : 'fundamental masih pending.'}</div></div><div class="stat-tile metric-good"><span>Trade Map</span><div class="text-sm text-muted mt-1">${tradeMap}</div></div><div class="stat-tile metric-neutral"><span>Catalyst Lens</span><div class="text-sm text-muted mt-1">AI akan merangkum catalyst terbaru; saat ini ${catalyst}.</div></div>`;
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

function catalystTile(label, title, body, cls = 'metric-neutral', href = 'news://pending', meta = ''){
  const safeHref = href || 'news://pending';
  const cardHref = safeHref;
  return `<div class="stat-tile ${cls}" style="position:relative"><span>${label}</span><strong>${title}</strong><small>${body}</small><small>${meta || `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">Catalyst Link</a>`}</small><a class="stretched-link" href="${cardHref}" target="_blank" rel="noopener noreferrer" aria-label="Open catalyst source"></a></div>`;
}

function scoreCatalystRow(row, symbolUpper){
  const haystack = `${row?.ticker || ''} ${row?.code || ''} ${row?.title || ''} ${row?.summary || ''} ${row?.subject || ''}`.toUpperCase();
  let score = 0;
  if ((row?.ticker || '').toUpperCase() === symbolUpper) score += 10;
  if ((row?.code || '').toUpperCase() === symbolUpper) score += 10;
  if (haystack.includes(symbolUpper)) score += 5;
  if (row?.link) score += 1;
  return score;
}

function rankCatalystRows(rows, symbolUpper){
  return rows
    .map((row) => ({ ...row, score: scoreCatalystRow(row, symbolUpper) }))
    .sort((a, b) => b.score - a.score);
}

function formatRelativeCatalystTime(value){
  if (!value) return 'source live';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return 'source live';
  const diffMs = Date.now() - dt.getTime();
  const diffMin = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMin < 60) return `${diffMin || 1}m lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}j lalu`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}h lalu`;
}

function renderCatalystStrip(symbol, newsPayload, announcementsPayload){
  const el = document.getElementById('catalyst-strip'); if (!el) return;
  const symbolUpper = String(symbol || '').toUpperCase();
  const newsRows = rankCatalystRows(Array.isArray(newsPayload?.data) ? newsPayload.data : [], symbolUpper);
  const announcementRows = rankCatalystRows(Array.isArray(announcementsPayload?.data) ? announcementsPayload.data : [], symbolUpper);
  const relevantNews = newsRows[0]?.score > 0 ? newsRows[0] : null;
  const latestAnnouncement = announcementRows[0]?.score > 0 ? announcementRows[0] : announcementRows[0] || null;
  const newsHref = relevantNews?.link || 'news://pending';
  const annHref = latestAnnouncement?.link || 'news://pending';
  const newsMeta = `${formatRelativeCatalystTime(relevantNews?.published_at)} · <a href="${newsHref}" target="_blank" rel="noopener noreferrer">Catalyst Link</a>`;
  const annMeta = `${formatRelativeCatalystTime(latestAnnouncement?.date)} · <a href="${annHref}" target="_blank" rel="noopener noreferrer">Catalyst Link</a>`;
  const cards = [
    relevantNews
      ? catalystTile('Latest Catalysts', 'News Pulse', (relevantNews.title || relevantNews.summary || 'Berita terbaru tersedia').slice(0, 96), 'metric-good', newsHref, newsMeta)
      : catalystTile('Latest Catalysts', 'News Pulse', `Menunggu catalyst terbaru untuk ${symbolUpper} · source ${newsPayload?.source || 'no_data'}`, 'metric-warn', newsHref, newsMeta),
    latestAnnouncement
      ? catalystTile('Latest Catalysts', 'Announcement Monitor', `${latestAnnouncement.title || latestAnnouncement.subject || 'Announcement'} · ${(latestAnnouncement.date || '').slice(0, 10) || 'IDX'}`, 'metric-neutral', annHref, annMeta)
      : catalystTile('Latest Catalysts', 'Announcement Monitor', `Belum ada announcement baru · source ${announcementsPayload?.source || 'no_data'}`, 'metric-neutral', annHref, annMeta),
    catalystTile('Latest Catalysts', 'Catalyst Lens', `Sinyal teknikal tetap jadi basis utama sambil menunggu news/announcement issuer ${symbolUpper}.`, 'metric-neutral', newsHref, `Bias monitoring · <a href="${newsHref}" target="_blank" rel="noopener noreferrer">Catalyst Link</a>`),
    catalystTile('Latest Catalysts', 'Source Check', `News ${newsPayload?.source || 'no_data'} · Ann ${announcementsPayload?.source || 'no_data'}`, 'metric-neutral', annHref, `Source map · <a href="${annHref}" target="_blank" rel="noopener noreferrer">Catalyst Link</a>`),
  ];
  el.innerHTML = cards.join('');
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
