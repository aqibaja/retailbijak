1|import { getScanEventSourceUrl, showToast } from '../api.js?v=20260505b';
     2|import { observeElements } from '../main.js?v=20260504e';
     3|
     4|const renderEmptyState = ({
     5|  title = 'Belum ada hasil scan',
     6|  body = 'Pilih timeframe di panel kiri lalu klik Jalankan Pemindaian SwingAQ untuk melihat sinyal beli institusional secara live.',
     7|  action = 'Pengurutan tersedia setelah hasil scan muncul.',
     8|} = {}) => `
     9|  <div class="empty-state-v2">
    10|    <div class="empty-icon"><i data-lucide="radar" class="lucide-lg"></i></div>
    11|    <h3>${title}</h3>
    12|    <p>${body}</p>
    13|    <span class="empty-state-small">${action}</span>
    14|  </div>
    15|`;
    16|
    17|const rowMeta = (r) => `
    18|  <div class="scanner-row-meta">
    19|    <span class="scanner-row-kicker">SINYAL</span>
    20|    <span class="scanner-row-note">CCI ${r.cci ?? '—'} · MA ${r.magic_line ?? '—'} · Vol ${r.volume_spike ? r.volume_spike.toFixed(1) + 'x' : '—'}</span>
    21|  </div>`;
    22|
    23|const renderSkeleton = () => `
    24|  <div class="flex-col gap-2 p-4">
    25|    ${Array(5).fill('<div class="skeleton skeleton-card skeleton-h-80"></div>').join('')}
    26|  </div>
    27|`;
    28|
    29|const renderRow = (r) => `
    30|  <a href="#stock/${r.ticker}" class="scanner-row">
    31|    <div class="scanner-row-main">
    32|      <div class="scanner-row-badge">${r.ticker.substring(0, 2)}</div>
    33|      <div class="scanner-row-copy">
    34|        <div class="scanner-row-title">
    35|          <div class="text-main scanner-row-ticker">${r.ticker}</div>
    36|          <span class="scanner-row-kicker">SINYAL</span>
    37|        </div>
    38|        <div class="scanner-row-name">${r.name || 'Ekuitas IDX'}</div>
    39|        ${rowMeta(r)}
    40|      </div>
    41|    </div>
    42|    <div class="scanner-row-stats">
    43|      <div class="scanner-row-stat">
    44|        <span>Harga</span>
    45|        <strong class="mono">${Number(r.close || 0).toLocaleString('id-ID')}</strong>
    46|      </div>
    47|      <div class="scanner-row-stat">
    48|        <span>CCI</span>
    49|        <strong class="mono">${r.cci ?? '—'}</strong>
    50|      </div>
    51|      <div class="scanner-row-stat">
    52|        <span>MA</span>
    53|        <strong class="mono">${r.magic_line ?? '—'}</strong>
    54|      </div>
    55|      <div class="scanner-row-stat">
    56|        <span>Vol</span>
    57|        <strong class="mono">${r.volume_spike ? r.volume_spike.toFixed(1) + 'x' : '—'}</strong>
    58|      </div>
    59|    </div>
    60|  </a>
    61|`;
    62|
    63|let currentResults = [];
    64|
    65|export async function renderScreener(root) {
    66|    document.title = 'RetailBijak — Pemindai';
    67|    root.innerHTML = `
    68|      <section class="stagger-reveal">
    69|        <div class="mb-6 screener-hero">
    70|          <div class="screener-kicker">SwingAQ Intelligence</div>
    71|          <h1 class="text-3xl strong mb-2 tracking-tight">Pemindai Akumulasi Institusi</h1>
    72|        </div>
    73|        <div class="scanner-layout">
    74|          <div class="scanner-form flex-col gap-5">
    75|            <div class="scanner-header-text">PUSAT KONTROL</div>
    76|            <div class="flex items-center gap-2"><span class="text-xs text-dim uppercase strong">Timeframe:</span><span class="badge badge-primary">Harian (1D)</span></div>
    77|            <p class="scanner-form-note">Jalankan Pemindaian SwingAQ untuk mengecek kandidat akumulasi institusi berbasis stream live backend.</p>
    78|            <button id="btn-run-screener" class="scanner-btn-primary">Jalankan Pemindaian SwingAQ</button>
    79|            <div id="screener-progress" class="hidden" class="panel-lite p-4 scanner-progress">
    80|              <div class="flex justify-between text-xs mb-2"><span id="sp-text">Sedang menganalisis...</span><span id="sp-percent">0%</span></div>
    81|              <div class="screener-progress-track"><div id="sp-fill" class="screener-progress-fill"></div></div>
    82|            </div>
    83|          </div>
    84|          <div class="scanner-results flex-col">
    85|            <div class="flex justify-between items-center p-5 border-b border-subtle">
    86|              <div class="flex items-center gap-3">
    87|                <h3 class="text-xs strong uppercase m-0 screener-signal-title">Sinyal Live</h3>
    88|                <span class="badge" id="screener-count">BELUM SCAN</span>
    89|              </div>
    90|              <div id="screener-toolbar" class="flex gap-2 screener-toolbar" class="hidden">
    91|                <div class="scanner-control-stack">
    92|                  <select id="screener-sort" class="scanner-select screener-control-select">
    93|                      <option value="cci">Urut: CCI</option>
    94|                      <option value="volume">Urut: Volume</option>
    95|                      <option value="ma">Urut: MA</option>
    96|                  </select>
    97|                </div>
    98|                <div class="scanner-control-stack">
    99|                  <input type="text" id="screener-search" placeholder="Cari kode..." class="scanner-select screener-control-search">
   100|                </div>
   101|              </div>
   102|            </div>
   103|            <div id="screener-content" class="screener-content-area">${renderEmptyState()}</div>
   104|          </div>
   105|        </div>
   106|      </section>`;
   107|    observeElements();
   108|    if (typeof lucide !== 'undefined') lucide.createIcons();
   109|    root.querySelector('#btn-run-screener').addEventListener('click', runScreener);
   110|    root.querySelector('#screener-sort')?.addEventListener('change', sortResults);
   111|    root.querySelector('#screener-search')?.addEventListener('input', filterResults);
   112|}
   113|
   114|function sortResults() {
   115|    const sortBy = document.getElementById('screener-sort').value;
   116|    currentResults.sort((a, b) => {
   117|        if (sortBy === 'cci') return (b.cci || 0) - (a.cci || 0);
   118|        if (sortBy === 'volume') return (b.volume_spike || 0) - (a.volume_spike || 0);
   119|        if (sortBy === 'ma') return (b.magic_line || 0) - (a.magic_line || 0);
   120|        return 0;
   121|    });
   122|    renderList(currentResults);
   123|}
   124|
   125|function filterResults() {
   126|    const term = document.getElementById('screener-search').value.toUpperCase();
   127|    const filtered = currentResults.filter(r => r.ticker.includes(term));
   128|    renderList(filtered);
   129|}
   130|
   131|function renderList(results) {
   132|    const contentArea = document.getElementById('screener-content');
   133|    const toolbar = document.getElementById('screener-toolbar');
   134|    const hasResults = results.length > 0;
   135|    if (toolbar) toolbar.style.display = hasResults ? 'flex' : 'none';
   136|    contentArea.innerHTML = hasResults
   137|        ? `<div class="flex-col">${results.map(r => renderRow(r)).join('')}</div>`
   138|        : renderEmptyState({
   139|            title: 'Tidak ada sinyal terdeteksi',
   140|            body: 'Scan selesai tetapi belum ada kandidat yang lolos rule SwingAQ pada timeframe ini.',
   141|            action: 'Coba jalankan scan lagi nanti.',
   142|          });
   143|    if (!hasResults) {
   144|        const sc = document.getElementById('screener-search');
   145|        if (sc) sc.value = '';
   146|    }
   147|    if (typeof lucide !== 'undefined') lucide.createIcons();
   148|}
   149|
   150|function runScreener() {
   151|    const btn = document.getElementById('btn-run-screener');
   152|    const contentArea = document.getElementById('screener-content');
   153|    const progBox = document.getElementById('screener-progress');
   154|    const countBadge = document.getElementById('screener-count');
   155|    const toolbar = document.getElementById('screener-toolbar');
   156|
   157|    btn.disabled = true;
   158|    if (toolbar) toolbar.style.display = 'none';
   159|    document.getElementById('screener-search').value = '';
   160|    countBadge.textContent = 'MEMINDAI...';
   161|    currentResults = [];
   162|    contentArea.innerHTML = renderSkeleton();
   163|    progBox.style.display = 'block';
   164|
   165|    const es = new EventSource(`${getScanEventSourceUrl('1d')}&rule=SwingAQ`);
   166|    es.onmessage = (event) => {
   167|        const data = JSON.parse(event.data);
   168|        if (data.type === 'progress') {
   169|            document.getElementById('sp-text').textContent = `Memindai ${data.ticker}...`;
   170|            document.getElementById('sp-percent').textContent = `${data.percent}%`;
   171|            document.getElementById('sp-fill').style.width = `${data.percent}%`;
   172|        } else if (data.type === 'result') {
   173|            currentResults.push(data.data);
   174|            countBadge.textContent = `${currentResults.length} TERDETEKSI`;
   175|            renderList(currentResults);
   176|        } else if (data.type === 'done') {
   177|            btn.disabled = false;
   178|            progBox.style.display = 'none';
   179|            countBadge.textContent = currentResults.length > 0 ? `${currentResults.length} TERDETEKSI` : 'TIDAK ADA SINYAL';
   180|            renderList(currentResults);
   181|            showToast(`Pemindaian selesai. Ditemukan ${currentResults.length} sinyal.`, 'success');
   182|            es.close();
   183|        }
   184|    };
   185|    es.onerror = () => {
   186|        es.close();
   187|        btn.disabled = false;
   188|        progBox.style.display = 'none';
   189|        countBadge.textContent = 'GAGAL';
   190|        renderList([]);
   191|        showToast('Pemindaian gagal.', 'error');
   192|    };
   193|}
   194|
