import { fetchAiPicks, saveWatchlistItem, showToast } from '../api.js?v=20260504e';
import { observeElements } from '../main.js?v=20260504e';

const AI_PICKS_MODE_KEY = 'retailbijak.ai_picks.mode';
const AI_PICKS_CONTEXT_KEY = 'retailbijak.ai_picks.context';
const nf = (n, d = 0) => Number(n ?? 0).toLocaleString('id-ID', { maximumFractionDigits: d });
const pct = (n) => `${Number(n ?? 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })}%`;

// ─── In-memory mode cache ──────────────────────────────────
const modeCache = {};

function safeLocalStorageGet(key, fallback = null) {
  try { return localStorage.getItem(key) || fallback; }
  catch { return fallback; }
}
function safeLocalStorageSet(key, value) {
  try { localStorage.setItem(key, value); }
  catch { /* ignore */ }
}
function safeSessionStorageSet(key, value) {
  try { sessionStorage.setItem(key, value); }
  catch { /* ignore */ }
}

// ─── Helpers ───────────────────────────────────────────────
function buildAiPickContext(item, mode) {
  return JSON.stringify({
    ticker: item?.ticker || '',
    mode,
    source_route: '#ai-picks',
    source_label: 'AI Picks',
    score: item?.score ?? null,
    confidence: item?.confidence || null,
    fit_label: item?.fit_label || '',
    entry_zone: item?.entry_zone ?? null,
    target_zone: item?.take_profit ?? null,
    invalidation: item?.stop_loss ?? null,
    reason_labels: Array.isArray(item?.reason_labels) ? item.reason_labels.slice(0, 3) : [],
    risk_note: item?.risk_notes || item?.risk_note || '',
  });
}

function confidenceNarrative(value) {
  const score = Number(value ?? 0);
  if (score >= 75) return 'konfirmasi cukup kuat untuk akumulasi bertahap';
  if (score >= 55) return 'cukup layak dipantau, belum konfirmasi kuat';
  return 'masih butuh validasi tambahan';
}

function renderReasonChips(labels = []) {
  return labels.slice(0, 2).map(l => `<span class="ai-picks-reason-chip">${l}</span>`).join('');
}

function renderFactorMeter(label, value = 0) {
  const p = Math.max(0, Math.min(100, Math.round(Number(value || 0) * 100)));
  return `
    <div class="ai-picks-factor-meter">
      <div class="ai-picks-factor-meta"><span>${label}</span><strong>${p}</strong></div>
      <div class="ai-picks-factor-track"><span class="ai-picks-factor-fill" style="width:${p}%"></span></div>
    </div>`;
}

// ─── Collapsible AI Brief ──────────────────────────────────
function renderAiBrief(payload) {
  const bc = payload?.market_context || {};
  const tone = bc?.breadth_label || 'data belum cukup';
  const universe = payload?.summary?.eligible_count ?? 0;
  const bias = payload?.market_bias || 'data belum cukup';
  const freshness = payload?.freshness?.label || '';
  const genAt = payload?.generated_at ? String(payload.generated_at).replace('T', ' ').slice(0, 16) : '—';
  const asOf = payload?.as_of_label || '';

  return `
    <div class="ai-picks-compact-hero">
      <div class="ai-picks-hero-row">
        <h1 class="ai-picks-hero-title">AI Picks Hari Ini</h1>
        <div class="ai-picks-mode-switch" id="ai-picks-mode-switch">
          <button class="btn btn-sm" data-mode="swing">Swing</button>
          <button class="btn btn-sm" data-mode="defensive">Defensive</button>
          <button class="btn btn-sm" data-mode="catalyst">Catalyst</button>
        </div>
      </div>
      <div class="ai-picks-hero-meta">${asOf} · generated ${genAt} · ${freshness}</div>
    </div>

    <div class="ai-picks-summary-strip">
      <div class="panel ai-picks-summary-card"><span>Tone</span><strong id="ai-picks-tone">${tone}</strong></div>
      <div class="panel ai-picks-summary-card"><span>Universe</span><strong id="ai-picks-universe">${universe} kandidat</strong></div>
      <div class="panel ai-picks-summary-card"><span>Market Bias</span><strong id="ai-picks-bias">${bias}</strong></div>
    </div>

    <details class="ai-picks-brief-collapsible panel">
      <summary class="ai-picks-brief-summary">AI Desk Brief <span class="badge">live</span></summary>
      <div class="ai-picks-brief-body">
        <p class="text-sm text-muted">Briefing dan narasi tambahan akan tersedia saat scheduler harian selesai memproses semua kandidat.</p>
      </div>
    </details>`;
}

