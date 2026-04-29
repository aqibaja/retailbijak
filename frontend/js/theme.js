export function initTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const htmlEl = document.documentElement;

    let isDark = localStorage.getItem('retail-theme') !== 'light';

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

    applyTheme();

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            isDark = !isDark;
            applyTheme();
        });
    }
}
