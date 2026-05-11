// View timer utilities — extracted to break circular import between main.js ⇄ router.js
let viewTimers = [];

export function registerViewTimer(id) { viewTimers.push(id); }

export function clearViewTimers() {
  viewTimers.forEach(id => {
    const s = String(id);
    if (s.startsWith('i_')) clearInterval(parseInt(s.slice(2)));
    else clearTimeout(parseInt(s));
  });
  viewTimers.length = 0;
}

// Backward compatibility — sync window.__viewTimers with internal array
Object.defineProperty(window, '__viewTimers', {
  get() { return viewTimers; },
  set(v) { viewTimers = v; },
  configurable: true,
});
