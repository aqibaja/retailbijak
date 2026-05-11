/**
 * Indices View — Track IDX index constituents (LQ45, IDX30, KOMPAS100, IDX80, IDXESGL)
 * Fase 15.1 — Index Intelligence Engine
 */
import { showToast, setLoading, apiFetch } from '../api.js?v=202605120001';

let indicesData = [];
let currentIndex = null;

// Index metadata + badge colors
const INDEX_META = {
    LQ45:     { color: '#3b82f6', label: 'LQ45',     icon: '🏆', desc: '45 saham paling likuid' },
    IDX30:    { color: '#10b981', label: 'IDX30',    icon: '⭐', desc: '30 saham blue-chip' },
    KOMPAS100:{ color: '#f59e0b', label: 'KOMPAS100',icon: '📰', desc: '100 saham pilihan' },
    IDX80:    { color: '#8b5cf6', label: 'IDX80',    icon: '📊', desc: '80 saham likuid' },
    IDXESGL:  { color: '#22c55e', label: 'IDXESGL', icon: '🌱', desc: '30 ESG Leaders' },
};

export function renderIndices(root) {
    if (!root) return;
    root.innerHTML = `
        <div class="page-container">
            <div class="page-header">
                <h1 class="page-title"><i class="icon" data-lucide="bar-chart-3"></i> Indeks IDX</h1>
                <p class="page-subtitle">Pantau konstituen & performa indeks saham IDX</p>
            </div>
            <div id="indices-skeleton" class="skeleton-grid">
                <div class="skeleton-card" style="height:120px"></div>
                <div class="skeleton-card" style="height:120px"></div>
                <div class="skeleton-card" style="height:120px"></div>
                <div class="skeleton-card" style="height:120px"></div>
                <div class="skeleton-card" style="height:120px"></div>
            </div>
            <div id="indices-content" style="display:none">
                <div class="indices-grid" id="indices-summary"></div>
                <div id="index-detail-section" style="display:none">
                    <div class="detail-header" style="display:flex;align-items:center;gap:1rem;margin-top:2rem;margin-bottom:1rem">
                        <button class="btn btn-ghost" id="back-to-indices"><i data-lucide="arrow-left"></i> Kembali</button>
                        <h2 id="index-detail-title" style="margin:0"></h2>
                    </div>
                    <div class="table-responsive">
                        <table class="data-table" id="constituents-table">
                            <thead>
                                <tr>
                                    <th data-sort="ticker">Ticker</th>
                                    <th data-sort="name">Nama</th>
                                    <th data-sort="price" class="text-right">Harga</th>
                                    <th data-sort="chg" class="text-right">Change</th>
                                    <th data-sort="chg_pct" class="text-right">%</th>
                                    <th data-sort="volume" class="text-right">Volume</th>
                                    <th data-sort="sector" class="text-right">Sektor</th>
                                </tr>
                            </thead>
                            <tbody id="constituents-body"></tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div id="indices-error" class="empty-state-card" style="display:none">
                <div class="empty-icon"><i data-lucide="alert-circle"></i></div>
                <h3>Gagal memuat data indeks</h3>
                <p>Coba refresh halaman.</p>
                <button class="btn btn-primary" onclick="location.reload()">Refresh</button>
            </div>
        </div>
    `;
    loadIndices();
}

async function loadIndices() {
    try {
        const res = await apiFetch('/index-constituents');
        indicesData = res.data || [];
        document.getElementById('indices-skeleton').style.display = 'none';
        document.getElementById('indices-content').style.display = 'block';
        renderSummary();
    } catch (e) {
        document.getElementById('indices-skeleton').style.display = 'none';
        document.getElementById('indices-error').style.display = 'flex';
    }
}

