/**
 * Full-Screen Chart View — Dedicated chart page with drawing tools
 * Fase 15.5 — Full-Screen Chart & Drawing Tools
 */
import { showToast, apiFetch } from '../api.js?v=20260510';

let activeTicker = null;
let activeTf = '1M';
let chart = null;
let series = null;
let volumeSeries = null;
let candles = [];
let trendLines = [];
let hLines = [];

const TF_OPTIONS = ['1D', '5D', '1M', '3M', '6M', '1Y', 'MAX'];

export function renderChart(root, ticker) {
    if (!root) return;
    activeTicker = (ticker || '').toUpperCase();
    root.innerHTML = `
        <div class="fullchart-container">
            <div class="fullchart-topbar">
                <button class="btn btn-ghost btn-sm" id="chart-back-btn"><i data-lucide="arrow-left"></i> Kembali</button>
                <h2 class="fullchart-title">${activeTicker}</h2>
                <div class="fullchart-timeframes">
                    ${TF_OPTIONS.map(tf => `<button class="tf-btn ${tf === activeTf ? 'active' : ''}" data-tf="${tf}">${tf}</button>`).join('')}
                </div>
                <div class="fullchart-tools">
                    <button class="btn btn-icon btn-sm" id="tool-trendline" title="Trend Line"><i data-lucide="trending-up"></i></button>
                    <button class="btn btn-icon btn-sm" id="tool-hline" title="Horizontal Line"><i data-lucide="minus"></i></button>
                    <button class="btn btn-icon btn-sm" id="tool-clear" title="Clear Drawings"><i data-lucide="eraser"></i></button>
                </div>
            </div>
            <div id="fullchart-wrap" class="fullchart-wrap">
                <div class="skeleton skeleton-chart" style="height:100%;border-radius:0"></div>
            </div>
            <div class="fullchart-info" id="fullchart-info">
                <span>Memuat data...</span>
            </div>
        </div>
    `;

    // Back button
    root.querySelector('#chart-back-btn').addEventListener('click', () => {
        window.location.hash = `#stock/${activeTicker}`;
    });

    // Timeframe buttons
    root.querySelectorAll('.tf-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            root.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeTf = btn.dataset.tf;
            loadChartData();
        });
    });

    // Drawing tools
    root.querySelector('#tool-trendline')?.addEventListener('click', () => showToast('Trend line: klik 2 titik pada chart', 'info'));
    root.querySelector('#tool-hline')?.addEventListener('click', () => showToast('Horizontal line: klik pada level harga', 'info'));
    root.querySelector('#tool-clear')?.addEventListener('click', clearDrawings);

    loadChartData();
}

async function loadChartData() {
    const wrap = document.getElementById('fullchart-wrap');
    if (!wrap || !activeTicker) return;

    const info = document.getElementById('fullchart-info');
    if (info) info.innerHTML = `<span>Memuat ${activeTicker} — ${activeTf}...</span>`;

    try {
        const rangeMap = { '1D': 2, '5D': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365, 'MAX': 1000 };
        const days = rangeMap[activeTf] || 30;
        const res = await apiFetch(`/api/stocks/${activeTicker}/chart-data?range=${activeTf}`);
        
        if (!res || !res.data || !res.data.length) {
            wrap.innerHTML = '<div class="empty-state-v2" style="height:60vh"><div class="empty-icon">📉</div><h3>Data tidak tersedia</h3><p>Tidak ada data harga untuk timeframe ini.</p></div>';
            if (info) info.innerHTML = '<span class="text-dim">Data tidak tersedia</span>';
            return;
        }

        candles = res.data.map(r => ({
            time: typeof r.date === 'string' ? r.date.slice(0, 10) : r.date,
            open: Number(r.open ?? r.close),
            high: Number(r.high ?? r.close),
            low: Number(r.low ?? r.close),
            close: Number(r.close),
            volume: Number(r.volume || 0),
        })).filter(c => c.time && c.close > 0);

        if (!candles.length) throw new Error('No valid candles');

        // Clear wrap for chart
        wrap.innerHTML = '<div id="tvchart-full" style="width:100%;height:100%"></div>';
        
        // Initialize LightweightCharts
        if (typeof LightweightCharts === 'undefined') {
            await loadLightweightCharts();
        }
        
        renderFullChart(wrap);
        
        const last = candles[candles.length - 1];
        const change = last.close - (candles.length > 1 ? candles[candles.length - 2].close : last.close);
        const pct = change / (last.close - change) * 100;
        const changeClass = change >= 0 ? 'text-up' : 'text-down';
        if (info) {
            info.innerHTML = `
                <span><strong>${activeTicker}</strong></span>
                <span class="mono">Rp ${last.close.toLocaleString('id-ID')}</span>
                <span class="${changeClass}">${change >= 0 ? '+' : ''}${change.toFixed(0)} (${pct.toFixed(2)}%)</span>
                <span class="text-dim">Vol: ${(last.volume / 1000000).toFixed(1)}M</span>
                <span class="text-dim">${candles.length} candle • ${activeTf}</span>
            `;
        }

    } catch (e) {
        wrap.innerHTML = `<div class="empty-state-v2" style="height:60vh"><div class="empty-icon">⚠️</div><h3>Gagal memuat chart</h3><p>${e.message || 'Coba timeframe lain.'}</p></div>`;
        if (info) info.innerHTML = '<span class="text-dim">Gagal memuat data</span>';
    }
}

function renderFullChart(wrap) {
    if (chart) {
        chart.remove();
        chart = null;
        series = null;
        volumeSeries = null;
    }

    const container = document.getElementById('tvchart-full');
    if (!container) return;

    chart = LightweightCharts.createChart(container, {
        layout: {
            background: { color: 'transparent' },
            textColor: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#94a3b8',
            fontSize: 11,
        },
        grid: {
            vertLines: { color: 'rgba(255,255,255,0.04)' },
            horzLines: { color: 'rgba(255,255,255,0.04)' },
        },
        crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
        rightPriceScale: { borderColor: 'rgba(255,255,255,0.08)' },
        timeScale: { borderColor: 'rgba(255,255,255,0.08)', timeVisible: true, secondsVisible: false },
        handleScroll: true,
        handleScale: true,
    });

    series = chart.addCandlestickSeries({
        upColor: '#34d399',
        downColor: '#f87171',
        borderUpColor: '#34d399',
        borderDownColor: '#f87171',
        wickUpColor: '#34d399',
        wickDownColor: '#f87171',
    });

    volumeSeries = chart.addHistogramSeries({
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
    });

    series.setData(candles.map(c => ({
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
    })));

    volumeSeries.setData(candles.map(c => ({
        time: c.time,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)',
    })));

    chart.timeScale().fitContent();

    // Add previous trend lines (from localStorage)
    loadDrawings();
}

async function loadLightweightCharts() {
    return new Promise((resolve, reject) => {
        if (typeof LightweightCharts !== 'undefined') return resolve();
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

function clearDrawings() {
    trendLines.forEach(l => { try { chart.removeSeries(l); } catch(e) {} });
    hLines.forEach(l => { try { chart.removeSeries(l); } catch(e) {} });
    trendLines = [];
    hLines = [];
    localStorage.removeItem(`chart-drawings-${activeTicker}`);
    showToast('Drawing dihapus', 'success');
}

function saveDrawings() {
    // Save as empty for now — full drawing persistence is complex
}