// ─── Compact Card ──────────────────────────────────────────
function renderCompactCard(item, mode) {
  const factors = item.factor_scores || {};
  const reasonLabels = Array.isArray(item.reason_labels) ? item.reason_labels : [];
  return `
    <article class="ai-picks-card panel">
      <div class="ai-picks-card-head">
        <div class="ai-picks-card-rank">
          <span class="ai-picks-rank-num">#${item.rank}</span>
          <div>
            <div class="ai-picks-card-ticker">${item.ticker}</div>
            <div class="ai-picks-card-name">${item.name || ''} · ${item.fit_label || ''}</div>
          </div>
        </div>
        <div class="ai-picks-card-score">
          <strong>${nf(item.score, 1)}</strong>
          <small>Keyakinan ${item.confidence}</small>
        </div>
      </div>

      <div class="ai-picks-card-meta">
        <span>Entry ${item.entry_zone || '-'}</span>
        <span>Stop ${nf(item.stop_loss)}</span>
        <span>TP ${nf(item.take_profit)}</span>
        <span>RR ${item.risk_reward || 'n/a'}</span>
        <span class="${Number(item.change_pct ?? 0) >= 0 ? 'is-up' : 'is-down'}">${pct(item.change_pct)}</span>
      </div>

      ${reasonLabels.length ? `<div class="ai-picks-card-chips">${renderReasonChips(reasonLabels)}</div>` : ''}

      <div class="ai-picks-card-thesis">${item.thesis || '-'}</div>

      <div class="ai-picks-card-actions">
        <button class="btn btn-sm" data-open-detail="${item.ticker}">Buka Detail</button>
        <button class="btn btn-sm btn-primary" data-save="${item.ticker}" data-mode="${mode}">Simpan</button>
        <button class="btn btn-sm ai-picks-factor-toggle" data-toggle-factors="${item.ticker}">▸ Faktor</button>
      </div>

      <div class="ai-picks-card-factors" id="factors-${item.ticker}" style="display:none">
        <div class="ai-picks-factor-list">
          ${renderFactorMeter('Teknikal', factors.technical)}
          ${renderFactorMeter('Likuiditas', factors.liquidity)}
          ${renderFactorMeter('Fundamental', factors.fundamental)}
          ${renderFactorMeter('Katalis', factors.catalyst)}
        </div>
        ${item.risk_notes ? `<div class="ai-picks-card-risk">Risk: ${item.risk_notes}</div>` : ''}
        ${Array.isArray(item.catalysts) && item.catalysts.length ? `<div class="ai-picks-card-risk">Katalis: ${item.catalysts.join(' · ')}</div>` : ''}
      </div>
    </article>`;
}

// ─── Loading / Empty / Error States ────────────────────────
function renderLoadingState(title, note) {
  return `<div class="panel ai-picks-state-card" data-state="loading"><div class="ai-picks-state-stack"><span class="ai-picks-state-pulse skeleton-shimmer"></span><strong>${title}</strong><span class="text-sm text-muted">${note}</span></div></div>`;
}
function renderEmptyState(title, note) {
  return `<div class="panel ai-picks-state-card" data-state="empty"><div class="ai-picks-state-stack"><strong>${title}</strong><span class="text-sm text-muted">${note}</span></div></div>`;
}
function renderErrorState(title, note) {
  return `<div class="panel ai-picks-state-card" data-state="error"><div class="ai-picks-state-stack"><strong>${title}</strong><span class="text-sm text-muted">${note}</span><button class="btn btn-sm ai-picks-retry-btn" data-retry="1">Coba Lagi</button></div></div>`;
}

