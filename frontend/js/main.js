import { initTheme } from './theme.js';
import { handleRoute } from './router.js';
import { fetchMarketSummary } from './api.js';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function revealElements() {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
}

function playLoadSequence() {
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
            defaults: { ease: 'power2.out' },
            onComplete: revealElements 
        });
        
        tl.fromTo('body', { opacity: 0 }, { opacity: 1, duration: 0.3 })
          .fromTo('.topbar', { y: -10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 }, '-=0.1')
          .fromTo('.sidebar', { x: -10, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4 }, '-=0.3')
          .fromTo('.main-content', { opacity: 0, y: 5 }, { opacity: 1, y: 0, duration: 0.4 }, '-=0.3');
    } catch (e) {
        revealAll();
    }
}

export function animateCards(selector = '.card') {
    if (typeof gsap === 'undefined' || prefersReducedMotion) return;
    const cards = document.querySelectorAll(selector);
    if (!cards.length) return;
    gsap.fromTo(cards, 
        { opacity: 0, y: 10 }, 
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: 'power1.out', clearProps: 'all' }
    );
}

export function animateTableRows(tbody) {
    if (typeof gsap === 'undefined' || !tbody || prefersReducedMotion) return;
    gsap.fromTo(tbody.querySelectorAll('tr'), 
        { opacity: 0 }, 
        { opacity: 1, duration: 0.3, stagger: 0.01, ease: 'none' }
    );
}

async function refreshTopbarMarket() {
    try {
        const data = await fetchMarketSummary();
        const val = document.querySelector('.topbar .mono');
        const status = document.querySelector('.status-indicator');
        
        if (data && val) {
            val.textContent = Number(data.value).toLocaleString('id-ID');
            if (status) status.classList.toggle('open', data.status === 'ok');
        }
    } catch (e) {}
}

// Global UI handling
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn');
    if (!btn) return;
    // Simple active state feedback
    btn.style.transform = 'scale(0.98)';
    setTimeout(() => btn.style.transform = '', 100);
});

initTheme();
lucide.createIcons();
refreshTopbarMarket();
setInterval(refreshTopbarMarket, 60000);
playLoadSequence();

window.addEventListener('hashchange', () => handleRoute(window.location.hash));
if (!window.location.hash) window.location.hash = '#dashboard';
else handleRoute(window.location.hash);
