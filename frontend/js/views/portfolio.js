import { animateCards, animateTableRows } from '../main.js';
import { fetchWatchlist, saveWatchlistItem, deleteWatchlistItem, fetchPortfolio, savePortfolioPosition, deletePortfolioPosition, showToast } from '../api.js';

export async function renderPortfolio(root, activeTab) {
    const isPort = activeTab === 'portfolio';
    root.innerHTML = `
      <section class="section-grid reveal">
        <div class="card">
          <div class="flex-between mb-3"><div><h1 class="mb-2">Holdings & Watchlist</h1><p class="muted">Kelola aset yang dipantau dan posisi aktif dalam satu workspace yang bersih.</p></div></div>
          <div class="tab-strip mobile-stack"><a href="#portfolio" class="tab ${isPort ? 'active' : ''}">Portfolio</a><a href="#watchlist" class="tab ${!isPort ? 'active' : ''}">Watchlist</a></div>
          <div id="tab-content" class="panel panel-tight"></div>
        </div>
      </section>`;

    if (isPort) await renderPortfolioTab(root.querySelector('#tab-content'));
    else await renderWatchlistTab(root.querySelector('#tab-content'));
    lucide.createIcons();
    animateCards('.card');
    const tbody = root.querySelector('tbody'); if (tbody) animateTableRows(tbody);
}

const FALLBACK_WATCHLIST = [
    { ticker: 'BBCA', notes: 'Core holding, strong liquidity, defensive name.' },
    { ticker: 'ASII', notes: 'Auto recovery + cyclical rebound watch.' },
    { ticker: 'TLKM', notes: 'Dividend + stabilizer for portfolio balance.' },
    { ticker: 'ANTM', notes: 'Commodity beta, watch for volume expansion.' },
];

const FALLBACK_PORTFOLIO = [
    { ticker: 'BBRI', lots: 18, avg_price: 4710 },
    { ticker: 'UNVR', lots: 12, avg_price: 2960 },
    { ticker: 'PGAS', lots: 28, avg_price: 1385 },
    { ticker: 'BMRI', lots: 10, avg_price: 6150 },
];

async function renderWatchlistTab(el) {
    const data = await fetchWatchlist();
    const rows = Array.isArray(data?.data) && data.data.length ? data.data : FALLBACK_WATCHLIST;
    el.innerHTML = `<div class="panel-head"><h3>My Watchlist (${rows.length})</h3><button id="add-watchlist" class="btn btn-primary"><i data-lucide="plus"></i> Add Ticker</button></div><div class="data-table-wrapper"><table class="data-table"><thead><tr><th>Ticker</th><th>Notes</th><th>Action</th></tr></thead><tbody>${rows.map((row) => `<tr><td><a href="#stock/${row.ticker}" class="mono strong">${row.ticker}</a></td><td>${row.notes || '-'}</td><td><button class="icon-btn delete-watchlist" data-ticker="${row.ticker}" aria-label="Delete ${row.ticker}"><i data-lucide="trash-2"></i></button></td></tr>`).join('')}</tbody></table></div><div class="notice-box mt-3">Ini tampilan dummy sementara supaya halaman tetap hidup saat data backend belum ada.</div>`;
    el.querySelector('#add-watchlist').addEventListener('click', async () => {
        const ticker = window.prompt('Ticker (contoh: BBCA):', 'BBCA'); if (!ticker) return;
        const notes = window.prompt('Catatan (opsional):', '') || '';
        const res = await saveWatchlistItem({ ticker, notes }); if (res?.ok) { showToast('Watchlist saved', 'success'); await renderWatchlistTab(el); lucide.createIcons(); }
    });
    el.querySelectorAll('.delete-watchlist').forEach((btn) => btn.addEventListener('click', async () => {
        const res = await deleteWatchlistItem(btn.dataset.ticker);
        if (res?.ok) { showToast(`Removed ${btn.dataset.ticker}`, 'success'); await renderWatchlistTab(el); lucide.createIcons(); }
    }));
}

async function renderPortfolioTab(el) {
    const data = await fetchPortfolio();
    const rows = Array.isArray(data?.data) && data.data.length ? data.data : FALLBACK_PORTFOLIO;
    el.innerHTML = `<div class="panel-head"><h3>Current Holdings (${rows.length})</h3><button id="add-portfolio" class="btn btn-primary"><i data-lucide="plus"></i> Add Position</button></div><div class="data-table-wrapper"><table class="data-table"><thead><tr><th>Ticker</th><th>Lots</th><th>Avg Price</th><th>Action</th></tr></thead><tbody>${rows.map((row) => `<tr><td><a href="#stock/${row.ticker}" class="mono strong">${row.ticker}</a></td><td class="mono">${row.lots}</td><td class="mono">${Number(row.avg_price).toLocaleString()}</td><td><button class="icon-btn delete-portfolio" data-ticker="${row.ticker}" aria-label="Delete ${row.ticker}"><i data-lucide="trash-2"></i></button></td></tr>`).join('')}</tbody></table></div><div class="notice-box mt-3">Portfolio dummy dipakai sampai backend punya posisi nyata.</div>`;
    el.querySelector('#add-portfolio').addEventListener('click', async () => {
        const ticker = window.prompt('Ticker (contoh: BBCA):', 'BBCA'); if (!ticker) return;
        const lots = Number(window.prompt('Lots:', '1')); const avgPrice = Number(window.prompt('Average price:', '1000'));
        if (!lots || !avgPrice) return showToast('Lots dan avg price wajib valid', 'error');
        const res = await savePortfolioPosition({ ticker, lots, avg_price: avgPrice });
        if (res?.ok) { showToast('Portfolio saved', 'success'); await renderPortfolioTab(el); lucide.createIcons(); }
    });
    el.querySelectorAll('.delete-portfolio').forEach((btn) => btn.addEventListener('click', async () => {
        const res = await deletePortfolioPosition(btn.dataset.ticker);
        if (res?.ok) { showToast(`Removed ${btn.dataset.ticker}`, 'success'); await renderPortfolioTab(el); lucide.createIcons(); }
    }));
}
