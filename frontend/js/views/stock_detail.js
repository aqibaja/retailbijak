import { fetchFundamental, fetchTechnical, fetchAnalysis, fetchChartData, fetchStockDetail, fetchNews, apiFetch, saveWatchlistItem, showToast } from '../api.js?v=20260506a';
import { observeElements, flashUpdate } from '../main.js?v=20260506a';

const AI_PICKS_CONTEXT_KEY = 'retailbijak.ai_picks.context';
const TAB_STORAGE_KEY = 'retailbijak.stock_tab';
const nf = (n, d = 2) => n == null || Number.isNaN(Number(n)) ? '—' : Number(n).toLocaleString('id-ID', { maximumFractionDigits: d });
const pf = (n) => n == null || Number.isNaN(Number(n)) ? '—' : `${Number(n) >= 0 ? '+' : ''}${Number(n).toFixed(2)}%`;
const money = (n) => n == null || Number.isNaN(Number(n)) ? '—' : `Rp ${nf(n, 0)}`;
let currentSymbol = null;

function safeSessionStorageGet(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSessionStorageRemove(key) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore session cleanup issues
  }
}

function renderAiPickContextBanner(symbol) {
  const raw = safeSessionStorageGet(AI_PICKS_CONTEXT_KEY);
  if (!raw) return '';

  try {
    const data = JSON.parse(raw);
    if (!data || String(data.ticker || '').toUpperCase() !== String(symbol || '').toUpperCase()) return '';
    safeSessionStorageRemove(AI_PICKS_CONTEXT_KEY);
    const labels = Array.isArray(data.reason_labels) ? data.reason_labels.filter(Boolean).slice(0, 2).join(' · ') : '';
    const fit = data.fit_label || 'Explainable candidate siap ditelaah lebih dalam.';
    const levels = [
      `Entry ${money(data.entry_zone)}`,
      `Target ${money(data.target_zone)}`,
      `Invalidasi ${money(data.invalidation)}`,
    ].join(' · ');
    const sourceLabel = data.source_label || 'AI Picks';
    const returnHref = data.source_route || '#ai-picks';
    const heroBackHref = returnHref;
    return {
      bannerHtml: `<div class="panel stock-ai-pick-context"><div class="stock-ai-pick-context-head"><div><div class="screener-kicker">Datang dari AI Picks</div><strong>${symbol} masuk radar mode ${data.mode || 'swing'}.</strong></div><span class="badge badge-up">Score ${data.score ?? '—'}</span></div><div class="stock-ai-pick-context-origin">Asal shortlist: <strong>${sourceLabel}</strong></div><div class="stock-ai-pick-context-meta"><span>Keyakinan ${data.confidence || '—'}</span><span>${labels || fit}</span><span>${levels}</span><span>${data.risk_note || 'Tetap validasi risk/reward sebelum eksekusi.'}</span></div><div class="stock-ai-pick-context-actions"><a href="${returnHref}" class="btn stock-ai-pick-context-cta">Kembali ke shortlist asal</a></div></div>`,
      heroBackHref,
    };
  } catch {
    safeSessionStorageRemove(AI_PICKS_CONTEXT_KEY);
    return { bannerHtml: '', heroBackHref: '#dashboard' };
  }
}

