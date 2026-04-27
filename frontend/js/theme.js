export function initTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const htmlEl = document.documentElement;

    // Default to system preference or saved
    let isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    // (If using localStorage was allowed, we'd check it here, but specs said JS variable only. 
    // However, JS variable resets on reload, so system default is best.)

    function applyTheme() {
        if (isDark) {
            htmlEl.setAttribute('data-theme', 'dark');
            if (themeToggleBtn) {
                themeToggleBtn.innerHTML = '<i data-lucide="sun"></i>';
                lucide.createIcons();
            }
        } else {
            htmlEl.removeAttribute('data-theme');
            if (themeToggleBtn) {
                themeToggleBtn.innerHTML = '<i data-lucide="moon"></i>';
                lucide.createIcons();
            }
        }
    }

    applyTheme();

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            isDark = !isDark;
            applyTheme();
        });
    }
}
