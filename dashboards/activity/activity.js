/* =========================================================
   DASHBOARD ACTIVITY - Logique
   ========================================================= */

const ActivityDashboard = (() => {

  // === État ===
  let currentActivityCode = ACTIVITY_DATA.activities[0].code;
  let currentGeoLevelId = 'level1';        // par défaut sur les régions
  const MAP_METRIC = 'achievement';         // métrique fixe : % Achèvement
  let currentYear = null;                   // null = toutes années
  let selectedRegion = null;                // null = vue globale, sinon nom de la région
  let chartInstance = null;
  let map = null;
  let geoLayer = null;

  // ====================================================
  // HELPERS
  // ====================================================
  const fmt = n => (n === null || n === undefined) ? '—' : n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  const fmtDate = d => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

  function getActivity(code) {
    return ACTIVITY_DATA.activities.find(a => a.code === code);
  }

  function getKpis(activity, levelId) {
    return activity.kpis[levelId] || activity.kpis.level1;
  }

  function getGaugeClass(value) {
    if (value > 100) return 'gauge--over';
    if (value >= 70) return 'gauge--high';
    if (value >= 40) return 'gauge--mid';
    return 'gauge--low';
  }

  // Échelle de couleurs pour la choroplèthe (bleu primaire dégradé)
  function getChoroColor(value) {
    if (value === null || value === undefined) return '#E4ECF2';
    if (value >= 80) return '#0F6796';
    if (value >= 60) return '#137EB4';
    if (value >= 40) return '#5BA3CB';
    if (value >= 20) return '#9DC8E0';
    return '#D5E5EE';
  }

  // ====================================================
  // SÉLECTEURS CUSTOM
  // ====================================================
  function buildSelector(triggerId, dropdownId, items, currentValue, onSelect, opts = {}) {
    const trigger = document.getElementById(triggerId);
    const dropdown = document.getElementById(dropdownId);
    const searchable = opts.searchable !== false;

    function render(filter = '') {
      const filtered = items.filter(it =>
        !filter ||
        it.label.toLowerCase().includes(filter.toLowerCase()) ||
        (it.value || '').toLowerCase().includes(filter.toLowerCase())
      );

      const searchHtml = searchable ? `
        <div class="selector__search">
          <input type="text" placeholder="Recherche" value="${filter}">
        </div>` : '';

      dropdown.innerHTML = searchHtml + filtered.map(it => `
        <button class="selector__option ${it.value === currentValue ? 'is-selected' : ''}" data-value="${it.value}">
          <i class="fas fa-check selector__option-check"></i>
          <span>${it.label}</span>
        </button>
      `).join('');

      // events
      if (searchable) {
        const input = dropdown.querySelector('.selector__search input');
        input.addEventListener('input', e => render(e.target.value));
        input.addEventListener('click', e => e.stopPropagation());
        setTimeout(() => input.focus(), 50);
      }

      dropdown.querySelectorAll('.selector__option').forEach(btn => {
        btn.addEventListener('click', () => {
          onSelect(btn.dataset.value);
          close();
        });
      });
    }

    function open() {
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
    document.getElementById('activityTriggerLabel').textContent = `${a.code} – ${a.name}`;
  }

  function updateGeoTrigger() {
    const lvl = ACTIVITY_DATA.geoLevels.find(l => l.id === currentGeoLevelId);
    document.getElementById('geoTriggerLabel').textContent = lvl.label;
  }

  // ====================================================
  // MÉTADONNÉES
  // ====================================================
  function renderMetadata() {
    const a = getActivity(currentActivityCode);
    document.getElementById('metaUnit').textContent = a.unit;
    document.getElementById('metaResponsible').textContent = a.responsible;
    document.getElementById('metaStartDate').textContent = fmtDate(a.startDate);
    document.getElementById('metaEndDate').textContent = fmtDate(a.endDate);
    const statusEl = document.getElementById('metaStatus');
    statusEl.textContent = a.status;
    statusEl.dataset.status = a.status;
    document.getElementById('comments').textContent = a.comments;
  }

  // ====================================================
  // GAUGES (SVG arc)
  // ====================================================
  function renderGauge(rootId, value, label) {
    const root = document.getElementById(rootId);
    const radius = 80;
    const circumference = Math.PI * radius;     // demi-cercle
    const displayValue = Math.min(value, 200);   // cap visuel
    const ratio = Math.min(displayValue / 100, 2); // si over 100, on continue jusqu'à 200%
    const offset = circumference - (Math.min(ratio, 1) * circumference);
    const overOffset = ratio > 1 ? circumference - ((ratio - 1) * circumference) : circumference;

    const cls = getGaugeClass(value);
    root.className = `gauge ${cls}`;

    root.innerHTML = `
      <svg class="gauge__svg" viewBox="0 0 200 110">
        <path class="gauge__track"
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none" stroke-width="14" stroke-linecap="round"/>
        <path class="gauge__fill"
              d="M 20 100 A 80 80 0 0 1 180 100"
              stroke-width="14"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${offset}"/>
        ${ratio > 1 ? `
        <path class="gauge__fill" style="stroke:var(--primary);opacity:0.5"
              d="M 20 100 A 80 80 0 0 1 180 100"
              stroke-width="14"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${overOffset}"/>` : ''}
        <text class="gauge__value-text" x="100" y="92" text-anchor="middle">
          ${value.toFixed(2).replace('.', ',')}%
        </text>
      </svg>
      <div class="gauge__label">${label}</div>
    `;
  }

  function renderGauges() {
    const a = getActivity(currentActivityCode);
    const k = getKpis(a, currentGeoLevelId);

    // Si une région est sélectionnée, on affiche ses valeurs ; sinon les valeurs globales
    let values;
    if (selectedRegion && k.regions && k.regions[selectedRegion]) {
      values = k.regions[selectedRegion];
    } else {
      values = { budget: k.budget, physique: k.physique, achievement: k.achievement };
    }

    renderGauge('gaugeBudget',      values.budget,      '% Budget');
    renderGauge('gaugePhysique',    values.physique,    '% Physique');
    renderGauge('gaugeAchievement', values.achievement, '% Achèvement');

    // Mise à jour du sous-titre du bandeau de gauges
    const subtitle = document.getElementById('gaugesSubtitle');
    if (subtitle) {
      subtitle.textContent = selectedRegion
        ? `Région sélectionnée : ${selectedRegion}`
        : 'Indicateurs clés au niveau géographique sélectionné';
    }
  }

  function renderRegionPanel() {
    const panel = document.getElementById('regionPanel');
    if (!panel) return;

    if (!selectedRegion) {
      panel.classList.add('is-hidden');
      return;
    }

    const a = getActivity(currentActivityCode);
    const k = getKpis(a, currentGeoLevelId);
    const r = k.regions[selectedRegion];
    if (!r) {
      panel.classList.add('is-hidden');
      return;
    }

    panel.classList.remove('is-hidden');
    document.getElementById('regionPanelName').textContent = selectedRegion;
    document.getElementById('regionPanelBudget').textContent = fmt(r.budget) + '%';
    document.getElementById('regionPanelPhysique').textContent = fmt(r.physique) + '%';
    document.getElementById('regionPanelAchievement').textContent = fmt(r.achievement) + '%';

    // Re-rendre les gauges avec les valeurs régionales
    renderGauges();
  }

  // ====================================================
  // GRAPHE
  // ====================================================
  function renderYearPills() {
    const a = getActivity(currentActivityCode);
    const wrap = document.getElementById('yearPillsRow');
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

    const grad = ctx.createLinearGradient(0, 0, 0, 380);
    grad.addColorStop(0, 'rgba(19,126,180,0.4)');
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
            borderRadius: 8,
            maxBarThickness: 80
          },
          {
            type: 'line',
            label: '% Physique',
            data: physique,
            borderColor: '#D4A574',
            backgroundColor: '#D4A574',
            borderWidth: 3,
            tension: 0.35,
            pointBackgroundColor: '#fff',
            pointBorderColor: '#D4A574',
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
            labels: { padding: 16, font: { size: 12, family: "'Inter', sans-serif" }, usePointStyle: true, pointStyle: 'circle', color: '#4D5A65' }
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
            ticks: { font: { size: 11 }, color: '#6A7884', callback: v => v + ' %' }
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 12, weight: '500' }, color: '#4D5A65' }
          }
        }
      }
    });
  }

  // ====================================================
  // CARTE LEAFLET
  // ====================================================
  function initMap() {
    map = L.map('map', {
      center: [7.6, -5.5],
      zoom: 6,
      zoomControl: true,
      attributionControl: true
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 18
    }).addTo(map);
  }

  async function loadGeoJson() {
    const lvl = ACTIVITY_DATA.geoLevels.find(l => l.id === currentGeoLevelId);
    const loadingEl = document.getElementById('mapLoading');
    loadingEl.classList.remove('is-hidden');

    if (geoLayer) {
      map.removeLayer(geoLayer);
      geoLayer = null;
    }

    try {
      const res = await fetch(lvl.geoUrl);
      const geojson = await res.json();
      drawGeoLayer(geojson, lvl.nameProp);
    } catch (err) {
      console.error('Erreur chargement GeoJSON :', err);
      loadingEl.innerHTML = `<i class="fas fa-triangle-exclamation" style="font-size:24px;color:var(--danger)"></i>
        <p>Impossible de charger la carte<br><small>${lvl.label}</small></p>`;
      return;
    }
    loadingEl.classList.add('is-hidden');
  }

  function drawGeoLayer(geojson, nameProp) {
    const a = getActivity(currentActivityCode);
    const k = getKpis(a, currentGeoLevelId);
    const regions = k.regions || {};

    geoLayer = L.geoJSON(geojson, {
      style: feature => styleFeature(feature, nameProp, regions),
      onEachFeature: (feature, layer) => {
        const name = feature.properties[nameProp];
        layer.bindTooltip(buildTooltip(name, regions[name]), {
          className: 'region-tooltip',
          sticky: true,
          direction: 'top'
        });

        layer.on('mouseover', () => {
          if (selectedRegion !== name) {
            layer.setStyle({ weight: 2.5, color: '#137EB4' });
            layer.bringToFront();
          }
        });
        layer.on('mouseout', () => {
          if (selectedRegion !== name) geoLayer.resetStyle(layer);
        });

        layer.on('click', e => {
          L.DomEvent.stopPropagation(e);
          if (!regions[name]) return;
          if (selectedRegion === name) clearSelection();
          else selectRegion(name);
        });
      }
    }).addTo(map);

    // Clic dans le vide = retour vue globale
    map.off('click');
    map.on('click', () => { if (selectedRegion) clearSelection(); });

    // Recadre la carte sur les features chargées
    try {
      map.fitBounds(geoLayer.getBounds(), { padding: [20, 20] });
    } catch (e) { /* ignore */ }
  }

  function styleFeature(feature, nameProp, regions) {
    const name = feature.properties[nameProp];
    const r = regions[name];
    const value = r ? r[MAP_METRIC] : null;
    const isSelected = selectedRegion === name;
    return {
      fillColor: getChoroColor(value),
      weight: isSelected ? 3.5 : 1.2,
      opacity: 1,
      color: isSelected ? '#137EB4' : '#fff',
      fillOpacity: value !== null && value !== undefined ? (isSelected ? 1 : 0.85) : 0.3,
      dashArray: isSelected ? '' : null
    };
  }

  function buildTooltip(name, r) {
    if (!r) return `<div class="region-tooltip__name">${name}</div><div style="opacity:0.7">Pas de données</div>`;
    return `
      <div class="region-tooltip__name">${name}</div>
      <div class="region-tooltip__row"><span>% Budget</span><strong>${fmt(r.budget)}%</strong></div>
      <div class="region-tooltip__row"><span>% Physique</span><strong>${fmt(r.physique)}%</strong></div>
      <div class="region-tooltip__row"><span>% Achèvement</span><strong>${fmt(r.achievement)}%</strong></div>
      <div class="region-tooltip__hint">${selectedRegion === name ? 'Cliquez pour désélectionner' : 'Cliquez pour zoomer'}</div>
    `;
  }

  function selectRegion(name) {
    selectedRegion = name;
    refreshMapStyle();
    renderRegionPanel();
    // Zoom sur la région
    geoLayer.eachLayer(layer => {
      const lvl = ACTIVITY_DATA.geoLevels.find(l => l.id === currentGeoLevelId);
      if (layer.feature.properties[lvl.nameProp] === name) {
        try { map.fitBounds(layer.getBounds(), { padding: [40, 40], maxZoom: 9 }); } catch (e) {}
      }
    });
  }

  function clearSelection() {
    selectedRegion = null;
    refreshMapStyle();
    renderRegionPanel();
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
      layer.setTooltipContent(buildTooltip(name, regions[name]));
      if (selectedRegion === name) layer.bringToFront();
    });
  }

  // ====================================================
  // ÉVÉNEMENTS
  // ====================================================
  function onActivityChange(code) {
    currentActivityCode = code;
    currentYear = null;
    selectedRegion = null;
    updateActivityTrigger();
    renderMetadata();
    renderGauges();
    renderRegionPanel();
    renderYearPills();
    renderChart();
    refreshMapStyle();
  }

  function onGeoLevelChange(levelId) {
    currentGeoLevelId = levelId;
    selectedRegion = null;
    updateGeoTrigger();
    renderGauges();
    renderRegionPanel();
    loadGeoJson();
  }

  // ====================================================
  // INIT
  // ====================================================
  function init() {
    // Sélecteur activité
    buildSelector(
      'activityTrigger', 'activityDropdown',
      ACTIVITY_DATA.activities.map(a => ({ value: a.code, label: `${a.code}: ${a.name}` })),
      currentActivityCode,
      onActivityChange,
      { searchable: true }
    );

    // Sélecteur niveau géographique
    buildSelector(
      'geoTrigger', 'geoDropdown',
      ACTIVITY_DATA.geoLevels.map(l => ({ value: l.id, label: l.label })),
      currentGeoLevelId,
      onGeoLevelChange,
      { searchable: false }
    );

    // Bouton X du panneau région
    const closeBtn = document.getElementById('regionPanelClose');
    if (closeBtn) closeBtn.addEventListener('click', clearSelection);

    updateActivityTrigger();
    updateGeoTrigger();
    renderMetadata();
    renderGauges();
    renderRegionPanel();
    renderYearPills();
    renderChart();

    initMap();
    loadGeoJson();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', ActivityDashboard.init);
