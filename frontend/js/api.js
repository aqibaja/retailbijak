const API_BASE = '/api';

// ─── Fetch Wrappers ────────────────────────────────────
export async function apiFetch(endpoint, options = {}) {
    try {
        const res = await fetch(`${API_BASE}${endpoint}`, options);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (e) {
        console.error(`API error: ${endpoint}`, e);
        return null;
    }
}

export async function fetchNews(limit = 6) {
    return apiFetch(`/news?limit=${limit}`) || { count: 0, data: [] };
}

export async function fetchFundamental(ticker) {
    return apiFetch(`/stocks/${ticker}/fundamental`);
}

export async function fetchTechnical(ticker) {
    return apiFetch(`/stocks/${ticker}/technical`);
}

export async function fetchAnalysis(ticker, options = {}) {
    const withLlm = options?.llm ? '&llm=1' : '';
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

export async function fetchAiPicks(mode = 'swing', limit = 5, options = {}) {
    const safeMode = encodeURIComponent(mode || 'swing');
    const safeLimit = Number(limit || 5);
    const withLlm = options?.llm ? '&llm=1' : '';
    return apiFetch(`/ai-picks?mode=${safeMode}&limit=${safeLimit}${withLlm}`) || {
        mode: mode || 'swing',
        updated_at: null,
        source: 'no_data',
        market_context: { tone: 'unknown', breadth_label: 'data belum cukup', latest_date: null },
        summary: { candidates_analyzed: 0, eligible_count: 0, featured_ticker: null },
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
    toast.innerHTML = `
        <div class="toast-body">
            <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
            <span class="toast-message">${message}</span>
        </div>
        <div class="toast-progress" style="animation-duration:${duration}ms"></div>
    `;
    
    container.appendChild(toast);
    
    // Auto dismiss
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/* cache-bust: 20260430m */
