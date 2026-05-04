import { setLanguage, applyTranslations } from './i18n.js';

export function initTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const langToggleBtn = document.getElementById('lang-toggle');
    const htmlEl = document.documentElement;

    let isDark = localStorage.getItem('retail-theme') === 'dark' || localStorage.getItem('retail-theme') === null;
    let currentLang = localStorage.getItem('retail-lang') || 'en';

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
            langToggleBtn.innerHTML = `<span style="font-size:12px;font-weight:700">${currentLang.toUpperCase()}</span>`;
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

