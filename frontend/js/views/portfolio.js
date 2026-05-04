     1|     1|import { fetchWatchlist, saveWatchlistItem, deleteWatchlistItem, fetchPortfolio, savePortfolioPosition, deletePortfolioPosition, showToast } from '../api.js?v=20260505b';
     2|     2|import { observeElements } from '../main.js?v=20260504e';
     3|     3|
     4|     4|// ─── Shared Modal ──────────────────────────────
     5|     5|export function showModal({ title, fields = [], confirmText = 'Simpan', cancelText = 'Batal', onConfirm }) {
     6|     6|  const existing = document.getElementById('stock-modal-overlay');
     7|     7|  if (existing) existing.remove();
     8|     8|
     9|     9|  const overlay = document.createElement('div');
    10|    10|  overlay.id = 'stock-modal-overlay';
    11|    11|  overlay.innerHTML = `
    12|    12|    <div class="modal-backdrop" onclick="this.closest('#stock-modal-overlay')?.remove()"></div>
    13|    13|    <div class="modal-panel">
    14|    14|      <div class="flex justify-between items-center mb-4">
    15|    15|        <h3 class="text-sm strong m-0 text-main">${title}</h3>
    16|    16|        <button class="btn btn-icon modal-close-btn" aria-label="Tutup"><i data-lucide="x"></i></button>
    17|    17|      </div>
    18|    18|      <div class="modal-fields">${fields.map((f, i) => `
    19|    19|        <div class="mb-2">
    20|    20|          <label class="text-xs text-dim uppercase strong block mb-1">${f.label}</label>
    21|    21|          ${f.type === 'number'
    22|    22|            ? `<input type="number" id="modal-field-${i}" class="modal-input" value="${f.value ?? ''}" step="${f.step ?? '1'}" min="${f.min ?? ''}" />`
    23|    23|            : `<input type="text" id="modal-field-${i}" class="modal-input" value="${f.value ?? ''}" placeholder="${f.placeholder ?? ''}" />`
    24|    24|          }
    25|    25|        </div>`).join('')}</div>
    26|    26|      <div class="flex gap-2 mt-3">
    27|    27|        <button class="btn modal-cancel-btn modal-btn modal-btn-cancel">${cancelText}</button>
    28|    28|        <button class="btn btn-primary modal-confirm-btn modal-btn">${confirmText}</button>
    29|    29|      </div>
    30|    30|    </div>`;
    31|    31|  document.body.appendChild(overlay);
    32|    32|  if (typeof lucide !== 'undefined') lucide.createIcons();
    33|    33|
    34|    34|  return new Promise((resolve) => {
    35|    35|    const close = () => { overlay.remove(); resolve(null); };
    36|    36|    overlay.querySelector('.modal-close-btn')?.addEventListener('click', close);
    37|    37|    overlay.querySelector('.modal-cancel-btn')?.addEventListener('click', close);
    38|    38|    overlay.querySelector('.modal-backdrop')?.addEventListener('click', close);
    39|    39|    overlay.querySelector('.modal-confirm-btn')?.addEventListener('click', async () => {
    40|    40|      const values = fields.map((_, i) => {
    41|    41|        const el = document.getElementById(`modal-field-${i}`);
    42|    42|        return el ? (fields[i].type === 'number' ? Number(el.value) : el.value) : null;
    43|    43|      });
    44|    44|      const result = await onConfirm(values);
    45|    45|      if (result !== false) { overlay.remove(); resolve(values); }
    46|    46|    });
    47|    47|    // Enter to submit
    48|    48|    overlay.addEventListener('keydown', (e) => {
    49|    49|      if (e.key === 'Enter') overlay.querySelector('.modal-confirm-btn')?.click();
    50|    50|    });
    51|    51|    // Focus first field
    52|    52|    const firstInput = overlay.querySelector('.form-input');
    53|    53|    if (firstInput) setTimeout(() => firstInput.focus(), 100);
    54|    54|  });
    55|    55|}
    56|    56|
    57|    57|// ─── Confirm Dialog ────────────────────────────
    58|    58|export function showConfirm({ title, message, confirmText = 'Yakin', cancelText = 'Batal', danger = false }) {
    59|    59|  const existing = document.getElementById('stock-modal-overlay');
    60|    60|  if (existing) existing.remove();
    61|    61|
    62|    62|  const overlay = document.createElement('div');
    63|    63|  overlay.id = 'stock-modal-overlay';
    64|    64|  overlay.innerHTML = `
    65|    65|    <div class="modal-backdrop" onclick="this.closest('#stock-modal-overlay')?.remove()"></div>
    66|    66|    <div class="modal-panel" class="modal-panel-narrow">
    67|    67|      <div class="text-center py-2">
    68|    68|        <h3 class="text-sm strong m-0 text-main">${title}</h3>
    69|    69|        <p class="text-xs text-muted mt-2" class="line-height-150">${message}</p>
    70|    70|      </div>
    71|    71|      <div class="flex gap-2 mt-4">
    72|    72|        <button class="btn modal-cancel-btn modal-btn modal-btn-cancel">${cancelText}</button>
    73|    73|        <button class="btn modal-confirm-btn modal-btn ${danger ? 'modal-btn-danger' : 'btn-primary'}">${confirmText}</button>
    74|    74|      </div>
    75|    75|    </div>`;
    76|    76|  document.body.appendChild(overlay);
    77|    77|
    78|    78|  return new Promise((resolve) => {
    79|    79|    const close = (val) => { overlay.remove(); resolve(val); };
    80|    80|    overlay.querySelector('.modal-backdrop')?.addEventListener('click', () => close(false));
    81|    81|    overlay.querySelector('.modal-cancel-btn')?.addEventListener('click', () => close(false));
    82|    82|    overlay.querySelector('.modal-confirm-btn')?.addEventListener('click', () => close(true));
    83|    83|  });
    84|    84|}
    85|    85|
    86|    86|// ─── Render ────────────────────────────────────
    87|    87|export async function renderPortfolio(root, activeTab) {
    88|    88|    const isPort = activeTab === 'portfolio';
    89|    89|    document.title = 'RetailBijak — Portofolio';
    90|    90|    root.innerHTML = `
    91|    91|      <section class="grid grid-cols-12 stagger-reveal portfolio-page-pro">
    92|    92|        <div class="col-span-12 portfolio-header">
    93|    93|          <div class="portfolio-header-copy">
    94|    94|            <div class="portfolio-kicker">Pusat Portofolio</div>
    95|    95|            <h1>Aset & Daftar Pantau</h1>
    96|    96|            <p>Kelola posisi aktif dan pantau aset kandidat.</p>
    97|    97|          </div>
    98|    98|          <div class="portfolio-meta-rail">
    99|    99|            <div class="portfolio-tab-switch flex p-1" style="background:rgba(15,23,41,.5);border-radius:10px;border:1px solid var(--border-subtle);">
   100|   100|              <a href="#portfolio" class="btn ${isPort ? 'btn-primary' : ''} portfolio-tab-btn">Portofolio</a>
   101|   101|              <a href="#watchlist" class="btn ${!isPort ? 'btn-primary' : ''} portfolio-tab-btn">Pantauan</a>
   102|   102|            </div>
   103|   103|          </div>
   104|   104|        </div>
   105|   105|        <div id="tab-content" class="col-span-12 panel flex-col portfolio-card">
   106|   106|            <div class="p-4 text-center"><div class="skeleton skel-text" class="skeleton-center"></div></div>
   107|   107|        </div>
   108|   108|      </section>`;
   109|   109|    observeElements();
   110|   110|    if (isPort) await renderPortfolioTab(root.querySelector('#tab-content'));
   111|   111|    else await renderWatchlistTab(root.querySelector('#tab-content'));
   112|   112|    if (typeof lucide !== 'undefined') lucide.createIcons();
   113|   113|}
   114|   114|
   115|   115|async function renderWatchlistTab(el) {
   116|   116|    const data = await fetchWatchlist();
   117|   117|    const rows = Array.isArray(data?.data) ? data.data : [];
   118|   118|
   119|   119|    el.innerHTML = `
   120|   120|      <div class="flex justify-between items-center p-4" class="border-bottom-subtle">
   121|   121|        <h3 class="text-xs uppercase text-dim strong m-0 portfolio-section-header">Daftar Pantau <span class="badge badge-primary ml-2">${rows.length} ENTRI</span></h3>
   122|   122|        <button id="add-watchlist" class="btn btn-primary portfolio-action-btn"><i data-lucide="plus" class="lucide-sm"></i> Tambah</button>
   123|   123|      </div>
   124|   124|      ${rows.length ? `
   125|   125|      <div class="table-wrapper">
   126|   126|        <table class="table">
   127|   127|          <thead><tr><th>Kode Saham</th><th>Catatan</th><th class="text-right">Aksi</th></tr></thead>
   128|   128|          <tbody>${rows.map(r => `
   129|   129|            <tr>
   130|   130|              <td><a href="#stock/${r.ticker}" class="flex items-center gap-3"><span class="portfolio-row-kicker">${r.ticker.substring(0,2)}</span><span class="mono strong text-main" class="search-suggestion-ticker">${r.ticker}</span></a></td>
   131|   131|              <td class="text-muted text-sm">${r.notes || '-'}</td>
   132|   132|              <td class="text-right"><button class="btn-icon delete-watchlist portfolio-delete-btn" data-ticker="${r.ticker}"><i data-lucide="trash-2" class="lucide-md"></i></button></td>
   133|   133|            </tr>`).join('')}</tbody>
   134|   134|        </table>
   135|   135|      </div>` : `
   136|   136|      <div class="empty-state-v2">
   137|   137|        <div class="empty-icon"><i data-lucide="eye" class="watchlist-empty-icon"></i></div>
   138|   138|        <h3>Daftar Pantau Kosong</h3>
   139|   139|        <p>Tambahkan saham untuk mulai memantau pergerakan dan sinyal.</p>
   140|   140|        <button id="add-watchlist-empty" class="btn btn-primary" class="mt-12"><i data-lucide="plus" class="lucide-md"></i> Tambah Sekarang</button>
   141|   141|      </div>`}`;
   142|   142|
   143|   143|    // Watchlist add
   144|   144|    const addBtn = el.querySelector('#add-watchlist') || el.querySelector('#add-watchlist-empty');
   145|   145|    if (addBtn) addBtn.addEventListener('click', async () => {
   146|   146|        const vals = await showModal({
   147|   147|            title: 'Tambah Saham ke Pantauan',
   148|   148|            fields: [{ label: 'Kode Saham', placeholder: 'BBCA' }, { label: 'Catatan (opsional)', placeholder: 'Target swing' }],
   149|   149|            confirmText: 'Tambah',
   150|   150|            onConfirm: async ([ticker, notes]) => {
   151|   151|                if (!ticker || !ticker.trim()) { showToast('Kode saham wajib diisi', 'error'); return false; }
   152|   152|                await saveWatchlistItem({ ticker: ticker.toUpperCase().trim(), notes: notes || '' });
   153|   153|                showToast(`${ticker.toUpperCase()} ditambahkan`, 'success');
   154|   154|            }
   155|   155|        });
   156|   156|        if (vals) { await renderWatchlistTab(el); if (typeof lucide !== 'undefined') lucide.createIcons(); }
   157|   157|    });
   158|   158|
   159|   159|    // Watchlist delete
   160|   160|    el.querySelectorAll('.delete-watchlist').forEach(btn => {
   161|   161|        btn.addEventListener('click', async (e) => {
   162|   162|            const ticker = e.currentTarget.getAttribute('data-ticker');
   163|   163|            const ok = await showConfirm({ title: 'Hapus dari Pantauan?', message: `Yakin ingin menghapus ${ticker} dari daftar pantau?`, confirmText: 'Hapus', danger: true });
   164|   164|            if (ok) {
   165|   165|                await deleteWatchlistItem(ticker);
   166|   166|                showToast(`${ticker} dihapus`, 'success');
   167|   167|                await renderWatchlistTab(el);
   168|   168|                if (typeof lucide !== 'undefined') lucide.createIcons();
   169|   169|            }
   170|   170|        });
   171|   171|    });
   172|   172|}
   173|   173|
   174|   174|async function renderPortfolioTab(el) {
   175|   175|    const data = await fetchPortfolio();
   176|   176|    const rows = Array.isArray(data?.data) ? data.data : [];
   177|   177|
   178|   178|    el.innerHTML = `
   179|   179|      <div class="flex justify-between items-center p-4" class="border-bottom-subtle">
   180|   180|        <h3 class="text-xs uppercase text-dim strong m-0 portfolio-section-header">Posisi Aktif <span class="badge badge-primary ml-2">${rows.length} POS</span></h3>
   181|   181|        <button id="add-portfolio" class="btn btn-primary portfolio-action-btn"><i data-lucide="plus" class="lucide-sm"></i> Tambah</button>
   182|   182|      </div>
   183|   183|      ${rows.length ? `
   184|   184|      <div class="table-wrapper">
   185|   185|        <table class="table">
   186|   186|          <thead><tr><th>Kode Saham</th><th>Lot</th><th>Harga Rata-Rata</th><th class="text-right">Aksi</th></tr></thead>
   187|   187|          <tbody>${rows.map(r => `
   188|   188|            <tr>
   189|   189|              <td><a href="#stock/${r.ticker}" class="flex items-center gap-3"><span class="portfolio-row-kicker">${r.ticker.substring(0,2)}</span><span class="mono strong text-main" class="search-suggestion-ticker">${r.ticker}</span></a></td>
   190|   190|              <td class="mono" class="font-size-14">${r.lots}</td>
   191|   191|              <td class="mono" class="font-size-14 text-muted">Rp ${(r.avg_price || 0).toLocaleString()}</td>
   192|   192|              <td class="text-right"><button class="btn-icon delete-portfolio portfolio-delete-btn" data-ticker="${r.ticker}"><i data-lucide="trash-2" class="lucide-md"></i></button></td>
   193|   193|            </tr>`).join('')}</tbody>
   194|   194|        </table>
   195|   195|      </div>` : `
   196|   196|      <div class="empty-state-v2">
   197|   197|        <div class="empty-icon"><i data-lucide="briefcase" class="watchlist-empty-icon"></i></div>
   198|   198|        <h3>Belum Ada Posisi</h3>
   199|   199|        <p>Mulai catat posisi saham Anda untuk melacak portofolio.</p>
   200|   200|        <button id="add-portfolio-empty" class="btn btn-primary" class="mt-12"><i data-lucide="plus" class="lucide-md"></i> Tambah Posisi</button>
   201|   201|      </div>`}`;
   202|   202|
   203|   203|    // Portfolio add
   204|   204|    const addBtn = el.querySelector('#add-portfolio') || el.querySelector('#add-portfolio-empty');
   205|   205|    if (addBtn) addBtn.addEventListener('click', async () => {
   206|   206|        const vals = await showModal({
   207|   207|            title: 'Tambah Posisi Portofolio',
   208|   208|            fields: [
   209|   209|                { label: 'Kode Saham', placeholder: 'BBCA' },
   210|   210|                { label: 'Jumlah Lot', type: 'number', value: '1', step: '1', min: '1' },
   211|   211|                { label: 'Harga Rata-Rata (Rp)', type: 'number', value: '1000', step: '100', min: '1' }
   212|   212|            ],
   213|   213|            confirmText: 'Simpan',
   214|   214|            onConfirm: async ([ticker, lots, avgPrice]) => {
   215|   215|                if (!ticker || !ticker.trim()) { showToast('Kode saham wajib diisi', 'error'); return false; }
   216|   216|                if (isNaN(lots) || isNaN(avgPrice) || lots <= 0 || avgPrice <= 0) { showToast('Lot atau harga tidak valid', 'error'); return false; }
   217|   217|                await savePortfolioPosition({ ticker: ticker.toUpperCase().trim(), lots, avg_price: avgPrice });
   218|   218|                showToast(`${ticker.toUpperCase()} ditambahkan`, 'success');
   219|   219|            }
   220|   220|        });
   221|   221|        if (vals) { await renderPortfolioTab(el); if (typeof lucide !== 'undefined') lucide.createIcons(); }
   222|   222|    });
   223|   223|
   224|   224|    // Portfolio delete
   225|   225|    el.querySelectorAll('.delete-portfolio').forEach(btn => {
   226|   226|        btn.addEventListener('click', async (e) => {
   227|   227|            const ticker = e.currentTarget.getAttribute('data-ticker');
   228|   228|            const ok = await showConfirm({ title: 'Hapus Posisi?', message: `Yakin ingin menghapus ${ticker} dari portofolio?`, confirmText: 'Hapus', danger: true });
   229|   229|            if (ok) {
   230|   230|                await deletePortfolioPosition(ticker);
   231|   231|                showToast(`${ticker} dihapus`, 'success');
   232|   232|                await renderPortfolioTab(el);
   233|   233|                if (typeof lucide !== 'undefined') lucide.createIcons();
   234|   234|            }
   235|   235|        });
   236|   236|    });
   237|   237|}
   238|   238|