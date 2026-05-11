import { fetchFundamental, fetchTechnical, fetchAnalysis, fetchChartData, fetchStockDetail, fetchNews, fetchWatchlist, deleteWatchlistItem, apiFetch, saveWatchlistItem, showToast, loadTVWidget, getTVTheme } from '../api.js?v=202605120200';
import { observeElements, flashUpdate } from '../utils/helpers.js?v=202605120200';
import { nf, pct, pf, money, fmtRp, renderMarkdown } from '../utils/format.js?v=202605120200';
import { ssGet, ssSet, ssRemove } from '../utils/storage.js?v=202605120200';

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
}

// ─── Stock Detail Tab System (31.2.1) ────────────────────────
const STOCK_MAIN_TAB_KEY = 'retailbijak.stock_main_tab';
const VALID_MAIN_TABS = ['overview', 'chart', 'fundamental', 'news', 'corporate'];

// Track lazy-load state per tab so we don't double-fetch
const _tabLoaded = {};

function _clearTabLoaded() {
  VALID_MAIN_TABS.forEach(t => { _tabLoaded[t] = false; });
}

async function switchStockTab(tab, symbol) {
  if (!VALID_MAIN_TABS.includes(tab)) tab = 'overview';

  // Update tab bar active state
  document.querySelectorAll('#stock-tab-bar .stock-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  // Update URL hash without triggering a full re-render
  const newHash = `#stock/${symbol}/${tab}`;
  if (location.hash !== newHash) {
    history.replaceState(null, '', newHash);
  }

  // Persist choice
  try { sessionStorage.setItem(`${STOCK_MAIN_TAB_KEY}.${symbol}`, tab); } catch {}

  // Show/hide tab content sections
  const overviewEl   = document.getElementById('tab-content-overview');
  const chartEl      = document.getElementById('tab-content-chart');
  const fundEl       = document.getElementById('tab-content-fundamental');
  const newsEl       = document.getElementById('tab-content-news');
  const corpEl       = document.getElementById('tab-content-corporate');

  [overviewEl, chartEl, fundEl, newsEl, corpEl].forEach(el => {
    if (el) el.style.display = 'none';
  });

  switch (tab) {
    case 'overview':
      if (overviewEl) overviewEl.style.display = '';
      break;

    case 'chart':
      if (chartEl) {
        chartEl.style.display = '';
        if (!_tabLoaded.chart) {
          _tabLoaded.chart = true;
          // Lazy-render chart tab on first show using cached 1D candles
          const tabChartContainer = document.getElementById('tvchart-tab');
          if (tabChartContainer) {
            const cached1D = cachedMultiChartCandles?.['1D'];
            if (cached1D && cached1D.length) {
              _renderChartInto(tabChartContainer, symbol, cached1D, '1D');
            } else {
              fetchChartData(symbol, 160, '1D').then(res => {
                const c = normalizeCandles(res?.data?.length ? res.data : []);
                if (c.length) _renderChartInto(tabChartContainer, symbol, c, '1D');
                else tabChartContainer.innerHTML = '<div class="empty-state-v2"><h3>Tidak ada data chart</h3></div>';
              }).catch(() => {
                tabChartContainer.innerHTML = '<div class="empty-state-v2"><h3>Gagal memuat chart</h3></div>';
              });
            }
          }
        }
      }
      break;

    case 'fundamental':
      if (fundEl) {
        fundEl.style.display = '';
        if (!_tabLoaded.fundamental) {
          _tabLoaded.fundamental = true;
          // Render fundamental history into tab-specific container
          renderFundamentalHistoryInto(symbol, document.getElementById('fundamental-history-tab'));
          // Corporate actions already in tab DOM via renderCorporateActions(symbol) which targets #corporate-actions-timeline
          // (shared ID — already populated during overview load)
          renderKalkulatorKorporasi(symbol);
        }
      }
      break;

    case 'news':
      if (newsEl) {
        newsEl.style.display = '';
        if (!_tabLoaded.news) {
          _tabLoaded.news = true;
          // Fetch fresh news if feed is still empty/skeleton
          const feedEl = document.getElementById('stock-news-feed-main');
          const annEl  = document.getElementById('stock-announcements-feed-main');
          if (feedEl && !feedEl.querySelector('.stock-news-card')) {
            feedEl.innerHTML = '<div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text short mt-1"></div>';
            apiFetch(`/stocks/${encodeURIComponent(symbol)}/news?limit=10`).then(res => {
              renderStockNewsFeedInto(feedEl, symbol, res);
            }).catch(() => {
              feedEl.innerHTML = '<div class="text-xs text-dim">Gagal memuat berita.</div>';
            });
          }
          if (annEl && !annEl.querySelector('.stock-news-card')) {
            annEl.innerHTML = '<div class="skeleton skeleton-text"></div>';
            apiFetch(`/company-announcements?companyCode=${encodeURIComponent(symbol)}&limit=8`).then(res => {
              renderStockAnnouncementsInto(annEl, symbol, res);
            }).catch(() => {
              annEl.innerHTML = '<div class="text-xs text-dim">Gagal memuat pengumuman.</div>';
            });
          }
        }
      }
      break;

    case 'corporate':
      if (corpEl) {
        corpEl.style.display = '';
        if (!_tabLoaded.corporate) {
          _tabLoaded.corporate = true;
          renderCorporateActionsInto(symbol, document.getElementById('corporate-actions-timeline-main'));
          renderKalkulatorKorporasiInto(symbol, document.getElementById('kalkulator-korporasi-wrap'));
        }
      }
      break;
  }

  // Re-init lucide icons for newly visible content
  if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
}

// Helpers that render into explicit containers (avoid ID conflicts with overview tab)
function renderStockNewsFeedInto(el, symbol, newsPayload) {
  if (!el) return;
  const items = Array.isArray(newsPayload?.data) ? newsPayload.data : [];
  if (!items.length) {
    el.innerHTML = '<div class="stock-news-empty"><div class="stock-news-empty-icon"><i data-lucide="newspaper"></i></div><strong>Belum ada berita terkait</strong><span>Berita spesifik untuk saham ini akan muncul saat terdeteksi.</span></div>';
    return;
  }
  el.innerHTML = items.slice(0, 10).map(n => `
    <a href="${(n.link || '#').replace(/'/g, "\\'")}" target="_blank" rel="noopener noreferrer" class="stock-news-card">
      <span class="stock-news-source">${n.source || 'rss'}</span>
      <strong class="stock-news-title">${(n.title || 'Berita').replace(/</g,'&lt;').slice(0, 100)}</strong>
      <span class="stock-news-date">${(n.published_at || '').slice(0, 10) || ''}</span>
      ${n.summary ? `<p class="stock-news-summary">${n.summary.replace(/<[^>]*>/g,'').replace(/</g,'&lt;').slice(0, 120)}</p>` : ''}
    </a>`).join('');
}

function renderStockAnnouncementsInto(el, symbol, annPayload) {
  if (!el) return;
  const items = Array.isArray(annPayload?.data) ? annPayload.data : [];
  if (!items.length) {
    el.innerHTML = '<div class="stock-news-empty"><div class="stock-news-empty-icon"><i data-lucide="building"></i></div><strong>Belum ada pengumuman</strong><span>Pengumuman IDX akan muncul setelah tersedia.</span></div>';
    return;
  }
  const upper = symbol.toUpperCase();
  const filtered = items.filter(a => (a.title || a.subject || '').toUpperCase().includes(upper)).slice(0, 8);
  const display = filtered.length ? filtered : items.slice(0, 5);
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

function renderCorporateActionsInto(symbol, container) {
  if (!container) return;
  apiFetch(`/stocks/${encodeURIComponent(symbol)}/corporate-actions`).then(res => {
    const events = res?.data || [];
    if (!events.length) {
      container.innerHTML = '<div class="empty-state-v2" style="padding:12px"><h3>Belum ada data</h3><p>Belum ada aksi korporasi tercatat.</p></div>';
      return;
    }
    const typeColors = { dividend:'#34d399', split:'#3b82f6', rights:'#8b5cf6', ipo:'#f59e0b', earnings:'#6366f1', corporate:'#f97316' };
    const typeLabels = { dividend:'Dividen', split:'Stock Split', rights:'HMETD', ipo:'IPO', earnings:'Laporan Keuangan', corporate:'Aksi Korporasi' };
    container.innerHTML = `<div class="ca-timeline">${events.slice(0, 20).map(ev => {
      const color = typeColors[ev.type] || '#64748b';
      const label = typeLabels[ev.type] || ev.type;
      const dateStr = ev.date ? ev.date.slice(0, 10) : '';
      const desc = ev.description ? ev.description.slice(0, 120) : '';
      return `<div class="ca-item" onclick="this.classList.toggle('ca-expanded')" style="cursor:pointer">
        <div class="ca-item-dot" style="background:${color}"><span class="ca-dot-inner" style="background:${color}"></span></div>
        <div class="ca-item-content">
          <div class="ca-item-header"><span class="ca-item-type" style="color:${color}">${label}</span><span class="ca-item-date">${dateStr}</span></div>
          <div class="ca-item-title">${ev.title || ''}</div>
          ${desc ? `<div class="ca-item-desc">${desc}</div>` : ''}
        </div>
      </div>`;
    }).join('')}</div>
    ${events.length > 20 ? `<div class="text-xs text-dim mt-2 text-center">+ ${events.length - 20} event lainnya</div>` : ''}`;
  }).catch(() => {
    container.innerHTML = '<div class="empty-state-v2" style="padding:12px"><h3>Gagal memuat data</h3></div>';
  });
}

function renderKalkulatorKorporasiInto(symbol, wrapper) {
  if (!wrapper || wrapper.querySelector('#kalkulator-korporasi-card-main')) return;
  const card = document.createElement('div');
  card.id = 'kalkulator-korporasi-card-main';
  card.className = 'panel';
  card.style.cssText = 'margin-top:12px;border-radius:12px;overflow:hidden';
  card.innerHTML = `
    <div id="kalkorp2-toggle" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;cursor:pointer;user-select:none">
      <span class="text-xs uppercase text-dim strong" style="letter-spacing:.06em">🧮 Kalkulator Korporasi</span>
      <span id="kalkorp2-chevron" style="font-size:12px;transition:transform .2s">▼</span>
    </div>
    <div id="kalkorp2-body" style="display:none;padding:0 16px 16px">
      <div style="display:flex;gap:6px;margin-bottom:14px">
        <button id="kalkorp2-tab-split" class="btn btn-primary btn-sm" style="font-size:11px">Stock Split</button>
        <button id="kalkorp2-tab-rights" class="btn btn-sm" style="font-size:11px">Rights Issue</button>
      </div>
      <div id="kalkorp2-panel-split">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
          <div><label class="text-xs text-dim block mb-1">Lot Dimiliki</label><input id="split2-lots" type="number" class="modal-input" value="10" min="1" step="1" style="width:100%"></div>
          <div><label class="text-xs text-dim block mb-1">Harga Beli (Rp)</label><input id="split2-price" type="number" class="modal-input" value="1000" min="1" step="50" style="width:100%"></div>
          <div><label class="text-xs text-dim block mb-1">Rasio Split (misal 2 = 1:2)</label><input id="split2-ratio" type="number" class="modal-input" value="2" min="1" step="1" style="width:100%"></div>
        </div>
        <button id="split2-calc-btn" class="btn btn-primary btn-sm" style="font-size:11px;margin-bottom:10px">Hitung</button>
        <div id="split2-result" style="display:none;background:var(--bg-panel,#1e293b);border-radius:8px;padding:10px 12px">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
            <div class="text-center"><div class="text-xs text-dim mb-1">Lot Baru</div><strong id="split2-out-lots" class="mono text-up" style="font-size:15px">—</strong></div>
            <div class="text-center"><div class="text-xs text-dim mb-1">Harga Baru</div><strong id="split2-out-price" class="mono" style="font-size:15px">—</strong></div>
            <div class="text-center"><div class="text-xs text-dim mb-1">Nilai Total</div><strong id="split2-out-value" class="mono" style="font-size:15px">—</strong></div>
          </div>
          <div class="text-xs text-dim mt-2" style="text-align:center">Nilai portofolio tidak berubah setelah split.</div>
        </div>
      </div>
      <div id="kalkorp2-panel-rights" style="display:none">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
          <div><label class="text-xs text-dim block mb-1">Lot Dimiliki</label><input id="rights2-lots" type="number" class="modal-input" value="10" min="1" step="1" style="width:100%"></div>
          <div><label class="text-xs text-dim block mb-1">Harga Rights (Rp)</label><input id="rights2-price" type="number" class="modal-input" value="500" min="1" step="50" style="width:100%"></div>
          <div><label class="text-xs text-dim block mb-1">Rasio 1:N (isi N)</label><input id="rights2-ratio" type="number" class="modal-input" value="5" min="1" step="1" style="width:100%"></div>
          <div><label class="text-xs text-dim block mb-1">Harga Pasar Saat Ini (Rp)</label><input id="rights2-market" type="number" class="modal-input" value="1000" min="1" step="50" style="width:100%"></div>
        </div>
        <button id="rights2-calc-btn" class="btn btn-primary btn-sm" style="font-size:11px;margin-bottom:10px">Hitung</button>
        <div id="rights2-result" style="display:none;background:var(--bg-panel,#1e293b);border-radius:8px;padding:10px 12px">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
            <div class="text-center"><div class="text-xs text-dim mb-1">Lot Rights</div><strong id="rights2-out-lots" class="mono text-up" style="font-size:15px">—</strong></div>
            <div class="text-center"><div class="text-xs text-dim mb-1">Biaya Exercise</div><strong id="rights2-out-cost" class="mono" style="font-size:15px">—</strong></div>
            <div class="text-center"><div class="text-xs text-dim mb-1">Dilusi %</div><strong id="rights2-out-dilution" class="mono text-down" style="font-size:15px">—</strong></div>
          </div>
          <div id="rights2-out-note" class="text-xs text-dim mt-2" style="text-align:center"></div>
        </div>
      </div>
    </div>`;
  wrapper.appendChild(card);

  // Collapsible
  card.querySelector('#kalkorp2-toggle').addEventListener('click', () => {
    const body = card.querySelector('#kalkorp2-body');
    const chev = card.querySelector('#kalkorp2-chevron');
    const open = body.style.display !== 'none';
    body.style.display = open ? 'none' : 'block';
    chev.style.transform = open ? '' : 'rotate(180deg)';
  });
  // Tab switching
  const tabSplit = card.querySelector('#kalkorp2-tab-split');
  const tabRights = card.querySelector('#kalkorp2-tab-rights');
  const panelSplit = card.querySelector('#kalkorp2-panel-split');
  const panelRights = card.querySelector('#kalkorp2-panel-rights');
  tabSplit.addEventListener('click', () => { tabSplit.classList.add('btn-primary'); tabRights.classList.remove('btn-primary'); panelSplit.style.display = ''; panelRights.style.display = 'none'; });
  tabRights.addEventListener('click', () => { tabRights.classList.add('btn-primary'); tabSplit.classList.remove('btn-primary'); panelRights.style.display = ''; panelSplit.style.display = 'none'; });
  // Split calc
  card.querySelector('#split2-calc-btn').addEventListener('click', () => {
    const lots = parseFloat(card.querySelector('#split2-lots').value) || 0;
    const price = parseFloat(card.querySelector('#split2-price').value) || 0;
    const ratio = parseFloat(card.querySelector('#split2-ratio').value) || 1;
    if (lots <= 0 || price <= 0 || ratio < 1) return;
    card.querySelector('#split2-out-lots').textContent = nf(lots * ratio, 0) + ' lot';
    card.querySelector('#split2-out-price').textContent = money(price / ratio);
    card.querySelector('#split2-out-value').textContent = money(lots * 100 * price);
    card.querySelector('#split2-result').style.display = '';
  });
  // Rights calc
  card.querySelector('#rights2-calc-btn').addEventListener('click', () => {
    const lots = parseFloat(card.querySelector('#rights2-lots').value) || 0;
    const rightsPrice = parseFloat(card.querySelector('#rights2-price').value) || 0;
    const ratio = parseFloat(card.querySelector('#rights2-ratio').value) || 1;
    const marketPrice = parseFloat(card.querySelector('#rights2-market').value) || 0;
    if (lots <= 0 || rightsPrice <= 0 || ratio < 1) return;
    const shares = lots * 100;
    const rightsShares = Math.floor(shares / ratio);
    const rightsLots = rightsShares / 100;
    const exerciseCost = rightsShares * rightsPrice;
    const dilutionPct = rightsShares > 0 ? (rightsShares / (shares + rightsShares)) * 100 : 0;
    const terp = marketPrice > 0 ? ((shares * marketPrice) + (rightsShares * rightsPrice)) / (shares + rightsShares) : 0;
    card.querySelector('#rights2-out-lots').textContent = nf(rightsLots, 2) + ' lot';
    card.querySelector('#rights2-out-cost').textContent = money(exerciseCost);
    card.querySelector('#rights2-out-dilution').textContent = pf(dilutionPct);
    card.querySelector('#rights2-out-note').textContent = terp > 0 ? `TERP (harga teoritis ex-rights): ${money(terp)}` : 'Isi harga pasar untuk menghitung TERP.';
    card.querySelector('#rights2-result').style.display = '';
  });
}

export async function renderStockDetail(root, ticker, initialTab) {
  // Clean up any previous multi-chart instances (cross-stock navigation)
  try {
    multiChartInstances.forEach(inst => { try { inst.chart.remove(); } catch(e) {} });
    multiChartInstances = [];
    multiChartActive = false;
    cachedMultiChartCandles = {};
    cachedMultiChartTechnical = {};
    if (multiChartResizeObserver) { multiChartResizeObserver.disconnect(); multiChartResizeObserver = null; }
  } catch(e) {}
  // Reset lazy-load flags for new stock
  _clearTabLoaded();
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
          <div id="pattern-tags" class="stock-pattern-tags mt-2 flex gap-1 flex-wrap"></div>
          <div id="perf-chips" class="stock-perf-chips mt-1 flex gap-1 flex-wrap"></div>
        </div>
      </div>
      <!-- Price Board (19.5) -->
      <div class="price-board-grid" id="price-board" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:6px;margin-top:8px;padding:0 2px">
        <div class="price-board-item"><span class="price-board-label">Sebelumnya</span><span class="price-board-value" id="pb-prev-close">—</span></div>
        <div class="price-board-item"><span class="price-board-label">Pembukaan</span><span class="price-board-value" id="pb-open">—</span></div>
        <div class="price-board-item"><span class="price-board-label">Tertinggi</span><span class="price-board-value" id="pb-high">—</span></div>
        <div class="price-board-item"><span class="price-board-label">Terendah</span><span class="price-board-value" id="pb-low">—</span></div>
        <div class="price-board-item"><span class="price-board-label">Volume</span><span class="price-board-value" id="pb-volume">—</span></div>
        <div class="price-board-item"><span class="price-board-label">Nilai</span><span class="price-board-value" id="pb-value">—</span></div>
        <div class="price-board-item"><span class="price-board-label">52W Tertinggi</span><span class="price-board-value" id="pb-52w-high">—</span></div>
        <div class="price-board-item"><span class="price-board-label">52W Terendah</span><span class="price-board-value" id="pb-52w-low">—</span></div>
      </div>
      <!-- 31.2.1 — Sticky Tab Bar -->
      <div class="stock-tab-bar" id="stock-tab-bar">
        <button class="stock-tab active" data-tab="overview">Overview</button>
        <button class="stock-tab" data-tab="chart">Chart</button>
        <button class="stock-tab" data-tab="fundamental">Fundamental</button>
        <button class="stock-tab" data-tab="news">Berita</button>
        <button class="stock-tab" data-tab="corporate">Korporasi</button>
      </div>
      <!-- Tab content wrapper -->
      <div id="stock-tab-content">
        <!-- OVERVIEW TAB -->
        <div id="tab-content-overview">
          <button id="chat-toggle" class="btn btn-icon chat-toggle-btn" title="Tanya AI">
            <i data-lucide="message-circle" style="width:18px;height:18px"></i>
          </button>
          <div id="tv-symbol-profile" class="stock-side-panel hidden"></div>
          <div class="stock-layout">
        <div class="panel chart-card-v2">
          <div class="flex justify-between items-center mb-3">
            <div><h3 class="panel-title">Grafik Harga</h3><p class="text-xs text-dim" id="chart-subtitle">Memuat chart...</p></div>
            <a href="#chart/${symbol}" class="btn btn-ghost btn-sm" title="Buka Chart Penuh" target="_blank" style="font-size:10px"><i data-lucide="maximize-2" style="width:14px"></i> Full</a>
          </div>
          <div class="chart-toolbar" id="chart-toolbar">
            <span class="timeframe-group">
              <label class="indicator-toggle active" data-tf="1D"><span>1D</span></label>
              <label class="indicator-toggle" data-tf="1W"><span>1W</span></label>
              <label class="indicator-toggle" data-tf="1M"><span>1M</span></label>
              <label class="indicator-toggle" data-tf="1H"><span>1H</span></label>
              <label class="indicator-toggle" data-tf="4H"><span>4H</span></label>
            </span>
            <span class="indicator-group">
            <label class="indicator-toggle active" data-indicator="sma"><span>SMA</span></label>
            <label class="indicator-toggle" data-indicator="ema"><span>EMA</span></label>
            <label class="indicator-toggle" data-indicator="boll"><span>Boll</span></label>
            <label class="indicator-toggle" data-indicator="rsi"><span>RSI</span></label>
            <label class="indicator-toggle" data-indicator="macd"><span>MACD</span></label>
            <label class="indicator-toggle" data-indicator="sr"><span>S/R</span></label>
            <label class="indicator-toggle active" data-indicator="vol"><span>Vol</span></label>
            <label class="indicator-toggle" data-indicator="st"><span>ST</span></label>
            <label class="indicator-toggle" data-indicator="vwap"><span>VWAP</span></label>
            </span>
          </div>
          <div class="chart-top-spacing"></div>
          <div class="multi-chart-layout-bar" id="multi-chart-layout-bar">
            <span class="layout-btn active" data-layout="1x1">1×1</span>
            <span class="layout-btn" data-layout="2x1">2×1</span>
            <span class="layout-btn" data-layout="2x2">2×2</span>
            <span class="layout-btn" data-layout="3x2">3×2</span>
            <span class="multi-chart-layout-separator"></span>
            <span class="text-xs text-dim" id="chart-layout-label">Layout</span>
          </div>
          <div id="tvchart" class="stock-chart-wrap"><div class="skeleton skeleton-chart stock-chart-skeleton"></div></div>
          <div id="multi-chart-container" class="multi-chart-grid" style="display:none"></div>
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
            <button type="button" class="stock-tab" data-tab="fundamental">Fundamental</button>
            <button type="button" class="stock-tab" data-tab="diskusi">Diskusi</button>
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
            <div id="ai-summary-container" class="stock-side-panel" style="display:none">
              <div class="ai-summary-card">
                <div class="ai-summary-header">
                  <span><i data-lucide="sparkles" style="width:16px;height:16px"></i> Analisis AI</span>
                  <span id="ai-summary-sentiment" class="badge"></span>
                </div>
                <div id="ai-summary-body" class="ai-summary-body">
                  <!-- AI content here -->
                </div>
                <div class="ai-summary-footer">
                  <small>Analisis oleh AI berdasarkan data teknikal + fundamental. Selalu lakukan riset sendiri.</small>
                </div>
              </div>
            </div>
            <div class="stock-side-panel"><div class="flex justify-between items-start gap-3"><div class="flex-1"><h3 class="stock-side-panel-title">Ringkasan Teknikal (Custom)</h3><div id="technical-summary" class="intel-item"><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text short"></div></div></div><div id="signal-card" class="signal-inline"><span>Sinyal</span><strong>—</strong><small>Keyakinan —</small></div></div><div id="technical-panel" class="tech-grid-v2 mt-3"><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div></div></div>
            <div class="stock-side-panel hidden" id="broker-activity-panel"></div>
            <div class="stock-side-panel hidden" id="depth-panel"></div>
            <div class="stock-side-panel hidden" id="foreign-flow-panel"></div>
            <div class="stock-side-panel hidden" id="peer-comparison-panel"></div>
            <div class="stock-side-panel"><div class="stock-actions"><button id="btn-add-watchlist" type="button" class="btn btn-primary">+ Pantau</button><button id="btn-set-alert" type="button" class="btn">Peringatan</button><button id="btn-add-compare" type="button" class="btn">Bandingkan</button><a href="#screener" class="btn">Pindai</a><button id="ai-summary-btn" type="button" class="btn btn-sm" title="Analisis AI"><i data-lucide="sparkles" style="width:14px;height:14px"></i> AI Analisis</button><button id="btn-report-pdf" type="button" class="btn btn-sm" title="Download Laporan PDF"><i data-lucide="file-text" style="width:14px;height:14px"></i> PDF</button></div></div>
          </div>
          <div class="stock-tab-content" data-tab-content="berita">
            <div class="stock-side-panel"><h3 class="stock-side-panel-title">Berita Terkait</h3><div id="stock-news-feed" class="flex-col gap-2"></div></div>
            <div class="stock-side-panel"><h3 class="stock-side-panel-title">Pengumuman IDX</h3><div id="stock-announcements-feed" class="flex-col gap-2"></div></div>
          </div>
          <div class="stock-tab-content" data-tab-content="fundamental">
            <div class="stock-side-panel"><h3 class="stock-side-panel-title">Fundamental Metrics</h3><div id="fundamental-grid" class="fundamental-grid"><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div></div></div>
            <div class="stock-side-panel"><h3 class="stock-side-panel-title">Riwayat Fundamental</h3><div id="fundamental-history"><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text short"></div></div></div>
            <div class="stock-side-panel"><h3 class="stock-side-panel-title">Aksi Korporasi</h3><div id="corporate-actions-timeline"><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text short"></div></div></div>
          </div>
          <div class="stock-tab-content" data-tab-content="diskusi">
            <div class="stock-side-panel">
              <h3 class="stock-side-panel-title">Diskusi Saham</h3>
              <div id="comments-container">
                <div class="comments-input-area">
                  <textarea id="comment-input" class="form-input" placeholder="Tulis komentar..." rows="2" style="resize:vertical;width:100%"></textarea>
                  <button id="comment-submit" type="button" class="btn btn-primary mt-2" style="width:100%">Kirim Komentar</button>
                </div>
                <div id="comments-list" class="mt-3 flex-col gap-2"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- 32.2.3 — Saham Serupa -->
      <div class="panel" id="similar-stocks-panel" style="margin-top:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <h3 class="panel-title" style="margin:0">🔗 Saham Serupa</h3>
          <span class="text-xs text-dim" id="similar-stocks-sector"></span>
        </div>
        <div id="similar-stocks-list" style="display:flex;gap:10px;overflow-x:auto;padding-bottom:4px">
          <div class="dashboard-widget-state"><strong class="dashboard-widget-state-title">Memuat saham serupa...</strong></div>
        </div>
      </div>
        </div><!-- /tab-content-overview -->

        <!-- CHART TAB -->
        <div id="tab-content-chart" style="display:none">
          <div class="panel chart-card-v2 mt-2">
            <div class="flex justify-between items-center mb-3">
              <div><h3 class="panel-title">Grafik Harga — ${symbol}</h3><p class="text-xs text-dim" id="chart-subtitle-tab">Chart penuh</p></div>
              <a href="#chart/${symbol}" class="btn btn-ghost btn-sm" title="Buka Chart Penuh" style="font-size:10px"><i data-lucide="maximize-2" style="width:14px"></i> Full</a>
            </div>
            <div class="chart-toolbar" id="chart-toolbar-tab">
              <span class="timeframe-group">
                <label class="indicator-toggle active" data-tf-tab="1D"><span>1D</span></label>
                <label class="indicator-toggle" data-tf-tab="1W"><span>1W</span></label>
                <label class="indicator-toggle" data-tf-tab="1M"><span>1M</span></label>
              </span>
            </div>
            <div id="tvchart-tab" class="stock-chart-wrap" style="height:480px"><div class="skeleton skeleton-chart stock-chart-skeleton"></div></div>
          </div>
        </div><!-- /tab-content-chart -->

        <!-- FUNDAMENTAL TAB -->
        <div id="tab-content-fundamental" style="display:none">
          <div class="stock-side-panel mt-2">
            <h3 class="stock-side-panel-title">Fundamental Metrics</h3>
            <div id="fundamental-grid-tab" class="fundamental-grid">
              <div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div>
              <div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div>
              <div class="skeleton skeleton-tile"></div><div class="skeleton skeleton-tile"></div>
            </div>
          </div>
          <div class="stock-side-panel">
            <h3 class="stock-side-panel-title">Riwayat Fundamental</h3>
            <div id="fundamental-history-tab"><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text short"></div></div>
          </div>
          <div class="stock-side-panel">
            <h3 class="stock-side-panel-title">Aksi Korporasi</h3>
            <div id="corporate-actions-timeline"><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text short"></div></div>
          </div>
        </div><!-- /tab-content-fundamental -->

        <!-- NEWS TAB -->
        <div id="tab-content-news" style="display:none">
          <div class="stock-side-panel mt-2">
            <h3 class="stock-side-panel-title">Berita Terkait ${symbol}</h3>
            <div id="stock-news-feed-main" class="flex-col gap-2">
              <div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text short mt-1"></div>
            </div>
          </div>
          <div class="stock-side-panel">
            <h3 class="stock-side-panel-title">Pengumuman IDX</h3>
            <div id="stock-announcements-feed-main" class="flex-col gap-2">
              <div class="skeleton skeleton-text"></div>
            </div>
          </div>
        </div><!-- /tab-content-news -->

        <!-- CORPORATE TAB -->
        <div id="tab-content-corporate" style="display:none">
          <div class="stock-side-panel mt-2">
            <h3 class="stock-side-panel-title">Aksi Korporasi</h3>
            <div id="corporate-actions-timeline-main"><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text short"></div></div>
          </div>
          <div id="kalkulator-korporasi-wrap"></div>
        </div><!-- /tab-content-corporate -->

      </div><!-- /stock-tab-content -->
    </section>
    <!-- Floating AI Chat Panel -->
    <div id="stock-chat-panel" class="stock-chat-panel" style="display:none">
      <div class="stock-chat-header">
        <span>Tanya AI tentang <strong id="chat-stock-name">BBCA</strong></span>
        <button id="chat-close" class="btn btn-icon btn-sm chat-close-btn">&times;</button>
      </div>
      <div id="chat-messages-floating" class="chat-messages-floating">
        <div class="chat-message chat-ai">
          <div class="chat-avatar">🤖</div>
          <div class="chat-bubble">Halo! Tanya saya tentang saham ini. Contoh: "Apa outlook BBCA?" atau "Analisis teknikal BBCA"</div>
        </div>
      </div>
      <div class="chat-input-area">
        <input type="text" id="chat-input-floating" class="chat-input" placeholder="Tanya tentang saham ini..." maxlength="500" />
        <button id="chat-send-floating" class="btn btn-primary btn-sm chat-send-floating-btn" disabled>
          <i data-lucide="send" style="width:16px;height:16px"></i>
        </button>
      </div>
    </div>
    <!-- End Floating AI Chat Panel -->`;
  observeElements();

  // ── 31.2.1 Tab bar init ──────────────────────────────────────
  document.querySelectorAll('#stock-tab-bar .stock-tab').forEach(btn => {
    btn.addEventListener('click', () => switchStockTab(btn.dataset.tab, symbol));
  });
  // Determine initial tab: URL param > sessionStorage > 'overview'
  const _urlTab = (() => {
    const hash = location.hash || '';
    const parts = hash.replace(/^#\/?/, '').split('/');
    // parts: ['stock', 'BBCA', 'chart']
    const t = parts[2] ? parts[2].toLowerCase() : null;
    return VALID_MAIN_TABS.includes(t) ? t : null;
  })();
  const _savedTab = (() => {
    try { return sessionStorage.getItem(`${STOCK_MAIN_TAB_KEY}.${symbol}`) || null; } catch { return null; }
  })();
  const _startTab = _urlTab || (VALID_MAIN_TABS.includes(initialTab) ? initialTab : null) || _savedTab || 'overview';
  // Apply initial tab (defer slightly so DOM is fully painted)
  setTimeout(() => switchStockTab(_startTab, symbol), 0);

  // Wire up chart-tab timeframe toggles (lazy — only render when tab is first shown)
  document.querySelectorAll('[data-tf-tab]').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('[data-tf-tab]').forEach(b => b.classList.remove('active'));
      el.classList.add('active');
      const tf = el.dataset.tfTab;
      const container = document.getElementById('tvchart-tab');
      if (!container) return;
      container.innerHTML = '<div class="skeleton skeleton-chart stock-chart-skeleton"></div>';
      fetchChartData(symbol, tf === '1D' ? 160 : tf === '1W' ? 300 : 400, tf).then(res => {
        const candles = normalizeCandles(res?.data?.length ? res.data : []);
        if (!candles.length) { container.innerHTML = '<div class="empty-state-v2"><h3>Tidak ada data</h3></div>'; return; }
        _renderChartInto(container, symbol, candles, tf);
      }).catch(() => {
        container.innerHTML = '<div class="empty-state-v2"><h3>Gagal memuat chart</h3></div>';
      });
    });
  });

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
    import('./compare.js?v=202605120200').then(m => {
      m.addToCompare(symbol);
    });
  });
  document.getElementById('btn-report-pdf')?.addEventListener('click', () => {
    showToast('⏳ Membuat laporan PDF...', 'info', 10000);
    const link = document.createElement('a');
    link.href = `/api/stocks/${symbol}/report`;
    link.download = `${symbol}_laporan_retailbijak.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Check if PDF opened (wait for download)
    setTimeout(() => showToast('✅ Laporan PDF siap', 'success', 3000), 2000);
  });

  // ── AI Analysis Summary ──
  const aiSummaryBtn = document.getElementById('ai-summary-btn');
  const aiSummaryContainer = document.getElementById('ai-summary-container');
  const aiSummaryBody = document.getElementById('ai-summary-body');
  const aiSummarySentiment = document.getElementById('ai-summary-sentiment');

  async function loadAiSummary() {
    if (!aiSummaryContainer || !aiSummaryBody) return;
    // Show loading skeleton
    aiSummaryContainer.style.display = 'block';
    aiSummaryBody.innerHTML = '<div class="ai-summary-loading"><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text short"></div><div class="skeleton skeleton-text short"></div></div>';
    aiSummarySentiment.textContent = '';
    aiSummarySentiment.className = 'badge';
    // Re-lucide
    if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
    try {
      const res = await apiFetch(`/stocks/${encodeURIComponent(symbol)}/analysis?llm=true`, { timeout: 30000 });
      // Parse LLM response
      const llmContent = res?.llm?.content || res?.llm || res?.data?.llm?.content || res?.data?.llm || null;
      const sentiment = res?.llm?.sentiment || res?.sentiment || 'neutral';
      if (llmContent) {
        aiSummaryBody.innerHTML = renderMarkdown(String(llmContent));
        // Sentiment badge
        const sentLower = String(sentiment).toLowerCase();
        let badgeClass = 'badge';
        let badgeText = 'Netral';
        if (sentLower.includes('bullish')) {
          badgeClass = 'badge ai-summary-sentiment-bullish';
          badgeText = 'Bullish';
        } else if (sentLower.includes('bearish')) {
          badgeClass = 'badge ai-summary-sentiment-bearish';
          badgeText = 'Bearish';
        } else {
          badgeClass = 'badge ai-summary-sentiment-neutral';
          badgeText = 'Netral';
        }
        aiSummarySentiment.textContent = badgeText;
        aiSummarySentiment.className = badgeClass;
      } else {
        aiSummaryBody.innerHTML = '<div class="ai-summary-error"><p>AI analysis tidak tersedia saat ini</p><button class="btn btn-sm" onclick="document.getElementById(\'ai-summary-btn\')?.click()">Coba lagi</button></div>';
      }
    } catch (e) {
      console.warn('AI summary fetch failed', e);
      aiSummaryBody.innerHTML = '<div class="ai-summary-error"><p>Gagal memuat analisis AI. Periksa koneksi atau coba lagi.</p><button class="btn btn-sm" onclick="document.getElementById(\'ai-summary-btn\')?.click()">Coba lagi</button></div>';
    } finally {
      if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
    }
  }

  if (aiSummaryBtn) {
    aiSummaryBtn.addEventListener('click', loadAiSummary);
  }

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

  // ─── Diskusi / Comments ────────────────────
  async function loadComments(sym) {
    const list = document.getElementById('comments-list');
    if (!list) return;
    list.innerHTML = '<div class="text-xs text-dim">Memuat diskusi...</div>';
    try {
      const res = await apiFetch(`/comments/${encodeURIComponent(sym || symbol)}`);
      const items = Array.isArray(res?.data) ? res.data : [];
      if (!items.length) {
        list.innerHTML = '<div class="text-xs text-dim">Belum ada diskusi. Jadilah yang pertama berkomentar!</div>';
        return;
      }
      list.innerHTML = items.map(c => renderCommentItem(c, sym || symbol)).join('');
      list.querySelectorAll('.comment-vote-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const cid = parseInt(btn.dataset.commentId);
          const vote = parseInt(btn.dataset.vote);
          await voteComment(cid, vote, sym || symbol);
        });
      });
      list.querySelectorAll('.comment-delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const cid = parseInt(btn.dataset.commentId);
          await deleteComment(cid, sym || symbol);
        });
      });
    } catch (e) {
      console.warn('loadComments failed', e);
      list.innerHTML = '<div class="text-xs text-dim">Gagal memuat diskusi.</div>';
    }
  }

  function renderCommentItem(c, sym) {
    const ts = c.created_at ? new Date(c.created_at).toLocaleString('id-ID', { dateStyle:'medium', timeStyle:'short' }) : '';
    const username = c.username || 'Trader';
    const score = c.score || 0;
    const userVote = c.user_vote || 0;
    const isOwn = c.user_id === 'user1';
    const upActive = userVote === 1 ? 'active' : '';
    const dnActive = userVote === -1 ? 'active' : '';
    const deleteBtn = isOwn ? `<button type="button" class="btn btn-mini text-down comment-delete-btn" data-comment-id="${c.id}">Hapus</button>` : '';
    return `<div class="comment-item" data-comment-id="${c.id}">
      <div class="comment-header flex justify-between items-center">
        <span class="comment-username text-xs strong">${username}</span>
        <span class="text-xs text-dim">${ts}</span>
      </div>
      <div class="comment-body text-sm mt-1">${escapeHtml(c.content)}</div>
      <div class="comment-actions flex items-center gap-2 mt-1">
        <button type="button" class="btn btn-mini comment-vote-btn ${upActive}" data-comment-id="${c.id}" data-vote="1">▲ ${score > 0 ? score : ''}</button>
        <button type="button" class="btn btn-mini comment-vote-btn ${dnActive}" data-comment-id="${c.id}" data-vote="-1">▼</button>
        ${deleteBtn}
      </div>
    </div>`;
  }

  async function voteComment(commentId, vote, sym) {
    try {
      const res = await apiFetch(`/comments/${commentId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote }),
      });
      if (res?.data) {
        loadComments(sym);
      }
    } catch (e) {
      console.warn('voteComment failed', e);
      showToast('Gagal memberikan vote', 'error');
    }
  }

  async function deleteComment(commentId, sym) {
    try {
      const res = await apiFetch(`/comments/${commentId}`, { method: 'DELETE' });
      if (res?.ok) {
        showToast('Komentar dihapus', 'success');
        loadComments(sym);
      } else {
        showToast('Gagal menghapus komentar', 'error');
      }
    } catch (e) {
      console.warn('deleteComment failed', e);
      showToast('Gagal menghapus komentar', 'error');
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // Wire up comment submit
  const commentSubmit = document.getElementById('comment-submit');
  const commentInput = document.getElementById('comment-input');
  if (commentSubmit && commentInput) {
    commentSubmit.addEventListener('click', async () => {
      const content = commentInput.value.trim();
      if (!content) return showToast('Tulis komentar terlebih dahulu', 'error');
      commentSubmit.disabled = true;
      commentSubmit.textContent = 'Mengirim...';
      try {
        const res = await apiFetch(`/comments/${encodeURIComponent(symbol)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });
        if (res?.data) {
          commentInput.value = '';
          showToast('Komentar terkirim', 'success');
          loadComments(symbol);
        }
      } catch (e) {
        console.warn('comment submit failed', e);
        showToast('Gagal mengirim komentar', 'error');
      } finally {
        commentSubmit.disabled = false;
        commentSubmit.textContent = 'Kirim Komentar';
      }
    });
    // Allow Ctrl+Enter to submit
    commentInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        commentSubmit.click();
      }
    });
  }

  // Load comments when tab is shown
  const diskusiTab = document.querySelector('[data-stock-tabs] .stock-tab[data-tab="diskusi"]');
  if (diskusiTab) {
    diskusiTab.addEventListener('click', () => {
      setTimeout(() => loadComments(symbol), 50);
    });
  }
  // Also load if tab is already active on page load
  if (diskusiTab && diskusiTab.classList.contains('active')) {
    setTimeout(() => loadComments(symbol), 100);
  }

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

  // ── Floating Chat Panel (toggle + history + send) ──
  const chatToggle = document.getElementById('chat-toggle');
  const chatPanel = document.getElementById('stock-chat-panel');
  const chatClose = document.getElementById('chat-close');
  const chatInputFloating = document.getElementById('chat-input-floating');
  const chatSendFloating = document.getElementById('chat-send-floating');
  const chatMessagesFloating = document.getElementById('chat-messages-floating');
  const chatStockName = document.getElementById('chat-stock-name');

  // Update stock name in panel header
  if (chatStockName) chatStockName.textContent = symbol;

  // Enable/disable send button based on input
  if (chatInputFloating && chatSendFloating) {
    chatInputFloating.addEventListener('input', () => {
      chatSendFloating.disabled = !chatInputFloating.value.trim();
    });
  }

  // Load chat history
  async function loadChatHistory() {
    if (!chatMessagesFloating) return;
    // Don't reload if history was already loaded (messages > 1 means greeting + history)
    const existing = chatMessagesFloating.querySelectorAll('.chat-message:not(.chat-history-loading)');
    if (existing.length > 1) return;
    try {
      const loadingEl = document.createElement('div');
      loadingEl.className = 'chat-message chat-ai chat-history-loading';
      loadingEl.innerHTML = '<div class="chat-avatar">🤖</div><div class="chat-bubble">Memuat riwayat chat...</div>';
      chatMessagesFloating.appendChild(loadingEl);
      chatMessagesFloating.scrollTop = chatMessagesFloating.scrollHeight;

      const res = await apiFetch(`/stocks/${encodeURIComponent(symbol)}/chat`, { method: 'GET' });
      loadingEl.remove();
      if (res?.data && Array.isArray(res.data)) {
        // Show last 10 messages
        const messages = res.data.slice(-10);
        // Remove greeting if we have history
        const greeting = chatMessagesFloating.querySelector('.chat-message.chat-ai .chat-bubble');
        if (greeting && messages.length > 0) {
          const greetingContainer = greeting.closest('.chat-message');
          if (greetingContainer) greetingContainer.remove();
        }
        messages.forEach(msg => {
          const isUser = msg.role === 'user';
          const bubble = document.createElement('div');
          bubble.className = `chat-message ${isUser ? 'user' : 'chat-ai'}`;
          if (isUser) {
            bubble.innerHTML = `<div class="chat-bubble">${escapeHtml(msg.message || msg.content || '')}</div>`;
          } else {
            bubble.innerHTML = `<div class="chat-avatar">🤖</div><div class="chat-bubble">${escapeHtml(msg.message || msg.content || '')}</div>`;
          }
          chatMessagesFloating.appendChild(bubble);
        });
        if (messages.length > 0) {
          chatMessagesFloating.scrollTop = chatMessagesFloating.scrollHeight;
        }
      }
    } catch {
      const loadingEl = chatMessagesFloating.querySelector('.chat-history-loading');
      if (loadingEl) loadingEl.remove();
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Toggle chat panel
  if (chatToggle && chatPanel) {
    chatToggle.addEventListener('click', () => {
      const isOpen = chatPanel.style.display !== 'none';
      if (isOpen) {
        chatPanel.style.display = 'none';
      } else {
        chatPanel.style.display = 'flex';
        chatPanel.classList.add('chat-panel-open');
        loadChatHistory();
        // Focus input
        if (chatInputFloating) setTimeout(() => chatInputFloating.focus(), 100);
      }
    });
  }

  // Close button
  if (chatClose && chatPanel) {
    chatClose.addEventListener('click', () => {
      chatPanel.style.display = 'none';
      chatPanel.classList.remove('chat-panel-open');
    });
  }

  // Send message from floating panel
  async function sendFloatingChatMessage(msg) {
    if (!msg || !msg.trim() || !chatMessagesFloating) return;
    if (chatInputFloating) chatInputFloating.disabled = true;
    if (chatSendFloating) { chatSendFloating.disabled = true; }

    // Add user message
    const userMsg = document.createElement('div');
    userMsg.className = 'chat-message user';
    userMsg.innerHTML = `<div class="chat-bubble">${escapeHtml(msg)}</div>`;
    chatMessagesFloating.appendChild(userMsg);
    chatMessagesFloating.scrollTop = chatMessagesFloating.scrollHeight;

    // Show typing indicator
    const typing = document.createElement('div');
    typing.className = 'chat-message chat-ai chat-typing';
    typing.innerHTML = '<div class="chat-avatar">🤖</div><div class="chat-bubble chat-bubble-typing"><span class="chat-typing-dot"></span><span class="chat-typing-dot"></span><span class="chat-typing-dot"></span></div>';
    chatMessagesFloating.appendChild(typing);
    chatMessagesFloating.scrollTop = chatMessagesFloating.scrollHeight;

    try {
      const res = await apiFetch(`/stocks/${encodeURIComponent(symbol)}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
        timeout: 30000,
      });
      typing.remove();
      const reply = res?.reply || 'Maaf, saya tidak bisa menjawab saat ini. Silakan coba lagi.';
      const aiMsg = document.createElement('div');
      aiMsg.className = 'chat-message chat-ai';
      aiMsg.innerHTML = `<div class="chat-avatar">🤖</div><div class="chat-bubble">${renderMarkdown(reply)}</div>`;
      chatMessagesFloating.appendChild(aiMsg);
      if (res?.status === 'error' || res?.status === 'disabled') {
        aiMsg.classList.add('chat-error');
      }
    } catch {
      typing.remove();
      const errMsg = document.createElement('div');
      errMsg.className = 'chat-message chat-ai';
      errMsg.innerHTML = `<div class="chat-avatar">🤖</div><div class="chat-bubble chat-error-bubble">Gagal terhubung ke asisten AI. <button class="btn btn-mini chat-retry-btn" onclick="this.closest('.chat-message').remove(); document.getElementById('chat-send-floating')?.click();">Coba lagi</button></div>`;
      chatMessagesFloating.appendChild(errMsg);
    } finally {
      if (chatInputFloating) { chatInputFloating.disabled = false; chatInputFloating.value = ''; chatInputFloating.focus(); }
      if (chatSendFloating) { chatSendFloating.disabled = true; }
      if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
    }
    chatMessagesFloating.scrollTop = chatMessagesFloating.scrollHeight;
  }

  if (chatInputFloating && chatSendFloating) {
    chatSendFloating.addEventListener('click', () => {
      const msg = chatInputFloating.value.trim();
      if (msg) sendFloatingChatMessage(msg);
    });
    chatInputFloating.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const msg = chatInputFloating.value.trim();
        if (msg) sendFloatingChatMessage(msg);
      }
    });
  }

  // Phase 0: Try full-detail composite endpoint (reduces 8+ calls to 1)
  let fullDetail = null;
  try {
    const fdRes = await fetch(`/api/stocks/${encodeURIComponent(symbol)}/full-detail`);
    if (fdRes.ok) fullDetail = await fdRes.json();
  } catch (e) { /* fall through to phased loading */ }

  // Phase 1: Load critical data FIRST (price + chart) — show immediately
  let detail, chart;
  if (fullDetail) {
    detail = fullDetail.info ? {data: fullDetail.info} : null;
    chart = fullDetail.chart_data ? {data: fullDetail.chart_data} : null;
  } else {
    const p1 = await Promise.all([
      fetchStockDetail(symbol).catch(()=>null),
      fetchChartData(symbol, 160).catch(()=>null),
    ]);
    detail = p1[0];
    chart = p1[1];
  }
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
  loadPerfChips(candles);

  // Phase 2: Load remaining data (skip individual calls if full-detail was successful)
  let fund, techRes, analysis, news, announcements;
  if (fullDetail) {
    fund = fullDetail.fundamental ? {data: fullDetail.fundamental} : null;
    techRes = fullDetail.technical ? {technical: fullDetail.technical} : null;
    analysis = fullDetail.analysis ? {data: fullDetail.analysis.data, llm: fullDetail.analysis.llm} : null;
    const p2 = await Promise.all([
      fetchNews(6, symbol).catch(()=>null),
      apiFetch(`/company-announcements?companyCode=${encodeURIComponent(symbol)}&limit=4`).catch(()=>null)
    ]);
    news = p2[0];
    announcements = p2[1];
    // Load broker/peers from fullDetail
    if (fullDetail.broker_activity?.length) renderBrokerActivity(fullDetail.broker_activity);
    if (fullDetail.peers?.length) renderPeers(fullDetail.peers);
    if (fullDetail.indices?.length) renderIndices(fullDetail.indices);
  } else {
    const p2 = await Promise.all([
      fetchFundamental(symbol).catch(()=>null),
      fetchTechnical(symbol).catch(()=>null),
      fetchAnalysis(symbol, { llm: true }).catch(()=>null),
      fetchNews(6, symbol).catch(()=>null),
      apiFetch(`/company-announcements?companyCode=${encodeURIComponent(symbol)}&limit=4`).catch(()=>null)
    ]);
    fund = p2[0];
    techRes = p2[1];
    analysis = p2[2];
    news = p2[3];
    announcements = p2[4];
  }
  const technical = techRes?.technical || {};
  // TradingView chart (or fallback to LightweightCharts)
  try { renderStockChart(symbol, candles, technical); } catch (e) { console.warn('chart error', e); renderFallbackSvgChart(candles.slice(-30)); }
  // Init multi-chart layout system (after chart container exists)
  try {
    cachedMultiChartCandles = { '1D': candles };
    cachedMultiChartTechnical = technical;
    initMultiChartLayoutToggle(symbol);
  } catch (e) { console.warn('multi-chart init error', e); }
  // Indicator toggle (only relevant for LightweightCharts fallback)
  document.querySelectorAll('.indicator-toggle').forEach(el => {
    if (el.dataset.tf) return; // timeframe handled separately
    el.addEventListener('click', () => {
      el.classList.toggle('active');
      if (!multiChartActive) renderStockChart(symbol, candles, technical);
    });
  });
  // Timeframe toggle
  document.querySelectorAll('[data-tf]').forEach(el => {
    el.addEventListener('click', () => {
      if (multiChartActive) {
        showToast('Ganti ke layout 1×1 untuk mengubah timeframe', 'info');
        return;
      }
      const tf = el.dataset.tf;
      if (tf === '1H' || tf === '4H') {
        showToast('Data intraday akan tersedia setelah integrasi data real-time IDX', 'info');
        return;
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
  loadPatterns(symbol);

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
  renderFundamentalGrid(fund?.data || detail?.data || {});
  // Also populate fundamental-grid-tab (31.2.1 — Fundamental tab)
  renderFundamentalGridInto(document.getElementById('fundamental-grid-tab'), fund?.data || detail?.data || {});
  // 27.1.1 — Fundamental History Charts (overview sidebar only; tab version lazy-loaded)
  renderFundamentalHistory(symbol);
  // 27.1.2 — Corporate Actions Timeline
  renderCorporateActions(symbol);
  // 28.2.4 — Kalkulator Korporasi (Stock Split / Rights Issue)
  renderKalkulatorKorporasi(symbol);
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

  // 32.2.3 — Saham Serupa (async)
  loadSimilarStocks(symbol);

  
  
  
  
  
  
  

}

const LOCALE_NAMES_ID = {
  doji: 'Doji',
  hammer: 'Hammer',
  inverted_hammer: 'Inverted Hammer',
  bullish_engulfing: 'Bullish Engulfing',
  bearish_engulfing: 'Bearish Engulfing',
  morning_star: 'Morning Star',
  evening_star: 'Evening Star',
  three_white_soldiers: 'Three White Soldiers',
  three_black_crows: 'Three Black Crows',
};

async function loadPatterns(symbol) {
  const container = document.getElementById('pattern-tags');
  if (!container) return;
  try {
    const res = await apiFetch(`/stocks/${encodeURIComponent(symbol)}/patterns`);
    if (!res || res.status !== 'ok' || !Array.isArray(res.patterns) || res.patterns.length === 0) {
      container.classList.add('hidden');
      return;
    }
    container.innerHTML = res.patterns.map(p => {
      const label = LOCALE_NAMES_ID[p.pattern] || p.label || p.pattern;
      const direction = p.direction === 'bullish' ? 'bullish' : p.direction === 'bearish' ? 'bearish' : 'neutral';
      const daysAgo = p.days_ago != null ? p.days_ago : '—';
      return `<span class="pattern-chip pattern-${direction}"><span class="pattern-chip-label">${label}</span><span class="pattern-chip-date">${daysAgo} hari lalu</span></span>`;
    }).join('');
    container.classList.remove('hidden');
  } catch {
    container.classList.add('hidden');
  }
}

function loadPerfChips(candles) {
  const container = document.getElementById('perf-chips');
  if (!container || !candles || candles.length < 20) return;
  const closes = candles.map(c => Number(c.close)).filter(v => v > 0);
  if (closes.length < 20) return;
  const latest = closes[closes.length - 1];
  const offsets = [5, 21, 63];
  const labels = ['1W', '1M', '3M'];
  const chips = offsets.map((offset, i) => {
    const idx = closes.length - 1 - offset;
    if (idx < 0 || idx >= closes.length) return null;
    const old = closes[idx];
    if (!old || old <= 0) return null;
    const perf = ((latest - old) / old) * 100;
    const direction = perf >= 0 ? 'up' : 'down';
    const arrow = perf >= 0 ? '▲' : '▼';
    return `<span class="perf-chip perf-${direction}"><span class="perf-chip-label">${labels[i]}</span><span>${arrow} ${Math.abs(perf).toFixed(1)}%</span></span>`;
  }).filter(Boolean).join('');
  container.innerHTML = chips;
  container.classList.remove('hidden');
}

let currentTimeframe = '1D';

function normalizeCandles(rows){ return rows.map(r => ({ date: r.date || r.time, open:Number(r.open ?? r.close), high:Number(r.high ?? r.close), low:Number(r.low ?? r.close), close:Number(r.close), volume:Number(r.volume || 0), st_value: r.st_value, st_trend: r.st_trend, vwap: r.vwap })).filter(r => r.date && r.close); }

async function loadStockChart(symbol) {
  if (multiChartActive) return; // multi-chart manages its own timeframes
  const container = document.getElementById('tvchart');
  if (!container) return;
  container.innerHTML = '<div class="skeleton skeleton-chart stock-chart-skeleton"></div>';
  document.getElementById('chart-subtitle').textContent = `Memuat data ${currentTimeframe}...`;
  try {
    const chart = await fetchChartData(symbol, currentTimeframe === '1D' ? 160 : currentTimeframe === '1W' ? 300 : currentTimeframe === '1M' ? 400 : 400, currentTimeframe).catch(() => null);
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
    // Load index constituent badges (15.1.5)
    loadIndexBadges(badgesEl, symbol);
  }
  // Price Board (19.5)
  const setPb = (id, val, suffix = '') => {
    const el = document.getElementById(id);
    if (el && val != null) el.textContent = suffix ? `${suffix} ${Number(val).toLocaleString('id-ID', {maximumFractionDigits:0})}` : Number(val).toLocaleString('id-ID', {maximumFractionDigits:0});
  };
  if (candles.length >= 2) {
    const last2 = candles[candles.length-1];
    const prev2 = candles[candles.length-2] || last2;
    setPb('pb-prev-close', prev2.close, 'Rp');
    setPb('pb-open', last2.open, 'Rp');
    setPb('pb-high', last2.high, 'Rp');
    setPb('pb-low', last2.low, 'Rp');
    setPb('pb-volume', last2.volume);
    setPb('pb-value', (last2.close * (last2.volume || 0)), 'Rp');
  }
  // Compute 52w high/low from all candles
  if (candles.length > 20) {
    const highs = candles.map(c => c.high).filter(h => h > 0);
    const lows = candles.map(c => c.low).filter(l => l > 0);
    if (highs.length) setPb('pb-52w-high', Math.max(...highs), 'Rp');
    if (lows.length) setPb('pb-52w-low', Math.min(...lows), 'Rp');
  }
}
/* ─── Theme-aware chart color helpers ─── */
/* ─── Load index constituent badges (15.1.5) ─── */
const INDEX_BADGE_CONFIG = {
  LQ45:     { bg: '#3b82f6', label: 'LQ45' },
  IDX30:    { bg: '#10b981', label: 'IDX30' },
  KOMPAS100:{ bg: '#f59e0b', label: 'K100' },
  IDX80:    { bg: '#8b5cf6', label: 'IDX80' },
  IDXESGL:  { bg: '#22c55e', label: 'ESGL' },
};
async function loadIndexBadges(container, ticker) {
  if (!container || !ticker) return;
  try {
    const res = await fetch(`/api/stocks/${ticker}/indices`);
    const data = await res.json();
    if (data && data.indices && data.indices.length > 0) {
      const badges = data.indices.map(idx => {
        const cfg = INDEX_BADGE_CONFIG[idx.index_name] || { bg: '#666', label: idx.index_name };
        return `<span class="badge index-badge" style="background:${cfg.bg};color:#fff;font-size:10px;margin-left:4px">${cfg.label}</span>`;
      }).join('');
      container.insertAdjacentHTML('beforeend', badges);
    }
  } catch (e) {
    // Silently fail — badges are non-critical
    console.debug('Index badges not available for', ticker);
  }
}
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
  if (multiChartActive) return; // multi-chart handles its own rendering
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

    // EMA overlay (client-side)
    if (active.includes('ema')) {
      const ema12 = calcEMA(data, 12);
      const ema26 = calcEMA(data, 26);
      if (ema12.length) chart.addLineSeries({ color:'#f59e0b', lineWidth:1, priceLineVisible:false, lastValueVisible:false, title:'EMA 12' }).setData(ema12);
      if (ema26.length) chart.addLineSeries({ color:'#ef4444', lineWidth:1, priceLineVisible:false, lastValueVisible:false, title:'EMA 26' }).setData(ema26);
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

    // RSI sub-pane (client-side)
    if (active.includes('rsi')) {
      const rsiData = calcRSI(data, 14);
      if (rsiData.length) {
        const rsiPane = chart.addLineSeries({ color:'#a78bfa', lineWidth:1, priceLineVisible:false, lastValueVisible:true, title:'RSI 14', priceScaleId:'rsi' });
        rsiPane.setData(rsiData);
        chart.priceScale('rsi').applyOptions({ scaleMargins:{ top:0.7, bottom:0 }, visible:true });
        // Overbought/oversold lines
        const obLine = chart.addLineSeries({ color:'rgba(239,68,68,0.3)', lineWidth:1, lineStyle:2, priceLineVisible:false, lastValueVisible:false, priceScaleId:'rsi' });
        obLine.setData(rsiData.map(d => ({ time:d.time, value:70 })));
        const osLine = chart.addLineSeries({ color:'rgba(34,197,94,0.3)', lineWidth:1, lineStyle:2, priceLineVisible:false, lastValueVisible:false, priceScaleId:'rsi' });
        osLine.setData(rsiData.map(d => ({ time:d.time, value:30 })));
      }
    }

    // MACD sub-pane (client-side)
    if (active.includes('macd')) {
      const macd = calcMACD(data, 12, 26, 9);
      if (macd.macd.length) {
        const macdPane = chart.addLineSeries({ color:'#60a5fa', lineWidth:1, priceLineVisible:false, lastValueVisible:true, title:'MACD', priceScaleId:'macd' });
        macdPane.setData(macd.macd);
        const sigPane = chart.addLineSeries({ color:'#f97316', lineWidth:1, priceLineVisible:false, lastValueVisible:true, title:'Signal', priceScaleId:'macd' });
        sigPane.setData(macd.signal);
        const histPane = chart.addHistogramSeries({ color:'rgba(96,165,250,0.3)', priceFormat:{type:'volume'}, priceScaleId:'macd' });
        histPane.setData(macd.histogram.map(d => ({ time:d.time, value:Math.abs(d.value), color:d.value >= 0 ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)' })));
        chart.priceScale('macd').applyOptions({ scaleMargins:{ top:0.7, bottom:0 }, visible:true });
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

    // Adjust scale margins: if sub-panes are active, main chart gets less space
    const hasSubPanes = active.includes('rsi') || active.includes('macd');
    if (!vol && !hasSubPanes) chart.priceScale('').applyOptions({ scaleMargins:{ top:.1, bottom:.1 }});
    if (hasSubPanes) chart.priceScale('').applyOptions({ scaleMargins:{ top:.05, bottom:.3 }});
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

// ─── 31.2.1 Tab helpers ──────────────────────────────────────

// Render fundamental grid into any container (not just #fundamental-grid)
function renderFundamentalGridInto(el, d) {
  if (!el) return;
  const hasData = Boolean(d && (d.trailing_pe || d.per || d.price_to_book || d.pbv || d.roe || d.roa || d.debt_to_equity || d.dividend_yield || d.trailing_eps || d.revenue || d.updated_at));
  if (!hasData) {
    el.innerHTML = '<div class="empty-state-v2" style="grid-column:1/-1"><h3>Data Fundamental Belum Tersedia</h3><p>Data fundamental sedang diperbarui.</p></div>';
    return;
  }
  // Reuse same card-building logic as renderFundamentalGrid
  const trailingPE = d.trailing_pe ?? d.per;
  const forwardPE = d.forward_pe;
  const pbv = d.price_to_book ?? d.pbv;
  const roe = d.roe; const roa = d.roa; const der = d.debt_to_equity;
  const eps = d.trailing_eps; const divYield = d.dividend_yield;
  const marketCap = d.market_cap; const revenue = d.revenue; const netIncome = d.net_income;
  function peS(v) { if(v==null||isNaN(v))return'neutral';if(v<12)return'good';if(v<25)return'neutral';return'bad'; }
  function pbvS(v) { if(v==null||isNaN(v))return'neutral';if(v<1)return'good';if(v<3)return'neutral';return'bad'; }
  function roeS(v) { if(v==null||isNaN(v))return'neutral';if(v>15)return'good';if(v>5)return'neutral';return'bad'; }
  function roaS(v) { if(v==null||isNaN(v))return'neutral';if(v>8)return'good';if(v>2)return'neutral';return'bad'; }
  function derS(v) { if(v==null||isNaN(v))return'neutral';if(v<0.5)return'good';if(v<2)return'neutral';return'bad'; }
  function epsS(v) { if(v==null||isNaN(v))return'neutral';if(v>0)return'good';return'bad'; }
  function dyS(v) { if(v==null||isNaN(v))return'neutral';if(v>3)return'good';if(v>0.5)return'neutral';return'bad'; }
  function card(label,value,sent,sub){
    const cls=sent==='good'?'fundamental-good':sent==='bad'?'fundamental-bad':'fundamental-neutral';
    let html='<div class="fundamental-card '+cls+'"><div class="fundamental-label">'+label+'</div><div class="fundamental-value">'+value+'</div>';
    if(sub)html+='<div class="fundamental-sub">'+sub+'</div>';
    return html+'</div>';
  }
  const cards=[];
  cards.push(card('P/E (Trailing)',trailingPE!=null?nf(trailingPE,1)+'x':'—',peS(trailingPE),trailingPE!=null?(trailingPE<12?'Murah':trailingPE<25?'Wajar':'Premium'):''));
  if(forwardPE!=null)cards.push(card('P/E (Forward)',nf(forwardPE,1)+'x',peS(forwardPE),forwardPE<12?'Murah':forwardPE<25?'Wajar':'Premium'));
  cards.push(card('PBV',pbv!=null?nf(pbv,2)+'x':'—',pbvS(pbv),pbv!=null?(pbv<1?'Di bawah BV':pbv<3?'Wajar':'Premium'):''));
  cards.push(card('ROE',roe!=null?pf(roe):'—',roeS(roe),roe!=null?(roe>15?'Efisien':roe>5?'Cukup':'Rendah'):''));
  cards.push(card('ROA',roa!=null?pf(roa):'—',roaS(roa),roa!=null?(roa>8?'Produktif':roa>2?'Cukup':'Rendah'):''));
  cards.push(card('DER',der!=null?nf(der,2):'—',derS(der),der!=null?(der<0.5?'Rendah':der<2?'Sedang':'Tinggi'):''));
  cards.push(card('EPS',eps!=null?money(eps):'—',epsS(eps),eps!=null?(eps>0?'Positif':'Negatif'):''));
  cards.push(card('Dividend Yield',divYield!=null?pf(divYield):'—',dyS(divYield),divYield!=null?(divYield>3?'Tinggi':divYield>0.5?'Sedang':'Rendah'):''));
  if(marketCap!=null)cards.push(card('Market Cap',fmtRp(marketCap),'neutral',''));
  if(revenue!=null)cards.push(card('Revenue',fmtRp(revenue),'neutral',''));
  if(netIncome!=null)cards.push(card('Net Income',fmtRp(netIncome),netIncome>=0?'good':'bad',netIncome>=0?'Profit':'Rugi'));
  el.innerHTML = cards.join('');
}

// Render fundamental history charts into an arbitrary container
function renderFundamentalHistoryInto(symbol, container) {
  if (!container) return;
  // Reuse the same logic as renderFundamentalHistory but target the given container
  apiFetch(`/stocks/${encodeURIComponent(symbol)}/fundamental/history`).then(res => {
    if (!res || !res.price_data || !res.price_data.length) {
      container.innerHTML = '<div class="empty-state-v2"><h3>Belum ada data</h3><p>Data riwayat fundamental belum tersedia.</p></div>';
      return;
    }
    const hasFinancial = res.has_financial_data && (
      (res.ratios?.pe?.length > 0) || (res.ratios?.pbv?.length > 0) || (res.ratios?.roe?.length > 0)
    );
    let html = '';
    if (hasFinancial) {
      html += '<div class="fund-chart-toggles flex gap-1 mb-2 flex-wrap">';
      [{ key:'pe', label:'P/E', active:true }, { key:'pbv', label:'P/BV', active:false }, { key:'roe', label:'ROE (%)', active:false }].forEach(r => {
        const hasData = res.ratios[r.key]?.length > 0;
        html += `<button type="button" class="btn btn-sm fund-chart-toggle-tab ${r.active ? 'active' : ''}" data-ratio="${r.key}" ${!hasData ? 'disabled' : ''}>${r.label}</button>`;
      });
      html += '</div><div class="fund-chart-container" style="position:relative;height:200px;margin-bottom:12px"><canvas id="fund-ratio-chart-tab"></canvas></div>';
    }
    html += '<div class="fund-chart-container" style="position:relative;height:160px;margin-bottom:8px"><canvas id="fund-price-chart-tab"></canvas></div>';
    container.innerHTML = html;

    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    const cs = getComputedStyle(document.documentElement);
    const textColor = cs.getPropertyValue('--text-muted').trim() || '#94a3b8';
    const gridColor = theme === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)';
    const primaryColor = cs.getPropertyValue('--primary-color').trim() || '#10b981';
    const accentColor = cs.getPropertyValue('--accent-indigo').trim() || '#6366f1';
    const upColor = cs.getPropertyValue('--up-color').trim() || '#34d399';
    const downColor = cs.getPropertyValue('--down-color').trim() || '#f87171';

    if (hasFinancial) {
      const ctx = document.getElementById('fund-ratio-chart-tab');
      if (ctx && typeof Chart !== 'undefined') {
        const activeData = res.ratios['pe'] || [];
        const chart = new Chart(ctx, {
          type: 'line',
          data: { labels: activeData.map(d => d.date.slice(0,7)), datasets: [{ label:'P/E', data: activeData.map(d => d.value), borderColor: primaryColor, backgroundColor: primaryColor+'22', fill:true, tension:0.3, pointRadius:3, borderWidth:2 }] },
          options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false}, tooltip:{ backgroundColor: cs.getPropertyValue('--bg-panel').trim()||'#1e293b', titleColor:textColor, bodyColor:textColor, cornerRadius:8, padding:10 } }, scales:{ x:{ ticks:{color:textColor,maxTicksLimit:6,font:{size:10}}, grid:{color:gridColor} }, y:{ ticks:{color:textColor,font:{size:10}}, grid:{color:gridColor} } } },
        });
        fundamentalHistoryCharts.push(chart);
        container.querySelectorAll('.fund-chart-toggle-tab').forEach(btn => {
          btn.addEventListener('click', function() {
            container.querySelectorAll('.fund-chart-toggle-tab').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const ratioKey = this.dataset.ratio;
            const ratioData = res.ratios[ratioKey] || [];
            const colorMap = { pe: primaryColor, pbv: accentColor, roe: upColor };
            chart.data.labels = ratioData.map(d => d.date.slice(0,7));
            chart.data.datasets[0].data = ratioData.map(d => d.value);
            chart.data.datasets[0].label = { pe:'P/E', pbv:'P/BV', roe:'ROE (%)' }[ratioKey] || ratioKey;
            chart.data.datasets[0].borderColor = colorMap[ratioKey] || primaryColor;
            chart.data.datasets[0].backgroundColor = (colorMap[ratioKey] || primaryColor) + '22';
            chart.update();
          });
        });
      }
    }
    const priceCtx = document.getElementById('fund-price-chart-tab');
    if (priceCtx && typeof Chart !== 'undefined') {
      const step = Math.max(1, Math.floor(res.price_data.length / 120));
      const sampled = res.price_data.filter((_, i) => i % step === 0 || i === res.price_data.length - 1);
      const closes = sampled.map(d => d.close);
      const volumes = sampled.map(d => d.volume);
      const volMax = Math.max(...volumes, 1);
      const priceChart = new Chart(priceCtx, {
        type: 'line',
        data: { labels: sampled.map(d => d.date.slice(0,10)), datasets: [
          { label:'Harga', data:closes, borderColor:primaryColor, backgroundColor:'transparent', tension:0.2, pointRadius:0, borderWidth:2, order:1 },
          { label:'SMA 20', data:sampled.map(d=>d.sma20), borderColor:'#f59e0b', backgroundColor:'transparent', tension:0.2, pointRadius:0, borderWidth:1, borderDash:[4,4], order:1 },
          { label:'SMA 50', data:sampled.map(d=>d.sma50), borderColor:accentColor, backgroundColor:'transparent', tension:0.2, pointRadius:0, borderWidth:1, borderDash:[4,4], order:1 },
          { label:'Volume', data:volumes.map((v,i)=>(v/volMax)*(closes.length?Math.max(...closes)*0.3:1000)), backgroundColor:volumes.map((v,i)=>(closes[i]||0)>=(i>0?closes[i-1]||0:0)?upColor+'44':downColor+'44'), borderColor:'transparent', pointRadius:0, type:'bar', order:2, yAxisID:'y1' },
        ] },
        options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:true,labels:{color:textColor,font:{size:10},boxWidth:12,padding:8},position:'top'}, tooltip:{backgroundColor:cs.getPropertyValue('--bg-panel').trim()||'#1e293b',titleColor:textColor,bodyColor:textColor,cornerRadius:8,padding:10,mode:'index',intersect:false} }, scales:{ x:{ticks:{color:textColor,maxTicksLimit:8,font:{size:9}},grid:{color:gridColor}}, y:{position:'left',ticks:{color:textColor,font:{size:9},callback:v=>'Rp'+v.toLocaleString('id-ID')},grid:{color:gridColor}}, y1:{display:false,position:'right',grid:{display:false}} } },
      });
      fundamentalHistoryCharts.push(priceChart);
    }
  }).catch(() => {
    container.innerHTML = '<div class="empty-state-v2"><h3>Gagal memuat data</h3></div>';
  });
}

// Render a LightweightCharts candlestick into any container element
function _renderChartInto(container, symbol, candles, timeframe) {
  if (!container) return;
  container.innerHTML = '';
  const theme = document.documentElement.getAttribute('data-theme') || 'dark';
  const isLight = theme === 'light';
  const cs = getComputedStyle(document.documentElement);
  const textDim = cs.getPropertyValue('--text-dim').trim() || (isLight ? '#64748b' : '#94a3b8');
  const gridColor = isLight ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.035)';
  const c = getThemeColors();

  // Try TradingView first
  if (typeof TradingView !== 'undefined' && container.clientWidth > 0) {
    try {
      const tvSymbol = `IDX:${symbol}`;
      const tfMap = { '1D':'D', '1W':'W', '1M':'M' };
      new TradingView.widget({
        container_id: container.id,
        autosize: true,
        symbol: tvSymbol,
        interval: tfMap[timeframe] || 'D',
        timezone: 'Asia/Jakarta',
        theme: isLight ? 'Light' : 'dark',
        style: '1',
        locale: 'id_ID',
        enable_publishing: false,
        allow_symbol_change: false,
        hide_top_toolbar: false,
        save_image: false,
        disabled_features: ['use_localstorage_for_settings','header_symbol_search','header_compare','header_undo_redo','header_screenshot'],
      });
      return;
    } catch(e) { /* fall through */ }
  }

  // Fallback: LightweightCharts
  if (typeof LightweightCharts === 'undefined') {
    container.innerHTML = '<div class="empty-state-v2"><p>Chart library tidak tersedia</p></div>';
    return;
  }
  const data = candles.slice(-160);
  const chart = LightweightCharts.createChart(container, {
    width: container.clientWidth, height: container.clientHeight || 480,
    layout: { textColor: textDim, background: { type:'solid', color:'transparent' } },
    grid: { vertLines:{ color:gridColor }, horzLines:{ color:gridColor } },
    rightPriceScale: { borderVisible:false },
    timeScale: { borderVisible:false },
  });
  const cs2 = chart.addCandlestickSeries({ upColor:c.primary, downColor:c.down, borderVisible:false, wickUpColor:c.primary, wickDownColor:c.down });
  cs2.setData(data.map(d => ({ time:String(d.date).slice(0,10), open:d.open, high:d.high, low:d.low, close:d.close })));
  const vol = chart.addHistogramSeries({ priceFormat:{type:'volume'}, priceScaleId:'', color:'rgba(148,163,184,0.2)' });
  vol.setData(data.map(d => ({ time:String(d.date).slice(0,10), value:d.volume||0, color:d.close>=d.open?'rgba(16,185,129,0.25)':'rgba(248,113,113,0.25)' })));
  chart.priceScale('').applyOptions({ scaleMargins:{ top:.82, bottom:0 } });
  chart.timeScale().fitContent();
  new ResizeObserver(() => chart.applyOptions({ width:container.clientWidth, height:container.clientHeight||480 })).observe(container);
}

function renderFundamentalGrid(d) {
  const el = document.getElementById('fundamental-grid');
  if (!el) return;
  const hasData = Boolean(d && (d.trailing_pe || d.per || d.price_to_book || d.pbv || d.roe || d.roa || d.debt_to_equity || d.dividend_yield || d.trailing_eps || d.revenue || d.updated_at));
  if (!hasData) {
    el.innerHTML = '<div class="empty-state-v2" style="grid-column:1/-1"><h3>Data Fundamental Belum Tersedia</h3><p>Data fundamental sedang diperbarui. Silakan coba lagi nanti.</p></div>';
    return;
  }
  const trailingPE = d.trailing_pe ?? d.per;
  const forwardPE = d.forward_pe;
  const pbv = d.price_to_book ?? d.pbv;
  const roe = d.roe;
  const roa = d.roa;
  const der = d.debt_to_equity;
  const eps = d.trailing_eps;
  const divYield = d.dividend_yield;
  const marketCap = d.market_cap;
  const revenue = d.revenue;
  const netIncome = d.net_income;
  function peS(v) { if(v==null||isNaN(v))return'neutral';if(v<12)return'good';if(v<25)return'neutral';return'bad'; }
  function pbvS(v) { if(v==null||isNaN(v))return'neutral';if(v<1)return'good';if(v<3)return'neutral';return'bad'; }
  function roeS(v) { if(v==null||isNaN(v))return'neutral';if(v>15)return'good';if(v>5)return'neutral';return'bad'; }
  function roaS(v) { if(v==null||isNaN(v))return'neutral';if(v>8)return'good';if(v>2)return'neutral';return'bad'; }
  function derS(v) { if(v==null||isNaN(v))return'neutral';if(v<0.5)return'good';if(v<2)return'neutral';return'bad'; }
  function epsS(v) { if(v==null||isNaN(v))return'neutral';if(v>0)return'good';return'bad'; }
  function dyS(v) { if(v==null||isNaN(v))return'neutral';if(v>3)return'good';if(v>0.5)return'neutral';return'bad'; }
  function card(label,value,sent,sub){
    const cls=sent==='good'?'fundamental-good':sent==='bad'?'fundamental-bad':'fundamental-neutral';
    let html='<div class="fundamental-card '+cls+'"><div class="fundamental-label">'+label+'</div><div class="fundamental-value">'+value+'</div>';
    if(sub)html+='<div class="fundamental-sub">'+sub+'</div>';
    return html+'</div>';
  }
  const cards=[];
  cards.push(card('P/E (Trailing)',trailingPE!=null?nf(trailingPE,1)+'x':'—',peS(trailingPE),trailingPE!=null?(trailingPE<12?'Murah':trailingPE<25?'Wajar':'Premium'):''));
  if(forwardPE!=null)cards.push(card('P/E (Forward)',nf(forwardPE,1)+'x',peS(forwardPE),forwardPE<12?'Murah':forwardPE<25?'Wajar':'Premium'));
  cards.push(card('PBV',pbv!=null?nf(pbv,2)+'x':'—',pbvS(pbv),pbv!=null?(pbv<1?'Di bawah BV':pbv<3?'Wajar':'Premium'):''));
  cards.push(card('ROE',roe!=null?pf(roe):'—',roeS(roe),roe!=null?(roe>15?'Efisien':roe>5?'Cukup':'Rendah'):''));
  cards.push(card('ROA',roa!=null?pf(roa):'—',roaS(roa),roa!=null?(roa>8?'Produktif':roa>2?'Cukup':'Rendah'):''));
  cards.push(card('DER',der!=null?nf(der,2):'—',derS(der),der!=null?(der<0.5?'Rendah':der<2?'Sedang':'Tinggi'):''));
  cards.push(card('EPS',eps!=null?money(eps):'—',epsS(eps),eps!=null?(eps>0?'Positif':'Negatif'):''));
  cards.push(card('Dividend Yield',divYield!=null?pf(divYield):'—',dyS(divYield),divYield!=null?(divYield>3?'Tinggi':divYield>0.5?'Sedang':'Rendah'):''));
  if(marketCap!=null)cards.push(card('Market Cap',fmtRp(marketCap),'neutral',''));
  if(revenue!=null)cards.push(card('Revenue',fmtRp(revenue),'neutral',''));
  if(netIncome!=null)cards.push(card('Net Income',fmtRp(netIncome),netIncome>=0?'good':'bad',netIncome>=0?'Profit':'Rugi'));
  el.innerHTML = cards.join('');
}

// ─── 27.1.1 — Fundamental History Charts ────────────────────

let fundamentalHistoryCharts = [];

function renderFundamentalHistory(symbol) {
  const container = document.getElementById('fundamental-history');
  if (!container) return;

  apiFetch(`/stocks/${encodeURIComponent(symbol)}/fundamental/history`).then(res => {
    if (!res || !res.price_data || !res.price_data.length) {
      container.innerHTML = '<div class="empty-state-v2"><h3>Belum ada data</h3><p>Data riwayat fundamental belum tersedia untuk saham ini.</p></div>';
      return;
    }

    const hasFinancial = res.has_financial_data && (
      (res.ratios?.pe?.length > 0) ||
      (res.ratios?.pbv?.length > 0) ||
      (res.ratios?.roe?.length > 0)
    );

    // Build charts HTML
    let html = '';

    // Ratio charts (only if financial data available)
    if (hasFinancial) {
      html += '<div class="fund-chart-toggles flex gap-1 mb-2 flex-wrap">';
      const ratioTypes = [
        { key: 'pe', label: 'P/E', active: true },
        { key: 'pbv', label: 'P/BV', active: false },
        { key: 'roe', label: 'ROE (%)', active: false },
      ];
      ratioTypes.forEach(r => {
        const hasData = res.ratios[r.key]?.length > 0;
        html += `<button type="button" class="btn btn-sm fund-chart-toggle ${r.active ? 'active' : ''}" data-ratio="${r.key}" ${!hasData ? 'disabled' : ''}>${r.label} ${!hasData ? '<small style="opacity:0.5">—</small>' : ''}</button>`;
      });
      html += '</div>';
      html += '<div class="fund-chart-container" style="position:relative;height:200px;margin-bottom:12px"><canvas id="fund-ratio-chart"></canvas></div>';
    }

    // Price & Volume chart (always show)
    html += '<div class="fund-chart-container" style="position:relative;height:160px;margin-bottom:8px"><canvas id="fund-price-chart"></canvas></div>';

    container.innerHTML = html;

    // Destroy previous Chart.js instances
    fundamentalHistoryCharts.forEach(c => { try { c.destroy(); } catch(e) {} });
    fundamentalHistoryCharts = [];

    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    const cs = getComputedStyle(document.documentElement);
    const textColor = cs.getPropertyValue('--text-muted').trim() || '#94a3b8';
    const gridColor = theme === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)';
    const upColor = cs.getPropertyValue('--up-color').trim() || '#34d399';
    const downColor = cs.getPropertyValue('--down-color').trim() || '#f87171';
    const primaryColor = cs.getPropertyValue('--primary-color').trim() || '#10b981';
    const accentColor = cs.getPropertyValue('--accent-indigo').trim() || '#6366f1';

    // Ratio chart
    if (hasFinancial) {
      const ctx = document.getElementById('fund-ratio-chart');
      if (ctx && typeof Chart !== 'undefined') {
        const activeRatio = 'pe';
        const activeData = res.ratios[activeRatio] || [];
        const labels = activeData.map(d => d.date.slice(0, 7));
        const values = activeData.map(d => d.value);

        const chart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [{
              label: 'P/E',
              data: values,
              borderColor: primaryColor,
              backgroundColor: primaryColor + '22',
              fill: true,
              tension: 0.3,
              pointRadius: 3,
              pointHitRadius: 10,
              borderWidth: 2,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: cs.getPropertyValue('--bg-panel').trim() || '#1e293b',
                titleColor: textColor,
                bodyColor: textColor,
                borderColor: gridColor,
                borderWidth: 1,
                cornerRadius: 8,
                padding: 10,
                callbacks: {
                  label: function(ctx) {
                    const val = ctx.parsed.y;
                    const label = ctx.dataset.label;
                    return `${label}: ${val != null ? val.toFixed(2) : '—'}x`;
                  },
                },
              },
            },
            scales: {
              x: {
                display: true,
                ticks: { color: textColor, maxTicksLimit: 6, font: { size: 10 } },
                grid: { color: gridColor },
              },
              y: {
                display: true,
                ticks: { color: textColor, font: { size: 10 } },
                grid: { color: gridColor },
              },
            },
            interaction: {
              intersect: false,
              mode: 'index',
            },
          },
        });
        fundamentalHistoryCharts.push(chart);

        // Toggle between ratio views
        container.querySelectorAll('.fund-chart-toggle').forEach(btn => {
          btn.addEventListener('click', function() {
            container.querySelectorAll('.fund-chart-toggle').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const ratioKey = this.dataset.ratio;
            const ratioData = res.ratios[ratioKey] || [];
            const newLabels = ratioData.map(d => d.date.slice(0, 7));
            const newValues = ratioData.map(d => d.value);
            const labelMap = { pe: 'P/E', pbv: 'P/BV', roe: 'ROE (%)' };
            const colorMap = { pe: primaryColor, pbv: accentColor, roe: upColor };
            chart.data.labels = newLabels;
            chart.data.datasets[0].data = newValues;
            chart.data.datasets[0].label = labelMap[ratioKey] || ratioKey;
            chart.data.datasets[0].borderColor = colorMap[ratioKey] || primaryColor;
            chart.data.datasets[0].backgroundColor = (colorMap[ratioKey] || primaryColor) + '22';
            chart.update();
          });
        });
      }
    }

    // Price chart (close + SMA20 + SMA50)
    const priceCtx = document.getElementById('fund-price-chart');
    if (priceCtx && typeof Chart !== 'undefined') {
      // Sample price data to ~120 points for performance
      const step = Math.max(1, Math.floor(res.price_data.length / 120));
      const sampled = res.price_data.filter((_, i) => i % step === 0 || i === res.price_data.length - 1);
      const pLabels = sampled.map(d => d.date.slice(0, 10));
      const closes = sampled.map(d => d.close);
      const sma20Data = sampled.map(d => d.sma20);
      const sma50Data = sampled.map(d => d.sma50);

      // Volume as bar overlay
      const volumes = sampled.map(d => d.volume);
      const volMax = Math.max(...volumes, 1);

      const priceChart = new Chart(priceCtx, {
        type: 'line',
        data: {
          labels: pLabels,
          datasets: [
            {
              label: 'Harga',
              data: closes,
              borderColor: primaryColor,
              backgroundColor: 'transparent',
              tension: 0.2,
              pointRadius: 0,
              borderWidth: 2,
              order: 1,
            },
            {
              label: 'SMA 20',
              data: sma20Data,
              borderColor: '#f59e0b',
              backgroundColor: 'transparent',
              tension: 0.2,
              pointRadius: 0,
              borderWidth: 1,
              borderDash: [4, 4],
              order: 1,
            },
            {
              label: 'SMA 50',
              data: sma50Data,
              borderColor: accentColor,
              backgroundColor: 'transparent',
              tension: 0.2,
              pointRadius: 0,
              borderWidth: 1,
              borderDash: [4, 4],
              order: 1,
            },
            {
              label: 'Volume',
              data: volumes.map(v => (v / volMax) * (closes.length ? Math.max(...closes) * 0.3 : 1000)),
              backgroundColor: volumes.map((v, i) => (closes[i] || 0) >= (i > 0 ? closes[i-1] || 0 : 0) ? upColor + '44' : downColor + '44'),
              borderColor: 'transparent',
              pointRadius: 0,
              type: 'bar',
              order: 2,
              yAxisID: 'y1',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              labels: {
                color: textColor,
                font: { size: 10 },
                boxWidth: 12,
                padding: 8,
              },
              position: 'top',
            },
            tooltip: {
              backgroundColor: cs.getPropertyValue('--bg-panel').trim() || '#1e293b',
              titleColor: textColor,
              bodyColor: textColor,
              borderColor: gridColor,
              borderWidth: 1,
              cornerRadius: 8,
              padding: 10,
              mode: 'index',
              intersect: false,
            },
          },
          scales: {
            x: {
              display: true,
              ticks: { color: textColor, maxTicksLimit: 8, font: { size: 9 } },
              grid: { color: gridColor },
            },
            y: {
              display: true,
              position: 'left',
              ticks: {
                color: textColor,
                font: { size: 9 },
                callback: function(val) { return 'Rp' + val.toLocaleString('id-ID'); },
              },
              grid: { color: gridColor },
            },
            y1: {
              display: false,
              position: 'right',
              grid: { display: false },
            },
          },
          interaction: {
            intersect: false,
            mode: 'index',
          },
        },
      });
      fundamentalHistoryCharts.push(priceChart);
    }
  }).catch(e => {
    console.warn('Fundamental history fetch failed:', e);
    container.innerHTML = '<div class="empty-state-v2"><h3>Gagal memuat data</h3><p>Riwayat fundamental tidak dapat dimuat saat ini.</p></div>';
  });
}

// ─── 28.2.4 — Kalkulator Korporasi (Stock Split / Rights Issue) ───
function renderKalkulatorKorporasi(symbol) {
  // Inject container after corporate-actions-timeline card if not already present
  if (document.getElementById('kalkulator-korporasi-card')) return;

  const caContainer = document.getElementById('corporate-actions-timeline');
  if (!caContainer) return;
  const insertAfter = caContainer.closest('.panel, .card, [class*="card"]') || caContainer.parentElement;
  if (!insertAfter) return;

  const card = document.createElement('div');
  card.id = 'kalkulator-korporasi-card';
  card.className = 'panel';
  card.style.cssText = 'margin-top:12px;border-radius:12px;overflow:hidden';

  card.innerHTML = `
    <div id="kalkorp-toggle" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;cursor:pointer;user-select:none">
      <span class="text-xs uppercase text-dim strong" style="letter-spacing:.06em">🧮 Kalkulator Korporasi</span>
      <span id="kalkorp-chevron" style="font-size:12px;transition:transform .2s">▼</span>
    </div>
    <div id="kalkorp-body" style="display:none;padding:0 16px 16px">
      <!-- Tab buttons -->
      <div style="display:flex;gap:6px;margin-bottom:14px">
        <button id="kalkorp-tab-split" class="btn btn-primary btn-sm" style="font-size:11px">Stock Split</button>
        <button id="kalkorp-tab-rights" class="btn btn-sm" style="font-size:11px">Rights Issue</button>
      </div>

      <!-- Stock Split panel -->
      <div id="kalkorp-panel-split">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
          <div>
            <label class="text-xs text-dim block mb-1">Lot Dimiliki</label>
            <input id="split-lots" type="number" class="modal-input" value="10" min="1" step="1" style="width:100%">
          </div>
          <div>
            <label class="text-xs text-dim block mb-1">Harga Beli (Rp)</label>
            <input id="split-price" type="number" class="modal-input" value="1000" min="1" step="50" style="width:100%">
          </div>
          <div>
            <label class="text-xs text-dim block mb-1">Rasio Split (misal 2 = 1:2)</label>
            <input id="split-ratio" type="number" class="modal-input" value="2" min="1" step="1" style="width:100%">
          </div>
        </div>
        <button id="split-calc-btn" class="btn btn-primary btn-sm" style="font-size:11px;margin-bottom:10px">Hitung</button>
        <div id="split-result" style="display:none;background:var(--bg-panel,#1e293b);border-radius:8px;padding:10px 12px">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
            <div class="text-center">
              <div class="text-xs text-dim mb-1">Lot Baru</div>
              <strong id="split-out-lots" class="mono text-up" style="font-size:15px">—</strong>
            </div>
            <div class="text-center">
              <div class="text-xs text-dim mb-1">Harga Baru</div>
              <strong id="split-out-price" class="mono" style="font-size:15px">—</strong>
            </div>
            <div class="text-center">
              <div class="text-xs text-dim mb-1">Nilai Total</div>
              <strong id="split-out-value" class="mono" style="font-size:15px">—</strong>
            </div>
          </div>
          <div class="text-xs text-dim mt-2" style="text-align:center">Nilai portofolio tidak berubah setelah split.</div>
        </div>
      </div>

      <!-- Rights Issue panel -->
      <div id="kalkorp-panel-rights" style="display:none">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
          <div>
            <label class="text-xs text-dim block mb-1">Lot Dimiliki</label>
            <input id="rights-lots" type="number" class="modal-input" value="10" min="1" step="1" style="width:100%">
          </div>
          <div>
            <label class="text-xs text-dim block mb-1">Harga Rights (Rp)</label>
            <input id="rights-price" type="number" class="modal-input" value="500" min="1" step="50" style="width:100%">
          </div>
          <div>
            <label class="text-xs text-dim block mb-1">Rasio 1:N (isi N)</label>
            <input id="rights-ratio" type="number" class="modal-input" value="5" min="1" step="1" style="width:100%">
          </div>
          <div>
            <label class="text-xs text-dim block mb-1">Harga Pasar Saat Ini (Rp)</label>
            <input id="rights-market" type="number" class="modal-input" value="1000" min="1" step="50" style="width:100%">
          </div>
        </div>
        <button id="rights-calc-btn" class="btn btn-primary btn-sm" style="font-size:11px;margin-bottom:10px">Hitung</button>
        <div id="rights-result" style="display:none;background:var(--bg-panel,#1e293b);border-radius:8px;padding:10px 12px">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
            <div class="text-center">
              <div class="text-xs text-dim mb-1">Lot Rights</div>
              <strong id="rights-out-lots" class="mono text-up" style="font-size:15px">—</strong>
            </div>
            <div class="text-center">
              <div class="text-xs text-dim mb-1">Biaya Exercise</div>
              <strong id="rights-out-cost" class="mono" style="font-size:15px">—</strong>
            </div>
            <div class="text-center">
              <div class="text-xs text-dim mb-1">Dilusi %</div>
              <strong id="rights-out-dilution" class="mono text-down" style="font-size:15px">—</strong>
            </div>
          </div>
          <div id="rights-out-note" class="text-xs text-dim mt-2" style="text-align:center"></div>
        </div>
      </div>
    </div>`;

  insertAfter.parentNode.insertBefore(card, insertAfter.nextSibling);

  // ── Collapsible toggle ──
  const toggle = card.querySelector('#kalkorp-toggle');
  const body   = card.querySelector('#kalkorp-body');
  const chev   = card.querySelector('#kalkorp-chevron');
  toggle.addEventListener('click', () => {
    const open = body.style.display !== 'none';
    body.style.display = open ? 'none' : 'block';
    chev.style.transform = open ? '' : 'rotate(180deg)';
  });

  // ── Tab switching ──
  const tabSplit  = card.querySelector('#kalkorp-tab-split');
  const tabRights = card.querySelector('#kalkorp-tab-rights');
  const panelSplit  = card.querySelector('#kalkorp-panel-split');
  const panelRights = card.querySelector('#kalkorp-panel-rights');

  tabSplit.addEventListener('click', () => {
    tabSplit.classList.add('btn-primary');
    tabRights.classList.remove('btn-primary');
    panelSplit.style.display = '';
    panelRights.style.display = 'none';
  });
  tabRights.addEventListener('click', () => {
    tabRights.classList.add('btn-primary');
    tabSplit.classList.remove('btn-primary');
    panelRights.style.display = '';
    panelSplit.style.display = 'none';
  });

  // ── Stock Split calculator ──
  card.querySelector('#split-calc-btn').addEventListener('click', () => {
    const lots  = parseFloat(card.querySelector('#split-lots').value)  || 0;
    const price = parseFloat(card.querySelector('#split-price').value) || 0;
    const ratio = parseFloat(card.querySelector('#split-ratio').value) || 1;

    if (lots <= 0 || price <= 0 || ratio < 1) return;

    const newLots  = lots * ratio;
    const newPrice = price / ratio;
    const totalVal = lots * 100 * price; // unchanged

    card.querySelector('#split-out-lots').textContent  = nf(newLots, 0) + ' lot';
    card.querySelector('#split-out-price').textContent = money(newPrice);
    card.querySelector('#split-out-value').textContent = money(totalVal);
    card.querySelector('#split-result').style.display  = '';
  });

  // ── Rights Issue calculator ──
  card.querySelector('#rights-calc-btn').addEventListener('click', () => {
    const lots        = parseFloat(card.querySelector('#rights-lots').value)   || 0;
    const rightsPrice = parseFloat(card.querySelector('#rights-price').value)  || 0;
    const ratio       = parseFloat(card.querySelector('#rights-ratio').value)  || 1; // 1:N → N
    const marketPrice = parseFloat(card.querySelector('#rights-market').value) || 0;

    if (lots <= 0 || rightsPrice <= 0 || ratio < 1) return;

    const shares      = lots * 100;
    // Rights received = shares / ratio (1 right per N existing shares)
    const rightsShares = Math.floor(shares / ratio);
    const rightsLots   = rightsShares / 100;
    const exerciseCost = rightsShares * rightsPrice;

    // Dilution % = new shares / (existing + new shares) * 100
    const dilutionPct = rightsShares > 0
      ? (rightsShares / (shares + rightsShares)) * 100
      : 0;

    // Theoretical ex-rights price (TERP)
    const terp = marketPrice > 0
      ? ((shares * marketPrice) + (rightsShares * rightsPrice)) / (shares + rightsShares)
      : 0;

    card.querySelector('#rights-out-lots').textContent     = nf(rightsLots, 2) + ' lot';
    card.querySelector('#rights-out-cost').textContent     = money(exerciseCost);
    card.querySelector('#rights-out-dilution').textContent = pf(dilutionPct);
    card.querySelector('#rights-out-note').textContent     = terp > 0
      ? `TERP (harga teoritis ex-rights): ${money(terp)}`
      : 'Isi harga pasar untuk menghitung TERP.';
    card.querySelector('#rights-result').style.display = '';
  });
}

// ─── 27.1.2 — Corporate Actions Timeline ────────────────────

function renderCorporateActions(symbol) {
  const container = document.getElementById('corporate-actions-timeline');
  if (!container) return;

  apiFetch(`/stocks/${encodeURIComponent(symbol)}/corporate-actions`).then(res => {
    const events = res?.data || [];
    if (!events.length) {
      container.innerHTML = '<div class="empty-state-v2" style="padding:12px"><h3>Belum ada data</h3><p>Belum ada aksi korporasi tercatat untuk saham ini.</p></div>';
      return;
    }

    // Color mapping for event types
    const typeColors = {
      dividend: '#34d399',
      split: '#3b82f6',
      rights: '#8b5cf6',
      ipo: '#f59e0b',
      earnings: '#6366f1',
      corporate: '#f97316',
    };

    const typeLabels = {
      dividend: 'Dividen',
      split: 'Stock Split',
      rights: 'HMETD',
      ipo: 'IPO',
      earnings: 'Laporan Keuangan',
      corporate: 'Aksi Korporasi',
    };

    const html = `<div class="ca-timeline">${events.slice(0, 20).map(ev => {
      const color = typeColors[ev.type] || '#64748b';
      const label = typeLabels[ev.type] || ev.type;
      const dateStr = ev.date ? ev.date.slice(0, 10) : '';
      const desc = ev.description ? ev.description.slice(0, 120) : '';
      return `<div class="ca-item" onclick="this.classList.toggle('ca-expanded')" style="cursor:pointer">
        <div class="ca-item-dot" style="background:${color}">
          <span class="ca-dot-inner" style="background:${color}"></span>
        </div>
        <div class="ca-item-content">
          <div class="ca-item-header">
            <span class="ca-item-type" style="color:${color}">${label}</span>
            <span class="ca-item-date">${dateStr}</span>
          </div>
          <div class="ca-item-title">${ev.title || ''}</div>
          ${desc ? `<div class="ca-item-desc">${desc}</div>` : ''}
        </div>
      </div>`;
    }).join('')}</div>
    ${events.length > 20 ? `<div class="text-xs text-dim mt-2 text-center">+ ${events.length - 20} event lainnya</div>` : ''}`;

    container.innerHTML = html;
  }).catch(e => {
    console.warn('Corporate actions fetch failed:', e);
    container.innerHTML = '<div class="empty-state-v2" style="padding:12px"><h3>Gagal memuat data</h3><p>Aksi korporasi tidak dapat dimuat saat ini.</p></div>';
  });
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
    statTile('P/BV', pbLabel, hasFundamental ? 'valuasi' : '', d.price_to_book ? (d.price_to_book > 3 ? 'metric-bad' : d.price_to_book < 1 ? 'metric-good' : 'metric-neutral') : ''),
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

// ─── 32.2.3 — Saham Serupa ──────────────────────
async function loadSimilarStocks(symbol) {
  const listEl = document.getElementById('similar-stocks-list');
  const sectorEl = document.getElementById('similar-stocks-sector');
  if (!listEl) return;
  try {
    const res = await apiFetch(`/stocks/${encodeURIComponent(symbol)}/similar?limit=5`);
    if (!res || !res.data || !res.data.length) {
      listEl.innerHTML = '<span class="text-xs text-dim">Tidak ada saham serupa ditemukan.</span>';
      return;
    }
    if (sectorEl && res.sector) sectorEl.textContent = res.sector;
    listEl.innerHTML = res.data.map(s => {
      const chg = s.change_pct ?? 0;
      const chgCls = chg > 0 ? 'text-up' : chg < 0 ? 'text-down' : 'text-dim';
      const arrow = chg > 0 ? '▲' : chg < 0 ? '▼' : '—';
      return `<a href="#stock/${s.ticker}" style="display:flex;flex-direction:column;gap:4px;min-width:110px;max-width:130px;flex-shrink:0;padding:10px 12px;border-radius:8px;background:var(--panel-bg, var(--bg-secondary));border:1px solid var(--border-color);text-decoration:none;cursor:pointer;transition:border-color .15s" class="similar-stock-card">
        <span style="font-size:13px;font-weight:700;color:var(--text-main)">${s.ticker}</span>
        <span style="font-size:11px;color:var(--text-dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:106px">${(s.name || s.ticker).slice(0, 16)}</span>
        <span style="font-size:12px;font-weight:600;color:var(--text-main)">${s.close != null ? nf(s.close, 0) : '—'}</span>
        <span style="font-size:11px;font-weight:600" class="${chgCls}">${arrow} ${pf(chg)}</span>
      </a>`;
    }).join('');
  } catch (e) {
    if (listEl) listEl.innerHTML = '<span class="text-xs text-dim">Briefing belum tersedia.</span>';
    console.warn('loadSimilarStocks failed', e);
  }
}

function fallbackIssuerName(ticker){ const names={GOTO:'GoTo Gojek Tokopedia Tbk.',BBCA:'Bank Central Asia Tbk.',BMRI:'Bank Mandiri Tbk.',BBRI:'Bank Rakyat Indonesia Tbk.',TLKM:'Telkom Indonesia Tbk.'}; return names[ticker] || `${ticker} — Ekuitas IDX`; }
function makeFallbackCandles(ticker){ const baseMap={GOTO:96,BBCA:9800,BMRI:5850,BBRI:4100,TLKM:3420}; const base=baseMap[ticker]||1000; const out=[]; for(let i=59;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); const wave=Math.sin(i/3)*0.025; const close=Math.round(base*(1+wave+(60-i)*0.0008)); out.push({date:d.toISOString().slice(0,10),open:close-2,high:close+4,low:close-5,close,volume:10000000+i*123456}); } return out; }
/* ─── Multi-Chart Layout System (25.3.4) ─── */
const MULTI_CHART_LAYOUT_KEY = 'retailbijak.multichart_layout';
const MULTI_CHART_LAYOUTS = {
  '1x1': { cols: 1, rows: 1, panes: [{tf:'1D', label:'1D'}] },
  '2x1': { cols: 2, rows: 1, panes: [{tf:'1D', label:'1D'},{tf:'1W', label:'1W'}] },
  '2x2': { cols: 2, rows: 2, panes: [{tf:'1D', label:'1D'},{tf:'4H', label:'4H'},{tf:'1W', label:'1W'},{tf:'1M', label:'1M'}] },
  '3x2': { cols: 3, rows: 2, panes: [{tf:'1D', label:'1D'},{tf:'4H', label:'4H'},{tf:'1H', label:'1H'},{tf:'1W', label:'1W'},{tf:'1M', label:'1M'},{tf:'5m', label:'5M'}] },
};
const MULTI_CHART_TF_LIMITS = {
  '1D': 160, '4H': 240, '1H': 240, '1W': 300, '1M': 400, '5m': 300,
};
let multiChartInstances = [];
let multiChartActive = false;
let multiChartResizeObserver = null;

function getSavedMultiChartLayout() {
  try { return localStorage.getItem(MULTI_CHART_LAYOUT_KEY) || '1x1'; } catch { return '1x1'; }
}
function saveMultiChartLayout(layout) {
  try { localStorage.setItem(MULTI_CHART_LAYOUT_KEY, layout); } catch {}
}

function initMultiChartLayoutToggle(symbol) {
  const bar = document.getElementById('multi-chart-layout-bar');
  if (!bar) return;
  const saved = getSavedMultiChartLayout();
  bar.querySelectorAll('.layout-btn').forEach(btn => {
    const layout = btn.dataset.layout;
    btn.classList.toggle('active', layout === saved);
    btn.addEventListener('click', () => {
      bar.querySelectorAll('.layout-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      saveMultiChartLayout(layout);
      switchChartLayout(symbol, layout);
    });
  });
  // Apply saved layout on init (if not 1x1)
  if (saved !== '1x1') {
    switchChartLayout(symbol, saved);
  }
}

function switchChartLayout(symbol, layout) {
  const singleChart = document.getElementById('tvchart');
  const multiContainer = document.getElementById('multi-chart-container');
  const toolbar = document.getElementById('chart-toolbar');
  if (!multiContainer || !singleChart) return;

  multiChartActive = layout !== '1x1';

  if (!multiChartActive) {
    // Single chart mode: show single, hide multi
    singleChart.style.display = '';
    multiContainer.style.display = 'none';
    multiContainer.innerHTML = '';
    multiChartInstances.forEach(inst => {
      try { inst.chart.remove(); } catch(e) {}
    });
    multiChartInstances = [];
    if (multiChartResizeObserver) { multiChartResizeObserver.disconnect(); multiChartResizeObserver = null; }
    // Re-render single chart
    renderStockChart(symbol, cachedMultiChartCandles?.['1D'] || [], cachedMultiChartTechnical || {});
    return;
  }

  // Multi-chart mode: hide single, show multi grid
  singleChart.style.display = 'none';
  const cfg = MULTI_CHART_LAYOUTS[layout];
  if (!cfg) return;

  multiContainer.style.display = 'grid';
  multiContainer.style.gridTemplateColumns = `repeat(${cfg.cols}, 1fr)`;
  multiContainer.innerHTML = cfg.panes.map((p, i) =>
    `<div class="chart-pane" data-pane-idx="${i}" data-pane-tf="${p.tf}">
      <span class="chart-pane-label">${p.label}</span>
      <div class="skeleton skeleton-chart"></div>
    </div>`
  ).join('');

  // Destroy old instances
  multiChartInstances.forEach(inst => {
    try { inst.chart.remove(); } catch(e) {}
  });
  multiChartInstances = [];

  // Load data for each pane and create charts
  cfg.panes.forEach((pane, idx) => {
    const container = multiContainer.querySelector(`.chart-pane[data-pane-idx="${idx}"]`);
    if (!container) return;
    loadMultiChartPane(symbol, pane.tf, idx, container, cfg.panes);
  });

  // Resize observer for the multi-chart container
  if (multiChartResizeObserver) multiChartResizeObserver.disconnect();
  multiChartResizeObserver = new ResizeObserver(() => {
    multiChartInstances.forEach(inst => {
      const el = document.querySelector(`.chart-pane[data-pane-idx="${inst.idx}"]`);
      if (el && inst.chart) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          inst.chart.applyOptions({ width: rect.width, height: rect.height });
        }
      }
    });
  });
  multiChartResizeObserver.observe(multiContainer);
}

let cachedMultiChartCandles = {};
let cachedMultiChartTechnical = {};

async function loadMultiChartPane(symbol, timeframe, idx, container, allPanes) {
  try {
    const limit = MULTI_CHART_TF_LIMITS[timeframe] || 160;
    let chartData = cachedMultiChartCandles[timeframe];
    if (!chartData || !chartData.length) {
      const res = await fetchChartData(symbol, limit, timeframe).catch(() => null);
      chartData = normalizeCandles(res?.data?.length ? res.data : []);
      cachedMultiChartCandles[timeframe] = chartData;
    }
    if (!chartData.length) {
      container.innerHTML = `<div class="empty-state-v2" style="padding:20px"><h3>Tidak ada data</h3><p>Data ${timeframe} tidak tersedia</p></div>`;
      return;
    }
    // Clear skeleton
    container.innerHTML = '';
    const paneDiv = document.createElement('div');
    paneDiv.style.width = '100%';
    paneDiv.style.height = '100%';
    paneDiv.style.minHeight = '120px';
    container.appendChild(paneDiv);
    // Add label back
    const label = document.createElement('span');
    label.className = 'chart-pane-label';
    label.textContent = allPanes.find(p => p.tf === timeframe)?.label || timeframe;
    container.appendChild(label);

    createMultiChartInstance(symbol, timeframe, idx, paneDiv, chartData);
  } catch (e) {
    console.warn(`Failed to load multi-chart pane ${timeframe}:`, e);
    container.innerHTML = `<div class="empty-state-v2" style="padding:20px"><h3>Gagal</h3><p>${timeframe}</p></div>`;
  }
}

function createMultiChartInstance(symbol, timeframe, idx, container, chartData) {
  const theme = document.documentElement.getAttribute('data-theme') || 'dark';
  const isLight = theme === 'light';
  const cs = getComputedStyle(document.documentElement);
  const textDim = cs.getPropertyValue('--text-dim').trim() || (isLight ? '#64748b' : '#94a3b8');
  const gridColor = isLight ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.035)';
  const c = getThemeColors();

  const rect = container.getBoundingClientRect();
  const width = rect.width || 300;
  const height = rect.height || 200;

  if (typeof LightweightCharts === 'undefined') {
    container.innerHTML = '<div class="empty-state-v2" style="padding:20px"><p>Chart library tidak tersedia</p></div>';
    return;
  }

  const chart = LightweightCharts.createChart(container, {
    width, height,
    layout: { textColor: textDim, background: { type: 'solid', color: 'transparent' } },
    grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
    rightPriceScale: { borderVisible: false },
    timeScale: { borderVisible: false, timeVisible: timeframe === '1H' || timeframe === '4H' || timeframe === '5m' },
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
  });

  const series = chart.addCandlestickSeries({
    upColor: c.primary, downColor: c.down,
    borderVisible: false, wickUpColor: c.primary, wickDownColor: c.down,
  });

  const data = chartData.map(d => ({
    time: String(d.date).slice(0, 10),
    open: d.open, high: d.high, low: d.low, close: d.close,
  }));
  series.setData(data);

  // Volume overlay
  const vol = chart.addHistogramSeries({
    priceFormat: { type: 'volume' },
    priceScaleId: '',
    color: 'rgba(148,163,184,0.2)',
  });
  vol.setData(data.map(d => ({
    time: String(d.date).slice(0, 10),
    value: d.volume || 0,
    color: d.close >= d.open ? 'rgba(16,185,129,0.25)' : 'rgba(248,113,113,0.25)',
  })));
  chart.priceScale('').applyOptions({ scaleMargins: { top: .82, bottom: 0 } });

  chart.timeScale().fitContent();

  const inst = { chart, series, idx, timeframe, container, _syncing: false };
  multiChartInstances.push(inst);

  // Crosshair sync
  chart.subscribeCrosshairMove(param => {
    if (!param.time || param.price == null) return;
    if (inst._syncing) return;
    inst._syncing = true;
    multiChartInstances.forEach(other => {
      if (other.idx === idx) return;
      try {
        other.chart.setCrosshairPosition(param.price, param.time, other.series);
      } catch (e) { /* ignore sync errors */ }
    });
    setTimeout(() => { inst._syncing = false; }, 50);
  });

  // Handle unsubscription on dispose
  chart.subscribeCrosshairMove(() => {}); // placeholder to keep handler ref
}

// ─── Client-side Indicator Calculations ────────────────────────
function calcEMA(data, period) {
  if (!data || data.length < period) return [];
  const multiplier = 2 / (period + 1);
  const result = [];
  // SMA for first value
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i].close;
  let ema = sum / period;
  for (let i = 0; i < data.length; i++) {
    if (i >= period - 1) {
      if (i === period - 1) {
        ema = sum / period;
      } else {
        ema = (data[i].close - ema) * multiplier + ema;
      }
      result.push({ time: String(data[i].date).slice(0,10), value: Math.round(ema * 100) / 100 });
    }
  }
  return result;
}

function calcRSI(data, period = 14) {
  if (!data || data.length < period + 1) return [];
  const result = [];
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = data[i].close - data[i-1].close;
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  let rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
  result.push({ time: String(data[period].date).slice(0,10), value: Math.round(rsi * 100) / 100 });
  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i].close - data[i-1].close;
    const gain = diff >= 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
    result.push({ time: String(data[i].date).slice(0,10), value: Math.round(rsi * 100) / 100 });
  }
  return result;
}

function calcMACD(data, fast = 12, slow = 26, signal = 9) {
  const emaFast = calcEMA(data, fast);
  const emaSlow = calcEMA(data, slow);
  // MACD line = EMA(fast) - EMA(slow), aligned by time
  const macdLine = [];
  const slowMap = {};
  emaSlow.forEach(e => { slowMap[e.time] = e.value; });
  emaFast.forEach(e => {
    if (slowMap[e.time] != null) {
      macdLine.push({ time: e.time, value: Math.round((e.value - slowMap[e.time]) * 100) / 100 });
    }
  });
  if (macdLine.length < signal + 1) return { macd: macdLine, signal: [], histogram: [] };
  // Signal line = EMA of MACD
  const signalLine = [];
  const sm = 2 / (signal + 1);
  let sig = 0;
  for (let i = 0; i < signal; i++) sig += macdLine[i].value;
  sig /= signal;
  signalLine.push({ time: macdLine[signal - 1].time, value: Math.round(sig * 100) / 100 });
  for (let i = signal; i < macdLine.length; i++) {
    sig = (macdLine[i].value - sig) * sm + sig;
    signalLine.push({ time: macdLine[i].time, value: Math.round(sig * 100) / 100 });
  }
  // Histogram = MACD - Signal
  const histogram = [];
  for (let i = 0; i < signalLine.length; i++) {
    const mac = macdLine[i + signal - 1];
    if (mac) {
      histogram.push({ time: mac.time, value: Math.round((mac.value - signalLine[i].value) * 100) / 100 });
    }
  }
  return { macd: macdLine, signal: signalLine, histogram };
}
