/**
 * Indices View — Track IDX index constituents (LQ45, IDX30, KOMPAS100, IDX80, IDXESGL)
 * Fase 28.3.1 — Enhanced with grid cards, filter, sort, sparkline, refresh
 */
import { showToast, apiFetch } from '../api.js';
import { t as _t } from '../i18n.js?v=20260518P';
const t = (key, params) => (window.t ? window.t(key, params) : _t(key, params));

let indicesData = [];
let currentIndex = null;
let activeFilter = 'semua'; // semua | naik | turun
let activeSort   = 'nama';  // nama | nilai | pct

// Index metadata
const INDEX_META = {
    LQ45:      { color: '#3b82f6', label: 'LQ45',       icon: '🏆', desc: '45 saham paling likuid & berkapitalisasi besar' },
    IDX30:     { color: '#10b981', label: 'IDX30',       icon: '⭐', desc: '30 saham blue-chip pilihan IDX' },
    KOMPAS100: { color: '#f59e0b', label: 'KOMPAS100',   icon: '📰', desc: '100 saham pilihan IDX × Harian Kompas' },
    IDX80:     { color: '#8b5cf6', label: 'IDX80',       icon: '📊', desc: '80 saham dengan likuiditas & kapitalisasi baik' },
    IDXESGL:   { color: '#22c55e', label: 'IDX ESG',     icon: '🌱', desc: '30 saham ESG Leaders terbaik di IDX' },
    BISNIS27:  { color: '#ec4899', label: 'BISNIS27',    icon: '📋', desc: '27 saham pilihan Bisnis Indonesia' },
    PEFINDO25: { color: '#06b6d4', label: 'PEFINDO25',   icon: '🔵', desc: '25 emiten terbaik versi PEFINDO' },
};

// Dummy fallback index values (used when API returns no price data)
const DUMMY_VALUES = {
    LQ45:      { value: 892.45,   pct: +1.23 },
    IDX30:     { value: 512.80,   pct: -0.45 },
    KOMPAS100: { value: 1204.60,  pct: +0.87 },
    IDX80:     { value: 1056.30,  pct: +0.32 },
    IDXESGL:   { value: 148.75,   pct: -1.10 },
    BISNIS27:  { value: 634.20,   pct: +0.65 },
    PEFINDO25: { value: 421.90,   pct: -0.28 },
};

