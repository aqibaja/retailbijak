import { clearViewTimers } from './main.js?v=20260507M';

// Dynamic view registry — lazy import per route (1.7.1)
const viewModules = {
  dashboard: () => import('./views/dashboard.js?v=20260507M'),
  stock_detail: () => import('./views/stock_detail.js?v=20260507M'),
  screener: () => import('./views/screener.js?v=20260507M'),
  portfolio: () => import('./views/portfolio.js?v=20260507M'),
  market: () => import('./views/market.js?v=20260507M'),
  compare: () => import('./views/compare.js?v=20260508'),
  backtest: () => import('./views/backtest.js?v=20260510'),
  news: () => import('./views/news.js?v=20260507M'),
  settings: () => import('./views/settings.js?v=20260507M'),
  help: () => import('./views/help.js?v=20260507M'),
  ai_picks: () => import('./views/ai_picks.js?v=20260507M'),
};
const viewCache = {};

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
    
    // Clear any view-specific timers/intervals from previous view
    clearViewTimers();

    const cleanPath = normalizeRoute(hash);
    const [view, ...rest] = cleanPath.split('/');
    const baseRoute = view || 'dashboard';
    const currentToken = ++routeToken;

    // Update active state in desktop and mobile nav
    document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(el => {
        const targetView = el.getAttribute('data-view');
        if (targetView) {
            const isActive = targetView === baseRoute;
            el.classList.toggle('active', isActive);
            if (isActive) el.setAttribute('aria-current', 'page');
            else el.removeAttribute('aria-current');
        }
    });

    // Fade out transition
    root.classList.add('page-loading');
    root.dataset.routePath = cleanPath;
    root.dataset.activeView = baseRoute;
    
    // Safety: force-remove page-loading after 3s to prevent stuck blank
    const safetyTimer = setTimeout(() => {
        root.classList.remove('page-loading');
    }, 3000);
    
    window.setTimeout(async () => {
        if (currentToken !== routeToken) return;
        // Clear the safety timer since we're about to remove it ourselves
        clearTimeout(safetyTimer);
        try {
            window.scrollTo({ top: 0, behavior: 'instant' });
        } catch {
            window.scrollTo(0, 0);
        }
        
        try {
            // Dynamic import per route (1.7.1)
            const loadAndRender = async () => {
              // Portfolio covers both #portfolio and #watchlist
              if (baseRoute === 'portfolio' || baseRoute === 'watchlist') {
                const mod = viewCache.portfolio || await viewModules.portfolio();
                viewCache.portfolio = mod;
                return mod.renderPortfolio(root, baseRoute);
              }
              if (baseRoute === 'stock' && rest[0]) {
                const mod = viewCache.stock_detail || await viewModules.stock_detail();
                viewCache.stock_detail = mod;
                return mod.renderStockDetail(root, rest[0]);
              }
              const loadView = viewModules[baseRoute];
              if (loadView) {
                const mod = viewCache[baseRoute] || await loadView();
                viewCache[baseRoute] = mod;
                const renderFn = mod[`render${baseRoute.charAt(0).toUpperCase() + baseRoute.slice(1)}`];
                if (renderFn) return renderFn(root);
              }
              // Fallback to dashboard
              const dash = viewCache.dashboard || await viewModules.dashboard();
              viewCache.dashboard = dash;
              return dash.renderDashboard(root);
            };
            await loadAndRender();
            
            // Re-initialize icons for newly injected HTML
            
            // View content entrance animation
            if (currentToken === routeToken) root.classList.add('view-content');
            
        } catch (e) {
            console.error("Routing error:", e);
            root.innerHTML = `<div class="p-4 text-down">Gagal memuat tampilan.</div>`;
        }

        // Fade in
        requestAnimationFrame(() => {
            if (currentToken === routeToken) root.classList.remove('page-loading');
        });
        
    }, 60); // Minimal wait — views render instantly with skeletons
}
