import { setLocale, applyTranslations, getLocale } from './i18n.js?v=20260518L';

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
        langToggleBtn.addEventListener('click', async () => {
            currentLang = currentLang === 'en' ? 'id' : 'en';
            localStorage.setItem('retailbijak.locale', currentLang);
            localStorage.setItem('retail-lang', currentLang);
            await setLocale(currentLang);
            updateLangBtn();
            // Re-render active route with new locale
            if (window.handleRoute) {
                window.handleRoute(window.location.hash || '#dashboard');
            } else {
                window.location.reload();
            }
        });
    }
}

