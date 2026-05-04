1|import { fetchFundamental, fetchTechnical, fetchAnalysis, fetchChartData, fetchStockDetail, fetchNews, apiFetch, saveWatchlistItem, showToast } from '../api.js?v=20260505f';
     2|import { observeElements, flashUpdate } from '../main.js?v=20260505f';
     3|
     4|const AI_PICKS_CONTEXT_KEY = 'retailbijak.ai_picks.context';
     5|const TAB_STORAGE_KEY = 'retailbijak.stock_tab';
     6|const nf = (n, d = 2) => n == null || Number.isNaN(Number(n)) ? '—' : Number(n).toLocaleString('id-ID', { maximumFractionDigits: d });
     7|const pf = (n) => n == null || Number.isNaN(Number(n)) ? '—' : `${Number(n) >= 0 ? '+' : ''}${Number(n).toFixed(2)}%`;
     8|const money = (n) => n == null || Number.isNaN(Number(n)) ? '—' : `Rp ${nf(n, 0)}`;
     9|let currentSymbol = null;
    10|
    11|function safeSessionStorageGet(key) {
    12|  try {
    13|    return sessionStorage.getItem(key);
    14|  } catch {
    15|    return null;
    16|  }
    17|}
    18|
    19|function safeSessionStorageRemove(key) {
    20|  try {
    21|    sessionStorage.removeItem(key);
    22|  } catch {
    23|    // ignore session cleanup issues
    24|  }
    25|}
    26|
    27|function renderAiPickContextBanner(symbol) {
    28|  const raw = safeSessionStorageGet(AI_PICKS_CONTEXT_KEY);
    29|  if (!raw) return '';
    30|
    31|  try {
    32|    const data = JSON.parse(raw);
    33|    if (!data || String(data.ticker || '').toUpperCase() !== String(symbol || '').toUpperCase()) return '';
    34|    safeSessionStorageRemove(AI_PICKS_CONTEXT_KEY);
    35|    const labels = Array.isArray(data.reason_labels) ? data.reason_labels.filter(Boolean).slice(0, 2).join(' · ') : '';
    36|    const fit = data.fit_label || 'Explainable candidate siap ditelaah lebih dalam.';
    37|    const levels = [
    38|      `Entry ${money(data.entry_zone)}`,
    39|      `Target ${money(data.target_zone)}`,
    40|      `Invalidasi ${money(data.invalidation)}`,
    41|    ].join(' · ');
    42|    const sourceLabel = data.source_label || 'AI Picks';
    43|    const returnHref = data.source_route || '#ai-picks';
    44|    const heroBackHref = returnHref;
    45|    return {
    46|      bannerHtml: `<div class="panel stock-ai-pick-context"><div class="stock-ai-pick-context-head"><div><div class="screener-kicker">Datang dari AI Picks</div><strong>${symbol} masuk radar mode ${data.mode || 'swing'}.</strong></div><span class="badge badge-up">Score ${data.score ?? '—'}</span></div><div class="stock-ai-pick-context-origin">Asal shortlist: <strong>${sourceLabel}</strong></div><div class="stock-ai-pick-context-meta"><span>Keyakinan ${data.confidence || '—'}</span><span>${labels || fit}</span><span>${levels}</span><span>${data.risk_note || 'Tetap validasi risk/reward sebelum eksekusi.'}</span></div><div class="stock-ai-pick-context-actions"><a href="${returnHref}" class="btn stock-ai-pick-context-cta">Kembali ke shortlist asal</a></div></div>`,
    47|      heroBackHref,
    48|    };
    49|  } catch {
    50|    safeSessionStorageRemove(AI_PICKS_CONTEXT_KEY);
    51|    return { bannerHtml: '', heroBackHref: '#dashboard' };
    52|  }
    53|}
    54|
    55|export async function renderStockDetail(root, ticker) {
    56|  const symbol = String(ticker || 'GOTO').toUpperCase().replace('.JK','');
    57|  currentSymbol = symbol;
    58|  document.title = `RetailBijak — ${symbol}`;
    59|  const aiPickContext = renderAiPickContextBanner(symbol);
    60|  const aiPickContextBanner = aiPickContext?.bannerHtml || '';
    61|  const heroBackHref = aiPickContext?.heroBackHref || '#dashboard';
    62|  root.innerHTML = `
    63|    <section class="stock-detail-pro stock-detail-compact stagger-reveal">
    64|      ${aiPickContextBanner}
    65|      <div class="stock-hero-v2">
    66|        <div class="stock-hero-left">
    67|          <a href="${heroBackHref}" class="btn btn-icon" data-stock-origin-back="1"><i data-lucide="arrow-left"></i></a>
    68|          <div class="stock-hero-info">
    69|            <div class="stock-hero-ticker">
    70|              <h1>${symbol}</h1>
    71|              <div class="stock-hero-badges"><span class="badge">IDX</span><span class="badge" id="live-badge">DB</span></div>
    72|            </div>
    73|            <div class="stock-hero-name" id="stock-name">Memuat data emiten...</div>
    74|          </div>
    75|        </div>
    76|        <div class="stock-hero-price-area">
    77|          <div class="stock-hero-price" id="stock-price">—</div>
    78|          <div class="stock-hero-meta">
    79|            <span class="stock-hero-change" id="stock-change">—</span>
    80|          </div>
    81|        </div>
    82|      </div>
    83|      <div class="stock-layout">
    84|        <div class="panel chart-card-v2">
    85|          <div class="flex justify-between items-center mb-3">
    86|            <div><h3 class="panel-title">Grafik Harga</h3><p class="text-xs text-dim" id="chart-subtitle">Memuat chart...</p></div>
    87|          </div>
    88|          <div class="chart-toolbar" id="chart-toolbar">
    89|            <label class="indicator-toggle active" data-indicator="sma"><span>SMA</span></label>
    90|            <label class="indicator-toggle" data-indicator="boll"><span>Boll</span></label>
    91|            <label class="indicator-toggle" data-indicator="sr"><span>S/R</span></label>
    92|            <label class="indicator-toggle active" data-indicator="vol"><span>Vol</span></label>
    93|          </div>
    94|          <div class="chart-top-spacing"></div>
    95|          <div id="tvchart" class="stock-chart-wrap"><div class="skeleton skeleton-chart stock-chart-skeleton"></div></div>
    96|          <div id="level-suggestions" class="level-suggestions"></div>
    97|          <div id="decision-panel" class="decision-panel mt-3"></div>
    98|          <div class="panel-flush mt-16"><h3 class="panel-flush-title">Market Stats</h3><div id="market-stats-v2" class="stock-stats-v2"><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div></div></div>
    99|          <div class="panel-flush mt-16"><h3 class="panel-flush-title">Katalis Terbaru</h3><div id="catalyst-strip-v2" class="catalyst-strip-v2"><div class="skeleton skeleton-text skeleton-w-60"></div><div class="skeleton skeleton-text short mt-1"></div></div></div>
   100|        </div>
   101|        <div class="stock-side compact-right-scroll flex-col gap-2">
   102|          <div class="stock-tabs" data-stock-tabs="1">
   103|            <button class="stock-tab active" data-tab="analisis">Analisis</button>
   104|            <button class="stock-tab" data-tab="chat">AI Chat</button>
   105|            <button class="stock-tab" data-tab="berita">Berita</button>
   106|          </div>
   107|          <div class="stock-tab-content active" data-tab-content="analisis">
   108|            <div class="stock-side-panel"><h3 class="stock-side-panel-title">Ringkasan Sesi</h3><div id="snapshot-panel" class="stock-stats-v2"><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div></div></div>
   109|            <div class="stock-side-panel"><div class="flex justify-between items-start gap-3"><div class="flex-1"><h3 class="stock-side-panel-title">Ringkasan Teknikal</h3><div id="technical-summary" class="intel-item"><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text short"></div></div></div><div id="signal-card" class="signal-inline"><span>Sinyal</span><strong>—</strong><small>Keyakinan —</small></div></div><div id="technical-panel" class="tech-grid-v2 mt-3"><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div></div></div>
   110|            <div class="stock-side-panel hidden" id="broker-activity-panel"></div>
   111|            <div class="stock-side-panel hidden" id="peer-comparison-panel"></div>
   112|            <div class="stock-side-panel"><div class="stock-actions"><button id="btn-add-watchlist" class="btn btn-primary">+ Pantau</button><button id="btn-set-alert" class="btn">Peringatan</button><a href="#screener" class="btn">Pindai</a></div></div>
   113|          </div>
   114|          <div class="stock-tab-content" data-tab-content="chat">
   115|            <div class="stock-chat-card">
   116|              <div id="stock-chat-messages" class="chat-messages">
   117|                <div class="chat-placeholder">
   118|                  <div class="chat-placeholder-icon"><i data-lucide="bot" class="lucide-chat"></i></div>
   119|                  <div class="text-sm text-main strong">Asisten AI</div>
   120|                  <div class="text-xs text-muted">Tanya tentang saham ini — analisis teknikal, fundamental, support/resistance, atau rekomendasi.</div>
   121|                </div>
   122|              </div>
   123|              <div class="sample-prompts" id="chat-quick-prompts">
   124|                <button class="stat-tile metric-neutral chat-prompt" data-prompt="Apa sinyal teknikal?"><span>Teknikal</span><strong>Sinyal hari ini?</strong><small>RSI, MACD, trend</small></button>
   125|                <button class="stat-tile metric-good chat-prompt" data-prompt="Apa level support dan resistance?"><span>Level</span><strong>S/R terdekat?</strong><small>support + resistance</small></button>
   126|                <button class="stat-tile metric-warn chat-prompt" data-prompt="Apa rekomendasi entry plan?"><span>Trading</span><strong>Entry plan</strong><small>level + target</small></button>
   127|                <button class="stat-tile metric-neutral chat-prompt" data-prompt="Apa berita terbaru?"><span>Berita</span><strong>Berita terkini</strong><small>katalis terbaru</small></button>
   128|              </div>
   129|              <div class="chat-input-area">
   130|                <input type="text" id="stock-chat-input" class="form-input" placeholder="Tanya: risiko, entry, berita, atau analisis..." />
   131|                <button id="stock-chat-send" class="btn btn-primary chat-send-btn"><i data-lucide="send"></i></button>
   132|              </div>
   133|            </div>
   134|          </div>
   135|          <div class="stock-tab-content" data-tab-content="berita">
   136|            <div class="stock-side-panel"><h3 class="stock-side-panel-title">Berita Terkait</h3><div id="stock-news-feed" class="stats-grid"></div></div>
   137|            <div class="stock-side-panel"><h3 class="stock-side-panel-title">Pengumuman IDX</h3><div id="stock-announcements-feed" class="stats-grid"></div></div>
   138|          </div>
   139|        </div>
   140|      </div>
   141|    </section>`;
   142|  observeElements();
   143|  if (typeof lucide !== 'undefined') lucide.createIcons();
   144|  document.getElementById('btn-add-watchlist').addEventListener('click', async () => {
   145|    const res = await saveWatchlistItem({ ticker: symbol, notes: 'Ditambahkan dari halaman detail' });
   146|    showToast(res?.ok ? `${symbol} ditambahkan ke Daftar Pantau` : `Gagal menambahkan ${symbol}`, res?.ok ? 'success' : 'error');
   147|  });
   148|  document.getElementById('btn-set-alert').addEventListener('click', () => showAlertModal(symbol));
   149|
   150|  // Tab switching
   151|  document.querySelectorAll('[data-stock-tabs] .stock-tab').forEach(btn => {
   152|    btn.addEventListener('click', () => {
   153|      const tabs = btn.closest('[data-stock-tabs]');
   154|      if (!tabs) return;
   155|      const tab = btn.dataset.tab;
   156|      tabs.querySelectorAll('.stock-tab').forEach(b => b.classList.remove('active'));
   157|      btn.classList.add('active');
   158|      const parent = tabs.parentElement;
   159|      parent.querySelectorAll('[data-tab-content]').forEach(c => c.classList.remove('active'));
   160|      const content = parent.querySelector(`[data-tab-content="${tab}"]`);
   161|      if (content) content.classList.add('active');
   162|      try { sessionStorage.setItem(`${TAB_STORAGE_KEY}.${symbol}`, tab); } catch {}
   163|    });
   164|  });
   165|  // Restore saved tab
   166|  try {
   167|    const savedTab = sessionStorage.getItem(`${TAB_STORAGE_KEY}.${symbol}`);
   168|    if (savedTab) {
   169|      const savedBtn = document.querySelector(`[data-stock-tabs] .stock-tab[data-tab="${savedTab}"]`);
   170|      if (savedBtn) savedBtn.click();
   171|    }
   172|  } catch {}
   173|
   174|  // AI Chat — send handler
   175|  const chatInput = document.getElementById('stock-chat-input');
   176|  const chatSend = document.getElementById('stock-chat-send');
   177|  const chatMessages = document.getElementById('stock-chat-messages');
   178|  const quickPrompts = document.getElementById('chat-quick-prompts');
   179|
   180|  async function sendChatMessage(msg) {
   181|    if (!msg || !msg.trim() || !chatMessages) return;
   182|    // Add user message bubble
   183|    const userBubble = document.createElement('div');
   184|    userBubble.className = 'chat-bubble user-bubble';
   185|    userBubble.textContent = msg;
   186|    chatMessages.appendChild(userBubble);
   187|    // Hide placeholder
   188|    const placeholder = chatMessages.querySelector('.chat-placeholder');
   189|    if (placeholder) placeholder.style.display = 'none';
   190|    // Hide quick prompts
   191|    if (quickPrompts) quickPrompts.style.display = 'none';
   192|    // Add loading indicator
   193|    const loadingEl = document.createElement('div');
   194|    loadingEl.className = 'chat-bubble ai-bubble chat-loading';
   195|    loadingEl.innerHTML = '<span class="chat-loading-dot"></span><span class="chat-loading-dot"></span><span class="chat-loading-dot"></span>';
   196|    chatMessages.appendChild(loadingEl);
   197|    chatMessages.scrollTop = chatMessages.scrollHeight;
   198|
   199|    try {
   200|      const res = await apiFetch(`/stocks/${encodeURIComponent(symbol)}/chat`, {
   201|        method: 'POST',
   202|        headers: { 'Content-Type': 'application/json' },
   203|        body: JSON.stringify({ message: msg }),
   204|      });
   205|      loadingEl.remove();
   206|      const reply = res?.reply || 'Maaf, saya tidak bisa menjawab saat ini. Silakan coba lagi.';
   207|      const aiBubble = document.createElement('div');
   208|      aiBubble.className = 'chat-bubble ai-bubble';
   209|      aiBubble.textContent = reply;
   210|      chatMessages.appendChild(aiBubble);
   211|      if (res?.status === 'error' || res?.status === 'disabled') {
   212|        aiBubble.classList.add('chat-error');
   213|      }
   214|    } catch {
   215|      loadingEl.remove();
   216|      const errEl = document.createElement('div');
   217|      errEl.className = 'chat-bubble ai-bubble chat-error';
   218|      errEl.textContent = 'Gagal terhubung ke asisten AI. Coba lagi.';
   219|      chatMessages.appendChild(errEl);
   220|    }
   221|    chatMessages.scrollTop = chatMessages.scrollHeight;
   222|  }
   223|
   224|  if (chatInput && chatSend) {
   225|    chatSend.addEventListener('click', () => {
   226|      const msg = chatInput.value.trim();
   227|      chatInput.value = '';
   228|      if (msg) sendChatMessage(msg);
   229|    });
   230|    chatInput.addEventListener('keydown', (e) => {
   231|      if (e.key === 'Enter') {
   232|        const msg = chatInput.value.trim();
   233|        chatInput.value = '';
   234|        if (msg) sendChatMessage(msg);
   235|      }
   236|    });
   237|  }
   238|  // Quick prompt chips
   239|  document.querySelectorAll('.chat-prompt').forEach(el => {
   240|    el.addEventListener('click', () => {
   241|      const prompt = el.dataset.prompt;
   242|      if (prompt && chatInput) sendChatMessage(prompt);
   243|    });
   244|  });
   245|
   246|  const [detail, fund, tech, chart, analysis, news, announcements] = await Promise.all([
   247|    fetchStockDetail(symbol).catch(()=>null), fetchFundamental(symbol).catch(()=>null), fetchTechnical(symbol).catch(()=>null), fetchChartData(symbol, 160).catch(()=>null), fetchAnalysis(symbol, { llm: true }).catch(()=>null),
   248|    fetchNews(6).catch(()=>null), apiFetch(`/company-announcements?companyCode=${encodeURIComponent(symbol)}&limit=4`).catch(()=>null)
   249|  ]);
   250|  const candles = normalizeCandles(chart?.data?.length ? chart.data : makeFallbackCandles(symbol));
   251|  hydrateHeader(symbol, detail, fund, candles);
   252|  const technical = tech?.technical || {};
   253|  // TradingView chart (or fallback to LightweightCharts)
   254|  try { renderStockChart(symbol, candles, technical); } catch (e) { console.warn('chart error', e); renderFallbackSvgChart(candles.slice(-30)); }
   255|  // Indicator toggle (only relevant for LightweightCharts fallback)
   256|  document.querySelectorAll('.indicator-toggle').forEach(el => {
   257|    el.addEventListener('click', () => {
   258|      el.classList.toggle('active');
   259|      renderStockChart(symbol, candles, technical);
   260|    });
   261|  });
   262|  const analysisData = analysis?.data || analysis?.analysis || {};
   263|  const analysisPayload = { ...(analysisData || {}), llm: analysis?.llm || analysisData?.llm || null };
   264|  renderTechnicalPanel(technical);
   265|  renderSnapshotPanel(fund?.data || detail?.data || {}, candles, technical);
   266|  renderMarketStatsV2(fund?.data || detail?.data || {}, candles, technical);
   267|  renderDecisionPanel(candles, technical);
   268|  renderAiPreview(symbol, fund?.data || detail?.data || {}, candles, technical, analysisPayload);
   269|  renderTradePlan(candles, technical);
   270|  renderLevelSuggestions(candles, technical);
   271|  renderLevelOverlay(candles, technical);
   272|
   273|  // Catalyst strip — news + announcements
   274|  if (document.getElementById('catalyst-strip-v2')) {
   275|    renderCatalystStripV2(symbol, news, announcements);
   276|  }
   277|
   278|  // Market stats — clear skeleton
   279|  const msEl = document.getElementById('market-stats-v2');
   280|  if (msEl && msEl.querySelector('.skeleton')) {
   281|    // already populated by renderMarketStatsV2
   282|  }
   283|
   284|  // Berita tab — render news + announcements
   285|  renderStockNewsFeed(symbol, news);
   286|  renderStockAnnouncements(symbol, announcements);
   287|
   288|  // Broker Activity (async, non-blocking)
   289|  apiFetch(`/stocks/${encodeURIComponent(symbol)}/broker-activity?limit=6`).then(brokerRes => {
   290|    if (brokerRes && brokerRes.source === 'db' && brokerRes.data?.length) {
   291|      renderBrokerActivity(brokerRes.data);
   292|    }
   293|  }).catch(() => {});
   294|
   295|  // Peer Comparison (async)
   296|  renderPeerComparison(symbol);
   297|
   298|  
   299|  
   300|  
   301|  
   302|  
   303|  
   304|  
   305|
   306|}
   307|
   308|function normalizeCandles(rows){ return rows.map(r => ({ date: r.date || r.time, open:Number(r.open ?? r.close), high:Number(r.high ?? r.close), low:Number(r.low ?? r.close), close:Number(r.close), volume:Number(r.volume || 0) })).filter(r => r.date && r.close); }
   309|function hydrateHeader(symbol, detail, fund, candles){
   310|  const last = candles[candles.length-1], prev = candles[candles.length-2] || last;
   311|  const change = last.close - prev.close, pct = prev.close ? change/prev.close*100 : 0;
   312|  document.getElementById('stock-name').textContent = detail?.data?.name || fund?.data?.name || fallbackIssuerName(symbol);
   313|  const priceEl = document.getElementById('stock-price'); priceEl.textContent = money(last.close); flashUpdate(priceEl, change >= 0);
   314|  const chEl = document.getElementById('stock-change');
   315|  const isUp = change >= 0;
   316|  chEl.innerHTML = `${isUp ? '+' : ''}${nf(change,0)} <small>(${pf(pct)})</small>`;
   317|  chEl.className = `stock-hero-change ${isUp ? 'up' : 'down'}`;
   318|  // Last update timestamp
   319|  const now = new Date(); const hh = String(now.getHours()).padStart(2,'0'); const mm = String(now.getMinutes()).padStart(2,'0');
   320|  const ts = document.getElementById('live-badge');
   321|  if (ts) { ts.textContent = `WIB ${hh}:${mm}`; ts.className = 'badge'; }
   322|}
   323|function renderStockChart(symbol, candles, technical){
   324|  const container = document.getElementById('tvchart'); if (!container) return;
   325|
   326|  // Try TradingView widget first
   327|  if (typeof TradingView !== 'undefined' && container.clientWidth > 0) {
   328|    try {
   329|      container.innerHTML = '';
   330|      const tvSymbol = `IDX:${(symbol || '').replace('.JK','')}`;
   331|      new TradingView.widget({
   332|        container_id: 'tvchart',
   333|        autosize: true,
   334|        symbol: tvSymbol,
   335|        interval: 'D',
   336|        timezone: 'Asia/Jakarta',
   337|        theme: 'dark',
   338|        style: '1',
   339|        locale: 'id_ID',
   340|        toolbar_bg: '#0b1220',
   341|        enable_publishing: false,
   342|        allow_symbol_change: false,
   343|        hide_top_toolbar: false,
   344|        hide_legend: false,
   345|        save_image: true,
   346|        studies: ['RSI@tv-basicstudies', 'MASimple@tv-basicstudies'],
   347|        disabled_features: ['use_localstorage_for_settings', 'header_symbol_search', 'header_compare', 'header_undo_redo', 'header_screenshot'],
   348|        enabled_features: ['study_templates'],
   349|        overrides: {
   350|          'mainSeriesProperties.candleStyle.upColor': '#10b981',
   351|          'mainSeriesProperties.candleStyle.downColor': '#ef4444',
   352|          'mainSeriesProperties.candleStyle.wickUpColor': '#10b981',
   353|          'mainSeriesProperties.candleStyle.wickDownColor': '#ef4444',
   354|        },
   355|      });
   356|      document.getElementById('chart-subtitle').textContent = `${tvSymbol} · live dari TradingView`;
   357|      // Hide our indicator toolbar when using TradingView
   358|      const toolbar = document.getElementById('chart-toolbar');
   359|      if (toolbar) toolbar.style.display = 'none';
   360|      // Hide level suggestions (TradingView has its own)
   361|      const ls = document.getElementById('level-suggestions');
   362|      if (ls) ls.style.display = 'none';
   363|      return;
   364|    } catch (e) {
   365|      console.warn('TradingView init failed, fallback to LightweightCharts', e);
   366|    }
   367|  }
   368|
   369|  // Fallback: LightweightCharts + our overlays
   370|  const limit = 120;
   371|  const data = candles.slice(-Math.min(limit, candles.length));
   372|  document.getElementById('chart-subtitle').textContent = `${data[0]?.date || '—'} → ${data[data.length-1]?.date || '—'} · ${data.length} candle · LightweightCharts`;
   373|  // Show our toolbar
   374|  const toolbar = document.getElementById('chart-toolbar');
   375|  if (toolbar) toolbar.style.display = '';
   376|  const ls = document.getElementById('level-suggestions');
   377|  if (ls) ls.style.display = '';
   378|
   379|  if (typeof LightweightCharts !== 'undefined') {
   380|    container.innerHTML = '';
   381|    const chart = LightweightCharts.createChart(container, { width:container.clientWidth, height:container.clientHeight, layout:{ textColor:'#94a3b8', background:{ type:'solid', color:'transparent' }}, grid:{ vertLines:{ color:'rgba(255,255,255,.035)'}, horzLines:{ color:'rgba(255,255,255,.035)'}}, rightPriceScale:{ borderVisible:false }, timeScale:{ borderVisible:false, timeVisible:false }});
   382|    const active = Array.from(document.querySelectorAll('.indicator-toggle.active')).map(el => el.dataset.indicator);
   383|    const chartData = data.map(d => ({ time:String(d.date).slice(0,10), open:d.open, high:d.high, low:d.low, close:d.close }));
   384|
   385|    const cs = chart.addCandlestickSeries({ upColor:'#10b981', downColor:'#ef4444', borderVisible:false, wickUpColor:'#10b981', wickDownColor:'#ef4444' });
   386|    cs.setData(chartData);
   387|
   388|    const vol = active.includes('vol') ? chart.addHistogramSeries({ priceFormat:{type:'volume'}, priceScaleId:'', color:'#64748b55' }) : null;
   389|    if (vol) {
   390|      vol.setData(data.map(d => ({ time:String(d.date).slice(0,10), value:d.volume, color:d.close >= d.open ? '#10b98155' : '#ef444455' })));
   391|      chart.priceScale('').applyOptions({ scaleMargins:{ top:.82, bottom:0 }});
   392|    }
   393|
   394|    if (active.includes('sma') && data.some(d => d.sma_20 != null)) {
   395|      chart.addLineSeries({ color:'#fbbf24', lineWidth:1, priceLineVisible:false, lastValueVisible:false })
   396|        .setData(data.map(d => ({ time:String(d.date).slice(0,10), value:d.sma_20 })).filter(d => d.value != null));
   397|    }
   398|    if (active.includes('sma') && data.some(d => d.sma_50 != null)) {
   399|      chart.addLineSeries({ color:'#6366f1', lineWidth:1, priceLineVisible:false, lastValueVisible:false })
   400|        .setData(data.map(d => ({ time:String(d.date).slice(0,10), value:d.sma_50 })).filter(d => d.value != null));
   401|    }
   402|
   403|    const ind = technical?.indicators || {};
   404|    const bb = ind.bollinger_bands || {};
   405|    if (active.includes('boll') && bb.upper != null && bb.lower != null && data.length) {
   406|      const lastTime = String(data[data.length-1].date).slice(0,10);
   407|      [[bb.upper,'rgba(99,102,241,.4)'], [bb.lower,'rgba(99,102,241,.4)'], [bb.middle,'rgba(99,102,241,.2)']].forEach(([val,clr],i) => {
   408|        if (val == null) return;
   409|        chart.addLineSeries({ color:clr, lineWidth:1, priceLineVisible:false, lastValueVisible:false, lineStyle:i===2?2:0 })
   410|          .setData([{ time:data[0].date.slice(0,10), value:val }, { time:lastTime, value:val }]);
   411|      });
   412|    }
   413|
   414|    const sr = ind.support_resistance || {};
   415|    if (active.includes('sr') && data.length) {
   416|      const lastTime = String(data[data.length-1].date).slice(0,10);
   417|      if (sr.support_20d != null)
   418|        chart.addLineSeries({ color:'rgba(52,211,153,.5)', lineWidth:1, lineStyle:2, priceLineVisible:false, lastValueVisible:false })
   419|          .setData([{ time:data[0].date.slice(0,10), value:sr.support_20d }, { time:lastTime, value:sr.support_20d }]);
   420|      if (sr.resistance_20d != null)
   421|        chart.addLineSeries({ color:'rgba(248,113,113,.5)', lineWidth:1, lineStyle:2, priceLineVisible:false, lastValueVisible:false })
   422|          .setData([{ time:data[0].date.slice(0,10), value:sr.resistance_20d }, { time:lastTime, value:sr.resistance_20d }]);
   423|    }
   424|
   425|    if (!vol) chart.priceScale('').applyOptions({ scaleMargins:{ top:.1, bottom:.1 }});
   426|    chart.timeScale().fitContent();
   427|    new ResizeObserver(() => chart.applyOptions({ width: container.clientWidth, height: container.clientHeight })).observe(container);
   428|  } else renderFallbackSvgChart(data);
   429|}
   430|function sentimentClass(label, value, metric = ''){
   431|  const s = String(label || '').toLowerCase(); const v = Number(value);
   432|  if (['bullish','above sma20','spike','strong','fair','low','support'].some(x => s.includes(x))) return 'metric-good';
   433|  if (['bearish','below','weak','high risk','expensive','danger'].some(x => s.includes(x))) return 'metric-bad';
   434|  if (['overbought','volatile','resistance','insufficient','watch'].some(x => s.includes(x))) return 'metric-warn';
   435|  if (metric === 'rsi' && v >= 70) return 'metric-warn';
   436|  if (metric === 'rsi' && v <= 30) return 'metric-bad';
   437|  if (metric === 'roe' && v > 15) return 'metric-good';
   438|  if (metric === 'roe' && v < 5) return 'metric-bad';
   439|  if (metric === 'der' && v > 2) return 'metric-bad';
   440|  return 'metric-neutral';
   441|}
   442|function tile(label, value, status = '', cls = ''){ return `<div class="stat-tile ${cls || sentimentClass(status, value)}"><span>${label}</span><strong class="mono metric-value">${value}</strong>${status ? `<small>${status}</small>` : ''}</div>`; }
   443|function renderMetricGroupV2(title, cards){
   444|  if (!cards.length) return '';
   445|  return `<div class="tech-group-title-v2">${title}</div>${cards.map(([l,v,s,c]) => {
   446|    const cls = c || sentimentClass(s, v);
   447|    const mapCls = cls === 'metric-good' ? 'tile-good' : cls === 'metric-bad' ? 'tile-danger' : cls === 'metric-warn' ? 'tile-warn' : '';
   448|    return `<div class="tech-tile-v2 ${mapCls}"><span>${l}</span><strong>${v}</strong>${s ? `<small>${s}</small>` : ''}</div>`;
   449|  }).join('')}`;
   450|}
   451|function renderTechnicalPanel(t){
   452|  const ind = t.indicators || {}; const isNoData = String(t.rating || '').toUpperCase().includes('NO DATA'); const score = isNoData ? null : Number(t.score ?? 0); const ratingCls = isNoData ? 'metric-neutral' : sentimentClass(t.rating, score);
   453|  const rsiVal = Number(ind.rsi?.value); const stochVal = Number(ind.stochastic?.k);
   454|  const rsiBadge = rsiVal >= 80 ? 'OB' : rsiVal <= 20 ? 'OS' : rsiVal >= 70 ? 'Waspada' : '';
   455|  const stochBadge = stochVal >= 80 ? 'OB' : stochVal <= 20 ? 'OS' : '';
   456|  const rsiDanger = rsiVal >= 80 || rsiVal <= 20;
   457|  const stochDanger = stochVal >= 80 || stochVal <= 20;
   458|  // Multi-indicator alert
   459|  const multiAlert = (rsiVal >= 80 && stochVal >= 80) ? `<div class="tech-alert-banner warn">⚠️ RSI &amp; Stochastics overbought ekstrem</div>`
   460|    : (rsiVal >= 70 && stochVal >= 80) ? `<div class="tech-alert-banner warn">⚠️ Multiple indikator overbought</div>`
   461|    : (rsiVal <= 20 && stochVal <= 20) ? `<div class="tech-alert-banner info">📈 RSI &amp; Stochastics oversold</div>`
   462|    : '';
   463|
   464|  function withBadge(val, label, badge) {
   465|    return badge ? `${label} <span class="tech-badge">${badge}</span>` : label;
   466|  }
   467|  const rsiStatus = withBadge(rsiVal, '', rsiBadge);
   468|  const stochStatus = withBadge(stochVal, '', stochBadge);
   469|  const rsiCls = rsiDanger ? 'metric-bad' : (rsiVal >= 70 || rsiVal <= 30) ? 'metric-warn' : sentimentClass(ind.rsi?.status, rsiVal, 'rsi');
   470|  const stochCls = stochDanger ? 'metric-bad' : stochVal >= 80 ? 'metric-warn' : sentimentClass(ind.stochastic?.status, stochVal);
   471|
   472|  document.getElementById('technical-summary').innerHTML = `<span class="signal-pill ${ratingCls === 'metric-good' ? 'pill-good' : ratingCls === 'metric-bad' ? 'pill-bad' : 'pill-warn'}">${t.rating || 'NETRAL'}</span><div class="mt-1 text-sm text-muted">${t.summary || 'Ringkasan teknikal belum tersedia lengkap.'}</div>`;
   473|  const signal = document.getElementById('signal-card'); signal.classList.add(ratingCls); signal.querySelector('strong').textContent = t.rating || 'NETRAL'; signal.querySelector('small').textContent = score == null ? '—' : `${nf(score,0)}/100`;
   474|  const groups = [
   475|    ['Momentum', [['RSI 14', nf(ind.rsi?.value,2), rsiStatus, rsiCls], ['Stoch %K', nf(ind.stochastic?.k,2), stochStatus, stochCls], ['MACD', nf(ind.macd?.histogram,2), ind.macd?.status]]],
   476|    ['Tren', filterValidCards([['SMA 20', nf(ind.trend?.sma_20,2), ind.trend?.status], ['SMA 50', nf(ind.trend?.sma_50,2), 'Menengah'], ['SMA 200', nf(ind.trend?.sma_200,2), 'Panjang']])],
   477|    ['Volatilitas', filterValidCards([['ATR 14', nf(ind.atr?.value,2), ind.atr?.status], ['Boll Upper', nf(ind.bollinger_bands?.upper,2), 'resistance', 'metric-warn'], ['Boll Lower', nf(ind.bollinger_bands?.lower,2), 'support', 'metric-good']])],
   478|    ['Level Kunci', filterValidCards([['Rasio Volume', nf(ind.volume?.ratio,2), ind.volume?.status], ['Support', isValidLevel(ind.support_resistance?.support_20d) ? money(ind.support_resistance.support_20d) : '—', 'support', 'metric-good'], ['Resistance', isValidLevel(ind.support_resistance?.resistance_20d) ? money(ind.support_resistance.resistance_20d) : '—', 'resistance', 'metric-warn']])],
   479|  ];
   480|  document.getElementById('technical-panel').innerHTML = multiAlert + groups.map(([title, cards]) => renderMetricGroupV2(title, cards)).join('');
   481|}
   482|
   483|function renderMetricGroup(title, cards){
   484|  if (!cards.length) return '';
   485|  return `<div class="metric-group-title full-row">${title}</div>${cards.map(([l,v,s,c]) => tile(l,v,s,c)).join('')}`;
   486|}
   487|function isValidLevel(value){ return Number.isFinite(Number(value)) && Number(value) > 0; }
   488|function filterValidCards(cards){ return cards.filter(([, value]) => value !== '—' && !String(value).match(/^Rp\s*0$/)); }
   489|function getLevels(candles, tech){
   490|  const last = candles[candles.length-1] || {}; const sr = tech?.indicators?.support_resistance || {}; const atr = Number(tech?.indicators?.atr?.value || 0);
   491|  const entry = last.close; const rawStop = isValidLevel(sr.support_20d) ? Number(sr.support_20d) : entry - (atr || entry*.06); const tightStop = entry - Math.min(atr ? atr*.5 : entry*.06, entry*.06); const stop = Math.max(rawStop, tightStop); const rawTarget = isValidLevel(sr.resistance_20d) ? Number(sr.resistance_20d) : entry + (atr || entry*.08); const rrFloor = 1.8; const minReward = Math.max(entry - stop, 1) * rrFloor; const minTarget = entry + minReward; const target = Math.max(rawTarget, minTarget);
   492|  return { entry, stop: Math.max(1, stop), target, support: isValidLevel(sr.support_20d) ? Number(sr.support_20d) : null, resistance: isValidLevel(sr.resistance_20d) ? Number(sr.resistance_20d) : null, atr };
   493|}
   494|function renderDecisionPanel(candles, tech){
   495|  const levels = getLevels(candles, tech); const rsi = tech?.indicators?.rsi?.value; const rating = tech?.rating || 'NETRAL';
   496|  const ind = tech?.indicators || {};
   497|  const risk = Math.max(levels.entry - levels.stop, 1), reward = Math.max(levels.target - levels.entry, 0); const rr = reward/risk;
   498|  // Confluence: count bullish/bearish indicators
   499|  const macdStatus = (ind.macd?.status || '').toLowerCase();
   500|  const trendStatus = (ind.trend?.status || '').toLowerCase();
   501|