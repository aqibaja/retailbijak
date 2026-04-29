import { getScanEventSourceUrl, showToast, fetchSettings } from '../api.js';
import { animateCards } from '../main.js';

let autoRefreshTimer = null;

export async function renderScreener(root) {
    root.innerHTML = `
      <section class="section-grid reveal">
        <div class="card">
          <div class="flex-between mb-3"><div><h1 class="mb-2">Stock Screener</h1><p class="muted">Cari setup teknikal yang layak dieksekusi. Fokus pada momentum, volume, dan validasi sinyal.</p></div><button id="btn-run-screener-mobile" class="btn btn-primary screener-mobile-sticky">Run Screener</button></div>
          <div class="split-row screener-layout">
            <div class="panel screener-panel">
              <div class="field"><label>Strategy</label><select id="screener-strategy"><option>retailbijak Momentum</option><option disabled>Golden Cross (Pro)</option><option disabled>RSI Oversold (Pro)</option></select></div>
              <div class="field"><label>Timeframe</label><select id="screener-tf"><option value="1d">Daily (1D)</option><option value="1h">1 Hour (H1)</option><option value="4h">4 Hours (H4)</option><option value="1wk">Weekly (1W)</option></select></div>
              <div class="field"><label>Preset</label><div class="chip-row"><button class="chip active">Breakout</button><button class="chip neutral">Mean Reversion</button><button class="chip neutral">Trend</button></div></div>
              <button id="btn-run-screener" class="btn btn-primary w-full">Run Screener</button>
              <div id="screener-progress" class="screener-progress" style="display:none;"><div id="sp-text" class="progress-text">Scanning... 0%</div><div class="progress-bar"><div id="sp-fill" class="progress-fill"></div></div></div>
            </div>
            <div class="panel screener-results">
              <div class="flex-between mb-3"><h2 class="mb-0">Results</h2><div class="chip neutral" id="screener-count">4 sample matches</div></div>
              <div class="data-table-wrapper"><table class="data-table"><thead><tr><th>Ticker</th><th>Date</th><th>Close</th><th>Magic Line</th><th>CCI</th><th>Stop Loss</th><th>SL %</th><th>Signal</th><th>Action</th></tr></thead><tbody id="screener-tbody"><tr><td><a href="#stock/BBCA" class="mono strong">BBCA</a></td><td class="mono">2026-04-29</td><td class="mono">9,800</td><td class="mono">9,740.20</td><td class="mono">118.32</td><td class="mono">9,520.00</td><td class="mono negative">-2.86%</td><td><span class="chip success">BUY</span></td><td><a href="#stock/BBCA" class="icon-btn" aria-label="View BBCA"><i data-lucide="eye"></i></a></td></tr><tr><td><a href="#stock/ASII" class="mono strong">ASII</a></td><td class="mono">2026-04-29</td><td class="mono">5,300</td><td class="mono">5,180.55</td><td class="mono">102.41</td><td class="mono">5,120.00</td><td class="mono negative">-3.40%</td><td><span class="chip success">BUY</span></td><td><a href="#stock/ASII" class="icon-btn" aria-label="View ASII"><i data-lucide="eye"></i></a></td></tr><tr><td><a href="#stock/ANTM" class="mono strong">ANTM</a></td><td class="mono">2026-04-29</td><td class="mono">1,920</td><td class="mono">1,895.80</td><td class="mono">89.12</td><td class="mono">1,840.00</td><td class="mono negative">-4.17%</td><td><span class="chip success">BUY</span></td><td><a href="#stock/ANTM" class="icon-btn" aria-label="View ANTM"><i data-lucide="eye"></i></a></td></tr><tr><td><a href="#stock/TLKM" class="mono strong">TLKM</a></td><td class="mono">2026-04-29</td><td class="mono">3,420</td><td class="mono">3,390.15</td><td class="mono">76.55</td><td class="mono">3,340.00</td><td class="mono negative">-2.34%</td><td><span class="chip success">BUY</span></td><td><a href="#stock/TLKM" class="icon-btn" aria-label="View TLKM"><i data-lucide="eye"></i></a></td></tr></tbody></table></div>
            </div>
          </div>
        </div>
      </section>`;

    lucide.createIcons();
    animateCards('.card');

    const settings = await fetchSettings();
    if (settings.compact_table_rows) root.querySelector('.data-table')?.classList.add('compact-rows');

    if (autoRefreshTimer) clearInterval(autoRefreshTimer);
    if (settings.auto_refresh_screener) {
        autoRefreshTimer = setInterval(() => window.location.hash === '#screener' && runScreener(), 5 * 60 * 1000);
        showToast('Auto-refresh screener aktif', 'info', 2500);
    }

    root.querySelector('#btn-run-screener').addEventListener('click', runScreener);
    root.querySelector('#btn-run-screener-mobile').addEventListener('click', runScreener);
}