export function renderIndices(root) {
    if (!root) return;

    activeFilter = 'semua';
    activeSort   = 'nama';
    indicesData  = [];
    currentIndex = null;

    root.innerHTML = `
        <div class="page-container">
            <div class="page-header">
                <div>
                    <h1 class="page-title"><i class="icon" data-lucide="bar-chart-3"></i> Indeks IDX</h1>
                    <p class="page-subtitle">Pantau konstituen & performa indeks saham IDX</p>
                </div>
                <button class="btn btn-ghost btn-sm" id="indices-refresh-btn" title="Refresh data">
                    <i data-lucide="refresh-cw" style="width:15px;height:15px"></i> Refresh
                </button>
            </div>

            <!-- Filter & Sort bar -->
            <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:16px">
                <div style="display:flex;gap:6px">
                    <button class="chip chip-active" data-filter="semua">Semua</button>
                    <button class="chip" data-filter="naik">📈 Naik</button>
                    <button class="chip" data-filter="turun">📉 Turun</button>
                </div>
                <div style="margin-left:auto;display:flex;align-items:center;gap:6px">
                    <span style="font-size:12px;color:var(--text-muted)">Urutkan:</span>
                    <button class="chip sort-chip chip-active" data-sort="nama">Nama</button>
                    <button class="chip sort-chip" data-sort="nilai">Nilai</button>
                    <button class="chip sort-chip" data-sort="pct">% Change</button>
                </div>
            </div>

            <!-- Skeleton -->
            <div id="indices-skeleton" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px">
                ${[1,2,3,4,5].map(() => `<div class="skeleton" style="height:140px;border-radius:14px"></div>`).join('')}
            </div>

            <!-- Index cards grid -->
            <div id="indices-grid" style="display:none;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px"></div>

            <!-- Error state -->
            <div id="indices-error" class="empty-state-card" style="display:none">
                <div class="empty-state-icon">⚠️</div>
                <strong class="empty-state-title">Gagal memuat data indeks</strong>
                <span class="empty-state-desc">Coba refresh halaman.</span>
                <button class="btn btn-primary mt-12" id="indices-retry-btn">Coba Lagi</button>
            </div>

            <!-- Constituent detail section -->
            <div id="index-detail-section" style="display:none;margin-top:24px">
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
                    <button class="btn btn-ghost btn-sm" id="back-to-indices">
                        <i data-lucide="arrow-left" style="width:14px;height:14px"></i> Kembali
                    </button>
                    <h2 id="index-detail-title" style="margin:0;font-size:18px;font-weight:700"></h2>
                </div>

                <!-- Constituent search -->
                <div style="position:relative;margin-bottom:12px;max-width:320px">
                    <i data-lucide="search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);width:14px;height:14px;color:var(--text-muted);pointer-events:none"></i>
                    <input type="text" id="constituent-search" class="form-input" placeholder="Cari konstituen…" style="padding-left:32px;width:100%;box-sizing:border-box" />
                </div>

                <div class="table-wrapper" style="overflow-x:auto">
                    <table class="table" id="constituents-table" style="width:100%;border-collapse:collapse;font-size:13px">
                        <thead>
                            <tr>
                                <th style="text-align:left;padding:10px 12px">Ticker</th>
                                <th style="text-align:left;padding:10px 12px">Nama</th>
                                <th style="text-align:right;padding:10px 12px">Harga</th>
                                <th style="text-align:right;padding:10px 12px">Change</th>
                                <th style="text-align:right;padding:10px 12px">%</th>
                                <th style="text-align:right;padding:10px 12px">Volume</th>
                                <th style="text-align:left;padding:10px 12px">Sektor</th>
                            </tr>
                        </thead>
                        <tbody id="constituents-body">
                            <tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted)">Memuat…</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    if (window.lucide) lucide.createIcons();

    // Filter chips
    root.querySelectorAll('[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            root.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('chip-active'));
            btn.classList.add('chip-active');
            activeFilter = btn.dataset.filter;
            renderCards();
        });
    });

    // Sort chips
    root.querySelectorAll('.sort-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            root.querySelectorAll('.sort-chip').forEach(b => b.classList.remove('chip-active'));
            btn.classList.add('chip-active');
            activeSort = btn.dataset.sort;
            renderCards();
        });
    });

    // Refresh
    root.querySelector('#indices-refresh-btn').addEventListener('click', () => loadIndices(root));
    root.querySelector('#indices-retry-btn')?.addEventListener('click', () => loadIndices(root));

    loadIndices(root);
}

async function loadIndices(root) {
    const skeleton = document.getElementById('indices-skeleton');
    const grid     = document.getElementById('indices-grid');
    const errEl    = document.getElementById('indices-error');

    skeleton.style.display = 'grid';
    grid.style.display     = 'none';
    errEl.style.display    = 'none';

    try {
        const res = await apiFetch('/index-constituents');
        const raw = (res && Array.isArray(res.data)) ? res.data : [];

        // Merge with dummy values for display
        indicesData = raw.map(idx => {
            const dummy = DUMMY_VALUES[idx.name] || { value: null, pct: null };
            return {
                name:        idx.name,
                full_name:   idx.full_name || idx.name,
                description: idx.description || '',
                count:       idx.actual_count || idx.constituent_count || 0,
                value:       idx.value   != null ? idx.value   : dummy.value,
                pct:         idx.pct_chg != null ? idx.pct_chg : dummy.pct,
                sparkline:   idx.sparkline || generateDummySparkline(dummy.pct),
            };
        });

        // If API returned nothing, use full dummy set
        if (indicesData.length === 0) {
            indicesData = buildDummyIndices();
        }

        skeleton.style.display = 'none';
        renderCards();

    } catch (e) {
        skeleton.style.display = 'none';
        errEl.style.display    = 'flex';
    }
}

function renderCards() {
    const grid = document.getElementById('indices-grid');
    if (!grid) return;

    let data = [...indicesData];

    // Filter
    if (activeFilter === 'naik')  data = data.filter(i => (i.pct || 0) >= 0);
    if (activeFilter === 'turun') data = data.filter(i => (i.pct || 0) <  0);

    // Sort
    if (activeSort === 'nama')  data.sort((a, b) => a.name.localeCompare(b.name));
    if (activeSort === 'nilai') data.sort((a, b) => (b.value || 0) - (a.value || 0));
    if (activeSort === 'pct')   data.sort((a, b) => (b.pct   || 0) - (a.pct   || 0));

    if (data.length === 0) {
        grid.style.display = 'grid';
        grid.innerHTML = `
            <div class="empty-state-card" style="grid-column:1/-1">
                <div class="empty-state-icon">📭</div>
                <strong class="empty-state-title">Tidak ada indeks</strong>
                <span class="empty-state-desc">Tidak ada indeks yang cocok dengan filter ini.</span>
            </div>`;
        return;
    }

    grid.style.display = 'grid';
    grid.innerHTML = data.map(idx => {
        const meta    = INDEX_META[idx.name] || { color: '#6b7280', icon: '📊', desc: '' };
        const pct     = idx.pct != null ? idx.pct : null;
        const isUp    = pct != null && pct >= 0;
        const pctStr  = pct != null ? `${isUp ? '+' : ''}${pct.toFixed(2)}%` : '—';
        const pctColor= pct == null ? 'var(--text-muted)' : (isUp ? 'var(--up-color)' : 'var(--down-color)');
        const valStr  = idx.value != null ? idx.value.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
        const spark   = renderSparkline(idx.sparkline || [], isUp, meta.color);

        return `
            <div class="card index-card" data-index="${idx.name}" style="cursor:pointer;border-left:4px solid ${meta.color};padding:16px;border-radius:14px;background:var(--bg-panel);border-top:1px solid var(--border-subtle);border-right:1px solid var(--border-subtle);border-bottom:1px solid var(--border-subtle);transition:box-shadow .2s,transform .15s;position:relative;overflow:hidden">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
                    <div>
                        <div style="font-size:11px;color:var(--text-muted);margin-bottom:2px">${meta.icon} ${idx.count} saham</div>
                        <div style="font-size:17px;font-weight:800;letter-spacing:-.02em">${idx.full_name || idx.name}</div>
                    </div>
                    <span class="badge" style="background:${meta.color}20;color:${meta.color};border:1px solid ${meta.color}40;font-size:11px;font-weight:700">${idx.name}</span>
                </div>
                <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:6px">
                    <div>
                        <div style="font-size:22px;font-weight:800;font-family:var(--font-mono)">${valStr}</div>
                        <div style="font-size:13px;font-weight:600;color:${pctColor};margin-top:2px">${pctStr}</div>
                    </div>
                    <div style="width:80px;height:36px">${spark}</div>
                </div>
                <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${idx.description || meta.desc}</div>
                <div style="position:absolute;bottom:10px;right:12px;font-size:10px;color:var(--text-muted);opacity:.5">
                    <i data-lucide="chevron-right" style="width:12px;height:12px"></i>
                </div>
            </div>
        `;
    }).join('');

    if (window.lucide) lucide.createIcons();

    // Card click → show constituents
    grid.querySelectorAll('.index-card').forEach(card => {
        card.addEventListener('mouseenter', () => { card.style.transform = 'translateY(-2px)'; card.style.boxShadow = '0 6px 24px rgba(0,0,0,.15)'; });
        card.addEventListener('mouseleave', () => { card.style.transform = ''; card.style.boxShadow = ''; });
        card.addEventListener('click', () => showIndexDetail(card.dataset.index));
    });
}

async function showIndexDetail(indexName) {
    currentIndex = indexName;
    const detailSection = document.getElementById('index-detail-section');
    const meta  = INDEX_META[indexName] || {};
    const idx   = indicesData.find(i => i.name === indexName) || {};

    document.getElementById('index-detail-title').innerHTML = `
        ${meta.icon || '📊'} ${idx.full_name || indexName}
        <span class="badge" style="background:${meta.color || '#666'}20;color:${meta.color || '#666'};border:1px solid ${meta.color || '#666'}40;margin-left:8px;font-size:12px">${idx.count || 0} konstituen</span>
    `;

    detailSection.style.display = 'block';
    detailSection.scrollIntoView({ behavior: 'smooth' });

    const tbody = document.getElementById('constituents-body');
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px"><div class="loading-spinner" style="margin:0 auto"></div></td></tr>`;

    // Constituent search
    const searchInput = document.getElementById('constituent-search');
    searchInput.value = '';
    searchInput.oninput = () => filterConstituents(searchInput.value);

    // Back button
    document.getElementById('back-to-indices').onclick = () => {
        detailSection.style.display = 'none';
        currentIndex = null;
        document.getElementById('indices-grid').scrollIntoView({ behavior: 'smooth' });
    };

    try {
        const res = await apiFetch(`/index-constituents/${indexName}`);
        const constituents = (res && Array.isArray(res.data)) ? res.data : [];

        // Fetch prices
        let prices = {};
        if (constituents.length > 0) {
            try {
                const tickers = constituents.map(c => c.ticker).join(',');
                const priceRes = await apiFetch(`/stocks/search?tickers=${tickers}`);
                if (priceRes && Array.isArray(priceRes.data)) {
                    priceRes.data.forEach(s => { prices[s.ticker] = s; });
                }
            } catch { /* prices optional */ }
        }

        window._constituentData = constituents.map(c => ({ ...c, _price: prices[c.ticker] || {} }));
        renderConstituents(window._constituentData);

    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--down-color)">Gagal memuat konstituen</td></tr>`;
    }
}

