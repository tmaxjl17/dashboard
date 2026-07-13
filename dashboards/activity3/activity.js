/* =========================================================
   DASHBOARD ACTIVITY 3 - Bento grid modulaire (Option C)
   ========================================================= */

const Activity3 = (() => {

  let currentActivityCode = ACTIVITY_DATA.activities[0].code;
  let currentGeoLevelId = 'level1';
  let currentYear = null;
  let highlightedRegion = null;
  let activeKpiFilter = null;        // 'budget' | 'physique' | 'achievement' | null
  let currentMapLayer = 'light';      // 'light' | 'dark' | 'satellite'
  let chartInstance = null;
  let map = null;
  let geoLayer = null;
  let tileLayer = null;

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

  function makeSparkline(data, color) {
    if (!data || data.length < 2) return '';
    const w = 200, h = 36;
    const valid = data.filter(v => v !== null && !isNaN(v));
    if (valid.length < 2) return '';
    const max = Math.max(...valid), min = Math.min(...valid);
    const range = max - min || 1;
    const pts = data.map((v, i) => {
      if (v === null || isNaN(v)) return null;
      return `${(i/(data.length-1))*w},${h - ((v-min)/range)*(h-4) - 2}`;
    }).filter(p => p !== null).join(' ');
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <polyline fill="${color}" fill-opacity="0.15" stroke="none" points="0,${h} ${pts} ${w},${h}"/>
      <polyline fill="none" stroke="${color}" stroke-width="1.8" points="${pts}"/>
    </svg>`;
  }

  // ================= SÉLECTEURS =================
  function buildSelector(triggerId, dropdownId, items, currentValue, onSelect, opts = {}) {
    const trigger = document.getElementById(triggerId);
    const dropdown = document.getElementById(dropdownId);
    const searchable = opts.searchable !== false;

    function render(filter = '') {
      const filtered = items.filter(it =>
        !filter || it.label.toLowerCase().includes(filter.toLowerCase())
      );

      const searchHtml = searchable ? `
        <div class="bento-selector__search">
          <input type="text" placeholder="Rechercher..." value="${filter}">
        </div>` : '';

      dropdown.innerHTML = searchHtml + filtered.map(it => `
        <button class="bento-selector__option ${it.value === currentValue ? 'is-selected' : ''}" data-value="${it.value}">
          <i class="fas fa-check bento-selector__option-check"></i>
          <span>${it.label}</span>
        </button>
      `).join('');

      if (searchable) {
        const input = dropdown.querySelector('.bento-selector__search input');
        input.addEventListener('input', e => render(e.target.value));
        input.addEventListener('click', e => e.stopPropagation());
        setTimeout(() => input.focus(), 50);
      }

      dropdown.querySelectorAll('.bento-selector__option').forEach(btn => {
        btn.addEventListener('click', () => { onSelect(btn.dataset.value); close(); });
      });
    }

    function open() {
      document.querySelectorAll('.bento-selector__dropdown.is-open').forEach(d => {
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

  // ================= HEADER ACTIVITÉ =================
  function renderHeader() {
    const a = getActivity(currentActivityCode);
    document.getElementById('activityCode').textContent = a.code;
    document.getElementById('activityTitle').textContent = a.name;

    const statusEl = document.getElementById('activityStatus');
    statusEl.textContent = a.status;
    statusEl.dataset.status = a.status;

    document.getElementById('activityChips').innerHTML = `
      <div class="activity-chip"><i class="fas fa-ruler"></i><span>Unité</span><strong>${a.unit}</strong></div>
      <div class="activity-chip"><i class="fas fa-user"></i><span>Resp.</span><strong>${a.responsible}</strong></div>
      <div class="activity-chip"><i class="far fa-calendar-check"></i><span>Début</span><strong>${fmtDate(a.startDate)}</strong></div>
      <div class="activity-chip"><i class="far fa-calendar-times"></i><span>Fin</span><strong>${fmtDate(a.endDate)}</strong></div>
    `;

    document.getElementById('activityComments').textContent = a.comments;
  }

  // ================= KPI CELLS =================
  function renderKpiCell(rootId, value, label, icon, modifier, sparklineData, sparkColor) {
    const root = document.getElementById(rootId);
    const cls = classify(value);

    root.innerHTML = `
      <div class="kpi-cell__header">
        <span class="kpi-cell__icon"><i class="fas ${icon}"></i></span>
        <span class="kpi-cell__label">${label}</span>
      </div>
      <div class="kpi-cell__value">${fmt(value)}<span class="kpi-cell__value-suffix">%</span></div>
      <div class="kpi-cell__sub">
        ${value > 100 ? `<i class="fas fa-arrow-up" style="color:var(--success)"></i> +${(value-100).toFixed(0)}% au-dessus de la cible` : value < 40 ? `<i class="fas fa-triangle-exclamation" style="color:var(--danger)"></i> Sous-performance` : value >= 70 ? `<i class="fas fa-circle-check" style="color:var(--success)"></i> Performance correcte` : `<i class="fas fa-clock" style="color:var(--warning)"></i> En progression`}
      </div>
      <div class="kpi-cell__spark">${makeSparkline(sparklineData, sparkColor)}</div>
    `;

    root.dataset.classify = cls;
  }

  function renderKpis() {
    const a = getActivity(currentActivityCode);
    const k = getKpis(a, currentGeoLevelId);
    renderKpiCell('kpiBudget', k.budget, '% Budget', 'fa-wallet', 'budget', a.yearly.budget, '#137EB4');
    renderKpiCell('kpiPhysique', k.physique, '% Physique', 'fa-hammer', 'physique', a.yearly.physique, '#D4A574');
    const achievementSpark = a.yearly.budget.map((b, i) => {
      const p = a.yearly.physique[i];
      if (b === null || b === 0 || p === null) return null;
      return Math.min((p / b) * 100, 200);
    });
    renderKpiCell('kpiAchievement', k.achievement, '% Achèvement', 'fa-flag-checkered', 'achievement', achievementSpark, '#7BA888');

    // Réappliquer l'état de filtre actif
    applyKpiFilterStyles();
  }

  function applyKpiFilterStyles() {
    ['kpiBudget', 'kpiPhysique', 'kpiAchievement'].forEach(id => {
      const el = document.getElementById(id);
      el.classList.remove('is-active', 'is-dimmed');
    });

    if (activeKpiFilter) {
      const targetId = 'kpi' + activeKpiFilter.charAt(0).toUpperCase() + activeKpiFilter.slice(1);
      ['kpiBudget', 'kpiPhysique', 'kpiAchievement'].forEach(id => {
        if (id === targetId) document.getElementById(id).classList.add('is-active');
        else document.getElementById(id).classList.add('is-dimmed');
      });
    }
  }

  function bindKpiClicks() {
    const kpiMap = {
      kpiBudget: 'budget',
      kpiPhysique: 'physique',
      kpiAchievement: 'achievement'
    };
    Object.entries(kpiMap).forEach(([id, key]) => {
      document.getElementById(id).addEventListener('click', () => {
        activeKpiFilter = (activeKpiFilter === key) ? null : key;
        applyKpiFilterStyles();
        renderChart();
      });
    });
  }

  // ================= GRAPHE =================
  function renderYearPills() {
    const a = getActivity(currentActivityCode);
    const wrap = document.getElementById('yearPills');
    wrap.innerHTML = `
      <button class="year-pill ${currentYear === null ? 'active' : ''}" data-year="all">Toutes</button>
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

    const grad = ctx.createLinearGradient(0, 0, 0, 280);
    grad.addColorStop(0, 'rgba(19,126,180,0.35)');
    grad.addColorStop(1, 'rgba(19,126,180,0)');

    const datasets = [];

    // Filtrage par KPI cliqué : on n'affiche que la métrique active
    if (activeKpiFilter === null || activeKpiFilter === 'budget' || activeKpiFilter === 'achievement') {
      datasets.push({
        type: 'bar',
        label: '% Budget',
        data: budget,
        backgroundColor: grad,
        borderColor: '#137EB4',
        borderWidth: 2,
        borderRadius: 8,
        maxBarThickness: 70
      });
    }
    if (activeKpiFilter === null || activeKpiFilter === 'physique' || activeKpiFilter === 'achievement') {
      datasets.push({
        type: 'line',
        label: '% Physique',
        data: physique,
        borderColor: '#D4A574',
        backgroundColor: '#D4A574',
        borderWidth: 3,
        tension: 0.4,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#D4A574',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        spanGaps: true
      });
    }

    chartInstance = new Chart(ctx, {
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { padding: 14, font: { size: 11, family: "'Inter', sans-serif" }, usePointStyle: true, pointStyle: 'circle', color: '#4D5A65' }
          },
          tooltip: {
            backgroundColor: '#131A20',
            padding: 12,
            cornerRadius: 8,
            titleColor: '#F1F6F9',
            bodyColor: '#D2DDE5',
            callbacks: { label: ctx => `${ctx.dataset.label} : ${fmt(ctx.parsed.y)} %` }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(181,194,204,0.35)' },
            ticks: { font: { size: 10 }, color: '#6A7884', callback: v => v + '%' }
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 11, weight: '500' }, color: '#4D5A65' }
          }
        }
      }
    });
  }

  // ================= REGIONS DRILL =================
  function renderRegions() {
    const a = getActivity(currentActivityCode);
    const k = getKpis(a, currentGeoLevelId);
    const regions = k.regions || {};
    const list = document.getElementById('regionsList');
    const countEl = document.getElementById('regionsCount');

    const entries = Object.entries(regions)
      .map(([name, r]) => ({ name, ...r }))
      .sort((a, b) => b.achievement - a.achievement);

    countEl.textContent = entries.length;

    if (entries.length === 0) {
      list.innerHTML = `<div class="regions-empty">
        <i class="fas fa-map-location-dot"></i>
        <p>Pas de données régionales</p>
      </div>`;
      return;
    }

    list.innerHTML = entries.map((r, i) => {
      const cls = classify(r.achievement);
      const w = Math.min(r.achievement, 100);
      return `
        <div class="region-row region-row--${cls} ${highlightedRegion === r.name ? 'is-highlighted' : ''}" data-region="${r.name.replace(/"/g, '&quot;')}">
          <div class="region-row__rank">${i + 1}</div>
          <div class="region-row__main">
            <div class="region-row__name">${r.name}</div>
            <div class="region-row__bar"><div class="region-row__bar-fill" style="width:${w}%"></div></div>
          </div>
          <div class="region-row__pct">${fmt(r.achievement)}%</div>
        </div>`;
    }).join('');

    list.querySelectorAll('.region-row').forEach(el => {
      el.addEventListener('click', () => {
        const name = el.dataset.region;
        highlightedRegion = (highlightedRegion === name) ? null : name;
        renderRegions();
        zoomMapToRegion(name);
      });
    });
  }

  // ================= MAP =================
  const TILE_LAYERS = {
    light: {
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd'
    },
    dark: {
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd'
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri'
    }
  };

  function initMap() {
    map = L.map('map', { center: [7.6, -5.5], zoom: 6, zoomControl: true });
    setMapLayer(currentMapLayer);
  }

  function setMapLayer(layerKey) {
    if (tileLayer) map.removeLayer(tileLayer);
    const conf = TILE_LAYERS[layerKey];
    tileLayer = L.tileLayer(conf.url, {
      attribution: conf.attribution,
      subdomains: conf.subdomains || 'abc',
      maxZoom: 18
    }).addTo(map);
    currentMapLayer = layerKey;

    // Ajuster les bordures des features selon le calque (blanc sur clair, sombre sur dark)
    if (geoLayer) refreshMapStyle();
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

  function getStrokeColor() {
    return currentMapLayer === 'dark' ? '#1E293B' : '#fff';
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
      color: isHighlighted ? '#137EB4' : getStrokeColor(),
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
          renderRegions();
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

  // ================= CHANGE HANDLERS =================
  function onActivityChange(code) {
    currentActivityCode = code;
    currentYear = null;
    highlightedRegion = null;
    activeKpiFilter = null;
    updateActivityTrigger();
    renderHeader();
    renderKpis();
    renderYearPills();
    renderChart();
    renderRegions();
    refreshMapStyle();
  }

  function onGeoLevelChange(levelId) {
    currentGeoLevelId = levelId;
    highlightedRegion = null;
    updateGeoTrigger();
    renderKpis();
    renderRegions();
    loadGeoJson();
  }

  // ================= INIT =================
  function init() {
    buildSelector(
      'activityTrigger', 'activityDropdown',
      ACTIVITY_DATA.activities.map(a => ({ value: a.code, label: `${a.code}: ${a.name}` })),
      currentActivityCode, onActivityChange, { searchable: true }
    );
    buildSelector(
      'geoTrigger', 'geoDropdown',
      ACTIVITY_DATA.geoLevels.map(l => ({ value: l.id, label: l.label })),
      currentGeoLevelId, onGeoLevelChange, { searchable: false }
    );

    // Toggle layer carte
    document.querySelectorAll('input[name="mapLayer"]').forEach(input => {
      input.addEventListener('change', e => setMapLayer(e.target.value));
    });

    updateActivityTrigger();
    updateGeoTrigger();
    renderHeader();
    renderKpis();
    bindKpiClicks();
    renderYearPills();
    renderChart();
    renderRegions();

    initMap();
    loadGeoJson();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', Activity3.init);
