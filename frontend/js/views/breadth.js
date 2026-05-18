// ─── Market Breadth View — Advance/Decline Chart ────
// Fase 9.2: Market breadth visualization
// 31.1.3 — Added skeleton loading

import { apiFetch, showToast } from '../api.js';
import { t as _t } from '../i18n.js?v=20260518H';
const t = (key, params) => (window.t ? window.t(key, params) : _t(key, params));

let breadthChart = null;

// ─── Skeleton helpers ────────────────────────────────
function skeletonSummary() {
    return Array(5).fill(
        `<div class="skeleton skeleton-card" style="height:64px;border-radius:10px;flex:1;min-width:120px"></div>`
    ).join('');
}

function skeletonTable() {
    return `<div class="flex-col gap-2 p-4">${
        Array(8).fill('<div class="skeleton skeleton-card" style="height:36px;border-radius:8px"></div>').join('')
    }</div>`;
}

export async function renderBreadth(root) {
    if (!root) root = document.getElementById('app');
    if (!root) return;

    root.innerHTML = `
        <div class="view-content breadth-page">
            <div class="page-header">
                <div>
                    <h1>Market Breadth</h1>
                    <p class="page-subtitle">Advance-Decline analysis — daily gainers vs decliners</p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-sm btn-icon" id="exportBreadthCSV" title="Export CSV">
                        <i data-lucide="download" class="icon-14"></i>
                    </button>
                    <button class="btn btn-sm btn-icon" id="refreshBreadth" title="Refresh">
                        <i data-lucide="refresh-cw" class="icon-14"></i>
                    </button>
                </div>
            </div>

            <div class="breadth-summary-cards" id="breadthSummary" style="display:flex;flex-wrap:wrap;gap:10px">
                ${skeletonSummary()}
            </div>

            <div class="card" style="padding:16px;margin-top:16px">
                <div id="breadthChartSkeleton" class="skeleton" style="height:320px;border-radius:10px"></div>
                <canvas id="breadthChart" height="320" style="display:none"></canvas>
            </div>

            <div class="breadth-table-wrap card" style="padding:0;margin-top:16px">
                <div id="breadthTable">${skeletonTable()}</div>
            </div>
        </div>
    `;

    lucide.createIcons();
    document.getElementById('refreshBreadth')?.addEventListener('click', loadBreadth);
    
    // Export CSV handler
    document.getElementById('exportBreadthCSV')?.addEventListener('click', exportBreadthCSV);
    
    await loadBreadth();
}

async function loadBreadth() {
    // Show skeletons on refresh
    const summaryEl = document.getElementById('breadthSummary');
    const tableEl   = document.getElementById('breadthTable');
    const chartEl   = document.getElementById('breadthChart');
    const chartSkel = document.getElementById('breadthChartSkeleton');
    if (summaryEl) summaryEl.innerHTML = skeletonSummary();
    if (tableEl)   tableEl.innerHTML   = skeletonTable();
    if (chartEl)   chartEl.style.display = 'none';
    if (chartSkel) chartSkel.style.display = 'block';

    try {
        const data = await apiFetch('/market/breadth?days=50');
        if (!data.data || !data.data.length) throw new Error('No data');

        // Hide chart skeleton, show canvas
        if (chartSkel) chartSkel.style.display = 'none';
        if (chartEl)   chartEl.style.display = 'block';

        renderSummary(data.data);
        renderChart(data.data);
        renderTable(data.data);
    } catch (e) {
        if (chartSkel) chartSkel.style.display = 'none';
        if (chartEl)   chartEl.style.display = 'none';
        if (summaryEl) summaryEl.innerHTML = `<div class="breadth-error">⚠️ Gagal memuat data breadth</div>`;
        if (tableEl)   tableEl.innerHTML   = '';
        showToast('Gagal memuat breadth', 'error');
    }
}

function renderSummary(data) {
    const latest = data[data.length - 1];
    const first = data[0];
    const avgGainers = Math.round(data.reduce((s, d) => s + d.gainers, 0) / data.length);
    const avgDecliners = Math.round(data.reduce((s, d) => s + d.decliners, 0) / data.length);
    const totalCum = latest.cumulative_breadth;

    document.getElementById('breadthSummary').innerHTML = `
        <div class="breadth-stat"><span class="breadth-stat-label">Hari Ini</span><span class="breadth-stat-val up">${latest.gainers}↑</span><span class="breadth-stat-val down">${latest.decliners}↓</span></div>
        <div class="breadth-stat"><span class="breadth-stat-label">Rata-rata</span><span class="breadth-stat-val up">${avgGainers}↑</span><span class="breadth-stat-val down">${avgDecliners}↓</span></div>
        <div class="breadth-stat"><span class="breadth-stat-label">Ratio (hari ini)</span><span class="breadth-stat-val ${latest.breadth_ratio >= 1 ? 'up' : 'down'}">${latest.breadth_ratio.toFixed(2)}</span></div>
        <div class="breadth-stat"><span class="breadth-stat-label">Cumulative Breadth</span><span class="breadth-stat-val ${totalCum >= 0 ? 'up' : 'down'}">${totalCum >= 0 ? '+' : ''}${totalCum.toLocaleString('id-ID')}</span></div>
        <div class="breadth-stat"><span class="breadth-stat-label">Hari Hijau</span><span class="breadth-stat-val up">${data.filter(d => d.gainers > d.decliners).length}/${data.length}</span></div>
    `;
}

