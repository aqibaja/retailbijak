import { fetchAiPicks, saveWatchlistItem, showToast } from '../api.js?v=20260503b';
import { observeElements } from '../main.js?v=20260503ab';

const AI_PICKS_MODE_KEY = 'retailbijak.ai_picks.mode';
const AI_PICKS_CONTEXT_KEY = 'retailbijak.ai_picks.context';
const AI_PICKS_PINNED_KEY = 'retailbijak.ai_picks.pinned';
const nf = (n, d = 0) => Number(n ?? 0).toLocaleString('id-ID', { maximumFractionDigits: d });
const pct = (n) => `${Number(n ?? 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })}%`;

function safeLocalStorageGet(key, fallback = null) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function safeLocalStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore storage issues in private/incognito or restricted contexts
  }
}

function safeLocalStorageGetJson(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeLocalStorageSetJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage issues in private/incognito or restricted contexts
  }
}

function safeSessionStorageSet(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // ignore session storage issues
  }
}

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

function renderReasonChips(labels = []) {
  return labels.map(label => `<span class="ai-picks-reason-chip">${label}</span>`).join('');
}

function renderFactorMeter(label, value = 0) {
  const percent = Math.max(0, Math.min(100, Math.round(Number(value || 0) * 100)));
  return `
    <div class="ai-picks-factor-meter">
      <div class="ai-picks-factor-meta"><span>${label}</span><strong>${percent}</strong></div>
      <div class="ai-picks-factor-track"><span class="ai-picks-factor-fill" style="width:${percent}%"></span></div>
    </div>`;
}

function renderMetricStrip(item) {
  return `
    <div class="ai-picks-metric-strip">
      <div class="ai-picks-metric-chip"><span>Close</span><strong>${nf(item.latest_close, 2)}</strong></div>
      <div class="ai-picks-metric-chip"><span>Change</span><strong>${pct(item.change_pct)}</strong></div>
      <div class="ai-picks-metric-chip"><span>Vol Ratio</span><strong>${nf(item.volume_ratio, 2)}x</strong></div>
      <div class="ai-picks-metric-chip"><span>RR</span><strong>${item.risk_reward || 'n/a'}</strong></div>
    </div>`;
}

function confidenceNarrative(value) {
  const score = Number(value ?? 0);
  if (score >= 75) return 'konfirmasi teknikal cukup kuat untuk akumulasi bertahap';
  if (score >= 55) return 'cukup layak dipantau, tetapi belum konfirmasi kuat';
  return 'masih butuh validasi tambahan sebelum masuk radar utama';
}

function getPinnedTickers() {
  const rows = safeLocalStorageGetJson(AI_PICKS_PINNED_KEY, []);
  return Array.isArray(rows) ? rows.filter(Boolean) : [];
}

function isPinnedTicker(ticker) {
  return getPinnedTickers().includes(String(ticker || '').toUpperCase());
}

function togglePinnedTicker(ticker) {
  const safeTicker = String(ticker || '').toUpperCase();
  if (!safeTicker) return false;
  const next = getPinnedTickers().filter(Boolean);
  const idx = next.indexOf(safeTicker);
  if (idx >= 0) {
    next.splice(idx, 1);
    safeLocalStorageSetJson(AI_PICKS_PINNED_KEY, next);
    return false;
  }
  next.unshift(safeTicker);
  safeLocalStorageSetJson(AI_PICKS_PINNED_KEY, next.slice(0, 8));
  return true;
}

function renderPinButton(ticker) {
  const active = isPinnedTicker(ticker);
  return `<button class="btn ${active ? 'btn-primary ai-picks-pin-active' : ''}" data-ai-picks-pin="${ticker}" title="Pin Prioritas">${active ? 'Pin aktif' : 'Pin Prioritas'}</button>`;
}

function renderCompareTray(items = []) {
  if (!items.length) {
    return `
      <div class="panel ai-picks-state-card" data-ai-picks-state="empty">
        <h3 class="panel-title">Compare Lite</h3>
        <div class="ai-picks-empty">Pilih kandidat untuk membandingkan score, alasan utama, dan risk note.</div>
      </div>`;
  }

  return `
    <div class="panel">
      <h3 class="panel-title">Compare Lite</h3>
      <div class="ai-picks-compare-grid">
        ${items.map(item => `
          <article class="ai-picks-compare-card">
            <div class="ai-picks-compare-head">
              <div>
                <div class="screener-kicker">${item.ticker}</div>
                <strong>${item.score}</strong>
              </div>
              <small>Keyakinan ${item.confidence} · ${confidenceNarrative(item.confidence)}</small>
            </div>
            ${renderMetricStrip(item)}
            <div class="ai-picks-factor-list">
              ${renderFactorMeter('Teknikal', item.factor_scores?.technical)}
              ${renderFactorMeter('Likuiditas', item.factor_scores?.liquidity)}
              ${renderFactorMeter('Fundamental', item.factor_scores?.fundamental)}
              ${renderFactorMeter('Katalis', item.factor_scores?.catalyst)}
            </div>
            <ul class="ai-picks-compare-points">
              <li>${item.comparison_points?.technical_label || '-'}</li>
              <li>${item.comparison_points?.liquidity_label || '-'}</li>
              <li>${item.comparison_points?.fundamental_label || '-'}</li>
              <li>${item.comparison_points?.catalyst_label || '-'}</li>
            </ul>
          </article>`).join('')}
      </div>
    </div>`;
}

