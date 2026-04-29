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
    const path = hash.replace('#', '');
    
    // Update active nav state
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => {
        el.classList.remove('active');
    });
    
    const baseRoute = path.split('/')[0];
    const navItem = document.querySelector(`.sidebar-nav .nav-item[data-view="${baseRoute}"]`);
    if (navItem) navItem.classList.add('active');

    // Page transition animation
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (!prefersReducedMotion && typeof gsap !== 'undefined') {
        // Fade out
        gsap.to(root, {
            opacity: 0,
            duration: 0.15,
            onComplete: () => {
                renderView(root, path);
                // Fade in
                gsap.fromTo(root,
                    { opacity: 0 },
                    { opacity: 1, duration: 0.2, ease: 'power2.out' }
                );
            }
        });
    } else {
        renderView(root, path);
    }
}

function renderView(root, path) {
    if (path === '' || path === 'dashboard') {
        renderDashboard(root);
    } else if (path.startsWith('stock/')) {
        const ticker = path.split('/')[1];
        renderStockDetail(root, ticker);
    } else if (path === 'market') {
        renderMarket(root);
    } else if (path === 'screener') {
        renderScreener(root);
    } else if (path === 'portfolio' || path === 'watchlist') {
        renderPortfolio(root, path);
    } else if (path === 'news') {
        renderNews(root);
    } else if (path === 'settings') {
        renderSettings(root);
    } else if (path === 'help') {
        renderHelp(root);
    } else {
        root.innerHTML = `
            <div style="text-align:center; padding:60px;">
                <h2>Page Not Found</h2>
                <p style="color:var(--color-text-muted); margin-top:8px;">The view "${path}" is under construction.</p>
            </div>
        `;
    }
}
