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

export async function fetchChartData(ticker, limit = 100) {
    return apiFetch(`/stocks/${ticker}/chart-data?limit=${limit}`);
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
