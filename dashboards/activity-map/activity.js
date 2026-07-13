/* =========================================================
   DASHBOARD ACTIVITY-MAP - Option D : Map-first
   ========================================================= */

const MapDashboard = (() => {

  let currentActivityCode = ACTIVITY_DATA.activities[0].code;
  let currentGeoLevelId = 'level1';
  let selectedRegion = null;        // null = vue nationale, sinon nom de région
  let sidebarCollapsed = false;
  let isFullscreen = false;
  let chartInstance = null;
  let map = null;
  let geoLayer = null;
  let regionMarkers = [];

  // ================= HELPERS =================
  const fmt = n => (n === null || n === undefined) ? '—' : n.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
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

  // ================= SÉLECTEURS =================
  function buildSelector(triggerId, dropdownId, items, getCurrentValue, onSelect, opts = {}) {
    const trigger = document.getElementById(triggerId);
    const dropdown = document.getElementById(dropdownId);
    const searchable = opts.searchable !== false;

    function render(filter = '') {
      const filtered = items.filter(it =>
        !filter || it.label.toLowerCase().includes(filter.toLowerCase())
      );

      const cv = getCurrentValue();
      const searchHtml = searchable ? `
        <div class="mp-selector__search">
          <input type="text" placeholder="Rechercher..." value="${filter}">
        </div>` : '';

      dropdown.innerHTML = searchHtml + filtered.map(it => `
        <button class="mp-selector__option ${it.value === cv ? 'is-selected' : ''}" data-value="${it.value}">
          <i class="fas fa-check mp-selector__option-check"></i>
          <span>${it.label}</span>
        </button>
      `).join('');

      if (searchable) {
        const input = dropdown.querySelector('.mp-selector__search input');
        input.addEventListener('input', e => render(e.target.value));
        input.addEventListener('click', e => e.stopPropagation());
        setTimeout(() => input.focus(), 50);
      }

      dropdown.querySelectorAll('.mp-selector__option').forEach(btn => {
        btn.addEventListener('click', () => { onSelect(btn.dataset.value); close(); });
      });
    }

    function open() {
      document.querySelectorAll('.mp-selector__dropdown.is-open').forEach(d => {
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

  // ================= SIDEBAR : header (constant) =================
  function renderSidebarHeader() {
    const a = getActivity(currentActivityCode);
    document.getElementById('sidebarCode').textContent = a.code;
    document.getElementById('sidebarTitle').textContent = a.name;

    const statusEl = document.getElementById('sidebarStatus');
    statusEl.textContent = a.status;
    statusEl.dataset.status = a.status;
  }

  // ================= SIDEBAR : contexte (national vs région) =================
  function renderContext() {
    const ctxName = document.getElementById('contextName');
    const ctxClear = document.getElementById('contextClear');
    if (selectedRegion) {
      ctxName.textContent = selectedRegion;
      ctxClear.classList.remove('is-hidden');
    } else {
      const lvl = ACTIVITY_DATA.geoLevels.find(l => l.id === currentGeoLevelId);
      ctxName.textContent = `Vue ${lvl.label.split('(')[0].trim()} (global)`;
      ctxClear.classList.add('is-hidden');
    }
  }

  // ================= SIDEBAR : KPIs =================
  function renderKpis() {
    const a = getActivity(currentActivityCode);
    const k = getKpis(a, currentGeoLevelId);

    let values;
    if (selectedRegion && k.regions[selectedRegion]) {
      values = k.regions[selectedRegion];
    } else {
      values = { budget: k.budget, physique: k.physique, achievement: k.achievement };
    }

    setKpi('Budget', values.budget);
    setKpi('Physique', values.physique);
    setKpi('Achievement', values.achievement);
  }

  function setKpi(suffix, value) {
    document.getElementById('kpi' + suffix + 'Value').textContent = fmt(value);
    const w = Math.min(value, 100);
    document.getElementById('kpi' + suffix + 'Bar').style.width = w + '%';
  }

  // ================= SIDEBAR : graphe =================
  function renderChart() {
    const a = getActivity(currentActivityCode);
    const ctx = document.getElementById('mpChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();

    const grad = ctx.createLinearGradient(0, 0, 0, 180);
    grad.addColorStop(0, 'rgba(19,126,180,0.35)');
    grad.addColorStop(1, 'rgba(19,126,180,0)');

    chartInstance = new Chart(ctx, {
      data: {
        labels: a.yearly.labels,
        datasets: [
          {
            type: 'line',
            label: '% Budget',
            data: a.yearly.budget,
            borderColor: '#137EB4',
            backgroundColor: grad,
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointBackgroundColor: '#fff',
            pointBorderColor: '#137EB4',
            pointBorderWidth: 1.5,
            pointRadius: 3,
            pointHoverRadius: 6
          },
          {
            type: 'line',
            label: '% Physique',
            data: a.yearly.physique,
            borderColor: '#D4A574',
            borderWidth: 2,
            tension: 0.4,
            pointBackgroundColor: '#fff',
            pointBorderColor: '#D4A574',
            pointBorderWidth: 1.5,
            pointRadius: 3,
            pointHoverRadius: 6,
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
            labels: { padding: 8, font: { size: 10, family: "'Inter', sans-serif" }, usePointStyle: true, pointStyle: 'circle', color: '#4D5A65', boxWidth: 6 }
          },
          tooltip: {
            backgroundColor: '#131A20', padding: 8, cornerRadius: 6,
            titleColor: '#F1F6F9', bodyColor: '#D2DDE5', titleFont: { size: 11 }, bodyFont: { size: 11 },
            callbacks: { label: ctx => `${ctx.dataset.label} : ${fmt(ctx.parsed.y)}%` }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(181,194,204,0.3)' },
            ticks: { font: { size: 9 }, color: '#6A7884', maxTicksLimit: 4 }
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 9, weight: '500' }, color: '#4D5A65' }
          }
        }
      }
    });
  }

  // ================= SIDEBAR : metadata + comments =================
  function renderMetadata() {
    const a = getActivity(currentActivityCode);
    document.getElementById('mpMetaChips').innerHTML = `
      <div class="mp-meta-chip"><i class="fas fa-ruler"></i><span>Unité</span><strong>${a.unit}</strong></div>
      <div class="mp-meta-chip"><i class="fas fa-user"></i><span>Resp.</span><strong>${a.responsible}</strong></div>
      <div class="mp-meta-chip"><i class="far fa-calendar-check"></i><span>Début</span><strong>${fmtDate(a.startDate)}</strong></div>
      <div class="mp-meta-chip"><i class="far fa-calendar-times"></i><span>Fin</span><strong>${fmtDate(a.endDate)}</strong></div>
    `;
    document.getElementById('mpComments').textContent = a.comments;
  }

  function renderSidebar() {
    renderSidebarHeader();
    renderContext();
    renderKpis();
    renderChart();
    renderMetadata();
  }

  // ================= MAP =================
  function initMap() {
    map = L.map('map', {
      center: [7.6, -5.5],
      zoom: 6,
      zoomControl: false,
      attributionControl: true
    });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd', maxZoom: 18
    }).addTo(map);

    // Click sur la carte (hors région) = retour vue nationale
    map.on('click', () => {
      if (selectedRegion) {
        selectedRegion = null;
        renderSidebar();
        refreshMapStyle();
        refreshRegionMarkers();
        try { map.fitBounds(geoLayer.getBounds(), { padding: [40, 40] }); } catch (e) {}
      }
    });
  }

  async function loadGeoJson() {
    const lvl = ACTIVITY_DATA.geoLevels.find(l => l.id === currentGeoLevelId);
    const loadingEl = document.getElementById('mapLoading');
    loadingEl.classList.remove('is-hidden');

    if (geoLayer) { map.removeLayer(geoLayer); geoLayer = null; }
    clearMarkers();

    try {
      const res = await fetch(lvl.geoUrl);
      const geojson = await res.json();
      drawGeoLayer(geojson, lvl.nameProp);
    } catch (err) {
      console.error('Erreur GeoJSON :', err);
      loadingEl.innerHTML = `<i class="fas fa-triangle-exclamation" style="font-size:24px;color:var(--danger)"></i>
        <p>Impossible de charger la carte</p>`;
      return;
    }
    loadingEl.classList.add('is-hidden');
  }

  function styleFeature(feature, nameProp, regions) {
    const name = feature.properties[nameProp];
    const r = regions[name];
    const value = r ? r.achievement : null;
    const isSelected = selectedRegion === name;
    return {
      fillColor: getChoroColor(value),
      weight: isSelected ? 3 : 1.2,
      opacity: 1,
      color: isSelected ? '#137EB4' : '#fff',
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
          <div class="region-tooltip__hint">Cliquez pour voir le détail dans le panneau</div>
        ` : `<div class="region-tooltip__name">${name}</div><div style="opacity:0.7">Pas de données</div>`;

        layer.bindTooltip(tooltipContent, { className: 'region-tooltip', sticky: true, direction: 'top' });

        layer.on('mouseover', () => {
          if (selectedRegion !== name) {
            layer.setStyle({ weight: 2.5, color: '#137EB4' });
            layer.bringToFront();
          }
        });
        layer.on('mouseout', () => geoLayer.resetStyle(layer));
        layer.on('click', e => {
          L.DomEvent.stopPropagation(e);
          if (!r) return;
          selectedRegion = (selectedRegion === name) ? null : name;
          renderSidebar();
          refreshMapStyle();
          refreshRegionMarkers();
          if (selectedRegion) {
            try { map.fitBounds(layer.getBounds(), { padding: [60, 60], maxZoom: 9 }); } catch (e) {}
          } else {
            try { map.fitBounds(geoLayer.getBounds(), { padding: [40, 40] }); } catch (e) {}
          }
          if (sidebarCollapsed) toggleSidebar();
        });
      }
    }).addTo(map);

    try { map.fitBounds(geoLayer.getBounds(), { padding: [40, 40] }); } catch (e) {}
    drawRegionMarkers();
  }

  function refreshMapStyle() {
    if (!geoLayer) return;
    const a = getActivity(currentActivityCode);
    const k = getKpis(a, currentGeoLevelId);
    const regions = k.regions || {};
    const lvl = ACTIVITY_DATA.geoLevels.find(l => l.id === currentGeoLevelId);
    geoLayer.setStyle(feature => styleFeature(feature, lvl.nameProp, regions));
  }

  // ================= MARKERS FLOTTANTS =================
  function clearMarkers() {
    regionMarkers.forEach(m => map.removeLayer(m));
    regionMarkers = [];
  }

  function drawRegionMarkers() {
    clearMarkers();
    const a = getActivity(currentActivityCode);
    const k = getKpis(a, currentGeoLevelId);
    const regions = k.regions || {};

    geoLayer.eachLayer(layer => {
      const lvl = ACTIVITY_DATA.geoLevels.find(l => l.id === currentGeoLevelId);
      const name = layer.feature.properties[lvl.nameProp];
      const r = regions[name];
      if (!r) return;

      const center = layer.getBounds().getCenter();
      const cls = classify(r.achievement);
      const isSel = selectedRegion === name;

      const html = `
        <div class="mp-region-marker mp-region-marker--${cls} ${isSel ? 'is-selected' : ''}" data-region="${name.replace(/"/g, '&quot;')}">
          <span class="mp-region-marker__pct">${fmt(r.achievement)}%</span>
          <span class="mp-region-marker__name">${name}</span>
        </div>
      `;

      const icon = L.divIcon({
        className: 'mp-region-marker-wrapper',
        html: html,
        iconSize: null,
        iconAnchor: [0, 0]
      });

      const marker = L.marker(center, { icon, riseOnHover: true });

      marker.on('click', e => {
        L.DomEvent.stopPropagation(e);
        selectedRegion = (selectedRegion === name) ? null : name;
        renderSidebar();
        refreshMapStyle();
        refreshRegionMarkers();
        if (selectedRegion) {
          try { map.fitBounds(layer.getBounds(), { padding: [60, 60], maxZoom: 9 }); } catch (e) {}
        }
        if (sidebarCollapsed) toggleSidebar();
      });

      marker.addTo(map);
      regionMarkers.push(marker);
    });
  }

  function refreshRegionMarkers() {
    drawRegionMarkers();
  }

  // ================= SIDEBAR TOGGLE =================
  function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
    document.getElementById('mpSidebar').classList.toggle('is-collapsed', sidebarCollapsed);
    document.getElementById('mpSidebarToggle').classList.toggle('is-collapsed', sidebarCollapsed);
    setTimeout(() => map.invalidateSize(), 420);
  }

  // ================= FULLSCREEN =================
  function toggleFullscreen() {
    isFullscreen = !isFullscreen;
    document.querySelector('.mp-app').classList.toggle('is-fullscreen', isFullscreen);
    document.getElementById('mpFullscreenBtn').classList.toggle('is-active', isFullscreen);
    setTimeout(() => map.invalidateSize(), 420);
  }

  // ================= CHANGE HANDLERS =================
  function onActivityChange(code) {
    currentActivityCode = code;
    selectedRegion = null;
    updateActivityTrigger();
    renderSidebar();
    refreshMapStyle();
    refreshRegionMarkers();
  }

  function onGeoLevelChange(levelId) {
    currentGeoLevelId = levelId;
    selectedRegion = null;
    updateGeoTrigger();
    renderSidebar();
    loadGeoJson();
  }

  // ================= INIT =================
  function init() {
    buildSelector(
      'activityTrigger', 'activityDropdown',
      ACTIVITY_DATA.activities.map(a => ({ value: a.code, label: `${a.code}: ${a.name}` })),
      () => currentActivityCode, onActivityChange, { searchable: true }
    );
    buildSelector(
      'geoTrigger', 'geoDropdown',
      ACTIVITY_DATA.geoLevels.map(l => ({ value: l.id, label: l.label })),
      () => currentGeoLevelId, onGeoLevelChange, { searchable: false }
    );

    document.getElementById('mpSidebarToggle').addEventListener('click', toggleSidebar);
    document.getElementById('mpFullscreenBtn').addEventListener('click', toggleFullscreen);
    document.getElementById('contextClear').addEventListener('click', () => {
      selectedRegion = null;
      renderSidebar();
      refreshMapStyle();
      refreshRegionMarkers();
      try { map.fitBounds(geoLayer.getBounds(), { padding: [40, 40] }); } catch (e) {}
    });

    updateActivityTrigger();
    updateGeoTrigger();
    renderSidebar();

    initMap();
    loadGeoJson();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', MapDashboard.init);