function renderAiDeskBrief(llm = null) {
  const status = llm?.status || 'disabled';
  const runtimeMessage = llm?.runtime_message || '';
  const title = status === 'ok' ? 'AI Desk Brief' : status === 'error' ? 'AI Desk Brief tertunda' : 'AI Desk Brief belum aktif';
  const note = status === 'ok'
    ? (llm?.summary || 'Ringkasan AI belum terisi.')
    : status === 'error'
      ? (runtimeMessage || llm?.summary || 'OpenRouter gagal menjawab sesi ini.')
      : (runtimeMessage || 'OpenRouter belum aktif. Isi API key untuk mengaktifkan ringkasan kurasi.');
  const chips = [];
  if (llm?.model) chips.push(`<span class="ai-picks-reason-chip">${llm.model}</span>`);
  if (llm?.market_bias) chips.push(`<span class="ai-picks-reason-chip">${llm.market_bias}</span>`);
  if (llm?.runtime_state && llm.runtime_state !== 'ok') chips.push(`<span class="ai-picks-reason-chip">${llm.runtime_state}</span>`);
  const notes = llm?.pick_notes && typeof llm.pick_notes === 'object'
    ? Object.entries(llm.pick_notes).slice(0, 3).map(([ticker, text]) => `<li><strong>${ticker}</strong> · ${text}</li>`).join('')
    : '';
  return `
    <div class="panel ai-picks-llm-brief ai-picks-state-card" data-ai-picks-state="${status === 'ok' ? 'ready' : status}">
      <div class="screener-kicker">Asisten AI</div>
      <h3 class="panel-title">${title}</h3>
      <p class="dashboard-widget-state-note">${note}</p>
      ${chips.length ? `<div class="ai-picks-reason-row">${chips.join('')}</div>` : ''}
      ${notes ? `<ul class="ai-picks-compare-points">${notes}</ul>` : ''}
    </div>`;
}

function renderBriefingMeta(payload) {
  return `
    <div class="ai-picks-briefing-meta">
      <div class="panel ai-picks-summary-card ai-picks-freshness"><span>Briefing</span><strong>${payload?.as_of_label || 'Premarket briefing belum tersedia'}</strong></div>
      <div class="panel ai-picks-summary-card ai-picks-generated-at"><span>Generated</span><strong>${payload?.generated_at ? String(payload.generated_at).replace('T', ' ').slice(0, 16) : 'Belum ada'}</strong></div>
      <div class="panel ai-picks-summary-card"><span>Status</span><strong>${payload?.freshness?.label || 'Belum ada briefing'}</strong></div>
    </div>`;
}

function renderRankCard(item, mode) {
  return `
    <article class="ai-picks-rank-card panel">
      <div class="ai-picks-rank-head">
        <div>
          <div class="screener-kicker">#${item.rank} · ${item.ticker}</div>
          <h3>${item.name}</h3>
          <p>${item.fit_label}</p>
        </div>
        <div class="ai-picks-score-stack">
          <strong>${nf(item.score, 1)}</strong>
          <small>Keyakinan ${item.confidence} · ${confidenceNarrative(item.confidence)}</small>
        </div>
      </div>
      ${renderMetricStrip(item)}
      <div class="ai-picks-reason-row">${renderReasonChips(item.reason_labels || [])}</div>
      <p><strong>Thesis:</strong> ${item.thesis || '-'}</p>
      <div class="ai-picks-rank-meta">
        <span>Entry ${item.entry_zone || '-'}</span>
        <span>Stop ${nf(item.stop_loss)}</span>
        <span>TP ${nf(item.take_profit)}</span>
      </div>
      <div class="ai-picks-rank-meta">
        <span>RR ${item.risk_reward || 'n/a'}</span>
        <span>Risk ${item.risk_notes || '-'}</span>
      </div>
      <div class="ai-picks-factor-list">
        ${renderFactorMeter('Teknikal', item.factor_scores?.technical)}
        ${renderFactorMeter('Likuiditas', item.factor_scores?.liquidity)}
      </div>
      <div class="ai-picks-rank-actions">
        <button class="btn" data-ai-picks-open-detail="${item.ticker}">Buka Detail</button>
        <button class="btn" data-ai-picks-compare="${item.ticker}">Bandingkan</button>
        ${renderPinButton(item.ticker)}
        <button class="btn btn-primary" data-ai-picks-save="${item.ticker}" data-ai-picks-mode="${mode}">Tambah ke Daftar Pantau</button>
      </div>
    </article>`;
}

