import { fetchWatchlist, saveWatchlistItem, deleteWatchlistItem, fetchPortfolio, savePortfolioPosition, deletePortfolioPosition, showToast } from '../api.js?v=20260503b';
import { observeElements } from '../main.js?v=20260503aa';

export async function renderPortfolio(root, activeTab) {
    const isPort = activeTab === 'portfolio';
    root.innerHTML = `
      <section class="grid grid-cols-12 stagger-reveal portfolio-page-pro">
        <div class="col-span-12 portfolio-header">
          <div class="portfolio-header-copy">
            <div class="portfolio-kicker">Pusat Portofolio</div>
            <h1>Aset & Daftar Pantau</h1>
            <p>Kelola posisi aktif dan pantau aset kandidat dengan tampilan yang lebih rapat dan editorial.</p>
          </div>
          <div class="portfolio-meta-rail">
            <div class="portfolio-summary">Jalur cepat untuk posisi aktif, catatan ringkas, dan operasi daftar pantau.</div>
            <div class="portfolio-tab-switch flex p-1" style="background:var(--bg-elevated); border-radius:10px; border:1px solid var(--border-subtle);">
              <a href="#portfolio" class="btn ${isPort ? 'btn-primary' : ''}" style="border:none; padding:4px 16px; border-radius:8px; min-width:100px; height:32px;">Portofolio</a>
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
        <h3 class="text-xs uppercase text-dim strong" style="letter-spacing:0.08em; margin:0;">Daftar Pantau <span class="badge ml-2" style="background:rgba(99,102,241,0.1); color:#a5b4fc; border:1px solid rgba(99,102,241,0.2);">${rows.length} ENTRI</span></h3>
        <button id="add-watchlist" class="btn btn-primary" style="padding:6px 16px; font-size:12px; height:32px; box-shadow:0 0 10px var(--primary-glow);"><i data-lucide="plus" style="width:14px;"></i> Tambah ke Daftar Pantau</button>
      </div>
      <div class="table-wrapper portfolio-table-wrap">
        <table class="table portfolio-table">
          <thead>
            <tr><th>Kode Saham</th><th>Catatan</th><th style="text-align:right">Aksi</th></tr>
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
        const ticker = window.prompt('Kode saham (contoh: BBCA):'); if (!ticker) return;
        const notes = window.prompt('Catatan:', '') || '';
        await saveWatchlistItem({ ticker: ticker.toUpperCase(), notes });
        showToast(`${ticker} ditambahkan ke daftar pantau`, 'success');
        await renderWatchlistTab(el);
        if (typeof lucide !== 'undefined') lucide.createIcons();
    });

    el.querySelectorAll('.delete-watchlist').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const ticker = e.currentTarget.getAttribute('data-ticker');
            if (window.confirm(`Yakin ingin menghapus ${ticker} dari daftar pantau?`)) {
                await deleteWatchlistItem(ticker);
                showToast(`${ticker} dihapus dari daftar pantau`, 'success');
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
        <h3 class="text-xs uppercase text-dim strong" style="letter-spacing:0.08em; margin:0;" data-i18n="current_holdings">Posisi Aktif <span class="badge ml-2" style="background:rgba(99,102,241,0.1); color:#a5b4fc; border:1px solid rgba(99,102,241,0.2);">${rows.length} POS</span></h3>
        <button id="add-portfolio" class="btn btn-primary" style="padding:6px 16px; font-size:12px; height:32px; box-shadow:0 0 10px var(--primary-glow);"><i data-lucide="plus" style="width:14px;"></i> Tambah Posisi</button>
      </div>
      <div class="table-wrapper portfolio-table-wrap">
        <table class="table portfolio-table">
          <thead>
            <tr><th>Kode Saham</th><th>Lot</th><th>Harga Beli Rata-Rata</th><th style="text-align:right">Aksi</th></tr>
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
              </tr>`).join('') : '<tr><td colspan="4" class="text-center p-8 text-dim">Belum ada posisi portofolio.</td></tr>'}
          </tbody>
        </table>
      </div>`;

    el.querySelector('#add-portfolio').addEventListener('click', async () => {
        const ticker = window.prompt('Kode saham:'); if (!ticker) return;
        const lots = Number(window.prompt('Lot:', '1'));
        const avgPrice = Number(window.prompt('Harga rata-rata:', '1000'));
        if (isNaN(lots) || isNaN(avgPrice)) {
            showToast('Lot atau harga tidak valid', 'error');
            return;
        }
        await savePortfolioPosition({ ticker: ticker.toUpperCase(), lots, avg_price: avgPrice });
        showToast(`${ticker} ditambahkan ke portofolio`, 'success');
        await renderPortfolioTab(el);
        if (typeof lucide !== 'undefined') lucide.createIcons();
    });

    el.querySelectorAll('.delete-portfolio').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const ticker = e.currentTarget.getAttribute('data-ticker');
            if (window.confirm(`Yakin ingin menghapus ${ticker} dari portofolio?`)) {
                await deletePortfolioPosition(ticker);
                showToast(`${ticker} dihapus dari portofolio`, 'success');
                await renderPortfolioTab(el);
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        });
    });
}
