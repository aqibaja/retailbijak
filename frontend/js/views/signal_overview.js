// ─── Signal Overview Page ─────────────────────────────────
// Route: #signal-overview
// Fase 28.3.1 — Enhanced: filter chips, timeframe, search, sort, pagination, color coding

import { apiFetch } from '../api.js';
import { t as _t } from '../i18n.js?v=20260518Q';
const t = (key, params) => (window.t ? window.t(key, params) : _t(key, params));

let currentSignalType = '';
let currentTimeframe  = '';
let currentPage       = 1;
let sortColumn        = 'signal_date';
let sortDir           = 'desc';
let searchQuery       = '';
let allSignalData     = [];

const PAGE_SIZE = 20;

const SIGNAL_FILTERS = [
    { type: '',           label: 'Semua',       color: 'var(--text-main)' },
    { type: 'buy',        label: 'Buy',         color: 'var(--up-color)'  },
    { type: 'sell',       label: 'Sell',        color: 'var(--down-color)'},
    { type: 'hold',       label: 'Hold',        color: 'var(--text-muted)'},
    { type: 'strong_buy', label: 'Strong Buy',  color: '#00c853'          },
    { type: 'strong_sell',label: 'Strong Sell', color: '#d50000'          },
];

const TIMEFRAMES = [
    { id: '',   label: 'Semua' },
    { id: '1D', label: '1D'   },
    { id: '1W', label: '1W'   },
    { id: '1M', label: '1M'   },
];