function renderLoadingState(title, note) {
  return `
    <div class="panel ai-picks-state-card" data-ai-picks-state="loading">
      <div class="ai-picks-state-stack">
        <span class="ai-picks-state-pulse skeleton-shimmer"></span>
        <strong class="dashboard-widget-state-title">${title}</strong>
        <span class="dashboard-widget-state-note">${note}</span>
      </div>
    </div>`;
}

function renderEmptyState(title, note) {
  return `
    <div class="panel ai-picks-state-card" data-ai-picks-state="empty">
      <div class="ai-picks-state-stack">
        <strong class="dashboard-widget-state-title">${title}</strong>
        <span class="dashboard-widget-state-note">${note}</span>
      </div>
    </div>`;
}

function renderErrorState(title, note) {
  return `
    <div class="panel ai-picks-state-card" data-ai-picks-state="error">
      <div class="ai-picks-state-stack">
        <strong class="dashboard-widget-state-title">${title}</strong>
        <span class="dashboard-widget-state-note">${note}</span>
        <button class="btn ai-picks-retry-btn" data-ai-picks-retry="1">Coba Lagi</button>
      </div>
    </div>`;
}

function renderLoadingShell(metaEl, featuredEl, listEl, compareEl) {
  metaEl.innerHTML = renderBriefingMeta({ freshness: { label: 'Menyiapkan briefing' } });
  featuredEl.innerHTML = renderLoadingState('Menyiapkan pick unggulan', 'Menghitung score, confidence, dan kandidat teratas.');
  listEl.innerHTML = renderLoadingState('Menarik ranked list', 'Shell ini tetap hidup walau data masih dimuat.');
  compareEl.innerHTML = renderCompareTray([]);
}

function setModeButtons(modeSwitch, mode) {
  modeSwitch.dataset.aiPicksActiveMode = mode;
  modeSwitch.querySelectorAll('[data-ai-picks-mode]').forEach(btn => {
    btn.classList.toggle('btn-primary', btn.getAttribute('data-ai-picks-mode') === mode);
  });
}

function getDefaultCompareItems(picks = [], activeTicker = null) {
  if (!Array.isArray(picks) || !picks.length) return [];
  if (activeTicker) {
    const focused = picks.filter(item => item.ticker === activeTicker || item.rank <= 2);
    if (focused.length) return focused.slice(0, 2);
  }
  return picks.slice(0, 2);
}

async function wireQuickActions(root, mode, picks = [], loadMode) {
  const compareEl = root.querySelector('#ai-picks-compare');

  root.querySelectorAll('[data-ai-picks-save]').forEach(button => {
    button.addEventListener('click', async () => {
      const ticker = button.getAttribute('data-ai-picks-save');
      if (!ticker) return;
      button.disabled = true;
      const res = await saveWatchlistItem({ ticker, notes: `Ditambahkan dari AI Picks (mode ${mode})` });
      button.disabled = false;
      if (res) showToast(`${ticker} ditambahkan ke daftar pantau.`, 'success');
      else showToast(`Gagal menambahkan ${ticker}.`, 'error');
    });
  });

  root.querySelectorAll('[data-ai-picks-open-detail]').forEach(button => {
    button.addEventListener('click', () => {
      const ticker = button.getAttribute('data-ai-picks-open-detail');
      const item = picks.find(candidate => candidate.ticker === ticker);
      if (!ticker || !item) return;
      safeSessionStorageSet(AI_PICKS_CONTEXT_KEY, buildAiPickContext(item, mode));
      window.location.hash = `#stock/${ticker}`;
    });
  });

  root.querySelectorAll('[data-ai-picks-pin]').forEach(button => {
    button.addEventListener('click', () => {
      const ticker = button.getAttribute('data-ai-picks-pin');
      const active = togglePinnedTicker(ticker);
      button.classList.toggle('btn-primary', active);
      button.classList.toggle('ai-picks-pin-active', active);
      button.textContent = active ? 'Pin aktif' : 'Pin Prioritas';
      showToast(active ? `${ticker} dipin sebagai prioritas.` : `${ticker} dilepas dari prioritas.`, 'success');
    });
  });

  root.querySelectorAll('[data-ai-picks-compare]').forEach(button => {
    button.addEventListener('click', () => {
      const ticker = button.getAttribute('data-ai-picks-compare');
      compareEl.innerHTML = renderCompareTray(getDefaultCompareItems(picks, ticker));
    });
  });

  root.querySelectorAll('[data-ai-picks-retry]').forEach(button => {
    button.addEventListener('click', () => {
      loadMode(mode);
    });
  });
}

