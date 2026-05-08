// ─── Sectors View — Sector Performance Dashboard ────
// Fase 8.1: Aggregate sector performance from OHLCV data

import { apiFetch, showToast } from '../api.js';
import { __ } from '../i18n.js';

let sectorData = null;

export async function renderSectors() {
    const app = document.getElementById('app');
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
    await loadSectors();
}

async function loadSectors() {
    const carousel = document.getElementById('sectorCarousel');
    const grid = document.getElementById('sectorDetailGrid');
    if (!carousel || !grid) return;

    carousel.innerHTML = `<div class="sector-loading"><div class="loading-spinner"></div><span>${__('loading', 'Memuat...')}</span></div>`;
    grid.innerHTML = '';

    try {
        const res = await apiFetch('/api/sectors/performance');
        const data = await res.json();
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

        return `<div class="sector-card" id="sector-${s.sector.replace(/\s+/g, '-')}">
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
    const target = document.getElementById(`sector-${sector.replace(/\s+/g, '-')}`);
    if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        target.classList.add('sector-highlight');
        setTimeout(() => target.classList.remove('sector-highlight'), 1500);
    }
};
