// ─── Sectors View — Sector Performance Dashboard ────
// Fase 8.1: Aggregate sector performance from OHLCV data
// 11.4.3: Industry accordion in sector detail page

import { apiFetch, showToast } from '../api.js';
import { __ } from '../i18n.js';
import { nf, pf } from '../utils/format.js';

let sectorData = null;

// ─── Sector List View (existing) ────────────────────────

export async function renderSectors(root) {
    const app = root || document.getElementById('app');
    if (!app) return;

    app.innerHTML = `
        <div class="view-content sectors-page">
            <div class="page-header">
                <div>
                    <h1>${__('sektor_title', 'Sektor')}</h1>
                    <p class="page-subtitle">${__('sektor_subtitle', 'Performa sektor IDX berdasarkan data harga')}</p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-sm btn-icon" id="refreshSectors" title="Refresh">
                        <i data-lucide="refresh-cw" class="icon-14"></i>
                    </button>
                    <button class="btn btn-sm btn-primary" id="ai-sector-analysis" title="Analisis Rotasi Sektor" style="margin-left:8px">
                        🤖 Rotasi
                    </button>
                </div>
            </div>

            <div class="sector-rotation-section" style="margin-bottom:16px">
              <div class="flex justify-between items-center mb-2">
                <h2 style="font-size:13px;font-weight:700;margin:0" class="text-dim uppercase">🔄 Rotasi Sektor <span style="font-weight:400;text-transform:none;font-size:11px" class="text-dim">(12 minggu)</span></h2>
                <button type="button" class="btn btn-sm scanner-control-btn" id="toggle-rotation-chart" style="font-size:10px">🔄 Tampilkan</button>
              </div>
              <div id="rotation-chart-container" style="height:0;overflow:hidden;transition:height .3s ease;border-radius:10px;background:var(--bg-panel);border:1px solid var(--border-subtle)">
                <div id="rotation-chart" style="height:300px;width:100%"><div class="skeleton skeleton-chart" style="height:280px;margin:10px"></div></div>
                <div id="rotation-legend" class="flex gap-2 flex-wrap p-2" style="font-size:10px"></div>
              </div>
            </div>

            <div id="sectorCarousel" class="sector-carousel">
                <div class="sector-loading">
                    <div class="loading-spinner"></div>
                    <span>${__('loading', 'Memuat data sektor...')}</span>
                </div>
            </div>

            <div id="sectorDetailGrid" class="sector-detail-grid"></div>
        </div>
    `;

    lucide.createIcons();
    document.getElementById('refreshSectors')?.addEventListener('click', loadSectors);
    document.getElementById('ai-sector-analysis')?.addEventListener('click', runSectorRotationAnalysis);
    // Rotation chart toggle
    const toggleBtn = document.getElementById('toggle-rotation-chart');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const container = document.getElementById('rotation-chart-container');
        if (!container) return;
        if (container.style.height === '0px' || !container.style.height || container.style.height === '0') {
          container.style.height = '340px';
          toggleBtn.textContent = '✕ Tutup';
          loadRotationChart();
        } else {
          container.style.height = '0';
          toggleBtn.textContent = '🔄 Tampilkan';
        }
      });
    }
    await loadSectors();
}

async function loadSectors() {
    const carousel = document.getElementById('sectorCarousel');
    const grid = document.getElementById('sectorDetailGrid');
    if (!carousel || !grid) return;

    carousel.innerHTML = `<div class="sector-loading"><div class="loading-spinner"></div><span>${__('loading', 'Memuat...')}</span></div>`;
    grid.innerHTML = '';

    try {
        const data = await apiFetch('/api/sectors/performance');
        sectorData = data;

        if (!data.sectors || data.sectors.length === 0) {
            carousel.innerHTML = `<div class="sector-empty">
                <div class="sector-empty-icon">📊</div>
                <h3>${__('sektor_empty', 'Belum ada data sektor')}</h3>
                <p>${__('sektor_empty_desc', 'Data sektor hanya tersedia untuk saham yang terklasifikasi.')}</p>
            </div>`;
            return;
        }

        renderCarousel(data.sectors);
        renderDetailGrid(data.sectors);
        lucide.createIcons();
    } catch (e) {
        carousel.innerHTML = `<div class="sector-error">
            <span>⚠️ ${__('error', 'Gagal memuat data sektor')}</span>
            <button class="btn btn-sm" onclick="location.reload()">${__('retry', 'Coba lagi')}</button>
        </div>`;
        showToast('Gagal memuat data sektor', 'error');
    }
}

