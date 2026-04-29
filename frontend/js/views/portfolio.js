import { fetchWatchlist, saveWatchlistItem, deleteWatchlistItem, fetchPortfolio, savePortfolioPosition, deletePortfolioPosition, showToast } from '../api.js';
import { observeElements } from '../main.js';

export async function renderPortfolio(root, activeTab) {
    const isPort = activeTab === 'portfolio';
    root.innerHTML = `
      <section class="grid grid-cols-12 stagger-reveal">
        <div class="col-span-12 flex justify-between items-end mb-4">
          <div>
            <h1 class="text-2xl strong mb-2">Assets & Watchlist</h1>
            <p class="text-muted">Manage monitored assets and active positions</p>
          </div>
          <div class="flex p-1" style="background:var(--bg-elevated); border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
            <a href="#portfolio" class="btn ${isPort ? 'btn-primary' : ''}" style="border:none; padding:4px 16px; border-radius:var(--radius-sm); min-width:100px;">Portfolio</a>
            <a href="#watchlist" class="btn ${!isPort ? 'btn-primary' : ''}" style="border:none; padding:4px 16px; border-radius:var(--radius-sm); min-width:100px;">Watchlist</a>
          </div>
        </div>

        <div id="tab-content" class="col-span-12 panel flex-col" style="padding:0;">
            <div class="p-4" style="text-align:center;"><div class="skeleton skel-text" style="width:200px; margin:auto;"></div></div>
        </div>
      </section>`;

    observeElements();
    if (isPort) await renderPortfolioTab(root.querySelector('#tab-content'));
    else await renderWatchlistTab(root.querySelector('#tab-content'));
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function renderWatchlistTab(el) {
    const data = await fetchWatchlist();
    const rows = data?.data || [
        { ticker: 'BBCA', notes: 'Core defensive holding.' },
        { ticker: 'ASII', notes: 'Auto recovery cycle.' }
    ];
    
    el.innerHTML = `
      <div class="flex justify-between items-center p-4" style="border-bottom:1px solid var(--border-subtle);">
        <h3 class="text-sm uppercase text-muted strong">My Watchlist <span class="badge ml-2">${rows.length} ITEMS</span></h3>
        <button id="add-watchlist" class="btn btn-primary" style="padding:6px 12px; font-size:11px;"><i data-lucide="plus" style="width:14px;"></i> NEW</button>
      </div>
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr><th>Ticker</th><th>Notes</th><th style="text-align:right">Action</th></tr>
          </thead>
          <tbody>
            ${rows.length ? rows.map(r => `
              <tr>
                <td class="mono strong text-up" style="width:120px;">
                    <a href="#stock/${r.ticker}" class="flex items-center gap-2"><span style="width:20px;height:20px;background:var(--bg-elevated);border-radius:4px;display:grid;place-items:center;font-size:8px;">${r.ticker[0]}</span> ${r.ticker}</a>
                </td>
                <td class="text-muted text-sm">${r.notes || '-'}</td>
                <td style="text-align:right; width:80px;">
                  <button class="btn-icon delete-watchlist" data-ticker="${r.ticker}" style="color:var(--down-color);"><i data-lucide="trash-2" style="width:16px;"></i></button>
                </td>
              </tr>`).join('') : '<tr><td colspan="3" class="text-center p-4 text-dim">Watchlist is empty.</td></tr>'}
          </tbody>
        </table>
      </div>`;

    el.querySelector('#add-watchlist').addEventListener('click', async () => {
        const ticker = window.prompt('Ticker (e.g. BBCA):'); if (!ticker) return;
        const notes = window.prompt('Notes:', '') || '';
        await saveWatchlistItem({ ticker: ticker.toUpperCase(), notes });
        renderWatchlistTab(el);
    });
}

async function renderPortfolioTab(el) {
    const data = await fetchPortfolio();
    const rows = data?.data || [
        { ticker: 'BBRI', lots: 18, avg_price: 4710 },
        { ticker: 'TLKM', lots: 50, avg_price: 3420 }
    ];
    
    el.innerHTML = `
      <div class="flex justify-between items-center p-4" style="border-bottom:1px solid var(--border-subtle);">
        <h3 class="text-sm uppercase text-muted strong">Current Holdings <span class="badge ml-2">${rows.length} POSITIONS</span></h3>
        <button id="add-portfolio" class="btn btn-primary" style="padding:6px 12px; font-size:11px;"><i data-lucide="plus" style="width:14px;"></i> NEW</button>
      </div>
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr><th>Ticker</th><th>Lots</th><th>Avg Price</th><th style="text-align:right">Action</th></tr>
          </thead>
          <tbody>
            ${rows.length ? rows.map(r => `
              <tr>
                <td class="mono strong text-up" style="width:120px;">
                    <a href="#stock/${r.ticker}" class="flex items-center gap-2"><span style="width:20px;height:20px;background:var(--bg-elevated);border-radius:4px;display:grid;place-items:center;font-size:8px;">${r.ticker[0]}</span> ${r.ticker}</a>
                </td>
                <td class="mono">${r.lots}</td>
                <td class="mono text-muted">Rp ${r.avg_price.toLocaleString()}</td>
                <td style="text-align:right; width:80px;">
                  <button class="btn-icon delete-portfolio" data-ticker="${r.ticker}" style="color:var(--down-color);"><i data-lucide="trash-2" style="width:16px;"></i></button>
                </td>
              </tr>`).join('') : '<tr><td colspan="4" class="text-center p-4 text-dim">No portfolio positions.</td></tr>'}
          </tbody>
        </table>
      </div>`;

    el.querySelector('#add-portfolio').addEventListener('click', async () => {
        const ticker = window.prompt('Ticker:'); if (!ticker) return;
        const lots = Number(window.prompt('Lots:', '1'));
        const avgPrice = Number(window.prompt('Avg Price:', '1000'));
        await savePortfolioPosition({ ticker: ticker.toUpperCase(), lots, avg_price: avgPrice });
        renderPortfolioTab(el);
    });
}
