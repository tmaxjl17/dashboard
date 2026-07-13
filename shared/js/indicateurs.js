/* =========================================================
   ONGLET INDICATEURS - Logique
   ========================================================= */

const Indicateurs = (() => {
  let activeCode = DASHBOARD_DATA.indicators[0].code;
  let chartInstance = null;
  let validatedOnly = false;

  function getProgressBadge(p) {
    if (p === null) return '<span class="indicator-item__progress-badge badge-neutral">—</span>';
    if (p >= 100) return `<span class="indicator-item__progress-badge badge-success">${p}%</span>`;
    if (p >= 60)  return `<span class="indicator-item__progress-badge badge-warning">${p}%</span>`;
    return `<span class="indicator-item__progress-badge badge-danger">${p}%</span>`;
  }

  function makeSparkline(data, color = '#2196F3') {
    if (!data || data.length < 2) return '';
    const w = 100, h = 28;
    const max = Math.max(...data), min = Math.min(...data);
    const range = max - min || 1;
    const pts = data.map((v, i) => `${(i/(data.length-1))*w},${h - ((v-min)/range)*(h-4) - 2}`).join(' ');
    return `<svg class="sparkline" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <polyline fill="none" stroke="${color}" stroke-width="1.5" points="${pts}"/>
      <polyline fill="${color}" fill-opacity="0.1" stroke="none" points="0,${h} ${pts} ${w},${h}"/>
    </svg>`;
  }

  function getVisibleIndicators(filter = '') {
    return DASHBOARD_DATA.indicators.filter(i => {
      const matchSearch =
        i.name.toLowerCase().includes(filter.toLowerCase()) ||
        i.code.toLowerCase().includes(filter.toLowerCase());
      const matchValidation = !validatedOnly || i.validated === true;
      return matchSearch && matchValidation;
    });
  }

  function renderList(filter = '') {
    const list = document.getElementById('indicatorsList');
    const visible = getVisibleIndicators(filter);
    const countEl = document.querySelector('.indicator-count');
    if (countEl) countEl.textContent = visible.length;

    if (visible.length === 0) {
      list.innerHTML = `<div class="indicators-empty">
        <i class="fas fa-filter-circle-xmark"></i>
        <p>Aucun indicateur ne correspond aux filtres actifs.</p>
      </div>`;
      return;
    }

    list.innerHTML = visible.map(ind => {
      const validatedTag = ind.validated === false
        ? `<span class="indicator-item__unvalidated" title="Données non validées"><i class="fas fa-circle-exclamation"></i></span>`
        : '';
      return `
        <div class="indicator-item ${ind.code === activeCode ? 'active' : ''}" data-code="${ind.code}">
          <div class="indicator-item__top">
            <span class="indicator-item__code">${ind.code}</span>
            ${validatedTag}
            ${getProgressBadge(ind.progress)}
          </div>
          <div class="indicator-item__name">${ind.name}</div>
          <div class="indicator-item__values">
            <span>Réf: <strong>${ind.ref ?? '—'}</strong></span>
            <span>Actuel: <strong>${ind.current ?? '—'}</strong></span>
            <span>Cible: <strong>${ind.target ?? '—'}</strong></span>
          </div>
          ${makeSparkline(ind.sparkline, ind.code === activeCode ? '#2196F3' : '#9CA3AF')}
        </div>`;
    }).join('');

    list.querySelectorAll('.indicator-item').forEach(el => {
      el.addEventListener('click', () => select(el.dataset.code));
    });
  }

  function select(code) {
    activeCode = code;
    const ind = DASHBOARD_DATA.indicators.find(i => i.code === code);

    document.getElementById('chartTitle').textContent = ind.name;
    document.getElementById('statRef').textContent = ind.ref ?? '—';
    document.getElementById('statCurrent').textContent = ind.current ?? '—';
    document.getElementById('statTarget').textContent = ind.target ?? '—';
    document.getElementById('statProgress').textContent = ind.progress !== null ? ind.progress + '%' : '—';

    renderList(document.getElementById('searchInput').value);
    updateChart(ind);
  }

  function updateChart(ind) {
    if (chartInstance) chartInstance.destroy();
    chartInstance = buildIndicatorChart(document.getElementById('indChart'), ind);
  }

  function init() {
    document.getElementById('searchInput').addEventListener('input', e => renderList(e.target.value));

    const validatedToggle = document.getElementById('indValidatedOnly');
    if (validatedToggle) {
      validatedToggle.addEventListener('change', e => {
        validatedOnly = e.target.checked;
        const visible = getVisibleIndicators(document.getElementById('searchInput').value);
        // Si l'indicateur actif n'est plus visible, basculer sur le premier visible
        if (validatedOnly && !visible.find(i => i.code === activeCode) && visible.length > 0) {
          select(visible[0].code);
        } else {
          renderList(document.getElementById('searchInput').value);
        }
      });
    }

    renderList();
    updateChart(DASHBOARD_DATA.indicators[0]);
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', Indicateurs.init);
