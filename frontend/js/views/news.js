1|     1|import { fetchNews } from '../api.js?v=20260505f';
     2|     2|
     3|     3|const NEWS_CACHE_KEY = 'retailbijak.news.cache';
     4|     4|
     5|     5|function getNewsId(n, index) { return n.id || n.link || `news-${index}`; }
     6|     6|
     7|     7|function generateFallbackGradient(title, source) {
     8|     8|  const colors = [
     9|     9|    ['#10b981','#059669'], ['#6366f1','#4f46e5'], ['#f59e0b','#d97706'],
    10|    10|    ['#ef4444','#dc2626'], ['#06b6d4','#0891b2'], ['#8b5cf6','#7c3aed'],
    11|    11|  ];
    12|    12|  const hash = (title || source || '').length % colors.length;
    13|    13|  const [c1, c2] = colors[hash];
    14|    14|  const initials = (title || 'N').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'N';
    15|    15|  return { c1, c2, initials };
    16|    16|}
    17|    17|
    18|    18|function relativeTime(dateStr) {
    19|    19|  if (!dateStr) return '';
    20|    20|  const diff = Date.now() - new Date(dateStr).getTime();
    21|    21|  const min = Math.floor(diff / 60000);
    22|    22|  if (min < 60) return `${min || 1}m`;
    23|    23|  const hour = Math.floor(min / 60);
    24|    24|  if (hour < 24) return `${hour}j`;
    25|    25|  const day = Math.floor(hour / 24);
    26|    26|  return `${day}h`;
    27|    27|}
    28|    28|
    29|    29|function sourceCategory(source) {
    30|    30|  const s = (source || '').toLowerCase();
    31|    31|  if (s.includes('idx') || s.includes('pengumuman')) return 'IDX';
    32|    32|  if (s.includes('rss') || s.includes('feed')) return 'RSS';
    33|    33|  if (s.includes('retailbijak')) return 'Intel';
    34|    34|  return (source || 'Market').toUpperCase();
    35|    35|}
    36|    36|
    37|    37|export async function renderNews(root) {
    38|    38|    document.title = 'RetailBijak — Berita';
    39|    39|    root.innerHTML = `
    40|    40|      <section class="market-overview-page">
    41|    41|        <div class="market-overview-head">
    42|    42|          <div class="market-head-copy">
    43|    43|            <div class="market-row-kicker">Intel Pasar</div>
    44|    44|            <h1 class="news-hero-title">Berita & Intelijen Pasar</h1>
    45|    45|            <p class="news-hero-sub">Ringkasan berita pasar, pengumuman emiten, dan intelijen data IDX dalam satu aliran.</p>
    46|    46|            <div class="market-meta-rail mt-10">
    47|    47|              <div class="market-session-pill is-muted" id="news-count">Memuat...</div>
    48|    48|              <input type="text" id="news-search-input" class="news-search" placeholder="Cari berita (BBCA, BMRI...)" />
    49|    49|            </div>
    50|    50|          </div>
    51|    51|        </div>
    52|    52|        <div class="market-section-group">
    53|    53|          <div id="news-featured" class="market-section-group-grid news-featured-grid">
    54|    54|            <div class="market-card news-featured-card" id="news-featured-main">
    55|    55|              <div class="skeleton skeleton-card skeleton-h-280"></div>
    56|    56|            </div>
    57|    57|            <div class="flex-col gap-3" id="news-featured-side">
    58|    58|              <div class="skeleton skeleton-card skeleton-h-110"></div>
    59|    59|              <div class="skeleton skeleton-card skeleton-h-110"></div>
    60|    60|            </div>
    61|    61|          </div>
    62|    62|        </div>
    63|    63|        <div class="market-section-group">
    64|    64|          <div class="market-section-group-head">
    65|    65|            <div class="market-section-group-title">Aliran Berita <span id="news-filter-label"></span></div>
    66|    66|            <p>Semua berita dan pengumuman dari berbagai sumber terintegrasi.</p>
    67|    67|          </div>
    68|    68|          <div id="news-stream" class="news-stream-grid-v2">
    69|    69|            <div class="skeleton skeleton-card skeleton-h-80"></div>
    70|    70|            <div class="skeleton skeleton-card skeleton-h-80"></div>
    71|    71|            <div class="skeleton skeleton-card skeleton-h-80"></div>
    72|    72|            <div class="skeleton skeleton-card skeleton-h-80"></div>
    73|    73|          </div>
    74|    74|        </div>
    75|    75|      </section>`;
    76|    76|
    77|    77|    try {
    78|    78|        const res = await fetchNews(30);
    79|    79|        const items = (res && Array.isArray(res.data) && res.data.length > 0) ? res.data.slice(0, 30) : [];
    80|    80|
    81|    81|        document.getElementById('news-count').textContent = `${items.length} ITEM INTEL`;
    82|    82|
    83|    83|        if (!items.length) {
    84|    84|          document.querySelectorAll('[id^=news-]').forEach(el => {
    85|    85|            if (el.id !== 'news-count') el.innerHTML = '<div class="dashboard-widget-state grid-full"><strong class="dashboard-widget-state-title">Belum ada berita</strong><span class="dashboard-widget-state-note">Berita akan muncul setelah scheduler berjalan.</span></div>';
    86|    86|          });
    87|    87|          return;
    88|    88|        }
    89|    89|
    90|    90|        // Featured: first item as hero, next 2 as side
    91|    91|        const hero = items[0];
    92|    92|        const side = items.slice(1, 3);
    93|    93|        const stream = items.slice(3);
    94|    94|
    95|    95|        // Render featured hero
    96|    96|        const { c1, c2 } = generateFallbackGradient(hero.title, hero.source);
    97|    97|        document.getElementById('news-featured-main').innerHTML = `
    98|    98|          <a href="${hero.link}" ${String(hero.link||'').startsWith('http') ? 'target="_blank" rel="noopener"' : ''} class="news-hero-card" style="background:linear-gradient(135deg,${c1},${c2})">
    99|    99|            <span class="news-hero-badge">${sourceCategory(hero.source)}</span>
   100|   100|            <strong class="news-hero-title-text">${hero.title || 'Intel Pasar'}</strong>
   101|   101|            <div class="news-hero-meta"><span>${hero.source || 'Market'}</span><span>•</span><span>${relativeTime(hero.published_at)}</span></div>
   102|   102|          </a>`;
   103|   103|
   104|   104|        // Render side featured
   105|   105|        document.getElementById('news-featured-side').innerHTML = side.map(n => {
   106|   106|          const { c1, c2 } = generateFallbackGradient(n.title, n.source);
   107|   107|          return `<a href="${n.link}" ${String(n.link||'').startsWith('http') ? 'target="_blank" rel="noopener"' : ''} class="news-side-card" style="background:linear-gradient(135deg,${c1}22,${c2}15)">
   108|   108|            <div class="news-side-source"><span>${sourceCategory(n.source)}</span><span>${relativeTime(n.published_at)}</span></div>
   109|   109|            <strong class="news-side-title">${n.title || 'Intel Pasar'}</strong>
   110|   110|          </a>`;
   111|   111|        }).join('');
   112|   112|
   113|   113|        // Render stream (2-column grid)
   114|   114|        document.getElementById('news-stream').innerHTML = stream.map((n, i) => streamCardHtml(n, i)).join('');
   115|   115|
   116|   116|        // Search filter
   117|   117|        window.__newsAllItems = stream;
   118|   118|        const searchInput = document.getElementById('news-search-input');
   119|   119|        if (searchInput) {
   120|   120|          searchInput.addEventListener('input', function() {
   121|   121|            const q = this.value.trim().toUpperCase();
   122|   122|            const label = document.getElementById('news-filter-label');
   123|   123|            if (!q || q.length < 2) {
   124|   124|              document.getElementById('news-stream').innerHTML = window.__newsAllItems.map((n, i) => streamCardHtml(n, i)).join('');
   125|   125|              if (label) label.textContent = '';
   126|   126|              return;
   127|   127|            }
   128|   128|            const filtered = window.__newsAllItems.filter(n =>
   129|   129|              (n.title || '').toUpperCase().includes(q) ||
   130|   130|              (n.summary || '').toUpperCase().includes(q)
   131|   131|            );
   132|   132|            if (label) label.textContent = filtered.length ? `· filter "${this.value}" (${filtered.length})` : '· tidak ditemukan';
   133|   133|            document.getElementById('news-stream').innerHTML = filtered.length
   134|   134|              ? filtered.map((n, i) => streamCardHtml(n, i)).join('')
   135|   135|              : '<div class="dashboard-widget-state grid-full"><strong class="dashboard-widget-state-title">Tidak ditemukan</strong><span class="dashboard-widget-state-note">Coba kata kunci lain.</span></div>';
   136|   136|          });
   137|   137|        }
   138|   138|
   139|   139|    } catch (err) {
   140|   140|        document.getElementById('news-count').textContent = 'GAGAL';
   141|   141|        const stream = document.getElementById('news-stream');
   142|   142|        if (stream) stream.innerHTML = '<div class="dashboard-widget-state grid-full"><strong class="dashboard-widget-state-title">Gagal memuat berita</strong><span class="dashboard-widget-state-note">Coba refresh halaman.</span></div>';
   143|   143|    }
   144|   144|}
   145|   145|
   146|   146|function streamCardHtml(n, i) {
   147|   147|  const { c1, c2, initials } = generateFallbackGradient(n.title, n.source);
   148|   148|  const hasImage = n.image_url && n.image_url.length > 4;
   149|   149|  const thumbHtml = hasImage
   150|   150|    ? `<span class="news-stream-thumb"><img src="${n.image_url}" alt="" loading="lazy" onerror="this.style.display=\'none\';this.parentElement.style.background=\'linear-gradient(135deg,${c1},${c2})\';this.parentElement.textContent=\'${initials}\'" /><span class="news-stream-thumb" style="display:none;background:linear-gradient(135deg,${c1},${c2})">${initials}</span></span>`
   151|   151|    : `<span class="news-stream-thumb" style="background:linear-gradient(135deg,${c1},${c2})">${initials}</span>`;
   152|   152|  return `<a href="${n.link}" ${String(n.link||'').startsWith('http') ? 'target="_blank" rel="noopener"' : ''} class="news-card-stream" style="text-decoration:none;border-left-color:${c1}">
   153|   153|    ${thumbHtml}
   154|   154|    <div class="news-stream-body">
   155|   155|      <div class="news-stream-head"><span class="news-stream-source">${sourceCategory(n.source)}</span><span class="news-stream-time">${relativeTime(n.published_at)}</span></div>
   156|   156|      <strong class="news-stream-title">${n.title || 'Intel Pasar'}</strong>
   157|   157|      ${n.summary ? `<div class="news-stream-summary">${n.summary.replace(/<[^>]*>/g,'')}</div>` : ''}
   158|   158|    </div>
   159|   159|  </a>`;
   160|   160|}
   161|   161|