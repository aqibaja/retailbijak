import { animateCards, animateTableRows } from '../main.js';
import {
    fetchWatchlist,
    saveWatchlistItem,
    deleteWatchlistItem,
    fetchPortfolio,
    savePortfolioPosition,
    deletePortfolioPosition,
    showToast,
} from '../api.js';

export async function renderPortfolio(root, activeTab) {
    const isPort = activeTab === 'portfolio';
    root.innerHTML = `
        <div class="flex-between mb-4">
            <h1>Holdings & Watchlist</h1>
        </div>
        <div style="display:flex; gap:16px; margin-bottom:24px; border-bottom:1px solid var(--border);">
            <a href="#portfolio" style="padding:8px 16px; font-weight:600; border-bottom:2px solid ${isPort ? 'var(--primary)' : 'transparent'}; color:${isPort ? 'var(--text)' : 'var(--text-muted)'};">Portfolio</a>
            <a href="#watchlist" style="padding:8px 16px; font-weight:600; border-bottom:2px solid ${!isPort ? 'var(--primary)' : 'transparent'}; color:${!isPort ? 'var(--text)' : 'var(--text-muted)'};">Watchlist</a>
        </div>
        <div id="tab-content" class="card" style="padding:0; overflow:hidden;"></div>
    `;

    if (isPort) {
        await renderPortfolioTab(root.querySelector('#tab-content'));
    } else {
        await renderWatchlistTab(root.querySelector('#tab-content'));
    }

    lucide.createIcons();
    animateCards('.card');
    const tbody = root.querySelector('tbody');
    if (tbody) animateTableRows(tbody);
}

async function renderWatchlistTab(el) {
    const data = await fetchWatchlist();
    el.innerHTML = `
        <div style="padding:16px; border-bottom:1px solid var(--border);" class="flex-between">
            <h3 style="margin:0">My Watchlist (${data.count})</h3>
            <button id="add-watchlist" class="btn btn-primary" style="padding:6px 12px; font-size:12px;"><i data-lucide="plus" style="width:14px;"></i> Add Ticker</button>
        </div>
        <div class="data-table-wrapper">
            <table class="data-table">
                <thead><tr><th>Ticker</th><th>Notes</th><th>Action</th></tr></thead>
                <tbody>
                    ${data.data.map((row) => `<tr><td><a href="#stock/${row.ticker}" class="mono" style="font-weight:600">${row.ticker}</a></td><td>${row.notes || '-'}</td><td><button class="icon-btn delete-watchlist" data-ticker="${row.ticker}" style="width:28px;height:28px;color:var(--danger)"><i data-lucide="trash-2" style="width:14px;"></i></button></td></tr>`).join('') || '<tr><td colspan="3" class="text-muted">No watchlist items yet.</td></tr>'}
                </tbody>
            </table>
        </div>`;

    el.querySelector('#add-watchlist').addEventListener('click', async () => {
        const ticker = window.prompt('Ticker (contoh: BBCA):', 'BBCA');
        if (!ticker) return;
        const notes = window.prompt('Catatan (opsional):', '') || '';
        const res = await saveWatchlistItem({ ticker, notes });
        if (res?.ok) {
            showToast('Watchlist saved', 'success');
            await renderWatchlistTab(el);
            lucide.createIcons();
        }
    });

    el.querySelectorAll('.delete-watchlist').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const ticker = btn.dataset.ticker;
            const res = await deleteWatchlistItem(ticker);
            if (res?.ok) {
                showToast(`Removed ${ticker}`, 'success');
                await renderWatchlistTab(el);
                lucide.createIcons();
            }
        });
    });
}

async function renderPortfolioTab(el) {
    const data = await fetchPortfolio();
    el.innerHTML = `
        <div style="padding:16px; border-bottom:1px solid var(--border);" class="flex-between">
            <h3 style="margin:0">Current Holdings (${data.count})</h3>
            <button id="add-portfolio" class="btn btn-primary" style="padding:6px 12px; font-size:12px;"><i data-lucide="plus" style="width:14px;"></i> Add Position</button>
        </div>
        <div class="data-table-wrapper">
            <table class="data-table">
                <thead><tr><th>Ticker</th><th>Lots</th><th>Avg Price</th><th>Action</th></tr></thead>
                <tbody>
                    ${data.data.map((row) => `<tr><td><a href="#stock/${row.ticker}" class="mono" style="font-weight:600">${row.ticker}</a></td><td class="mono">${row.lots}</td><td class="mono">${Number(row.avg_price).toLocaleString()}</td><td><button class="icon-btn delete-portfolio" data-ticker="${row.ticker}" style="width:28px;height:28px;color:var(--danger)"><i data-lucide="trash-2" style="width:14px;"></i></button></td></tr>`).join('') || '<tr><td colspan="4" class="text-muted">No positions yet.</td></tr>'}
                </tbody>
            </table>
        </div>`;

    el.querySelector('#add-portfolio').addEventListener('click', async () => {
        const ticker = window.prompt('Ticker (contoh: BBCA):', 'BBCA');
        if (!ticker) return;
        const lots = Number(window.prompt('Lots:', '1'));
        const avgPrice = Number(window.prompt('Average price:', '1000'));
        if (!lots || !avgPrice) {
            showToast('Lots dan avg price wajib valid', 'error');
            return;
        }
        const res = await savePortfolioPosition({ ticker, lots, avg_price: avgPrice });
        if (res?.ok) {
            showToast('Portfolio saved', 'success');
            await renderPortfolioTab(el);
            lucide.createIcons();
        }
    });

    el.querySelectorAll('.delete-portfolio').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const ticker = btn.dataset.ticker;
            const res = await deletePortfolioPosition(ticker);
            if (res?.ok) {
                showToast(`Removed ${ticker}`, 'success');
                await renderPortfolioTab(el);
                lucide.createIcons();
            }
        });
    });
}
