// ─── Sectors View — Sector Performance Dashboard ────
// Fase 8.1: Aggregate sector performance from OHLCV data
// 11.4.3: Industry accordion in sector detail page
// 30.2.1: Top stocks per sector, mini heatmap, rotation scatter chart, filter bar

import { apiFetch, showToast } from '../api.js?v=202605120200';
import { __ } from '../i18n.js?v=202605120200';
import { nf, pf } from '../utils/format.js?v=202605120200';

let sectorData = null;
let _filterState = 'all'; // all | up | down | strongest | weakest
let _rotationScatterChart = null; // Chart.js instance for scatter

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

            <!-- 30.2.1: Filter bar -->
            <div class="sector-filter-bar" id="sectorFilterBar" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
                <button class="sector-filter-chip active" data-filter="all">Semua</button>
                <button class="sector-filter-chip" data-filter="up">📈 Naik</button>
                <button class="sector-filter-chip" data-filter="down">📉 Turun</button>
                <button class="sector-filter-chip" data-filter="strongest">🏆 Terkuat</button>
                <button class="sector-filter-chip" data-filter="weakest">⚠️ Terlemah</button>
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

    // Filter bar chips
    document.getElementById('sectorFilterBar')?.addEventListener('click', (e) => {
        const chip = e.target.closest('.sector-filter-chip');
        if (!chip) return;
        document.querySelectorAll('.sector-filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        _filterState = chip.dataset.filter || 'all';
        if (sectorData?.sectors) applyFilterAndRender(sectorData.sectors);
    });

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
        const data = await apiFetch('/sectors/performance');
        sectorData = data;

        if (!data.sectors || data.sectors.length === 0) {
            carousel.innerHTML = `<div class="sector-empty">
                <div class="sector-empty-icon">📊</div>
                <h3>${__('sektor_empty', 'Belum ada data sektor')}</h3>
                <p>${__('sektor_empty_desc', 'Data sektor hanya tersedia untuk saham yang terklasifikasi.')}</p>
            </div>`;
            return;
        }

        _filterState = 'all';
        document.querySelectorAll('.sector-filter-chip').forEach(c => c.classList.toggle('active', c.dataset.filter === 'all'));
        applyFilterAndRender(data.sectors);
        lucide.createIcons();
    } catch (e) {
        carousel.innerHTML = `<div class="sector-error">
            <span>⚠️ ${__('error', 'Gagal memuat data sektor')}</span>
            <button class="btn btn-sm" onclick="location.reload()">${__('retry', 'Coba lagi')}</button>
        </div>`;
        showToast('Gagal memuat data sektor', 'error');
    }
}

