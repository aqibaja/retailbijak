import { animateCards, animateTableRows } from '../main.js';
import { fetchWatchlist, saveWatchlistItem, deleteWatchlistItem, fetchPortfolio, savePortfolioPosition, deletePortfolioPosition, showToast } from '../api.js';

export async function renderPortfolio(root, activeTab) {
    const isPort = activeTab === 'portfolio';
    root.innerHTML = `
      <section class="section-grid reveal">
        <div class="card mb-4">
          <div class="flex-between">
            <div>
              <h1 class="mb-2">Holdings & Watchlist</h1>
              <p class="muted">Kelola aset yang dipantau dan posisi aktif Anda.</p>
            </div>
            <div style="display:flex; gap:8px; background:var(--surface-elevated); padding:4px; border-radius:var(--radius-md);">
              <a href="#portfolio" class="btn ${isPort ? 'btn-primary' : 'btn-outline'}" style="padding: 6px 16px; border:none;">Portfolio</a>
              <a href="#watchlist" class="btn ${!isPort ? 'btn-primary' : 'btn-outline'}" style="padding: 6px 16px; border:none;">Watchlist</a>
            </div>
          </div>
        </div>

        <div id="tab-content"></div>
      </section>`;

    if (isPort) await renderPortfolioTab(root.querySelector('#tab-content'));
    else await renderWatchlistTab(root.querySelector('#tab-content'));
    lucide.createIcons();
    animateCards('.card');
}

const FALLBACK_WATCHLIST = [
    { ticker: 'BBCA', notes: 'Core holding, strong liquidity.' },
    { ticker: 'ASII', notes: 'Auto recovery watch.' },
    { ticker: 'TLKM', notes: 'Dividend play.' },
];

const FALLBACK_PORTFOLIO = [
    { ticker: 'BBRI', lots: 18, avg_price: 4710 },
    { ticker: 'UNVR', lots: 12, avg_price: 2960 },
    { ticker: 'PGAS', lots: 28, avg_price: 1385 },
];

async function renderWatchlistTab(el) {
    const data = await fetchWatchlist();
    const rows = Array.isArray(data?.data) && data.data.length ? data.data : FALLBACK_WATCHLIST;
    el.innerHTML = `
      <div class="card">
        <div class="flex-between mb-4">
          <h3 class="mb-0">My Watchlist (${rows.length})</h3>
          <button id="add-watchlist" class="btn btn-outline" style="padding:6px 12px;"><i data-lucide="plus"></i></button>
        </div>
        <div class="data-table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>Ticker</th><th>Notes</th><th style="text-align:right">Action</th></tr>
            </thead>
            <tbody id="watchlist-tbody">
              ${rows.map((row) => `
                <tr>
                  <td><a href="#stock/${row.ticker}" class="mono strong">${row.ticker}</a></td>
                  <td class="muted">${row.notes || '-'}</td>
                  <td style="text-align:right">
                    <button class="btn btn-outline delete-watchlist" data-ticker="${row.ticker}" style="padding:4px 8px; color:var(--danger);"><i data-lucide="trash-2"></i></button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

    animateTableRows(el.querySelector('tbody'));

    el.querySelector('#add-watchlist').addEventListener('click', async () => {
        const ticker = window.prompt('Ticker:', 'BBCA'); if (!ticker) return;
        const notes = window.prompt('Notes:', '') || '';
        const res = await saveWatchlistItem({ ticker, notes }); 
        if (res?.ok) { showToast('Watchlist saved', 'success'); renderWatchlistTab(el); }
    });
}

async function renderPortfolioTab(el) {
    const data = await fetchPortfolio();
    const rows = Array.isArray(data?.data) && data.data.length ? data.data : FALLBACK_PORTFOLIO;
    el.innerHTML = `
      <div class="card">
        <div class="flex-between mb-4">
          <h3 class="mb-0">Current Holdings (${rows.length})</h3>
          <button id="add-portfolio" class="btn btn-outline" style="padding:6px 12px;"><i data-lucide="plus"></i></button>
        </div>
        <div class="data-table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>Ticker</th><th>Lots</th><th>Avg Price</th><th style="text-align:right">Action</th></tr>
            </thead>
            <tbody>
              ${rows.map((row) => `
                <tr>
                  <td><a href="#stock/${row.ticker}" class="mono strong">${row.ticker}</a></td>
                  <td class="mono">${row.lots}</td>
                  <td class="mono">Rp ${row.avg_price.toLocaleString()}</td>
                  <td style="text-align:right">
                    <button class="btn btn-outline delete-portfolio" data-ticker="${row.ticker}" style="padding:4px 8px; color:var(--danger);"><i data-lucide="trash-2"></i></button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

    animateTableRows(el.querySelector('tbody'));

    el.querySelector('#add-portfolio').addEventListener('click', async () => {
        const ticker = window.prompt('Ticker:', 'BBCA'); if (!ticker) return;
        const lots = Number(window.prompt('Lots:', '1'));
        const avgPrice = Number(window.prompt('Avg Price:', '1000'));
        const res = await savePortfolioPosition({ ticker, lots, avg_price: avgPrice });
        if (res?.ok) { showToast('Portfolio saved', 'success'); renderPortfolioTab(el); }
    });
}