// ─── Wire event handlers ───────────────────────────────────
function wireActions(root, mode, picks, loadFn) {
  // Save to watchlist
  root.querySelectorAll('[data-save]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ticker = btn.getAttribute('data-save');
      if (!ticker) return;
      btn.disabled = true;
      const res = await saveWatchlistItem({ ticker, notes: `Dari AI Picks (${mode})` });
      btn.disabled = false;
      if (res) showToast(`${ticker} ditambahkan.`, 'success');
      else showToast(`Gagal ${ticker}.`, 'error');
    });
  });

  // Open detail
  root.querySelectorAll('[data-open-detail]').forEach(btn => {
    btn.addEventListener('click', () => {
      const ticker = btn.getAttribute('data-open-detail');
      const item = picks.find(c => c.ticker === ticker);
      if (!ticker || !item) return;
      safeSessionStorageSet(AI_PICKS_CONTEXT_KEY, buildAiPickContext(item, mode));
      window.location.hash = `#stock/${ticker}`;
    });
  });

  // Factor toggle
  root.querySelectorAll('[data-toggle-factors]').forEach(btn => {
    btn.addEventListener('click', () => {
      const ticker = btn.getAttribute('data-toggle-factors');
      const el = root.querySelector(`#factors-${ticker}`);
      if (!el) return;
      const isHidden = el.style.display === 'none';
      el.style.display = isHidden ? 'block' : 'none';
      btn.textContent = isHidden ? '▾ Faktor' : '▸ Faktor';
    });
  });

  // Retry
  root.querySelectorAll('[data-retry]').forEach(btn => {
    btn.addEventListener('click', () => loadFn(mode));
  });
}

