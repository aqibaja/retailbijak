const API_BASE = '/api';

// ─── Fetch Wrappers ────────────────────────────────────
export async function apiFetch(endpoint, options = {}) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const opts = { ...options, signal: controller.signal };
        const res = await fetch(`${API_BASE}${endpoint}`, opts);
        clearTimeout(timeout);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (e) {
        console.error(`API error: ${endpoint}`, e);
        return null;
    }
}

export async function fetchNews(limit = 6, ticker = '') {
    const q = ticker ? `/news?limit=${limit}&ticker=${encodeURIComponent(ticker)}` : `/news?limit=${limit}`;
    return apiFetch(q) || { count: 0, data: [] };
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


export async function fetchChartData(ticker, limit = 100) {
    return apiFetch(`/stocks/${ticker}/chart-data?limit=${limit}`);
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

export async function searchStocks(query = '', limit = 8) {
    const q = encodeURIComponent(query || '');
    return apiFetch(`/stocks/search?q=${q}&limit=${limit}`) || { count: 0, data: [] };
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

// ─── Toast Notification System ─────────────────────────
export function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.pointerEvents = 'auto';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = `
        <div class="toast-body">
            <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ'}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close-btn" aria-label="Tutup">&times;</button>
        </div>
        <div class="toast-progress" style="animation-duration:${duration}ms"></div>
    `;
    
    toast.style.animation = 'toastSlideIn 0.35s cubic-bezier(0.16,1,0.3,1)';
    container.appendChild(toast);
    
    // Manual dismiss
    toast.querySelector('.toast-close-btn').onclick = function(e) {
        e.stopPropagation();
        dismissToast(toast);
    };
    
    // Auto dismiss
    const timer = setTimeout(() => dismissToast(toast), duration);
    
    // Store timer reference for cleanup
    toast._dismissTimer = timer;
}

function dismissToast(toast) {
    // Clear timer if still active
    if (toast._dismissTimer) {
        clearTimeout(toast._dismissTimer);
        toast._dismissTimer = null;
    }
    toast.classList.add('toast-exit');
    setTimeout(() => {
        if (toast.parentNode) toast.remove();
    }, 280);
}

/* cache-bust: 20260430m */
