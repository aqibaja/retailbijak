import { getScanEventSourceUrl, showToast } from '../api.js?v=20260506H';
import { observeElements } from '../main.js?v=20260506g';

const renderEmptyState = ({
  title = 'Belum ada hasil scan',
  body = 'Pilih timeframe lalu klik Jalankan Pemindaian SwingAQ untuk melihat sinyal beli institusional secara live.',
  action = 'Pengurutan tersedia setelah hasil scan muncul.',
} = {}) => `
  <div class="empty-state-v2">
    <div class="empty-icon"><i data-lucide="radar" class="lucide-lg"></i></div>
    <h3>${title}</h3>
    <p>${body}</p>
    <span class="empty-state-small">${action}</span>
  </div>
`;

const renderSkeleton = () => `
  <div class="flex-col gap-3 p-5">
    ${Array(5).fill('<div class="skeleton skeleton-card skeleton-h-80"></div>').join('')}
  </div>
`;

const renderRow = (r) => `
  <a href="#stock/${r.ticker}" class="scanner-row">
    <div class="scanner-row-main">
      <div class="scanner-row-badge">${r.ticker.substring(0, 2)}</div>
      <div class="scanner-row-copy">
        <div class="scanner-row-title">
          <div class="text-main scanner-row-ticker">${r.ticker}</div>
        </div>
        <div class="scanner-row-name">${r.name || 'Ekuitas IDX'}</div>
      </div>
    </div>
    <div class="scanner-row-stats">
      <div class="scanner-row-stat">
        <span>Harga</span>
        <strong class="mono">${Number(r.close || 0).toLocaleString('id-ID')}</strong>
      </div>
      <div class="scanner-row-stat">
        <span>CCI</span>
        <strong class="mono">${r.cci ?? '—'}</strong>
      </div>
      <div class="scanner-row-stat">
        <span>MA</span>
        <strong class="mono">${r.magic_line ?? '—'}</strong>
      </div>
      <div class="scanner-row-stat">
        <span>Vol</span>
        <strong class="mono">${r.volume_spike ? r.volume_spike.toFixed(1) + 'x' : '—'}</strong>
      </div>
    </div>
  </a>
`;

let currentResults = [];

export async function renderScreener(root) {
    document.title = 'RetailBijak — Pemindai';
    root.innerHTML = `
      <section class="stagger-reveal">
        <div class="mb-6 screener-hero">
          <div class="screener-kicker">SwingAQ Intelligence</div>
          <h1 class="text-3xl strong mb-2 tracking-tight">Pemindai Akumulasi Institusi</h1>
        </div>
        <div class="scanner-layout">
          <div class="scanner-form flex-col gap-5">
            <div class="scanner-header-text">PUSAT KONTROL</div>
            <div class="flex items-center gap-2"><span class="text-xs text-dim uppercase strong">Timeframe:</span><span class="badge badge-primary">Harian (1D)</span></div>
            <p class="scanner-form-note">Jalankan Pemindaian SwingAQ untuk mengecek kandidat akumulasi institusi berbasis stream live backend.</p>
            <button id="btn-run-screener" class="scanner-btn-primary">Jalankan Pemindaian SwingAQ</button>
            <div id="screener-progress" class="hidden panel-lite p-4 scanner-progress">
              <div class="flex justify-between text-xs mb-2"><span id="sp-text">Sedang menganalisis...</span><span id="sp-percent">0%</span></div>
              <div class="screener-progress-track"><div id="sp-fill" class="screener-progress-fill"></div></div>
            </div>
          </div>
          <div class="scanner-results flex-col">
            <div class="flex justify-between items-center p-5 border-b border-subtle">
              <div class="flex items-center gap-3">
                <h3 class="text-xs strong uppercase m-0 screener-signal-title">Sinyal Live</h3>
                <span class="badge" id="screener-count">BELUM SCAN</span>
              </div>
              <div id="screener-toolbar" class="flex gap-2 screener-toolbar hidden">
                <div class="scanner-control-stack">
                  <select id="screener-sort" class="scanner-select screener-control-select">
                      <option value="cci">Urut: CCI</option>
                      <option value="volume">Urut: Volume</option>
                      <option value="ma">Urut: MA</option>
                  </select>
                </div>
                <div class="scanner-control-stack">
                  <input type="text" id="screener-search" placeholder="Cari kode..." class="scanner-select screener-control-search">
                </div>
              </div>
            </div>
            <div id="screener-content" class="screener-content-area">${renderEmptyState()}</div>
          </div>
        </div>
      </section>`;
    observeElements();
    if (typeof lucide !== 'undefined') lucide.createIcons();
    root.querySelector('#btn-run-screener').addEventListener('click', runScreener);
    root.querySelector('#screener-sort')?.addEventListener('change', sortResults);
    root.querySelector('#screener-search')?.addEventListener('input', filterResults);
}

