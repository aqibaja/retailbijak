import { renderDashboard } from './views/dashboard.js';
import { renderStockDetail } from './views/stock_detail.js';
import { renderScreener } from './views/screener.js';
import { renderPortfolio } from './views/portfolio.js';
import { renderMarket } from './views/market.js';
import { renderNews } from './views/news.js';
import { renderSettings } from './views/settings.js';
import { renderHelp } from './views/help.js';

export function handleRoute(hash) {
    const root = document.getElementById('app-root');
    if (!root) return;

    const path = hash.replace(/^#\/?/, '') || 'dashboard';
    const baseRoute = path.split('/')[0];

    // Update Sidebar Navigation
    document.querySelectorAll('.nav-item').forEach(el => {
        const view = el.getAttribute('data-view');
        el.classList.toggle('active', view === baseRoute);
    });

    // Simple transition
    root.style.opacity = '0';
    
    setTimeout(() => {
        renderView(root, path);
        root.style.opacity = '1';
        window.scrollTo(0, 0);
    }, 100);
}

function renderView(root, path) {
    const segments = path.split('/');
    const view = segments[0];

    if (view === 'dashboard') renderDashboard(root);
    else if (view === 'stock' && segments[1]) renderStockDetail(root, segments[1]);
    else if (view === 'market') renderMarket(root);
    else if (view === 'screener') renderScreener(root);
    else if (view === 'portfolio' || view === 'watchlist') renderPortfolio(root, view);
    else if (view === 'news') renderNews(root);
    else if (view === 'settings') renderSettings(root);
    else if (view === 'help') renderHelp(root);
    else renderDashboard(root); // Default fallback
}