export async function renderStockDetail(root, ticker) {
  const symbol = String(ticker || 'GOTO').toUpperCase().replace('.JK','');
  currentSymbol = symbol;
  document.title = `RetailBijak — ${symbol}`;
  const aiPickContext = renderAiPickContextBanner(symbol);
  const aiPickContextBanner = aiPickContext?.bannerHtml || '';
  const heroBackHref = aiPickContext?.heroBackHref || '#dashboard';
  root.innerHTML = `
    <section class="stock-detail-pro stock-detail-compact stagger-reveal">
      ${aiPickContextBanner}
      <div class="stock-hero-v2">
        <div class="stock-hero-left">
          <a href="${heroBackHref}" class="btn btn-icon" data-stock-origin-back="1"><i data-lucide="arrow-left"></i></a>
          <div class="stock-hero-info">
            <div class="stock-hero-ticker">
              <h1>${symbol}</h1>
              <div class="stock-hero-badges"><span class="badge">IDX</span><span class="badge" id="live-badge">DB</span></div>
            </div>
            <div class="stock-hero-name" id="stock-name">Memuat data emiten...</div>
          </div>
        </div>
        <div class="stock-hero-price-area">
          <div class="stock-hero-price" id="stock-price">—</div>
          <div class="stock-hero-meta">
            <span class="stock-hero-change" id="stock-change">—</span>
          </div>
        </div>
      </div>
      <div class="stock-layout">
        <div class="panel chart-card-v2">
          <div class="flex justify-between items-center mb-3">
            <div><h3 class="panel-title">Grafik Harga</h3><p class="text-xs text-dim" id="chart-subtitle">Memuat chart...</p></div>
          </div>
          <div class="chart-toolbar" id="chart-toolbar">
            <label class="indicator-toggle active" data-indicator="sma"><span>SMA</span></label>
            <label class="indicator-toggle" data-indicator="boll"><span>Boll</span></label>
            <label class="indicator-toggle" data-indicator="sr"><span>S/R</span></label>
            <label class="indicator-toggle active" data-indicator="vol"><span>Vol</span></label>
          </div>
          <div class="chart-top-spacing"></div>
          <div id="tvchart" class="stock-chart-wrap"><div class="skeleton skeleton-chart stock-chart-skeleton"></div></div>
          <div id="level-suggestions" class="level-suggestions"></div>
          <div id="decision-panel" class="decision-panel mt-3"></div>
          <div class="panel-flush mt-16"><h3 class="panel-flush-title">Market Stats</h3><div id="market-stats-v2" class="stock-stats-v2"><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div></div></div>
          <div class="panel-flush mt-16"><h3 class="panel-flush-title">Katalis Terbaru</h3><div id="catalyst-strip-v2" class="catalyst-strip-v2"><div class="skeleton skeleton-text skeleton-w-60"></div><div class="skeleton skeleton-text short mt-1"></div></div></div>
        </div>
        <div class="stock-side compact-right-scroll flex-col gap-2">
          <div class="stock-tabs" data-stock-tabs="1">
            <button class="stock-tab active" data-tab="analisis">Analisis</button>
            <button class="stock-tab" data-tab="chat">AI Chat</button>
            <button class="stock-tab" data-tab="berita">Berita</button>
          </div>
          <div class="stock-tab-content active" data-tab-content="analisis">
            <div class="stock-side-panel"><h3 class="stock-side-panel-title">Ringkasan Sesi</h3><div id="snapshot-panel" class="stock-stats-v2"><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div></div></div>
            <div class="stock-side-panel"><div class="flex justify-between items-start gap-3"><div class="flex-1"><h3 class="stock-side-panel-title">Ringkasan Teknikal</h3><div id="technical-summary" class="intel-item"><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text short"></div></div></div><div id="signal-card" class="signal-inline"><span>Sinyal</span><strong>—</strong><small>Keyakinan —</small></div></div><div id="technical-panel" class="tech-grid-v2 mt-3"><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div></div></div>
            <div class="stock-side-panel hidden" id="broker-activity-panel"></div>
            <div class="stock-side-panel hidden" id="peer-comparison-panel"></div>
            <div class="stock-side-panel"><div class="stock-actions"><button id="btn-add-watchlist" class="btn btn-primary">+ Pantau</button><button id="btn-set-alert" class="btn">Peringatan</button><a href="#screener" class="btn">Pindai</a></div></div>
          </div>
          <div class="stock-tab-content" data-tab-content="chat">
            <div class="stock-chat-card">
              <div id="stock-chat-messages" class="chat-messages">
                <div class="chat-placeholder">
                  <div class="chat-placeholder-icon"><i data-lucide="bot" class="lucide-chat"></i></div>
                  <div class="text-sm text-main strong">Asisten AI</div>
                  <div class="text-xs text-muted">Tanya tentang saham ini — analisis teknikal, fundamental, support/resistance, atau rekomendasi.</div>
                </div>
              </div>
              <div class="sample-prompts" id="chat-quick-prompts">
                <button class="stat-tile metric-neutral chat-prompt" data-prompt="Apa sinyal teknikal?"><span>Teknikal</span><strong>Sinyal hari ini?</strong><small>RSI, MACD, trend</small></button>
                <button class="stat-tile metric-good chat-prompt" data-prompt="Apa level support dan resistance?"><span>Level</span><strong>S/R terdekat?</strong><small>support + resistance</small></button>
                <button class="stat-tile metric-warn chat-prompt" data-prompt="Apa rekomendasi entry plan?"><span>Trading</span><strong>Entry plan</strong><small>level + target</small></button>
                <button class="stat-tile metric-neutral chat-prompt" data-prompt="Apa berita terbaru?"><span>Berita</span><strong>Berita terkini</strong><small>katalis terbaru</small></button>
              </div>
              <div class="chat-input-area">
                <input type="text" id="stock-chat-input" class="form-input" placeholder="Tanya: risiko, entry, berita, atau analisis..." />
                <button id="stock-chat-send" class="btn btn-primary chat-send-btn"><i data-lucide="send"></i></button>
              </div>
            </div>
          </div>
          <div class="stock-tab-content" data-tab-content="berita">
            <div class="stock-side-panel"><h3 class="stock-side-panel-title">Berita Terkait</h3><div id="stock-news-feed" class="stats-grid"></div></div>
            <div class="stock-side-panel"><h3 class="stock-side-panel-title">Pengumuman IDX</h3><div id="stock-announcements-feed" class="stats-grid"></div></div>
          </div>
        </div>
      </div>
    </section>`;
  observeElements();
  if (typeof lucide !== 'undefined') lucide.createIcons();
  document.getElementById('btn-add-watchlist').addEventListener('click', async () => {
    const res = await saveWatchlistItem({ ticker: symbol, notes: 'Ditambahkan dari halaman detail' });
    showToast(res?.ok ? `${symbol} ditambahkan ke Daftar Pantau` : `Gagal menambahkan ${symbol}`, res?.ok ? 'success' : 'error');
  });
  document.getElementById('btn-set-alert').addEventListener('click', () => showAlertModal(symbol));

  // Tab switching
  document.querySelectorAll('[data-stock-tabs] .stock-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabs = btn.closest('[data-stock-tabs]');
      if (!tabs) return;
      const tab = btn.dataset.tab;
      tabs.querySelectorAll('.stock-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const parent = tabs.parentElement;
      parent.querySelectorAll('[data-tab-content]').forEach(c => c.classList.remove('active'));
      const content = parent.querySelector(`[data-tab-content="${tab}"]`);
      if (content) content.classList.add('active');
      try { sessionStorage.setItem(`${TAB_STORAGE_KEY}.${symbol}`, tab); } catch {}
    });
  });
  // Restore saved tab
  try {
    const savedTab = sessionStorage.getItem(`${TAB_STORAGE_KEY}.${symbol}`);
    if (savedTab) {
      const savedBtn = document.querySelector(`[data-stock-tabs] .stock-tab[data-tab="${savedTab}"]`);
      if (savedBtn) savedBtn.click();
    }
  } catch {}

  // AI Chat — send handler
  const chatInput = document.getElementById('stock-chat-input');
  const chatSend = document.getElementById('stock-chat-send');
  const chatMessages = document.getElementById('stock-chat-messages');
  const quickPrompts = document.getElementById('chat-quick-prompts');

  async function sendChatMessage(msg) {
    if (!msg || !msg.trim() || !chatMessages) return;
    // Add user message bubble
    const userBubble = document.createElement('div');
    userBubble.className = 'chat-bubble user-bubble';
    userBubble.textContent = msg;
    chatMessages.appendChild(userBubble);
    // Hide placeholder
    const placeholder = chatMessages.querySelector('.chat-placeholder');
    if (placeholder) placeholder.style.display = 'none';
    // Hide quick prompts
    if (quickPrompts) quickPrompts.style.display = 'none';
    // Add loading indicator
    const loadingEl = document.createElement('div');
    loadingEl.className = 'chat-bubble ai-bubble chat-loading';
    loadingEl.innerHTML = '<span class="chat-loading-dot"></span><span class="chat-loading-dot"></span><span class="chat-loading-dot"></span>';
    chatMessages.appendChild(loadingEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
      const res = await apiFetch(`/stocks/${encodeURIComponent(symbol)}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      });
      loadingEl.remove();
      const reply = res?.reply || 'Maaf, saya tidak bisa menjawab saat ini. Silakan coba lagi.';
      const aiBubble = document.createElement('div');
      aiBubble.className = 'chat-bubble ai-bubble';
      aiBubble.textContent = reply;
      chatMessages.appendChild(aiBubble);
      if (res?.status === 'error' || res?.status === 'disabled') {
        aiBubble.classList.add('chat-error');
      }
    } catch {
      loadingEl.remove();
      const errEl = document.createElement('div');
      errEl.className = 'chat-bubble ai-bubble chat-error';
      errEl.textContent = 'Gagal terhubung ke asisten AI. Coba lagi.';
      chatMessages.appendChild(errEl);
    }
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  if (chatInput && chatSend) {
    chatSend.addEventListener('click', () => {
      const msg = chatInput.value.trim();
      chatInput.value = '';
      if (msg) sendChatMessage(msg);
    });
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const msg = chatInput.value.trim();
        chatInput.value = '';
        if (msg) sendChatMessage(msg);
      }
    });
  }
  // Quick prompt chips
  document.querySelectorAll('.chat-prompt').forEach(el => {
    el.addEventListener('click', () => {
      const prompt = el.dataset.prompt;
      if (prompt && chatInput) sendChatMessage(prompt);
    });
  });

  const [detail, fund, tech, chart, analysis, news, announcements] = await Promise.all([
    fetchStockDetail(symbol).catch(()=>null), fetchFundamental(symbol).catch(()=>null), fetchTechnical(symbol).catch(()=>null), fetchChartData(symbol, 160).catch(()=>null), fetchAnalysis(symbol, { llm: true }).catch(()=>null),
    fetchNews(6).catch(()=>null), apiFetch(`/company-announcements?companyCode=${encodeURIComponent(symbol)}&limit=4`).catch(()=>null)
  ]);
  const candles = normalizeCandles(chart?.data?.length ? chart.data : makeFallbackCandles(symbol));
  hydrateHeader(symbol, detail, fund, candles);
  const technical = tech?.technical || {};
  // TradingView chart (or fallback to LightweightCharts)
  try { renderStockChart(symbol, candles, technical); } catch (e) { console.warn('chart error', e); renderFallbackSvgChart(candles.slice(-30)); }
  // Indicator toggle (only relevant for LightweightCharts fallback)
  document.querySelectorAll('.indicator-toggle').forEach(el => {
    el.addEventListener('click', () => {
      el.classList.toggle('active');
      renderStockChart(symbol, candles, technical);
    });
  });
  const analysisData = analysis?.data || analysis?.analysis || {};
  const analysisPayload = { ...(analysisData || {}), llm: analysis?.llm || analysisData?.llm || null };
  renderTechnicalPanel(technical);
  renderSnapshotPanel(fund?.data || detail?.data || {}, candles, technical);
  renderMarketStatsV2(fund?.data || detail?.data || {}, candles, technical);
  renderDecisionPanel(candles, technical);
  renderAiPreview(symbol, fund?.data || detail?.data || {}, candles, technical, analysisPayload);
  renderTradePlan(candles, technical);
  renderLevelSuggestions(candles, technical);
  renderLevelOverlay(candles, technical);

  // Catalyst strip — news + announcements
  if (document.getElementById('catalyst-strip-v2')) {
    renderCatalystStripV2(symbol, news, announcements);
  }

  // Market stats — clear skeleton
  const msEl = document.getElementById('market-stats-v2');
  if (msEl && msEl.querySelector('.skeleton')) {
    // already populated by renderMarketStatsV2
  }

  // Berita tab — render news + announcements
  renderStockNewsFeed(symbol, news);
  renderStockAnnouncements(symbol, announcements);

  // Broker Activity (async, non-blocking)
  apiFetch(`/stocks/${encodeURIComponent(symbol)}/broker-activity?limit=6`).then(brokerRes => {
    if (brokerRes && brokerRes.source === 'db' && brokerRes.data?.length) {
      renderBrokerActivity(brokerRes.data);
    }
  }).catch(() => {});

  // Peer Comparison (async)
  renderPeerComparison(symbol);

  
  
  
  
  
  
  

}

function normalizeCandles(rows){ return rows.map(r => ({ date: r.date || r.time, open:Number(r.open ?? r.close), high:Number(r.high ?? r.close), low:Number(r.low ?? r.close), close:Number(r.close), volume:Number(r.volume || 0) })).filter(r => r.date && r.close); }
function hydrateHeader(symbol, detail, fund, candles){
  const last = candles[candles.length-1], prev = candles[candles.length-2] || last;
  const change = last.close - prev.close, pct = prev.close ? change/prev.close*100 : 0;
  document.getElementById('stock-name').textContent = detail?.data?.name || fund?.data?.name || fallbackIssuerName(symbol);
  const priceEl = document.getElementById('stock-price'); priceEl.textContent = money(last.close); flashUpdate(priceEl, change >= 0);
  const chEl = document.getElementById('stock-change');
  const isUp = change >= 0;
  chEl.innerHTML = `${isUp ? '+' : ''}${nf(change,0)} <small>(${pf(pct)})</small>`;
  chEl.className = `stock-hero-change ${isUp ? 'up' : 'down'}`;
  // Last update timestamp
  const now = new Date(); const hh = String(now.getHours()).padStart(2,'0'); const mm = String(now.getMinutes()).padStart(2,'0');
  const ts = document.getElementById('live-badge');
  if (ts) { ts.textContent = `WIB ${hh}:${mm}`; ts.className = 'badge'; }
}
function renderStockChart(symbol, candles, technical){
  const container = document.getElementById('tvchart'); if (!container) return;

  // Try TradingView widget first
  if (typeof TradingView !== 'undefined' && container.clientWidth > 0) {
    try {
      container.innerHTML = '';
      const tvSymbol = `IDX:${(symbol || '').replace('.JK','')}`;
      new TradingView.widget({
        container_id: 'tvchart',
        autosize: true,
        symbol: tvSymbol,
        interval: 'D',
        timezone: 'Asia/Jakarta',
        theme: 'dark',
        style: '1',
        locale: 'id_ID',
        toolbar_bg: '#0b1220',
        enable_publishing: false,
        allow_symbol_change: false,
        hide_top_toolbar: false,
        hide_legend: false,
        save_image: true,
        studies: ['RSI@tv-basicstudies', 'MASimple@tv-basicstudies'],
        disabled_features: ['use_localstorage_for_settings', 'header_symbol_search', 'header_compare', 'header_undo_redo', 'header_screenshot'],
        enabled_features: ['study_templates'],
        overrides: {
          'mainSeriesProperties.candleStyle.upColor': '#10b981',
          'mainSeriesProperties.candleStyle.downColor': '#ef4444',
          'mainSeriesProperties.candleStyle.wickUpColor': '#10b981',
          'mainSeriesProperties.candleStyle.wickDownColor': '#ef4444',
        },
      });
      document.getElementById('chart-subtitle').textContent = `${tvSymbol} · live dari TradingView`;
      // Hide our indicator toolbar when using TradingView
      const toolbar = document.getElementById('chart-toolbar');
      if (toolbar) toolbar.style.display = 'none';
      // Hide level suggestions (TradingView has its own)
      const ls = document.getElementById('level-suggestions');
      if (ls) ls.style.display = 'none';
      return;
    } catch (e) {
      console.warn('TradingView init failed, fallback to LightweightCharts', e);
    }
  }

  // Fallback: LightweightCharts + our overlays
  const limit = 120;
  const data = candles.slice(-Math.min(limit, candles.length));
  document.getElementById('chart-subtitle').textContent = `${data[0]?.date || '—'} → ${data[data.length-1]?.date || '—'} · ${data.length} candle · LightweightCharts`;
  // Show our toolbar
  const toolbar = document.getElementById('chart-toolbar');
  if (toolbar) toolbar.style.display = '';
  const ls = document.getElementById('level-suggestions');
  if (ls) ls.style.display = '';

  if (typeof LightweightCharts !== 'undefined') {
    container.innerHTML = '';
    const chart = LightweightCharts.createChart(container, { width:container.clientWidth, height:container.clientHeight, layout:{ textColor:'#94a3b8', background:{ type:'solid', color:'transparent' }}, grid:{ vertLines:{ color:'rgba(255,255,255,.035)'}, horzLines:{ color:'rgba(255,255,255,.035)'}}, rightPriceScale:{ borderVisible:false }, timeScale:{ borderVisible:false, timeVisible:false }});
    const active = Array.from(document.querySelectorAll('.indicator-toggle.active')).map(el => el.dataset.indicator);
    const chartData = data.map(d => ({ time:String(d.date).slice(0,10), open:d.open, high:d.high, low:d.low, close:d.close }));

    const cs = chart.addCandlestickSeries({ upColor:'#10b981', downColor:'#ef4444', borderVisible:false, wickUpColor:'#10b981', wickDownColor:'#ef4444' });
    cs.setData(chartData);

    const vol = active.includes('vol') ? chart.addHistogramSeries({ priceFormat:{type:'volume'}, priceScaleId:'', color:'#64748b55' }) : null;
    if (vol) {
      vol.setData(data.map(d => ({ time:String(d.date).slice(0,10), value:d.volume, color:d.close >= d.open ? '#10b98155' : '#ef444455' })));
      chart.priceScale('').applyOptions({ scaleMargins:{ top:.82, bottom:0 }});
    }

    if (active.includes('sma') && data.some(d => d.sma_20 != null)) {
      chart.addLineSeries({ color:'#fbbf24', lineWidth:1, priceLineVisible:false, lastValueVisible:false })
        .setData(data.map(d => ({ time:String(d.date).slice(0,10), value:d.sma_20 })).filter(d => d.value != null));
    }
    if (active.includes('sma') && data.some(d => d.sma_50 != null)) {
      chart.addLineSeries({ color:'#6366f1', lineWidth:1, priceLineVisible:false, lastValueVisible:false })
        .setData(data.map(d => ({ time:String(d.date).slice(0,10), value:d.sma_50 })).filter(d => d.value != null));
    }

    const ind = technical?.indicators || {};
    const bb = ind.bollinger_bands || {};
    if (active.includes('boll') && bb.upper != null && bb.lower != null && data.length) {
      const lastTime = String(data[data.length-1].date).slice(0,10);
      [[bb.upper,'rgba(99,102,241,.4)'], [bb.lower,'rgba(99,102,241,.4)'], [bb.middle,'rgba(99,102,241,.2)']].forEach(([val,clr],i) => {
        if (val == null) return;
        chart.addLineSeries({ color:clr, lineWidth:1, priceLineVisible:false, lastValueVisible:false, lineStyle:i===2?2:0 })
          .setData([{ time:data[0].date.slice(0,10), value:val }, { time:lastTime, value:val }]);
      });
    }

    const sr = ind.support_resistance || {};
    if (active.includes('sr') && data.length) {
      const lastTime = String(data[data.length-1].date).slice(0,10);
      if (sr.support_20d != null)
        chart.addLineSeries({ color:'rgba(52,211,153,.5)', lineWidth:1, lineStyle:2, priceLineVisible:false, lastValueVisible:false })
          .setData([{ time:data[0].date.slice(0,10), value:sr.support_20d }, { time:lastTime, value:sr.support_20d }]);
      if (sr.resistance_20d != null)
        chart.addLineSeries({ color:'rgba(248,113,113,.5)', lineWidth:1, lineStyle:2, priceLineVisible:false, lastValueVisible:false })
          .setData([{ time:data[0].date.slice(0,10), value:sr.resistance_20d }, { time:lastTime, value:sr.resistance_20d }]);
    }

    if (!vol) chart.priceScale('').applyOptions({ scaleMargins:{ top:.1, bottom:.1 }});
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
function renderMetricGroupV2(title, cards){
  if (!cards.length) return '';
  return `<div class="tech-group-title-v2">${title}</div>${cards.map(([l,v,s,c]) => {
    const cls = c || sentimentClass(s, v);
    const mapCls = cls === 'metric-good' ? 'tile-good' : cls === 'metric-bad' ? 'tile-danger' : cls === 'metric-warn' ? 'tile-warn' : '';
    return `<div class="tech-tile-v2 ${mapCls}"><span>${l}</span><strong>${v}</strong>${s ? `<small>${s}</small>` : ''}</div>`;
  }).join('')}`;
}
function renderTechnicalPanel(t){
  const ind = t.indicators || {}; const isNoData = String(t.rating || '').toUpperCase().includes('NO DATA'); const score = isNoData ? null : Number(t.score ?? 0); const ratingCls = isNoData ? 'metric-neutral' : sentimentClass(t.rating, score);
  const rsiVal = Number(ind.rsi?.value); const stochVal = Number(ind.stochastic?.k);
  const rsiBadge = rsiVal >= 80 ? 'OB' : rsiVal <= 20 ? 'OS' : rsiVal >= 70 ? 'Waspada' : '';
  const stochBadge = stochVal >= 80 ? 'OB' : stochVal <= 20 ? 'OS' : '';
  const rsiDanger = rsiVal >= 80 || rsiVal <= 20;
  const stochDanger = stochVal >= 80 || stochVal <= 20;
  // Multi-indicator alert
  const multiAlert = (rsiVal >= 80 && stochVal >= 80) ? `<div class="tech-alert-banner warn">⚠️ RSI &amp; Stochastics overbought ekstrem</div>`
    : (rsiVal >= 70 && stochVal >= 80) ? `<div class="tech-alert-banner warn">⚠️ Multiple indikator overbought</div>`
    : (rsiVal <= 20 && stochVal <= 20) ? `<div class="tech-alert-banner info">📈 RSI &amp; Stochastics oversold</div>`
    : '';

  function withBadge(val, label, badge) {
    return badge ? `${label} <span class="tech-badge">${badge}</span>` : label;
  }
  const rsiStatus = withBadge(rsiVal, '', rsiBadge);
  const stochStatus = withBadge(stochVal, '', stochBadge);
  const rsiCls = rsiDanger ? 'metric-bad' : (rsiVal >= 70 || rsiVal <= 30) ? 'metric-warn' : sentimentClass(ind.rsi?.status, rsiVal, 'rsi');
  const stochCls = stochDanger ? 'metric-bad' : stochVal >= 80 ? 'metric-warn' : sentimentClass(ind.stochastic?.status, stochVal);

  document.getElementById('technical-summary').innerHTML = `<span class="signal-pill ${ratingCls === 'metric-good' ? 'pill-good' : ratingCls === 'metric-bad' ? 'pill-bad' : 'pill-warn'}">${t.rating || 'NETRAL'}</span><div class="mt-1 text-sm text-muted">${t.summary || 'Ringkasan teknikal belum tersedia lengkap.'}</div>`;
  const signal = document.getElementById('signal-card'); signal.classList.add(ratingCls); signal.querySelector('strong').textContent = t.rating || 'NETRAL'; signal.querySelector('small').textContent = score == null ? '—' : `${nf(score,0)}/100`;
  const groups = [
    ['Momentum', [['RSI 14', nf(ind.rsi?.value,2), rsiStatus, rsiCls], ['Stoch %K', nf(ind.stochastic?.k,2), stochStatus, stochCls], ['MACD', nf(ind.macd?.histogram,2), ind.macd?.status]]],
    ['Tren', filterValidCards([['SMA 20', nf(ind.trend?.sma_20,2), ind.trend?.status], ['SMA 50', nf(ind.trend?.sma_50,2), 'Menengah'], ['SMA 200', nf(ind.trend?.sma_200,2), 'Panjang']])],
    ['Volatilitas', filterValidCards([['ATR 14', nf(ind.atr?.value,2), ind.atr?.status], ['Boll Upper', nf(ind.bollinger_bands?.upper,2), 'resistance', 'metric-warn'], ['Boll Lower', nf(ind.bollinger_bands?.lower,2), 'support', 'metric-good']])],
    ['Level Kunci', filterValidCards([['Rasio Volume', nf(ind.volume?.ratio,2), ind.volume?.status], ['Support', isValidLevel(ind.support_resistance?.support_20d) ? money(ind.support_resistance.support_20d) : '—', 'support', 'metric-good'], ['Resistance', isValidLevel(ind.support_resistance?.resistance_20d) ? money(ind.support_resistance.resistance_20d) : '—', 'resistance', 'metric-warn']])],
  ];
  document.getElementById('technical-panel').innerHTML = multiAlert + groups.map(([title, cards]) => renderMetricGroupV2(title, cards)).join('');
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
  const levels = getLevels(candles, tech); const rsi = tech?.indicators?.rsi?.value; const rating = tech?.rating || 'NETRAL';
  const ind = tech?.indicators || {};
  const risk = Math.max(levels.entry - levels.stop, 1), reward = Math.max(levels.target - levels.entry, 0); const rr = reward/risk;
  // Confluence: count bullish/bearish indicators
  const macdStatus = (ind.macd?.status || '').toLowerCase();
  const trendStatus = (ind.trend?.status || '').toLowerCase();
