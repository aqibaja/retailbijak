const API_BASE = '/api';

// ─── Fetch Wrappers ────────────────────────────────────
export async function apiFetch(endpoint, options = {}) {
    try {
        const timeoutMs = options.timeout || 8000;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        const opts = { ...options, signal: controller.signal };
        delete opts.timeout;
        const res = await fetch(`${API_BASE}${endpoint}`, opts);
        clearTimeout(timeout);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (e) {
        console.error(`API error: ${endpoint}`, e);
        // Only show toast for non-abort errors (timeout = silent)
        if (e.name !== 'AbortError') {
            showToast('Gagal mengambil data. Coba lagi.', 'error', 3000);
        }
        return null;
    }
}

export async function fetchNews(limit = 6, ticker = '', offset = 0, source = '', sentiment = '', category = '') {
    let q = `/news?limit=${limit}&offset=${offset}`;
    if (ticker) q += `&ticker=${encodeURIComponent(ticker)}`;
    if (source) q += `&source=${encodeURIComponent(source)}`;
    if (sentiment) q += `&sentiment=${encodeURIComponent(sentiment)}`;
    if (category) q += `&category=${encodeURIComponent(category)}`;
    return apiFetch(q) || { count: 0, total: 0, data: [] };
}

export async function fetchFundamental(ticker) {
    return apiFetch(`/stocks/${ticker}/fundamental`);
}

export async function fetchTechnical(ticker) {
    return apiFetch(`/stocks/${ticker}/technical`);
}

export async function fetchAnalysis(ticker, options = {}) {
    const withLlm = options?.llm ? '?llm=1' : '';
    return apiFetch(`/stocks/${ticker}/analysis${withLlm}`);
}


export async function fetchChartData(ticker, limit = 100, timeframe = '1D') {
    return apiFetch(`/stocks/${ticker}/chart-data?limit=${limit}&timeframe=${timeframe}`);
}

export async function fetchMarketSummary() {
    return apiFetch('/market-summary') || { status: 'no_data', symbol: 'IHSG', value: null, change_pct: null, open: null, high: null, low: null };
}

export async function fetchIhsgChart(period = '1M') {
    return apiFetch(`/ihsg-chart?period=${period}`) || { count: 0, data: [] };
}

export async function fetchSectorSummary() {
    const data = await apiFetch('/sector-summary');
    return data || { count: 0, data: [] };
}

export async function fetchStockDetail(ticker) {
    return apiFetch(`/stocks/${ticker}`);
}

export async function searchStocks(query = '', limit = 8, sector = '') {
    const q = encodeURIComponent(query || '');
    const sec = sector ? `&sector=${encodeURIComponent(sector)}` : '';
    return apiFetch(`/stocks/search?q=${q}&limit=${limit}${sec}`) || { count: 0, data: [] };
}

export async function fetchTopMovers(limit = 10, sort = 'gainers') {
    return apiFetch(`/top-movers?limit=${limit}&sort=${encodeURIComponent(sort)}`) || { count: 0, data: [] };
}

export async function fetchMarketBreadth() {
    return apiFetch('/market-breadth') || { status: 'ok', source: 'no_data', count: 0, data: { latest_date: null, advancing: 0, declining: 0, unchanged: 0, advancers: [], decliners: [] } };
}

export async function fetchScan(timeframe = '1d') {
    return apiFetch(`/scan?timeframe=${timeframe}`);
}

export async function fetchSettings() {
    const data = await apiFetch('/settings');
    return data || {
        compact_table_rows: false,
        auto_refresh_screener: false,
        openrouter_enabled: false,
        openrouter_has_api_key: false,
        openrouter_api_key_masked: '',
        openrouter_site_url: '',
        openrouter_app_name: 'RetailBijak',
        openrouter_stock_analysis_model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
        openrouter_ai_picks_model: 'openai/gpt-oss-120b:free',
    };
}

export async function updateSettings(settings) {
    return apiFetch('/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
    });
}