function renderChart(data) {
    const canvas = document.getElementById('breadthChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Destroy previous chart
    if (breadthChart) { breadthChart.destroy(); breadthChart = null; }

    const labels = data.map(d => {
        const parts = d.date.split('-');
        return parts[2] + '/' + parts[1];
    });
    const gainers = data.map(d => d.gainers);
    const decliners = data.map(d => d.decliners * -1); // negative for visual
    const cumBreadth = data.map(d => d.cumulative_breadth);

    // Check if Chart is available
    if (typeof Chart === 'undefined') {
        canvas.parentElement.innerHTML = '<div class="text-muted p-4">Chart library not loaded</div>';
        return;
    }

    // Calculate gradient for cum line
    const cumGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    cumGradient.addColorStop(0, 'rgba(16, 185, 129, 0.15)');
    cumGradient.addColorStop(1, 'rgba(16, 185, 129, 0.01)');

    breadthChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Gainers',
                    data: gainers,
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 1,
                    borderRadius: 2,
                    order: 2,
                },
                {
                    label: 'Decliners',
                    data: decliners,
                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                    borderColor: 'rgba(239, 68, 68, 1)',
                    borderWidth: 1,
                    borderRadius: 2,
                    order: 2,
                },
                {
                    label: 'Cumulative Breadth',
                    data: cumBreadth,
                    type: 'line',
                    borderColor: '#10b981',
                    backgroundColor: cumGradient,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 2,
                    pointBackgroundColor: '#10b981',
                    borderWidth: 2,
                    order: 1,
                    yAxisID: 'y1',
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#94a3b8', font: { size: 11 }, boxWidth: 12, padding: 12 },
                },
            },
            scales: {
                x: {
                    ticks: { color: '#64748b', font: { size: 9 }, maxTicksLimit: 20 },
                    grid: { display: false },
                },
                y: {
                    position: 'left',
                    ticks: { color: '#64748b', font: { size: 9 } },
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    title: { display: true, text: 'Jumlah Saham', color: '#64748b', font: { size: 10 } },
                },
                y1: {
                    position: 'right',
                    ticks: { color: '#10b981', font: { size: 9 } },
                    grid: { display: false },
                    title: { display: true, text: 'Cumulative', color: '#10b981', font: { size: 10 } },
                },
            },
        },
    });
}

function renderTable(data) {
    const container = document.getElementById('breadthTable');
    if (!container) return;

    const rows = [...data].reverse().slice(-20).reverse().map(d => {
        const isGreen = d.gainers > d.decliners;
        const cls = isGreen ? 'up' : 'down';
        return `<div class="breadth-row">
            <span class="breadth-date">${d.date}</span>
            <span class="breadth-bar-wrap">
                <span class="breadth-bar" style="flex:${d.gainers};background:var(--up-color);border-radius:3px 0 0 3px"></span>
                <span class="breadth-bar" style="flex:${d.decliners};background:var(--down-color);border-radius:0 3px 3px 0"></span>
            </span>
            <span class="breadth-gainers up">${d.gainers}</span>
            <span class="breadth-decliners down">${d.decliners}</span>
            <span class="breadth-ratio ${cls}">${d.breadth_ratio.toFixed(2)}</span>
            <span class="breadth-cum ${cls}">${d.cumulative_breadth >= 0 ? '+' : ''}${d.cumulative_breadth.toLocaleString('id-ID')}</span>
        </div>`;
    }).join('');

    container.innerHTML = `
        <div class="breadth-table-header">
            <span>Tanggal</span>
            <span style="flex:1">Distribusi</span>
            <span>↑</span>
            <span>↓</span>
            <span>Ratio</span>
            <span>Cumulative</span>
        </div>
        ${rows}
    `;
}

// ─── Export Breadth CSV (14.4.2) ─────────────────────────────
function exportBreadthCSV() {
    const container = document.getElementById('breadthTable');
    if (!container) {
        showToast('Tidak ada data untuk diexport', 'warning');
        return;
    }
    // Extract data from rendered table rows
    const rows = container.querySelectorAll('.breadth-row');
    if (!rows.length) {
        showToast('Tidak ada data untuk diexport', 'warning');
        return;
    }
    const headers = ['Tanggal', 'Gainers', 'Decliners', 'Ratio', 'Cumulative Breadth'];
    const csvRows = [];
    rows.forEach(row => {
        const date = row.querySelector('.breadth-date')?.textContent?.trim() || '';
        const gainers = row.querySelector('.breadth-gainers')?.textContent?.trim() || '';
        const decliners = row.querySelector('.breadth-decliners')?.textContent?.trim() || '';
        const ratio = row.querySelector('.breadth-ratio')?.textContent?.trim() || '';
        const cum = row.querySelector('.breadth-cum')?.textContent?.trim() || '';
        csvRows.push([date, gainers, decliners, ratio, cum].map(v => '"' + v.replace(/"/g, '""') + '"').join(','));
    });
    const csv = '\uFEFF' + headers.join(',') + '\n' + csvRows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retailbijak-breadth-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`CSV breadth diunduh (${rows.length} hari)`, 'success');
}
