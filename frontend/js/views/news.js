import { fetchNews, showToast, apiFetch } from '../api.js?v=20260511';
import { observeElements } from '../main.js?v=20260511';

const NEWS_CACHE_KEY = 'retailbijak.news.cache';

const NEWS_CATEGORIES = [
  { value: '', label: 'Semua' },
  { value: 'market', label: 'Pasar' },
  { value: 'dividend', label: 'Dividen' },
  { value: 'earnings', label: 'Laba' },
  { value: 'corporate', label: 'Korporasi' },
  { value: 'analyst', label: 'Analis' },
];

function getNewsId(n, index) { return n.id || n.link || `news-${index}`; }

function generateFallbackGradient(title, source) {
  const colors = [
    ['#10b981','#059669'], ['#6366f1','#4f46e5'], ['#f59e0b','#d97706'],
    ['#ef4444','#dc2626'], ['#06b6d4','#0891b2'], ['#8b5cf6','#7c3aed'],
  ];
  const hash = (title || source || '').length % colors.length;
  const [c1, c2] = colors[hash];
  const initials = (title || 'N').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'N';
  return { c1, c2, initials };
}

function relativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min || 1}m`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}j`;
  const day = Math.floor(hour / 24);
  return `${day}h`;
}

function sourceCategory(source) {
  const s = (source || '').toLowerCase();
  if (s.includes('idx') || s.includes('pengumuman')) return 'IDX';
  if (s.includes('rss') || s.includes('feed')) return 'RSS';
  if (s.includes('retailbijak')) return 'Intel';
  return (source || 'Market').toUpperCase();
}

