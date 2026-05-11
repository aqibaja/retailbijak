// View timer utilities — extracted to break circular import between main.js ⇄ router.js
let viewTimers = [];

export function registerViewTimer(id) { viewTimers.push(id); }

export function clearViewTimers() {
  viewTimers.forEach(id => {
    if (id.startsWith('i_')) clearInterval(parseInt(id.slice(2)));
    else clearTimeout(parseInt(id));
  });
  viewTimers.length = 0;
}

// Backward compatibility — sync window.__viewTimers with internal array
Object.defineProperty(window, '__viewTimers', {
  get() { return viewTimers; },
  set(v) { viewTimers = v; },
  configurable: true,
});
