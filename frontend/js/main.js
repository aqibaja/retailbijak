import { initTheme } from './theme.js';
import { handleRoute } from './router.js';

// ─── Initialize ────────────────────────────────────────
lucide.createIcons();
initTheme();

// ─── GSAP Page Load Sequence ───────────────────────────
function playLoadSequence() {
    if (typeof gsap === 'undefined') return;
    
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    
    // Body fade in
    tl.fromTo('body', { opacity: 0 }, { opacity: 1, duration: 0.3 });
    
    // Topbar slide down
    tl.fromTo('.topbar', 
        { y: -20, opacity: 0 }, 
        { y: 0, opacity: 1, duration: 0.4 }, 
        '-=0.1'
    );
    
    // Sidebar slide in
    tl.fromTo('.sidebar', 
        { x: -20, opacity: 0 }, 
        { x: 0, opacity: 1, duration: 0.4 }, 
        '-=0.3'
    );
    
    // Main content fade
    tl.fromTo('.main-content', 
        { opacity: 0 }, 
        { opacity: 1, duration: 0.3 }, 
        '-=0.2'
    );
}

// ─── Stagger Animation for Cards ───────────────────────
export function animateCards(selector = '.card') {
    if (typeof gsap === 'undefined') return;
    
    const cards = document.querySelectorAll(selector);
    gsap.fromTo(cards, 
        { opacity: 0, scale: 0.96 },
        { 
            opacity: 1, 
            scale: 1, 
            duration: 0.4,
            stagger: 0.08,
            ease: 'power2.out'
        }
    );
}

// ─── Table Row Stagger ─────────────────────────────────
export function animateTableRows(tbody) {
    if (typeof gsap === 'undefined' || !tbody) return;
    
    const rows = tbody.querySelectorAll('tr');
    gsap.fromTo(rows,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, stagger: 0.03, ease: 'power1.out' }
    );
}

// ─── CountUp Animation ─────────────────────────────────
export function animateCountUp(element, endVal, prefix = '', suffix = '', duration = 1.2) {
    if (!element || typeof countUp === 'undefined') {
        if (element) element.textContent = prefix + endVal.toLocaleString() + suffix;
        return;
    }
    
    const CountUp = countUp.CountUp;
    const counter = new CountUp(element, endVal, {
        prefix,
        suffix,
        duration,
        separator: ',',
        decimal: '.',
        enableScrollSpy: true,
        scrollSpyOnce: true
    });
    
    if (!counter.error) {
        counter.start();
    } else {
        element.textContent = prefix + endVal.toLocaleString() + suffix;
    }
}

// ─── Sparkline SVG Draw Animation ──────────────────────
export function animateSparklines() {
    if (typeof gsap === 'undefined') return;
    
    document.querySelectorAll('.sparkline-path').forEach(path => {
        const length = path.getTotalLength();
        gsap.fromTo(path,
            { strokeDasharray: length, strokeDashoffset: length },
            { strokeDashoffset: 0, duration: 0.8, ease: 'power2.out', delay: 0.3 }
        );
    });
}

// ─── Button Ripple Effect ──────────────────────────────
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn');
    if (!btn) return;
    
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
});

// ─── Scroll Reveal (opacity only, NO translateY = CLS safe) ──
function initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ─── Reduced Motion Check ──────────────────────────────
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ─── Keyboard Shortcut (⌘K) ────────────────────────────
document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('.search-box input');
        if (searchInput) searchInput.focus();
    }
});

// ─── Route Handling ────────────────────────────────────
window.addEventListener('hashchange', () => {
    handleRoute(window.location.hash);
});

// Initial route
if (!window.location.hash) {
    window.location.hash = '#dashboard';
} else {
    handleRoute(window.location.hash);
}

// Play load sequence
if (!prefersReducedMotion) {
    playLoadSequence();
}