export async function render() {
    const app = document.getElementById('app-root');
    if (!app) return;

    // Reset state
    currentSignalType = '';
    currentTimeframe  = '';
    currentPage       = 1;
    sortColumn        = 'signal_date';
    sortDir           = 'desc';
    searchQuery       = '';
    allSignalData     = [];

    app.innerHTML = `
        <div class="page-container">
            <!-- Header -->
            <div class="page-header" style="margin-bottom:16px">
                <div>
                    <h1 style="margin:0;font-size:22px;font-weight:800;letter-spacing:-.03em">📡 Signal Overview</h1>
                    <p style="margin:4px 0 0;font-size:13px;color:var(--text-muted)">Semua sinyal trading terkini dari seluruh saham IDX</p>
                </div>
                <button class="btn btn-ghost btn-sm" id="btn-signal-refresh" title="Refresh">
                    <i data-lucide="refresh-cw" style="width:14px;height:14px"></i> Refresh
                </button>
            </div>

            <!-- Summary cards -->
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px" id="signal-summary-cards">
                <div class="card" style="padding:14px;border-radius:14px">
                    <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em">Total Sinyal</div>
                    <div style="font-size:26px;font-weight:800;font-family:var(--font-mono);margin-top:4px" id="signal-total-count">—</div>
                </div>
                <div class="card" style="padding:14px;border-radius:14px">
                    <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em">Buy</div>
                    <div style="font-size:26px;font-weight:800;font-family:var(--font-mono);color:var(--up-color);margin-top:4px" id="signal-buy-count">—</div>
                </div>
                <div class="card" style="padding:14px;border-radius:14px">
                    <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em">Sell</div>
                    <div style="font-size:26px;font-weight:800;font-family:var(--font-mono);color:var(--down-color);margin-top:4px" id="signal-sell-count">—</div>
                </div>
                <div class="card" style="padding:14px;border-radius:14px">
                    <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em">Buy/Sell Ratio</div>
                    <div style="font-size:26px;font-weight:800;font-family:var(--font-mono);margin-top:4px" id="signal-ratio">—</div>
                </div>
            </div>

            <!-- Filter chips: signal type -->
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px" id="signal-type-chips">
                ${SIGNAL_FILTERS.map(f => `
                    <button class="chip ${f.type === '' ? 'chip-active' : ''}" data-type="${f.type}"
                        style="${f.type === '' ? '' : `--chip-accent:${f.color}`}">
                        ${getSignalDot(f.type)}${f.label}
                    </button>
                `).join('')}
            </div>

            <!-- Timeframe + Search row -->
            <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:14px">
                <div style="display:flex;gap:6px" id="signal-tf-chips">
                    ${TIMEFRAMES.map(t => `
                        <button class="chip ${t.id === '' ? 'chip-active' : ''}" data-tf="${t.id}">${t.label}</button>
                    `).join('')}
                </div>
                <div style="position:relative;flex:1;min-width:180px;max-width:320px;margin-left:auto">
                    <i data-lucide="search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);width:14px;height:14px;color:var(--text-muted);pointer-events:none"></i>
                    <input type="text" id="signal-search" class="form-input" placeholder="Cari ticker…"
                        style="padding-left:32px;width:100%;box-sizing:border-box" autocomplete="off" />
                </div>
            </div>

            <!-- Sort bar -->
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap">
                <span style="font-size:12px;color:var(--text-muted)">Urutkan:</span>
                <button class="chip sort-chip chip-active" data-sort="signal_date" data-dir="desc">Terbaru</button>
                <button class="chip sort-chip" data-sort="ticker_base" data-dir="asc">Ticker</button>
                <button class="chip sort-chip" data-sort="signal_strength" data-dir="desc">Signal Strength</button>
                <span id="signal-result-count" style="margin-left:auto;font-size:12px;color:var(--text-muted)"></span>
            </div>

            <!-- Table -->
            <div class="panel" style="padding:0;overflow:hidden;border-radius:14px">
                <div style="overflow-x:auto">
                    <table class="table" id="signal-table" style="width:100%;border-collapse:collapse;font-size:13px">
                        <thead>
                            <tr style="border-bottom:1px solid var(--border-subtle)">
                                <th style="text-align:left;padding:11px 14px;white-space:nowrap">Ticker</th>
                                <th style="text-align:center;padding:11px 14px;white-space:nowrap">Signal</th>
                                <th style="text-align:center;padding:11px 14px;white-space:nowrap">Timeframe</th>
                                <th style="text-align:right;padding:11px 14px;white-space:nowrap">Tanggal</th>
                                <th style="text-align:right;padding:11px 14px;white-space:nowrap">RSI</th>
                                <th style="text-align:right;padding:11px 14px;white-space:nowrap">MACD</th>
                                <th style="text-align:right;padding:11px 14px;white-space:nowrap">Harga</th>
                                <th style="text-align:center;padding:11px 14px;white-space:nowrap">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="signal-table-body">
                            <tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-muted)">Memuat sinyal…</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Pagination -->
            <div id="signal-pagination" style="display:flex;justify-content:center;align-items:center;gap:8px;margin-top:16px;flex-wrap:wrap"></div>
        </div>
    `;

    if (window.lucide) lucide.createIcons();

    // Signal type filter chips
    document.querySelectorAll('#signal-type-chips .chip').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#signal-type-chips .chip').forEach(b => b.classList.remove('chip-active'));
            btn.classList.add('chip-active');
            currentSignalType = btn.dataset.type;
            currentPage = 1;
            fetchSignals();
        });
    });

    // Timeframe chips
    document.querySelectorAll('#signal-tf-chips .chip').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#signal-tf-chips .chip').forEach(b => b.classList.remove('chip-active'));
            btn.classList.add('chip-active');
            currentTimeframe = btn.dataset.tf;
            currentPage = 1;
            renderTable();
        });
    });

    // Search
    document.getElementById('signal-search').addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        currentPage = 1;
        renderTable();
    });

    // Sort chips
    document.querySelectorAll('.sort-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            const col = btn.dataset.sort;
            if (sortColumn === col) {
                sortDir = sortDir === 'asc' ? 'desc' : 'asc';
            } else {
                sortColumn = col;
                sortDir    = btn.dataset.dir || 'desc';
            }
            document.querySelectorAll('.sort-chip').forEach(b => b.classList.remove('chip-active'));
            btn.classList.add('chip-active');
            currentPage = 1;
            renderTable();
        });
    });

    // Refresh
    document.getElementById('btn-signal-refresh').addEventListener('click', fetchSignals);

    fetchSignals();
}

