// ─── Calendar View — Month Grid + Event List ────────────
// 11.3.2 Calendar frontend with month grid, event badges, and daily event list
// API: GET /api/calendar?month=2026-05, GET /api/calendar/today

import { apiFetch, showToast } from '../api.js?v=20260509A';
import { nf, fmt } from '../utils/format.js?v=20260509B';

const DAY_NAMES = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const DAY_SHORT = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const TYPE_BADGES = {
  dividend: { icon: '🔵', label: 'Dividend' },
  earnings: { icon: '🟢', label: 'Earnings' },
  corporate: { icon: '🟠', label: 'Corporate' },
};
const TYPE_DEFAULT = { icon: '📌', label: 'Event' };

let currentMonth = null;
let currentYear = null;
let calendarData = null;
let selectedDate = null;

// ─── Render Entry Point ─────────────────────────────────
export async function renderCalendar(root) {
  const now = new Date();
  currentMonth = now.getMonth();
  currentYear = now.getFullYear();

  root.innerHTML = `
    <section class="calendar-page staggger-reveal" aria-label="Kalender Pasar">
      <div class="page-header">
        <div>
          <h1>Kalender Pasar</h1>
          <p class="page-subtitle">Dividen, laba, dan aksi korporasi saham IDX</p>
        </div>
      </div>
      <div class="calendar-wrapper panel">
        <div class="calendar-header" id="calendar-header">
          <button class="btn btn-sm" id="cal-prev" aria-label="Bulan sebelumnya">&larr;</button>
          <h2 class="calendar-month-title" id="cal-title">${MONTH_NAMES[currentMonth]} ${currentYear}</h2>
          <button class="btn btn-sm" id="cal-next" aria-label="Bulan berikutnya">&rarr;</button>
          <button class="btn btn-sm btn-primary" id="cal-today" aria-label="Kembali ke hari ini">Hari Ini</button>
        </div>
        <div class="calendar-grid" id="cal-grid" aria-live="polite">
          ${renderSkeleton()}
        </div>
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

  // Wire navigation
  document.getElementById('cal-prev').addEventListener('click', () => navigateMonth(-1));
  document.getElementById('cal-next').addEventListener('click', () => navigateMonth(1));
  document.getElementById('cal-today').addEventListener('click', () => {
    const now = new Date();
    currentMonth = now.getMonth();
    currentYear = now.getFullYear();
    selectedDate = null;
    loadAndRender();
  });

  await loadAndRender();
}

// ─── Navigation ─────────────────────────────────────────
function navigateMonth(delta) {
  currentMonth += delta;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  selectedDate = null;
  loadAndRender();
}

async function loadAndRender() {
  const titleEl = document.getElementById('cal-title');
  if (titleEl) titleEl.textContent = `${MONTH_NAMES[currentMonth]} ${currentYear}`;

  // Show skeleton while loading
  const gridEl = document.getElementById('cal-grid');
  if (gridEl) gridEl.innerHTML = renderSkeleton();

  const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  try {
    const res = await apiFetch(`/calendar?month=${monthStr}`, { timeout: 10000 });
    calendarData = res?.data || [];
  } catch (e) {
    console.warn('Calendar fetch failed', e);
    calendarData = [];
  }

  renderGrid();
  renderEventList();
}

// ─── Grid Rendering ─────────────────────────────────────
function renderSkeleton() {
  const days = DAY_SHORT.map(d => `<div class="calendar-day-header">${d}</div>`).join('');
  const cells = Array.from({ length: 35 }, () =>
    `<div class="calendar-day"><div class="skeleton" style="height:24px;width:24px;border-radius:50%"></div></div>`
  ).join('');
  return `${days}${cells}`;
}

function renderGrid() {
  const gridEl = document.getElementById('cal-grid');
  if (!gridEl) return;

  // Build events map: dateStr -> events[]
  const eventsByDate = {};
  if (Array.isArray(calendarData)) {
    calendarData.forEach(ev => {
      const ds = ev.date || ev.event_date;
      if (!ds) return;
      if (!eventsByDate[ds]) eventsByDate[ds] = [];
      eventsByDate[ds].push(ev);
    });
  }

  const firstDay = new Date(currentYear, currentMonth, 1);
  // 0=Sun..6=Sat, we want Monday=0. Adjust: getDay() returns 0(Sun)..6(Sat)
  // Shift so Mon=0: (getDay() + 6) % 7
  let startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Build cells
  const headerRow = DAY_SHORT.map(d => `<div class="calendar-day-header">${d}</div>`).join('');
  const cells = [];

  // Empty cells before first day
  for (let i = 0; i < startOffset; i++) {
    cells.push(`<div class="calendar-day calendar-day-empty"></div>`);
  }

  // Actual days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;
    const isSelected = dateStr === selectedDate;
    const dayEvents = eventsByDate[dateStr] || [];
    const hasEvent = dayEvents.length > 0;
    const typeSet = new Set();
    dayEvents.forEach(ev => {
      if (ev.type) typeSet.add(ev.type);
    });
    const badges = Array.from(typeSet).map(t => TYPE_BADGES[t] || TYPE_DEFAULT).map(b => b.icon).join('');

    const classes = [
      'calendar-day',
      isToday ? 'calendar-day-today' : '',
      isSelected ? 'calendar-day-selected' : '',
      hasEvent ? 'calendar-day-has-event' : '',
    ].filter(Boolean).join(' ');

    cells.push(`<div class="${classes}" data-date="${dateStr}" role="button" tabindex="0" aria-label="${d} ${MONTH_NAMES[currentMonth]} ${currentYear}${hasEvent ? ', ada event' : ''}">
      <span class="calendar-day-num">${d}</span>
      ${badges ? `<span class="calendar-day-badges">${badges}</span>` : ''}
    </div>`);
  }

  gridEl.innerHTML = `${headerRow}${cells.join('')}`;

  // Click handlers
  gridEl.querySelectorAll('.calendar-day-has-event, .calendar-day-today').forEach(el => {
    el.addEventListener('click', () => {
      const date = el.dataset.date;
      if (!date) return;
      selectedDate = date;
      renderGrid(); // re-render to update selected state
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

// ─── Event List ─────────────────────────────────────────
function renderEventList() {
  const listEl = document.getElementById('cal-event-list');
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

  // Format date for display
  const parts = selectedDate.split('-');
  const d = parseInt(parts[2], 10);
  const mIdx = parseInt(parts[1], 10) - 1;
  const displayDate = `${d} ${MONTH_NAMES[mIdx]} ${parts[0]}`;

  const events = Array.isArray(calendarData)
    ? calendarData.filter(ev => (ev.date || ev.event_date) === selectedDate)
    : [];

  if (titleEl) titleEl.textContent = `Event — ${displayDate}`;

  if (!events.length) {
    listEl.innerHTML = `<div class="dashboard-widget-state">
      <strong class="dashboard-widget-state-title">Tidak ada event</strong>
      <span class="dashboard-widget-state-note">Tidak ada aksi korporasi pada tanggal ini.</span>
    </div>`;
    return;
  }

  listEl.innerHTML = events.map(ev => {
    const t = ev.type || 'general';
    const badge = TYPE_BADGES[t] || TYPE_DEFAULT;
    return `<div class="calendar-event-card">
      <div class="calendar-event-card-main">
        ${ev.ticker ? `<span class="calendar-event-ticker mono">${ev.ticker}</span>` : ''}
        <span class="calendar-event-title">${ev.title || ev.description || 'Event'}</span>
      </div>
      <div class="calendar-event-card-meta">
        <span class="calendar-event-type-badge" style="--badge-bg:${badge.icon === '🔵' ? 'rgba(59,130,246,0.15)' : badge.icon === '🟢' ? 'rgba(16,185,129,0.15)' : 'rgba(249,115,22,0.15)'};--badge-color:${badge.icon === '🔵' ? '#60a5fa' : badge.icon === '🟢' ? '#34d399' : '#fb923c'}">
          ${badge.icon} ${badge.label}
        </span>
        ${ev.details ? `<span class="text-xs text-dim">${ev.details}</span>` : ''}
      </div>
      ${ev.link ? `<a href="${ev.link}" target="_blank" rel="noopener" class="calendar-event-link text-xs text-primary">Detail →</a>` : ''}
    </div>`;
  }).join('');
}

// ─── Dashboard Widget — Today's Events ──────────────────
export async function loadTodayEvents() {
  const container = document.getElementById('dash-calendar-widget');
  if (!container) return;

  try {
    const res = await apiFetch('/calendar/today', { timeout: 8000 });
    const events = Array.isArray(res?.data) ? res.data : [];

    if (!events.length) {
      container.style.display = 'none';
      return;
    }

    container.style.display = '';
    const maxShow = Math.min(events.length, 3);
    const items = events.slice(0, maxShow);

    container.innerHTML = `
      <div class="dash-calendar-widget-inner">
        <div class="flex justify-between items-center mb-2">
          <h3 class="panel-title" style="margin:0">📅 Event Hari Ini</h3>
          <a href="#calendar" class="text-xs text-primary strong">Lihat Kalender →</a>
        </div>
        <div class="dash-calendar-event-list">
          ${items.map(ev => {
            const t = ev.type || 'general';
            const badge = TYPE_BADGES[t] || TYPE_DEFAULT;
            return `<div class="dash-calendar-event-item">
              ${ev.ticker ? `<span class="calendar-event-ticker mono">${ev.ticker}</span>` : ''}
              <span class="calendar-event-title text-sm">${ev.title || ev.description || 'Event'}</span>
              <span class="calendar-event-type-badge calendar-event-type-badge-sm" style="--badge-bg:${badge.icon === '🔵' ? 'rgba(59,130,246,0.15)' : badge.icon === '🟢' ? 'rgba(16,185,129,0.15)' : 'rgba(249,115,22,0.15)'};--badge-color:${badge.icon === '🔵' ? '#60a5fa' : badge.icon === '🟢' ? '#34d399' : '#fb923c'}">
                ${badge.icon} ${badge.label}
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