function renderSummary() {
    const grid = document.getElementById('indices-summary');
    if (!grid) return;
    grid.innerHTML = indicesData.map(idx => {
        const meta = INDEX_META[idx.name] || {};
        return `
            <div class="card index-card" data-index="${idx.name}" style="cursor:pointer;border-left:4px solid ${meta.color || '#666'}">
                <div class="index-card-header" style="display:flex;justify-content:space-between;align-items:center">
                    <div>
                        <span class="index-icon">${meta.icon || ''}</span>
                        <h3 style="margin:0;font-size:1.1rem">${idx.full_name || idx.name}</h3>
                    </div>
                    <span class="badge" style="background:${meta.color || '#666'};color:#fff">${idx.actual_count || 0} stocks</span>
                </div>
                <p style="margin:0.5rem 0 0;font-size:0.85rem;color:var(--text-secondary)">${meta.desc || idx.description || ''}</p>
            </div>
        `;
    }).join('');

    // Click handler for each card
    grid.querySelectorAll('.index-card').forEach(card => {
        card.addEventListener('click', () => {
            const name = card.dataset.index;
            showIndexDetail(name);
        });
    });
}

async function showIndexDetail(indexName) {
    currentIndex = indexName;
    document.getElementById('index-detail-section').style.display = 'block';
    const meta = INDEX_META[indexName] || {};
    const idx = indicesData.find(i => i.name === indexName) || {};
    document.getElementById('index-detail-title').innerHTML = `
        <span class="index-icon">${meta.icon || ''}</span> ${idx.full_name || indexName}
        <span class="badge" style="background:${meta.color || '#666'};color:#fff;margin-left:0.75rem">${idx.actual_count || 0} konstituen</span>
    `;

    const tbody = document.getElementById('constituents-body');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">Memuat...</td></tr>';

    // Scroll to detail section
    document.getElementById('index-detail-section').scrollIntoView({ behavior: 'smooth' });

    try {
        const res = await apiFetch(`/api/index-constituents/${indexName}`);
        const constituents = res.data || [];

        // Also fetch latest prices for these tickers
        let prices = {};
        try {
            const priceRes = await apiFetch(`/api/stocks/search?tickers=${constituents.map(c => c.ticker).join(',')}`);
            if (priceRes.data) {
                priceRes.data.forEach(s => {
                    prices[s.ticker] = s;
                });
            }
        } catch (e) { /* prices are optional */ }

        tbody.innerHTML = constituents.map(c => {
            const price = prices[c.ticker] || {};
            const chg = price.change || 0;
            const chgPct = price.change_pct || 0;
            const chgClass = chg > 0 ? 'text-up' : chg < 0 ? 'text-down' : '';
            return `
                <tr class="clickable" data-ticker="${c.ticker}">
                    <td><a href="#stock/${c.ticker}" class="ticker-link">${c.ticker}</a></td>
                    <td>${c.name || '-'}</td>
                    <td class="text-right">${price.close ? price.close.toLocaleString('id-ID', {minimumFractionDigits:0,maximumFractionDigits:0}) : '-'}</td>
                    <td class="text-right ${chgClass}">${chg !== 0 ? (chg > 0 ? '+' : '') + chg.toLocaleString('id-ID') : '-'}</td>
                    <td class="text-right ${chgClass}">${chgPct !== 0 ? '<span class="' + chgClass + '">' + (chgPct > 0 ? '+' : '') + chgPct.toFixed(2) + '%</span>' : '-'}</td>
                    <td class="text-right">${price.volume ? (price.volume / 1000000).toFixed(1) + 'M' : '-'}</td>
                    <td class="text-right">${price.sector || c.sector || '-'}</td>
                </tr>
            `;
        }).join('');

        // Click row → stock detail
        tbody.querySelectorAll('tr.clickable').forEach(row => {
            row.addEventListener('click', () => {
                window.location.hash = `#stock/${row.dataset.ticker}`;
            });
        });

    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--danger)">Gagal memuat konstituen</td></tr>';
    }

    // Back button
    document.getElementById('back-to-indices').onclick = () => {
        document.getElementById('index-detail-section').style.display = 'none';
        currentIndex = null;
        document.getElementById('indices-summary').scrollIntoView({ behavior: 'smooth' });
    };
}
