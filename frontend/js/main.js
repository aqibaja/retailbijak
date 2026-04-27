import { initTheme } from './theme.js';
import { handleRoute } from './router.js';

// Initialize Lucide icons
lucide.createIcons();

// Initialize Theme (Light/Dark)
initTheme();

// Listen for hash changes for routing
window.addEventListener('hashchange', () => {
    handleRoute(window.location.hash);
});

// Initial route
if (!window.location.hash) {
    window.location.hash = '#dashboard';
} else {
    handleRoute(window.location.hash);
}
