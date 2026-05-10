/**
 * Corporate Actions View — IPO, Rights, Dividends, Stock Split tracker
 * Fase 15.3 — Corporate Actions & IPO Tracker
 */
import { showToast, apiFetch } from '../api.js?v=20260510';

let activeTab = 'all';

const TABS = [
    { id: 'all', label: 'Semua', icon: '📋' },
    { id: 'listing', label: 'Listing/IPO', icon: '🚀' },
    { id: 'dividend', label: 'Dividen', icon: '💰' },
    { id: 'corporate', label: 'Korporasi', icon: '🏢' },
    { id: 'ipo', label: 'IPO Kalender', icon: '📅' },
    { id: 'rights', label: 'HMETD', icon: '📄' },
];

export function renderCorporateActions(root) {
    if (!root) return;
    root.innerHTML = `
        <div class="page-container">
            <div class="page-header">
                <h1 class="page-title"><i class="icon" data-lucide="building-2"></i> Aksi Korporasi</h1>
                <p class="page-subtitle">IPO, rights issue, stock split, dividen, dan aksi korporasi IDX</p>
            </div>
            <div class="corp-tabs" id="corp-tabs">
                ${TABS.map(t => `<button class="corp-tab ${t.id === 'all' ? 'active' : ''}" data-tab="${t.id}">${t.icon} ${t.label}</button>`).join('')}
            </div>
            <div id="corp-skeleton" class="skeleton-grid" style="margin-top:1rem">
                <div class="skeleton-card" style="height:100px"></div>
                <div class="skeleton-card" style="height:100px"></div>
                <div class="skeleton-card" style="height:100px"></div>
            </div>
            <div id="corp-content" style="display:none;margin-top:1rem">
                <div id="corp-list" class="corp-list"></div>
            </div>
            <div id="corp-error" class="empty-state-card" style="display:none">
                <div class="empty-icon"><i data-lucide="alert-circle"></i></div>
                <h3>Gagal memuat data</h3>
                <p>Data aksi korporasi tidak tersedia saat ini.</p>
                <button class="btn btn-primary" onclick="location.reload()">Refresh</button>
            </div>
        </div>
    `;

    // Tab click handlers
    root.querySelectorAll('.corp-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            root.querySelectorAll('.corp-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeTab = btn.dataset.tab;
            loadData();
        });
    });

    loadData();
}

async function loadData() {
    const skeleton = document.getElementById('corp-skeleton');
    const content = document.getElementById('corp-content');
    const error = document.getElementById('corp-error');
    const list = document.getElementById('corp-list');
    
    skeleton.style.display = 'grid';
    content.style.display = 'none';
    error.style.display = 'none';
    
    try {
        let allItems = [];
        
        // Fetch from IDX API if tab matches
        if (activeTab === 'all' || activeTab === 'listing' || activeTab === 'dividend') {
            const res = await apiFetch('/corporate-actions?limit=50');
            if (res && res.data) {
                allItems = allItems.concat(res.data.map(d => ({ ...d, source: 'idx' })));
            }
        }
        
        // Fetch from CalendarEvent if tab matches
        if (activeTab === 'all' || activeTab === 'ipo' || activeTab === 'rights' || activeTab === 'corporate') {
            const types = activeTab === 'all' ? 'ipo,rights,corporate' : activeTab;
            const calRes = await apiFetch(`/api/calendar?event_type=${types}`);
            if (calRes && calRes.events) {
                allItems = allItems.concat(calRes.events.map(e => ({
                    type: e.event_type,
                    title: e.title,
                    code: e.ticker,
                    date: e.event_date,
                    description: e.description,
                    source: 'calendar',
                })));
            }
        }
        
        // Filter by active tab
        let filtered = allItems;
        if (activeTab !== 'all') {
            filtered = allItems.filter(item => item.type === activeTab);
        }
        
        // Sort by date (newest first)
        filtered.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        
        skeleton.style.display = 'none';
        content.style.display = 'block';
        
        if (filtered.length === 0) {
            list.innerHTML = `<div class="empty-state-card"><div class="empty-icon">📭</div><h3>Tidak ada data</h3><p>Tidak ada aksi korporasi ${activeTab !== 'all' ? 'untuk kategori ini' : ''}.</p></div>`;
            return;
        }
        
        list.innerHTML = filtered.map(item => `
            <div class="corp-card ${item.type}">
                <div class="corp-card-left">
                    <span class="corp-type-icon">${getTypeIcon(item.type)}</span>
                    <div class="corp-card-info">
                        <strong class="corp-card-title">${item.title || '-'}</strong>
                        <div class="corp-card-meta">
                            ${item.code ? `<span class="badge badge-ticker">${item.code}</span>` : ''}
                            <span class="corp-type-badge type-${item.type}">${getTypeLabel(item.type)}</span>
                            <span class="corp-date">${formatDate(item.date)}</span>
                            ${item.source === 'idx' ? '<span class="badge badge-idx">Live</span>' : '<span class="badge badge-seed">Info</span>'}
                        </div>
                        ${item.description ? `<p class="corp-desc">${item.description}</p>` : ''}
                    </div>
                </div>
                ${item.code ? `<a href="#stock/${item.code}" class="btn btn-ghost btn-sm">Lihat</a>` : ''}
            </div>
        `).join('');
        
    } catch (e) {
        skeleton.style.display = 'none';
        error.style.display = 'flex';
    }
}

function getTypeIcon(type) {
    const icons = {
        'listing': '🚀', 'ipo': '🚀', 'dividend': '💰', 'corporate': '🏢',
        'rights': '📄', 'earnings': '📊', 'economic': '📈', 'buyback': '🔄',
    };
    return icons[type] || '📌';
}

function getTypeLabel(type) {
    const labels = {
        'listing': 'Listing', 'ipo': 'IPO', 'dividend': 'Dividen',
        'corporate': 'Korporasi', 'rights': 'HMETD', 'earnings': 'Laba',
        'economic': 'Ekonomi', 'buyback': 'Buyback',
    };
    return labels[type] || type;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}
