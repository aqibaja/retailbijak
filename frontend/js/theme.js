export function initTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const htmlEl = document.documentElement;

    let isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

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
            // Rotate animation
            if (typeof gsap !== 'undefined') {
                gsap.to(themeToggleBtn, {
                    rotation: '+=180',
                    scale: 0.8,
                    duration: 0.2,
                    ease: 'power2.in',
                    onComplete: () => {
                        isDark = !isDark;
                        applyTheme();
                        gsap.to(themeToggleBtn, {
                            scale: 1,
                            duration: 0.2,
                            ease: 'back.out(1.7)'
                        });
                    }
                });
            } else {
                isDark = !isDark;
                applyTheme();
            }
        });
    }

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        isDark = e.matches;
        applyTheme();
    });
}
