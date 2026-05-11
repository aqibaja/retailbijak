window.__rbk_log && window.__rbk_log('router.js module loaded', true);
import { clearViewTimers } from './utils/view_timers.js?v=202605120001';
import { setPageMeta } from './api.js?v=202605120001';

// Route meta descriptions
const ROUTE_META = {
  dashboard: { title: 'RetailBijak — Dashboard Pasar IDX', desc: 'Pantau IHSG, breadth pasar, top movers, dan AI Picks dalam satu layar. Dashboard real-time untuk analisis saham IDX.' },
  screener: { title: 'RetailBijak — Pemindai Saham IDX', desc: 'Scan saham IDX dengan filter teknikal real-time. Temukan peluang trading berdasarkan RSI, MACD, volume, dan pola harga.' },
  market: { title: 'RetailBijak — Ikhtisar Pasar IDX', desc: 'Lihat pergerakan IHSG, sektoral, top movers, breadth, dan data pasar saham Indonesia secara lengkap.' },
  treemap: { title: 'RetailBijak — Treemap Pasar IDX', desc: 'Visualisasi treemap seluruh pasar IDX berdasarkan sektor — ukuran = kapitalisasi pasar, warna = perubahan harga.' },
  portfolio: { title: 'RetailBijak — Portofolio & Watchlist', desc: 'Kelola portofolio saham IDX, catat transaksi, pantau P&L, dan tracking watchlist saham pilihan Anda.' },
  watchlist: { title: 'RetailBijak — Watchlist', desc: 'Daftar pantauan saham IDX. Pantau harga dan sinyal saham favorit dalam satu tempat.' },
  news: { title: 'RetailBijak — Berita Pasar', desc: 'Berita pasar saham Indonesia dan IDX terbaru. Update berita emiten, sektor, dan analisa pasar.' },
  settings: { title: 'RetailBijak — Pengaturan', desc: 'Atur preferensi tampilan, API key OpenRouter, dan konfigurasi platform RetailBijak.' },
  help: { title: 'RetailBijak — Bantuan', desc: 'Panduan penggunaan RetailBijak: cara menggunakan screener, portfolio, AI analysis, dan fitur lainnya.' },
  ai_picks: { title: 'RetailBijak — AI Picks', desc: 'Rekomendasi saham IDX berbasis AI. Temukan kandidat saham swing trading dengan analisis otomatis.' },
  compare: { title: 'RetailBijak — Perbandingan Saham', desc: 'Bandingkan kinerja saham IDX secara side-by-side. Lihat perbandingan teknikal dan fundamental.' },
  backtest: { title: 'RetailBijak — Backtesting', desc: 'Uji strategi trading saham IDX dengan data historis. Backtest sinyal teknikal untuk optimasi entry dan exit.' },
  paper_trades: { title: 'RetailBijak — Paper Trading', desc: 'Simulasi trading saham IDX tanpa risiko. Latih strategi dengan modal virtual dan pantau performa.' },
  sector: { title: 'RetailBijak — Sektor Saham', desc: 'Lihat daftar saham IDX berdasarkan sektor. Analisis performa sektoral dan daftar emiten.' },
  breadth: { title: 'RetailBijak — Market Breadth', desc: 'Analisis market breadth IDX: advance-decline line, cumulative breadth, gainers/decliners ratio.' },
  signal_overview: { title: 'RetailBijak — Signal Overview', desc: 'Pantau semua sinyal trading terkini dari seluruh saham IDX. Filter BUY/SELL berdasarkan data teknikal.' },
  alerts: { title: 'RetailBijak — Alert Harga', desc: 'Buat dan kelola alert harga saham IDX. Dapatkan notifikasi otomatis saat harga atau RSI mencapai level tertentu.' },
  movers: { title: 'RetailBijak — Market Movers', desc: 'Lihat saham IDX dengan pergerakan terbesar: gainers, losers, dan most active dengan multi-timeframe performance.' },
  calendar: { title: 'RetailBijak — Kalender Pasar', desc: 'Kalender dividen, laba, dan aksi korporasi saham IDX.' },
  corporate: { title: 'RetailBijak — Aksi Korporasi', desc: 'IPO, rights issue, stock split, dividen, dan aksi korporasi saham IDX.' },
  ipo: { title: 'RetailBijak — IPO Pipeline Tracker', desc: 'Pantau IPO saham IDX — listing mendatang dan performa pasca-listing.' },
  chart: { title: 'RetailBijak — Chart', desc: 'Full-screen chart saham IDX dengan drawing tools dan multiple timeframe.' },
  macro: { title: 'RetailBijak — Macro & Ekonomi', desc: 'Indikator makroekonomi Indonesia: BI Rate, Inflasi, GDP, Neraca Dagang, dan Cadangan Devisa.' },
  indices: { title: 'RetailBijak — Indeks IDX', desc: 'Pantau konstituen dan performa indeks saham IDX: LQ45, IDX30, KOMPAS100, IDX80, IDXESGL.' },
  dividends: { title: 'RetailBijak — Dividend Dashboard & Kalkulator', desc: 'Pantau dividen saham IDX, hitung estimasi pendapatan dividen, dan temukan dividend aristocrats.' },
  sector_rotation: { title: 'RetailBijak — Rotasi Sektor Heatmap', desc: 'Heatmap rotasi sektor IDX — lihat perbandingan performa 1d, 5d, 1m, 3m dan momentum score antar sektor.' },
};

