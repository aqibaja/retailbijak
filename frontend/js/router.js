import { renderDashboard } from './views/dashboard.js?v=20260506a';
import { renderStockDetail } from './views/stock_detail.js?v=20260506a';
import { renderScreener } from './views/screener.js?v=20260506a';
import { renderPortfolio } from './views/portfolio.js?v=20260506a';
import { renderMarket } from './views/market.js?v=20260506a';
import { renderNews } from './views/news.js?v=20260506a';
import { renderSettings } from './views/settings.js?v=20260506a';
import { renderHelp } from './views/help.js?v=20260506a';
import { renderAiPicks } from './views/ai_picks.js?v=20260506c';

let routeToken = 0;

function normalizeRoute(hash) {
    const raw = String(hash || '').trim();
    const path = raw.replace(/^#\/?/, '') || 'dashboard';
    const cleanPath = path.split(/[?&]/)[0] || 'dashboard';
    return cleanPath;
}

export function handleRoute(hash) {
    const root = document.getElementById('app-root');
    if (!root) return;

    const cleanPath = normalizeRoute(hash);
    const [view, ...rest] = cleanPath.split('/');
    const baseRoute = view || 'dashboard';
    const currentToken = ++routeToken;

    // Update active state in desktop and mobile nav
    document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(el => {
        const targetView = el.getAttribute('data-view');
        if (targetView) el.classList.toggle('active', targetView === baseRoute);
    });

    // Fade out transition
    root.classList.add('page-loading');
    root.dataset.routePath = cleanPath;
    root.dataset.activeView = baseRoute;
    
    // Safety: force-remove page-loading after 3s to prevent stuck blank
    const safetyTimer = setTimeout(() => {
        root.classList.remove('page-loading');
    }, 3000);
    
    window.setTimeout(() => {
        if (currentToken !== routeToken) return;
        // Clear the safety timer since we're about to remove it ourselves
        clearTimeout(safetyTimer);
        try {
            window.scrollTo({ top: 0, behavior: 'instant' });
        } catch {
            window.scrollTo(0, 0);
        }
        
        try {
            if (baseRoute === 'dashboard') renderDashboard(root);
            else if (baseRoute === 'stock' && rest[0]) renderStockDetail(root, rest[0]);
            else if (baseRoute === 'market') renderMarket(root);
            else if (baseRoute === 'screener') renderScreener(root);
            else if (baseRoute === 'portfolio' || baseRoute === 'watchlist') renderPortfolio(root, baseRoute);
            else if (baseRoute === 'news') renderNews(root);
            else if (baseRoute === 'ai-picks') renderAiPicks(root);
            else if (baseRoute === 'settings') renderSettings(root);
            else if (baseRoute === 'help') renderHelp(root);
            else renderDashboard(root); // Fallback
            
            // Re-initialize icons for newly injected HTML
            if (typeof lucide !== 'undefined') lucide.createIcons();
            
        } catch (e) {
            console.error("Routing error:", e);
            root.innerHTML = `<div class="p-4 text-down">Gagal memuat tampilan.</div>`;
        }

        // Fade in
        requestAnimationFrame(() => {
            if (currentToken === routeToken) root.classList.remove('page-loading');
        });
        
    }, 120); // Reduced wait to minimize stale dashboard flashes
}
