(async () => {
  try {
    const [{ handleRoute }, { fetchMarketSummary }, { initTheme }] = await Promise.all([
      import('./router.js?cache=20260430c'),
      import('./api.js?cache=20260430c'),
      import('./theme.js?cache=20260430c'),
    ]);
    window.__booted = true;
    function observeElements(selector = '.stagger-reveal') {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            setTimeout(() => entry.target.classList.add('is-visible'), i * 50);
            observer.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -50px 0px' });
      document.querySelectorAll(selector).forEach(el => observer.observe(el));
    }
    window.addEventListener('hashchange', () => handleRoute(window.location.hash));
    initTheme();
    handleRoute(window.location.hash || '#dashboard');
    setInterval(async () => { try { await fetchMarketSummary(); } catch {} }, 60000);
  } catch (e) {
    console.error('BOOT FAIL', e);
    window.__errors = (window.__errors || []).concat(String(e));
    const root = document.getElementById('app-root');
    if (root) root.innerHTML = `<div style="padding:24px;color:#ff6b6b">BOOT ERROR: ${String(e)}</div>`;
  }
})();
