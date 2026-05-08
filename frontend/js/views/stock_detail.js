import { fetchFundamental, fetchTechnical, fetchAnalysis, fetchChartData, fetchStockDetail, fetchNews, fetchWatchlist, deleteWatchlistItem, apiFetch, saveWatchlistItem, showToast, loadTVWidget, getTVTheme } from '../api.js?v=20260508B';
import { observeElements, flashUpdate } from '../main.js?v=20260508B';
import { nf, pct, pf, money, renderMarkdown } from '../utils/format.js?v=20260508B';
import { ssGet, ssSet, ssRemove } from '../utils/storage.js?v=20260508B';

const AI_PICKS_CONTEXT_KEY = 'retailbijak.ai_picks.context';
const TAB_STORAGE_KEY = 'retailbijak.stock_tab';
let currentSymbol = null;

function renderAiPickContextBanner(symbol) {
  const raw = ssGet(AI_PICKS_CONTEXT_KEY);
  if (!raw) return '';

  try {
    const data = JSON.parse(raw);
    if (!data || String(data.ticker || '').toUpperCase() !== String(symbol || '').toUpperCase()) return '';
    ssRemove(AI_PICKS_CONTEXT_KEY);
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
    ssRemove(AI_PICKS_CONTEXT_KEY);
    return { bannerHtml: '', heroBackHref: '#dashboard' };
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
      <div id="tv-symbol-profile" class="stock-side-panel hidden"></div>
      <div class="stock-layout">
        <div class="panel chart-card-v2">
          <div class="flex justify-between items-center mb-3">
            <div><h3 class="panel-title">Grafik Harga</h3><p class="text-xs text-dim" id="chart-subtitle">Memuat chart...</p></div>
          </div>
          <div class="chart-toolbar" id="chart-toolbar">
            <span class="timeframe-group">
              <label class="indicator-toggle active" data-tf="1D"><span>1D</span></label>
              <label class="indicator-toggle" data-tf="1H"><span>1H</span></label>
              <label class="indicator-toggle" data-tf="4H"><span>4H</span></label>
            </span>
            <span class="indicator-group">
            <label class="indicator-toggle active" data-indicator="sma"><span>SMA</span></label>
            <label class="indicator-toggle" data-indicator="boll"><span>Boll</span></label>
            <label class="indicator-toggle" data-indicator="sr"><span>S/R</span></label>
            <label class="indicator-toggle active" data-indicator="vol"><span>Vol</span></label>
            <label class="indicator-toggle" data-indicator="st"><span>ST</span></label>
            <label class="indicator-toggle" data-indicator="vwap"><span>VWAP</span></label>
            </span>
          </div>
          <div class="chart-top-spacing"></div>
          <div id="tvchart" class="stock-chart-wrap"><div class="skeleton skeleton-chart stock-chart-skeleton"></div></div>
          <div id="level-suggestions" class="level-suggestions"></div>
          <div id="decision-panel" class="decision-panel mt-3"></div>
          <div id="trade-plan" class="trade-plan-grid mt-4"></div>
          <div class="panel-flush mt-16"><h3 class="panel-flush-title">Market Stats</h3><div id="market-stats-v2" class="stock-stats-v2"><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div></div></div>
          <div class="panel-flush mt-16"><h3 class="panel-flush-title">Katalis Terbaru</h3><p class="text-xs text-dim mt-1">Berita, pengumuman, dan sentimen yang berpotensi mempengaruhi harga</p><div id="catalyst-strip-v2" class="catalyst-strip-v2"><div class="skeleton skeleton-text skeleton-w-60"></div><div class="skeleton skeleton-text short mt-1"></div></div></div>
        </div>
        <div class="stock-side compact-right-scroll flex-col gap-2">
          <div class="stock-tabs" data-stock-tabs="1">
            <button type="button" class="stock-tab active" data-tab="chat">AI Chat</button>
            <button type="button" class="stock-tab" data-tab="analisis">Analisis</button>
            <button type="button" class="stock-tab" data-tab="berita">Berita</button>
          </div>
          <div class="stock-tab-content active" data-tab-content="chat">
            <div class="stock-chat-card">
              <div id="stock-chat-messages" class="chat-messages">
                <div class="chat-placeholder">
                  <div class="chat-placeholder-icon"><i data-lucide="bot" class="lucide-chat"></i></div>
                  <div class="text-sm text-main strong">Asisten AI</div>
                  <div class="text-xs text-muted">Tanya tentang saham ini — analisis teknikal, fundamental, support/resistance, atau rekomendasi.</div>
                </div>
              </div>
              <div class="sample-prompts" id="chat-quick-prompts">
                <button type="button" class="stat-tile metric-neutral chat-prompt" data-prompt="Apa sinyal teknikal?"><span>Teknikal</span><strong>Sinyal hari ini?</strong><small>RSI, MACD, trend</small></button>
                <button type="button" class="stat-tile metric-good chat-prompt" data-prompt="Apa level support dan resistance?"><span>Level</span><strong>S/R terdekat?</strong><small>support + resistance</small></button>
                <button type="button" class="stat-tile metric-warn chat-prompt" data-prompt="Apa rekomendasi entry plan?"><span>Trading</span><strong>Entry plan</strong><small>level + target</small></button>
                <button type="button" class="stat-tile metric-neutral chat-prompt" data-prompt="Apa berita terbaru?"><span>Berita</span><strong>Berita terkini</strong><small>katalis terbaru</small></button>
              </div>
              <div class="chat-input-area">
                <input type="text" id="stock-chat-input" class="form-input" placeholder="Tanya: risiko, entry, berita, atau analisis..." />
                <button id="stock-chat-send" type="button" class="btn btn-primary chat-send-btn"><i data-lucide="send"></i></button>
              </div>
            </div>
          </div>
          <div class="stock-tab-content" data-tab-content="analisis">
            <div class="stock-side-panel"><h3 class="stock-side-panel-title">Ringkasan Sesi</h3><div id="snapshot-panel" class="stock-stats-v2"><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div></div></div>
            <div class="stock-side-panel"><h3 class="stock-side-panel-title">Analisis Teknikal TradingView</h3><div id="tv-technical-analysis"></div></div>
            <div class="stock-side-panel ai-thread-mock"><h3 class="stock-side-panel-title">Pembacaan Cepat AI</h3><div class="ai-thread-mock-inner"></div></div>
            <div class="stock-side-panel"><div class="flex justify-between items-start gap-3"><div class="flex-1"><h3 class="stock-side-panel-title">Ringkasan Teknikal (Custom)</h3><div id="technical-summary" class="intel-item"><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text short"></div></div></div><div id="signal-card" class="signal-inline"><span>Sinyal</span><strong>—</strong><small>Keyakinan —</small></div></div><div id="technical-panel" class="tech-grid-v2 mt-3"><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div></div></div>
            <div class="stock-side-panel hidden" id="broker-activity-panel"></div>
            <div class="stock-side-panel hidden" id="depth-panel"></div>
            <div class="stock-side-panel hidden" id="foreign-flow-panel"></div>
            <div class="stock-side-panel hidden" id="peer-comparison-panel"></div>
            <div class="stock-side-panel"><div class="stock-actions"><button id="btn-add-watchlist" type="button" class="btn btn-primary">+ Pantau</button><button id="btn-set-alert" type="button" class="btn">Peringatan</button><button id="btn-add-compare" type="button" class="btn">Bandingkan</button><a href="#screener" class="btn">Pindai</a></div></div>
          </div>
          <div class="stock-tab-content" data-tab-content="berita">
            <div class="stock-side-panel"><h3 class="stock-side-panel-title">Berita Terkait</h3><div id="stock-news-feed" class="flex-col gap-2"></div></div>
            <div class="stock-side-panel"><h3 class="stock-side-panel-title">Pengumuman IDX</h3><div id="stock-announcements-feed" class="flex-col gap-2"></div></div>
          </div>
        </div>
      </div>
    </section>`;
  observeElements();
  // Check watchlist state
  let isWatched = false;
  fetchWatchlist().then(wl => {
    if (wl?.data) { isWatched = wl.data.some(w => w.ticker === symbol); updateWatchlistBtn(); }
  }).catch(() => {});
  function updateWatchlistBtn() {
    const btn = document.getElementById('btn-add-watchlist');
    if (!btn) return;
    btn.textContent = isWatched ? '✓ Dipantau' : '+ Pantau';
    btn.classList.toggle('btn-secondary', isWatched);
    btn.classList.toggle('btn-primary', !isWatched);
  }
  document.getElementById('btn-add-watchlist').addEventListener('click', async () => {
    try {
      const res = isWatched
        ? await deleteWatchlistItem(symbol)
        : await saveWatchlistItem({ ticker: symbol, notes: 'Ditambahkan dari halaman detail' });
      if (res && res.ok !== false) {
        isWatched = !isWatched;
        updateWatchlistBtn();
        showToast(isWatched ? `${symbol} ditambahkan ke Daftar Pantau` : `${symbol} dihapus dari Daftar Pantau`, 'success');
      } else {
        showToast(`Gagal ${isWatched ? 'menghapus' : 'menambahkan'} ${symbol}`, 'error');
      }
    } catch (e) {
      console.warn('watchlist toggle failed', e);
      showToast(`Gagal ${isWatched ? 'menghapus' : 'menambahkan'} ${symbol}`, 'error');
    }
  });
  document.getElementById('btn-set-alert').addEventListener('click', () => showAlertModal(symbol));
  document.getElementById('btn-add-compare').addEventListener('click', () => {
    import('./compare.js?v=20260508').then(m => {
      m.addToCompare(symbol);
    });
  });

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
    // Disable input & send button during request
    if (chatInput) chatInput.disabled = true;
    if (chatSend) { chatSend.disabled = true; chatSend.classList.add('btn-loading'); }
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
        timeout: 30000,
      });
      loadingEl.remove();
      const reply = res?.reply || 'Maaf, saya tidak bisa menjawab saat ini. Silakan coba lagi.';
      const aiBubble = document.createElement('div');
      aiBubble.className = 'chat-bubble ai-bubble';
      aiBubble.innerHTML = renderMarkdown(reply);
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
    } finally {
      if (chatInput) chatInput.disabled = false;
      if (chatSend) { chatSend.disabled = false; chatSend.classList.remove('btn-loading'); }
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

  // Phase 1: Load critical data FIRST (price + chart) — show immediately
  const [detail, chart] = await Promise.all([
    fetchStockDetail(symbol).catch(()=>null),
    fetchChartData(symbol, 160).catch(()=>null),
  ]);
  const candles = normalizeCandles(chart?.data?.length ? chart.data : makeFallbackCandles(symbol));
  // Partial failure check: jika semua critical endpoint gagal, tampilkan warning
  const allFailed = !detail && candles.length === 0;
  if (allFailed) {
    const badge = document.getElementById('live-badge');
    if (badge) { badge.textContent = 'OFFLINE'; badge.classList.add('badge-warn'); }
    // Show a non-blocking warning banner below hero
    const hero = root.querySelector('.stock-hero-v2');
    if (hero && !root.querySelector('.stock-partial-fail-banner')) {
      hero.insertAdjacentHTML('afterend',
        `<div class="stock-partial-fail-banner" style="padding:12px 14px;border-radius:12px;border:1px solid rgba(248,113,113,.25);background:rgba(248,113,113,.08);display:flex;align-items:center;gap:10px;font-size:12px;color:var(--text-muted);line-height:1.5">
          <i data-lucide="alert-triangle" style="width:16px;flex-shrink:0;color:#f87171"></i>
          <span>Data <strong>${symbol}</strong> tidak bisa dimuat dari server. Menampilkan data offline — harga dan sinyal mungkin tidak akurat.</span>
        </div>`);
    }
    if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
  }
  // Hydrate header with price data immediately (no waiting for fundamental/technical)
  hydrateHeader(symbol, detail, null, candles);

  // Phase 2: Load remaining data in background (fundamental, technical, analysis, news)
  const [fund, tech, analysis, news, announcements] = await Promise.all([
    fetchFundamental(symbol).catch(()=>null),
    fetchTechnical(symbol).catch(()=>null),
    fetchAnalysis(symbol, { llm: true }).catch(()=>null),
    fetchNews(6, symbol).catch(()=>null),
    apiFetch(`/company-announcements?companyCode=${encodeURIComponent(symbol)}&limit=4`).catch(()=>null)
  ]);
  const technical = tech?.technical || {};
  // TradingView chart (or fallback to LightweightCharts)
  try { renderStockChart(symbol, candles, technical); } catch (e) { console.warn('chart error', e); renderFallbackSvgChart(candles.slice(-30)); }
  // Indicator toggle (only relevant for LightweightCharts fallback)
  document.querySelectorAll('.indicator-toggle').forEach(el => {
    if (el.dataset.tf) return; // timeframe handled separately
    el.addEventListener('click', () => {
      el.classList.toggle('active');
      renderStockChart(symbol, candles, technical);
    });
  });
  // Timeframe toggle
  document.querySelectorAll('[data-tf]').forEach(el => {
    el.addEventListener('click', () => {
      const tf = el.dataset.tf;
      if (tf === '1H' || tf === '4H') {
        showToast('Data intraday akan tersedia setelah integrasi data real-time IDX', 'info');
      }
      document.querySelectorAll('[data-tf]').forEach(b => b.classList.remove('active'));
      el.classList.add('active');
      if (tf !== currentTimeframe) {
        currentTimeframe = tf;
        loadStockChart(symbol);
      }
    });
  });
  const analysisData = analysis?.data || analysis?.analysis || {};
  const analysisPayload = { ...(analysisData || {}), llm: analysis?.llm || analysisData?.llm || null };
  renderTechnicalPanel(technical);
  renderSnapshotPanel(fund?.data || detail?.data || {}, candles, technical);
  
  // TV Technical Analysis widget
  const taContainer = document.getElementById('tv-technical-analysis');
  if (taContainer) {
    const tvSymbol = `IDX:${symbol}`;
    setTimeout(() => {
      loadTVWidget('tv-technical-analysis', 'technical-analysis', {
        symbol: tvSymbol,
        interval: '1D',
        width: '100%',
        height: 380,
        colorTheme: getTVTheme(),
        isTransparent: false,
        displayMode: 'single',
        locale: 'id_ID',
        showIntervalTabs: true,
      });
    }, 50);
  }
  
  // TV Symbol Profile widget
  const spContainer = document.getElementById('tv-symbol-profile');
  if (spContainer && fund?.data?.name) {
    const tvSymbol = `IDX:${symbol}`;
    spContainer.classList.remove('hidden');
    setTimeout(() => {
      loadTVWidget('tv-symbol-profile', 'symbol-profile', {
        symbol: tvSymbol,
        width: '100%',
        height: 280,
        colorTheme: getTVTheme(),
        isTransparent: false,
        locale: 'id_ID',
      });
    }, 100);
  }
  renderMarketStatsV2(fund?.data || detail?.data || {}, candles, technical);
  renderDecisionPanel(candles, technical);
  renderAiPreview(symbol, fund?.data || detail?.data || {}, candles, technical, analysisPayload);
  renderTradePlan(candles, technical);
  renderLevelSuggestions(candles, technical);

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

  // Order Book Depth (async, non-blocking)
  apiFetch(`/stocks/${encodeURIComponent(symbol)}/depth`).then(depthRes => {
    if (depthRes && depthRes.data) {
      renderStockDepth(depthRes.data);
    }
  }).catch(() => {});

  // Foreign Flow History (async, non-blocking)
  apiFetch(`/stocks/${encodeURIComponent(symbol)}/foreign-flow?limit=14`).then(ffRes => {
    if (ffRes && ffRes.source === 'db' && ffRes.data?.length) {
      renderStockForeignFlow(ffRes.data);
    }
  }).catch(() => {});

  // Peer Comparison (async)
  renderPeerComparison(symbol);

  
  
  
  
  
  
  

}

let currentTimeframe = '1D';

function normalizeCandles(rows){ return rows.map(r => ({ date: r.date || r.time, open:Number(r.open ?? r.close), high:Number(r.high ?? r.close), low:Number(r.low ?? r.close), close:Number(r.close), volume:Number(r.volume || 0), st_value: r.st_value, st_trend: r.st_trend, vwap: r.vwap })).filter(r => r.date && r.close); }

async function loadStockChart(symbol) {
  const container = document.getElementById('tvchart');
  if (!container) return;
  container.innerHTML = '<div class="skeleton skeleton-chart stock-chart-skeleton"></div>';
  document.getElementById('chart-subtitle').textContent = `Memuat data ${currentTimeframe}...`;
  try {
    const chart = await fetchChartData(symbol, currentTimeframe === '1D' ? 160 : 400, currentTimeframe).catch(() => null);
    const candles = normalizeCandles(chart?.data?.length ? chart.data : []);
    if (!candles.length) throw new Error('No data');
    renderStockChart(symbol, candles, {});
  } catch (e) {
    container.innerHTML = '<div class="empty-state-v2"><h3>Gagal memuat chart</h3><p>Data tidak tersedia untuk timeframe ini.</p></div>';
  }
}
function hydrateHeader(symbol, detail, fund, candles){
  const last = candles[candles.length-1], prev = candles[candles.length-2] || last;
  const change = last.close - prev.close, pct = prev.close ? change/prev.close*100 : 0;
  document.getElementById('stock-name').textContent = detail?.data?.name || fund?.data?.name || fallbackIssuerName(symbol);
  const priceEl = document.getElementById('stock-price'); priceEl.textContent = money(last.close); flashUpdate(priceEl, change >= 0);
  const chEl = document.getElementById('stock-change');
  const isUp = change >= 0;
  chEl.innerHTML = `${isUp ? '+' : ''}${nf(change,0)} <small>(${pf(pct)})</small>`;
  chEl.className = `stock-hero-change ${isUp ? 'up' : 'down'}`;
  // Data staleness: compare latest candle date with today
  const lastDate = last.date ? new Date(last.date + (typeof last.date === 'string' && last.date.length === 10 ? 'T00:00:00' : '')) : null;
  const today = new Date();
  const jktOpts = { timeZone: 'Asia/Jakarta' };
  const todayStr = today.toLocaleDateString('en-CA', jktOpts); // YYYY-MM-DD
  const lastStr = lastDate ? lastDate.toLocaleDateString('en-CA', jktOpts) : null;
  let stalenessLabel = '';
  let stalenessClass = 'badge';
  if (lastStr) {
    const diffDays = Math.round((new Date(todayStr) - new Date(lastStr)) / 86400000);
    if (diffDays <= 1) {
      stalenessLabel = 'Hari ini';
      stalenessClass = 'badge badge-up';
    } else if (diffDays === 1) {
      stalenessLabel = 'Kemarin';
      stalenessClass = 'badge badge-neutral';
    } else if (diffDays <= 5) {
      stalenessLabel = `${diffDays} hari lalu`;
      stalenessClass = 'badge badge-warn';
    } else {
      stalenessLabel = `${diffDays} hari lalu`;
      stalenessClass = 'badge badge-down';
    }
  }
  // Update badges row: keep IDX badge, remove old live badge, add staleness
  const badgesEl = document.querySelector('.stock-hero-badges');
  if (badgesEl) {
    badgesEl.innerHTML = `<span class="badge">IDX</span><span class="${stalenessClass}">${stalenessLabel || 'Memuat...'}</span>`;
  }
}
/* ─── Theme-aware chart color helpers ─── */
function getThemeColors() {
  const style = getComputedStyle(document.documentElement);
  return {
    up: style.getPropertyValue('--up-color').trim() || '#34d399',
    down: style.getPropertyValue('--down-color').trim() || '#f87171',
    primary: style.getPropertyValue('--primary-color').trim() || '#10b981',
    accentIndigo: style.getPropertyValue('--accent-indigo').trim() || '#6366f1',
    accentAmber: style.getPropertyValue('--warn-color').trim() || '#fbbf24',
    textDim: style.getPropertyValue('--text-dim').trim() || '#475569',
    textMuted: style.getPropertyValue('--text-muted').trim() || '#94a3b8',
  };
}
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
function hexWithAlpha(hex, alpha) {
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return hex + a;
}
function renderStockChart(symbol, candles, technical){
  const container = document.getElementById('tvchart'); if (!container) return;

  // Read current theme for chart colors
  const theme = document.documentElement.getAttribute('data-theme') || 'dark';
  const isLight = theme === 'light';
  const cs = getComputedStyle(document.documentElement);
  const textDim = cs.getPropertyValue('--text-dim').trim() || (isLight ? '#64748b' : '#94a3b8');
  const bgBase = cs.getPropertyValue('--bg-base').trim() || (isLight ? '#f4f7fc' : '#0b1220');
  const gridColor = isLight ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.035)';
  const c = getThemeColors();

  // Try TradingView widget first
  if (typeof TradingView !== 'undefined' && container.clientWidth > 0) {
    try {
      container.innerHTML = '';
      const tvSymbol = `IDX:${(symbol || '').replace('.JK','')}`;
      const tfMap = { '1D': 'D', '1H': '60', '4H': '240' };
      new TradingView.widget({
        container_id: 'tvchart',
        autosize: true,
        symbol: tvSymbol,
        interval: tfMap[currentTimeframe] || 'D',
        timezone: 'Asia/Jakarta',
        theme: isLight ? 'Light' : 'dark',
        style: '1',
        locale: 'id_ID',
        toolbar_bg: isLight ? '#f1f5f9' : bgBase,
        enable_publishing: false,
        allow_symbol_change: false,
        hide_top_toolbar: false,
        hide_legend: false,
        save_image: true,
        studies: ['RSI@tv-basicstudies', 'MASimple@tv-basicstudies'],
        disabled_features: ['use_localstorage_for_settings', 'header_symbol_search', 'header_compare', 'header_undo_redo', 'header_screenshot'],
        enabled_features: ['study_templates'],
        overrides: {
          'mainSeriesProperties.candleStyle.upColor': c.primary,
          'mainSeriesProperties.candleStyle.downColor': c.down,
          'mainSeriesProperties.candleStyle.wickUpColor': c.primary,
          'mainSeriesProperties.candleStyle.wickDownColor': c.down,
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
    const chart = LightweightCharts.createChart(container, { width:container.clientWidth, height:container.clientHeight, layout:{ textColor:textDim, background:{ type:'solid', color:'transparent' }}, grid:{ vertLines:{ color:gridColor}, horzLines:{ color:gridColor}}, rightPriceScale:{ borderVisible:false }, timeScale:{ borderVisible:false, timeVisible:false }});
    const active = Array.from(document.querySelectorAll('.indicator-toggle.active')).map(el => el.dataset.indicator);
    const chartData = data.map(d => ({ time:String(d.date).slice(0,10), open:d.open, high:d.high, low:d.low, close:d.close }));

    const cs = chart.addCandlestickSeries({ upColor:c.primary, downColor:c.down, borderVisible:false, wickUpColor:c.primary, wickDownColor:c.down });
    cs.setData(chartData);

    const vol = active.includes('vol') ? chart.addHistogramSeries({ priceFormat:{type:'volume'}, priceScaleId:'', color:hexWithAlpha(c.textMuted, 0.33) }) : null;
    if (vol) {
      vol.setData(data.map(d => ({ time:String(d.date).slice(0,10), value:d.volume, color:d.close >= d.open ? hexWithAlpha(c.up, 0.33) : hexWithAlpha(c.down, 0.33) })));
      chart.priceScale('').applyOptions({ scaleMargins:{ top:.82, bottom:0 }});
    }

    if (active.includes('sma') && data.some(d => d.sma_20 != null)) {
      chart.addLineSeries({ color:c.accentAmber, lineWidth:1, priceLineVisible:false, lastValueVisible:false })
        .setData(data.map(d => ({ time:String(d.date).slice(0,10), value:d.sma_20 })).filter(d => d.value != null));
    }
    if (active.includes('sma') && data.some(d => d.sma_50 != null)) {
      chart.addLineSeries({ color:c.accentIndigo, lineWidth:1, priceLineVisible:false, lastValueVisible:false })
        .setData(data.map(d => ({ time:String(d.date).slice(0,10), value:d.sma_50 })).filter(d => d.value != null));
    }

    const ind = technical?.indicators || {};
    const bb = ind.bollinger_bands || {};
    if (active.includes('boll') && bb.upper != null && bb.lower != null && data.length) {
      const lastTime = String(data[data.length-1].date).slice(0,10);
      [[bb.upper,hexToRgba(c.accentIndigo,.4)], [bb.lower,hexToRgba(c.accentIndigo,.4)], [bb.middle,hexToRgba(c.accentIndigo,.2)]].forEach(([val,clr],i) => {
        if (val == null) return;
        chart.addLineSeries({ color:clr, lineWidth:1, priceLineVisible:false, lastValueVisible:false, lineStyle:i===2?2:0 })
          .setData([{ time:data[0].date.slice(0,10), value:val }, { time:lastTime, value:val }]);
      });
    }

    // Supertrend markers
    if (active.includes('st') && data.some(d => d.st_value != null)) {
      const stData = data.filter(d => d.st_value != null);
      if (stData.length) {
        // Up markers (green dots below candle)
        chart.addLineSeries({ color:hexWithAlpha(c.up,0.6), lineWidth:1, priceLineVisible:false, lastValueVisible:false })
          .setData(stData.map(d => ({ time:String(d.date).slice(0,10), value:d.st_value })));
        // Scatter markers for trend direction
        const markers = stData.map(d => ({
          time: String(d.date).slice(0,10),
          position: d.st_trend ? 'belowBar' : 'aboveBar',
          color: d.st_trend ? c.up : c.down,
          shape: d.st_trend ? 'arrowUp' : 'arrowDown',
          size: 1,
        }));
        if (markers.length) {
          try { cs.setMarkers(markers); } catch(e) {}
        }
      }
    }

    // VWAP line
    if (active.includes('vwap') && data.some(d => d.vwap != null)) {
      chart.addLineSeries({ color:hexWithAlpha(c.accentAmber,0.7), lineWidth:1, priceLineVisible:false, lastValueVisible:true })
        .setData(data.map(d => ({ time:String(d.date).slice(0,10), value:d.vwap })).filter(d => d.value != null));
    }

    const sr = ind.support_resistance || {};
    if (active.includes('sr') && data.length) {
      const lastTime = String(data[data.length-1].date).slice(0,10);
      if (sr.support_20d != null)
        chart.addLineSeries({ color:hexToRgba(c.up,.5), lineWidth:1, lineStyle:2, priceLineVisible:false, lastValueVisible:false })
          .setData([{ time:data[0].date.slice(0,10), value:sr.support_20d }, { time:lastTime, value:sr.support_20d }]);
      if (sr.resistance_20d != null)
        chart.addLineSeries({ color:hexToRgba(c.down,.5), lineWidth:1, lineStyle:2, priceLineVisible:false, lastValueVisible:false })
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

  const volRatio = Number(ind.volume?.ratio || 0);
  const stochK = Number(ind.stochastic?.k || 50);
  const confluenceBull = [rating === 'BULLISH', macdStatus.includes('bull'), trendStatus.includes('bull'), rsi > 50 && rsi < 70, volRatio >= 1].filter(Boolean).length;
  const confluenceBear = [rating === 'BEARISH', macdStatus.includes('bear'), trendStatus.includes('bear'), rsi >= 70, volRatio < 0.5].filter(Boolean).length;
  const totalChecked = 5;
  const netScore = Math.round((confluenceBull / totalChecked) * 100);
  const scoreLabel = netScore >= 70 ? 'Bullish kuat' : netScore >= 50 ? 'Bullish moderat' : netScore >= 30 ? 'Sideways' : 'Bearish';

  // Multi-TF trends from candle closes
  const closes = candles.map(c => Number(c.close)).filter(Number.isFinite);
  function tfTrend(days) { const s = closes.slice(-days); if (s.length < 2) return '→'; return s[0] <= s[s.length-1] ? '↑' : '↓'; }
  const tf7 = tfTrend(7), tf30 = tfTrend(30), tf90 = tfTrend(90);
  const tfClass = (t) => t === '↑' ? 'text-up' : t === '↓' ? 'text-down' : 'text-dim';

  // Dynamic recommendation
  const isOverbought = rsi >= 70;
  const action = rating === 'BEARISH' ? 'HINDARI DULU'
    : (rsi >= 80 || (isOverbought && rr < 1.2)) ? 'TAHAN / PANTAU'
    : netScore >= 70 ? 'AKUMULASI BERTAHAP'
    : netScore >= 50 ? 'PANTAU KONFIRMASI'
    : 'HINDARI DULU';
  const caution = rsi >= 80
    ? 'RSI ekstrem — risiko koreksi tinggi. Jangan chasing, tunggu pullback.'
    : rr < 1
      ? 'Rasio risk/reward kurang ideal — jangan chasing, tunggu pullback/level lebih murah.'
      : netScore >= 70
        ? 'Setup bullish terkonfirmasi. Pantau breakout resistance dengan volume.'
        : netScore >= 50
          ? 'Setup bullish muncul. Tunggu konfirmasi volume dan candle penutup.'
          : 'Belum ada setup jelas. Tahan posisi/tunggu.';  

  // RR visual bar
  const barPct = Math.min(Math.max((rr / 3) * 100, 5), 100);

  document.getElementById('decision-panel').innerHTML = `
    <div class="score-card">
      <div class="score-card-head">
        <span class="score-card-label">Skor Keputusan</span>
        <span class="score-card-badge ${netScore >= 70 ? 'buy' : netScore >= 50 ? 'warn' : 'avoid'}">${action}</span>
      </div>
      <div class="score-card-number"><span class="score-card-num ${netScore >= 70 ? 'good' : netScore >= 50 ? 'warn' : 'bad'}">${netScore}</span><span class="score-card-max">/100</span></div>
      <div class="score-progress">
        <div class="score-progress-label"><span>Konfluensi ${confluenceBull}/${totalChecked}</span><span>${scoreLabel}</span></div>
        <div class="score-progress-track"><div class="score-progress-marker"></div><div class="score-progress-fill ${netScore >= 70 ? 'good' : netScore >= 50 ? 'warn' : 'bad'}" style="width:${netScore}%"></div></div>
      </div>
      <div class="score-details">
        <span class="score-detail-item">Multi-TF: <strong class="${tfClass(tf7)}">7D ${tf7}</strong> <strong class="${tfClass(tf30)}">30D ${tf30}</strong> <strong class="${tfClass(tf90)}">90D ${tf90}</strong></span>
        <span class="score-detail-item">R/R: <strong>${nf(rr,2)}x</strong></span>
        <span class="score-detail-item">Level: <strong class="up">${money(levels.entry)}</strong> → <strong class="up">${money(levels.target)}</strong></span>
      </div>
      <div class="score-caution">${caution}</div>
      <div class="score-levels">Stop <span class="down">${money(levels.stop)}</span> · Entry <span class="up">${money(levels.entry)}</span> · Target <span class="up">${money(levels.target)}</span></div>
    </div>`;
}
function renderLevelSuggestions(candles, tech){
  const el=document.getElementById('level-suggestions'); if(!el) return; const levels=getLevels(candles, tech);
  const items=[['STOP', levels.stop, 'Kendali risiko', 'metric-bad'], ['ENTRY', levels.entry, 'Zona pullback', 'metric-good'], ['TARGET', levels.target, 'Zona reward', 'metric-warn']];
  el.innerHTML = items.map(([label, price, note, cls]) => `<span class="sugg-chip ${cls}"><strong>${label}</strong> ${money(price)} <small>${note}</small></span>`).join('');
}
function renderMarketStatsV2(d, candles, tech){
  const el = document.getElementById('market-stats-v2'); if (!el) return;
  const last = candles[candles.length-1] || {}; const prev = candles[candles.length-2] || last;
  const delta = Number(last.close || 0) - Number(prev.close || 0); const pct = prev.close ? (delta / prev.close) * 100 : null;
  const volRatio = tech?.indicators?.volume?.ratio;
  const rsiVal = Number(tech?.indicators?.rsi?.value);
  const hasFundamental = Boolean(d && (d.trailing_pe || d.price_to_book || d.roe || d.revenue || d.updated_at));
  const peLabel = d.trailing_pe ? `${nf(d.trailing_pe,1)}x` : '—';
  const pbLabel = d.price_to_book ? `${nf(d.price_to_book,1)}x` : '—';
  const roeLabel = d.roe ? pf(Number(d.roe) * (Math.abs(d.roe) <= 1 ? 100 : 1)) : '—';
  const derLabel = nf(d.debt_to_equity,2);

  function statTile(label, value, changeText = '', changeCls = '') {
    const cls = changeCls ? (changeCls === 'metric-good' ? 'label-up' : changeCls === 'metric-bad' ? 'label-down' : 'label-warn') : '';
    return `<div class="stock-stat-v2 ${cls}"><span>${label}</span><strong>${value}</strong>${changeText ? `<span class="stat-change ${changeCls === 'metric-good' ? 'up' : changeCls === 'metric-bad' ? 'down' : 'neutral'}">${changeText}</span>` : ''}</div>`;
  }

  el.innerHTML = [
    statTile('Harga', money(last.close), pct == null ? '—' : pf(pct), delta >= 0 ? 'metric-good' : 'metric-bad'),
    statTile('Volume', nf(last.volume,0), volRatio ? `${nf(volRatio,2)}x` : '', volRatio >= 1.5 ? 'metric-good' : volRatio < 0.5 ? 'metric-bad' : 'metric-neutral'),
    statTile('Rentang', `${money(last.high)}/${money(last.low)}`, 'sesi harian', 'metric-neutral'),
    statTile('ROE', roeLabel, hasFundamental ? 'profitabilitas' : '', isNaN(d.roe) ? '' : d.roe > 15 ? 'metric-good' : d.roe > 5 ? 'metric-neutral' : 'metric-bad'),
    statTile('P/E', peLabel, hasFundamental ? 'valuasi' : '', d.trailing_pe ? (d.trailing_pe > 25 ? 'metric-bad' : d.trailing_pe < 12 ? 'metric-good' : 'metric-neutral') : ''),
    statTile('DER', derLabel, hasFundamental ? 'leverage' : '', d.debt_to_equity > 2 ? 'metric-bad' : d.debt_to_equity > 0 ? 'metric-neutral' : ''),
  ].join('');
}

function renderSnapshotPanel(d, candles, tech){
  const el = document.getElementById('snapshot-panel'); if (!el) return;
  const last = candles[candles.length-1] || {}; const prev = candles[candles.length-2] || last;
  const delta = Number(last.close || 0) - Number(prev.close || 0); const pct = prev.close ? (delta / prev.close) * 100 : null;
  const hasFundamental = Boolean(d && (d.trailing_pe || d.price_to_book || d.roe || d.revenue || d.updated_at));
  const cards = [
    ['Buka', money(last.open), 'setup hari ini', 'metric-neutral'],
    ['Tinggi / Rendah', `${money(last.high)} / ${money(last.low)}`, 'rentang sesi', 'metric-neutral'],
    ['Penutupan Sebelumnya', money(prev.close), pct == null ? 'baseline harian' : pf(pct), delta >= 0 ? 'metric-good' : 'metric-bad'],
    ['Laju Volume', nf(last.volume,0), tech?.indicators?.volume?.ratio ? `${nf(tech.indicators.volume.ratio,2)}x rata-rata` : 'pantau aliran', sentimentClass('spike', tech?.indicators?.volume?.ratio)],
    ['Cakupan Fundamental', hasFundamental ? 'Siap Dibaca' : 'Fundamental Menunggu', hasFundamental ? 'snapshot basis data' : 'menunggu basis data lebih kaya', hasFundamental ? 'metric-good' : 'metric-warn'],
    ['Bias Tren', tech?.rating || 'PANTAU', tech?.summary || 'snapshot teknikal', sentimentClass(tech?.rating, tech?.score)],
  ];
  el.innerHTML = cards.map(([l,v,s,c]) => tile(l,v,s,c)).join('');
}

function renderAiPreview(symbol, d, candles, tech, analysis){
  const host = document.querySelector('.ai-thread-mock-inner'); if (!host) return;
  const levels = getLevels(candles, tech); const last = candles[candles.length-1] || {}; const rsi = Number(tech?.indicators?.rsi?.value);
  const hasFundamental = Boolean(d && (d.trailing_pe || d.price_to_book || d.roe || d.revenue || d.updated_at));
  const valuation = d.trailing_pe ? (d.trailing_pe < 12 ? 'valuasi murah' : d.trailing_pe > 25 ? 'valuasi premium' : 'valuasi wajar') : 'valuasi belum lengkap';
  const setupBias = tech?.rating === 'BULLISH' ? 'Bias bullish, fokus akumulasi bertahap.' : tech?.rating === 'BEARISH' ? 'Bias defensif, hindari entry agresif.' : 'Bias netral, tunggu konfirmasi lanjutan.';
  const quickTake = rsi >= 70 ? `${symbol} mulai panas; utamakan disiplin entry dan jangan chasing.` : `${symbol} masih layak dipantau untuk setup berikutnya.`;
  const biasTrigger = tech?.rating === 'BULLISH' ? 'Bias menguat jika volume tetap sehat dan harga bertahan di atas area entry.' : tech?.rating === 'BEARISH' ? 'Bias membaik bila harga kembali merebut area trend kunci dengan volume lebih baik.' : 'Bias berubah jika breakout didukung volume atau pullback tertahan rapi.';
  const waitingNote = rsi >= 70 ? 'Tunggu pullback sehat atau konsolidasi singkat sebelum agresif masuk.' : 'Tunggu konfirmasi volume, candle penutup, dan reaksi harga di area entry.';
  const riskNote = rsi >= 70 ? 'RSI sudah panas sehingga risiko false breakout naik.' : 'Jaga invalidasi di bawah area support agar risk/reward tetap sehat.';
  const tradeMap = `Pantau ${money(levels.entry)} · invalid ${money(levels.stop)} · target ${money(levels.target)}.`;
  const catalyst = analysis?.valuation?.label || analysis?.swing?.label || 'belum ada katalis dominan';
  const llmStatus = analysis?.llm?.status || 'disabled';
  const llmRuntimeMessage = analysis?.llm?.runtime_message || '';
  const llmHeadline = llmStatus === 'ok'
    ? (analysis?.llm?.summary || 'Asisten AI aktif, ringkasan terbaru siap dibaca.')
    : llmStatus === 'error'
      ? (llmRuntimeMessage || analysis?.llm?.summary || 'Asisten AI aktif tetapi respons terbaru gagal dimuat.')
      : (llmRuntimeMessage || 'OpenRouter belum aktif. Aktifkan API key untuk membuka ringkasan AI penuh.');
  const llmBadge = llmStatus === 'ok' ? 'Asisten AI aktif' : llmStatus === 'error' ? 'Asisten AI tertunda' : 'OpenRouter belum aktif';
  host.innerHTML = `<div class="stat-tile metric-neutral"><span>Pembacaan Cepat AI</span><div class="text-sm text-muted mt-1">${quickTake}</div></div><div class="stat-tile ${sentimentClass(tech?.rating, tech?.score)}"><span>Bias Saat Ini</span><div class="text-sm text-muted mt-1">${setupBias}</div></div><div class="stat-tile metric-warn"><span>Risiko</span><div class="text-sm text-muted mt-1">${riskNote}</div></div><div class="stat-tile metric-good"><span>Peta Trading</span><div class="text-sm text-muted mt-1">${tradeMap}</div></div><div class="stat-tile ${llmStatus === 'ok' ? 'metric-good' : llmStatus === 'error' ? 'metric-warn' : 'metric-neutral'}"><span>${llmBadge}</span><div class="text-sm text-muted mt-1">${llmHeadline}</div></div>`;
}

function renderBelowChart(candles, tech){
  const el = document.getElementById('below-chart-fill'); if (!el) return;
  const data = candles.slice(-7); const last = candles[candles.length-1] || {}; const first = data[0] || last;
  const highs = data.map(d=>d.high).filter(Number.isFinite), lows = data.map(d=>d.low).filter(Number.isFinite);
  const rangePct = first?.close ? ((last.close - first.close) / first.close) * 100 : null;
  const volumeRatio = tech?.indicators?.volume?.ratio; const rsi = tech?.indicators?.rsi?.value; const levels = getLevels(candles, tech);
  const cards = [
    ['Rentang 7H', rangePct == null ? '—' : pf(rangePct), `${money(Math.min(...lows))} - ${money(Math.max(...highs))}`, rangePct >= 0 ? 'metric-good' : 'metric-bad'],
    ['Konteks Volume', volumeRatio ? `${nf(volumeRatio,2)}x rata-rata` : '—', volumeRatio >= 1.5 ? 'aktif' : 'normal', volumeRatio >= 1.5 ? 'metric-good' : 'metric-neutral'],
    ['Rencana Level', `${money(levels.stop)} / ${money(levels.target)}`, 'stop / target', 'metric-neutral'],
    ['Pembacaan Cepat', rsi >= 70 ? 'Tunggu pullback' : (tech.rating || 'Pantau'), rsi >= 70 ? 'RSI jenuh beli' : 'setup', rsi >= 70 ? 'metric-warn' : sentimentClass(tech.rating, tech.score)],
  ];
  el.innerHTML = cards.map(([l,v,s,c]) => tile(l,v,s,c)).join('');
}

function catalystTile(label, title, body, cls = 'metric-neutral', href = 'news://pending', meta = ''){
  const safeHref = href || 'news://pending';
  const cardHref = safeHref;
  return `<div class="stat-tile ${cls} pos-relative"><span>${label}</span><strong>${title}</strong><small>${body}</small><small>${meta || `<a href="${safeHref}" class="catalyst-link" target="_blank" rel="noopener noreferrer">Tautan Katalis</a>`}</small><a class="stretched-link" href="${cardHref}" target="_blank" rel="noopener noreferrer" aria-label="Buka sumber katalis"></a></div>`;
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
  if (!value) return 'sumber live';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return 'sumber live';
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
  const newsMeta = `${formatRelativeCatalystTime(relevantNews?.published_at)} · <a href="${newsHref}" class="catalyst-link" target="_blank" rel="noopener noreferrer">Tautan Katalis</a>`;
  const annMeta = `${formatRelativeCatalystTime(latestAnnouncement?.date)} · <a href="${annHref}" class="catalyst-link" target="_blank" rel="noopener noreferrer">Tautan Katalis</a>`;
  const cards = [
    relevantNews
      ? catalystTile('Katalis Terbaru', 'Denyut Berita', (relevantNews.title || relevantNews.summary || 'Berita terbaru tersedia').slice(0, 96), 'metric-good', newsHref, newsMeta)
      : catalystTile('Katalis Terbaru', 'Denyut Berita', `Menunggu katalis terbaru untuk ${symbolUpper} · sumber ${newsPayload?.source || 'no_data'}`, 'metric-warn', newsHref, newsMeta),
    latestAnnouncement
      ? catalystTile('Katalis Terbaru', 'Pemantau Pengumuman', `${latestAnnouncement.title || latestAnnouncement.subject || 'Pengumuman'} · ${(latestAnnouncement.date || '').slice(0, 10) || 'IDX'}`, 'metric-neutral', annHref, annMeta)
      : catalystTile('Katalis Terbaru', 'Pemantau Pengumuman', `Belum ada pengumuman baru · sumber ${announcementsPayload?.source || 'no_data'}`, 'metric-neutral', annHref, annMeta),
    catalystTile('Katalis Terbaru', 'Lensa Katalis', `Sinyal teknikal tetap jadi basis utama sambil menunggu berita/pengumuman emiten ${symbolUpper}.`, 'metric-neutral', newsHref, `Bias pemantauan · <a href="${newsHref}" target="_blank" rel="noopener noreferrer">Tautan Katalis</a>`),
    catalystTile('Katalis Terbaru', 'Cek Sumber', `Berita ${newsPayload?.source || 'no_data'} · Pengumuman ${announcementsPayload?.source || 'no_data'}`, 'metric-neutral', annHref, `Peta sumber · <a href="${annHref}" target="_blank" rel="noopener noreferrer">Tautan Katalis</a>`),
  ];
  el.innerHTML = cards.join('');
}

function renderCatalystStripV2(symbol, newsPayload, announcementsPayload){
  const el = document.getElementById('catalyst-strip-v2'); if (!el) return;
  const symbolUpper = String(symbol || '').toUpperCase();
  const newsRows = rankCatalystRows(Array.isArray(newsPayload?.data) ? newsPayload.data : [], symbolUpper);
  const announcementRows = rankCatalystRows(Array.isArray(announcementsPayload?.data) ? announcementsPayload.data : [], symbolUpper);
  const relevantNews = newsRows[0];
  const latestAnnouncement = announcementRows[0];

  function metaRow(icon, iconCls, title, time, href, isAvailable) {
    const safeHref = href || 'news://pending';
    return `<a href="${safeHref}" class="catalyst-row catalyst-link" target="_blank" rel="noopener noreferrer">
      <span class="catalyst-icon ${iconCls}" title="${icon === 'B' ? 'Berita' : icon === 'P' ? 'Pengumuman Perusahaan' : 'Pulse Pasar'}">${icon === 'B' ? '📰' : icon === 'P' ? '📋' : '📊'}</span>
      <div class="catalyst-body">
        <span class="catalyst-title">${title}</span>
        <div class="catalyst-meta"><span>${time || (icon === 'B' ? 'Berita' : icon === 'P' ? 'Pengumuman' : 'Pulse Pasar')}</span></div>
      </div>
    </a>`;
  }

  const rows = [];
  if (relevantNews && relevantNews.score > 0) {
    rows.push(metaRow('B', 'news', (relevantNews.title || 'Berita').slice(0, 80), formatRelativeCatalystTime(relevantNews?.published_at), relevantNews?.link, true));
  }
  if (latestAnnouncement && latestAnnouncement.score > 0) {
    rows.push(metaRow('P', 'ann', (latestAnnouncement.title || latestAnnouncement.subject || 'Pengumuman').slice(0, 72), (latestAnnouncement.date || '').slice(0, 10), latestAnnouncement?.link, true));
  }
  // Always show market pulse
  rows.push(metaRow('M', 'mkt', 'Pantauan pasar: sinyal teknikal jadi basis utama', '', 'news://pending', false));

  if (!rows.length) {
    el.innerHTML = `<div class="catalyst-row"><div class="catalyst-body"><span class="catalyst-title">Menunggu katalis terbaru</span><div class="catalyst-meta"><span>Belum ada berita atau pengumuman untuk ${symbolUpper}</span></div></div></div>`;
  } else {
    el.innerHTML = rows.join('');
  }
}

function renderAnalysisPanel(data, tech){
  const noData = String(tech.rating || '').toUpperCase().includes('NO DATA');
  const rows = noData
    ? [['Skor Swing', '—', 'belum ada data'], ['Sinyal', 'BELUM ADA DATA', 'belum ada data'], ['Valuasi', '—', 'belum ada data'], ['Kualitas', '—', 'belum ada data'], ['Risiko', '—', 'belum ada data']]
    : [['Skor Swing', data.swing?.score ?? tech.score ?? '—', tech.score >= 60 ? 'bullish' : 'pantau'], ['Sinyal', tech.rating || data.swing?.label || 'NETRAL', tech.rating], ['Valuasi', data.valuation?.label || 'wajar', data.valuation?.label || 'wajar'], ['Kualitas', data.dividend?.label || 'lemah', data.dividend?.label || 'lemah'], ['Risiko', data.gorengan?.label || 'normal', data.gorengan?.label || 'normal']];
  document.getElementById('analysis-panel').innerHTML = rows.map(([l,v,s]) => tile(l, v, s)).join('');
}
function renderTradePlan(candles, tech){
  const last = candles[candles.length-1] || {}; const sr = tech?.indicators?.support_resistance || {}; const atr = tech?.indicators?.atr?.value;
  const entry = last.close, stop = sr.support_20d && sr.support_20d > 0 ? sr.support_20d : (entry - (atr || entry*.08)); const target = sr.resistance_20d || (entry + (atr || entry*.1));
  const el = document.getElementById('trade-plan'); if (el) el.innerHTML = [ ['Zona Entry', `${money(entry)} ± ${nf((atr || entry*.03),0)}`, 'tunggu pullback'], ['Area Stop', money(Math.max(1, stop)), 'kendali risiko'], ['Target Dekat', money(target), 'resistansi'] ].map(([l,v,s]) => `<div class="plan-card"><div class="text-xs text-dim uppercase strong">${l}</div><div class="mono strong text-main mt-1">${v}</div><div class="text-xs text-muted mt-1">${s}</div></div>`).join('');
}
function renderStockNotes(tech){
  const pct = tech?.change_pct; const vol = tech?.indicators?.volume?.ratio; const rsi = tech?.indicators?.rsi?.value;
  const notes = [
    {t:'Momentum', v: pct >= 0 ? `Harga naik ${pf(pct)}; trend sedang kuat.` : `Harga turun ${pf(pct)}; tunggu konfirmasi.`, c: pct >= 0 ? 'metric-good' : 'metric-bad'},
    {t:'Volume', v: vol ? `Volume ${nf(vol,2)}x rata-rata 20 hari.` : 'Volume belum lengkap.', c: vol >= 1.5 ? 'metric-good' : 'metric-neutral'},
    {t:'Risiko', v: rsi >= 70 ? 'RSI jenuh beli — jangan chasing, tunggu pullback.' : 'Risiko relatif terkendali.', c: rsi >= 70 ? 'metric-warn' : 'metric-good'}
  ];
  document.getElementById('insight-cards').innerHTML = notes.map(n => `<div class="stat-tile ${n.c}"><span>${n.t}</span><div class="text-sm text-muted mt-1">${n.v}</div></div>`).join('');
}
function renderFallbackSvgChart(data){
  const container = document.getElementById('tvchart');
  const vals = data.map(d=>d.close), min=Math.min(...vals), max=Math.max(...vals), w=720,h=320,p=24;
  const pts = vals.map((v,i)=>`${p+i*(w-2*p)/Math.max(vals.length-1,1)},${h-p-((v-min)/Math.max(max-min,1))*(h-2*p)}`).join(' ');
  container.innerHTML = `<svg viewBox="0 0 ${w} ${h}" class="fallback-svg-chart"><polyline fill="none" stroke="var(--primary-color,#10b981)" stroke-width="3" points="${pts}"/><text x="${p}" y="${p}" fill="var(--text-dim,#94a3b8)">${nf(vals[vals.length-1],0)}</text></svg>`;
}
function renderStockNewsFeed(symbol, newsPayload) {
  const el = document.getElementById('stock-news-feed');
  if (!el) return;
  const items = Array.isArray(newsPayload?.data) ? newsPayload.data : [];
  if (!items.length) {
    el.innerHTML = '<div class="stock-news-empty"><div class="stock-news-empty-icon"><i data-lucide="newspaper"></i></div><strong>Belum ada berita terkait</strong><span>Berita spesifik untuk saham ini akan muncul saat terdeteksi oleh pemantauan pasar.</span></div>';
    return;
  }
  el.innerHTML = items.slice(0, 5).map(n => `
    <a href="${(n.link || '#').replace(/'/g, "\\'")}" target="_blank" rel="noopener noreferrer" class="stock-news-card">
      <span class="stock-news-source">${n.source || 'rss'}</span>
      <strong class="stock-news-title">${(n.title || 'Berita').replace(/</g,'&lt;').slice(0, 100)}</strong>
      <span class="stock-news-date">${(n.published_at || '').slice(0, 10) || ''}</span>
      ${n.summary ? `<p class="stock-news-summary">${n.summary.replace(/<[^>]*>/g,'').replace(/</g,'&lt;').slice(0, 80)}</p>` : ''}
    </a>`).join('');
}

function renderStockAnnouncements(symbol, annPayload) {
  const el = document.getElementById('stock-announcements-feed');
  if (!el) return;
  const items = Array.isArray(annPayload?.data) ? annPayload.data : [];
  if (!items.length) {
    el.innerHTML = '<div class="stock-news-empty"><div class="stock-news-empty-icon"><i data-lucide="building"></i></div><strong>Belum ada pengumuman</strong><span>Pengumuman IDX untuk saham ini akan muncul setelah tersedia.</span></div>';
    return;
  }
  const upper = symbol.toUpperCase();
  const filtered = items.filter(a => (a.title || a.subject || '').toUpperCase().includes(upper)).slice(0, 5);
  const display = filtered.length ? filtered : items.slice(0, 3);
  el.innerHTML = display.map(a => {
    const title = a.title || a.subject || 'Pengumuman';
    const date = (a.date || '').slice(0, 10) || '';
    const link = a.link || '#';
    return `<a href="${link.replace(/'/g, "\\'")}" target="_blank" rel="noopener noreferrer" class="stock-news-card">
      <span class="stock-news-source">IDX</span>
      <strong class="stock-news-title">${title.replace(/</g,'&lt;').slice(0, 80)}</strong>
      <span class="stock-news-date">${date}</span>
    </a>`;
  }).join('');
}

function renderBrokerActivity(data) {
  const el = document.getElementById('broker-activity-panel');
  if (!el) return;
  el.style.display = '';
  el.innerHTML = '<div class="text-xs text-dim uppercase strong mb-2">Aktivitas Broker (5 hari)</div>' + 
    data.slice(0, 6).map(r => {
      const net = Number(r.net_volume || 0);
      const cls = net > 0 ? 'text-up' : net < 0 ? 'text-down' : 'text-dim';
      return `<div class="flex justify-between items-center gap-2 peer-row-divider"><span class="mono broker-name">${r.broker || '—'}</span><span class="mono ${cls} broker-net">${net > 0 ? '+' : ''}${nf(Math.abs(net),0)}</span></div>`;
    }).join('');
}

function renderStockDepth(depth) {
  const el = document.getElementById('depth-panel');
  if (!el || !depth || !depth.bids?.length) return;
  el.style.display = '';
  const maxVol = depth.max_volume || 1;
  const spreadPct = depth.spread_pct || 0;
  const spreadCls = spreadPct < 0.5 ? 'text-up' : spreadPct < 1.0 ? 'text-warn' : 'text-down';
  const rows = [];
  for (let i = 4; i >= 0; i--) rows.push({ side: 'ask', ...depth.asks[i] });
  for (let i = 0; i < 5; i++) rows.push({ side: 'bid', ...depth.bids[i] });
  el.innerHTML = `<div class="stock-side-panel">
    <div class="flex justify-between items-center mb-1"><h3 class="stock-side-panel-title" style="margin-bottom:0">Order Book (5 Level)</h3><span class="text-xs ${spreadCls}" title="Spread estimasi">Spread ${nf(spreadPct,2)}%</span></div>
    <div class="text-xs text-dim mb-2">Tick ${nf(depth.tick_size||1,0)} · Harga ${money(depth.price)}</div>
    <div style="display:flex;flex-direction:column;gap:2px">
      ${rows.map(r => {
        const isAsk = r.side === 'ask';
        const pct = (r.cumulative / maxVol) * 100;
        const color = isAsk ? 'var(--down-color)' : 'var(--up-color)';
        const bgColor = isAsk ? 'rgba(248,113,113,0.08)' : 'rgba(52,211,153,0.08)';
        return `<div style="display:flex;align-items:center;gap:6px;position:relative;padding:2px 6px;border-radius:3px;background:${bgColor}">
          <div style="position:absolute;${isAsk?'right':'left'}:0;top:0;height:100%;width:${Math.min(pct,100)}%;background:${color}18;border-radius:3px;transition:width .3s"></div>
          <span class="mono text-xs" style="width:48px;text-align:${isAsk?'right':'left'};flex-shrink:0;position:relative;z-index:1">${nf(r.price,2)}</span>
          <div style="flex:1;position:relative;z-index:1;display:flex;gap:2px">
            <span class="mono text-xs text-dim" style="flex:1;text-align:${isAsk?'left':'right'}">${nf(r.volume,0)}</span>
            <span class="mono text-xs text-dim" style="flex:1;text-align:${isAsk?'left':'right'}">${nf(r.cumulative,0)}</span>
          </div>
          <div style="position:absolute;${isAsk?'left':'right'}:0;top:2px;height:calc(100% - 4px);width:${Math.min(pct,100)}%;background:${color}22;border-radius:2px;pointer-events:none"></div>
        </div>`;
      }).join('')}
    </div>
    <div class="flex justify-between text-xs text-dim mt-1">
      <span>Jual</span>
      <span>Vol</span>
      <span>Kum.</span>
      <span>Beli</span>
    </div>
  </div>`;
}

function renderStockForeignFlow(data) {
  const el = document.getElementById('foreign-flow-panel');
  if (!el || !data?.length) return;
  el.style.display = '';
  const totalNet = data.reduce((s, r) => s + Number(r.net_value || 0), 0);
  const avgNet = totalNet / data.length;
  const trend = avgNet >= 0 ? 'up' : 'down';
  const days = data.slice(0, 14);
  const maxAbs = Math.max(...days.map(r => Math.abs(Number(r.net_value || 0))), 1);
  el.innerHTML = `<div class="stock-side-panel">
    <h3 class="stock-side-panel-title">Aliran Asing (14 hari)</h3>
    <div class="text-xs text-dim mb-2">Total net ${trend === 'up' ? 'beli' : 'jual'} ${nf(Math.abs(totalNet/1e9), 2)}M dalam ${data.length} sesi</div>
    <div class="flex-col gap-1">
      ${days.map(r => {
        const nv = Number(r.net_value || 0);
        const isUp = nv >= 0;
        const pct = Math.abs(nv) / maxAbs * 100;
        return `<div class="flex items-center gap-2" style="padding:3px 0">
          <span class="text-xs text-dim" style="width:42px;flex-shrink:0">${String(r.date || '').slice(5,10)}</span>
          <div style="flex:1;height:14px;background:var(--bg-panel);border-radius:4px;overflow:hidden;display:flex;flex-direction:row-reverse">
            <div style="width:${isUp ? pct : 0}%;height:100%;background:var(--up-color);border-radius:4px;min-width:${nv === 0 ? 0 : 2}px"></div>
          </div>
          <div style="flex:1;height:14px;background:var(--bg-panel);border-radius:4px;overflow:hidden">
            <div style="width:${!isUp ? pct : 0}%;height:100%;background:var(--down-color);border-radius:4px;min-width:${nv === 0 ? 0 : 2}px"></div>
          </div>
          <span class="mono text-xs ${isUp ? 'text-up' : 'text-down'}" style="width:60px;text-align:right;flex-shrink:0">${isUp ? '+' : ''}${nf(nv/1e9, 2)}M</span>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

// ─── Alert Modal ────────────────────────
function showAlertModal(symbol) {
  const existing = document.getElementById('alert-modal-overlay');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'alert-modal-overlay';
  overlay.innerHTML = `
    <div class="modal-backdrop" onclick="this.closest('#alert-modal-overlay')?.remove()"></div>
    <div class="modal-panel">
      <div class="flex justify-between items-center mb-3"><h3 class="panel-title m-0">Atur Peringatan ${symbol}</h3><button type="button" class="btn btn-icon" onclick="document.getElementById('alert-modal-overlay')?.remove()"><i data-lucide="x"></i></button></div>
      <div class="mb-2"><label class="text-xs text-dim uppercase strong">Tipe</label>
        <select id="alert-type" class="form-input alert-input">
          <option value="price_above">Harga di atas</option><option value="price_below">Harga di bawah</option>
          <option value="rsi_above">RSI di atas</option><option value="rsi_below">RSI di bawah</option>
        </select></div>
      <div class="mb-2"><label class="text-xs text-dim uppercase strong">Nilai</label><input type="number" id="alert-value" class="form-input alert-input" step="10" min="1" /></div>
      <button id="alert-save-btn" type="button" class="btn btn-primary alert-save-btn">Simpan Peringatan</button>
      <div id="alert-list" class="mt-3"></div>
    </div>`;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  // Reset body scroll when overlay is removed (covers inline onclick handlers)
  const scrollObserver = new MutationObserver(() => {
    if (!document.body.contains(overlay)) {
      document.body.style.overflow = '';
      scrollObserver.disconnect();
    }
  });
  scrollObserver.observe(document.body, { childList: true, subtree: true });

  // Focus trap
  const alertFocusable = overlay.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
  if (alertFocusable.length) {
    const afirst = alertFocusable[0], alast = alertFocusable[alertFocusable.length - 1];
    overlay.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === afirst) { e.preventDefault(); alast.focus(); }
      else if (!e.shiftKey && document.activeElement === alast) { e.preventDefault(); afirst.focus(); }
    });
  }
  // Focus first input
  setTimeout(() => {
    const alertFirstInput = overlay.querySelector('.form-input, .modal-input');
    if (alertFirstInput) alertFirstInput.focus();
  }, 100);

  document.getElementById('alert-save-btn').addEventListener('click', async () => {
    const atype = document.getElementById('alert-type').value;
    const avalue = parseFloat(document.getElementById('alert-value').value);
    if (!avalue || avalue <= 0) return showToast('Masukkan nilai yang valid', 'error');
    try {
      const res = await apiFetch('/alerts', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ticker:symbol, alert_type:atype, value:avalue}) });
      if (res?.ok) { showToast(res.message, 'success'); loadAlertList(symbol); }
      else showToast('Gagal membuat alert', 'error');
    } catch (e) {
      console.warn('alert creation failed', e);
      showToast('Gagal membuat alert', 'error');
    }
  });
  loadAlertList(symbol);
}

async function loadAlertList(symbol) {
  const el = document.getElementById('alert-list');
  if (!el) return;
  try {
    const res = await apiFetch(`/alerts?ticker=${encodeURIComponent(symbol)}`);
    const items = Array.isArray(res?.data) ? res.data : [];
    if (!items.length) { el.innerHTML = '<div class="text-xs text-dim mt-2">Belum ada peringatan aktif.</div>'; return; }
    el.innerHTML = '<div class="text-xs text-dim uppercase strong mb-2 mt-2">Peringatan Aktif</div>' +
      items.map(a => `<div class="flex justify-between items-center gap-2 py-1 alert-row"><span class="text-xs">${a.alert_type.replace('_',' ')} ${a.value}</span><button type="button" class="btn btn-mini text-down alert-delete-btn" data-alert-id="${a.id}">Hapus</button></div>`).join('');
    el.querySelectorAll('[data-alert-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.alertId;
        try {
          const del = await apiFetch(`/alerts/${id}`, { method: 'DELETE' });
          if (del?.ok) { showToast(del.message, 'success'); loadAlertList(symbol); }
          else showToast('Gagal menghapus alert', 'error');
        } catch (e) {
          console.warn('alert deletion failed', e);
          showToast('Gagal menghapus alert', 'error');
        }
    });
  });
  } catch (e) {
    console.warn('loadAlertList failed', e);
    el.innerHTML = '<div class="text-xs text-dim mt-2">Gagal memuat peringatan.</div>';
  }
}

// ─── Peer Comparison ────────────────────
function renderPeerComparison(symbol) {
  apiFetch(`/stocks/${encodeURIComponent(symbol)}/peers?limit=5`).then(res => {
    const el = document.getElementById('peer-comparison-panel');
    if (!el || !res?.data?.length) return;
    el.style.display = '';
    el.innerHTML = '<div class="flex justify-between items-center mb-2"><span class="text-xs text-dim uppercase strong">Peer Comparison</span></div>' +
      '<div class="peer-row peer-row-divider"><span class="text-xs text-dim peer-table-header">KODE</span><span class="text-xs text-dim peer-table-header">NAMA</span><span class="text-xs text-dim peer-table-header peer-header-right">HARGA</span><span class="text-xs text-dim peer-table-header peer-header-right">CHG%</span></div>' +
      res.data.map(p => {
        const changeCls = p.change_pct > 0 ? 'text-up' : p.change_pct < 0 ? 'text-down' : 'text-dim';
        const arrow = p.change_pct > 0 ? '▲' : p.change_pct < 0 ? '▼' : '—';
        return `<a href="#stock/${p.ticker}" class="peer-row">
          <span class="peer-code">${p.ticker}</span>
          <span class="peer-name">${(p.name || p.sector || '').slice(0, 18)}</span>
          <span class="peer-price">${p.price != null ? nf(p.price,0) : '—'}</span>
          <span class="peer-change ${changeCls}">${p.change_pct != null ? `${arrow} ${pf(p.change_pct)}` : '—'}</span>
        </a>`;
      }).join('');
  }).catch(() => {});
}

function fallbackIssuerName(ticker){ const names={GOTO:'GoTo Gojek Tokopedia Tbk.',BBCA:'Bank Central Asia Tbk.',BMRI:'Bank Mandiri Tbk.',BBRI:'Bank Rakyat Indonesia Tbk.',TLKM:'Telkom Indonesia Tbk.'}; return names[ticker] || `${ticker} — Ekuitas IDX`; }
function makeFallbackCandles(ticker){ const baseMap={GOTO:96,BBCA:9800,BMRI:5850,BBRI:4100,TLKM:3420}; const base=baseMap[ticker]||1000; const out=[]; for(let i=59;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); const wave=Math.sin(i/3)*0.025; const close=Math.round(base*(1+wave+(60-i)*0.0008)); out.push({date:d.toISOString().slice(0,10),open:close-2,high:close+4,low:close-5,close,volume:10000000+i*123456}); } return out; }
