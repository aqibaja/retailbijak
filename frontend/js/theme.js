import { setLanguage, applyTranslations } from './i18n.js?v=20260507M';

export function initTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const langToggleBtn = document.getElementById('lang-toggle');
    const htmlEl = document.documentElement;

    let isDark;
    const saved = localStorage.getItem('retail-theme');
    if (saved) {
        isDark = saved === 'dark';
    } else {
        // Auto-detect system preference
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    let currentLang = localStorage.getItem('retail-lang') || 'id';

    function applyTheme() {
        if (isDark) {
            htmlEl.setAttribute('data-theme', 'dark');
            if (themeToggleBtn) themeToggleBtn.innerHTML = '<i data-lucide="sun"></i>';
        } else {
            htmlEl.setAttribute('data-theme', 'light');
            if (themeToggleBtn) themeToggleBtn.innerHTML = '<i data-lucide="moon"></i>';
        }
        localStorage.setItem('retail-theme', isDark ? 'dark' : 'light');
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
            setLanguage(currentLang);
            updateLangBtn();
        });
    }
}