async function fetchSignals() {
    const tbody = document.getElementById('signal-table-body');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr><td colspan="8" style="text-align:center;padding:40px">
            <div class="loading-spinner" style="margin:0 auto"></div>
        </td></tr>`;

    try {
        const params = new URLSearchParams({ limit: 500, days_back: 30 });
        if (currentSignalType) params.set('signal_type', currentSignalType);

        const res  = await apiFetch(`/signals/summary?${params}`, { timeout: 12000 });
        const data = res?.latest || [];

        // Update summary cards
        const counts = res?.counts || { buy: 0, sell: 0 };
        const total  = res?.total  || data.length;
        document.getElementById('signal-total-count').textContent = total;
        document.getElementById('signal-buy-count').textContent   = counts.buy  || 0;
        document.getElementById('signal-sell-count').textContent  = counts.sell || 0;
        const ratio = counts.sell > 0 ? ((counts.buy / counts.sell)).toFixed(2) : '—';
        document.getElementById('signal-ratio').textContent = counts.sell > 0 ? ratio : '—';

        allSignalData = data;
        currentPage   = 1;
        renderTable();

    } catch {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--down-color)">Gagal memuat sinyal. Coba refresh.</td></tr>`;
    }
}

function renderTable() {
    const tbody   = document.getElementById('signal-table-body');
    const countEl = document.getElementById('signal-result-count');
    const pagEl   = document.getElementById('signal-pagination');
    if (!tbody) return;

    let data = [...allSignalData];

    // Timeframe filter (client-side)
    if (currentTimeframe) {
        data = data.filter(r => (r.timeframe || '').toUpperCase() === currentTimeframe);
    }

    // Search
    if (searchQuery) {
        data = data.filter(r =>
            (r.ticker_base || r.ticker || '').toLowerCase().includes(searchQuery) ||
            (r.company_name || '').toLowerCase().includes(searchQuery)
        );
    }

    // Sort
    data.sort((a, b) => {
        let va = a[sortColumn] ?? '';
        let vb = b[sortColumn] ?? '';
        if (sortColumn === 'signal_strength') {
            va = signalStrengthScore(a.signal_type);
            vb = signalStrengthScore(b.signal_type);
        } else if (typeof va === 'number' || !isNaN(parseFloat(va))) {
            va = parseFloat(va) || 0;
            vb = parseFloat(vb) || 0;
        } else {
            va = String(va).toLowerCase();
            vb = String(vb).toLowerCase();
        }
        if (va < vb) return sortDir === 'asc' ? -1 : 1;
        if (va > vb) return sortDir === 'asc' ?  1 : -1;
        return 0;
    });

    const total     = data.length;
    const totalPages= Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;

    const start  = (currentPage - 1) * PAGE_SIZE;
    const paged  = data.slice(start, start + PAGE_SIZE);

    if (countEl) countEl.textContent = `${total} sinyal`;

    if (total === 0) {
        tbody.innerHTML = `
            <tr><td colspan="8" style="text-align:center;padding:48px">
                <div style="font-size:32px;margin-bottom:8px">📭</div>
                <div style="color:var(--text-muted);font-size:13px">
                    ${searchQuery ? `Tidak ada sinyal untuk "${searchQuery}"` : 'Tidak ada sinyal yang cocok'}
                </div>
            </td></tr>`;
        if (pagEl) pagEl.innerHTML = '';
        return;
    }

    tbody.innerHTML = paged.map(row => {
        const ticker    = row.ticker_base || row.ticker || '—';
        const sigType   = (row.signal_type || '').toLowerCase();
        const badge     = signalBadge(sigType);
        const tf        = row.timeframe || '1D';
        const dateStr   = row.signal_date || '—';
        const rsi       = row.rsi   != null ? Number(row.rsi).toFixed(1)   : '—';
        const macd      = row.macd  != null ? Number(row.macd).toFixed(2)  : (row.magic_line != null ? Number(row.magic_line).toFixed(2) : '—');
        const price     = row.close != null ? Number(row.close).toLocaleString('id-ID') : '—';
        const rowBg     = sigType.includes('buy')  ? 'background:var(--up-bg,rgba(16,185,129,.04))'
                        : sigType.includes('sell') ? 'background:var(--down-bg,rgba(239,68,68,.04))'
                        : '';
        return `
            <tr style="border-bottom:1px solid var(--border-subtle);${rowBg}">
                <td style="padding:10px 14px">
                    <a href="#stock/${ticker}" style="color:var(--text-main);text-decoration:none;font-weight:700;font-family:var(--font-mono)">${ticker}</a>
                    ${row.company_name ? `<div style="font-size:11px;color:var(--text-muted);margin-top:1px;max-width:120px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${row.company_name}</div>` : ''}
                </td>
                <td style="padding:10px 14px;text-align:center">${badge}</td>
                <td style="padding:10px 14px;text-align:center">
                    <span class="badge" style="font-size:10px;background:var(--bg-subtle);color:var(--text-muted)">${tf}</span>
                </td>
                <td style="padding:10px 14px;text-align:right;font-size:12px;color:var(--text-dim)">${dateStr}</td>
                <td style="padding:10px 14px;text-align:right;font-family:var(--font-mono);font-size:12px;color:${rsiColor(row.rsi)}">${rsi}</td>
                <td style="padding:10px 14px;text-align:right;font-family:var(--font-mono);font-size:12px;color:var(--text-muted)">${macd}</td>
                <td style="padding:10px 14px;text-align:right;font-family:var(--font-mono);font-weight:600">${price}</td>
                <td style="padding:10px 14px;text-align:center">
                    <a href="#stock/${ticker}" class="btn btn-sm" style="padding:4px 10px;font-size:11px">Detail</a>
                </td>
            </tr>
        `;
    }).join('');

    // Pagination
    if (pagEl) renderPagination(pagEl, currentPage, totalPages);
}

function renderPagination(container, page, total) {
    if (total <= 1) { container.innerHTML = ''; return; }

    const pages = [];
    // Always show first, last, current ±2
    const show = new Set([1, total, page, page - 1, page - 2, page + 1, page + 2].filter(p => p >= 1 && p <= total));
    const sorted = [...show].sort((a, b) => a - b);

    let html = `<button class="btn btn-sm" ${page === 1 ? 'disabled' : ''} data-page="${page - 1}">‹</button>`;
    let prev = 0;
    for (const p of sorted) {
        if (prev && p - prev > 1) html += `<span style="padding:0 4px;color:var(--text-muted)">…</span>`;
        html += `<button class="btn btn-sm ${p === page ? 'btn-primary' : ''}" data-page="${p}">${p}</button>`;
        prev = p;
    }
    html += `<button class="btn btn-sm" ${page === total ? 'disabled' : ''} data-page="${page + 1}">›</button>`;

    container.innerHTML = html;
    container.querySelectorAll('[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
            currentPage = parseInt(btn.dataset.page);
            renderTable();
            document.getElementById('signal-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
}

// ── Helpers ───────────────────────────────────────────────

function signalBadge(type) {
    const map = {
        'buy':         { bg: 'var(--up-bg,rgba(16,185,129,.15))',   color: 'var(--up-color,#10b981)',   label: 'BUY'         },
        'strong_buy':  { bg: 'rgba(0,200,83,.2)',                   color: '#00c853',                   label: 'STRONG BUY'  },
        'sell':        { bg: 'var(--down-bg,rgba(239,68,68,.15))',  color: 'var(--down-color,#ef4444)', label: 'SELL'        },
        'strong_sell': { bg: 'rgba(213,0,0,.2)',                    color: '#d50000',                   label: 'STRONG SELL' },
        'hold':        { bg: 'rgba(107,114,128,.15)',               color: 'var(--text-muted,#6b7280)', label: 'HOLD'        },
    };
    const s = map[type] || map['hold'];
    return `<span class="badge" style="background:${s.bg};color:${s.color};border:none;font-size:11px;font-weight:700;white-space:nowrap">${s.label}</span>`;
}

function signalStrengthScore(type) {
    const scores = { strong_buy: 5, buy: 4, hold: 3, sell: 2, strong_sell: 1 };
    return scores[(type || '').toLowerCase()] || 3;
}

function rsiColor(rsi) {
    if (rsi == null) return 'var(--text-muted)';
    const v = parseFloat(rsi);
    if (v >= 70) return 'var(--down-color, #ef4444)';
    if (v <= 30) return 'var(--up-color, #10b981)';
    return 'var(--text-secondary)';
}

function getSignalDot(type) {
    if (!type) return '';
    const colors = {
        buy: '#10b981', strong_buy: '#00c853',
        sell: '#ef4444', strong_sell: '#d50000',
        hold: '#6b7280',
    };
    const c = colors[type] || '#6b7280';
    return `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${c};margin-right:5px;vertical-align:middle"></span>`;
}