function renderCarousel(sectors) {
    const carousel = document.getElementById('sectorCarousel');
    if (!carousel || !sectors.length) return;

    // Sort by 1d return desc
    const sorted = [...sectors].sort((a, b) => b.avg_returns['1d'] - a.avg_returns['1d']);

    const chips = sorted.map(s => {
        const ret1d = s.avg_returns['1d'];
        const isPos = ret1d >= 0;
        const retStr = `${isPos ? '+' : ''}${ret1d.toFixed(1)}%`;
        return `<div class="sector-chip ${isPos ? 'up' : 'down'}" data-sector="${s.sector}" onclick="scrollToSector('${s.sector}')" title="${s.sector} — ${s.count} saham">
            <span class="sector-chip-name">${s.sector}</span>
            <span class="sector-chip-ret">${retStr}</span>
        </div>`;
    }).join('');

    carousel.innerHTML = `
        <div class="sector-carousel-header">
            <span class="sector-carousel-title">${__('sektor_today', 'Performa Hari Ini')}</span>
            <span class="sector-carousel-count">${sectors.length} ${__('sektor_count', 'sektor')}</span>
        </div>
        <div class="sector-chips">${chips}</div>
    `;
}

function renderDetailGrid(sectors) {
    const grid = document.getElementById('sectorDetailGrid');
    if (!grid) return;

    const cards = sectors.map(s => {
        const r = s.avg_returns;
        const r1d = r['1d'];
        const r5d = r['5d'];
        const r1m = r['1m'];
        const r3m = r['3m'];

        const top = s.top_stock;
        const bot = s.bottom_stock;

        // Stock list
        const stockRows = s.stocks.map(st => {
            const ret1d = st.returns['1d'];
            const isPos = ret1d >= 0;
            return `<div class="sector-stock-row">
                <a href="#/stock/${st.ticker.replace('.JK', '')}" class="sector-stock-ticker">${st.ticker.replace('.JK', '')}</a>
                <span class="sector-stock-price">${st.close.toLocaleString('id-ID')}</span>
                <span class="sector-stock-ret ${isPos ? 'up' : 'down'}">${isPos ? '+' : ''}${ret1d.toFixed(2)}%</span>
            </div>`;
        }).join('');

        const sectorSlug = encodeURIComponent(s.sector);
        return `<div class="sector-card" id="sector-${s.sector.replace(/\\s+/g, '-')}" onclick="window.location.hash='#sector/${sectorSlug}'" style="cursor:pointer">
            <div class="sector-card-header">
                <div class="sector-card-title-row">
                    <h2 class="sector-card-title">${s.sector}</h2>
                    <span class="sector-card-count">${s.count} ${__('saham', 'saham')}</span>
                </div>
                <div class="sector-card-returns">
                    <div class="sector-ret-item ${r1d >= 0 ? 'up' : 'down'}">
                        <span class="sector-ret-label">1D</span>
                        <span class="sector-ret-val">${r1d >= 0 ? '+' : ''}${r1d.toFixed(1)}%</span>
                    </div>
                    <div class="sector-ret-item ${r5d >= 0 ? 'up' : 'down'}">
                        <span class="sector-ret-label">5D</span>
                        <span class="sector-ret-val">${r5d >= 0 ? '+' : ''}${r5d.toFixed(1)}%</span>
                    </div>
                    <div class="sector-ret-item ${r1m >= 0 ? 'up' : 'down'}">
                        <span class="sector-ret-label">1M</span>
                        <span class="sector-ret-val">${r1m >= 0 ? '+' : ''}${r1m.toFixed(1)}%</span>
                    </div>
                    <div class="sector-ret-item ${r3m >= 0 ? 'up' : 'down'}">
                        <span class="sector-ret-label">3M</span>
                        <span class="sector-ret-val">${r3m >= 0 ? '+' : ''}${r3m.toFixed(1)}%</span>
                    </div>
                </div>
            </div>

            <div class="sector-card-body">
                <div class="sector-topbot">
                    ${top ? `<div class="sector-topbot-item">
                        <span class="sector-topbot-label">${__('top', 'Teratas')}</span>
                        <a href="#/stock/${top.ticker.replace('.JK', '')}" class="sector-topbot-ticker">${top.ticker.replace('.JK', '')}</a>
                        <span class="sector-topbot-ret up">+${top.returns['1d'].toFixed(1)}%</span>
                    </div>` : ''}
                    ${bot ? `<div class="sector-topbot-item">
                        <span class="sector-topbot-label">${__('bottom', 'Terbawah')}</span>
                        <a href="#/stock/${bot.ticker.replace('.JK', '')}" class="sector-topbot-ticker">${bot.ticker.replace('.JK', '')}</a>
                        <span class="sector-topbot-ret down">${bot.returns['1d'].toFixed(1)}%</span>
                    </div>` : ''}
                </div>

                <div class="sector-stocks">
                    ${stockRows}
                </div>
            </div>

            <div class="sector-card-bar ${r1d >= 0 ? 'up' : 'down'}" style="width: ${Math.min(Math.abs(r1d) * 3, 100)}%"></div>
        </div>`;
    }).join('');

    grid.innerHTML = cards;
}

