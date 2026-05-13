import { setLanguage, applyTranslations } from './i18n.js';

// 32.3.2 — Fixed: 2 modes only (light/dark), no amoled
const THEMES = ['dark', 'light'];

export function initTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const langToggleBtn = document.getElementById('lang-toggle');
    const htmlEl = document.documentElement;

    // 32.3.2 — read from canonical key 'retailbijak.theme', fall back to legacy 'retail-theme'
    // Migrate old 'amoled' to 'dark' for backward compatibility
    let saved = localStorage.getItem('retailbijak.theme')
             || localStorage.getItem('retail-theme')
             || 'dark';
    if (!THEMES.includes(saved)) {
        // Migrate legacy 'amoled' to 'dark'
        saved = saved === 'amoled' ? 'dark' : 'dark';
    }
    let currentLang = localStorage.getItem('retail-lang') || 'id';

    function applyTheme() {
        htmlEl.setAttribute('data-theme', saved);
        // 32.3.2 — icon toggle: sun for dark mode, moon for light mode
        const icons = { dark: '<i data-lucide="sun"></i>', light: '<i data-lucide="moon"></i>' };
        if (themeToggleBtn) themeToggleBtn.innerHTML = icons[saved] || icons.dark;
        // 32.3.2 — persist to canonical key
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
            // 32.3.2 — toggle between dark ↔ light only
            saved = saved === 'dark' ? 'light' : 'dark';
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