// ─── Main render ──────────────────────────────────────────
export async function renderAiPicks(root) {
  const initialMode = safeLocalStorageGet(AI_PICKS_MODE_KEY, 'swing') || 'swing';
  let currentMode = initialMode;

  // Initial loading shell
  root.innerHTML = `
    <section class="ai-picks-page stagger-reveal">
      <div class="ai-picks-compact-hero">
        <div class="ai-picks-hero-row">
          <h1 class="ai-picks-hero-title">AI Picks Hari Ini</h1>
          <div class="ai-picks-mode-switch" id="ai-picks-mode-switch">
            <button class="btn btn-sm" data-mode="swing">Swing</button>
            <button class="btn btn-sm" data-mode="defensive">Defensive</button>
            <button class="btn btn-sm" data-mode="catalyst">Catalyst</button>
          </div>
        </div>
        <div class="ai-picks-hero-meta">Memuat briefing...</div>
      </div>
      <div class="ai-picks-summary-strip">
        <div class="panel ai-picks-summary-card"><span>Tone</span><strong>Memuat...</strong></div>
        <div class="panel ai-picks-summary-card"><span>Universe</span><strong>Memuat...</strong></div>
        <div class="panel ai-picks-summary-card"><span>Market Bias</span><strong>Memuat...</strong></div>
      </div>
      <div class="ai-picks-list" id="ai-picks-list">${renderLoadingState('Memuat pick unggulan', 'Menghitung score, confidence, dan kandidat teratas.')}</div>
    </section>`;

  observeElements();
  if (typeof lucide !== 'undefined') lucide.createIcons();

  const listEl = root.querySelector('#ai-picks-list');
  const modeSwitch = root.querySelector('#ai-picks-mode-switch');

  // Set active mode button
  function setActiveMode(mode) {
    document.querySelectorAll('[data-mode]').forEach(b => {
      b.classList.toggle('btn-primary', b.getAttribute('data-mode') === mode);
    });
  }

  // Load a mode (from cache or API)
  const loadMode = async (mode) => {
    currentMode = mode;
    safeLocalStorageSet(AI_PICKS_MODE_KEY, mode);
    setActiveMode(mode);

    // Cache hit: render from cache
    if (modeCache[mode]) {
      const cached = modeCache[mode];
      root.querySelector('.ai-picks-compact-hero').innerHTML = extractHeroHtml(cached);
      root.querySelector('.ai-picks-summary-strip').innerHTML = extractSummaryHtml(cached);
      listEl.innerHTML = renderCardList(cached.data, mode);
      setActiveMode(mode);
      wireActions(root, mode, cached.data || [], loadMode);
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    // Cache miss: fetch from API
    if (!listEl) { return; }
    listEl.innerHTML = renderLoadingState('Memuat pick unggulan', 'Menarik kandidat untuk mode ' + mode + '.');
    try {
      const payload = await fetchAiPicks(mode, 5);
      const picks = Array.isArray(payload?.data) ? payload.data : [];

      // Cache for next switch
      modeCache[mode] = payload;

      // Render hero + summary
      const heroSection = root.querySelector('.ai-picks-compact-hero');
      if (heroSection) heroSection.outerHTML = renderAiBrief(payload);
      const summarySection = root.querySelector('.ai-picks-summary-strip');

      // Render cards
      if (!picks.length) {
        listEl.innerHTML = renderEmptyState('Belum ada kandidat', 'Mode ini belum menemukan kandidat cukup kuat. Coba mode lain atau tunggu briefing berikutnya.');
      } else {
        listEl.innerHTML = renderCardList(picks, mode);
      }

      setActiveMode(mode);
      wireActions(root, mode, picks, loadMode);
      if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch {
      listEl.innerHTML = renderErrorState('Gagal memuat', 'Koneksi atau API sedang bermasalah. Coba lagi.');
      wireActions(root, mode, [], loadMode);
      showToast('AI Picks gagal dimuat.', 'error');
    }
  };

  // Mode switch (event delegation — survives outerHTML/innerHTML replacement)
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-mode]');
    if (btn) {
      e.preventDefault();
      loadMode(btn.getAttribute('data-mode') || 'swing');
    }
  });

  // Initial load
  await loadMode(initialMode);
}

// ─── Render helpers (used by both initial and cached render) ──
function renderCardList(picks = [], mode) {
  return picks.map(item => renderCompactCard(item, mode)).join('');
}

function extractHeroHtml(payload) {
  const bc = payload?.market_context || {};
  const asOf = payload?.as_of_label || '';
  const genAt = payload?.generated_at ? String(payload.generated_at).replace('T', ' ').slice(0, 16) : '—';
  const label = payload?.freshness?.label || '';
  return `
    <div class="ai-picks-hero-row">
      <h1 class="ai-picks-hero-title">AI Picks Hari Ini</h1>
      <div class="ai-picks-mode-switch" id="ai-picks-mode-switch">
        <button class="btn btn-sm" data-mode="swing">Swing</button>
        <button class="btn btn-sm" data-mode="defensive">Defensive</button>
        <button class="btn btn-sm" data-mode="catalyst">Catalyst</button>
      </div>
    </div>
    <div class="ai-picks-hero-meta">${asOf} · generated ${genAt} · ${label}</div>`;
}

function extractSummaryHtml(payload) {
  const bc = payload?.market_context || {};
  const tone = bc?.breadth_label || 'data belum cukup';
  const universe = payload?.summary?.eligible_count ?? 0;
  const bias = payload?.market_bias || 'data belum cukup';
  return `
    <div class="panel ai-picks-summary-card"><span>Tone</span><strong>${tone}</strong></div>
    <div class="panel ai-picks-summary-card"><span>Universe</span><strong>${universe} kandidat</strong></div>
    <div class="panel ai-picks-summary-card"><span>Market Bias</span><strong>${bias}</strong></div>`;
}
