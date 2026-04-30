import { renderDashboard } from './views/dashboard.js?v=20260430m';
import { renderStockDetail } from './views/stock_detail.js?v=20260430ae';
import { renderScreener } from './views/screener.js?v=20260430m';
import { renderPortfolio } from './views/portfolio.js?v=20260430m';
import { renderMarket } from './views/market.js?v=20260430m';
import { renderNews } from './views/news.js?v=20260430m';
import { renderSettings } from './views/settings.js?v=20260430m';
import { renderHelp } from './views/help.js?v=20260430m';

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
            else if (view === 'settings') renderSettings(root);
            else if (view === 'help') renderHelp(root);
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
