import { fetchWatchlist, saveWatchlistItem, deleteWatchlistItem, fetchPortfolio, savePortfolioPosition, deletePortfolioPosition, showToast } from '../api.js?v=20260430l';
import { observeElements } from '../main.js?v=20260430l';

export async function renderPortfolio(root, activeTab) {
    const isPort = activeTab === 'portfolio';
    root.innerHTML = `
      <section class="grid grid-cols-12 stagger-reveal">
        <div class="col-span-12 flex justify-between items-end mb-6">
          <div>
            <h1 class="text-3xl mb-2" style="color:var(--text-main); letter-spacing:-0.04em; font-weight:800;">Assets & Watchlist</h1>
            <p class="text-base" style="color:var(--text-muted);">Manage monitored assets and active positions</p>
          </div>
          <div class="flex p-1" style="background:rgba(0,0,0,0.2); border-radius:10px; border:1px solid rgba(255,255,255,0.04);">
            <a href="#portfolio" class="btn ${isPort ? 'btn-primary' : ''}" style="border:none; padding:4px 16px; border-radius:8px; min-width:100px; height:32px;">Portfolio</a>
            <a href="#watchlist" class="btn ${!isPort ? 'btn-primary' : ''}" style="border:none; padding:4px 16px; border-radius:8px; min-width:100px; height:32px;">Watchlist</a>
          </div>
        </div>

        <div id="tab-content" class="col-span-12 panel flex-col" style="padding:0; overflow:hidden;">
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
    const rows = Array.isArray(data?.data) ? data.data : [];
    
    el.innerHTML = `
      <div class="flex justify-between items-center p-6" style="border-bottom:1px solid var(--border-subtle); background:rgba(15,22,41,0.8);">
        <h3 class="text-xs uppercase text-dim strong" style="letter-spacing:0.08em; margin:0;">My Watchlist <span class="badge ml-2" style="background:rgba(99,102,241,0.1); color:#a5b4fc; border:1px solid rgba(99,102,241,0.2);">${rows.length} ITEMS</span></h3>
        <button id="add-watchlist" class="btn btn-primary" style="padding:6px 16px; font-size:12px; height:32px; box-shadow:0 0 10px var(--primary-glow);"><i data-lucide="plus" style="width:14px;"></i> NEW</button>
      </div>
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr><th>Ticker</th><th>Notes</th><th style="text-align:right">Action</th></tr>
          </thead>
          <tbody>
            ${rows.length ? rows.map(r => `
              <tr>
                <td class="mono strong text-main" style="width:180px;">
                    <a href="#stock/${r.ticker}" class="flex items-center gap-3">
                      <span style="width:32px;height:32px;background:rgba(99,102,241,0.1);border-radius:8px;display:grid;place-items:center;font-size:10px; color:#a5b4fc; border:1px solid rgba(99,102,241,0.2);">${r.ticker.substring(0,2)}</span> 
                      <span style="font-size:15px; font-family:var(--font-mono);">${r.ticker}</span>
                    </a>
                </td>
                <td class="text-muted text-sm">${r.notes || '-'}</td>
                <td style="text-align:right; width:80px;">
                  <button class="btn-icon delete-watchlist" data-ticker="${r.ticker}" style="color:var(--down-color);"><i data-lucide="trash-2" style="width:16px;"></i></button>
                </td>
              </tr>`).join('') : '<tr><td colspan="3" class="text-center p-8 text-dim">Watchlist is empty.</td></tr>'}
          </tbody>
        </table>
      </div>`;

    el.querySelector('#add-watchlist').addEventListener('click', async () => {
        const ticker = window.prompt('Ticker (e.g. BBCA):'); if (!ticker) return;
        const notes = window.prompt('Notes:', '') || '';
        await saveWatchlistItem({ ticker: ticker.toUpperCase(), notes });
        showToast(`${ticker} added to Watchlist`, 'success');
        await renderWatchlistTab(el);
        if (typeof lucide !== 'undefined') lucide.createIcons();
    });

    el.querySelectorAll('.delete-watchlist').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const ticker = e.currentTarget.getAttribute('data-ticker');
            if (window.confirm(`Are you sure you want to remove ${ticker} from your Watchlist?`)) {
                await deleteWatchlistItem(ticker);
                showToast(`${ticker} removed from Watchlist`, 'success');
                await renderWatchlistTab(el);
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        });
    });
}

async function renderPortfolioTab(el) {
    const data = await fetchPortfolio();
    const rows = Array.isArray(data?.data) ? data.data : [];
    
    el.innerHTML = `
      <div class="flex justify-between items-center p-6" style="border-bottom:1px solid var(--border-subtle); background:rgba(15,22,41,0.8);">
        <h3 class="text-xs uppercase text-dim strong" style="letter-spacing:0.08em; margin:0;" data-i18n="current_holdings">Current Holdings <span class="badge ml-2" style="background:rgba(99,102,241,0.1); color:#a5b4fc; border:1px solid rgba(99,102,241,0.2);">${rows.length} POSITIONS</span></h3>
        <button id="add-portfolio" class="btn btn-primary" style="padding:6px 16px; font-size:12px; height:32px; box-shadow:0 0 10px var(--primary-glow);"><i data-lucide="plus" style="width:14px;"></i> NEW</button>
      </div>
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr><th>Ticker</th><th>Lots</th><th>Avg Price</th><th style="text-align:right">Action</th></tr>
          </thead>
          <tbody>
            ${rows.length ? rows.map(r => `
              <tr>
                <td class="mono strong text-main" style="width:180px;">
                    <a href="#stock/${r.ticker}" class="flex items-center gap-3">
                      <span style="width:32px;height:32px;background:rgba(99,102,241,0.1);border-radius:8px;display:grid;place-items:center;font-size:10px; color:#a5b4fc; border:1px solid rgba(99,102,241,0.2);">${r.ticker.substring(0,2)}</span> 
                      <span style="font-size:15px; font-family:var(--font-mono);">${r.ticker}</span>
                    </a>
                </td>
                <td class="mono text-muted" style="font-size:14px;">${r.lots}</td>
                <td class="mono text-muted" style="font-size:14px;">Rp ${r.avg_price.toLocaleString()}</td>
                <td style="text-align:right; width:80px;">
                  <button class="btn-icon delete-portfolio" data-ticker="${r.ticker}" style="color:var(--down-color);"><i data-lucide="trash-2" style="width:16px;"></i></button>
                </td>
              </tr>`).join('') : '<tr><td colspan="4" class="text-center p-8 text-dim">No portfolio positions.</td></tr>'}
          </tbody>
        </table>
      </div>`;

    el.querySelector('#add-portfolio').addEventListener('click', async () => {
        const ticker = window.prompt('Ticker:'); if (!ticker) return;
        const lots = Number(window.prompt('Lots:', '1'));
        const avgPrice = Number(window.prompt('Avg Price:', '1000'));
        if (isNaN(lots) || isNaN(avgPrice)) {
            showToast('Invalid lots or price', 'error');
            return;
        }
        await savePortfolioPosition({ ticker: ticker.toUpperCase(), lots, avg_price: avgPrice });
        showToast(`${ticker} added to Portfolio`, 'success');
        await renderPortfolioTab(el);
        if (typeof lucide !== 'undefined') lucide.createIcons();
    });

    el.querySelectorAll('.delete-portfolio').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const ticker = e.currentTarget.getAttribute('data-ticker');
            if (window.confirm(`Are you sure you want to remove ${ticker} from your Portfolio?`)) {
                await deletePortfolioPosition(ticker);
                showToast(`${ticker} removed from Portfolio`, 'success');
                await renderPortfolioTab(el);
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        });
    });
}