// Global helper for chip scroll
window.scrollToSector = function(sector) {
    const target = document.getElementById(`sector-${sector.replace(/\\s+/g, '-')}`);
    if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        target.classList.add('sector-highlight');
        setTimeout(() => target.classList.remove('sector-highlight'), 1500);
    }
};

// ─── Sector Detail View (11.4.3) ────────────────────────

export async function renderSector(root, sectorName) {
    const app = root;
    if (!app) return;

    // Show loading skeleton
    app.innerHTML = `
        <div class="view-content sector-detail-view">
            <a href="#sector" class="sector-detail-back">
                <i data-lucide="arrow-left" style="width:14px;height:14px"></i>
                ${__('back_to_sectors', 'Kembali ke daftar sektor')}
            </a>
            <div class="sector-detail-loading">
                <div class="sector-detail-skeleton">
                    <div class="skeleton-header"><div class="skeleton-shim"></div></div>
                    <div class="skeleton-badges">
                        <div class="skeleton-badge"><div class="skeleton-shim"></div></div>
                        <div class="skeleton-badge"><div class="skeleton-shim"></div></div>
                        <div class="skeleton-badge"><div class="skeleton-shim"></div></div>
                        <div class="skeleton-badge"><div class="skeleton-shim"></div></div>
                    </div>
                </div>
                ${Array(4).fill('').map(() => `
                    <div class="sector-detail-skeleton">
                        <div class="skeleton-industry"><div class="skeleton-shim"></div></div>
                        <div class="skeleton-stock" style="margin-left:16px"><div class="skeleton-shim"></div></div>
                        <div class="skeleton-stock" style="margin-left:16px"><div class="skeleton-shim"></div></div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    lucide.createIcons();

    try {
        // Decode URL-encoded sector name, then re-encode for API
        const sectorDecoded = decodeURIComponent(sectorName.trim());
        const res = await apiFetch(`/api/sectors/${encodeURIComponent(sectorDecoded)}`);
        if (!res) throw new Error('No response');

        const data = res;
        const sector = data.sector || sectorDecoded;
        const breakdown = data.industry_breakdown || [];

        if (!breakdown.length) {
            app.innerHTML = `
                <div class="view-content sector-detail-view">
                    <a href="#sector" class="sector-detail-back">
                        <i data-lucide="arrow-left" style="width:14px;height:14px"></i>
                        ${__('back_to_sectors', 'Kembali ke daftar sektor')}
                    </a>
                    <div class="sector-detail-error">
                        <div style="font-size:48px;margin-bottom:8px">📭</div>
                        <h3>${__('sector_not_found', 'Sektor tidak ditemukan')}</h3>
                        <p>${__('sector_not_found_desc', 'Sektor "' + sector + '" tidak memiliki data atau tidak ditemukan.')}</p>
                        <a href="#sector" class="btn btn-sm">${__('back_to_sectors', 'Kembali ke daftar sektor')}</a>
                    </div>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        // Compute sector-level returns by averaging industry avg_returns
        const sectorReturn = computeSectorReturns(breakdown);

        renderSectorDetail(app, sector, breakdown, sectorReturn, data.total_stocks);
        lucide.createIcons();
    } catch (e) {
        console.error('Sector detail error:', e);
        app.innerHTML = `
            <div class="view-content sector-detail-view">
                <a href="#sector" class="sector-detail-back">
                    <i data-lucide="arrow-left" style="width:14px;height:14px"></i>
                    ${__('back_to_sectors', 'Kembali ke daftar sektor')}
                </a>
                <div class="sector-detail-error">
                    <div style="font-size:48px;margin-bottom:8px">⚠️</div>
                    <h3>${__('error', 'Gagal memuat detail sektor')}</h3>
                    <p>${e.message || __('unknown_error', 'Terjadi kesalahan yang tidak diketahui.')}</p>
                    <button class="btn btn-sm" onclick="window.location.hash='#sector/${encodeURIComponent(sectorName)}'">${__('retry', 'Coba lagi')}</button>
                </div>
            </div>
        `;
        lucide.createIcons();
    }
}

function computeSectorReturns(breakdown) {
    const periods = ['1d', '5d', '1m', '3m'];
    const result = {};
    let totalWeight = 0;

    for (const period of periods) {
        let sum = 0;
        let count = 0;
        for (const ind of breakdown) {
            if (ind.avg_returns && ind.avg_returns[period] != null) {
                sum += ind.avg_returns[period] * ind.count;
                count += ind.count;
            }
        }
        result[period] = count > 0 ? sum / count : 0;
    }
    return result;
}

function renderSectorDetail(app, sectorName, breakdown, sectorReturn, totalStocks) {
    // Render back button + header
    const returnsHtml = ['1d', '5d', '1m', '3m'].map(p => {
        const val = sectorReturn[p] || 0;
        const cls = val >= 0 ? 'up' : 'down';
        const label = p.toUpperCase();
        return `<span class="sector-ret-badge ${cls}">
            <span class="sector-ret-label">${label}</span>
            ${pf(val, 1)}
        </span>`;
    }).join('');

    app.innerHTML = `
        <div class="view-content sector-detail-view">
            <a href="#sector" class="sector-detail-back">
                <i data-lucide="arrow-left" style="width:14px;height:14px"></i>
                ${__('back_to_sectors', 'Kembali ke daftar sektor')}
            </a>

            <div class="sector-detail-header">
                <div class="sector-detail-header-top">
                    <div>
                        <h1>${__('sector_label', 'Sektor')} ${sectorName}</h1>
                        <div class="sector-detail-count">
                            ${totalStocks || 0} ${__('saham', 'saham')} · ${breakdown.length} ${__('industries', 'industri')}
                        </div>
                    </div>
                    <div class="sector-detail-returns">
                        ${returnsHtml}
                    </div>
                </div>
            </div>

            <div class="industry-accordion" id="industryAccordion">
                ${breakdown.map((ind, idx) => renderIndustryItem(ind, idx)).join('')}
            </div>
        </div>
    `;

    // Bind accordion toggle after render
    requestAnimationFrame(() => {
        document.querySelectorAll('.industry-header').forEach(header => {
            header.addEventListener('click', (e) => {
                const item = header.closest('.industry-item');
                if (!item) return;
                const body = item.querySelector('.industry-body');
                const chevron = header.querySelector('.industry-header-chevron');
                if (!body || !chevron) return;

                const isOpen = body.classList.contains('open');
                if (isOpen) {
                    body.classList.remove('open');
                    chevron.classList.remove('expanded');
                } else {
                    body.classList.add('open');
                    chevron.classList.add('expanded');
                }
            });
        });
    });
}

function renderIndustryItem(ind, idx) {
    const name = ind.industry || __('unknown', 'Tidak diketahui');
    const count = ind.count || 0;
    const avgRet = ind.avg_returns || {};
    const stocks = ind.stocks || [];

    // Returns badges for industry header
    const retBadges = ['1d', '5d'].map(p => {
        const val = avgRet[p];
        if (val == null) return '';
        const cls = val >= 0 ? 'up' : 'down';
        return `<span class="sector-ret-badge ${cls}" style="padding:2px 8px;font-size:10px;gap:3px">
            <span style="font-size:9px;color:var(--text-dim)">${p.toUpperCase()}</span>
            ${pf(val, 1)}
        </span>`;
    }).filter(Boolean).join('');

    // Stock rows
    const stockRows = stocks.map(st => {
        const ticker = (st.ticker || '').replace('.JK', '');
        const name = st.name || ticker;
        const price = st.close != null ? nf(st.close, 0) : '—';
        const change = st.returns && st.returns['1d'] != null ? st.returns['1d'] : null;
        const changeStr = change != null ? pf(change, 2) : '—';
        const changeCls = change != null ? (change >= 0 ? 'up' : 'down') : '';

        return `<a href="#/stock/${ticker}" class="industry-stock-row">
            <span class="stock-ticker">${ticker}</span>
            <span class="stock-name" title="${name}">${name}</span>
            <span class="stock-price">${price}</span>
            <span class="stock-change ${changeCls}">${changeStr}</span>
        </a>`;
    }).join('');

    const emptyRow = !stocks.length
        ? `<div class="industry-empty">${__('no_stocks', 'Tidak ada data saham untuk industri ini.')}</div>`
        : '';

    return `
        <div class="industry-item">
            <button class="industry-header" aria-expanded="false" aria-label="${__('expand_industry', 'Buka industri')} ${name}">
                <div class="industry-header-icon">
                    <i data-lucide="building-2" style="width:18px;height:18px"></i>
                </div>
                <div class="industry-header-info">
                    <div class="industry-header-name">${name}</div>
                    <div class="industry-header-meta">${count} ${__('stocks_count', 'saham')}</div>
                </div>
                <div class="industry-header-returns">${retBadges}</div>
                <i data-lucide="chevron-down" class="industry-header-chevron" style="width:20px;height:20px"></i>
            </button>
            <div class="industry-body">
                <div class="industry-stock-list">
                    <div class="industry-stock-header">
                        <span class="stock-col-ticker">${__('ticker', 'Kode')}</span>
                        <span class="stock-col-name">${__('company', 'Perusahaan')}</span>
                        <span class="stock-col-price">${__('price', 'Harga')}</span>
                        <span class="stock-col-change">${__('change', 'Perubahan')}</span>
                    </div>
                    ${stockRows}
                    ${emptyRow}
                </div>
            </div>
        </div>
    `;
}

// ─── 15.9.1 — AI Sector Rotation Analysis ────────
async function runSectorRotationAnalysis() {
    if (!sectorData?.sectors?.length) {
        showToast('Tidak ada data sektor untuk analisis', 'warning');
        return;
    }
    const btn = document.getElementById('ai-sector-analysis');
    if (btn) { btn.disabled = true; btn.textContent = '⏳...'; }

    try {
        const sectors = sectorData.sectors;
        const lines = sectors.map(s => {
            const r = s.avg_returns;
            return `${s.sector}: 1D=${r['1d']?.toFixed(1)}% 5D=${r['5d']?.toFixed(1)}% 1M=${r['1m']?.toFixed(1)}% 3M=${r['3m']?.toFixed(1)}% (${s.count} saham)`;
        }).join('\n');

        const prompt = `Kamu adalah analis saham IDX. Analisis rotasi sektor berdasarkan data:

${lines}

Beri analisis singkat (3-4 paragraf) dalam Bahasa Indonesia tentang:
1. Sektor leading dan lagging
2. Apakah ada tanda rotasi sektor
3. Rekomendasi sektor untuk jangka pendek (1-2 minggu)
4. Sektor berisiko tinggi`;

        const res = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: prompt })
        });
        const data = await res.json();
        const analysis = data?.reply || data?.response || data?.message || 'Tidak ada respons AI';

        const overlay = document.createElement('div');
        overlay.id = 'ai-sector-overlay';
        overlay.innerHTML = `
            <div style="position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;animation:fadeIn .15s ease" onclick="if(event.target===this)this.remove()">
                <div style="background:var(--card-bg);border-radius:16px;padding:24px;max-width:600px;width:90%;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
                        <h3 style="margin:0;font-size:16px;font-weight:800;color:var(--text-main)">🤖 Analisis Rotasi Sektor</h3>
                        <button type="button" onclick="this.closest('#ai-sector-overlay').remove()" style="background:none;border:none;font-size:22px;color:var(--text-dim);cursor:pointer;padding:0;line-height:1">&times;</button>
                    </div>
                    <div style="font-size:13px;line-height:1.7;color:var(--text-main);white-space:pre-wrap">${analysis}</div>
                    <div class="flex gap-2 mt-4 justify-end">
                        <button type="button" class="btn btn-sm" onclick="this.closest('#ai-sector-overlay').remove()">Tutup</button>
                        <button type="button" class="btn btn-primary btn-sm" id="ai-sector-reanalyze">Analisis Ulang</button>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        document.getElementById('ai-sector-reanalyze')?.addEventListener('click', () => {
            overlay.remove();
            runSectorRotationAnalysis();
        });
    } catch (e) {
        showToast('Gagal analisis: ' + (e.message || ''), 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '🤖 Rotasi'; }
    }
}

// ─── 16.5.2 — Sector Rotation Chart ──────────────
async function loadRotationChart() {
  const chartEl = document.getElementById('rotation-chart');
  if (!chartEl) return;
  try {
    const data = await apiFetch('/api/sectors-rotation?weeks=12');
    if (!data?.dates?.length || !data?.sectors) {
      chartEl.innerHTML = '<div class="empty-state-v2"><p class="text-xs text-dim">Data rotasi belum tersedia</p></div>';
      return;
    }

    const dates = data.dates;
    const sectors = data.sectors;
    const colors = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316','#14b8a6','#6366f1','#d946ef'];
    
    // Top 8 sectors by latest performance
    const entries = Object.entries(sectors)
      .map(([name, returns]) => ({ name, returns }))
      .filter(s => s.returns.some(v => v != null))
      .sort((a, b) => {
        const aLast = a.returns.filter(v => v != null).pop() || 0;
        const bLast = b.returns.filter(v => v != null).pop() || 0;
        return bLast - aLast;
      })
      .slice(0, 8);

    if (!entries.length) {
      chartEl.innerHTML = '<div class="empty-state-v2"><p class="text-xs text-dim">Belum ada data</p></div>';
      return;
    }

    // Build chart using DIV-based bars (zero-dep)
    const legends = entries.map((s, i) => {
      const c = colors[i % colors.length];
      return `<span class="flex items-center gap-1" style="font-size:9px"><span style="width:8px;height:8px;border-radius:2px;background:${c};display:inline-block"></span>${s.name}</span>`;
    }).join('');
    document.getElementById('rotation-legend').innerHTML = legends;

    // Find min/max for scaling
    const allVals = entries.flatMap(s => s.returns.filter(v => v != null));
    if (!allVals.length) { chartEl.innerHTML = '<div class="empty-state-v2"><p class="text-xs text-dim">Tidak ada data</p></div>'; return; }
    const minVal = Math.min(...allVals);
    const maxVal = Math.max(...allVals);
    const absMax = Math.max(Math.abs(minVal), Math.abs(maxVal));

    // Render bar chart per sector per week
    let html = '<div style="overflow-x:auto;padding:8px"><table style="border-collapse:collapse;font-size:10px;width:100%"><thead><tr>';
    html += '<th style="text-align:left;padding:2px 6px;font-weight:600;color:var(--text-dim);position:sticky;left:0;background:var(--bg-panel)">Sektor</th>';
    dates.forEach(d => {
      html += `<th style="text-align:center;padding:2px 3px;font-weight:400;color:var(--text-dim);font-size:9px">${d.slice(-2)}</th>`;
    });
    html += '</tr></thead><tbody>';

    entries.forEach((s, i) => {
      const c = colors[i % colors.length];
      html += `<tr><td style="padding:3px 6px;font-weight:600;color:var(--text-main);position:sticky;left:0;background:var(--bg-panel);white-space:nowrap"><span style="color:${c}">●</span> ${s.name}</td>`;
      s.returns.forEach(v => {
        if (v == null) {
          html += '<td style="padding:3px;text-align:center"><span class="text-dim">—</span></td>';
        } else {
          const pct = (v / absMax) * 100;
          const isUp = v >= 0;
          const barW = Math.min(Math.abs(pct), 100);
          html += `<td style="padding:3px;text-align:center">
            <div style="display:flex;align-items:center;justify-content:center;gap:2px">
              <div style="width:100%;height:4px;background:var(--border-subtle);border-radius:2px;overflow:hidden;display:flex;${isUp ? 'flex-direction:row-reverse' : ''}">
                <div style="height:100%;width:${barW}%;background:${isUp ? '#22c55e' : '#ef4444'};border-radius:2px"></div>
              </div>
              <span style="font-size:9px;color:${isUp ? '#22c55e' : '#ef4444'};min-width:32px;text-align:right">${isUp ? '+' : ''}${v.toFixed(1)}%</span>
            </div>
          </td>`;
        }
      });
      html += '</tr>';
    });

    html += '</tbody></table></div>';
    chartEl.innerHTML = html;
  } catch (e) {
    chartEl.innerHTML = `<div class="empty-state-v2"><p class="text-xs text-dim">Gagal: ${e.message || ''}</p></div>`;
  }
}
