import { fetchWatchlist, saveWatchlistItem, deleteWatchlistItem, fetchPortfolio, savePortfolioPosition, deletePortfolioPosition, showToast, loadTVWidget, getTVTheme, apiFetch } from '../api.js?v=20260510';
import { money, nf, pf } from '../utils/format.js?v=20260510';
import { observeElements } from '../main.js?v=20260510';

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
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
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
    <div class="modal-backdrop"></div>
    <div class="modal-panel">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-sm strong m-0 text-main">${title}</h3>
        <button class="btn btn-icon modal-close-btn" type="button" aria-label="Tutup"><i data-lucide="x"></i></button>
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
        <button type="button" class="btn modal-cancel-btn modal-btn modal-btn-cancel">${cancelText}</button>
        <button type="button" class="btn btn-primary modal-confirm-btn modal-btn">${confirmText}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  return new Promise((resolve) => {
    const close = (resolveVal = null) => {
      overlay.querySelector('.modal-backdrop')?.classList.add('closing');
      overlay.querySelector('.modal-panel')?.classList.add('closing');
      setTimeout(() => { overlay.remove(); document.body.style.overflow = ''; resolve(resolveVal); }, 200);
    };
    overlay.querySelector('.modal-close-btn')?.addEventListener('click', () => close());
    overlay.querySelector('.modal-cancel-btn')?.addEventListener('click', () => close());
    overlay.querySelector('.modal-backdrop')?.addEventListener('click', () => close());
    overlay.querySelector('.modal-confirm-btn')?.addEventListener('click', async () => {
      const values = fields.map((_, i) => {
        const el = document.getElementById(`modal-field-${i}`);
        return el ? (fields[i].type === 'number' ? Number(el.value) : el.value) : null;
      });
      try {
        const result = await onConfirm(values);
        if (result !== false) close(values);
      } catch (e) { showToast('Terjadi kesalahan, coba lagi', 'error'); }
    });
    overlay.querySelector('.modal-fields')?.addEventListener('submit', (e) => { e.preventDefault(); overlay.querySelector('.modal-confirm-btn')?.click(); });
    overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    const firstInput = overlay.querySelector('.form-input, .modal-input');
    if (firstInput) setTimeout(() => firstInput.focus(), 100);
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
    <div class="modal-backdrop"></div>
    <div class="modal-panel modal-panel-narrow">
      <div class="text-center py-4">
        <h3 class="text-sm strong m-0 text-main">${title}</h3>
        <p class="text-xs text-muted mt-2 line-height-150">${message}</p>
      </div>
      <div class="flex gap-2 mt-4">
        <button type="button" class="btn modal-cancel-btn modal-btn modal-btn-cancel">${cancelText}</button>
        <button type="button" class="btn modal-confirm-btn modal-btn ${danger ? 'modal-btn-danger' : 'btn-primary'}">${confirmText}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  return new Promise((resolve) => {
    const close = (val) => { overlay.querySelector('.modal-backdrop')?.classList.add('closing'); overlay.querySelector('.modal-panel')?.classList.add('closing'); setTimeout(() => { overlay.remove(); document.body.style.overflow = ''; resolve(val); }, 200); };
    overlay.querySelector('.modal-backdrop')?.addEventListener('click', () => close(false));
    overlay.querySelector('.modal-cancel-btn')?.addEventListener('click', () => close(false));
    overlay.querySelector('.modal-confirm-btn')?.addEventListener('click', () => close(true));
    overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(false); });
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
              <button type="button" class="btn portfolio-tab-btn ${isPort ? '' : ''}" id="rebalance-tab-btn" style="font-size:11px">⚖️ Rebalance</button>
            </div>
            ${isPort ? '<button class="btn btn-sm" id="export-csv-btn" title="Export CSV"><i data-lucide="download" style="width:16px"></i> CSV</button>' : ''}
          </div>
        </div>
        <div id="tab-content" class="col-span-12 panel flex-col portfolio-card">
            <div class="p-4 text-center"><div class="skeleton skel-text skeleton-center"></div></div>
        </div>
      </section>`;
    observeElements();
    if (isPort) await renderPortfolioTab(root.querySelector('#tab-content'));
    else await renderWatchlistTab(root.querySelector('#tab-content'));
    
    // Rebalance tab handler
    const rebalanceBtn = root.querySelector('#rebalance-tab-btn');
    if (rebalanceBtn) {
      rebalanceBtn.addEventListener('click', () => renderRebalanceTab(root.querySelector('#tab-content')));
    }
}

// ─── P&L Color ─────────────────────────
function pnlClass(v) { return v > 0 ? 'text-up' : v < 0 ? 'text-down' : 'text-dim'; }
function pnlArrow(v) { return v > 0 ? '▲' : v < 0 ? '▼' : '—'; }
function pnlFmt(v) { return v > 0 ? `+${money(v)}` : money(v); }

async function renderPortfolioTab(el) {
    let data, fetchError;
    try {
        const [posRes, sumRes] = await Promise.all([
            fetchPortfolio(),
            apiFetch('/portfolio/summary').catch(() => null)
        ]);
        data = { positions: posRes, summary: sumRes };
    } catch (e) { fetchError = true; data = null; }

    const rows = Array.isArray(data?.positions?.data) ? data.positions.data : [];
    const summary = data?.summary?.data;
    const hasSummary = summary && summary.positions?.length > 0;

    // KPI cards
    const kpiHtml = hasSummary ? `
      <div class="portfolio-kpi-grid">
        <div class="portfolio-kpi"><span class="portfolio-kpi-label">Total Investasi</span><strong class="portfolio-kpi-value">${money(summary.total_invested)}</strong></div>
        <div class="portfolio-kpi"><span class="portfolio-kpi-label">Nilai Saat Ini</span><strong class="portfolio-kpi-value">${money(summary.current_value)}</strong></div>
        <div class="portfolio-kpi"><span class="portfolio-kpi-label">Untung/Rugi</span><strong class="portfolio-kpi-value ${pnlClass(summary.pnl)}">${pnlFmt(summary.pnl)}</strong></div>
        <div class="portfolio-kpi"><span class="portfolio-kpi-label">Return %</span><strong class="portfolio-kpi-value ${pnlClass(summary.pnl_pct)}">${summary.pnl_pct > 0 ? '+' : ''}${pf(summary.pnl_pct)}</strong></div>
      </div>` : '';

    // Analytics charts container
    const analyticsHtml = `<div id="portfolio-analytics-section" class="portfolio-analytics-grid">
      <div class="portfolio-chart-card" id="equity-curve-card">
        <div class="flex justify-between items-center mb-2">
          <h4 class="text-xs uppercase text-dim strong m-0">Kurva Ekuitas</h4>
          <div class="flex gap-1" id="equity-range-selector">
            <button class="btn btn-xs range-btn active" data-range="1M">1B</button>
            <button class="btn btn-xs range-btn" data-range="3M">3B</button>
            <button class="btn btn-xs range-btn" data-range="6M">6B</button>
            <button class="btn btn-xs range-btn" data-range="1Y">1T</button>
            <button class="btn btn-xs range-btn" data-range="ALL">ALL</button>
          </div>
        </div>
        <div id="equity-curve-chart" style="height:200px"><div class="skeleton skeleton-chart"></div></div>
      </div>
      <div class="portfolio-chart-card">
        <h4 class="text-xs uppercase text-dim strong mb-2">Alokasi Sektor</h4>
        <div id="sector-pie-chart" style="height:200px;display:flex;align-items:center;justify-content:center">
          <div class="text-xs text-dim">Memuat...</div>
        </div>
      </div>
    </div>`;

    // Sector breakdown
    const sectors = summary?.sectors || {};
    const sectorKeys = Object.keys(sectors);
    const sectorHtml = sectorKeys.length ? `
      <div class="portfolio-sector-section">
        <h4 class="text-xs uppercase text-dim strong mb-2">Sektor</h4>
        <div class="portfolio-sector-grid">
          ${sectorKeys.map(s => {
            const sec = sectors[s];
            const cls = pnlClass(sec.pnl);
            return `<div class="portfolio-sector-chip"><span class="portfolio-sector-name">${s}</span><span class="portfolio-sector-weight">${pf(sec.weight)}</span><span class="portfolio-sector-pnl ${cls}">${sec.pnl > 0 ? '+' : ''}${money(sec.pnl)}</span></div>`;
          }).join('')}
        </div>
      </div>` : '';

    el.innerHTML = `
      <div class="flex justify-between items-center p-4 border-bottom-subtle">
        <h3 class="text-xs uppercase text-dim strong m-0 portfolio-section-header">Posisi Aktif <span class="badge badge-primary ml-2">${rows.length} POS</span></h3>
        <button id="add-portfolio" type="button" class="btn btn-primary portfolio-action-btn"><i data-lucide="plus" class="lucide-sm"></i> Tambah</button>
      </div>
      ${kpiHtml}
      ${analyticsHtml}
      ${sectorHtml}
      ${fetchError ? `
      <div class="empty-state-card">
        <div class="empty-state-icon">⚠️</div>
        <strong class="empty-state-title">Gagal Memuat</strong>
        <span class="empty-state-desc">Data portofolio tidak dapat dimuat. Coba refresh halaman.</span>
        <button type="button" class="empty-state-action" onclick="location.reload()"><i data-lucide="refresh-cw" class="lucide-md"></i> Muat Ulang</button>
      </div>` : rows.length ? `
      <div class="table-wrapper">
        <table class="table">
          <thead><tr><th>Kode Saham</th><th>Sektor</th><th>Lot</th><th>Harga Rata-Rata</th><th>Harga Saat Ini</th><th>Untung/Rugi</th><th>Return %</th><th class="text-right">Aksi</th></tr></thead>
          <tbody>${rows.map(r => {
            const sumItem = summary?.positions?.find(p => p.ticker === r.ticker);
            const cp = sumItem?.current_price;
            const pnl = sumItem?.pnl;
            const pnlPct = sumItem?.pnl_pct;
            const sector = sumItem?.sector || '';
            return `<tr>
              <td><a href="#stock/${r.ticker}" class="flex items-center gap-3"><span class="portfolio-row-kicker">${r.ticker.substring(0,2)}</span><span class="mono strong text-main search-suggestion-ticker">${r.ticker}</span></a></td>
              <td class="text-xs text-dim">${sector || '—'}</td>
              <td class="mono font-size-14">${r.lots}</td>
              <td class="mono font-size-14 text-muted">${money(r.avg_price)}</td>
              <td class="mono font-size-14">${cp ? money(cp) : '—'}</td>
              <td class="mono font-size-14 ${pnlClass(pnl)}">${pnl != null ? pnlFmt(pnl) : '—'}</td>
              <td class="mono font-size-14 ${pnlClass(pnlPct)}">${pnlPct != null ? `${pnlPct > 0 ? '+' : ''}${pf(pnlPct)}` : '—'}</td>
              <td class="text-right"><button type="button" class="btn-icon delete-portfolio portfolio-delete-btn" data-ticker="${r.ticker}"><i data-lucide="trash-2" class="lucide-md"></i></button></td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>` : `
      <div class="empty-state-card">
        <div class="empty-state-icon">📊</div>
        <strong class="empty-state-title">Mulai Portofolio Anda</strong>
        <span class="empty-state-desc">Catat posisi saham yang Anda miliki dan pantau P&amp;L secara real-time. Data tersimpan di akun Anda.</span>
        <div class="mt-8 flex gap-2" style="justify-content:center;flex-wrap:wrap">
          <button id="add-portfolio-empty" type="button" class="btn btn-primary portfolio-action-btn"><i data-lucide="plus" class="lucide-md"></i> Tambah Posisi</button>
          <a href="#screener" class="btn portfolio-action-btn" style="padding:8px 16px;font-size:12px"><i data-lucide="radar" class="lucide-md"></i> Cari Ide Saham</a>
          <button id="seed-sample-portfolio" type="button" class="btn portfolio-action-btn" style="padding:8px 16px;font-size:12px"><i data-lucide="test-tube" class="lucide-md"></i> Contoh Data</button>
        </div>
        <div class="mt-6 text-xs text-dim" style="max-width:340px;line-height:1.6;text-align:left;padding:12px 16px;background:var(--bg-panel);border-radius:12px;border:1px solid var(--border-subtle)">
          <strong class="text-muted">📊 Contoh Portofolio:</strong><br>
          BBCA — 2 lot @ Rp6.225 (+4.6%) &nbsp;•&nbsp; TLKM — 5 lot @ Rp3.800 (-1.2%)<br>
          <span style="color:var(--text-dim)">Tambahkan posisi Anda untuk lihat grafik equity curve, alokasi sektor, dan P&amp;L.</span>
        </div>
      </div>`}`;

    // Add
    const addBtn = el.querySelector('#add-portfolio') || el.querySelector('#add-portfolio-empty');
    if (addBtn) addBtn.addEventListener('click', async () => {
        await showModal({
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
    });

    // Seed Sample Data
    const seedBtn = el.querySelector('#seed-sample-portfolio');
    if (seedBtn) seedBtn.addEventListener('click', async () => {
        seedBtn.disabled = true;
        seedBtn.textContent = 'Menambahkan...';
        try {
            const res = await apiFetch('/portfolio/seed-sample', { method: 'POST' });
            if (res?.ok) {
                showToast(res.message || 'Data contoh ditambahkan!', 'success');
                await renderPortfolioTab(el);
            }
        } catch (e) {
            showToast('Gagal menambahkan data contoh', 'error');
            seedBtn.disabled = false;
            seedBtn.innerHTML = '<i data-lucide="test-tube" class="lucide-md"></i> Contoh Data';
        }
    });

    // Delete
    el.querySelectorAll('.delete-portfolio').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const ticker = e.currentTarget.getAttribute('data-ticker');
            const ok = await showConfirm({ title: 'Hapus Posisi?', message: `Yakin ingin menghapus ${ticker} dari portofolio?`, confirmText: 'Hapus', danger: true });
            if (ok) {
                try {
                    await deletePortfolioPosition(ticker);
                    showToast(`${ticker} dihapus`, 'success');
                    await renderPortfolioTab(el);
                } catch (e) { showToast(`Gagal menghapus ${ticker}`, 'error'); }
            }
        });
    });

    // CSV Export handler
    const csvBtn = document.getElementById('export-csv-btn');
    if (csvBtn) {
        csvBtn.addEventListener('click', () => {
            window.location.href = '/api/portfolio/export-csv';
        });
    }

    // Load transaction history
    loadTransactionHistory(el);
    // Load analytics charts
    loadPortfolioAnalytics();
    loadRebalancing();
}