// ─── 30.2.1: Filter + render pipeline ────────────────────
function applyFilterAndRender(sectors) {
    let filtered = [...sectors];
    const sorted1d = [...sectors].sort((a, b) => b.avg_returns['1d'] - a.avg_returns['1d']);

    if (_filterState === 'up') {
        filtered = sectors.filter(s => s.avg_returns['1d'] >= 0);
    } else if (_filterState === 'down') {
        filtered = sectors.filter(s => s.avg_returns['1d'] < 0);
    } else if (_filterState === 'strongest') {
        filtered = sorted1d.slice(0, 5);
    } else if (_filterState === 'weakest') {
        filtered = sorted1d.slice(-5).reverse();
    }

    renderCarousel(filtered);
    renderDetailGrid(filtered);
    lucide.createIcons();
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

        // ── 30.2.1: Top 5 stocks table (sorted by 1d change desc) ──
        const top5 = [...(s.stocks || [])]
            .sort((a, b) => (b.returns['1d'] || 0) - (a.returns['1d'] || 0))
            .slice(0, 5);
        const top5Rows = top5.map(st => {
            const ticker = st.ticker.replace('.JK', '');
            const ret1d = st.returns['1d'];
            const isPos = ret1d >= 0;
            return `<tr onclick="event.stopPropagation();window.location.hash='#/stock/${ticker}'" style="cursor:pointer">
                <td style="padding:3px 6px;font-weight:700;color:var(--primary-color)">${ticker}</td>
                <td style="padding:3px 6px;text-align:right;font-variant-numeric:tabular-nums">${st.close != null ? st.close.toLocaleString('id-ID') : '—'}</td>
                <td style="padding:3px 6px;text-align:right;color:${isPos ? '#22c55e' : '#ef4444'};font-weight:600">${isPos ? '+' : ''}${ret1d.toFixed(2)}%</td>
            </tr>`;
        }).join('');
        const top5Html = top5.length ? `
            <div class="sector-top5" style="margin-top:10px" onclick="event.stopPropagation()">
                <div style="font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;margin-bottom:4px">Top 5 Saham</div>
                <table style="width:100%;border-collapse:collapse;font-size:11px">
                    <thead>
                        <tr style="color:var(--text-dim);font-size:10px">
                            <th style="padding:2px 6px;text-align:left;font-weight:600">Kode</th>
                            <th style="padding:2px 6px;text-align:right;font-weight:600">Harga</th>
                            <th style="padding:2px 6px;text-align:right;font-weight:600">%</th>
                        </tr>
                    </thead>
                    <tbody>${top5Rows}</tbody>
                </table>
            </div>` : '';

        // ── 30.2.1: Mini heatmap — up to 25 squares ──
        const heatStocks = [...(s.stocks || [])]
            .sort((a, b) => (b.returns['1d'] || 0) - (a.returns['1d'] || 0))
            .slice(0, 25);
        const heatSquares = heatStocks.map(st => {
            const ticker = st.ticker.replace('.JK', '');
            const val = st.returns['1d'] || 0;
            const col = heatColor(val, 5);
            return `<div title="${ticker}: ${val >= 0 ? '+' : ''}${val.toFixed(2)}%"
                style="width:16px;height:16px;border-radius:3px;background:${col};cursor:pointer;flex-shrink:0"
                onclick="event.stopPropagation();window.location.hash='#/stock/${ticker}'"></div>`;
        }).join('');
        const heatmapHtml = heatStocks.length ? `
            <div class="sector-heatmap" style="margin-top:10px" onclick="event.stopPropagation()">
                <div style="font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;margin-bottom:4px">Heatmap</div>
                <div style="display:flex;flex-wrap:wrap;gap:3px">${heatSquares}</div>
            </div>` : '';

        const sectorSlug = encodeURIComponent(s.sector);
        return `<div class="sector-card" id="sector-${s.sector.replace(/\s+/g, '-')}" onclick="window.location.hash='#sector/${sectorSlug}'" style="cursor:pointer">
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

                ${top5Html}
                ${heatmapHtml}
            </div>

            <div class="sector-card-bar ${r1d >= 0 ? 'up' : 'down'}" style="width: ${Math.min(Math.abs(r1d) * 3, 100)}%"></div>
        </div>`;
    }).join('');

    grid.innerHTML = cards;
}