export async function fetchWatchlist() {
    return apiFetch('/watchlist') || { count: 0, data: [] };
}

export async function saveWatchlistItem(payload) {
    return apiFetch('/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
}

export async function deleteWatchlistItem(ticker) {
    return apiFetch(`/watchlist/${encodeURIComponent(ticker)}`, { method: 'DELETE' });
}

export async function fetchPortfolio() {
    return apiFetch('/portfolio') || { count: 0, data: [] };
}

export async function fetchAiPicks(mode = 'swing', limit = 5) {
    const safeMode = encodeURIComponent(mode || 'swing');
    const safeLimit = Number(limit || 5);
    return apiFetch(`/ai-picks?mode=${safeMode}&limit=${safeLimit}`) || {
        mode: mode || 'swing',
        trading_date: null,
        generated_at: null,
        as_of_label: 'Premarket briefing belum tersedia',
        updated_at: null,
        source: 'no_data',
        market_context: { tone: 'unknown', breadth_label: 'data belum cukup', latest_date: null },
        market_bias: 'data belum cukup',
        summary: { candidates_analyzed: 0, eligible_count: 0, featured_ticker: null },
        freshness: { label: 'Belum ada briefing', is_stale: true, generated_at: null },
        data: [],
    };
}

export async function savePortfolioPosition(payload) {
    return apiFetch('/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
}

export async function deletePortfolioPosition(ticker) {
    return apiFetch(`/portfolio/${encodeURIComponent(ticker)}`, { method: 'DELETE' });
}

// ─── SSE URL (relative for production) ─────────────────
export function getScanEventSourceUrl(timeframe) {
    return `${window.location.origin}/api/scan?timeframe=${timeframe}`;
}

// ─── Toast Notification System V2 ─────────────────
const MAX_TOASTS = 3;

// Track active messages to prevent duplicates
const activeToastMessages = new Set();

export function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Prevent duplicate messages
    const dedupKey = `${type}:${message}`;
    if (activeToastMessages.has(dedupKey)) return;
    activeToastMessages.add(dedupKey);
    setTimeout(() => activeToastMessages.delete(dedupKey), duration + 500);

    // Limit visible toasts: if already at max, dismiss oldest
    while (container.children.length >= MAX_TOASTS) {
        const oldest = container.children[0];
        if (oldest && oldest.classList) {
            dismissToast(oldest);
        } else {
            break;
        }
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.pointerEvents = 'auto';
    toast.setAttribute('role', 'alert');
    toast.dataset.dedup = dedupKey;
    toast.innerHTML = `
        <div class="toast-body">
            <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ'}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close-btn" aria-label="Tutup">&times;</button>
        </div>
        <div class="toast-progress" style="animation-duration:${duration}ms"></div>
    `;

    // Stagger: offset each toast slightly
    const idx = container.children.length;
    toast.style.marginTop = idx > 0 ? '8px' : '0';

    toast.style.animation = 'toastSlideIn 0.35s cubic-bezier(0.16,1,0.3,1)';
    container.appendChild(toast);

    // Manual dismiss
    toast.querySelector('.toast-close-btn').onclick = function(e) {
        e.stopPropagation();
        activeToastMessages.delete(dedupKey);
        dismissToast(toast);
    };

    // Auto dismiss with pause-on-hover support
    let remaining = duration;
    let startTime = Date.now();
    let timer = setTimeout(() => {
        activeToastMessages.delete(dedupKey);
        dismissToast(toast);
    }, remaining);

    toast.addEventListener('mouseenter', () => {
        clearTimeout(timer);
        remaining -= Date.now() - startTime;
        toast.querySelector('.toast-progress')?.style.setProperty('animation-play-state', 'paused');
    });
    toast.addEventListener('mouseleave', () => {
        startTime = Date.now();
        timer = setTimeout(() => {
            activeToastMessages.delete(dedupKey);
            dismissToast(toast);
        }, Math.max(remaining, 500));
        toast.querySelector('.toast-progress')?.style.setProperty('animation-play-state', 'running');
    });

    // Store timer reference for cleanup
    toast._dismissTimer = { timer, remaining, startTime };
}

function dismissToast(toast) {
    // Clear timer if still active
    if (toast._dismissTimer) {
        clearTimeout(toast._dismissTimer.timer);
        toast._dismissTimer = null;
    }
    toast.classList.add('toast-exit');
    setTimeout(() => {
        if (toast.parentNode) toast.remove();
    }, 280);
}

/* cache-bust: 20260507C */

// ─── Page Meta Tags (SEO: description, OG, canonical) ────
export function setPageMeta(title, description, path) {
  const baseUrl = 'https://retailbijak.rich27.my.id';
  const fullPath = path ? `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}` : baseUrl;
  const defaultDesc = 'Platform analisis saham IDX profesional: stock scanner, market dashboard, portfolio tracker, technical & fundamental analysis real-time.';

  // Title
  document.title = title || 'RetailBijak — IDX Stock Intelligence';

  // Meta description
  let el = document.querySelector('meta[name="description"]');
  if (!el) { el = document.createElement('meta'); el.name = 'description'; document.head.appendChild(el); }
  el.content = description || defaultDesc;

  // OG title
  let ogTitle = document.querySelector('meta[property="og:title"]');
  if (!ogTitle) { ogTitle = document.createElement('meta'); ogTitle.setAttribute('property', 'og:title'); document.head.appendChild(ogTitle); }
  ogTitle.content = title || 'RetailBijak — IDX Stock Intelligence';

  // OG description
  let ogDesc = document.querySelector('meta[property="og:description"]');
  if (!ogDesc) { ogDesc = document.createElement('meta'); ogDesc.setAttribute('property', 'og:description'); document.head.appendChild(ogDesc); }
  ogDesc.content = description || defaultDesc;

  // OG url
  let ogUrl = document.querySelector('meta[property="og:url"]');
  if (!ogUrl) { ogUrl = document.createElement('meta'); ogUrl.setAttribute('property', 'og:url'); document.head.appendChild(ogUrl); }
  ogUrl.content = fullPath;

  // Canonical URL
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
  canonical.href = fullPath;
}

// ─── TradingView Embed Widget Loader ────────────────────
export function loadTVWidget(containerId, widgetType, config) {
  const container = document.getElementById(containerId);
  if (!container) { console.warn(`TV widget container #${containerId} not found`); return; }
  
  // Clear container
  container.innerHTML = '';
  
  // Create wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'tradingview-widget-container';
  
  // Create widget div (some scripts look for this)
  const widgetDiv = document.createElement('div');
  widgetDiv.className = 'tradingview-widget-container__widget';
  wrapper.appendChild(widgetDiv);
  
  // Script with async=false so document.currentScript works
  // and the widget can read the JSON config from textContent
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = `https://s3.tradingview.com/external-embedding/embed-widget-${widgetType}.js`;
  script.async = false;
  script.textContent = JSON.stringify(config);
  
  wrapper.appendChild(script);
  container.appendChild(wrapper);
}

export function getTVTheme() {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  return isLight ? 'light' : 'dark';
}

// Listen for theme changes to update TV widgets
let tvThemeChangeHandler = null;
export function initTVThemeSync() {
  if (tvThemeChangeHandler) return; // already initialized
  tvThemeChangeHandler = () => {
    // Dispatch custom event so widgets can refresh when theme changes
    window.dispatchEvent(new CustomEvent('tv-theme-change', { detail: { theme: getTVTheme() } }));
  };
  // Watch for data-theme attribute changes
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.attributeName === 'data-theme') {
        tvThemeChangeHandler();
        break;
      }
    }
  });
  observer.observe(document.documentElement, { attributes: true });
}
