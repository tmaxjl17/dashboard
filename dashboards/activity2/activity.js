/* =========================================================
   DASHBOARD ACTIVITY 2 - Storytelling vertical (Option B)
   ========================================================= */

const Activity2 = (() => {

  let currentActivityCode = ACTIVITY_DATA.activities[0].code;
  let currentGeoLevelId = 'level1';
  let currentYear = null;
  let highlightedRegion = null;
  let chartInstance = null;
  let map = null;
  let geoLayer = null;

  // ================= HELPERS =================
  const fmt = n => (n === null || n === undefined) ? '—' : n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  const fmtDate = d => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

  function getActivity(code) { return ACTIVITY_DATA.activities.find(a => a.code === code); }
  function getKpis(activity, levelId) { return activity.kpis[levelId] || activity.kpis.level1; }

  function classify(value) {
    if (value === null || value === undefined) return 'low';
    if (value > 100) return 'over';
    if (value >= 70) return 'high';
    if (value >= 40) return 'mid';
    return 'low';
  }

  function getChoroColor(value) {
    if (value === null || value === undefined) return '#E4ECF2';
    if (value >= 80) return '#0F6796';
    if (value >= 60) return '#137EB4';
    if (value >= 40) return '#5BA3CB';
    if (value >= 20) return '#9DC8E0';
    return '#D5E5EE';
  }

  // ================= SÉLECTEURS HERO =================
  function buildHeroSelector(triggerId, dropdownId, items, currentValue, onSelect, opts = {}) {
    const trigger = document.getElementById(triggerId);
    const dropdown = document.getElementById(dropdownId);
    const searchable = opts.searchable !== false;

    function render(filter = '') {
      const filtered = items.filter(it =>
        !filter || it.label.toLowerCase().includes(filter.toLowerCase())
      );

      const searchHtml = searchable ? `
        <div class="hero-selector__search">
          <input type="text" placeholder="Rechercher..." value="${filter}">
        </div>` : '';

      dropdown.innerHTML = searchHtml + filtered.map(it => `
        <button class="hero-selector__option ${it.value === currentValue ? 'is-selected' : ''}" data-value="${it.value}">
          <i class="fas fa-check hero-selector__option-check"></i>
          <span>${it.label}</span>
        </button>
      `).join('');

      if (searchable) {
        const input = dropdown.querySelector('.hero-selector__search input');
        input.addEventListener('input', e => render(e.target.value));
        input.addEventListener('click', e => e.stopPropagation());
        setTimeout(() => input.focus(), 50);
      }

      dropdown.querySelectorAll('.hero-selector__option').forEach(btn => {
        btn.addEventListener('click', () => {
          onSelect(btn.dataset.value);
          close();
        });
      });
    }

    function open() {
      // Fermer les autres dropdowns
      document.querySelectorAll('.hero-selector__dropdown.is-open').forEach(d => {
        if (d !== dropdown) {
          d.classList.remove('is-open');
          d.previousElementSibling?.classList.remove('is-open');
        }
      });
      trigger.classList.add('is-open');
      dropdown.classList.add('is-open');
      render();
    }

    function close() {
      trigger.classList.remove('is-open');
      dropdown.classList.remove('is-open');
    }

    trigger.addEventListener('click', e => {
      e.stopPropagation();
      if (trigger.classList.contains('is-open')) close();
      else open();
    });

    document.addEventListener('click', e => {
      if (!dropdown.contains(e.target) && !trigger.contains(e.target)) close();
    });
  }

  function updateActivityTrigger() {
    const a = getActivity(currentActivityCode);
    document.getElementById('activityValue').textContent = `${a.code} – ${a.name}`;
  }

  function updateGeoTrigger() {
    const lvl = ACTIVITY_DATA.geoLevels.find(l => l.id === currentGeoLevelId);
    document.getElementById('geoValue').textContent = lvl.label;
  }

  // ================= HERO RENDER =================
  function renderHero() {
    const a = getActivity(currentActivityCode);
    document.getElementById('heroCode').textContent = a.code;
    document.getElementById('heroTitle').textContent = a.name;

    const statusEl = document.getElementById('heroStatus');
    statusEl.textContent = a.status;
    statusEl.dataset.status = a.status;

    document.getElementById('metaUnit').innerHTML = `<i class="fas fa-ruler"></i> <span>Unité</span> <strong>${a.unit}</strong>`;
    document.getElementById('metaResponsible').innerHTML = `<i class="fas fa-user"></i> <span>Responsable</span> <strong>${a.responsible}</strong>`;
    document.getElementById('metaStartDate').innerHTML = `<i class="far fa-calendar-check"></i> <span>Début</span> <strong>${fmtDate(a.startDate)}</strong>`;
    document.getElementById('metaEndDate').innerHTML = `<i class="far fa-calendar-times"></i> <span>Fin</span> <strong>${fmtDate(a.endDate)}</strong>`;

    document.getElementById('heroComments').textContent = a.comments;
  }

  // ================= KPI DONUTS COMPACTS =================
  function renderKpiDonut(rootId, value, label, sparklineData) {
    const root = document.getElementById(rootId);
    const radius = 26;
    const circumference = 2 * Math.PI * radius;
    const ratio = Math.min(value / 100, 1);
    const offset = circumference - (ratio * circumference);
    const cls = classify(value);

    root.className = `kpi kpi--${cls}`;

    // Sparkline SVG
    let sparkSvg = '';
    if (sparklineData && sparklineData.length > 1) {
      const w = 200, h = 32;
      const valid = sparklineData.filter(v => v !== null);
      const max = Math.max(...valid), min = Math.min(...valid);
      const range = max - min || 1;
      const pts = sparklineData.map((v, i) => {
        if (v === null) return null;
        return `${(i/(sparklineData.length-1))*w},${h - ((v-min)/range)*(h-4) - 2}`;
      }).filter(p => p !== null).join(' ');
      const color = cls === 'low' ? '#C97B7B' : cls === 'mid' ? '#D4A574' : cls === 'high' ? '#7BA888' : '#137EB4';
      sparkSvg = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
        <polyline fill="none" stroke="${color}" stroke-width="1.8" points="${pts}"/>
        <polyline fill="${color}" fill-opacity="0.15" stroke="none" points="0,${h} ${pts} ${w},${h}"/>
      </svg>`;
    }

    root.innerHTML = `
      <div class="kpi__top">
        <div class="kpi__donut-wrapper">
          <svg viewBox="0 0 64 64" width="72" height="72">
            <circle class="kpi__donut-track" cx="32" cy="32" r="${radius}" fill="none" stroke-width="6"/>
            <circle class="kpi__donut-fill" cx="32" cy="32" r="${radius}" stroke-width="6"
                    stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"/>
          </svg>
          <div class="kpi__donut-center">${Math.round(Math.min(value, 100))}%</div>
        </div>
        <div class="kpi__main">
          <div class="kpi__label">${label}</div>
          <div class="kpi__value">${fmt(value)}<span style="font-size:18px">%</span></div>
          ${value > 100 ? `<div class="kpi__delta kpi__delta--up"><i class="fas fa-arrow-up"></i> +${(value-100).toFixed(1)}% au-dessus de la cible</div>` : ''}
        </div>
      </div>
      ${sparkSvg ? `<div class="kpi__sparkline">${sparkSvg}</div>` : ''}
    `;
  }

  function renderKpis() {
    const a = getActivity(currentActivityCode);
    const k = getKpis(a, currentGeoLevelId);
    renderKpiDonut('kpiBudget', k.budget, '% Budget', a.yearly.budget);
    renderKpiDonut('kpiPhysique', k.physique, '% Physique', a.yearly.physique);
    renderKpiDonut('kpiAchievement', k.achievement, '% Achèvement',
      a.yearly.budget.map((b, i) => Math.min((a.yearly.physique[i] / b) * 100 || 0, 100)));
  }

  // ================= GRAPHE =================
  function renderYearPills() {
    const a = getActivity(currentActivityCode);
    const wrap = document.getElementById('yearPillsRow');
    wrap.innerHTML = `
      <button class="year-pill ${currentYear === null ? 'active' : ''}" data-year="all">Toutes les années</button>
      ${a.yearly.labels.map(y => `
        <button class="year-pill ${currentYear === y ? 'active' : ''}" data-year="${y}">${y}</button>
      `).join('')}
    `;

    wrap.querySelectorAll('.year-pill').forEach(p => {
      p.addEventListener('click', () => {
        currentYear = p.dataset.year === 'all' ? null : parseInt(p.dataset.year);
        renderYearPills();
        renderChart();
      });
    });
  }

  function renderChart() {
    const a = getActivity(currentActivityCode);
    const ctx = document.getElementById('activityChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();

    let labels = a.yearly.labels;
    let budget = a.yearly.budget;
    let physique = a.yearly.physique;

    if (currentYear !== null) {
      const idx = labels.indexOf(currentYear);
      if (idx !== -1) {
        labels = [labels[idx]];
        budget = [budget[idx]];
        physique = [physique[idx]];
      }
    }

    const grad = ctx.createLinearGradient(0, 0, 0, 380);
    grad.addColorStop(0, 'rgba(19,126,180,0.35)');
    grad.addColorStop(1, 'rgba(19,126,180,0)');

    chartInstance = new Chart(ctx, {
      data: {
        labels,
        datasets: [
          {
            type: 'bar',
            label: '% Budget',
            data: budget,
            backgroundColor: grad,
            borderColor: '#137EB4',
            borderWidth: 2,
            borderRadius: 10,
            maxBarThickness: 80
          },
          {
            type: 'line',
            label: '% Physique',
            data: physique,
            borderColor: '#7BA888',
            backgroundColor: '#7BA888',
            borderWidth: 3,
            tension: 0.4,
            pointBackgroundColor: '#fff',
            pointBorderColor: '#7BA888',
            pointBorderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 8,
            spanGaps: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { padding: 18, font: { size: 12, family: "'Inter', sans-serif" }, usePointStyle: true, pointStyle: 'circle', color: '#4D5A65' }
          },
          tooltip: {
            backgroundColor: '#131A20',
            padding: 14,
            cornerRadius: 10,
            titleColor: '#F1F6F9',
            bodyColor: '#D2DDE5',
            callbacks: { label: ctx => `${ctx.dataset.label} : ${fmt(ctx.parsed.y)} %` }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(181,194,204,0.35)' },
            ticks: { font: { size: 11 }, color: '#6A7884', callback: v => v + '%' }
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 12, weight: '500' }, color: '#4D5A65' }
          }
        }
      }
    });
  }

  // ================= DRILL-DOWN PANEL =================
  function renderDrillDown() {
    const a = getActivity(currentActivityCode);
    const k = getKpis(a, currentGeoLevelId);
    const regions = k.regions || {};
    const list = document.getElementById('drillList');
    const countEl = document.getElementById('drillCount');

    const entries = Object.entries(regions)
      .map(([name, r]) => ({ name, ...r }))
      .sort((a, b) => b.achievement - a.achievement);

    countEl.textContent = entries.length;

    if (entries.length === 0) {
      list.innerHTML = `<div class="drill-empty">
        <i class="fas fa-map-location-dot"></i>
        <p>Pas de données régionales pour ce niveau géographique.</p>
      </div>`;
      return;
    }

    list.innerHTML = entries.map((r, i) => {
      const cls = classify(r.achievement);
      const w = Math.min(r.achievement, 100);
      return `
        <div class="drill-item drill-item--${cls} ${highlightedRegion === r.name ? 'is-highlighted' : ''}" data-region="${r.name.replace(/"/g, '&quot;')}">
          <div class="drill-item__rank">${i + 1}</div>
          <div class="drill-item__main">
            <div class="drill-item__name">${r.name}</div>
            <div class="drill-item__bar"><div class="drill-item__bar-fill" style="width:${w}%"></div></div>
          </div>
          <div class="drill-item__pct">${fmt(r.achievement)}%</div>
        </div>`;
    }).join('');

    list.querySelectorAll('.drill-item').forEach(el => {
      el.addEventListener('click', () => {
        const name = el.dataset.region;
        highlightedRegion = (highlightedRegion === name) ? null : name;
        renderDrillDown();
        zoomMapToRegion(name);
      });
    });
  }

  // ================= MAP =================
  function initMap() {
    map = L.map('map', { center: [7.6, -5.5], zoom: 6, zoomControl: true });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd', maxZoom: 18
    }).addTo(map);
  }

  async function loadGeoJson() {
    const lvl = ACTIVITY_DATA.geoLevels.find(l => l.id === currentGeoLevelId);
    const loadingEl = document.getElementById('mapLoading');
    loadingEl.classList.remove('is-hidden');

    if (geoLayer) { map.removeLayer(geoLayer); geoLayer = null; }

    try {
      const res = await fetch(lvl.geoUrl);
      const geojson = await res.json();
      drawGeoLayer(geojson, lvl.nameProp);
    } catch (err) {
      console.error('Erreur GeoJSON :', err);
      loadingEl.innerHTML = `<i class="fas fa-triangle-exclamation" style="font-size:24px;color:var(--danger)"></i>
        <p>Impossible de charger la carte<br><small>${lvl.label}</small></p>`;
      return;
    }
    loadingEl.classList.add('is-hidden');
  }

  function styleFeature(feature, nameProp, regions) {
    const name = feature.properties[nameProp];
    const r = regions[name];
    const value = r ? r.achievement : null;
    const isHighlighted = highlightedRegion === name;
    return {
      fillColor: getChoroColor(value),
      weight: isHighlighted ? 3 : 1.2,
      opacity: 1,
      color: isHighlighted ? '#137EB4' : '#fff',
      fillOpacity: value !== null && value !== undefined ? 0.85 : 0.3
    };
  }

  function drawGeoLayer(geojson, nameProp) {
    const a = getActivity(currentActivityCode);
    const k = getKpis(a, currentGeoLevelId);
    const regions = k.regions || {};

    geoLayer = L.geoJSON(geojson, {
      style: feature => styleFeature(feature, nameProp, regions),
      onEachFeature: (feature, layer) => {
        const name = feature.properties[nameProp];
        const r = regions[name];
        const tooltipContent = r ? `
          <div class="region-tooltip__name">${name}</div>
          <div class="region-tooltip__row"><span>% Budget</span><strong>${fmt(r.budget)}%</strong></div>
          <div class="region-tooltip__row"><span>% Physique</span><strong>${fmt(r.physique)}%</strong></div>
          <div class="region-tooltip__row"><span>% Achèvement</span><strong>${fmt(r.achievement)}%</strong></div>
        ` : `<div class="region-tooltip__name">${name}</div><div style="opacity:0.7">Pas de données</div>`;

        layer.bindTooltip(tooltipContent, { className: 'region-tooltip', sticky: true, direction: 'top' });

        layer.on('mouseover', () => {
          if (highlightedRegion !== name) {
            layer.setStyle({ weight: 2.5, color: '#137EB4' });
            layer.bringToFront();
          }
        });
        layer.on('mouseout', () => geoLayer.resetStyle(layer));
        layer.on('click', () => {
          highlightedRegion = (highlightedRegion === name) ? null : name;
          renderDrillDown();
          refreshMapStyle();
        });
      }
    }).addTo(map);

    try { map.fitBounds(geoLayer.getBounds(), { padding: [20, 20] }); } catch (e) {}
  }

  function refreshMapStyle() {
    if (!geoLayer) return;
    const a = getActivity(currentActivityCode);
    const k = getKpis(a, currentGeoLevelId);
    const regions = k.regions || {};
    const lvl = ACTIVITY_DATA.geoLevels.find(l => l.id === currentGeoLevelId);

    geoLayer.setStyle(feature => styleFeature(feature, lvl.nameProp, regions));

    geoLayer.eachLayer(layer => {
      const name = layer.feature.properties[lvl.nameProp];
      const r = regions[name];
      const tooltipContent = r ? `
        <div class="region-tooltip__name">${name}</div>
        <div class="region-tooltip__row"><span>% Budget</span><strong>${fmt(r.budget)}%</strong></div>
        <div class="region-tooltip__row"><span>% Physique</span><strong>${fmt(r.physique)}%</strong></div>
        <div class="region-tooltip__row"><span>% Achèvement</span><strong>${fmt(r.achievement)}%</strong></div>
      ` : `<div class="region-tooltip__name">${name}</div><div style="opacity:0.7">Pas de données</div>`;
      layer.setTooltipContent(tooltipContent);
    });
  }

  function zoomMapToRegion(name) {
    if (!geoLayer) return;
    refreshMapStyle();
    geoLayer.eachLayer(layer => {
      const lvl = ACTIVITY_DATA.geoLevels.find(l => l.id === currentGeoLevelId);
      if (layer.feature.properties[lvl.nameProp] === name && highlightedRegion === name) {
        try { map.fitBounds(layer.getBounds(), { padding: [40, 40], maxZoom: 9 }); } catch (e) {}
      }
    });
    if (highlightedRegion === null) {
      try { map.fitBounds(geoLayer.getBounds(), { padding: [20, 20] }); } catch (e) {}
    }
  }

  // ================= COMMENTAIRES TOGGLE =================
  function initCommentsToggle() {
    const card = document.getElementById('commentsCard');
    const toggle = card.querySelector('.hero-comments__toggle');
    toggle.addEventListener('click', () => card.classList.toggle('is-open'));
  }

  // ================= CHANGE HANDLERS =================
  function onActivityChange(code) {
    currentActivityCode = code;
    currentYear = null;
    highlightedRegion = null;
    updateActivityTrigger();
    renderHero();
    renderKpis();
    renderYearPills();
    renderChart();
    renderDrillDown();
    refreshMapStyle();
  }

  function onGeoLevelChange(levelId) {
    currentGeoLevelId = levelId;
    highlightedRegion = null;
    updateGeoTrigger();
    renderKpis();
    renderDrillDown();
    loadGeoJson();
  }

  // ================= INIT =================
  function init() {
    buildHeroSelector(
      'activityTrigger', 'activityDropdown',
      ACTIVITY_DATA.activities.map(a => ({ value: a.code, label: `${a.code}: ${a.name}` })),
      currentActivityCode, onActivityChange, { searchable: true }
    );
    buildHeroSelector(
      'geoTrigger', 'geoDropdown',
      ACTIVITY_DATA.geoLevels.map(l => ({ value: l.id, label: l.label })),
      currentGeoLevelId, onGeoLevelChange, { searchable: false }
    );

    updateActivityTrigger();
    updateGeoTrigger();
    renderHero();
    renderKpis();
    renderYearPills();
    renderChart();
    renderDrillDown();
    initCommentsToggle();

    initMap();
    loadGeoJson();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', Activity2.init);