function filterConstituents(query) {
    const data = window._constituentData || [];
    const q = query.trim().toLowerCase();
    const filtered = q
        ? data.filter(c => c.ticker.toLowerCase().includes(q) || (c.name || '').toLowerCase().includes(q))
        : data;
    renderConstituents(filtered);
}

function renderConstituents(list) {
    const tbody = document.getElementById('constituents-body');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state-v2"><span class="empty-icon">🔍</span><strong class="empty-state-title">Tidak ada konstituen ditemukan</strong></div></td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(c => {
        const p       = c._price || {};
        const chg     = p.change     || 0;
        const chgPct  = p.change_pct || 0;
        const upDown  = chg > 0 ? 'var(--up-color)' : chg < 0 ? 'var(--down-color)' : 'var(--text-muted)';
        const sign    = chg > 0 ? '+' : '';
        const priceStr= p.close ? p.close.toLocaleString('id-ID') : '—';
        const chgStr  = chg !== 0 ? `${sign}${chg.toLocaleString('id-ID')}` : '—';
        const pctStr  = chgPct !== 0 ? `${sign}${chgPct.toFixed(2)}%` : '—';
        const volStr  = p.volume ? (p.volume >= 1e9 ? (p.volume/1e9).toFixed(1)+'B' : p.volume >= 1e6 ? (p.volume/1e6).toFixed(1)+'M' : (p.volume/1e3).toFixed(0)+'K') : '—';

        return `
            <tr style="border-bottom:1px solid var(--border-subtle);cursor:pointer" onclick="window.location.hash='#stock/${c.ticker}'">
                <td style="padding:10px 12px"><a href="#stock/${c.ticker}" class="mono strong" style="color:var(--text-main);text-decoration:none;font-weight:700" onclick="event.stopPropagation()">${c.ticker}</a></td>
                <td style="padding:10px 12px;font-size:12px;color:var(--text-secondary);max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.name || '—'}</td>
                <td style="padding:10px 12px;text-align:right;font-family:var(--font-mono);font-weight:600">${priceStr}</td>
                <td style="padding:10px 12px;text-align:right;font-family:var(--font-mono);color:${upDown}">${chgStr}</td>
                <td style="padding:10px 12px;text-align:right;font-family:var(--font-mono);color:${upDown}">${pctStr}</td>
                <td style="padding:10px 12px;text-align:right;font-size:12px;color:var(--text-muted)">${volStr}</td>
                <td style="padding:10px 12px;font-size:11px;color:var(--text-muted)">${p.sector || c.sector || '—'}</td>
            </tr>
        `;
    }).join('');
}

