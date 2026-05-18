import { setLocale, applyTranslations, getLocale } from './i18n.js?v=20260518F';

export function initTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const langToggleBtn = document.getElementById('lang-toggle');
    const htmlEl = document.documentElement;

    let isDark = localStorage.getItem('retail-theme') === 'dark' || localStorage.getItem('retail-theme') === null;
    // Sync: support both key names, prefer 'retailbijak.locale'
    let currentLang = localStorage.getItem('retailbijak.locale') || localStorage.getItem('retail-lang') || 'id';

    function applyTheme() {
        if (isDark) {
            htmlEl.setAttribute('data-theme', 'dark');
            if (themeToggleBtn) themeToggleBtn.innerHTML = '<i data-lucide="sun"></i>';
        } else {
            htmlEl.setAttribute('data-theme', 'light');
            if (themeToggleBtn) themeToggleBtn.innerHTML = '<i data-lucide="moon"></i>';
        }
        localStorage.setItem('retail-theme', isDark ? 'dark' : 'light');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    function updateLangBtn() {
        if (langToggleBtn) {
            langToggleBtn.innerHTML = `<span class="lang-toggle-text">${currentLang.toUpperCase()}</span>`;
        }
    }

    applyTheme();
    updateLangBtn();
    applyTranslations();

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            isDark = !isDark;
            applyTheme();
        });
    }

    if (langToggleBtn) {
        langToggleBtn.addEventListener('click', () => {
            currentLang = currentLang === 'en' ? 'id' : 'en';
            // Sync both localStorage keys
            localStorage.setItem('retailbijak.locale', currentLang);
            localStorage.setItem('retail-lang', currentLang);
            setLocale(currentLang);
            updateLangBtn();
            // Re-render current view after locale loads (wait for fetch)
            setTimeout(() => {
                // Update window.t with new locale's t()
                if (window.__i18n_t) window.t = window.__i18n_t;
                // Re-render active route
                if (window.handleRoute) {
                    window.handleRoute(window.location.hash || '#dashboard');
                } else {
                    // Fallback: reload page
                    window.location.reload();
                }
            }, 300);
        });
    }
}

