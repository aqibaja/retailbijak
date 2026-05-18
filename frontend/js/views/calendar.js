// ─── Calendar View — Month Grid + Event List ────────────────
// 31.3.3 Enhanced: grid/list toggle, color per type, month nav, type filter chips
// API: GET /api/calendar?month=YYYY-MM, GET /api/calendar/today

import { apiFetch, showToast } from '../api.js';
import { nf, dateFormat } from '../utils/format.js';
import { t as _t } from '../i18n.js?v=20260518H';
const t = (key, params) => (window.t ? window.t(key, params) : _t(key, params));

const DAY_NAMES  = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const DAY_SHORT  = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// ─── Event type config — color per type ──────────────────────
// ex_dividend=biru, rups=hijau, earnings=oranye, economic=ungu
const TYPE_CONFIG = {
  ex_dividend: { icon: '🔵', label: 'Ex-Dividen',  dot: '#3b82f6', bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa' },
  dividend:    { icon: '🔵', label: 'Dividen',      dot: '#3b82f6', bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa' },
  rups:        { icon: '🟢', label: 'RUPS',         dot: '#10b981', bg: 'rgba(16,185,129,0.15)',  color: '#34d399' },
  earnings:    { icon: '🟠', label: 'Earnings',     dot: '#f97316', bg: 'rgba(249,115,22,0.15)',  color: '#fb923c' },
  economic:    { icon: '🟣', label: 'Ekonomi',      dot: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', color: '#a78bfa' },
  corporate:   { icon: '🟠', label: 'Korporasi',    dot: '#f97316', bg: 'rgba(249,115,22,0.15)',  color: '#fb923c' },
  ipo:         { icon: '⚪', label: 'IPO',           dot: '#94a3b8', bg: 'rgba(148,163,184,0.15)', color: '#cbd5e1' },
  rights:      { icon: '⚪', label: 'HMETD',         dot: '#94a3b8', bg: 'rgba(148,163,184,0.15)', color: '#cbd5e1' },
  split:       { icon: '⚪', label: 'Split',         dot: '#94a3b8', bg: 'rgba(148,163,184,0.15)', color: '#cbd5e1' },
};
const TYPE_DEFAULT = { icon: '📌', label: 'Event', dot: '#94a3b8', bg: 'rgba(148,163,184,0.15)', color: '#cbd5e1' };

// ─── Filter chip definitions ──────────────────────────────────
const FILTER_CHIPS = [
  { key: 'all',         label: 'Semua' },
  { key: 'dividend',    label: '🔵 Dividen',  match: ['dividend', 'ex_dividend'] },
  { key: 'rups',        label: '🟢 RUPS',     match: ['rups'] },
  { key: 'earnings',    label: '🟠 Earnings', match: ['earnings'] },
  { key: 'economic',    label: '🟣 Ekonomi',  match: ['economic'] },
];

// ─── Module state ─────────────────────────────────────────────
let currentMonth  = null;
let currentYear   = null;
let calendarData  = null;
let selectedDate  = null;
let activeFilter  = 'all';
let viewMode      = 'grid';   // 'grid' | 'list'

// ─── Filter helper ────────────────────────────────────────────
function matchesFilter(ev) {
  if (activeFilter === 'all') return true;
  const chip = FILTER_CHIPS.find(c => c.key === activeFilter);
  if (!chip || !chip.match) return true;
  return chip.match.includes((ev.type || '').toLowerCase());
}

function getTypeConfig(type) {
  return TYPE_CONFIG[(type || '').toLowerCase()] || TYPE_DEFAULT;
}

// ─── Render Entry Point ───────────────────────────────────────
export async function renderCalendar(root) {
  const now = new Date();
  currentMonth = now.getMonth();
  currentYear  = now.getFullYear();

  root.innerHTML = `
    <section class="calendar-page staggger-reveal" aria-label="Kalender Pasar">
      <div class="page-header">
        <div>
          <h1>Kalender Pasar</h1>
          <p class="page-subtitle">Dividen, laba, dan aksi korporasi saham IDX</p>
        </div>
      </div>
      <div class="calendar-wrapper panel">
        <!-- Header: nav + view toggle -->
        <div class="calendar-header" id="calendar-header">
          <button class="btn btn-sm" id="cal-prev" aria-label="Bulan sebelumnya">&larr;</button>
          <h2 class="calendar-month-title" id="cal-title">${MONTH_NAMES[currentMonth]} ${currentYear}</h2>
          <button class="btn btn-sm" id="cal-next" aria-label="Bulan berikutnya">&rarr;</button>
          <button class="btn btn-sm btn-primary" id="cal-today" aria-label="Kembali ke hari ini">Hari Ini</button>
          <button class="btn btn-sm" id="cal-export-ics" title="Export kalender bulan ini sebagai .ics">📅 Export ICS</button>
          <div class="cal-view-toggle" role="group" aria-label="Tampilan">
            <button class="cal-view-btn active" id="cal-view-grid" data-view="grid" title="Grid">⊞ Grid</button>
            <button class="cal-view-btn" id="cal-view-list" data-view="list" title="List">☰ List</button>
          </div>
        </div>

        <!-- Filter chips -->
        <div class="calendar-filter-bar" id="cal-filter-bar">
          ${FILTER_CHIPS.map(c =>
            `<button class="cal-filter-btn${activeFilter === c.key ? ' active' : ''}" data-filter="${c.key}">${c.label}</button>`
          ).join('')}
        </div>

        <!-- Grid view -->
        <div class="calendar-grid" id="cal-grid" aria-live="polite">
          ${renderSkeleton()}
        </div>

        <!-- List view (hidden by default) -->
        <div class="calendar-list-view" id="cal-list-view" style="display:none" aria-live="polite"></div>

        <!-- Event panel (shown in grid mode on day click) -->
        <div class="calendar-event-panel" id="cal-event-panel">
          <div class="calendar-event-panel-header">
            <h3 class="calendar-event-panel-title" id="cal-event-title">Pilih tanggal untuk melihat event</h3>
          </div>
          <div class="calendar-event-list" id="cal-event-list">
            <div class="dashboard-widget-state">
              <strong class="dashboard-widget-state-title">Belum ada event</strong>
              <span class="dashboard-widget-state-note">Klik tanggal yang memiliki event.</span>
            </div>
          </div>
        </div>
      </div>
    </section>`;

  // Wire filter chips
  document.querySelectorAll('.cal-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cal-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      if (viewMode === 'grid') {
        renderGrid();
        renderEventList();
      } else {
        renderListView();
      }
    });
  });

  // Wire navigation
  document.getElementById('cal-prev').addEventListener('click', () => navigateMonth(-1));
  document.getElementById('cal-next').addEventListener('click', () => navigateMonth(1));
  document.getElementById('cal-today').addEventListener('click', () => {
    const now = new Date();
    currentMonth = now.getMonth();
    currentYear  = now.getFullYear();
    selectedDate = null;
    loadAndRender();
  });

  // Export ICS
  document.getElementById('cal-export-ics')?.addEventListener('click', () => {
    const mm = String(currentMonth + 1).padStart(2, '0');
    const monthStr = `${currentYear}-${mm}`;
    const link = document.createElement('a');
    link.href = `/api/calendar/export?month=${monthStr}`;
    link.download = `retailbijak-${monthStr}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // Wire view toggle
  document.querySelectorAll('.cal-view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      viewMode = btn.dataset.view;
      document.querySelectorAll('.cal-view-btn').forEach(b => b.classList.toggle('active', b.dataset.view === viewMode));
      applyViewMode();
    });
  });

  await loadAndRender();
}

// ─── View mode switch ─────────────────────────────────────────
function applyViewMode() {
  const gridEl      = document.getElementById('cal-grid');
  const listEl      = document.getElementById('cal-list-view');
  const eventPanel  = document.getElementById('cal-event-panel');

  if (viewMode === 'grid') {
    if (gridEl)     gridEl.style.display = '';
    if (listEl)     listEl.style.display = 'none';
    if (eventPanel) eventPanel.style.display = '';
    renderGrid();
    renderEventList();
  } else {
    if (gridEl)     gridEl.style.display = 'none';
    if (listEl)     listEl.style.display = '';
    if (eventPanel) eventPanel.style.display = 'none';
    renderListView();
  }
}

// ─── Navigation ──────────────────────────────────────────────
function navigateMonth(delta) {
  currentMonth += delta;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  if (currentMonth < 0)  { currentMonth = 11; currentYear--; }
  selectedDate = null;
  loadAndRender();
}

async function loadAndRender() {
  const titleEl = document.getElementById('cal-title');
  if (titleEl) titleEl.textContent = `${MONTH_NAMES[currentMonth]} ${currentYear}`;

  const gridEl = document.getElementById('cal-grid');
  if (gridEl) gridEl.innerHTML = renderSkeleton();

  const listEl = document.getElementById('cal-list-view');
  if (listEl) listEl.innerHTML = `<div class="cal-list-loading">${skeletonList()}</div>`;

  const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  try {
    const res = await apiFetch(`/calendar?month=${monthStr}`, { timeout: 10000 });
    calendarData = res?.data || [];
  } catch (e) {
    console.warn('Calendar fetch failed', e);
    calendarData = [];
  }

  applyViewMode();
}

// ─── Skeleton helpers ─────────────────────────────────────────
function renderSkeleton() {
  const days  = DAY_SHORT.map(d => `<div class="calendar-day-header">${d}</div>`).join('');
  const cells = Array.from({ length: 35 }, () =>
    `<div class="calendar-day"><div class="skeleton" style="height:24px;width:24px;border-radius:50%"></div></div>`
  ).join('');
  return `${days}${cells}`;
}

function skeletonList() {
  return Array.from({ length: 6 }, () =>
    `<div class="skeleton" style="height:52px;border-radius:10px;margin-bottom:8px"></div>`
  ).join('');
}

// ─── Grid Rendering ───────────────────────────────────────────
function renderGrid() {
  const gridEl = document.getElementById('cal-grid');
  if (!gridEl) return;

  // Build events map: dateStr -> events[]
  const eventsByDate = {};
  if (Array.isArray(calendarData)) {
    calendarData.forEach(ev => {
      const ds = ev.date || ev.event_date;
      if (!ds) return;
      if (!matchesFilter(ev)) return;
      if (!eventsByDate[ds]) eventsByDate[ds] = [];
      eventsByDate[ds].push(ev);
    });
  }

  const firstDay    = new Date(currentYear, currentMonth, 1);
  let startOffset   = (firstDay.getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const today    = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const headerRow = DAY_SHORT.map(d => `<div class="calendar-day-header">${d}</div>`).join('');
  const cells = [];

  // Empty cells before first day
  for (let i = 0; i < startOffset; i++) {
    cells.push(`<div class="calendar-day calendar-day-empty"></div>`);
  }

  // Actual days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr    = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday    = dateStr === todayStr;
    const isSelected = dateStr === selectedDate;
    const dayEvents  = eventsByDate[dateStr] || [];
    const hasEvent   = dayEvents.length > 0;

    // Collect unique types for colored dots
    const typeSet = new Set(dayEvents.map(ev => (ev.type || '').toLowerCase()));
    const dots = Array.from(typeSet).slice(0, 3).map(t => {
      const cfg = getTypeConfig(t);
      return `<span class="cal-day-dot" style="background:${cfg.dot}" title="${cfg.label}"></span>`;
    }).join('');

    const classes = [
      'calendar-day',
      isToday    ? 'calendar-day-today'    : '',
      isSelected ? 'calendar-day-selected' : '',
      hasEvent   ? 'calendar-day-has-event': '',
    ].filter(Boolean).join(' ');

    cells.push(`<div class="${classes}" data-date="${dateStr}" role="button" tabindex="0"
      aria-label="${d} ${MONTH_NAMES[currentMonth]} ${currentYear}${hasEvent ? ', ada event' : ''}">
      <span class="calendar-day-num">${d}</span>
      ${dots ? `<span class="cal-day-dots">${dots}</span>` : ''}
    </div>`);
  }

  gridEl.innerHTML = `${headerRow}${cells.join('')}`;

  // Click handlers — any day is clickable, not just event days
  gridEl.querySelectorAll('.calendar-day:not(.calendar-day-empty)').forEach(el => {
    el.addEventListener('click', () => {
      const date = el.dataset.date;
      if (!date) return;
      selectedDate = date;
      renderGrid();
      renderEventList();
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        el.click();
      }
    });
  });
}

// ─── List View ────────────────────────────────────────────────
function renderListView() {
  const listEl = document.getElementById('cal-list-view');
  if (!listEl) return;

  const filtered = Array.isArray(calendarData)
    ? calendarData.filter(ev => matchesFilter(ev))
    : [];

  if (!filtered.length) {
    listEl.innerHTML = `<div class="dashboard-widget-state">
      <strong class="dashboard-widget-state-title">Tidak ada event</strong>
      <span class="dashboard-widget-state-note">Tidak ada event untuk filter yang dipilih bulan ini.</span>
    </div>`;
    return;
  }

  // Group by date
  const byDate = {};
  filtered.forEach(ev => {
    const ds = ev.date || ev.event_date;
    if (!ds) return;
    if (!byDate[ds]) byDate[ds] = [];
    byDate[ds].push(ev);
  });

  const sortedDates = Object.keys(byDate).sort();

  listEl.innerHTML = sortedDates.map(ds => {
    const parts = ds.split('-');
    const d     = parseInt(parts[2], 10);
    const mIdx  = parseInt(parts[1], 10) - 1;
    const displayDate = `${DAY_NAMES[new Date(ds).getDay() === 0 ? 6 : new Date(ds).getDay() - 1] || ''}, ${d} ${MONTH_NAMES[mIdx]}`;

    const evCards = byDate[ds].map(ev => renderEventCard(ev)).join('');
    return `<div class="cal-list-group">
      <div class="cal-list-date-header">${displayDate}</div>
      <div class="cal-list-events">${evCards}</div>
    </div>`;
  }).join('');
}

// ─── Event Card (shared by grid panel + list view) ────────────
function renderEventCard(ev) {
  const t   = (ev.type || 'general').toLowerCase();
  const cfg = getTypeConfig(t);
  return `<div class="calendar-event-card" style="border-left:3px solid ${cfg.dot}">
    <div class="calendar-event-card-main">
      ${ev.ticker ? `<span class="calendar-event-ticker mono">${ev.ticker}</span>` : ''}
      <span class="calendar-event-title">${ev.title || ev.description || 'Event'}</span>
    </div>
    <div class="calendar-event-card-meta">
      <span class="calendar-event-type-badge" style="background:${cfg.bg};color:${cfg.color}">
        ${cfg.icon} ${cfg.label}
      </span>
      ${ev.details ? `<span class="text-xs text-dim">${ev.details}</span>` : ''}
    </div>
    ${ev.link ? `<a href="${ev.link}" target="_blank" rel="noopener" class="calendar-event-link text-xs text-primary">Detail →</a>` : ''}
  </div>`;
}

// ─── Event List (grid mode panel) ────────────────────────────
function renderEventList() {
  const listEl  = document.getElementById('cal-event-list');
  const titleEl = document.getElementById('cal-event-title');
  if (!listEl) return;

  if (!selectedDate) {
    if (titleEl) titleEl.textContent = 'Pilih tanggal untuk melihat event';
    listEl.innerHTML = `<div class="dashboard-widget-state">
      <strong class="dashboard-widget-state-title">Belum ada event</strong>
      <span class="dashboard-widget-state-note">Klik tanggal yang memiliki event.</span>
    </div>`;
    return;
  }

  const parts       = selectedDate.split('-');
  const d           = parseInt(parts[2], 10);
  const mIdx        = parseInt(parts[1], 10) - 1;
  const displayDate = `${d} ${MONTH_NAMES[mIdx]} ${parts[0]}`;

  const events = Array.isArray(calendarData)
    ? calendarData.filter(ev => {
        const match = (ev.date || ev.event_date) === selectedDate;
        return match && matchesFilter(ev);
      })
    : [];

  if (titleEl) titleEl.textContent = `Event — ${displayDate}`;

  if (!events.length) {
    listEl.innerHTML = `<div class="dashboard-widget-state">
      <strong class="dashboard-widget-state-title">Tidak ada event</strong>
      <span class="dashboard-widget-state-note">Tidak ada aksi korporasi pada tanggal ini.</span>
    </div>`;
    return;
  }

  listEl.innerHTML = events.map(ev => renderEventCard(ev)).join('');
}

// ─── Dashboard Widget — Today's Events ───────────────────────
export async function loadTodayEvents() {
  const container = document.getElementById('dash-calendar-widget');
  if (!container) return;

  try {
    const res    = await apiFetch('/calendar/today', { timeout: 8000 });
    const events = Array.isArray(res?.data) ? res.data : [];

    if (!events.length) {
      container.style.display = 'none';
      return;
    }

    container.style.display = '';
    const maxShow = Math.min(events.length, 3);
    const items   = events.slice(0, maxShow);

    container.innerHTML = `
      <div class="dash-calendar-widget-inner">
        <div class="flex justify-between items-center mb-2">
          <h3 class="panel-title" style="margin:0">📅 Event Hari Ini</h3>
          <a href="#calendar" class="text-xs text-primary strong">Lihat Kalender →</a>
        </div>
        <div class="dash-calendar-event-list">
          ${items.map(ev => {
            const cfg = getTypeConfig((ev.type || '').toLowerCase());
            return `<div class="dash-calendar-event-item" style="border-left:3px solid ${cfg.dot}">
              ${ev.ticker ? `<span class="calendar-event-ticker mono">${ev.ticker}</span>` : ''}
              <span class="calendar-event-title text-sm">${ev.title || ev.description || 'Event'}</span>
              <span class="calendar-event-type-badge calendar-event-type-badge-sm" style="background:${cfg.bg};color:${cfg.color}">
                ${cfg.icon} ${cfg.label}
              </span>
            </div>`;
          }).join('')}
        </div>
        ${events.length > maxShow ? `<div class="text-xs text-dim mt-1">+${events.length - maxShow} event lainnya</div>` : ''}
      </div>`;
  } catch (e) {
    console.warn('loadTodayEvents failed', e);
    container.style.display = 'none';
  }
}