export async function renderAiPicks(root) {
  const initialMode = safeLocalStorageGet(AI_PICKS_MODE_KEY, 'swing') || 'swing';

  root.innerHTML = `
    <section class="ai-picks-page stagger-reveal">
      <div class="ai-picks-hero panel">
        <div>
          <div class="screener-kicker">PREMARKET BRIEFING</div>
          <h1>AI Picks Hari Ini</h1>
          <p>Premarket briefing otomatis untuk memilih saham yang layak dipertimbangkan masuk hari ini, lengkap dengan alasan, entry, stop, target, dan risk-reward.</p>
        </div>
        <div class="ai-picks-mode-switch" data-ai-picks-active-mode="${initialMode}">
          <button class="btn ${initialMode === 'swing' ? 'btn-primary' : ''}" data-ai-picks-mode="swing">Swing</button>
          <button class="btn ${initialMode === 'defensive' ? 'btn-primary' : ''}" data-ai-picks-mode="defensive">Defensive</button>
          <button class="btn" data-ai-picks-mode="catalyst">Catalyst</button>
        </div>
      </div>

      <div class="ai-picks-briefing-meta" id="ai-picks-briefing-meta">
        ${renderBriefingMeta({ freshness: { label: 'Menyiapkan briefing' } })}
      </div>

      <div class="ai-picks-summary-strip">
        <div class="panel ai-picks-summary-card"><span>Tone</span><strong id="ai-picks-tone">Memuat...</strong></div>
        <div class="panel ai-picks-summary-card"><span>Universe</span><strong id="ai-picks-universe">Memuat...</strong></div>
        <div class="panel ai-picks-summary-card"><span>Market Bias</span><strong id="ai-picks-bias">Memuat...</strong></div>
      </div>

      <div class="ai-picks-layout">
        <section class="ai-picks-featured" id="ai-picks-featured">
          ${renderLoadingState('Menyiapkan pick unggulan', 'Menghitung score, confidence, dan kandidat teratas.')}
        </section>

        <aside class="ai-picks-compare ai-picks-compare-tray" id="ai-picks-compare">
          ${renderCompareTray([])}
          ${renderAiDeskBrief(null)}
        </aside>
      </div>

      <section class="ai-picks-ranked-list" id="ai-picks-ranked-list">
        ${renderLoadingState('Menarik ranked list', 'Shell ini tetap hidup walau data masih dimuat.')}
      </section>
    </section>`;

  observeElements();
  if (typeof lucide !== 'undefined') lucide.createIcons();

  const modeSwitch = root.querySelector('.ai-picks-mode-switch');
  const metaEl = root.querySelector('#ai-picks-briefing-meta');
  const featuredEl = root.querySelector('#ai-picks-featured');
  const listEl = root.querySelector('#ai-picks-ranked-list');
  const compareEl = root.querySelector('#ai-picks-compare');
  const toneEl = root.querySelector('#ai-picks-tone');
  const universeEl = root.querySelector('#ai-picks-universe');
  const biasEl = root.querySelector('#ai-picks-bias');

  const loadMode = async (mode = 'swing') => {
    setModeButtons(modeSwitch, mode);
    safeLocalStorageSet(AI_PICKS_MODE_KEY, mode);
    renderLoadingShell(metaEl, featuredEl, listEl, compareEl);
    toneEl.textContent = 'Menyusun tone';
    universeEl.textContent = 'Menyaring kandidat';
    biasEl.textContent = 'Sinkronisasi';

    try {
      const payload = await fetchAiPicks(mode, 5);
      metaEl.innerHTML = renderBriefingMeta(payload);
      toneEl.textContent = payload?.market_context?.breadth_label || 'data belum cukup';
      universeEl.textContent = `${payload?.summary?.eligible_count || 0} kandidat`;
      biasEl.textContent = payload?.market_bias || 'data belum cukup';

      const picks = Array.isArray(payload?.data) ? payload.data : [];
      const featured = picks[0];
      if (!featured) {
        featuredEl.innerHTML = renderEmptyState('Belum ada pick unggulan siap pakai', 'Mode ini belum menemukan kandidat yang cukup kuat. Coba mode lain atau tunggu briefing berikutnya.');
        compareEl.innerHTML = `${renderCompareTray([])}${renderAiDeskBrief(payload?.llm)}`;
        listEl.innerHTML = renderEmptyState('Ranked list belum terisi', 'Universe kandidat masih tipis. Sistem akan menampilkan daftar saat coverage market cukup.');
        await wireQuickActions(root, mode, picks, loadMode);
        return;
      }

      featuredEl.innerHTML = `
        <div class="ai-picks-featured-card panel">
          <div class="ai-picks-rank-head">
            <div>
              <div class="screener-kicker">Pick Unggulan · ${featured.ticker}</div>
              <h2>${featured.name}</h2>
              <p>${featured.fit_label}</p>
            </div>
            <div class="ai-picks-score-stack">
              <strong>${nf(featured.score, 1)}</strong>
              <small>Keyakinan ${featured.confidence} · ${confidenceNarrative(featured.confidence)}</small>
            </div>
          </div>
          ${renderMetricStrip(featured)}
          <div class="ai-picks-reason-row">${renderReasonChips(featured.reason_labels || [])}</div>
          <p><strong>Thesis:</strong> ${featured.thesis || '-'}</p>
          <div class="ai-picks-rank-meta">
            <span>Entry ${featured.entry_zone || '-'}</span>
            <span>Stop ${nf(featured.stop_loss)}</span>
            <span>TP ${nf(featured.take_profit)}</span>
          </div>
          <div class="ai-picks-rank-meta">
            <span>Risk/Reward ${featured.risk_reward || 'n/a'}</span>
            <span>Risk Notes ${featured.risk_notes || '-'}</span>
          </div>
          <div class="ai-picks-factor-list">
            ${renderFactorMeter('Teknikal', featured.factor_scores?.technical)}
            ${renderFactorMeter('Likuiditas', featured.factor_scores?.liquidity)}
            ${renderFactorMeter('Fundamental', featured.factor_scores?.fundamental)}
            ${renderFactorMeter('Katalis', featured.factor_scores?.catalyst)}
          </div>
          <p><strong>Katalis:</strong> ${(featured.catalysts || []).join(' · ') || '-'}</p>
          <div class="ai-picks-rank-actions">
            <button class="btn" data-ai-picks-open-detail="${featured.ticker}">Buka Detail</button>
            <button class="btn" data-ai-picks-compare="${featured.ticker}">Bandingkan</button>
            ${renderPinButton(featured.ticker)}
            <button class="btn btn-primary" data-ai-picks-save="${featured.ticker}" data-ai-picks-mode="${mode}">Tambah ke Daftar Pantau</button>
          </div>
        </div>`;

      compareEl.innerHTML = `${renderCompareTray(getDefaultCompareItems(picks))}${renderAiDeskBrief(payload?.llm)}`;
      listEl.innerHTML = picks.slice(1).map(item => renderRankCard(item, mode)).join('') || renderEmptyState('Kandidat tambahan belum tersedia', 'Pick unggulan sudah siap, tetapi antrian lanjutan masih tipis untuk mode ini.');
      await wireQuickActions(root, mode, picks, loadMode);
    } catch {
      metaEl.innerHTML = renderBriefingMeta({ freshness: { label: 'Gagal memuat briefing' } });
      toneEl.textContent = 'Perlu retry';
      universeEl.textContent = 'API belum stabil';
      biasEl.textContent = 'Gagal memuat';
      featuredEl.innerHTML = renderErrorState('Gagal memuat pick unggulan', 'Koneksi atau API sedang bermasalah. Retry akan mencoba memuat ulang mode aktif tanpa meninggalkan halaman ini.');
      compareEl.innerHTML = `${renderCompareTray([])}${renderAiDeskBrief({ status: 'error', summary: 'OpenRouter atau endpoint AI Picks sedang bermasalah.' })}`;
      listEl.innerHTML = renderErrorState('Ranked list belum bisa ditarik', 'Data ranking tidak tersedia untuk sementara. Coba lagi beberapa detik lagi.');
      await wireQuickActions(root, mode, [], loadMode);
      showToast('AI Picks gagal dimuat. Silakan coba lagi.', 'error');
    }
  };

  modeSwitch.querySelectorAll('[data-ai-picks-mode]').forEach(button => {
    button.addEventListener('click', () => loadMode(button.getAttribute('data-ai-picks-mode') || 'swing'));
  });

  await loadMode(initialMode);
}
