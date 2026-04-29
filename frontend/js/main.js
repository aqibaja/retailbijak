import { initTheme } from './theme.js';
import { handleRoute } from './router.js';
import { fetchMarketSummary } from './api.js';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function revealElements() {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
}

function playLoadSequence() {
    revealElements();
    if (typeof gsap === 'undefined' || prefersReducedMotion) return;
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo('body', { opacity: 0 }, { opacity: 1, duration: 0.25 })
      .fromTo('.topbar', { y: -16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35 }, '-=0.08')
      .fromTo('.sidebar', { x: -18, opacity: 0 }, { x: 0, opacity: 1, duration: 0.35 }, '-=0.25')
      .fromTo('.main-content', { opacity: 0 }, { opacity: 1, duration: 0.25 }, '-=0.18');
}

export function animateCards(selector = '.card') {
    if (typeof gsap === 'undefined' || prefersReducedMotion) return;
    const cards = document.querySelectorAll(selector);
    if (!cards.length) return;
    gsap.fromTo(cards, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.35, stagger: 0.06, ease: 'power2.out' });
}

export function animateTableRows(tbody) {
    if (typeof gsap === 'undefined' || !tbody || prefersReducedMotion) return;
    gsap.fromTo(tbody.querySelectorAll('tr'), { opacity: 0 }, { opacity: 1, duration: 0.25, stagger: 0.02 });
}

export function animateCountUp(element, endVal, prefix = '', suffix = '', duration = 1.1) {
    if (!element || typeof countUp === 'undefined') {
        if (element) element.textContent = `${prefix}${Number(endVal).toLocaleString('id-ID')}${suffix}`;
        return;
    }
    const Counter = countUp.CountUp;
    const counter = new Counter(element, endVal, { prefix, suffix, duration, separator: ',', decimal: '.', enableScrollSpy: true, scrollSpyOnce: true });
    if (!counter.error) counter.start();
}

export function animateSparklines() {
    if (typeof gsap === 'undefined' || prefersReducedMotion) return;
    document.querySelectorAll('.sparkline-path').forEach(path => {
        const length = path.getTotalLength();
        gsap.fromTo(path, { strokeDasharray: length, strokeDashoffset: length }, { strokeDashoffset: 0, duration: 0.75, ease: 'power2.out' });
    });
}

document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn');
    if (!btn) return;
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 550);
});

document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('.search-box input');
        if (searchInput) searchInput.focus();
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        clearAppCacheAndReload();
    }
});

function clearAppCacheAndReload() {
    try {
        const keys = [];
        for (let i = 0; i < localStorage.length; i += 1) keys.push(localStorage.key(i));
        for (const key of keys) {
            if (key && (key.startsWith('retailbijak') || key.startsWith('swingaq') || key.includes('theme'))) {
                localStorage.removeItem(key);
            }
        }
        sessionStorage.clear();
        if ('caches' in window) {
            caches.keys().then(names => names.forEach(name => caches.delete(name)));
        }
    } catch (error) {
        console.warn('Failed clearing cache', error);
    }
    window.location.reload(true);
}

function setupTopbarMoreMenu() {
    const wrap = document.querySelector('.topbar-more-wrap');
    const btn = document.getElementById('topbar-more-btn');
    const menu = document.getElementById('topbar-more-menu');
    if (!wrap || !btn || !menu) return;
    const setOpen = (open) => {
        wrap.classList.toggle('open', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    };
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        setOpen(!wrap.classList.contains('open'));
    });
    menu.addEventListener('click', (e) => {
        const action = e.target.closest('[data-action]')?.dataset.action;
        if (!action) return;
        if (action === 'clear-cache') clearAppCacheAndReload();
        else if (action === 'go-dashboard') window.location.hash = '#dashboard';
        else if (action === 'go-market') window.location.hash = '#market';
        else if (action === 'go-screener') window.location.hash = '#screener';
        else if (action === 'go-portfolio') window.location.hash = '#portfolio';
        else if (action === 'go-watchlist') window.location.hash = '#watchlist';
        else if (action === 'go-news') window.location.hash = '#news';
        else if (action === 'go-settings') window.location.hash = '#settings';
        else if (action === 'go-help') window.location.hash = '#help';
        setOpen(false);
    });
    document.addEventListener('click', (e) => {
        if (!wrap.contains(e.target)) setOpen(false);
    });
    window.addEventListener('hashchange', () => setOpen(false));
}

window.addEventListener('hashchange', () => handleRoute(window.location.hash));
if (!window.location.hash) window.location.hash = '#dashboard';
else handleRoute(window.location.hash);

function setupMobileDrawer() {
    const drawer = document.getElementById('mobile-drawer');
    if (!drawer) return;
    const openers = document.querySelectorAll('[data-open-drawer]');
    const closers = drawer.querySelectorAll('[data-close-drawer]');
    const setState = (open) => {
        drawer.classList.toggle('open', open);
        drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
        document.body.classList.toggle('drawer-open', open);
    };
    const openDrawer = () => setState(true);
    const closeDrawer = () => setState(false);
    openers.forEach(btn => btn.addEventListener('click', openDrawer));
    closers.forEach(btn => btn.addEventListener('click', closeDrawer));
    drawer.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', closeDrawer));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
    window.addEventListener('hashchange', closeDrawer);
}

async function refreshTopbarMarket() {
    const data = await fetchMarketSummary();
    const label = document.querySelector('.idx-mini-display .idx-label');
    const val = document.querySelector('.idx-mini-display .idx-val');
    const change = document.querySelector('.idx-mini-display .idx-change');
    const status = document.getElementById('market-status-pill');
    const readyLabel = 'MARKET READY';
    if (!data) {
        if (status) status.querySelector('.status-text').textContent = readyLabel;
        if (label) label.textContent = 'IHSG';
        if (val && val.textContent === '--') val.textContent = '7,080.63';
        if (change && change.textContent === '--') change.textContent = '+0.12%';
        return;
    }
    if (label) label.textContent = data.symbol || 'IHSG';
    if (val) val.textContent = data.value !== null ? Number(data.value).toLocaleString('id-ID') : '7,080.63';
    if (change) {
        if (data.change_pct !== null) {
            const isPos = data.change_pct >= 0;
            change.textContent = `${isPos ? '+' : ''}${data.change_pct.toFixed(2)}%`;
            change.classList.toggle('positive', isPos);
            change.classList.toggle('negative', !isPos);
        } else {
            change.textContent = '+0.12%';
        }
    }
    if (status) {
        status.querySelector('.status-text').textContent = data.status === 'ok' ? 'MARKET LIVE' : readyLabel;
    }
}

initTheme();
lucide.createIcons();
setupMobileDrawer();
setupTopbarMoreMenu();
refreshTopbarMarket();
setInterval(refreshTopbarMarket, 60000);
const refreshBtn = document.getElementById('refresh-app-btn');
if (refreshBtn) refreshBtn.addEventListener('click', clearAppCacheAndReload);
playLoadSequence();
