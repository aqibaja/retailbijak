import { fetchNews } from '../api.js?v=20260430i';

export async function renderNews(root) {
    root.innerHTML = `
      <section class="news-container">
        <div class="news-header" style="display:flex; justify-content:between; align-items:flex-end; margin-bottom:32px;">
          <div>
            <h1 style="font-size: 32px; font-weight: 800; color: var(--text-main); margin-bottom: 8px; letter-spacing:-0.04em;">Market Intelligence</h1>
            <p style="font-size: 16px; color: var(--text-muted);">Real-time aggregated financial updates</p>
          </div>
          <div style="height: 36px; background: rgba(99,102,241,0.1); color: #a5b4fc; border:1px solid rgba(99,102,241,0.2); border-radius: 8px; padding: 0 16px; font-size: 12px; font-weight: 700; display: flex; align-items: center; letter-spacing:0.05em;" id="news-count">
            ...
          </div>
        </div>
        
        <div id="news-list" class="news-grid">
            <div id="news-status" style="color:var(--text-main);">Loading intelligence...</div>
        </div>
      </section>`;

    try {
        const res = await fetchNews(20);
        const list = document.getElementById('news-list');
        const status = document.getElementById('news-status');
        
        const items = (res && Array.isArray(res.data) && res.data.length > 0) ? res.data : [
            { title:'IHSG dan saham big cap jadi fokus investor hari ini', source:'RetailBijak', summary:'Market brief internal berbasis universe IDX.', link:'#market', published_at:new Date().toISOString() },
            { title:'Perbankan, energi, dan teknologi masuk radar rotasi sektor', source:'RetailBijak', summary:'Gunakan scanner untuk validasi momentum dan risiko.', link:'#screener', published_at:new Date().toISOString() }
        ];
        
        document.getElementById('news-count').textContent = `${items.length} INTEL ITEMS`;
        status.style.display = 'none';

        list.innerHTML = items.map((n, index) => {
            const time = n.published_at ? new Date(n.published_at).toLocaleDateString() : '';
            const source = n.source || 'MARKET';
            
            let imageUrl = n.image_url || '';
            if (!imageUrl && n.summary && n.summary.includes('<img')) {
                const match = n.summary.match(/src="([^"]+)"/);
                if (match) imageUrl = match[1];
            }

            return `
                <a href="${n.link}" ${String(n.link||'').startsWith('http') ? 'target="_blank" rel="noopener"' : ''} class="news-card stagger-reveal" style="transition-delay: ${index * 0.05}s;">
                    <div class="news-image-wrap" style="display:flex; align-items:center; justify-content:center; background:rgba(99,102,241,0.05); height:140px;">
                        ${imageUrl ? `<img src="${imageUrl}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" style="width:100%; height:100%; object-fit:cover;">` : ''}
                        <div class="news-image-fallback" style="${imageUrl ? 'display:none;' : 'display:flex;'} align-items:center; justify-content:center; background:rgba(99,102,241,0.05); height:100%; width:100%;">
                           <i data-lucide="newspaper" style="width:48px; color:rgba(99,102,241,0.4);"></i>
                        </div>
                    </div>
                    <div class="news-content" style="padding:24px;">
                        <span class="news-badge" style="background:rgba(99,102,241,0.1); color:#a5b4fc; font-size:10px; font-weight:700; padding:4px 10px; border-radius:6px; margin-bottom:12px; display:inline-block;">${source}</span>
                        <h3 class="news-title" style="font-size:17px; font-weight:700; color:var(--text-main); margin-bottom:16px; line-height:1.4;">${n.title}</h3>
                        <div class="news-meta" style="font-size: 13px; color:var(--text-muted); display:flex; align-items:center; gap:8px;">
                            <span style="font-weight:600;">${source}</span>
                            <span style="opacity:0.5;">•</span>
                            <span>${time}</span>
                        </div>
                    </div>
                </a>
            `;
        }).join('');
        
        setTimeout(() => {
            document.querySelectorAll('.news-card').forEach(c => c.classList.add('is-visible'));
        }, 50);
        
    } catch (err) {
        document.getElementById('news-status').textContent = 'Failed to load news: ' + err.message;
    }
}