// ── 30.2.1: heatColor helper — red→white→green ──
function heatColor(value, maxAbs) {
    const ratio = Math.min(Math.abs(value) / maxAbs, 1);
    if (value >= 0) {
        const r = Math.round(255 * (1 - ratio * 0.8));
        const g = Math.round(255 * (0.3 + ratio * 0.7));
        const b = Math.round(255 * (1 - ratio * 0.8));
        return `rgb(${r},${g},${b})`;
    } else {
        const r = Math.round(255 * (0.3 + ratio * 0.7));
        const g = Math.round(255 * (1 - ratio * 0.8));
        const b = Math.round(255 * (1 - ratio * 0.8));
        return `rgb(${r},${g},${b})`;
    }
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
        const res = await apiFetch(`/sectors/${encodeURIComponent(sectorDecoded)}`);
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

            <!-- 19.3: Sortable All-Stocks Table -->
            <div style="margin-top:20px">
                <button type="button" class="btn btn-sm scanner-control-btn" id="toggle-sortable-stocks" style="font-size:11px;width:100%;justify-content:center;gap:8px;padding:10px" onclick="toggleSortableStocks(this, '${sectorName}')">
                    📋 Tampilkan Semua Saham (${totalStocks}) — Urutkan & Filter
                </button>
                <div id="sortable-stocks-container" style="height:0;overflow:hidden;transition:height .3s ease;border-radius:10px;background:var(--bg-panel);border:1px solid var(--border-subtle);margin-top:8px">
                    <div id="sortable-stocks-content" style="padding:12px">
                        <div class="skeleton" style="height:300px"></div>
                    </div>
                </div>
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

// ─── 16.5.2 + 30.2.1 — Sector Rotation Scatter Chart ──────────────
async function loadRotationChart() {
  const chartEl = document.getElementById('rotation-chart');
  if (!chartEl) return;
  
  try {
    const data = await apiFetch('/sectors/rotation');
    if (!data?.sectors?.length) {
      chartEl.innerHTML = '<div class="empty-state-v2"><p class="text-xs text-dim">Data rotasi belum tersedia</p></div>';
      return;
    }

    // ── 30.2.1: Scatter plot — X=momentum (1M return), Y=relative strength (3M return) ──
    const sectors = data.sectors;
    const scatterData = sectors.map(s => ({
      x: s.returns['1m'] || 0,  // momentum
      y: s.returns['3m'] || 0,  // relative strength
      label: s.name
    }));

    // Destroy previous chart if exists
    if (_rotationScatterChart) {
      _rotationScatterChart.destroy();
      _rotationScatterChart = null;
    }

    chartEl.innerHTML = '<canvas id="rotationScatterCanvas"></canvas>';
    const canvas = document.getElementById('rotationScatterCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    _rotationScatterChart = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Sektor',
          data: scatterData,
          backgroundColor: 'rgba(59, 130, 246, 0.6)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const point = scatterData[ctx.dataIndex];
                return `${point.label}: Momentum=${point.x.toFixed(1)}%, RS=${point.y.toFixed(1)}%`;
              }
            }
          },
          annotation: {
            annotations: {
              lineX: {
                type: 'line',
                xMin: 0,
                xMax: 0,
                borderColor: 'rgba(156, 163, 175, 0.5)',
                borderWidth: 1,
                borderDash: [5, 5]
              },
              lineY: {
                type: 'line',
                yMin: 0,
                yMax: 0,
                borderColor: 'rgba(156, 163, 175, 0.5)',
                borderWidth: 1,
                borderDash: [5, 5]
              }
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Momentum (1M Return %)', color: 'var(--text-dim)' },
            grid: { color: 'rgba(156, 163, 175, 0.1)' },
            ticks: { color: 'var(--text-dim)' }
          },
          y: {
            title: { display: true, text: 'Relative Strength (3M Return %)', color: 'var(--text-dim)' },
            grid: { color: 'rgba(156, 163, 175, 0.1)' },
            ticks: { color: 'var(--text-dim)' }
          }
        }
      }
    });

    // Add quadrant labels
    const legendEl = document.getElementById('rotation-legend');
    if (legendEl) {
      legendEl.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;width:100%;font-size:10px">
          <div style="padding:6px;background:rgba(34,197,94,0.1);border-radius:4px;text-align:center">
            <strong style="color:#22c55e">Leading</strong><br>
            <span style="color:var(--text-dim)">High momentum, High RS</span>
          </div>
          <div style="padding:6px;background:rgba(251,191,36,0.1);border-radius:4px;text-align:center">
            <strong style="color:#fbbf24">Weakening</strong><br>
            <span style="color:var(--text-dim)">Low momentum, High RS</span>
          </div>
          <div style="padding:6px;background:rgba(59,130,246,0.1);border-radius:4px;text-align:center">
            <strong style="color:#3b82f6">Improving</strong><br>
            <span style="color:var(--text-dim)">High momentum, Low RS</span>
          </div>
          <div style="padding:6px;background:rgba(239,68,68,0.1);border-radius:4px;text-align:center">
            <strong style="color:#ef4444">Lagging</strong><br>
            <span style="color:var(--text-dim)">Low momentum, Low RS</span>
          </div>
        </div>
      `;
    }

  } catch (e) {
    chartEl.innerHTML = `<div class="empty-state-v2"><p class="text-xs text-dim">Gagal: ${e.message || ''}</p></div>`;
  }
}

// ─── 19.3.2 — Sortable Sector Stock Table ────────
window.toggleSortableStocks = function(btn, sectorName) {
  const container = document.getElementById('sortable-stocks-container');
  if (!container) return;
  if (container.style.height === '0px' || !container.style.height || container.style.height === '0') {
    container.style.height = '400px';
    btn.textContent = '✕ Tutup Tabel Saham';
    renderSortableStockTable(sectorName);
  } else {
    container.style.height = '0';
    btn.textContent = `📋 Tampilkan Semua Saham — Urutkan & Filter`;
  }
};

let _sortableState = { sector: '', sort: 'return_1d', order: 'desc', stocks: [], filtered: [] };

async function renderSortableStockTable(sectorName) {
  const el = document.getElementById('sortable-stocks-content');
  if (!el) return;
  el.innerHTML = '<div class="skeleton" style="height:300px"></div>';

  try {
    const data = await apiFetch(`/sectors/${encodeURIComponent(sectorName)}/stocks?sort=${_sortableState.sort}&order=${_sortableState.order}&limit=200`);
    if (!data?.stocks?.length) {
      el.innerHTML = '<div class="empty-state-v2"><p class="text-xs text-dim">Tidak ada data saham untuk sektor ini.</p></div>';
      return;
    }
    _sortableState.sector = sectorName;
    _sortableState.stocks = data.stocks;
    _sortableState.filtered = [...data.stocks];
    renderSortableTable(el, data.stocks);
  } catch (e) {
    el.innerHTML = `<div class="empty-state-v2"><p class="text-xs text-dim">Gagal: ${e.message || ''}</p></div>`;
  }
}

function renderSortableTable(el, stocks) {
  const sort = _sortableState.sort;
  const order = _sortableState.order;

  const cols = [
    { key: 'ticker', label: 'Kode', width: '70px' },
    { key: 'name', label: 'Nama', width: '' },
    { key: 'industry', label: 'Industri', width: '120px' },
    { key: 'close', label: 'Harga', width: '80px', cls: 'text-right' },
    { key: 'return_1d', label: '1D', width: '60px', cls: 'text-right' },
    { key: 'return_5d', label: '5D', width: '60px', cls: 'text-right' },
    { key: 'return_1m', label: '1M', width: '60px', cls: 'text-right' },
    { key: 'return_3m', label: '3M', width: '60px', cls: 'text-right' },
  ];

  const nextOrder = (col) => sort === col && order === 'desc' ? 'asc' : 'desc';
  const sortIcon = (col) => sort === col ? (order === 'desc' ? ' ▼' : ' ▲') : '';

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <span style="font-size:11px;color:var(--text-dim)">${stocks.length} saham · Klik header untuk urutkan</span>
      <input type="text" id="sector-stock-filter" placeholder="🔍 Cari kode/nama..." style="padding:4px 8px;font-size:11px;border-radius:6px;border:1px solid var(--border-subtle);background:var(--input-bg);color:var(--text-main);width:200px;outline:none" />
    </div>
    <div style="overflow-x:auto;max-height:320px;overflow-y:auto;border-radius:8px;border:1px solid var(--border-subtle)">
      <table style="width:100%;border-collapse:collapse;font-size:11px;min-width:600px">
        <thead>
          <tr style="position:sticky;top:0;background:var(--bg-panel);z-index:2">
            ${cols.map(c => `<th onclick="sortSectorStocks('${c.key}')" style="padding:8px 6px;text-align:${c.cls === 'text-right' ? 'right' : 'left'};border-bottom:1px solid var(--border-subtle);cursor:pointer;white-space:nowrap;user-select:none;color:var(--text-dim);font-weight:600;font-size:10px;text-transform:uppercase;width:${c.width || 'auto'}">${c.label}${sortIcon(c.key)}</th>`).join('')}
          </tr>
        </thead>
        <tbody id="sector-stock-tbody">
          ${stocks.map(st => {
            const ticker = (st.ticker || '').replace('.JK', '');
            const chg1d = st.returns?.['1d'];
            const chg5d = st.returns?.['5d'];
            const chg1m = st.returns?.['1m'];
            const chg3m = st.returns?.['3m'];
            return `<tr style="border-bottom:1px solid var(--border-subtle);transition:background .1s" onmouseover="this.style.background='var(--bg-panel-hover)'" onmouseout="this.style.background=''">
              <td style="padding:6px"><a href="#/stock/${ticker}" class="mono strong" style="color:var(--primary-color);text-decoration:none">${ticker}</a></td>
              <td style="padding:6px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${st.name || ''}">${st.name || ticker}</td>
              <td style="padding:6px;color:var(--text-dim);font-size:10px">${st.industry || '-'}</td>
              <td style="padding:6px;text-align:right" class="mono">${st.close != null ? nf(st.close, 0) : '—'}</td>
              <td style="padding:6px;text-align:right;color:${chg1d >= 0 ? '#22c55e' : '#ef4444'}" class="mono">${chg1d != null ? pf(chg1d, 2) : '—'}</td>
              <td style="padding:6px;text-align:right;color:${chg5d >= 0 ? '#22c55e' : '#ef4444'}" class="mono">${chg5d != null ? pf(chg5d, 2) : '—'}</td>
              <td style="padding:6px;text-align:right;color:${chg1m >= 0 ? '#22c55e' : '#ef4444'}" class="mono">${chg1m != null ? pf(chg1m, 2) : '—'}</td>
              <td style="padding:6px;text-align:right;color:${chg3m >= 0 ? '#22c55e' : '#ef4444'}" class="mono">${chg3m != null ? pf(chg3m, 2) : '—'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Filter input handler
  const filterInput = document.getElementById('sector-stock-filter');
  if (filterInput) {
    filterInput.addEventListener('input', () => {
      const q = filterInput.value.toLowerCase().trim();
      if (!q) {
        _sortableState.filtered = [..._sortableState.stocks];
      } else {
        _sortableState.filtered = _sortableState.stocks.filter(st =>
          (st.ticker || '').toLowerCase().includes(q) ||
          (st.name || '').toLowerCase().includes(q)
        );
      }
      const tbody = document.getElementById('sector-stock-tbody');
      if (tbody) {
        tbody.innerHTML = _sortableState.filtered.map(st => {
          const ticker = (st.ticker || '').replace('.JK', '');
          const chg1d = st.returns?.['1d'];
          const chg5d = st.returns?.['5d'];
          const chg1m = st.returns?.['1m'];
          const chg3m = st.returns?.['3m'];
          return `<tr style="border-bottom:1px solid var(--border-subtle);transition:background .1s" onmouseover="this.style.background='var(--bg-panel-hover)'" onmouseout="this.style.background=''">
            <td style="padding:6px"><a href="#/stock/${ticker}" class="mono strong" style="color:var(--primary-color);text-decoration:none">${ticker}</a></td>
            <td style="padding:6px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${st.name || ''}">${st.name || ticker}</td>
            <td style="padding:6px;color:var(--text-dim);font-size:10px">${st.industry || '-'}</td>
            <td style="padding:6px;text-align:right" class="mono">${st.close != null ? nf(st.close, 0) : '—'}</td>
            <td style="padding:6px;text-align:right;color:${chg1d >= 0 ? '#22c55e' : '#ef4444'}" class="mono">${chg1d != null ? pf(chg1d, 2) : '—'}</td>
            <td style="padding:6px;text-align:right;color:${chg5d >= 0 ? '#22c55e' : '#ef4444'}" class="mono">${chg5d != null ? pf(chg5d, 2) : '—'}</td>
            <td style="padding:6px;text-align:right;color:${chg1m >= 0 ? '#22c55e' : '#ef4444'}" class="mono">${chg1m != null ? pf(chg1m, 2) : '—'}</td>
            <td style="padding:6px;text-align:right;color:${chg3m >= 0 ? '#22c55e' : '#ef4444'}" class="mono">${chg3m != null ? pf(chg3m, 2) : '—'}</td>
          </tr>`;
        }).join('');
      }
    });
  }
}

// Global sort handler
window.sortSectorStocks = function(col) {
  if (_sortableState.sort === col) {
    _sortableState.order = _sortableState.order === 'desc' ? 'asc' : 'desc';
  } else {
    _sortableState.sort = col;
    _sortableState.order = 'desc';
  }
  const el = document.getElementById('sortable-stocks-content');
  if (el) {
    el.innerHTML = '<div class="skeleton" style="height:300px"></div>';
    renderSortableStockTable(_sortableState.sector);
  }
};

// ─── Sector Rotation Heatmap View (sector-rotation route) ────────

const ROTATION_PERIODS = ['1d', '5d', '1m', '3m'];
const ROTATION_MAX_ABS = { '1d': 5, '5d': 10, '1m': 15, '3m': 15 };

function rotationHeatColor(value, maxAbs) {
  const ratio = Math.min(Math.abs(value) / maxAbs, 1);
  if (value >= 0) {
    const r = Math.round(0x34 * ratio + 0xff * (1 - ratio));
    const g = Math.round(0xd3 * ratio + 0xff * (1 - ratio));
    const b = Math.round(0x99 * ratio + 0xff * (1 - ratio));
    return { bg: `rgb(${r},${g},${b})`, text: ratio > 0.5 ? '#fff' : '#1f2937' };
  } else {
    const r = Math.round(0xf8 * ratio + 0xff * (1 - ratio));
    const g = Math.round(0x71 * ratio + 0xff * (1 - ratio));
    const b = Math.round(0x71 * ratio + 0xff * (1 - ratio));
    return { bg: `rgb(${r},${g},${b})`, text: ratio > 0.5 ? '#fff' : '#1f2937' };
  }
}

function formatRotationVal(val) {
  if (val == null) return '—';
  return val >= 0 ? `+${val.toFixed(1)}%` : `${val.toFixed(1)}%`;
}

let _rotationState = { data: [], filtered: [], sortBy: 'momentum' };

export async function renderSectorRotation(root) {
  const app = root || document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <div class="view-content sector-rotation-page">
      <div class="page-header">
        <div>
          <h1>🔄 ${__('Rotasi Sektor', 'Rotasi Sektor')}</h1>
          <p class="page-subtitle">${__('sector_rotation_subtitle', 'Heatmap performa sektor IDX — diurutkan berdasarkan momentum')}</p>
        </div>
        <div class="page-actions">
          <a href="#sector" class="btn btn-sm btn-icon" title="Kembali ke Sektor">
            <i data-lucide="arrow-left" class="icon-14"></i>
          </a>
        </div>
      </div>

      <div class="sector-rotation-controls">
        <input type="text" class="filter-input" id="rotationFilter" placeholder="🔍 Cari sektor..." />
        <button type="button" class="sort-btn active" id="sortMomentum" data-sort="momentum">📊 Momentum</button>
        <button type="button" class="sort-btn" id="sortName" data-sort="name">📋 Nama</button>
      </div>

      <div id="rotationHeatmapContainer">
        <div class="sector-loading">
          <div class="loading-spinner"></div>
          <span>${__('loading', 'Memuat data rotasi sektor...')}</span>
        </div>
      </div>
    </div>
  `;

  lucide.createIcons();

  try {
    const data = await apiFetch('/sectors/rotation');
    if (!data?.sectors?.length) {
      document.getElementById('rotationHeatmapContainer').innerHTML = `
        <div class="sector-empty">
          <div class="sector-empty-icon">📊</div>
          <h3>${__('rotation_empty', 'Belum ada data rotasi')}</h3>
          <p>${__('rotation_empty_desc', 'Data rotasi sektor belum tersedia.')}</p>
        </div>`;
      return;
    }

    _rotationState.data = data.sectors;
    _rotationState.filtered = [...data.sectors];
    _rotationState.sortBy = 'momentum';

    renderRotationHeatmap();

    // Bind filter
    const filterInput = document.getElementById('rotationFilter');
    if (filterInput) {
      filterInput.addEventListener('input', () => {
        const q = filterInput.value.toLowerCase().trim();
        if (!q) {
          _rotationState.filtered = [..._rotationState.data];
        } else {
          _rotationState.filtered = _rotationState.data.filter(s =>
            s.name.toLowerCase().includes(q)
          );
        }
        renderRotationHeatmap();
      });
    }

    // Bind sort buttons
    document.getElementById('sortMomentum')?.addEventListener('click', () => {
      _rotationState.sortBy = 'momentum';
      document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
      document.getElementById('sortMomentum')?.classList.add('active');
      renderRotationHeatmap();
    });
    document.getElementById('sortName')?.addEventListener('click', () => {
      _rotationState.sortBy = 'name';
      document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
      document.getElementById('sortName')?.classList.add('active');
      renderRotationHeatmap();
    });

  } catch (e) {
    document.getElementById('rotationHeatmapContainer').innerHTML = `
      <div class="sector-error">
        <span>⚠️ ${__('error', 'Gagal memuat data rotasi sektor')}</span>
        <button class="btn btn-sm" onclick="location.reload()">${__('retry', 'Coba lagi')}</button>
      </div>`;
    showToast('Gagal memuat data rotasi sektor', 'error');
  }
}

function renderRotationHeatmap() {
  const container = document.getElementById('rotationHeatmapContainer');
  if (!container) return;

  let sectors = [..._rotationState.filtered];

  if (_rotationState.sortBy === 'momentum') {
    sectors.sort((a, b) => b.momentum_score - a.momentum_score);
  } else {
    sectors.sort((a, b) => a.name.localeCompare(b.name));
  }

  const thead = `
    <thead>
      <tr>
        <th>Sektor</th>
        ${ROTATION_PERIODS.map(p => `<th>${p}</th>`).join('')}
        <th>Momentum</th>
        <th>Saham</th>
      </tr>
    </thead>`;

  const tbody = sectors.map((s, idx) => {
    const isTop3 = _rotationState.sortBy === 'momentum' && idx < 3;
    const trophy = isTop3 ? `<span class="sector-rotation-trophy">${['🏆', '🥈', '🥉'][idx]}</span>` : '';

    const periodCells = ROTATION_PERIODS.map(p => {
      const val = s.returns?.[p];
      if (val == null) return '<td>—</td>';
      const { bg, text } = rotationHeatColor(val, ROTATION_MAX_ABS[p]);
      return `<td style="background:${bg};color:${text};border-radius:4px">${formatRotationVal(val)}</td>`;
    }).join('');

    const momVal = s.momentum_score;
    const momColor = rotationHeatColor(momVal, 10);
    const momCell = `<td style="background:${momColor.bg};color:${momColor.text};border-radius:4px;font-weight:700">${momVal >= 0 ? '+' : ''}${momVal.toFixed(2)}</td>`;

    const stocksCell = `<td>${s.stocks_count != null ? s.stocks_count : '—'}</td>`;

    return `<tr>
      <td>${trophy}${s.name}</td>
      ${periodCells}
      ${momCell}
      ${stocksCell}
    </tr>`;
  }).join('');

  container.innerHTML = `
    <div class="sector-rotation-wrap">
      <table class="sector-rotation-table">
        ${thead}
        <tbody>${tbody}</tbody>
      </table>
    </div>
    ${_rotationState.filtered.length > 0
      ? `<div style="margin-top:8px;font-size:11px;color:var(--text-dim);text-align:right">${_rotationState.filtered.length} sektor</div>`
      : ''}`;
}