// Dynamic view registry — lazy import per route (1.7.1)
const viewModules = {
  dashboard: () => import('./views/dashboard.js?v=202605120001'),
  stock_detail: () => import('./views/stock_detail.js?v=202605120001'),
  screener: () => import('./views/screener.js?v=202605120001'),
  portfolio: () => import('./views/portfolio.js?v=202605120001'),
  market: () => import('./views/market.js?v=202605120001'),
  treemap: () => import('./views/treemap.js?v=202605120001'),
  compare: () => import('./views/compare.js?v=202605120001'),
  backtest: () => import('./views/backtest.js?v=202605120001'),
  paper_trades: () => import('./views/paper_trades.js?v=202605120001'),
  news: () => import('./views/news.js?v=202605120001'),
  settings: () => import('./views/settings.js?v=202605120001'),
  help: () => import('./views/help.js?v=202605120001'),
  ai_picks: () => import('./views/ai_picks.js?v=202605120001'),
  sector: () => import('./views/sector.js?v=202605120001'),
  breadth: () => import('./views/breadth.js?v=202605120001'),
  signal_overview: () => import('./views/signal_overview.js?v=202605120001'),
  alerts: () => import('./views/alerts.js?v=202605120001'),
  movers: () => import('./views/movers.js?v=202605120001'),
  calendar: () => import('./views/calendar.js?v=202605120001'),
  corporate: () => import('./views/corporate.js?v=202605120001'),
  ipo: () => import('./views/ipo.js?v=202605120001'),
  chart: () => import('./views/chart.js?v=202605120001'),
  indices: () => import('./views/indices.js?v=202605120001'),
  dividends: () => import('./views/dividend.js?v=202605120001'),
  macro: () => import('./views/macro.js?v=202605120001'),
  sector_rotation: () => import('./views/sector.js?v=202605120001'),
};
const viewCache = {};

let routeToken = 0;