function sortResults() {
    const sortBy = document.getElementById('screener-sort').value;
    currentResults.sort((a, b) => {
        if (sortBy === 'cci') return (b.cci || 0) - (a.cci || 0);
        if (sortBy === 'volume') return (b.volume_spike || 0) - (a.volume_spike || 0);
        if (sortBy === 'ma') return (b.magic_line || 0) - (a.magic_line || 0);
        return 0;
    });
    renderList(currentResults);
}

function filterResults() {
    const term = document.getElementById('screener-search').value.toUpperCase();
    const filtered = currentResults.filter(r => r.ticker.includes(term));
    renderList(filtered);
}

function renderList(results) {
    const contentArea = document.getElementById('screener-content');
    const toolbar = document.getElementById('screener-toolbar');
    const hasResults = results.length > 0;
    if (toolbar) toolbar.style.display = hasResults ? 'flex' : 'none';
    contentArea.innerHTML = hasResults
        ? `<div class="flex-col gap-3">${results.map(r => renderRow(r)).join('')}</div>`
        : renderEmptyState({
            title: 'Tidak ada sinyal terdeteksi',
            body: 'Scan selesai tetapi belum ada kandidat yang lolos rule SwingAQ pada timeframe ini.',
            action: 'Coba jalankan scan lagi nanti.',
          });
    if (!hasResults) {
        const sc = document.getElementById('screener-search');
        if (sc) sc.value = '';
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function runScreener() {
    const btn = document.getElementById('btn-run-screener');
    const contentArea = document.getElementById('screener-content');
    const progBox = document.getElementById('screener-progress');
    const countBadge = document.getElementById('screener-count');
    const toolbar = document.getElementById('screener-toolbar');

    btn.disabled = true;
    btn.classList.add('btn-loading');
    if (toolbar) toolbar.style.display = 'none';
    document.getElementById('screener-search').value = '';
    countBadge.textContent = 'MEMINDAI...';
    currentResults = [];
    contentArea.innerHTML = renderSkeleton();
    progBox.style.display = 'block';

    const es = new EventSource(`${getScanEventSourceUrl('1d')}&rule=SwingAQ`);
    es.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'progress') {
            document.getElementById('sp-text').textContent = `Memindai ${data.ticker}...`;
            document.getElementById('sp-percent').textContent = `${data.percent}%`;
            document.getElementById('sp-fill').style.width = `${data.percent}%`;
        } else if (data.type === 'result') {
            // Dedup by ticker
            if (!currentResults.some(r => r.ticker === data.data.ticker)) {
                currentResults.push(data.data);
            }
            countBadge.textContent = `${currentResults.length} TERDETEKSI`;
            renderList(currentResults);
        } else if (data.type === 'done') {
            btn.disabled = false;
            btn.classList.remove('btn-loading');
            progBox.style.display = 'none';
            countBadge.textContent = currentResults.length > 0 ? `${currentResults.length} TERDETEKSI` : 'TIDAK ADA SINYAL';
            renderList(currentResults);
            showToast(`Pemindaian selesai. Ditemukan ${currentResults.length} sinyal.`, 'success');
            es.close();
        }
    };
    es.onerror = () => {
        es.close();
        btn.disabled = false;
        btn.classList.remove('btn-loading');
        progBox.style.display = 'none';
        countBadge.textContent = 'GAGAL';
        renderList([]);
        showToast('Pemindaian gagal.', 'error');
    };
}