export async function renderNews(root) {
    document.title = 'RetailBijak — Berita';
    root.innerHTML = `
      <section class="market-overview-page stagger-reveal">
        <div class="market-overview-head">
          <div class="market-head-copy">
            <div class="market-row-kicker">Intel Pasar</div>
            <h1 class="news-hero-title">Berita & Intelijen Pasar</h1>
            <p class="news-hero-sub">Ringkasan berita pasar, pengumuman emiten, dan intelijen data IDX dalam satu aliran.</p>
              <div class="market-meta-rail mt-10">
                <div class="market-session-pill is-muted" id="news-count">Memuat...</div>
                <div class="news-search-wrap">
                  <input type="text" id="news-search-input" class="news-search" placeholder="Cari berita (BBCA, BMRI...)" />
                  <select id="news-source-filter" class="news-source-select" aria-label="Filter sumber">
                    <option value="">Semua Sumber</option>
                  </select>
                  <select id="news-sentiment-filter" class="news-source-select" aria-label="Filter sentimen">
                    <option value="">Semua Sentimen</option>
                    <option value="positive">Positif</option>
                    <option value="negative">Negatif</option>
                    <option value="neutral">Netral</option>
                  </select>
                  <button id="news-search-clear" type="button" class="news-search-clear hidden" aria-label="Hapus filter">&times;</button>
                  <button id="news-export-csv" type="button" class="btn btn-sm" style="padding:6px 12px;font-size:12px" title="Export CSV">📥 CSV</button>
                </div>
                <div id="news-category-pills" class="news-category-bar flex gap-2 flex-wrap mt-2"></div>
            </div>
          </div>
        </div>
        <div class="market-section-group">
          <div id="news-featured" class="market-section-group-grid news-featured-grid">
            <div class="market-card news-featured-card" id="news-featured-main">
              <div class="skeleton skeleton-card skeleton-h-280"></div>
            </div>
            <div class="flex-col gap-3" id="news-featured-side">
              <div class="skeleton skeleton-card skeleton-h-110"></div>
              <div class="skeleton skeleton-card skeleton-h-110"></div>
            </div>
          </div>
        </div>
        <div class="market-section-group">
          <div class="market-section-group-head">
            <div class="market-section-group-title">Aliran Berita <span id="news-filter-label"></span></div>
            <p>Semua berita dan pengumuman dari berbagai sumber terintegrasi.</p>
          </div>
          <div id="news-stream" class="news-stream-grid-v2">
            <div class="skeleton skeleton-card skeleton-h-80"></div>
            <div class="skeleton skeleton-card skeleton-h-80"></div>
            <div class="skeleton skeleton-card skeleton-h-80"></div>
            <div class="skeleton skeleton-card skeleton-h-80"></div>
          </div>
        </div>
      </section>`;

    try {
        const res = await fetchNews(30);
        const items = (res && Array.isArray(res.data) && res.data.length > 0) ? res.data.slice(0, 30) : [];

        document.getElementById('news-count').textContent = `${items.length} ITEM INTEL`;

        // Populate source filter dropdown
        const sourceSelect = document.getElementById('news-source-filter');
        if (sourceSelect && Array.isArray(res.sources)) {
          res.sources.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s;
            opt.textContent = s.charAt(0).toUpperCase() + s.slice(1);
            sourceSelect.appendChild(opt);
          });
          // Re-fetch when source changes
          sourceSelect.addEventListener('change', async function() {
            const src = this.value;
            const ticker = (document.getElementById('news-search-input')?.value || '').trim();
            const newRes = await fetchNews(30, ticker, 0, src, '', window.__newsCategory || '');
            const newItems = (newRes && Array.isArray(newRes.data)) ? newRes.data : [];
            const label = document.getElementById('news-filter-label');
            if (label) label.textContent = src ? `· sumber: ${src}` : '';
            // Re-render with filtered data
            renderNewsItems(newItems, newRes);
            // Update load more
            window.__newsOffset = 30;
            window.__newsTotal = newRes.total || 0;
          });
          // Sentiment filter
          const sentimentSelect = document.getElementById('news-sentiment-filter');
          if (sentimentSelect) {
            sentimentSelect.addEventListener('change', async function() {
              const sent = this.value;
              const ticker = (document.getElementById('news-search-input')?.value || '').trim();
              const src = sourceSelect?.value || '';
              const newRes = await fetchNews(30, ticker, 0, src, sent, window.__newsCategory || '');
              const newItems = (newRes && Array.isArray(newRes.data)) ? newRes.data : [];
              renderNewsItems(newItems, newRes);
              window.__newsOffset = 30;
              window.__newsTotal = newRes.total || 0;
            });
          }
          }

        // Build category pills
        const pillsContainer = document.getElementById('news-category-pills');
        if (pillsContainer) {
          // Try to get categories from API response, fallback to hardcoded
          const apiCategories = (res && Array.isArray(res.categories) && res.categories.length) ? res.categories : null;
          const cats = apiCategories
            ? [{ value: '', label: 'Semua' }, ...apiCategories.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))]
            : NEWS_CATEGORIES;
          pillsContainer.innerHTML = cats.map((c, i) =>
            `<button type="button" class="news-category-pill${i === 0 ? ' active' : ''}" data-category="${c.value}">${c.label}</button>`
          ).join('');
          window.__newsCategory = '';

          // Category pill click handler
          pillsContainer.addEventListener('click', async function(e) {
            const pill = e.target.closest('.news-category-pill');
            if (!pill) return;
            const cat = pill.dataset.category;
            if (cat === window.__newsCategory) return; // already active

            // Update active state
            pillsContainer.querySelectorAll('.news-category-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            window.__newsCategory = cat;

            // Re-fetch with all current filters
            const ticker = (document.getElementById('news-search-input')?.value || '').trim();
            const src = document.getElementById('news-source-filter')?.value || '';
            const sent = document.getElementById('news-sentiment-filter')?.value || '';
            const newRes = await fetchNews(30, ticker, 0, src, sent, cat);
            const newItems = (newRes && Array.isArray(newRes.data)) ? newRes.data : [];
            const label = document.getElementById('news-filter-label');
            if (label) label.textContent = cat ? `· kategori: ${cats.find(c => c.value === cat)?.label || cat}` : '';
            renderNewsItems(newItems, newRes);
            window.__newsOffset = 30;
            window.__newsTotal = newRes.total || 0;
          });
        }

        if (!items.length) {
          document.querySelectorAll('[id^=news-]').forEach(el => {
            if (el.id !== 'news-count') el.innerHTML = '<div class="empty-state-card"><div class="empty-state-icon">📰</div><strong class="empty-state-title">Belum ada berita</strong><span class="empty-state-desc">Berita akan muncul setelah scheduler berjalan.</span></div>';
          });
          return;
        }

        // Featured: first item as hero, next 2 as side
        const hero = items[0];
        const side = items.slice(1, 3);
        const stream = items.slice(3);

        // Render featured hero
        const { c1, c2 } = generateFallbackGradient(hero.title, hero.source);
        const hasHeroImage = hero.image_url && hero.image_url.length > 4;
        const heroBg = hasHeroImage
          ? `background:linear-gradient(180deg,rgba(0,0,0,0.7) 0%,rgba(0,0,0,0.25) 50%,rgba(0,0,0,0.65) 100%),url('${hero.image_url}') center/cover`
          : `background:linear-gradient(135deg,${c1},${c2})`;
        document.getElementById('news-featured-main').innerHTML = `
          <a href="${hero.link}" ${String(hero.link||'').startsWith('http') ? 'target="_blank" rel="noopener"' : ''} class="news-hero-card" style="${heroBg}">
            <span class="news-hero-badge">${sourceCategory(hero.source)}</span>
            <strong class="news-hero-title-text">${hero.title || 'Intel Pasar'}</strong>
            <div class="news-hero-meta"><span>${hero.source || 'Market'}</span><span>•</span><span>${relativeTime(hero.published_at)}</span></div>
          </a>`;

        // Render side featured
        document.getElementById('news-featured-side').innerHTML = side.map(n => {
          const { c1, c2 } = generateFallbackGradient(n.title, n.source);
          const hasSideImage = n.image_url && n.image_url.length > 4;
          const sideBg = hasSideImage
            ? `background:linear-gradient(180deg,rgba(0,0,0,0.6) 0%,rgba(0,0,0,0.15) 60%,rgba(0,0,0,0.5) 100%),url('${n.image_url}') center/cover`
            : `background:linear-gradient(135deg,${c1}22,${c2}15)`;
          return `<a href="${n.link}" ${String(n.link||'').startsWith('http') ? 'target="_blank" rel="noopener"' : ''} class="news-side-card" style="${sideBg}">
            <div class="news-side-source"><span>${sourceCategory(n.source)}</span><span>${relativeTime(n.published_at)}</span></div>
            <strong class="news-side-title">${n.title || 'Intel Pasar'}</strong>
          </a>`;
        }).join('');

        // Render stream (2-column grid)
        document.getElementById("news-stream").innerHTML = stream.map((n, i) => streamCardHtml(n, i)).join("") +
          '<div id="news-loader-wrap" class="grid-full flex justify-center mt-3 mb-3"><button id="btn-load-more-news" type="button" class="btn btn-outline">Muat Lainnya <span id="news-load-count">(+30)</span></button></div>';
        setupNewsCardEvents();

        // Store state for infinite scroll
        window.__newsOffset = 30;
        window.__newsLimit = 30;
        window.__newsTotal = res.total || 0;

        // Update load more count
        const rem = Math.max(0, (res.total || 0) - 30);
        const loadCountEl = document.getElementById('news-load-count');
        if (loadCountEl) loadCountEl.textContent = rem > 0 ? `(+${rem})` : '(habis)';

        // Load more handler
        const loadMoreBtn = document.getElementById('btn-load-more-news');
        if (loadMoreBtn) {
          if (rem <= 0) { loadMoreBtn.disabled = true; loadMoreBtn.textContent = 'Semua berita termuat'; }
          loadMoreBtn.addEventListener('click', async function() {
            const curOffset = window.__newsOffset || 30;
            const curLimit = window.__newsLimit || 30;
            const searchVal = (document.getElementById('news-search-input')?.value || '').trim();
            this.disabled = true;
            this.textContent = 'Memuat...';
            try {
              const src = (document.getElementById('news-source-filter')?.value || '');
              const sent = (document.getElementById('news-sentiment-filter')?.value || '');
              const moreRes = await fetchNews(curLimit, searchVal, curOffset, src, sent, window.__newsCategory || '');
              const moreItems = (moreRes && Array.isArray(moreRes.data)) ? moreRes.data : [];
              const streamEl = document.getElementById('news-stream');
              if (streamEl && moreItems.length) {
                // Insert before the loader button
                const loaderWrap = document.getElementById('news-loader-wrap');
                moreItems.forEach((n, i) => {
                  const html = streamCardHtml(n, i);
                  if (loaderWrap) {
                    loaderWrap.insertAdjacentHTML('beforebegin', html);
                  } else {
                    streamEl.insertAdjacentHTML('beforeend', html);
                  }
                });
                window.__newsOffset = curOffset + moreItems.length;
                const remaining = Math.max(0, (moreRes.total || window.__newsTotal || 0) - window.__newsOffset);
                const loadCount = document.getElementById('news-load-count');
                if (loadCount) loadCount.textContent = remaining > 0 ? `(+${remaining})` : '(habis)';
                this.textContent = remaining > 0 ? 'Muat Lainnya' : 'Semua berita termuat';
                this.disabled = remaining <= 0;
              } else {
                this.textContent = 'Semua berita termuat';
                this.disabled = true;
              }
            } catch(e) {
              this.textContent = 'Gagal, coba lagi';
              this.disabled = false;
            }
          });
        }

        // Search filter
        window.__newsAllItems = stream;
        const searchInput = document.getElementById('news-search-input');
        const clearBtn = document.getElementById('news-search-clear');
        if (searchInput) {
          const updateClearBtn = () => {
            if (!clearBtn) return;
            const hasVal = searchInput.value.trim().length > 0;
            clearBtn.classList.toggle('hidden', !hasVal);
          };
          searchInput.addEventListener('input', function() {
            updateClearBtn();
            const q = this.value.trim().toUpperCase();
            const label = document.getElementById('news-filter-label');
            if (!q || q.length < 2) {
              document.getElementById('news-stream').innerHTML = window.__newsAllItems.map((n, i) => streamCardHtml(n, i)).join('');
              if (label) label.textContent = '';
              return;
            }
            const filtered = window.__newsAllItems.filter(n =>
              (n.title || '').toUpperCase().includes(q) ||
              (n.summary || '').toUpperCase().includes(q)
            );
            if (label) label.textContent = filtered.length ? `· filter "${this.value}" (${filtered.length})` : '· tidak ditemukan';
            document.getElementById('news-stream').innerHTML = filtered.length
              ? filtered.map((n, i) => streamCardHtml(n, i)).join('')
              : '<div class="empty-state-card"><div class="empty-state-icon">🔍</div><strong class="empty-state-title">Tidak ditemukan</strong><span class="empty-state-desc">Coba kata kunci lain.</span></div>';
          });
          if (clearBtn) {
            clearBtn.addEventListener('click', function() {
              searchInput.value = '';
              searchInput.dispatchEvent(new Event('input'));
              searchInput.focus();
            });
          }
        }

        observeElements();

        // ─── News CSV Export (14.4.2) ─────────────────────
        const exportCsvBtn = document.getElementById('news-export-csv');
        if (exportCsvBtn) {
          exportCsvBtn.addEventListener('click', function() {
            // Collect visible news items from the stream & featured
            const streamItems = document.querySelectorAll('.news-card-stream');
            const featuredMain = document.getElementById('news-featured-main');
            const featuredSide = document.getElementById('news-featured-side');
            const items = [];

            // Get featured main
            if (featuredMain) {
              const heroLink = featuredMain.querySelector('.news-hero-card');
              if (heroLink) {
                items.push({
                  title: heroLink.querySelector('.news-hero-title-text')?.textContent?.trim() || '',
                  source: heroLink.querySelector('.news-hero-meta span:first-child')?.textContent?.trim() || '',
                  time: heroLink.querySelector('.news-hero-meta span:last-child')?.textContent?.trim() || '',
                  link: heroLink.href || '',
                  type: 'Featured',
                });
              }
            }
            // Get featured side
            if (featuredSide) {
              featuredSide.querySelectorAll('.news-side-card').forEach(card => {
                items.push({
                  title: card.querySelector('.news-side-title')?.textContent?.trim() || '',
                  source: card.querySelector('.news-side-source span:first-child')?.textContent?.trim() || '',
                  time: card.querySelector('.news-side-source span:last-child')?.textContent?.trim() || '',
                  link: card.href || '',
                  type: 'Featured',
                });
              });
            }
            // Get stream items
            streamItems.forEach(card => {
              items.push({
                title: card.querySelector('.news-stream-title')?.textContent?.trim() || '',
                source: card.querySelector('.news-stream-source')?.textContent?.trim() || '',
                time: card.querySelector('.news-stream-time')?.textContent?.trim() || '',
                link: card.querySelector('.btn-open-original')?.href || '',
                type: 'Stream',
              });
            });

            if (!items.length) {
              showToast('Tidak ada berita untuk diexport', 'warning');
              return;
            }

            const headers = ['Tipe', 'Judul', 'Sumber', 'Waktu', 'Link'];
            const csvRows = items.map(item =>
              [item.type, item.title, item.source, item.time, item.link]
                .map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')
            );
            const csv = '\uFEFF' + headers.join(',') + '\n' + csvRows.join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `retailbijak-news-${new Date().toISOString().slice(0,10)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast(`CSV berita diunduh (${items.length} item)`, 'success');
          });
        }

    } catch (err) {
        document.getElementById('news-count').textContent = 'GAGAL';
        const stream = document.getElementById('news-stream');
        if (stream) stream.innerHTML = '<div class="empty-state-card"><div class="empty-state-icon">⚠️</div><strong class="empty-state-title">Gagal memuat berita</strong><span class="empty-state-desc">Coba refresh halaman.</span></div>';
    }
}

function renderNewsItems(items, res) {
  const label = document.getElementById('news-filter-label');
  if (!items.length) {
    document.querySelectorAll('[id^=news-]').forEach(el => {
      if (el.id !== 'news-count') el.innerHTML = '<div class="empty-state-card"><div class="empty-state-icon">📰</div><strong class="empty-state-title">Belum ada berita</strong><span class="empty-state-desc">Coba ubah filter atau sumber.</span></div>';
    });
    return;
  }
  document.getElementById('news-count').textContent = `${items.length} ITEM INTEL`;

  // Featured
  const hero = items[0];
  const side = items.slice(1, 3);
  const stream = items.slice(3);
  const { c1, c2 } = generateFallbackGradient(hero.title, hero.source);
  const hasHeroImage = hero.image_url && hero.image_url.length > 4;
  document.getElementById('news-featured-main').innerHTML = `
    <a href="${hero.link}" ${String(hero.link||'').startsWith('http') ? 'target="_blank" rel="noopener"' : ''} class="news-hero-card" style="${hasHeroImage ? `background:linear-gradient(180deg,rgba(0,0,0,0.7) 0%,rgba(0,0,0,0.25) 50%,rgba(0,0,0,0.65) 100%),url('${hero.image_url}') center/cover` : `background:linear-gradient(135deg,${c1},${c2})`}">
      <span class="news-hero-badge">${sourceCategory(hero.source)}</span>
      <strong class="news-hero-title-text">${hero.title || 'Intel Pasar'}</strong>
      <div class="news-hero-meta"><span>${hero.source || 'Market'}</span><span>•</span><span>${relativeTime(hero.published_at)}</span></div>
    </a>`;
  
  document.getElementById('news-featured-side').innerHTML = side.map(n => {
    const { c1: sc1, c2: sc2 } = generateFallbackGradient(n.title, n.source);
    return `<a href="${n.link}" ${String(n.link||'').startsWith('http') ? 'target="_blank" rel="noopener"' : ''} class="news-side-card" style="background:linear-gradient(135deg,${sc1}22,${sc2}15)">
      <div class="news-side-source"><span>${sourceCategory(n.source)}</span><span>${relativeTime(n.published_at)}</span></div>
      <strong class="news-side-title">${n.title || 'Intel Pasar'}</strong>
    </a>`;
  }).join('');

  document.getElementById('news-stream').innerHTML = stream.map((n, i) => streamCardHtml(n, i)).join('');
  setupNewsCardEvents();
}

function streamCardHtml(n, i) {
  const { c1, c2, initials } = generateFallbackGradient(n.title, n.source);
  const hasImage = n.image_url && n.image_url.length > 4;
  const thumbHtml = hasImage
    ? `<span class="news-stream-thumb"><img src="${n.image_url}" alt="" loading="lazy" onerror="this.style.display='none'" /><span class="news-stream-thumb" style="display:none;background:linear-gradient(135deg,${c1},${c2})">${initials}</span></span>`
    : `<span class="news-stream-thumb" style="background:linear-gradient(135deg,${c1},${c2})">${initials}</span>`;
  const itemId = n.id || `news-${i}`;
  const cleanSummary = (n.summary || '').replace(/<[^>]*>/g, '');
  const summaryHtml = cleanSummary
    ? `<div class="news-stream-summary">${cleanSummary}</div>`
    : '';
  return `<div class="news-card-stream" style="border-left-color:${c1}" data-id="${itemId}">
    ${thumbHtml}
    <div class="news-stream-body">
      <div class="news-stream-head"><span class="news-stream-source">${sourceCategory(n.source)}</span><span class="news-stream-time">${relativeTime(n.published_at)}</span>${n.sentiment ? `<span class="sentiment-badge ${n.sentiment}">${n.sentiment}</span>` : ''}</div>
      <strong class="news-stream-title">${n.title || 'Intel Pasar'}</strong>
      ${summaryHtml}
      <div class="news-inline-content">
        <div class="news-inline-scroll">
          <div class="news-inline-summary">${cleanSummary || 'Tidak ada ringkasan.'}</div>
          <div class="news-inline-ai" style="display:none"></div>
        </div>
      </div>
      <div class="news-stream-actions">
        <button type="button" class="btn-inline-expand" data-action="expand">📖 Baca Inline</button>
        <button type="button" class="btn-ringkas-ai" data-action="summarize" data-id="${itemId}">✨ Ringkas AI</button>
        <a href="${n.link}" ${String(n.link||'').startsWith('http') ? 'target="_blank" rel="noopener"' : ''} class="btn-open-original">🔗 Buka Asli</a>
      </div>
    </div>
  </div>`;
}

// ─── Expandable Inline Cards & AI Summary ────────────────

function toggleExpand(card) {
  const inlineEl = card.querySelector('.news-inline-content');
  if (!inlineEl) return;
  const isExpanded = card.classList.contains('expanded');
  if (isExpanded) {
    card.classList.remove('expanded');
  } else {
    card.classList.add('expanded');
  }
}

async function handleSummarize(card, btn) {
  const id = btn.dataset.id;
  const inlineContent = card.querySelector('.news-inline-content');
  const aiContent = card.querySelector('.news-inline-ai');
  const summaryContent = card.querySelector('.news-inline-summary');

  // Expand card first if not already
  if (!card.classList.contains('expanded')) {
    toggleExpand(card);
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-ringkas"></span> Merangkum...';

  try {
    const res = await apiFetch(`/news/${id}/summarize`, { method: 'POST' });
    if (res && (res.summary || res.result)) {
      const aiText = res.summary || res.result;
      if (summaryContent) summaryContent.style.display = 'none';
      if (aiContent) {
        aiContent.innerHTML = aiText;
        aiContent.style.display = 'block';
      }
      btn.innerHTML = '✅ Selesai';
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = '✨ Ringkas AI';
      }, 3000);
    } else {
      btn.innerHTML = '✨ Ringkas AI';
      btn.disabled = false;
      showToast('Gagal merangkum berita', 'error');
    }
  } catch (e) {
    btn.innerHTML = '✨ Ringkas AI';
    btn.disabled = false;
    showToast('Gagal merangkum berita', 'error');
  }
}

function setupNewsCardEvents() {
  const stream = document.getElementById('news-stream');
  if (!stream) return;

  // Prevent duplicate listener registration
  if (stream._newsEventsSetup) return;
  stream._newsEventsSetup = true;

  stream.addEventListener('click', async function(e) {
    const expandBtn = e.target.closest('.btn-inline-expand');
    if (expandBtn) {
      e.preventDefault();
      const card = expandBtn.closest('.news-card-stream');
      if (card) toggleExpand(card);
      return;
    }

    const summarizeBtn = e.target.closest('.btn-ringkas-ai');
    if (summarizeBtn) {
      e.preventDefault();
      const card = summarizeBtn.closest('.news-card-stream');
      if (card) await handleSummarize(card, summarizeBtn);
      return;
    }
  });
}
