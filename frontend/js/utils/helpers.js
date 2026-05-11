// ─── UI Helper Utilities ─────────────────────────
// Extracted from main.js to break circular imports between main.js ⇄ views

export function observeElements(selector = '.stagger-reveal') {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add('is-visible');
        }, i * 50);
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -50px 0px' });
  document.querySelectorAll(selector).forEach(el => observer.observe(el));
}

export function animateValue(obj, start, end, duration, prefix = '', suffix = '') {
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const current = start + (end - start) * easeOut;
    let formatted;
    if (Math.abs(end) > 100) formatted = current.toLocaleString('id-ID', { maximumFractionDigits: 0 });
    else formatted = current.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    obj.innerHTML = `${prefix}${formatted}${suffix}`;
    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      obj.innerHTML = `${prefix}${end > 100 ? end.toLocaleString('id-ID', { maximumFractionDigits: 0 }) : end.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}`;
    }
  };
  window.requestAnimationFrame(step);
}

export function flashUpdate(element, isUp) {
  if (!element) return;
  element.classList.remove('flash-up', 'flash-down');
  void element.offsetWidth;
  element.classList.add(isUp ? 'flash-up' : 'flash-down');
}
