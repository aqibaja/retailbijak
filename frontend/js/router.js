import { renderDashboard } from './views/dashboard.js';
import { renderStockDetail } from './views/stock_detail.js';
import { renderScreener } from './views/screener.js';
import { renderPortfolio } from './views/portfolio.js';
import { renderMarket } from './views/market.js';
import { renderNews } from './views/news.js';

export function handleRoute(hash) {
    const root = document.getElementById('app-root');
    if (!root) return;

    const path = hash.replace(/^#\/?/, '') || 'dashboard';
    const baseRoute = path.split('/')[0];

    // Update active state in desktop and mobile nav
    document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(el => {
        const view = el.getAttribute('data-view');
        if (view) el.classList.toggle('active', view === baseRoute);
    });

    // Fade out transition
    root.classList.add('page-loading');
    
    setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
        
        const segments = path.split('/');
        const view = segments[0];

        try {
            if (view === 'dashboard') renderDashboard(root);
            else if (view === 'stock' && segments[1]) renderStockDetail(root, segments[1]);
            else if (view === 'market') renderMarket(root);
            else if (view === 'screener') renderScreener(root);
            else if (view === 'portfolio' || view === 'watchlist') renderPortfolio(root, view);
            else if (view === 'news') renderNews(root);
            else renderDashboard(root); // Fallback
            
            // Re-initialize icons for newly injected HTML
            if (typeof lucide !== 'undefined') lucide.createIcons();
            
        } catch (e) {
            console.error("Routing error:", e);
            root.innerHTML = `<div class="p-4 text-down">Error loading view.</div>`;
        }

        // Fade in
        requestAnimationFrame(() => {
            root.classList.remove('page-loading');
        });
        
    }, 200); // Wait for fade out
}