function runScreener() {
    const tf = document.getElementById('screener-tf').value;
    const btn = document.getElementById('btn-run-screener');
    const btnMobile = document.getElementById('btn-run-screener-mobile');
    const tbody = document.getElementById('screener-tbody');
    const progBox = document.getElementById('screener-progress');
    const progText = document.getElementById('sp-text');
    const progFill = document.getElementById('sp-fill');
    const countBadge = document.getElementById('screener-count');

    [btn, btnMobile].forEach(b => { if (b) { b.disabled = true; b.textContent = 'Scanning...'; } });
    tbody.innerHTML = '';
    progBox.style.display = 'block';
    let matchCount = 0;
    countBadge.textContent = '0 matches';

    const eventSource = new EventSource(getScanEventSourceUrl(tf));
    let started = false;
    const hardFallback = setTimeout(() => {
        if (started) return;
        progText.textContent = 'Scanner is slow to respond. Showing last available sample.';
        progFill.style.width = '35%';
        tbody.innerHTML = `<tr><td colspan="9" class="empty-state">Server belum mengirim data scan. Coba lagi atau cek koneksi backend.</td></tr>`;
    }, 7000);
    eventSource.onmessage = (event) => {
        started = true;
        const data = JSON.parse(event.data);
        if (data.type === 'progress') {
            progText.textContent = `Scanning ${data.ticker}... ${data.percent}%`;
            progFill.style.width = `${data.percent}%`;
        } else if (data.type === 'result') {
            matchCount += 1;
            countBadge.textContent = `${matchCount} match${matchCount > 1 ? 'es' : ''}`;
            const r = data.data;
            const tr = document.createElement('tr');
            tr.innerHTML = `<td><a href="#stock/${r.ticker}" class="mono strong">${r.ticker}</a></td><td class="mono">${r.date.split(' ')[0]}</td><td class="mono">${r.close.toLocaleString()}</td><td class="mono">${r.magic_line.toFixed(2)}</td><td class="mono">${r.cci.toFixed(2)}</td><td class="mono">${r.stop_loss.toFixed(2)}</td><td class="mono negative">${r.sl_pct.toFixed(2)}%</td><td><span class="chip success">BUY</span></td><td><a href="#stock/${r.ticker}" class="icon-btn" aria-label="View ${r.ticker}"><i data-lucide="eye"></i></a></td>`;
            tbody.appendChild(tr);
            lucide.createIcons({ root: tr });
        } else if (data.type === 'done') {
            progText.textContent = `Complete! Found ${data.total_signals} signals in ${data.duration_seconds}s`;
            [btn, btnMobile].forEach(b => { if (b) { b.disabled = false; b.textContent = 'Run Screener'; } });
            clearTimeout(hardFallback);
            eventSource.close();
            showToast(`Scan complete: ${data.total_signals} signals`, 'success');
            if (matchCount === 0) tbody.innerHTML = `<tr><td colspan="9" class="empty-state">No signals found for this timeframe.</td></tr>`;
        }
    };
    eventSource.onerror = () => {
        progText.textContent = 'Error connecting to scanner API';
        progFill.style.background = 'var(--danger)';
        [btn, btnMobile].forEach(b => { if (b) { b.disabled = false; b.textContent = 'Run Screener'; } });
        clearTimeout(hardFallback);
        eventSource.close();
        showToast('Connection error. Please try again.', 'error');
    };
}
