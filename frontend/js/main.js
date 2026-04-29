import { initTheme } from './theme.js';
import { handleRoute } from './router.js';
import { fetchMarketSummary } from './api.js';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function revealElements() {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
}

function playLoadSequence() {
    // Immediate reveal as fallback
    const revealAll = () => {
        document.body.style.opacity = '1';
        revealElements();
    };

    if (typeof gsap === 'undefined' || prefersReducedMotion) {
        revealAll();
        return;
    }

    try {
        const tl = gsap.timeline({ 
            defaults: { ease: 'expo.out' },
            onComplete: revealElements 
        });
        
        tl.fromTo('body', { opacity: 0 }, { opacity: 1, duration: 0.4 })
          .fromTo('.topbar', { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, '-=0.2')
          .fromTo('.sidebar', { x: -20, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5 }, '-=0.3')
          .fromTo('.main-content', { opacity: 0, scale: 0.99 }, { opacity: 1, scale: 1, duration: 0.5 }, '-=0.3');
    } catch (e) {
        console.warn('GSAP Animation failed', e);
        revealAll();
    }
}

export function animateCards(selector = '.card') {
    if (typeof gsap === 'undefined' || prefersReducedMotion) return;
    const cards = document.querySelectorAll(selector);
    if (!cards.length) return;
    gsap.fromTo(cards, 
        { opacity: 0, y: 15 }, 
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power2.out', clearProps: 'all' }
    );
}

export function animateTableRows(tbody) {
    if (typeof gsap === 'undefined' || !tbody || prefersReducedMotion) return;
    gsap.fromTo(tbody.querySelectorAll('tr'), 
        { opacity: 0, x: -5 }, 
        { opacity: 1, x: 0, duration: 0.3, stagger: 0.02, ease: 'power1.out' }
    );
}

export function animateCountUp(element, endVal, prefix = '', suffix = '', duration = 1.5) {
    if (!element) return;
    if (typeof countUp === 'undefined') {
        element.textContent = `${prefix}${Number(endVal).toLocaleString('id-ID')}${suffix}`;
        return;
    }
    const Counter = countUp.CountUp;
    const counter = new Counter(element, endVal, { 
        prefix, suffix, duration, 
        separator: ',', decimal: '.', 
        enableScrollSpy: true, scrollSpyOnce: true,
        useEasing: true
    });
    if (!counter.error) counter.start();
}

export function animateSparklines() {
    if (typeof gsap === 'undefined' || prefersReducedMotion) return;
    document.querySelectorAll('.sparkline-path').forEach(path => {
        const length = path.getTotalLength();
        gsap.fromTo(path, 
            { strokeDasharray: length, strokeDashoffset: length }, 
            { strokeDashoffset: 0, duration: 1, ease: 'power2.inOut' }
        );
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
    setTimeout(() => ripple.remove(), 600);
});

document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('.search-box input');
        if (searchInput) searchInput.focus();
    }
});

function setupTopbarMoreMenu() {
    const wrap = document.querySelector('.topbar-more-wrap');
    const btn = document.getElementById('topbar-more-btn');
    const menu = document.getElementById('topbar-more-menu');
    if (!wrap || !btn || !menu) return;
    
    const setOpen = (open) => {
        wrap.classList.toggle('open', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        setOpen(!wrap.classList.contains('open'));
    });
    
    document.addEventListener('click', (e) => {
        if (!wrap.contains(e.target)) setOpen(false);
    });
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
        document.body.classList.toggle('drawer-open', open);
    };
    openers.forEach(btn => btn.addEventListener('click', () => setState(true)));
    closers.forEach(btn => btn.addEventListener('click', () => setState(false)));
}

async function refreshTopbarMarket() {
    try {
        const data = await fetchMarketSummary();
        const val = document.querySelector('.idx-mini-display .idx-val');
        const change = document.querySelector('.idx-mini-display .idx-change');
        const indicator = document.querySelector('.status-indicator');
        
        if (data) {
            if (val) val.textContent = Number(data.value).toLocaleString('id-ID');
            if (change) {
                const isPos = data.change_pct >= 0;
                change.textContent = `${isPos ? '+' : ''}${data.change_pct.toFixed(2)}%`;
                change.className = `idx-change ${isPos ? 'positive' : 'negative'}`;
            }
            if (indicator) indicator.classList.toggle('open', data.status === 'ok');
        }
    } catch (e) {
        console.warn('Failed to refresh market status');
    }
}

initTheme();
lucide.createIcons();
setupMobileDrawer();
setupTopbarMoreMenu();
refreshTopbarMarket();
setInterval(refreshTopbarMarket, 60000);
playLoadSequence();
