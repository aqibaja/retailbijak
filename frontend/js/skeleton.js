// ─── Skeleton Loading Utility (Fase 25.1.3) ─────
// Content-aware skeleton generators for every view type.
// Usage: showSkeleton(containerEl, 'card', 3) — shows 3 card skeletons
//        showSkeleton(containerEl, 'dashboard-widget', 6) — widget grid
// Auto-fades out when replaced.

export function showSkeleton(container, type = 'card', count = 1) {
  if (!container) return;
  const html = generateSkeleton(type, count);
  container.dataset.skeletonType = type;
  container.innerHTML = html;
}

export function hideSkeleton(container) {
  if (!container) return;
  const skeletons = container.querySelectorAll('.sk-item');
  if (skeletons.length) {
    skeletons.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(8px)';
      el.style.transition = 'opacity .2s ease, transform .25s ease';
    });
    setTimeout(() => {
      if (container.dataset.skeletonType) {
        delete container.dataset.skeletonType;
      }
    }, 300);
  }
}

function generateSkeleton(type, count) {
  const items = [];
  for (let i = 0; i < count; i++) {
    items.push(skeletonItem(type, i));
  }
  return `<div class="sk-wrap sk-${type}">${items.join('')}</div>`;
}

function skeletonItem(type, index) {
  const delay = index * 60;
  const shimmer = `<div class="sk-shimmer" style="animation-delay:${delay}ms"></div>`;
  switch (type) {
    case 'card':
      return `<div class="sk-item sk-card">${shimmer}<div class="sk-card-inner"><div class="sk-line sk-line-title" style="width:${60 + Math.random() * 25}%"></div><div class="sk-line" style="width:${40 + Math.random() * 30}%"></div></div></div>`;

    case 'chart':
      return `<div class="sk-item sk-chart">${shimmer}<div class="sk-chart-bar" style="height:${30 + Math.random() * 50}%"></div><div class="sk-chart-bar" style="height:${40 + Math.random() * 40}%;animation-delay:30ms"></div><div class="sk-chart-bar" style="height:${25 + Math.random() * 45}%;animation-delay:60ms"></div><div class="sk-chart-bar" style="height:${50 + Math.random() * 30}%;animation-delay:90ms"></div><div class="sk-chart-bar" style="height:${35 + Math.random() * 35}%;animation-delay:120ms"></div><div class="sk-chart-bar" style="height:${20 + Math.random() * 40}%;animation-delay:150ms"></div><div class="sk-chart-bar" style="height:${45 + Math.random() * 25}%;animation-delay:180ms"></div></div>`;

    case 'list':
      return `<div class="sk-item sk-list">${shimmer}<div class="sk-list-rows">${Array(3).fill(0).map((_, j) =>
        `<div class="sk-row"><div class="sk-line" style="width:${30 + Math.random() * 15}%"></div><div class="sk-line" style="width:${25 + Math.random() * 20}%"></div><div class="sk-line sk-line-short"></div></div>`
      ).join('')}</div></div>`;

    case 'table':
      return `<div class="sk-item sk-table-wrap">${shimmer}<div class="sk-table"><div class="sk-table-header"><div class="sk-line"></div><div class="sk-line"></div><div class="sk-line sk-line-short"></div></div>${Array(4).fill(0).map(() =>
        `<div class="sk-table-row"><div class="sk-line" style="width:${20 + Math.random() * 15}%"></div><div class="sk-line" style="width:${15 + Math.random() * 15}%"></div><div class="sk-line sk-line-short"></div></div>`
      ).join('')}</div></div>`;

    case 'kpi':
      return `<div class="sk-item sk-kpi">${shimmer}<div class="sk-kpi-inner"><div class="sk-line sk-line-label"></div><div class="sk-line sk-line-value" style="width:${50 + Math.random() * 30}%"></div><div class="sk-line sk-line-label" style="width:40%"></div></div></div>`;

    case 'dashboard-widget':
      return `<div class="sk-item sk-widget">${shimmer}<div class="sk-widget-header"><div class="sk-line" style="width:40%"></div></div><div class="sk-widget-body">${Array(3).fill(0).map(() =>
        `<div class="sk-row"><div class="sk-line" style="width:35%"></div><div class="sk-line sk-line-short"></div></div>`
      ).join('')}</div></div>`;

    default:
      return `<div class="sk-item sk-card">${shimmer}<div class="sk-card-inner"><div class="sk-line" style="width:70%"></div><div class="sk-line" style="width:50%"></div></div></div>`;
  }
}