function normalizeRoute(hash) {
    const raw = String(hash || '').trim();
    const path = raw.replace(/^#\/?/, '') || 'dashboard';
    const cleanPath = path.split(/[?&]/)[0] || 'dashboard';
    return cleanPath;
}

// Map route name with dashes to underscore keys in viewModules/ROUTE_META
function routeToViewKey(route) {
    return route.replace(/-/g, '_');
}

export function handleRoute(hash) {
    const root = document.getElementById('app-root');
    if (!root) return;

    // Clear any view-specific timers/intervals from previous view
    clearViewTimers();

    const cleanPath = normalizeRoute(hash);
    const [view, ...rest] = cleanPath.split('/');
    let baseRoute = view || 'dashboard';
    const viewKey = routeToViewKey(baseRoute);
    const currentToken = ++routeToken;

    // Set page meta tags (SEO description, OG, canonical)
    const stockTicker = viewKey === 'stock' ? (rest[0] || '').toUpperCase() : null;
    if (stockTicker) {
      setPageMeta(
        `RetailBijak — ${stockTicker}`,
        `Analisis saham ${stockTicker} IDX: harga real-time, technical analysis RSI/MACD, data fundamental, broker activity, dan sinyal trading terbaru.`,
        `/stock/${stockTicker}`
      );
    } else {
      const routeMeta = ROUTE_META[viewKey] || ROUTE_META.dashboard;
      setPageMeta(routeMeta.title, routeMeta.desc, cleanPath);
    }

    // Update active state in desktop and mobile nav
    document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(el => {
        const targetView = el.getAttribute('data-view');
        if (targetView) {
            const isActive = targetView === viewKey;
            el.classList.toggle('active', isActive);
            if (isActive) el.setAttribute('aria-current', 'page');
            else el.removeAttribute('aria-current');
        }
    });

    // Fade out transition
    root.classList.add('page-loading');
    root.dataset.routePath = cleanPath;
    root.dataset.activeView = viewKey;

    // Safety: force-remove page-loading after 3s to prevent stuck blank
    const safetyTimer = setTimeout(() => {
        root.classList.remove('page-loading');
    }, 3000);

    window.setTimeout(async () => {
        if (currentToken !== routeToken) return;
        // Clear the safety timer since we're about to remove it ourselves
        clearTimeout(safetyTimer);
        // Hapus page-loading SEBELUM render — konten & skeleton langsung kelihatan
        root.classList.remove('page-loading');
        // DEBUG: tanda router jalan
        if (!root.querySelector('#rbk-router-marker')) {
            const m = document.createElement('div');
            m.id = 'rbk-router-marker';
            m.style.cssText = 'position:fixed;bottom:70px;right:10px;z-index:99998;background:rgba(16,185,129,0.9);color:#fff;padding:4px 10px;border-radius:6px;font:12px monospace';
            m.textContent = 'R: ' + viewKey;
            document.body.appendChild(m);
        }
        try {
            window.scrollTo({ top: 0, behavior: 'instant' });
        } catch {
            window.scrollTo(0, 0);
        }

        try {
            // Dynamic import per route (1.7.1)
            const loadAndRender = async () => {
              // Portfolio covers both #portfolio and #watchlist
              if (viewKey === 'portfolio' || viewKey === 'watchlist') {
                const mod = viewCache.portfolio || await viewModules.portfolio();
                viewCache.portfolio = mod;
                return mod.renderPortfolio(root, viewKey);
              }
              if (viewKey === 'paper_trades') {
                const mod = viewCache.paper_trades || await viewModules.paper_trades();
                viewCache.paper_trades = mod;
                return mod.renderPaperTrades(root);
              }
              if (viewKey === 'sector' && rest[0]) {
                const mod = viewCache.sector || await viewModules.sector();
                viewCache.sector = mod;
                return mod.renderSector(root, rest[0]);
              }
              if (viewKey === 'sector') {
                const mod = viewCache.sector || await viewModules.sector();
                viewCache.sector = mod;
                return mod.renderSectors(root);
              }
              if (viewKey === 'stock' && rest[0]) {
                const mod = viewCache.stock_detail || await viewModules.stock_detail();
                viewCache.stock_detail = mod;
                return mod.renderStockDetail(root, rest[0]);
              }
              if (viewKey === 'chart' && rest[0]) {
                const mod = viewCache.chart || await viewModules.chart();
                viewCache.chart = mod;
                return mod.renderChart(root, rest[0]);
              }
              if (viewKey === 'screener') {
                const mod = viewCache.screener || await viewModules.screener();
                return mod.renderScreener(root);
              }
              // Generic handler for any registered view module
              const loadView = viewModules[viewKey];
              if (loadView) {
                const mod = viewCache[viewKey] || await loadView();
                viewCache[viewKey] = mod;
                const renderFnName = `render${viewKey.charAt(0).toUpperCase() + viewKey.slice(1).replace(/_([a-z])/g, (_, c) => c.toUpperCase())}`;
                const renderFn = mod[renderFnName];
                if (renderFn) return renderFn(root);
              }
              // Fallback to dashboard
              const dash = viewCache.dashboard || await viewModules.dashboard();
              viewCache.dashboard = dash;
              return dash.renderDashboard(root);
            };
            await loadAndRender();

            // Re-initialize icons for newly injected HTML

            // View content entrance animation
            if (currentToken === routeToken) root.classList.add('view-content');

        } catch (err) {
            console.error(`[Router] Failed to render ${viewKey}:`, err);
            root.classList.remove('page-loading');
            root.innerHTML = `
              <div class="empty-state-card" style="min-height:60vh">
                <div class="empty-state-icon">⚠️</div>
                <strong class="empty-state-title">Gagal Memuat ${routeToViewKey(baseRoute) || 'Halaman'}</strong>
                <span class="empty-state-desc">${err.message || 'Terjadi kesalahan saat memuat halaman.'}</span>
                <button type="button" class="empty-state-action" onclick="location.reload()">
                  <i data-lucide="refresh-cw" class="lucide-md"></i> Coba Lagi
                </button>
              </div>
            `;
        }

        // Fade in
        if (root.classList.contains('page-loading')) {
          requestAnimationFrame(() => {
              if (currentToken === routeToken) root.classList.remove('page-loading');
          });
        }

    }, 60); // Minimal wait — views render instantly with skeletons
}
