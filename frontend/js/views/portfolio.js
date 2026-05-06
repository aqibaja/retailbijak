import { fetchWatchlist, saveWatchlistItem, deleteWatchlistItem, fetchPortfolio, savePortfolioPosition, deletePortfolioPosition, showToast } from '../api.js?v=20260506z';
import { observeElements } from '../main.js?v=20260506g';

// ─── Focus Trap ──────────────────────────────
function trapFocus(container) {
  const focusable = container.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  container.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
}

// ─── Shared Modal ──────────────────────────────
export function showModal({ title, fields = [], confirmText = 'Simpan', cancelText = 'Batal', onConfirm }) {
  const existing = document.getElementById('stock-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'stock-modal-overlay';
  overlay.innerHTML = `
    <div class="modal-backdrop" onclick="this.closest('#stock-modal-overlay')?.remove()"></div>
    <div class="modal-panel">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-sm strong m-0 text-main">${title}</h3>
        <button class="btn btn-icon modal-close-btn" aria-label="Tutup"><i data-lucide="x"></i></button>
      </div>
      <form class="modal-fields" onsubmit="return false">${fields.map((f, i) => `
        <div class="mb-4">
          <label class="text-xs text-dim uppercase strong block mb-2">${f.label}</label>
          ${f.type === 'number'
            ? `<input type="number" id="modal-field-${i}" class="modal-input" value="${f.value ?? ''}" step="${f.step ?? '1'}" min="${f.min ?? ''}" />`
            : `<input type="text" id="modal-field-${i}" class="modal-input" value="${f.value ?? ''}" placeholder="${f.placeholder ?? ''}" />`
          }
        </div>`).join('')}</form>
      <div class="flex gap-3 mt-4">
        <button class="btn modal-cancel-btn modal-btn modal-btn-cancel">${cancelText}</button>
        <button class="btn btn-primary modal-confirm-btn modal-btn">${confirmText}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  if (typeof lucide !== 'undefined') lucide.createIcons();

  return new Promise((resolve) => {
    const close = () => { overlay.remove(); resolve(null); };
    overlay.querySelector('.modal-close-btn')?.addEventListener('click', close);
    overlay.querySelector('.modal-cancel-btn')?.addEventListener('click', close);
    overlay.querySelector('.modal-backdrop')?.addEventListener('click', close);
    overlay.querySelector('.modal-confirm-btn')?.addEventListener('click', async () => {
      const values = fields.map((_, i) => {
        const el = document.getElementById(`modal-field-${i}`);
        return el ? (fields[i].type === 'number' ? Number(el.value) : el.value) : null;
      });
      const result = await onConfirm(values);
      if (result !== false) { overlay.remove(); resolve(values); }
    });
    // Enter to submit (keyboard + iOS "Go" button)
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') overlay.querySelector('.modal-confirm-btn')?.click();
    });
    overlay.querySelector('.modal-fields')?.addEventListener('submit', (e) => {
      e.preventDefault();
      overlay.querySelector('.modal-confirm-btn')?.click();
    });
    // Focus first field
    const firstInput = overlay.querySelector('.form-input, .modal-input');
    if (firstInput) setTimeout(() => firstInput.focus(), 100);
    // Focus trap
    setTimeout(() => trapFocus(overlay), 150);
  });
}

// ─── Confirm Dialog ────────────────────────────
export function showConfirm({ title, message, confirmText = 'Yakin', cancelText = 'Batal', danger = false }) {
  const existing = document.getElementById('stock-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'stock-modal-overlay';
  overlay.innerHTML = `
    <div class="modal-backdrop" onclick="this.closest('#stock-modal-overlay')?.remove()"></div>
    <div class="modal-panel modal-panel-narrow">
      <div class="text-center py-4">
        <h3 class="text-sm strong m-0 text-main">${title}</h3>
        <p class="text-xs text-muted mt-2 line-height-150">${message}</p>
      </div>
      <div class="flex gap-2 mt-4">
        <button class="btn modal-cancel-btn modal-btn modal-btn-cancel">${cancelText}</button>
        <button class="btn modal-confirm-btn modal-btn ${danger ? 'modal-btn-danger' : 'btn-primary'}">${confirmText}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  return new Promise((resolve) => {
    const close = (val) => { overlay.remove(); resolve(val); };
    overlay.querySelector('.modal-backdrop')?.addEventListener('click', () => close(false));
    overlay.querySelector('.modal-cancel-btn')?.addEventListener('click', () => close(false));
    overlay.querySelector('.modal-confirm-btn')?.addEventListener('click', () => close(true));
    // Focus trap
    setTimeout(() => trapFocus(overlay), 150);
  });
}

// ─── Render ────────────────────────────────────
export async function renderPortfolio(root, activeTab) {
    const isPort = activeTab === 'portfolio';
    document.title = 'RetailBijak — Portofolio';
    root.innerHTML = `
      <section class="grid grid-cols-12 stagger-reveal portfolio-page-pro">
        <div class="col-span-12 portfolio-header">
          <div class="portfolio-header-copy">
            <div class="portfolio-kicker">Pusat Portofolio</div>
            <h1>Aset & Daftar Pantau</h1>
            <p>Kelola posisi aktif dan pantau aset kandidat.</p>
          </div>
          <div class="portfolio-meta-rail">
            <div class="portfolio-tab-switch flex p-1">
              <a href="#portfolio" class="btn ${isPort ? 'btn-primary' : ''} portfolio-tab-btn">Portofolio</a>
              <a href="#watchlist" class="btn ${!isPort ? 'btn-primary' : ''} portfolio-tab-btn">Pantauan</a>
            </div>
          </div>
        </div>
        <div id="tab-content" class="col-span-12 panel flex-col portfolio-card">
            <div class="p-4 text-center"><div class="skeleton skel-text skeleton-center"></div></div>
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
      <div class="flex justify-between items-center p-4 border-bottom-subtle">
        <h3 class="text-xs uppercase text-dim strong m-0 portfolio-section-header">Daftar Pantau <span class="badge badge-primary ml-2">${rows.length} ENTRI</span></h3>
        <button id="add-watchlist" class="btn btn-primary portfolio-action-btn"><i data-lucide="plus" class="lucide-sm"></i> Tambah</button>
      </div>
      ${rows.length ? `
      <div class="table-wrapper">
        <table class="table">
          <thead><tr><th>Kode Saham</th><th>Catatan</th><th class="text-right">Aksi</th></tr></thead>
          <tbody>${rows.map(r => `
            <tr>
              <td><a href="#stock/${r.ticker}" class="flex items-center gap-3"><span class="portfolio-row-kicker">${r.ticker.substring(0,2)}</span><span class="mono strong text-main search-suggestion-ticker">${r.ticker}</span></a></td>
              <td class="text-muted text-sm">${r.notes || '-'}</td>
              <td class="text-right"><button class="btn-icon delete-watchlist portfolio-delete-btn" data-ticker="${r.ticker}"><i data-lucide="trash-2" class="lucide-md"></i></button></td>
            </tr>`).join('')}</tbody>
        </table>
      </div>` : `
      <div class="empty-state-v2">
        <div class="empty-icon"><i data-lucide="eye" class="watchlist-empty-icon"></i></div>
        <h3>Daftar Pantau Kosong</h3>
        <p>Tambahkan saham untuk mulai memantau pergerakan dan sinyal.</p>
        <button id="add-watchlist-empty" class="btn btn-primary mt-12"><i data-lucide="plus" class="lucide-md"></i> Tambah Sekarang</button>
      </div>`}`;

    // Watchlist add
    const addBtn = el.querySelector('#add-watchlist') || el.querySelector('#add-watchlist-empty');
    if (addBtn) addBtn.addEventListener('click', async () => {
        const vals = await showModal({
            title: 'Tambah Saham ke Pantauan',
            fields: [{ label: 'Kode Saham', placeholder: 'BBCA' }, { label: 'Catatan (opsional)', placeholder: 'Target swing' }],
            confirmText: 'Tambah',
            onConfirm: async ([ticker, notes]) => {
                if (!ticker || !ticker.trim()) { showToast('Kode saham wajib diisi', 'error'); return false; }
                await saveWatchlistItem({ ticker: ticker.toUpperCase().trim(), notes: notes || '' });
                showToast(`${ticker.toUpperCase()} ditambahkan`, 'success');
            }
        });
        if (vals) { await renderWatchlistTab(el); if (typeof lucide !== 'undefined') lucide.createIcons(); }
    });

    // Watchlist delete
    el.querySelectorAll('.delete-watchlist').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const ticker = e.currentTarget.getAttribute('data-ticker');
            const ok = await showConfirm({ title: 'Hapus dari Pantauan?', message: `Yakin ingin menghapus ${ticker} dari daftar pantau?`, confirmText: 'Hapus', danger: true });
            if (ok) {
                await deleteWatchlistItem(ticker);
                showToast(`${ticker} dihapus`, 'success');
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
      <div class="flex justify-between items-center p-4 border-bottom-subtle">
        <h3 class="text-xs uppercase text-dim strong m-0 portfolio-section-header">Posisi Aktif <span class="badge badge-primary ml-2">${rows.length} POS</span></h3>
        <button id="add-portfolio" class="btn btn-primary portfolio-action-btn"><i data-lucide="plus" class="lucide-sm"></i> Tambah</button>
      </div>
      ${rows.length ? `
      <div class="table-wrapper">
        <table class="table">
          <thead><tr><th>Kode Saham</th><th>Lot</th><th>Harga Rata-Rata</th><th class="text-right">Aksi</th></tr></thead>
          <tbody>${rows.map(r => `
            <tr>
              <td><a href="#stock/${r.ticker}" class="flex items-center gap-3"><span class="portfolio-row-kicker">${r.ticker.substring(0,2)}</span><span class="mono strong text-main search-suggestion-ticker">${r.ticker}</span></a></td>
              <td class="mono font-size-14">${r.lots}</td>
              <td class="mono font-size-14 text-muted">Rp ${(r.avg_price || 0).toLocaleString()}</td>
              <td class="text-right"><button class="btn-icon delete-portfolio portfolio-delete-btn" data-ticker="${r.ticker}"><i data-lucide="trash-2" class="lucide-md"></i></button></td>
            </tr>`).join('')}</tbody>
        </table>
      </div>` : `
      <div class="empty-state-v2">
        <div class="empty-icon"><i data-lucide="briefcase" class="watchlist-empty-icon"></i></div>
        <h3>Belum Ada Posisi</h3>
        <p>Mulai catat posisi saham Anda untuk melacak portofolio.</p>
        <button id="add-portfolio-empty" class="btn btn-primary mt-12"><i data-lucide="plus" class="lucide-md"></i> Tambah Posisi</button>
      </div>`}`;

    // Portfolio add
    const addBtn = el.querySelector('#add-portfolio') || el.querySelector('#add-portfolio-empty');
    if (addBtn) addBtn.addEventListener('click', async () => {
        const vals = await showModal({
            title: 'Tambah Posisi Portofolio',
            fields: [
                { label: 'Kode Saham', placeholder: 'BBCA' },
                { label: 'Jumlah Lot', type: 'number', value: '1', step: '1', min: '1' },
                { label: 'Harga Rata-Rata (Rp)', type: 'number', value: '1000', step: '100', min: '1' }
            ],
            confirmText: 'Simpan',
            onConfirm: async ([ticker, lots, avgPrice]) => {
                if (!ticker || !ticker.trim()) { showToast('Kode saham wajib diisi', 'error'); return false; }
                if (isNaN(lots) || isNaN(avgPrice) || lots <= 0 || avgPrice <= 0) { showToast('Lot atau harga tidak valid', 'error'); return false; }
                await savePortfolioPosition({ ticker: ticker.toUpperCase().trim(), lots, avg_price: avgPrice });
                showToast(`${ticker.toUpperCase()} ditambahkan`, 'success');
            }
        });
        if (vals) { await renderPortfolioTab(el); if (typeof lucide !== 'undefined') lucide.createIcons(); }
    });

    // Portfolio delete
    el.querySelectorAll('.delete-portfolio').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const ticker = e.currentTarget.getAttribute('data-ticker');
            const ok = await showConfirm({ title: 'Hapus Posisi?', message: `Yakin ingin menghapus ${ticker} dari portofolio?`, confirmText: 'Hapus', danger: true });
            if (ok) {
                await deletePortfolioPosition(ticker);
                showToast(`${ticker} dihapus`, 'success');
                await renderPortfolioTab(el);
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        });
    });
}
