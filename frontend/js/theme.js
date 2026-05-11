import { setLanguage, applyTranslations } from './i18n.js?v=202605120200';

const THEMES = ['dark', 'light', 'amoled'];

export function initTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const langToggleBtn = document.getElementById('lang-toggle');
    const htmlEl = document.documentElement;

    // 32.3.1 — read from canonical key 'retailbijak.theme', fall back to legacy 'retail-theme'
    let saved = localStorage.getItem('retailbijak.theme')
             || localStorage.getItem('retail-theme')
             || 'dark';
    if (!THEMES.includes(saved)) saved = 'dark';
    let currentLang = localStorage.getItem('retail-lang') || 'id';

    function applyTheme() {
        htmlEl.setAttribute('data-theme', saved);
        const icons = { dark: '<i data-lucide="sun"></i>', light: '<i data-lucide="moon"></i>', amoled: '<i data-lucide="moon-star"></i>' };
        if (themeToggleBtn) themeToggleBtn.innerHTML = icons[saved] || icons.dark;
        // 32.3.1 — persist to canonical key
        localStorage.setItem('retailbijak.theme', saved);
        localStorage.setItem('retail-theme', saved); // keep legacy key in sync
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