async function loadPortfolioAnalytics() {
  const section = document.getElementById('portfolio-analytics-section');
  if (!section) return;
  try {
    const data = await apiFetch('/portfolio/analytics');
    if (!data?.has_data) {
      document.getElementById('equity-curve-chart').innerHTML = '<div class="empty-state-v2" style="padding:20px"><p class="text-xs text-dim">Belum ada transaksi untuk grafik</p></div>';
      document.getElementById('sector-pie-chart').innerHTML = '<div class="empty-state-v2" style="padding:20px"><p class="text-xs text-dim">Belum ada posisi</p></div>';
      return;
    }
    // ─── Equity Curve ───
    renderEquityCurve(data.equity_curve || []);
    // ─── Sector Pie ───
    renderSectorPie(data.sectors || []);
  } catch (e) {
    section.innerHTML = '<div class="empty-state-v2"><p class="text-xs text-dim">Gagal memuat grafik</p></div>';
  }
}

// ─── Sector Pie Chart (CSS conic-gradient, zero dependency) ───
function renderSectorPie(sectors) {
  const container = document.getElementById('sector-pie-chart');
  if (!container) return;
  if (!sectors.length) {
    container.innerHTML = '<div class="text-xs text-dim">Belum ada data</div>';
    return;
  }
  const colors = ['#10b981','#6366f1','#f59e0b','#ef4444','#06b6d4','#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16'];
  const total = sectors.reduce((s, x) => s + x.pct, 0);
  const conicParts = sectors.map((s, i) => {
    const c = colors[i % colors.length];
    return `${c} ${s.pct}%`;
  });
  const gradient = `conic-gradient(${conicParts.join(', ')})`;

  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:16px;height:100%;width:100%">
      <div style="width:100px;height:100px;border-radius:50%;background:${gradient};flex-shrink:0"></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:4px;overflow:hidden">
        ${sectors.map((s, i) => `
          <div style="display:flex;align-items:center;gap:6px;font-size:11px">
            <span style="width:8px;height:8px;border-radius:2px;background:${colors[i % colors.length]};flex-shrink:0"></span>
            <span class="text-dim" style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</span>
            <span class="strong mono">${s.pct}%</span>
          </div>
        `).join('')}
      </div>
    </div>`;
}

// ─── Equity Curve (LightweightCharts) ───
function renderEquityCurve(data) {
  const container = document.getElementById('equity-curve-chart');
  if (!container) return;
  if (!data.length) {
    container.innerHTML = '<div class="text-xs text-dim" style="padding:40px;text-align:center">Belum ada data transaksi</div>';
    return;
  }
  
  // Filter by active range
  let range = 'ALL';
  const activeBtn = document.querySelector('#equity-range-selector .range-btn.active');
  if (activeBtn) range = activeBtn.dataset.range;
  
  let filtered = data;
  if (range !== 'ALL') {
    const months = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12 }[range] || 0;
    if (months) {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - months);
      filtered = data.filter(d => new Date(d.date) >= cutoff);
    }
  }
  
  if (filtered.length < 2) {
    container.innerHTML = '<div class="text-xs text-dim" style="padding:40px;text-align:center">Data terlalu sedikit untuk grafik</div>';
    return;
  }

  container.innerHTML = '';
  const W = window.LightweightCharts;
  if (!W || !W.createChart) {
    container.innerHTML = '<div class="text-xs text-dim" style="padding:40px;text-align:center">Memuat chart...</div>';
    // Retry after lightweight-charts loads
    const check = setInterval(() => {
      if (window.LightweightCharts?.createChart) {
        clearInterval(check);
        renderEquityCurve(filtered);
      }
    }, 500);
    setTimeout(() => clearInterval(check), 10000);
    return;
  }

  const chart = W.createChart(container, {
    height: 200,
    layout: { background: { type: 'solid', color: 'transparent' }, textColor: '#94a3b8' },
    grid: { vertLines: { color: 'rgba(255,255,255,0.04)' }, horzLines: { color: 'rgba(255,255,255,0.04)' } },
    crosshair: { mode: 0 },
    rightPriceScale: { borderColor: 'rgba(255,255,255,0.08)' },
    timeScale: { borderColor: 'rgba(255,255,255,0.08)', visible: true },
    handleScroll: false,
    handleScale: false,
  });

  const series = chart.addAreaSeries({
    lineColor: '#10b981',
    topColor: 'rgba(16,185,129,0.3)',
    bottomColor: 'rgba(16,185,129,0.02)',
    lineWidth: 2,
    priceFormat: { type: 'custom', formatter: (v) => Math.round(v).toLocaleString('id-ID') },
  });

  series.setData(filtered.map(d => ({
    time: d.date.slice(0, 10).replace(/-/g, '-'),
    value: d.value,
  })));

  chart.timeScale().fitContent();

  // Range selector buttons
  document.querySelectorAll('#equity-range-selector .range-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#equity-range-selector .range-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderEquityCurve(data);
    });
  });
}

async function loadTransactionHistory(el) {
  const container = document.getElementById('transaction-section') || (() => {
    const section = document.createElement('div');
    section.id = 'transaction-section';
    section.className = 'p-4';
    el.appendChild(section);
    return section;
  })();

  try {
    const [txnRes, pnlRes] = await Promise.all([
      fetch('/api/portfolio/transactions').then(r => r.json()).catch(() => null),
      fetch('/api/portfolio/transactions/pnl').then(r => r.json()).catch(() => null),
    ]);
    const txns = Array.isArray(txnRes?.data) ? txnRes.data : [];
    
    const pnlHtml = pnlRes ? `
      <div class="flex gap-4 mb-3 flex-wrap">
        <div class="text-xs"><span class="text-dim">Realized P&L:</span> <strong class="${pnlRes.realized_pnl >= 0 ? 'text-up' : 'text-down'}">${pnlRes.realized_pnl >= 0 ? '+' : ''}${money(pnlRes.realized_pnl)}</strong></div>
        <div class="text-xs"><span class="text-dim">Unrealized P&L:</span> <strong class="${pnlRes.unrealized_pnl >= 0 ? 'text-up' : 'text-down'}">${pnlRes.unrealized_pnl >= 0 ? '+' : ''}${money(pnlRes.unrealized_pnl)}</strong></div>
        <div class="text-xs"><span class="text-dim">Total P&L:</span> <strong class="${pnlRes.total_pnl >= 0 ? 'text-up' : 'text-down'}">${pnlRes.total_pnl >= 0 ? '+' : ''}${money(pnlRes.total_pnl)}</strong></div>
      </div>` : '';

    container.innerHTML = `
      <div class="flex justify-between items-center mt-4 pt-4 border-top-subtle">
        <h4 class="text-xs uppercase text-dim strong">Riwayat Transaksi <span class="badge ml-2">${txns.length} ENTRI</span></h4>
        <button id="add-transaction-btn" type="button" class="btn btn-primary btn-sm"><i data-lucide="plus" class="lucide-sm"></i> Transaksi</button>
      </div>
      ${pnlHtml}
      ${txns.length
        ? `<div class="table-wrapper mt-2">
            <table class="table table-sm">
              <thead><tr><th>Ticker</th><th>Jenis</th><th>Lot</th><th>Harga</th><th>Fee</th><th>Total</th><th>Tanggal</th><th class="text-right">Aksi</th></tr></thead>
              <tbody>${txns.map(t => `
                <tr>
                  <td><span class="mono strong">${t.ticker}</span></td>
                  <td><span class="badge ${t.transaction_type === 'buy' ? 'badge-up' : 'badge-down'}">${t.transaction_type.toUpperCase()}</span></td>
                  <td class="mono">${t.lots}</td>
                  <td class="mono">${money(t.price)}</td>
                  <td class="mono text-dim">${money(t.fee)}</td>
                  <td class="mono">${money(t.total)}</td>
                  <td class="text-xs text-dim">${(t.transaction_date || '').slice(0,10)}</td>
                  <td class="text-right"><button class="btn-icon delete-txn" data-txn-id="${t.id}"><i data-lucide="trash-2" style="width:14px"></i></button></td>
                </tr>`).join('')}</tbody>
            </table>
          </div>`
        : '<div class="text-xs text-dim mt-2">Belum ada transaksi. Klik "Transaksi" untuk mencatat beli/jual.</div>'
      }`;

    // Add transaction button
    const addBtn = document.getElementById('add-transaction-btn');
    if (addBtn) addBtn.addEventListener('click', () => showTransactionForm(el));

    // Delete transaction
    container.querySelectorAll('.delete-txn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.txnId;
        if (!id || !confirm('Hapus transaksi ini?')) return;
        try {
          await fetch(`/api/portfolio/transactions/${id}`, { method: 'DELETE' });
          showToast('Transaksi dihapus', 'success');
          loadTransactionHistory(el);
        } catch (e) { showToast('Gagal menghapus', 'error'); }
      });
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
  } catch (e) { console.warn('Transaction history error:', e); }
}

async function showTransactionForm(el) {
  const { showModal } = await import('./portfolio.js?v=20260510');
  showModal({
    title: 'Catat Transaksi',
    fields: [
      { label: 'Kode Saham', placeholder: 'BBCA' },
      { label: 'Jenis', type: 'select', options: [
        { value: 'buy', label: 'Beli' },
        { value: 'sell', label: 'Jual' },
      ]},
      { label: 'Harga (Rp)', type: 'number', value: '1000', step: '50' },
      { label: 'Jumlah Lot', type: 'number', value: '1', step: '1', min: '1' },
      { label: 'Biaya/Broker (Rp)', type: 'number', value: '0', step: '1000' },
      { label: 'Catatan (opsional)', placeholder: '' },
    ],
    confirmText: 'Simpan',
    onConfirm: async ([ticker, type, price, lots, fee, notes]) => {
      if (!ticker || !ticker.trim()) { showToast('Kode saham wajib diisi', 'error'); return false; }
      if (!price || isNaN(price) || price <= 0) { showToast('Harga tidak valid', 'error'); return false; }
      try {
        const res = await fetch('/api/portfolio/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticker: ticker.toUpperCase().trim(),
            transaction_type: type || 'buy',
            price: parseFloat(price),
            lots: parseInt(lots) || 1,
            fee: parseFloat(fee) || 0,
            notes: notes || '',
          }),
        }).then(r => r.json());
        if (res?.ok) { showToast(res.message, 'success'); loadTransactionHistory(el); }
        else showToast('Gagal', 'error');
      } catch (e) { showToast('Gagal menyimpan', 'error'); }
      return true;
    },
  });
}

// ─── Rebalance (15.4) ──────────────────────────
async function renderRebalanceTab(el) {
  if (!el) return;
  el.innerHTML = '<div class="skeleton" style="height:200px;margin:1rem"></div>';
  
  try {
    const res = await fetch('/api/portfolio/rebalance');
    const data = await res.json();
    
    if (!data || !data.suggestions || data.suggestions.length === 0) {
      el.innerHTML = `<div class="empty-state-card"><div class="empty-icon">⚖️</div><h3>${data?.message || 'Belum ada data portofolio'}</h3><p>Tambahkan posisi portofolio terlebih dahulu.</p></div>`;
      return;
    }
    
    const total = data.total_value || 0;
    
    el.innerHTML = `
      <div class="rebalance-wrap" style="padding:16px">
        <div class="flex justify-between items-center mb-3">
          <h3 style="margin:0;font-size:1rem;font-weight:800">⚖️ Rebalancing Portofolio</h3>
          <span class="text-xs text-dim">Total: Rp ${total.toLocaleString('id-ID')}</span>
        </div>
        <div class="rebalance-method mb-3" style="font-size:12px;color:var(--text-muted);background:var(--bg-panel);padding:10px 14px;border-radius:10px;border:1px solid var(--border-subtle)">
          Target: <strong>equal-weight antar sektor</strong>. Rekomendasi aksi jika alokasi menyimpang &gt;2% dari target.
        </div>
        <div class="rebalance-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px">
          ${data.suggestions.map(s => {
            const actionColor = s.action === 'overweight' ? 'var(--up-color)' : s.action === 'underweight' ? 'var(--down-color)' : 'var(--text-dim)';
            const actionIcon = s.action === 'overweight' ? '⬇️ Jual' : s.action === 'underweight' ? '⬆️ Beli' : '✅ Biarkan';
            return `
              <div class="rebalance-card" style="padding:14px;border-radius:12px;background:var(--bg-card);border:1px solid var(--border-subtle);border-left:3px solid ${actionColor}">
                <div class="flex justify-between items-center mb-2">
                  <strong style="font-size:13px">${s.sector}</strong>
                  <span style="font-size:10px;font-weight:700;color:${actionColor}">${actionIcon}</span>
                </div>
                <div class="rebalance-bar" style="height:6px;background:var(--border-subtle);border-radius:3px;overflow:hidden;margin-bottom:8px">
                  <div style="height:100%;width:${Math.min(s.current_pct * 3, 100)}%;background:${actionColor};border-radius:3px"></div>
                </div>
                <div class="flex justify-between text-xs" style="color:var(--text-muted)">
                  <span>Saat ini: <strong style="color:var(--text-main)">${s.current_pct}%</strong></span>
                  <span>Target: <strong style="color:var(--text-main)">${s.target_pct}%</strong></span>
                </div>
                ${s.diff ? `<div class="text-xs mt-1" style="color:${actionColor}">${s.diff > 0 ? '+' : ''}${s.diff.toFixed(1)}% dari target</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
        <div class="text-xs text-dim mt-3" style="text-align:center">Data berdasarkan harga terakhir. Update posisi untuk rekomendasi akurat.</div>
      </div>
    `;
  } catch (e) {
    el.innerHTML = `<div class="empty-state-card"><div class="empty-icon">⚠️</div><h3>Gagal memuat data</h3><p>${e.message || 'Coba refresh halaman.'}</p><button class="btn btn-primary" onclick="location.reload()">Refresh</button></div>`;
  }
}
async function renderWatchlistTab(el, activeGroupId) {
    let data, groups, fetchError;
    const activeGroup = activeGroupId || 0;
    try {
        const [wlRes, grpRes] = await Promise.all([fetchWatchlist(), apiFetch('/watchlist-groups')]);
        data = wlRes;
        groups = Array.isArray(grpRes?.data) ? grpRes.data : [];
    } catch (e) { fetchError = true; data = null; groups = []; }
    const allRows = Array.isArray(data?.data) ? data.data : [];
    const rows = activeGroup ? allRows.filter(r => r.group_id === activeGroup) : allRows;

    // Build group tabs
    const groupTabs = `<div class="watchlist-group-tabs flex gap-1 p-2" style="border-bottom:1px solid var(--border-subtle);overflow-x:auto">
      ${groups.map(g => `
        <button class="btn btn-xs grp-tab ${g.id === (activeGroup || 0) ? 'active' : ''}" data-grp-id="${g.id}" style="flex-shrink:0">
          ${g.icon !== 'folder' ? `<i data-lucide="${g.icon}" style="width:12px"></i>` : ''} ${g.name}
        </button>
      `).join('')}
      <button class="btn btn-xs grp-mgr" id="btn-manage-groups" style="flex-shrink:0;margin-left:auto" title="Kelola grup"><i data-lucide="settings" style="width:12px"></i></button>
    </div>`;
    el.innerHTML = `
      <div class="flex justify-between items-center p-4 border-bottom-subtle">
        <h3 class="text-xs uppercase text-dim strong m-0 portfolio-section-header">Daftar Pantau <span class="badge badge-primary ml-2">${rows.length} ENTRI</span></h3>
        <div class="flex gap-2">
          <button id="add-watchlist" type="button" class="btn btn-primary portfolio-action-btn"><i data-lucide="plus" class="lucide-sm"></i> Tambah</button>
          <button id="btn-compare-watchlist" type="button" class="btn portfolio-action-btn"><i data-lucide="bar-chart-3" class="lucide-sm"></i> Bandingkan</button>
        </div>
      </div>
        ${groupTabs}
      ${fetchError ? `
      <div class="empty-state-card">
        <div class="empty-state-icon">⚠️</div>
        <strong class="empty-state-title">Gagal Memuat</strong>
        <span class="empty-state-desc">Data tidak dapat dimuat. Coba refresh halaman.</span>
        <button type="button" class="empty-state-action" onclick="location.reload()"><i data-lucide="refresh-cw" class="lucide-md"></i> Muat Ulang</button>
      </div>` : rows.length ? `
      <div class="table-wrapper">
        <table class="table">
          <thead><tr><th>Kode Saham</th><th>Catatan</th><th class="text-right">Aksi</th></tr></thead>
          <tbody>${rows.map(r => `
            <tr>
              <td><a href="#stock/${r.ticker}" class="flex items-center gap-3"><span class="portfolio-row-kicker">${r.ticker.substring(0,2)}</span><span class="mono strong text-main search-suggestion-ticker">${r.ticker}</span></a></td>
              <td class="text-muted text-sm">${r.notes || '-'}</td>
              <td class="text-right"><button type="button" class="btn-icon delete-watchlist portfolio-delete-btn" data-ticker="${r.ticker}"><i data-lucide="trash-2" class="lucide-md"></i></button></td>
            </tr>`).join('')}</tbody>
        </table>
      </div>
      <div id="watchlist-mini-charts" class="portfolio-mini-grid mt-3"></div>` : `
      <div class="empty-state-card">
        <div class="empty-state-icon">👁️</div>
        <strong class="empty-state-title">Daftar Pantau Kosong</strong>
        <span class="empty-state-desc">Tambahkan saham untuk mulai memantau pergerakan dan sinyal.</span>
        <button id="add-watchlist-empty" type="button" class="empty-state-action"><i data-lucide="plus" class="lucide-md"></i> Tambah Sekarang</button>
      </div>`}`;
    
    // Group tab handlers
    // Compare watchlist button
    document.getElementById('btn-compare-watchlist')?.addEventListener('click', () => {
      const tickers = allRows.map(r => r.ticker).filter(Boolean);
      if (tickers.length < 2) { showToast('Minimal 2 saham untuk dibandingkan', 'warning'); return; }
      window.location.hash = '#compare/' + tickers.join('+');
    });

    // Group select change handler
    el.querySelectorAll('.wl-group-select').forEach(sel => {
      btn.addEventListener('click', async () => {
        const gid = parseInt(btn.dataset.grpId) || 0;
        // Re-render with this group active
        await renderWatchlistTab(el, gid);
      });
    });
    // Manage groups button
    document.getElementById('btn-manage-groups')?.addEventListener('click', () => showManageGroupsDialog(el));

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
    });

    el.querySelectorAll('.delete-watchlist').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const ticker = e.currentTarget.getAttribute('data-ticker');
            const ok = await showConfirm({ title: 'Hapus dari Pantauan?', message: `Yakin ingin menghapus ${ticker}?`, confirmText: 'Hapus', danger: true });
            if (ok) {
                try { await deleteWatchlistItem(ticker); showToast(`${ticker} dihapus`, 'success'); await renderWatchlistTab(el); }
                catch (e) { showToast(`Gagal menghapus ${ticker}`, 'error'); }
            }
        });
    });

    // TV mini charts
    const miniGrid = document.getElementById('watchlist-mini-charts');
    if (miniGrid && rows.length) {
      const watchSymbols = rows.slice(0, 4);
      miniGrid.innerHTML = watchSymbols.map((r, i) => `<div id="tv-mini-${i}" class="portfolio-mini-card"></div>`).join('');
      watchSymbols.forEach((r, i) => {
        setTimeout(() => {
          loadTVWidget(`tv-mini-${i}`, 'mini-symbol-overview', {
            symbol: `IDX:${r.ticker.toUpperCase().replace('.JK','')}`, width: '100%', height: 160,
            dateRange: '3M', colorTheme: getTVTheme(), isTransparent: false, autosize: false,
            chartOnly: false, locale: 'id_ID',
          });
        }, i * 200);
      });
    }
}

// ─── Manage Watchlist Groups ──────────
async function showManageGroupsDialog(el) {
  try {
    const grpRes = await apiFetch('/watchlist-groups');
    const groups = Array.isArray(grpRes?.data) ? grpRes.data : [];
    const list = groups.map(g => `<div class="flex items-center gap-2 p-2 border-bottom-subtle">
      <span class="mono strong text-sm text-main" style="flex:1">${g.name}</span>
      <span class="text-xs text-dim">${g.count} item</span>
      <button class="btn-icon delete-group" data-gid="${g.id}" style="flex-shrink:0"><i data-lucide="trash-2" class="lucide-sm"></i></button>
    </div>`).join('');

    const overlay = document.createElement('div');
    overlay.id = 'stock-modal-overlay';
    overlay.innerHTML = `<div class="modal-backdrop"></div>
      <div class="modal-panel" style="width:min(400px,90vw)">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-sm strong m-0">Kelola Grup Pantauan</h3>
          <button class="btn-icon modal-close-btn"><i data-lucide="x"></i></button>
        </div>
        <div class="flex gap-2 mb-3">
          <input type="text" id="new-group-name" class="form-input" placeholder="Nama grup baru" style="flex:1" />
          <button class="btn btn-primary btn-sm" id="btn-create-group">Buat</button>
        </div>
        <div id="group-list" class="flex flex-col" style="max-height:300px;overflow-y:auto">${list || '<div class="text-xs text-dim p-3">Belum ada grup</div>'}</div>
      </div>`;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    overlay.querySelector('.modal-backdrop').addEventListener('click', () => overlay.remove());
    overlay.querySelector('.modal-close-btn').addEventListener('click', () => overlay.remove());

    // Create group
    overlay.querySelector('#btn-create-group').addEventListener('click', async () => {
      const name = overlay.querySelector('#new-group-name').value.trim();
      if (!name) return;
      await apiFetch('/watchlist-groups', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({name}) });
      overlay.remove();
      await renderWatchlistTab(el);
    });

    // Delete groups
    overlay.querySelectorAll('.delete-group').forEach(btn => {
      btn.addEventListener('click', async () => {
        const gid = btn.dataset.gid;
        if (gid === '1') { showToast('Tidak bisa hapus grup default', 'warning'); return; }
        await apiFetch(`/watchlist-groups/${gid}`, { method: 'DELETE' });
        overlay.remove();
        await renderWatchlistTab(el);
      });
    });
  } catch (e) {
    showToast('Gagal memuat grup', 'error');
  }
}
