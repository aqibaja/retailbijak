import { setLanguage, applyTranslations } from './i18n.js?v=20260508B';

const THEMES = ['dark', 'light', 'amoled'];

export function initTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const langToggleBtn = document.getElementById('lang-toggle');
    const htmlEl = document.documentElement;

    let saved = localStorage.getItem('retail-theme') || 'dark';
    if (!THEMES.includes(saved)) saved = 'dark';
    let currentLang = localStorage.getItem('retail-lang') || 'id';

    function applyTheme() {
        htmlEl.setAttribute('data-theme', saved);
        const icons = { dark: '<i data-lucide="sun"></i>', light: '<i data-lucide="moon"></i>', amoled: '<i data-lucide="moon-star"></i>' };
        if (themeToggleBtn) themeToggleBtn.innerHTML = icons[saved] || icons.dark;
        localStorage.setItem('retail-theme', saved);
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
            const idx = THEMES.indexOf(saved);
            saved = THEMES[(idx + 1) % THEMES.length];
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

