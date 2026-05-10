// ─── Gamification Engine (Fase 25.3.2) ─────
// Streak, XP, and Badge tracking — localStorage based.
// Can be upgraded to server-side when auth is added.

const STORAGE_KEY = 'retailbijak_gamification';

const BADGES = {
  first_scan: { id: 'first_scan', label: '🔍 First Scan', desc: 'Jalankan screener pertama kali' },
  watchlist_5: { id: 'watchlist_5', label: '📋 Diversifier', desc: 'Tambahkan 5 saham ke watchlist' },
  alert_creator: { id: 'alert_creator', label: '🔔 Alert Creator', desc: 'Buat alert harga pertama' },
  paper_trader: { id: 'paper_trader', label: '📈 Paper Trader', desc: 'Buka posisi paper trading pertama' },
  streak_7: { id: 'streak_7', label: '🔥 7-Day Streak', desc: 'Login 7 hari berturut-turut' },
  streak_30: { id: 'streak_30', label: '💎 30-Day Streak', desc: 'Login 30 hari berturut-turut' },
  night_owl: { id: 'night_owl', label: '🦉 Night Owl', desc: 'Login setelah tengah malam' },
  dividend_hunter: { id: 'dividend_hunter', label: '💰 Dividend Hunter', desc: 'Pantau 3+ saham dividen' },
};

const LEVELS = [
  { label: 'Bronze Trader', minXP: 0 },
  { label: 'Silver Trader', minXP: 100 },
  { label: 'Gold Trader', minXP: 300 },
  { label: 'Platinum Trader', minXP: 700 },
  { label: 'Diamond Trader', minXP: 1500 },
];

function getState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return { streak: 0, longestStreak: 0, lastLogin: null, xp: 0, badges: [], scans: 0, alerts: 0, trades: 0, watchlistCount: 0 };
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function trackLogin() {
  const state = getState();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  if (state.lastLogin === today) return state; // Already logged in today

  if (state.lastLogin === yesterday) {
    state.streak += 1;
    state.longestStreak = Math.max(state.longestStreak, state.streak);
  } else if (state.lastLogin !== today) {
    state.streak = 1; // Reset streak
  }
  state.lastLogin = today;
  state.xp += 10; // +10 XP for daily login

  // Check streak badges
  if (state.streak >= 7 && !state.badges.includes('streak_7')) state.badges.push('streak_7');
  if (state.streak >= 30 && !state.badges.includes('streak_30')) state.badges.push('streak_30');

  // Night owl badge
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 5 && !state.badges.includes('night_owl')) state.badges.push('night_owl');

  saveState(state);
  return state;
}

export function addXP(amount, reason) {
  const state = getState();
  state.xp += amount;
  saveState(state);
  return state;
}

export function trackAction(action) {
  const state = getState();
  const today = new Date().toISOString().slice(0, 10);

  switch (action) {
    case 'scan':
      state.scans = (state.scans || 0) + 1;
      state.xp += 5;
      if (state.scans >= 1 && !state.badges.includes('first_scan')) state.badges.push('first_scan');
      break;
    case 'watchlist_add':
      state.watchlistCount = (state.watchlistCount || 0) + 1;
      state.xp += 15;
      if (state.watchlistCount >= 5 && !state.badges.includes('watchlist_5')) state.badges.push('watchlist_5');
      break;
    case 'alert_create':
      state.alerts = (state.alerts || 0) + 1;
      state.xp += 20;
      if (state.alerts >= 1 && !state.badges.includes('alert_creator')) state.badges.push('alert_creator');
      break;
    case 'paper_trade':
      state.trades = (state.trades || 0) + 1;
      state.xp += 25;
      if (state.trades >= 1 && !state.badges.includes('paper_trader')) state.badges.push('paper_trader');
      break;
  }
  saveState(state);
  return state;
}

export function getLevel(xp) {
  let level = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.minXP) level = l;
  }
  return level;
}

export function getProgress() {
  const state = getState();
  const level = getLevel(state.xp);
  const currentIdx = LEVELS.indexOf(level);
  const nextLevel = LEVELS[currentIdx + 1];
  const xpInLevel = state.xp - level.minXP;
  const xpNeeded = nextLevel ? nextLevel.minXP - level.minXP : 1;
  const progress = nextLevel ? Math.min(xpInLevel / xpNeeded * 100, 100) : 100;
  return { ...state, level: level.label, progress, xpInLevel, xpNeeded, nextLevel: nextLevel?.label || 'MAX' };
}

export function renderGamificationCard(container) {
  const g = getProgress();
  const badgeList = Object.values(BADGES).map(b => {
    const unlocked = g.badges.includes(b.id);
    return `<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:8px;background:${unlocked ? 'rgba(16,185,129,.08)' : 'var(--bg-panel)'};border:1px solid var(--border-subtle);opacity:${unlocked ? 1 : .5};font-size:12px">
      <span style="font-size:16px">${unlocked ? '✅' : '🔒'}</span>
      <div><strong>${b.label}</strong><br><span class="text-xs text-dim">${b.desc}</span></div>
    </div>`;
  }).join('');

  container.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
      <div class="bt-kpi"><span class="bt-kpi-label">🔥 Streak</span><strong class="bt-kpi-value" style="font-size:24px">${g.streak} hari</strong></div>
      <div class="bt-kpi"><span class="bt-kpi-label">Level</span><strong class="bt-kpi-value" style="font-size:18px">${g.level}</strong></div>
      <div class="bt-kpi"><span class="bt-kpi-label">XP</span><strong class="bt-kpi-value" style="font-size:18px">${g.xp} XP</strong></div>
    </div>
    ${g.nextLevel !== 'MAX' ? `
    <div style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-dim);margin-bottom:4px">
        <span>${g.xpInLevel} / ${g.xpNeeded} XP menuju ${g.nextLevel}</span>
        <span>${g.progress.toFixed(0)}%</span>
      </div>
      <div style="height:6px;background:var(--border-subtle);border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${g.progress}%;background:linear-gradient(90deg,var(--primary-color),var(--accent-indigo));border-radius:3px;transition:width .5s ease"></div>
      </div>
    </div>` : ''}
    <h4 style="font-size:13px;margin:0 0 10px;color:var(--text-muted)">🏅 Badge (${g.badges.length}/${Object.keys(BADGES).length})</h4>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px">${badgeList}</div>`;
}
