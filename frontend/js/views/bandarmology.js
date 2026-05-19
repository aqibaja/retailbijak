/**
 * bandarmology.js — Halaman Screener Bandarmology
 * Route: #bandarmology
 * v=20260519C — ganti apiFetch dengan native fetch untuk hindari import cache issue
 */

let _bmCurrentPhase = 'all';
let _bmCurrentSort = { col: 'phase_confidence', dir: 'desc' };
let _bmData = [];

// Expose state ke window agar window._bmSort bisa akses
window._bmState = { get data() { return _bmData; }, get phase() { return _bmCurrentPhase; }, get sort() { return _bmCurrentSort; } };

// Helper fetch langsung ke backend API
async function _apiFetch(path) {
  const url = path.startsWith('/api/') ? path : '/api/' + path.replace(/^\//, '');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function renderBandarmology(params) {
  const app = document.getElementById('app-root');
  if (!app) return;

  app.innerHTML = `
    <section class="page-section bm-page">
      <div class="bm-page-header">
        <div>
          <div class="bm-page-title">🏦 Bandarmology</div>
          <div class="text-dim text-xs mt-1">Analisis jejak bandar berdasarkan broker summary IDX</div>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <div class="bm-filter-tabs" id="bm-filter-tabs">
            <button class="bm-filter-tab active" data-phase="all">Semua</button>
            <button class="bm-filter-tab" data-phase="accumulation">🟢 Akumulasi</button>
            <button class="bm-filter-tab" data-phase="distribution">🔴 Distribusi</button>
            <button class="bm-filter-tab" data-phase="neutral">🟡 Netral</button>
          </div>
          <button class="btn btn-sm" id="bm-refresh-btn" title="Refresh data">↻ Refresh</button>
        </div>
      </div>

      <!-- Edukasi collapsible -->
      <div class="bm-edu-section" id="bm-edu-section">
        <div class="bm-edu-toggle" id="bm-edu-toggle">
          <span>📖 Apa itu Bandarmology? <span class="text-dim text-xs">(klik untuk buka)</span></span>
          <span id="bm-edu-arrow">▼</span>
        </div>
        <div class="bm-edu-body" id="bm-edu-body">
          <div class="bm-edu-card">
            <h4>🟢 Akumulasi</h4>
            <p>Broker dominan net buy konsisten 3+ hari. Bandar sedang mengumpulkan saham diam-diam. Harga biasanya stagnan atau naik pelan.</p>
          </div>
          <div class="bm-edu-card">
            <h4>🔴 Distribusi</h4>
            <p>Broker dominan net sell konsisten 3+ hari. Bandar sedang melepas saham. Harga bisa masih naik (tipu-tipu) tapi akan turun.</p>
          </div>
          <div class="bm-edu-card">
            <h4>🟡 Netral</h4>
            <p>Aktivitas broker tidak konsisten. Belum ada sinyal jelas dari bandar. Tunggu konfirmasi lebih lanjut.</p>
          </div>
          <div class="bm-edu-card">
            <h4>↑↓ Arus Modal</h4>
            <p>Asing & Lokal searah = sinyal kuat. Divergence (berlawanan) = hati-hati, pasar tidak pasti.</p>
          </div>
          <div class="bm-edu-card">
            <h4>🚨 Volume Spike</h4>
            <p>&gt;2x rata-rata = perhatian. &gt;5x = bandar sangat aktif. Volume spike tanpa kenaikan harga = akumulasi stealth.</p>
          </div>
          <div class="bm-edu-card">
            <h4>★ Broker Bandar</h4>
            <p>Broker smart money: UBS (AK), JP Morgan (YB), Mirae (YP), Maybank (ZP), CLSA (KZ), BCA Sekuritas (SQ), dll.</p>
          </div>
        </div>
      </div>

      <!-- Quota info -->
      <div id="bm-quota-bar" class="text-dim text-xs mb-3" style="display:none"></div>

      <!-- Screener table -->
      <div class="card" style="overflow-x:auto;overflow-y:visible">
        <div id="bm-screener-wrap">
          <div class="bm-screener-empty">
            <div class="spinner" style="margin:0 auto 8px"></div>
            <div class="text-dim text-xs">Memuat data...</div>
          </div>
        </div>
      </div>

      <div class="text-dim text-xs mt-3 text-center">
        ⚠️ Data bandarmology bersifat indikatif. Bukan saran investasi. Selalu lakukan riset mandiri.
      </div>
    </section>`;

  // Event: filter tabs
  document.getElementById('bm-filter-tabs').addEventListener('click', e => {
    const btn = e.target.closest('.bm-filter-tab');
    if (!btn) return;
    document.querySelectorAll('.bm-filter-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    _bmCurrentPhase = btn.dataset.phase;
    renderBmTable(_bmData);
  });

  // Event: refresh
  document.getElementById('bm-refresh-btn').addEventListener('click', () => loadBmData());

  // Event: edu toggle
  document.getElementById('bm-edu-toggle').addEventListener('click', () => {
    const body = document.getElementById('bm-edu-body');
    const arrow = document.getElementById('bm-edu-arrow');
    body.classList.toggle('open');
    arrow.textContent = body.classList.contains('open') ? '▲' : '▼';
  });

  // Load data
  loadBmData();
  loadBmQuota();
}

// Expose sort function ke window untuk onclick handler di th
window._bmSort = function(col) {
  if (_bmCurrentSort.col === col) {
    _bmCurrentSort.dir = _bmCurrentSort.dir === 'asc' ? 'desc' : 'asc';
  } else {
    _bmCurrentSort = { col, dir: 'desc' };
  }
  renderBmTable(_bmData);
};

// Filter function juga expose ke window
window._bmFilter = function(phase) {
  _bmCurrentPhase = phase;
  renderBmTable(_bmData);
};

async function loadBmData() {
  const wrap = document.getElementById('bm-screener-wrap');
  if (!wrap) return;
  wrap.innerHTML = `<div class="bm-screener-empty"><div class="spinner" style="margin:0 auto 8px"></div><div class="text-dim text-xs">Memuat data...</div></div>`;

  try {
    const res = await _apiFetch('/bandarmology/screener?limit=100');
    if (!res || !res.data) throw new Error('No data');
    _bmData = res.data;
    renderBmTable(_bmData);
  } catch (e) {
    console.error('[bandarmology] loadBmData error:', e);
    wrap.innerHTML = `<div class="bm-screener-empty text-down">Gagal memuat data. <button class="btn btn-sm mt-2" id="bm-retry-btn">Coba lagi</button></div>`;
    const retryBtn = document.getElementById('bm-retry-btn');
    if (retryBtn) retryBtn.addEventListener('click', () => loadBmData());
  }
}

async function loadBmQuota() {
  try {
    const res = await _apiFetch('/bandarmology/quota');
    const bar = document.getElementById('bm-quota-bar');
    if (!bar) return;
    const d = res?.data || res;
    if (d && d.remaining !== undefined) {
      bar.style.display = '';
      const used = d.current_usage ?? d.used ?? 0;
      const limit = d.monthly_limit ?? d.limit ?? 0;
      const remaining = d.remaining ?? 0;
      bar.innerHTML = `📡 IndexAlpha API: <strong>${used}/${limit}</strong> request digunakan · Sisa: <strong class="${remaining < 10 ? 'text-down' : 'text-up'}">${remaining}</strong> · Reset: ${d.reset_date ? new Date(d.reset_date).toLocaleDateString('id-ID') : '—'}`;
    }
  } catch (_) {}
}

function renderBmTable(data) {
  const wrap = document.getElementById('bm-screener-wrap');
  if (!wrap) return;

  // Simpan scroll position card
  const card = wrap.closest('.card');
  const scrollLeft = card ? card.scrollLeft : 0;

  // Filter by phase
  let filtered = _bmCurrentPhase === 'all'
    ? data
    : data.filter(r => r.phase === _bmCurrentPhase);

  if (!filtered.length) {
    wrap.innerHTML = `<div class="bm-screener-empty">Tidak ada saham dengan fase <strong>${_bmCurrentPhase}</strong> saat ini.</div>`;
    return;
  }

  // Sort
  const { col, dir } = _bmCurrentSort;
  filtered = [...filtered].sort((a, b) => {
    let va = a[col] ?? 0, vb = b[col] ?? 0;
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ? 1 : -1;
    return 0;
  });

  const thStyle = 'cursor:pointer;touch-action:manipulation;user-select:none;-webkit-tap-highlight-color:rgba(0,0,0,0)';

  const sortIcon = (c) => {
    if (_bmCurrentSort.col !== c) return '<span class="text-dim">⇅</span>';
    return _bmCurrentSort.dir === 'asc' ? '↑' : '↓';
  };

  const fmtVal = v => {
    if (v === null || v === undefined) return '—';
    const abs = Math.abs(v);
    const sign = v >= 0 ? '+' : '-';
    if (abs >= 1e12) return sign + (abs/1e12).toFixed(1) + 'T';
    if (abs >= 1e9)  return sign + (abs/1e9).toFixed(1) + 'M';
    if (abs >= 1e6)  return sign + (abs/1e6).toFixed(1) + 'jt';
    return sign + abs.toLocaleString('id-ID');
  };

  const phasePill = (phase, conf) => {
    const map = {
      accumulation: `<span class="bm-phase-pill acc">🟢 AKUMULASI</span>`,
      distribution: `<span class="bm-phase-pill dist">🔴 DISTRIBUSI</span>`,
      neutral:       `<span class="bm-phase-pill neutral">🟡 NETRAL</span>`,
    };
    const pill = map[phase] || map.neutral;
    return `${pill} <span class="text-dim text-xs">${conf || 0}%</span>`;
  };

  const spikePill = (ratio, level) => {
    if (!ratio || ratio <= 1) return '<span class="text-dim">—</span>';
    const icon = level === 'extreme' ? '🚨' : level === 'alert' ? '⚠️' : level === 'watch' ? '👁️' : '';
    return `<span class="bm-spike-pill ${level}">${icon} ${ratio}x</span>`;
  };

  const flowCell = (val, dir) => {
    if (val === null || val === undefined) return '—';
    const cls = dir === 'inflow' ? 'text-up' : dir === 'outflow' ? 'text-down' : 'text-dim';
    const arrow = dir === 'inflow' ? '↑' : dir === 'outflow' ? '↓' : '→';
    return `<span class="mono ${cls}">${arrow} ${fmtVal(Math.abs(val))}</span>`;
  };

  const srcDot = src => src === 'real'
    ? '<span class="text-up text-xs" title="Data real dari IndexAlpha">●</span>'
    : '<span class="text-dim text-xs" title="Data simulasi">○</span>';

  const rows = filtered.map(r => `
    <tr data-ticker="${r.ticker}" style="cursor:pointer" onclick="window.handleRoute && window.handleRoute('stock/${r.ticker}')">
      <td>
        <div class="flex items-center gap-2">
          ${srcDot(r.source)}
          <div>
            <div class="strong text-sm">${r.ticker}</div>
            <div class="text-dim text-xs" style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.name || '—'}</div>
          </div>
        </div>
      </td>
      <td>${phasePill(r.phase, r.phase_confidence)}</td>
      <td>${flowCell(r.foreign_net_value, r.foreign_direction)}</td>
      <td>${spikePill(r.volume_spike_ratio, r.volume_spike_level)}</td>
      <td>
        ${r.phase_streak_days >= 2
          ? `<span class="bm-streak ${r.phase === 'accumulation' ? 'bm-streak-buy' : 'bm-streak-sell'}">${r.phase === 'accumulation' ? '↑' : '↓'}${r.phase_streak_days}h</span>`
          : '<span class="text-dim">—</span>'}
      </td>
      <td>
        <div class="text-xs text-dim" style="max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
          ${r.top_broker_name || '—'}
        </div>
      </td>
      <td>
        ${r.last_price != null
          ? `<div class="mono text-sm">${r.last_price.toLocaleString('id-ID')}</div>
             ${r.change_pct != null ? `<div class="text-xs ${r.change_pct >= 0 ? 'text-up' : 'text-down'}">${r.change_pct >= 0 ? '+' : ''}${r.change_pct}%</div>` : ''}`
          : '—'}
      </td>
    </tr>`).join('');

  wrap.innerHTML = `
    <table class="bm-screener-table">
      <thead>
        <tr>
          <th><button class="bm-sort-btn" onclick="window._bmSort('ticker')">Saham ${sortIcon('ticker')}</button></th>
          <th><button class="bm-sort-btn" onclick="window._bmSort('phase_confidence')">Fase ${sortIcon('phase_confidence')}</button></th>
          <th><button class="bm-sort-btn" onclick="window._bmSort('foreign_net_value')">Asing Flow ${sortIcon('foreign_net_value')}</button></th>
          <th><button class="bm-sort-btn" onclick="window._bmSort('volume_spike_ratio')">Vol Spike ${sortIcon('volume_spike_ratio')}</button></th>
          <th><button class="bm-sort-btn" onclick="window._bmSort('phase_streak_days')">Streak ${sortIcon('phase_streak_days')}</button></th>
          <th>Top Broker</th>
          <th><button class="bm-sort-btn" onclick="window._bmSort('last_price')">Harga ${sortIcon('last_price')}</button></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="text-dim text-xs p-3">${filtered.length} saham ditampilkan</div>`;

  // Restore scroll position
  if (card) card.scrollLeft = scrollLeft;


}
