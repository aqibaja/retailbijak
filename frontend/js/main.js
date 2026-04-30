import { handleRoute } from './router.js?v=20260430h';
import { fetchMarketSummary } from './api.js?v=20260430h';
import { initTheme } from './theme.js?v=20260430h';

// ================= ANIMATION ENGINE =================
export function observeElements(selector = '.stagger-reveal') {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('is-visible');
                }, i * 50); // Stagger delay 50ms
                observer.unobserve(entry.target);
            }
        });
    }, { rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll(selector).forEach(el => observer.observe(el));
}

// Number Counter Animation (RequestAnimationFrame)
export function animateValue(obj, start, end, duration, prefix = '', suffix = '') {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3); // Cubic ease out
        const current = start + (end - start) * easeOut;
        
        // Format based on value size
        let formatted;
        if (Math.abs(end) > 100) formatted = current.toLocaleString('id-ID', { maximumFractionDigits: 0 });
        else formatted = current.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        
        obj.innerHTML = `${prefix}${formatted}${suffix}`;
        
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.innerHTML = `${prefix}${end > 100 ? end.toLocaleString('id-ID', {maximumFractionDigits:0}) : end.toLocaleString('id-ID', {minimumFractionDigits:2, maximumFractionDigits:2})}${suffix}`;
        }
    };
    window.requestAnimationFrame(step);
}

// Flash Highlight (for price updates)
export function flashUpdate(element, isUp) {
    if (!element) return;
    element.classList.remove('flash-up', 'flash-down');
    void element.offsetWidth; // Trigger reflow
    element.classList.add(isUp ? 'flash-up' : 'flash-down');
}

// ================= UI CORE =================
function setupSearchOverlay() {
    const overlay = document.getElementById('search-overlay');
    const trigger = document.getElementById('cmd-k-trigger');
    const input = document.getElementById('global-search-input');
    
    if (!overlay || !trigger || !input) return;

    const toggle = (show) => {
        if (show) {
            overlay.classList.add('active');
            setTimeout(() => input.focus(), 100);
        } else {
            overlay.classList.remove('active');
            input.blur();
        }
    };

    trigger.addEventListener('click', () => toggle(true));
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) toggle(false);
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && input.value.trim()) {
            window.location.hash = '#stock/' + input.value.trim().toUpperCase();
            input.value = '';
            toggle(false);
        }
    });

    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            toggle(!overlay.classList.contains('active'));
        }
        if (e.key === 'Escape' && overlay.classList.contains('active')) {
            toggle(false);
        }
    });

    // Close on link click inside search
    overlay.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => toggle(false));
    });
}

function setupScrollEffects() {
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;
    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) topbar.classList.add('scrolled');
        else topbar.classList.remove('scrolled');
    }, { passive: true });
}

// Global button click effect
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn');
    if (btn) {
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => btn.style.transform = '', 150);
    }
});

// Topbar Data Fetch
async function refreshTopbarMarket() {
    try {
        const data = await fetchMarketSummary();
        const valEl = document.getElementById('topbar-ihsg-val');
        const pctEl = document.getElementById('topbar-ihsg-pct');
        const dotEl = document.querySelector('.status-dot');
        const txtEl = document.getElementById('market-status-text');
        
        if (data && valEl && pctEl) {
            const prevVal = parseFloat(valEl.textContent.replace(/,/g, ''));
            const newVal = parseFloat(data.value);
            
            if (prevVal !== newVal && !isNaN(prevVal) && !isNaN(newVal)) {
                animateValue(valEl, prevVal, newVal, 800);
                flashUpdate(valEl, newVal > prevVal);
            } else {
                valEl.textContent = Number(data.value || 7080.63).toLocaleString('id-ID', { maximumFractionDigits: 2 });
            }
            
            const isPos = data.change_pct >= 0;
            pctEl.textContent = `${isPos ? '+' : ''}${data.change_pct.toFixed(2)}%`;
            pctEl.className = `mono text-xs ${isPos ? 'text-up' : 'text-down'}`;
            
            if (dotEl && txtEl) {
                const isOpen = data.status === 'ok';
                dotEl.classList.toggle('live', isOpen);
                txtEl.textContent = isOpen ? 'IDX OPEN' : 'IDX CLOSED';
            }
        }
    } catch (e) {
        console.warn('Failed to refresh topbar', e);
    }
}

// Running Ticker Setup
function setupRunningTicker() {
    const tickerContainer = document.getElementById('running-ticker');
    if (!tickerContainer) return;

    // Realistic dummy data for the ticker to show off the UI
    const mockData = [
        { t: "GOTO", p: "96", c: "+9.89", up: true },
        { t: "BRPT", p: "1,200", c: "+5.20", up: true },
        { t: "BBCA", p: "9,800", c: "+3.15", up: true },
        { t: "BREN", p: "11,200", c: "+1.50", up: true },
        { t: "AMMN", p: "8,950", c: "-2.00", up: false },
        { t: "TLKM", p: "3,420", c: "-1.50", up: false },
        { t: "BMRI", p: "7,000", c: "+0.50", up: true },
        { t: "ASII", p: "5,200", c: "+1.20", up: true },
        { t: "UNVR", p: "2,800", c: "-0.80", up: false },
        { t: "BUMI", p: "150", c: "+4.10", up: true }
    ];

    // Double the array to allow for infinite smooth scrolling
    const tickerItems = [...mockData, ...mockData];

    tickerContainer.innerHTML = tickerItems.map(item => `
        <a href="#stock/${item.t}" class="tape-card" style="text-decoration:none;">
            <div class="flex-col">
                <div class="tape-pair">${item.t}</div>
                <div class="tape-price">${item.p}</div>
            </div>
            <div class="flex-col items-end">
                <div class="tape-chg ${item.up ? 'up' : 'down'}">${item.c}%</div>
            </div>
        </a>
    `).join('');
}

// INIT
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    lucide.createIcons();
    setupSearchOverlay();
    setupScrollEffects();
    setupRunningTicker();
    refreshTopbarMarket();
    setInterval(refreshTopbarMarket, 60000);
});

// Routing
window.addEventListener('hashchange', () => handleRoute(window.location.hash));
handleRoute(window.location.hash || '#dashboard');
