import { renderDashboard } from './views/dashboard.js';
import { renderStockDetail } from './views/stock_detail.js';
import { renderScreener } from './views/screener.js';
import { renderPortfolio } from './views/portfolio.js';

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

    // Routing logic
    if (path === '' || path === 'dashboard') {
        renderDashboard(root);
    } else if (path.startsWith('stock/')) {
        const ticker = path.split('/')[1];
        renderStockDetail(root, ticker);
    } else if (path === 'screener') {
        renderScreener(root);
    } else if (path === 'portfolio' || path === 'watchlist') {
        renderPortfolio(root, path); // pass 'portfolio' or 'watchlist' as active tab
    } else {
        root.innerHTML = `
            <div style="text-align:center; padding: 60px;">
                <h2>Page Not Found</h2>
                <p style="color:var(--color-text-muted)">The view "${path}" is under construction.</p>
            </div>
        `;
    }
}
