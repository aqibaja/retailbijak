import { fetchWatchlist, saveWatchlistItem, deleteWatchlistItem, fetchPortfolio, savePortfolioPosition, deletePortfolioPosition, showToast } from '../api.js?v=20260502a';
import { observeElements } from '../main.js?v=20260502c';

export async function renderPortfolio(root, activeTab) {
    const isPort = activeTab === 'portfolio';
    root.innerHTML = `
      <section class="grid grid-cols-12 stagger-reveal portfolio-page-pro">
        <div class="col-span-12 portfolio-header">
          <div class="portfolio-header-copy">
            <div class="portfolio-kicker">Pusat Portfolio</div>
            <h1>Aset & Watchlist</h1>
            <p>Kelola posisi aktif dan pantau aset kandidat dengan tampilan yang lebih rapat dan editorial.</p>
          </div>
          <div class="portfolio-meta-rail">
            <div class="portfolio-summary">Jalur cepat untuk posisi aktif, catatan ringkas, dan operasi watchlist.</div>
            <div class="portfolio-tab-switch flex p-1" style="background:var(--bg-elevated); border-radius:10px; border:1px solid var(--border-subtle);">
              <a href="#portfolio" class="btn ${isPort ? 'btn-primary' : ''}" style="border:none; padding:4px 16px; border-radius:8px; min-width:100px; height:32px;">Portfolio</a>
              <a href="#watchlist" class="btn ${!isPort ? 'btn-primary' : ''}" style="border:none; padding:4px 16px; border-radius:8px; min-width:100px; height:32px;">Daftar Pantau</a>
            </div>
          </div>
        </div>

        <div id="tab-content" class="col-span-12 panel flex-col portfolio-table-shell" style="padding:0; overflow:hidden;">
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
      <div class="portfolio-table-head flex justify-between items-center p-6" style="border-bottom:1px solid var(--border-subtle); background:var(--bg-elevated);">
        <h3 class="text-xs uppercase text-dim strong" style="letter-spacing:0.08em; margin:0;">Daftar Pantau <span class="badge ml-2" style="background:rgba(99,102,241,0.1); color:#a5b4fc; border:1px solid rgba(99,102,241,0.2);">${rows.length} ITEM</span></h3>
        <button id="add-watchlist" class="btn btn-primary" style="padding:6px 16px; font-size:12px; height:32px; box-shadow:0 0 10px var(--primary-glow);"><i data-lucide="plus" style="width:14px;"></i> Tambah</button>
      </div>
      <div class="table-wrapper portfolio-table-wrap">
        <table class="table portfolio-table">
          <thead>
            <tr><th>Ticker</th><th>Notes</th><th style="text-align:right">Action</th></tr>
          </thead>
          <tbody>
            ${rows.length ? rows.map(r => `
              <tr class="portfolio-row">
                <td class="mono strong text-main portfolio-row-ticker" style="width:180px;">
                    <a href="#stock/${r.ticker}" class="flex items-center gap-3">
                      <span class="portfolio-row-kicker">${r.ticker.substring(0,2)}</span>
                      <span style="font-size:15px; font-family:var(--font-mono);">${r.ticker}</span>
                    </a>
                </td>
                <td class="text-muted text-sm portfolio-row-note">${r.notes || '-'}</td>
                <td style="text-align:right; width:80px;">
                  <button class="btn-icon delete-watchlist" data-ticker="${r.ticker}" style="color:var(--down-color);"><i data-lucide="trash-2" style="width:16px;"></i></button>
                </td>
              </tr>`).join('') : '<tr><td colspan="3" class="text-center p-8 text-dim">Belum ada saham di daftar pantau.</td></tr>'}
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
      <div class="portfolio-table-head flex justify-between items-center p-6" style="border-bottom:1px solid var(--border-subtle); background:var(--bg-elevated);">
        <h3 class="text-xs uppercase text-dim strong" style="letter-spacing:0.08em; margin:0;" data-i18n="current_holdings">Posisi Aktif <span class="badge ml-2" style="background:rgba(99,102,241,0.1); color:#a5b4fc; border:1px solid rgba(99,102,241,0.2);">${rows.length} POSISI</span></h3>
        <button id="add-portfolio" class="btn btn-primary" style="padding:6px 16px; font-size:12px; height:32px; box-shadow:0 0 10px var(--primary-glow);"><i data-lucide="plus" style="width:14px;"></i> Tambah</button>
      </div>
      <div class="table-wrapper portfolio-table-wrap">
        <table class="table portfolio-table">
          <thead>
            <tr><th>Ticker</th><th>Lots</th><th>Avg Price</th><th style="text-align:right">Action</th></tr>
          </thead>
          <tbody>
            ${rows.length ? rows.map(r => `
              <tr class="portfolio-row">
                <td class="mono strong text-main portfolio-row-ticker" style="width:180px;">
                    <a href="#stock/${r.ticker}" class="flex items-center gap-3">
                      <span class="portfolio-row-kicker">${r.ticker.substring(0,2)}</span>
                      <span style="font-size:15px; font-family:var(--font-mono);">${r.ticker}</span>
                    </a>
                </td>
                <td class="mono text-muted" style="font-size:14px;">${r.lots}</td>
                <td class="mono text-muted" style="font-size:14px;">Rp ${r.avg_price.toLocaleString()}</td>
                <td style="text-align:right; width:80px;">
                  <button class="btn-icon delete-portfolio" data-ticker="${r.ticker}" style="color:var(--down-color);"><i data-lucide="trash-2" style="width:16px;"></i></button>
                </td>
              </tr>`).join('') : '<tr><td colspan="4" class="text-center p-8 text-dim">Belum ada posisi portfolio.</td></tr>'}
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
