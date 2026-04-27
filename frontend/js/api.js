const API_BASE = 'http://127.0.0.1:8000/api';

export async function fetchNews(limit = 6) {
    try {
        const res = await fetch(`${API_BASE}/news?limit=${limit}`);
        if (!res.ok) throw new Error('Network error');
        return await res.json();
    } catch (e) {
        console.error('Failed to fetch news', e);
        return { count: 0, data: [] };
    }
}

export async function fetchFundamental(ticker) {
    try {
        const res = await fetch(`${API_BASE}/stocks/${ticker}/fundamental`);
        if (!res.ok) throw new Error('Network error');
        return await res.json();
    } catch (e) {
        console.error('Failed to fetch fundamental', e);
        return null;
    }
}

export async function fetchTechnical(ticker) {
    try {
        const res = await fetch(`${API_BASE}/stocks/${ticker}/technical`);
        if (!res.ok) throw new Error('Network error');
        return await res.json();
    } catch (e) {
        console.error('Failed to fetch technical', e);
        return null;
    }
}

export async function fetchChartData(ticker, limit = 100) {
    try {
        const res = await fetch(`${API_BASE}/stocks/${ticker}/chart-data?limit=${limit}`);
        if (!res.ok) throw new Error('Network error');
        return await res.json();
    } catch (e) {
        console.error('Failed to fetch chart data', e);
        return null;
    }
}
