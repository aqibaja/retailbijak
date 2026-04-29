import { animateCards, animateTableRows } from '../main.js';
import { fetchWatchlist, saveWatchlistItem, deleteWatchlistItem, fetchPortfolio, savePortfolioPosition, deletePortfolioPosition, showToast } from '../api.js';

export async function renderPortfolio(root, activeTab) {
    const isPort = activeTab === 'portfolio';
    root.innerHTML = `
      <section class="reveal">
        <div class="card mb-6">
          <div class="flex justify-between items-center">
            <div>
              <h1 style="font-size: 24px; font-weight: 700;">Assets & Watchlist</h1>
              <p style="color: var(--text-muted); font-size: 14px;">Monitor your holdings and potential opportunities</p>
            </div>
            <div style="display:flex; gap:4px; background:rgba(255,255,255,0.03); padding:4px; border-radius:10px; border:1px solid var(--border);">
              <a href="#portfolio" class="btn ${isPort ? 'btn-primary' : ''}" style="border:none; border-radius:8px; font-size:12px; min-width:100px; color:${isPort?'#000':'#94a3b8'};">Portfolio</a>
              <a href="#watchlist" class="btn ${!isPort ? 'btn-primary' : ''}" style="border:none; border-radius:8px; font-size:12px; min-width:100px; color:${!isPort?'#000':'#94a3b8'};">Watchlist</a>
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

async function renderWatchlistTab(el) {
    const data = await fetchWatchlist();
    const rows = data?.data || [];
    el.innerHTML = `
      <div class="card">
        <div class="flex justify-between items-center mb-6">
          <h3 class="strong">My Watchlist</h3>
          <button id="add-watchlist" class="btn btn-primary" style="padding:6px 12px;"><i data-lucide="plus"></i></button>
        </div>
        <div class="data-table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>Ticker</th><th>Notes</th><th style="text-align:right">Action</th></tr>
            </thead>
            <tbody>
              ${rows.length ? rows.map(r => `
                <tr>
                  <td class="mono strong" style="color:var(--primary);">${r.ticker}</td>
                  <td style="color:var(--text-muted); font-size:13px;">${r.notes || '-'}</td>
                  <td style="text-align:right">
                    <button class="btn delete-watchlist" data-ticker="${r.ticker}" style="padding:4px 8px; border-color:var(--danger); color:var(--danger); background:none;"><i data-lucide="trash-2" style="width:14px;"></i></button>
                  </td>
                </tr>`).join('') : '<tr><td colspan="3" style="text-align:center; padding:40px; color:var(--text-dim);">Watchlist is empty.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;

    animateTableRows(el.querySelector('tbody'));
    el.querySelector('#add-watchlist').addEventListener('click', async () => {
        const ticker = window.prompt('Ticker:'); if (!ticker) return;
        await saveWatchlistItem({ ticker, notes: '' });
        renderWatchlistTab(el);
    });
}

async function renderPortfolioTab(el) {
    const data = await fetchPortfolio();
    const rows = data?.data || [];
    el.innerHTML = `
      <div class="card">
        <div class="flex justify-between items-center mb-6">
          <h3 class="strong">Current Holdings</h3>
          <button id="add-portfolio" class="btn btn-primary" style="padding:6px 12px;"><i data-lucide="plus"></i></button>
        </div>
        <div class="data-table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>Ticker</th><th>Lots</th><th>Avg Price</th><th style="text-align:right">Action</th></tr>
            </thead>
            <tbody>
              ${rows.length ? rows.map(r => `
                <tr>
                  <td class="mono strong" style="color:var(--primary);">${r.ticker}</td>
                  <td class="mono">${r.lots}</td>
                  <td class="mono">Rp ${r.avg_price.toLocaleString()}</td>
                  <td style="text-align:right">
                    <button class="btn delete-portfolio" data-ticker="${r.ticker}" style="padding:4px 8px; border-color:var(--danger); color:var(--danger); background:none;"><i data-lucide="trash-2" style="width:14px;"></i></button>
                  </td>
                </tr>`).join('') : '<tr><td colspan="4" style="text-align:center; padding:40px; color:var(--text-dim);">No portfolio positions found.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;

    animateTableRows(el.querySelector('tbody'));
}