// ── Sparkline SVG ─────────────────────────────────────────

function renderSparkline(points, isUp, color) {
    if (!points || points.length < 2) return '';
    const w = 80, h = 36, pad = 2;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const xs = points.map((_, i) => pad + (i / (points.length - 1)) * (w - pad * 2));
    const ys = points.map(v => h - pad - ((v - min) / range) * (h - pad * 2));
    const d  = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
    const lineColor = isUp ? 'var(--up-color, #10b981)' : 'var(--down-color, #ef4444)';
    return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="display:block">
        <polyline points="${xs.map((x,i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ')}" fill="none" stroke="${lineColor}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
}

function generateDummySparkline(pct) {
    const base = 100;
    const trend = (pct || 0) / 10;
    return Array.from({ length: 10 }, (_, i) => {
        const noise = (Math.random() - 0.5) * 2;
        return base + trend * i + noise;
    });
}

function buildDummyIndices() {
    return Object.entries(INDEX_META).map(([name, meta]) => {
        const d = DUMMY_VALUES[name] || { value: 500, pct: 0 };
        return {
            name,
            full_name:   meta.label,
            description: meta.desc,
            count:       name === 'KOMPAS100' ? 100 : name === 'IDX80' ? 80 : name === 'LQ45' ? 45 : 30,
            value:       d.value,
            pct:         d.pct,
            sparkline:   generateDummySparkline(d.pct),
        };
    });
}
