/* =========================================================
   MAP EXPLORER — Option D · Map-first + glassmorphism
   - Carte plein écran avec choroplèthe dynamique
   - Drill-down régional : clic = zoom + highlight + KPIs filtrés
   - Sélecteurs indicateur / niveau géo / validation
   - Recherche d'adresse / région avec autocomplete
   - Multi-fonds de carte (5 thèmes)
   - Couches togglables (choroplèthe / marqueurs / étiquettes / limites)
   - Panneaux flottants rétractables
   ========================================================= */

const MapExplorer = (() => {

  // ====================================================
  // ÉTAT
  // ====================================================
  let map = null;
  let geoLayer = null;
  let labelsLayer = null;
  let markersLayer = null;
  let baseTileLayer = null;
  let geoData = null; // GeoJSON courant en mémoire (pour réutiliser sans refetch)

  // Couches démo (Leaflet groups)
  const demoLayers = {
    beneficiaires: null,
    health: null,
    roads: null,
    villages: null
  };

  const state = {
    indicatorCode: null,
    geoLevelId: 'level1',
    validatedOnly: false,
    selectedRegion: null,
    basemap: 'light',
    layers: {
      choro: true,
      markers: false,
      labels: true,
      boundaries: true,
      beneficiaires: false,
      health: false,
      roads: false,
      villages: false
    }
  };

  // ====================================================
  // DONNÉES DÉMO (synthétiques, dispersées sur la CIV)
  // ====================================================
  // Centres de santé : coordonnées approximatives (lat, lng)
  const HEALTH_CENTERS = [
    { name: 'CHU Treichville',     lat: 5.286, lng: -3.989 },
    { name: 'CHR Bouaké',          lat: 7.687, lng: -5.034 },
    { name: 'CHR Yamoussoukro',    lat: 6.811, lng: -5.276 },
    { name: 'CSU Korhogo',         lat: 9.460, lng: -5.628 },
    { name: 'CSU San-Pédro',       lat: 4.747, lng: -6.636 },
    { name: 'CSR Daloa',           lat: 6.880, lng: -6.450 },
    { name: 'CSR Man',             lat: 7.401, lng: -7.554 },
    { name: 'CSR Odienné',         lat: 9.502, lng: -7.566 },
    { name: 'CSR Abengourou',      lat: 6.730, lng: -3.490 },
    { name: 'CSR Bouna',           lat: 9.265, lng: -2.998 },
    { name: 'CSR Bondoukou',       lat: 8.040, lng: -2.797 },
    { name: 'CSR Gagnoa',          lat: 6.131, lng: -5.950 },
    { name: 'CSR Soubré',          lat: 5.785, lng: -6.609 },
    { name: 'CSR Aboisso',         lat: 5.470, lng: -3.207 },
    { name: 'CSR Divo',            lat: 5.838, lng: -5.357 },
    { name: 'CSR Touba',           lat: 8.282, lng: -7.683 },
    { name: 'CSR Ferkessédougou',  lat: 9.594, lng: -5.197 },
    { name: 'CSR Tiassalé',        lat: 5.898, lng: -4.823 }
  ];

  // Pistes PDAC : LineStrings entre points
  const ROADS = [
    { name: 'Piste PDAC 1 — Yamoussoukro / Bouaké',  coords: [[6.811, -5.276], [7.000, -5.150], [7.300, -5.080], [7.687, -5.034]] },
    { name: 'Piste PDAC 2 — Daloa / Man',             coords: [[6.880, -6.450], [7.000, -6.800], [7.150, -7.200], [7.401, -7.554]] },
    { name: 'Piste PDAC 3 — Korhogo / Ferké',         coords: [[9.460, -5.628], [9.500, -5.500], [9.550, -5.350], [9.594, -5.197]] },
    { name: 'Piste PDAC 4 — Abidjan / Aboisso',       coords: [[5.286, -3.989], [5.350, -3.700], [5.420, -3.450], [5.470, -3.207]] },
    { name: 'Piste PDAC 5 — Soubré / San-Pédro',      coords: [[5.785, -6.609], [5.450, -6.620], [5.100, -6.625], [4.747, -6.636]] }
  ];

  // Villages couverts (génération pseudo-aléatoire dans CIV bbox)
  function generateRandomPoints(count, seed = 1) {
    const points = [];
    const rng = mulberry32(seed);
    // BBox CIV approximative : lat 4.5-10.7, lng -8.5 à -2.5
    for (let i = 0; i < count; i++) {
      points.push({
        lat: 4.7 + rng() * 5.8,
        lng: -8.0 + rng() * 5.3
      });
    }
    return points;
  }
  function mulberry32(seed) {
    let t = seed;
    return function() {
      t = (t + 0x6D2B79F5) | 0;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }
  const VILLAGES = generateRandomPoints(42, 7);
  const BENEFICIAIRES = generateRandomPoints(120, 13);

  // ====================================================
  // CONFIGURATION FONDS DE CARTE
  // ====================================================
  const BASEMAPS = {
    light: {
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd', maxZoom: 19
    },
    dark: {
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd', maxZoom: 19
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri · World Imagery',
      maxZoom: 19
    },
    terrain: {
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attribution: '&copy; OpenStreetMap &copy; OpenTopoMap',
      subdomains: 'abc', maxZoom: 17
    },
    streets: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; OpenStreetMap',
      subdomains: 'abc', maxZoom: 19
    }
  };

  // ====================================================
  // HELPERS
  // ====================================================
  const fmt = (n, max = 1) => (n === null || n === undefined) ? '—'
    : n.toLocaleString('fr-FR', { maximumFractionDigits: max });
  const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  function getIndicator(code) {
    return INDICATOR_DATA.indicators.find(i => i.code === code) || null;
  }

  function getVisibleIndicators() {
    return state.validatedOnly
      ? INDICATOR_DATA.indicators.filter(i => i.validated)
      : INDICATOR_DATA.indicators;
  }

  function getKpisDef(ind) {
    return ind.kpis[state.geoLevelId] || ind.kpis.level1;
  }

  function unitSuffix(ind) {
    if (!ind) return '';
    return ind.unit === '%' ? '%' : ind.unit;
  }

  function computeAchievement(ind, value) {
    if (!ind || value === null || value === undefined) return null;
    const ref = ind.reference, tgt = ind.target;
    if (ind.direction === 'desc') {
      const span = ref - tgt;
      if (span <= 0) return null;
      return ((ref - value) / span) * 100;
    }
    const span = tgt - ref;
    if (span <= 0) return null;
    return ((value - ref) / span) * 100;
  }

  function getChoroColor(pct) {
    if (pct === null || pct === undefined) return '#E4ECF2';
    if (pct >= 100) return '#0F6796';
    if (pct >= 80)  return '#137EB4';
    if (pct >= 50)  return '#5BA3CB';
    if (pct >= 25)  return '#9DC8E0';
    return '#D5E5EE';
  }

  // ====================================================
  // INIT MAP
  // ====================================================
  function initMap() {
    map = L.map('map', {
      center: [7.6, -5.5],
      zoom: 7,
      zoomControl: false, // on a nos propres boutons
      attributionControl: true
    });

    setBasemap(state.basemap);

    // Click sur la carte (en dehors d'une région) → désélectionner
    map.on('click', e => {
      // Vérifier qu'on n'a pas cliqué sur un layer (Leaflet stoppera la propagation)
      if (state.selectedRegion) clearSelection();
    });
  }

  function setBasemap(name) {
    if (baseTileLayer) map.removeLayer(baseTileLayer);
    const cfg = BASEMAPS[name] || BASEMAPS.light;
    baseTileLayer = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      subdomains: cfg.subdomains,
      maxZoom: cfg.maxZoom
    }).addTo(map);
    state.basemap = name;

    // Met à jour l'UI thumbnails
    document.querySelectorAll('[data-basemap]').forEach(b => {
      b.classList.toggle('is-selected', b.dataset.basemap === name);
    });
  }

  // ====================================================
  // CHARGEMENT GEOJSON
  // ====================================================
  async function loadGeoJson() {
    showLoader(true);
    const lvl = INDICATOR_DATA.geoLevels.find(l => l.id === state.geoLevelId);
    if (!lvl) { showLoader(false); return; }

    if (geoLayer) { map.removeLayer(geoLayer); geoLayer = null; }
    if (labelsLayer) { map.removeLayer(labelsLayer); labelsLayer = null; }
    if (markersLayer) { map.removeLayer(markersLayer); markersLayer = null; }

    try {
      const res = await fetch(lvl.geoUrl);
      geoData = await res.json();
      drawAllLayers();
    } catch (err) {
      console.error('Erreur GeoJSON:', err);
      toast('Erreur de chargement de la carte');
    }
    showLoader(false);
  }

  // ====================================================
  // DESSIN COUCHES
  // ====================================================
  function drawAllLayers() {
    if (!geoData) return;
    const lvl = INDICATOR_DATA.geoLevels.find(l => l.id === state.geoLevelId);
    const ind = getIndicator(state.indicatorCode);
    if (!ind || !lvl) return;
    const k = getKpisDef(ind);
    const regions = k.regions || {};

    // === Choroplèthe (polygones colorés) ===
    if (state.layers.choro) {
      geoLayer = L.geoJSON(geoData, {
        style: f => styleFeature(f, lvl.nameProp, regions, ind),
        onEachFeature: (f, layer) => {
          const name = f.properties[lvl.nameProp];
          layer.bindTooltip(buildTooltip(name, regions[name], ind), {
            className: 'region-tooltip',
            sticky: true,
            direction: 'top'
          });
          layer.on('mouseover', () => {
            if (state.selectedRegion !== name) {
              layer.setStyle({ weight: 3, color: '#137EB4' });
              layer.bringToFront();
            }
          });
          layer.on('mouseout', () => {
            if (state.selectedRegion !== name && geoLayer) geoLayer.resetStyle(layer);
          });
          layer.on('click', e => {
            L.DomEvent.stopPropagation(e);
            if (regions[name] === undefined) return;
            if (state.selectedRegion === name) clearSelection();
            else selectRegion(name);
          });
        }
      }).addTo(map);

      // Recadrer sur la couche au premier chargement
      if (!state.selectedRegion) {
        try { map.fitBounds(geoLayer.getBounds(), { padding: [40, 40] }); } catch (e) {}
      }
    }

    // === Étiquettes des régions ===
    if (state.layers.labels) {
      labelsLayer = L.layerGroup();
      geoData.features.forEach(f => {
        const name = f.properties[lvl.nameProp];
        const layer = L.geoJSON(f);
        try {
          const center = layer.getBounds().getCenter();
          L.marker(center, {
            icon: L.divIcon({
              className: 'region-label',
              html: `<span>${escapeHtml(name)}</span>`,
              iconSize: null
            }),
            interactive: false
          }).addTo(labelsLayer);
        } catch (e) {}
      });
      labelsLayer.addTo(map);
    }

    // === Marqueurs régions (cercles colorés au centre) ===
    if (state.layers.markers) {
      markersLayer = L.layerGroup();
      geoData.features.forEach(f => {
        const name = f.properties[lvl.nameProp];
        const value = regions[name];
        if (value === undefined) return;
        const pct = computeAchievement(ind, value);
        const cls = pct >= 70 ? 'green' : pct >= 40 ? 'amber' : 'rose';
        const tmp = L.geoJSON(f);
        try {
          const center = tmp.getBounds().getCenter();
          L.marker(center, {
            icon: L.divIcon({
              className: 'mp-marker mp-marker--' + cls,
              html: '',
              iconSize: [12, 12]
            })
          }).addTo(markersLayer);
        } catch (e) {}
      });
      markersLayer.addTo(map);
    }
  }

  // ====================================================
  // COUCHES DÉMO (synthétiques)
  // ====================================================
  function buildDemoLayer(type) {
    if (type === 'beneficiaires') {
      const group = L.layerGroup();
      BENEFICIAIRES.forEach((p, i) => {
        L.circleMarker([p.lat, p.lng], {
          radius: 4,
          fillColor: '#06B6D4',
          color: '#0E7490',
          weight: 1.5,
          fillOpacity: 0.85
        }).bindTooltip(`Bénéficiaire #${i + 1}`, { className: 'region-tooltip' }).addTo(group);
      });
      return group;
    }
    if (type === 'health') {
      const group = L.layerGroup();
      HEALTH_CENTERS.forEach(c => {
        L.marker([c.lat, c.lng], {
          icon: L.divIcon({
            className: 'mp-pin-marker',
            html: '<i class="fas fa-hospital" style="color:#10B981;font-size:18px;text-shadow:0 1px 2px rgba(0,0,0,.3);background:#FFF;border-radius:50%;padding:4px;border:2px solid #10B981"></i>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          })
        }).bindTooltip(c.name, { className: 'region-tooltip' }).addTo(group);
      });
      return group;
    }
    if (type === 'roads') {
      const group = L.layerGroup();
      ROADS.forEach(r => {
        L.polyline(r.coords, {
          color: '#EF4444',
          weight: 4,
          opacity: 0.85,
          dashArray: '8, 6'
        }).bindTooltip(r.name, { className: 'region-tooltip' }).addTo(group);
      });
      return group;
    }
    if (type === 'villages') {
      const group = L.layerGroup();
      VILLAGES.forEach((p, i) => {
        L.circleMarker([p.lat, p.lng], {
          radius: 3,
          fillColor: '#8B5CF6',
          color: '#FFFFFF',
          weight: 1,
          fillOpacity: 1
        }).bindTooltip(`Village #${i + 1}`, { className: 'region-tooltip' }).addTo(group);
      });
      return group;
    }
    return null;
  }

  function toggleDemoLayer(type, on) {
    if (on) {
      if (!demoLayers[type]) demoLayers[type] = buildDemoLayer(type);
      if (demoLayers[type] && !map.hasLayer(demoLayers[type])) {
        demoLayers[type].addTo(map);
      }
    } else {
      if (demoLayers[type] && map.hasLayer(demoLayers[type])) {
        map.removeLayer(demoLayers[type]);
      }
    }
  }

  function styleFeature(feature, nameProp, regions, ind) {
    const name = feature.properties[nameProp];
    const value = regions[name];
    const pct = (value !== undefined) ? computeAchievement(ind, value) : null;
    const isSelected = state.selectedRegion === name;
    const showBoundary = state.layers.boundaries;
    return {
      fillColor: getChoroColor(pct),
      weight: isSelected ? 4 : (showBoundary ? 1.4 : 0),
      opacity: 1,
      color: isSelected ? '#137EB4' : '#FFFFFF',
      fillOpacity: pct !== null ? (isSelected ? 1 : 0.85) : 0.3,
      dashArray: showBoundary ? null : null
    };
  }

  function buildTooltip(name, value, ind) {
    if (value === undefined) {
      return `<div class="region-tooltip__name">${escapeHtml(name)}</div>
        <div style="opacity:0.7">Pas de données</div>`;
    }
    const pct = computeAchievement(ind, value);
    const u = unitSuffix(ind) === '%' ? ' %' : (' ' + ind.unit);
    return `
      <div class="region-tooltip__name">${escapeHtml(name)}</div>
      <div class="region-tooltip__row"><span>Valeur</span><strong>${fmt(value)}${u}</strong></div>
      <div class="region-tooltip__row"><span>Cible</span><strong>${fmt(ind.target)}${u}</strong></div>
      <div class="region-tooltip__row"><span>% atteint</span><strong>${pct === null ? '—' : fmt(pct) + ' %'}</strong></div>
      <div class="region-tooltip__hint">${state.selectedRegion === name ? 'Cliquez pour désélectionner' : 'Cliquez pour zoomer'}</div>
    `;
  }

  // ====================================================
  // SÉLECTION RÉGIONALE (drill-down)
  // ====================================================
  function selectRegion(name) {
    state.selectedRegion = name;
    document.getElementById('btnClearSelection').hidden = false;
    document.getElementById('scopeLabel').textContent = `Région : ${name}`;

    // Mise à jour du style et zoom sur la région
    if (geoLayer) {
      const lvl = INDICATOR_DATA.geoLevels.find(l => l.id === state.geoLevelId);
      const ind = getIndicator(state.indicatorCode);
      const regions = getKpisDef(ind).regions || {};
      geoLayer.setStyle(f => styleFeature(f, lvl.nameProp, regions, ind));
      geoLayer.eachLayer(layer => {
        if (layer.feature.properties[lvl.nameProp] === name) {
          layer.bringToFront();
          try { map.flyToBounds(layer.getBounds(), { padding: [60, 60], maxZoom: 9, duration: 0.7 }); } catch (e) {}
        }
      });
    }

    renderKpis();
  }

  function clearSelection() {
    state.selectedRegion = null;
    document.getElementById('btnClearSelection').hidden = true;
    document.getElementById('scopeLabel').textContent = 'Vue nationale';

    if (geoLayer) {
      const lvl = INDICATOR_DATA.geoLevels.find(l => l.id === state.geoLevelId);
      const ind = getIndicator(state.indicatorCode);
      const regions = getKpisDef(ind).regions || {};
      geoLayer.setStyle(f => styleFeature(f, lvl.nameProp, regions, ind));
      try { map.flyToBounds(geoLayer.getBounds(), { padding: [40, 40], duration: 0.7 }); } catch (e) {}
    }

    renderKpis();
  }

  // ====================================================
  // RENDER : SÉLECTEURS + KPIS + LÉGENDE
  // ====================================================
  function renderIndicatorTrigger() {
    const ind = getIndicator(state.indicatorCode);
    if (!ind) return;
    document.getElementById('indicatorCode').textContent = ind.code;
    document.getElementById('indicatorName').textContent = ind.name;
  }

  function renderGeoTrigger() {
    const lvl = INDICATOR_DATA.geoLevels.find(l => l.id === state.geoLevelId);
    if (lvl) document.getElementById('geoName').textContent = lvl.label;
  }

  function renderKpis() {
    const ind = getIndicator(state.indicatorCode);
    if (!ind) return;
    const k = getKpisDef(ind);
    const u = ind.unit === '%' ? '%' : ind.unit;

    // Valeur courante : globale ou de la région sélectionnée
    let actualValue;
    if (state.selectedRegion && k.regions[state.selectedRegion] !== undefined) {
      actualValue = k.regions[state.selectedRegion];
    } else {
      actualValue = k.actual;
    }
    const pct = computeAchievement(ind, actualValue);

    document.getElementById('kpiRef').textContent = fmt(ind.reference);
    document.getElementById('kpiRefUnit').textContent = u;
    document.getElementById('kpiCurrent').textContent = fmt(actualValue);
    document.getElementById('kpiCurrentUnit').textContent = u;
    document.getElementById('kpiTarget').textContent = fmt(ind.target);
    document.getElementById('kpiTargetUnit').textContent = u;
    document.getElementById('kpiProgress').textContent = pct === null ? '—' : fmt(pct);

    // Barre de progression
    const fillPct = Math.max(0, Math.min(100, pct ?? 0));
    document.getElementById('progressFill').style.width = fillPct + '%';

    // Métadonnées
    const dirEl = document.getElementById('metaDirection');
    if (ind.direction === 'desc') {
      dirEl.innerHTML = '<i class="fas fa-arrow-down"></i> Doit diminuer';
    } else {
      dirEl.innerHTML = '<i class="fas fa-arrow-up"></i> Doit augmenter';
    }
    document.getElementById('metaType').textContent = ind.type;

    // Compteurs couches
    const regionsCount = Object.keys(k.regions || {}).length;
    document.getElementById('choroCount').textContent = regionsCount;
    document.getElementById('markersCount').textContent = regionsCount;

    // Légende
    document.getElementById('legendTitle').textContent = '% atteint vers la cible';
    document.getElementById('legendScale').innerHTML = `
      <span>0%</span>
      <span>25%</span>
      <span>50%</span>
      <span>80%</span>
      <span>100%+</span>
    `;
  }

  // ====================================================
  // SÉLECTEURS CUSTOM
  // ====================================================
  function buildSelector(triggerId, dropdownId, getItems, getCurrentValue, onSelect, opts = {}) {
    const trigger = document.getElementById(triggerId);
    const dropdown = document.getElementById(dropdownId);
    const searchable = opts.searchable !== false;

    // Le panneau parent utilise backdrop-filter qui casse position:fixed.
    // On déplace le dropdown directement dans <body> pour le sortir du containing block.
    if (dropdown.parentElement !== document.body) {
      document.body.appendChild(dropdown);
    }

    function position() {
      const rect = trigger.getBoundingClientRect();
      dropdown.style.position = 'fixed';
      dropdown.style.top = (rect.bottom + 4) + 'px';
      dropdown.style.left = rect.left + 'px';
      dropdown.style.width = rect.width + 'px';
      dropdown.style.zIndex = '2000';
    }

    function render(filter = '') {
      const items = getItems();
      const filtered = items.filter(it =>
        !filter ||
        it.label.toLowerCase().includes(filter.toLowerCase()) ||
        (it.value || '').toLowerCase().includes(filter.toLowerCase())
      );
      const cv = getCurrentValue();
      const searchHtml = searchable ? `
        <div class="mp-dropdown__search">
          <input type="text" placeholder="Rechercher..." value="${escapeHtml(filter)}">
        </div>` : '';
      dropdown.innerHTML = searchHtml + `<div class="mp-dropdown__items">` +
        filtered.map(it => {
          const sel = it.value === cv ? 'is-selected' : '';
          return `<button class="mp-dropdown__item ${sel}" data-value="${escapeHtml(it.value)}">
            ${opts.renderOption ? opts.renderOption(it) : escapeHtml(it.label)}
          </button>`;
        }).join('') +
        `</div>`;

      if (searchable) {
        const input = dropdown.querySelector('.mp-dropdown__search input');
        input.addEventListener('input', e => render(e.target.value));
        input.addEventListener('click', e => e.stopPropagation());
        setTimeout(() => input.focus(), 50);
      }
      dropdown.querySelectorAll('.mp-dropdown__item').forEach(btn => {
        btn.addEventListener('click', () => { onSelect(btn.dataset.value); close(); });
      });
    }

    function open() {
      document.querySelectorAll('.mp-dropdown:not([hidden])').forEach(d => {
        if (d !== dropdown) {
          d.hidden = true;
          d.previousElementSibling?.classList.remove('is-open');
        }
      });
      trigger.classList.add('is-open');
      dropdown.hidden = false;
      position();
      render();
    }

    function close() {
      trigger.classList.remove('is-open');
      dropdown.hidden = true;
    }

    trigger.addEventListener('click', e => {
      e.stopPropagation();
      if (trigger.classList.contains('is-open')) close();
      else open();
    });

    document.addEventListener('click', e => {
      if (!dropdown.contains(e.target) && !trigger.contains(e.target)) close();
    });

    window.addEventListener('resize', () => { if (!dropdown.hidden) position(); });
  }

  // ====================================================
  // RECHERCHE
  // ====================================================
  function bindSearch() {
    const input = document.getElementById('searchInput');
    const results = document.getElementById('searchResults');

    input.addEventListener('input', () => {
      const query = input.value.trim().toLowerCase();
      if (!query || !geoData) { results.hidden = true; return; }
      const lvl = INDICATOR_DATA.geoLevels.find(l => l.id === state.geoLevelId);
      const ind = getIndicator(state.indicatorCode);
      const regions = getKpisDef(ind).regions || {};
      const matches = geoData.features
        .map(f => f.properties[lvl.nameProp])
        .filter(name => name.toLowerCase().includes(query))
        .slice(0, 10);

      if (matches.length === 0) {
        results.innerHTML = `<div class="map-search-result"><i class="fas fa-circle-info"></i><div><div class="map-search-result__name">Aucun résultat</div><div class="map-search-result__sub">Aucune région ne correspond</div></div></div>`;
      } else {
        results.innerHTML = matches.map(name => {
          const value = regions[name];
          const pct = value !== undefined ? computeAchievement(ind, value) : null;
          return `<div class="map-search-result" data-region="${escapeHtml(name)}">
            <i class="fas fa-location-dot"></i>
            <div>
              <div class="map-search-result__name">${escapeHtml(name)}</div>
              <div class="map-search-result__sub">${pct === null ? 'Pas de données' : fmt(pct) + '% atteint'}</div>
            </div>
          </div>`;
        }).join('');
        results.querySelectorAll('[data-region]').forEach(el => {
          el.addEventListener('click', () => {
            input.value = el.dataset.region;
            results.hidden = true;
            selectRegion(el.dataset.region);
          });
        });
      }
      results.hidden = false;
    });

    document.addEventListener('click', e => {
      if (!input.contains(e.target) && !results.contains(e.target)) results.hidden = true;
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const first = results.querySelector('[data-region]');
        if (first) first.click();
      }
      if (e.key === 'Escape') {
        input.blur();
        results.hidden = true;
      }
    });

    document.getElementById('btnLocate').addEventListener('click', () => {
      if (!navigator.geolocation) { toast('Géolocalisation non disponible'); return; }
      toast('Recherche de votre position...');
      navigator.geolocation.getCurrentPosition(pos => {
        map.flyTo([pos.coords.latitude, pos.coords.longitude], 12, { duration: 1.2 });
        toast('Position trouvée');
      }, () => toast('Position refusée'));
    });
  }

  // ====================================================
  // EVENT BINDINGS
  // ====================================================
  function bindUi() {
    // Sélecteur indicateur
    buildSelector(
      'indicatorTrigger', 'indicatorDropdown',
      () => getVisibleIndicators().map(i => ({ value: i.code, label: i.name, _ind: i })),
      () => state.indicatorCode,
      code => {
        state.indicatorCode = code;
        state.selectedRegion = null;
        document.getElementById('btnClearSelection').hidden = true;
        document.getElementById('scopeLabel').textContent = 'Vue nationale';
        renderIndicatorTrigger();
        loadGeoJson();
        renderKpis();
      },
      {
        searchable: true,
        renderOption: it => `<div>
          <small>${escapeHtml(it.value)}</small>
          ${escapeHtml(it.label)}
          ${it._ind && !it._ind.validated ? '<i class="fas fa-circle-exclamation" style="color:var(--me-warning);margin-left:6px" title="Non validé"></i>' : ''}
        </div>`
      }
    );

    // Sélecteur niveau géo
    buildSelector(
      'geoTrigger', 'geoDropdown',
      () => INDICATOR_DATA.geoLevels.map(l => ({ value: l.id, label: l.label })),
      () => state.geoLevelId,
      id => {
        state.geoLevelId = id;
        state.selectedRegion = null;
        document.getElementById('btnClearSelection').hidden = true;
        document.getElementById('scopeLabel').textContent = 'Vue nationale';
        renderGeoTrigger();
        loadGeoJson();
        renderKpis();
      },
      { searchable: false }
    );

    // Toggle données validées
    document.getElementById('validatedToggle').addEventListener('change', e => {
      state.validatedOnly = e.target.checked;
      const visible = getVisibleIndicators();
      if (state.validatedOnly && !visible.find(i => i.code === state.indicatorCode)) {
        if (visible.length > 0) {
          state.indicatorCode = visible[0].code;
          renderIndicatorTrigger();
          loadGeoJson();
          renderKpis();
        }
      }
    });

    // Bouton retour vue nationale
    document.getElementById('btnClearSelection').addEventListener('click', clearSelection);

    // Toggles couches
    const DEMO_TYPES = ['beneficiaires', 'health', 'roads', 'villages'];
    document.querySelectorAll('[data-layer]').forEach(input => {
      input.addEventListener('change', () => {
        const type = input.dataset.layer;
        state.layers[type] = input.checked;

        if (DEMO_TYPES.includes(type)) {
          // Couche démo : on toggle indépendamment, sans toucher au choroplèthe
          toggleDemoLayer(type, input.checked);
        } else {
          // Couches GeoJSON principales : on redessine tout
          if (geoLayer) map.removeLayer(geoLayer);
          if (labelsLayer) map.removeLayer(labelsLayer);
          if (markersLayer) map.removeLayer(markersLayer);
          drawAllLayers();
        }
      });
    });

    // Onglets panneau droit
    document.querySelectorAll('.mp-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        document.querySelectorAll('.mp-tab').forEach(t => t.classList.toggle('is-active', t === tab));
        document.querySelectorAll('.mp-tab-pane').forEach(p => p.classList.toggle('is-active', p.dataset.pane === target));
      });
    });

    // Fond de carte
    document.querySelectorAll('[data-basemap]').forEach(b => {
      b.addEventListener('click', () => setBasemap(b.dataset.basemap));
    });

    // Toggle panneaux (rétractation)
    document.getElementById('btnTogglePanelLeft').addEventListener('click', () => {
      document.getElementById('mapApp').classList.toggle('is-left-collapsed');
    });
    document.getElementById('btnTogglePanelRight').addEventListener('click', () => {
      document.getElementById('mapApp').classList.toggle('is-right-collapsed');
    });

    // Outils
    document.getElementById('btnZoomIn').addEventListener('click', () => map.zoomIn());
    document.getElementById('btnZoomOut').addEventListener('click', () => map.zoomOut());
    document.getElementById('btnResetView').addEventListener('click', () => {
      clearSelection();
    });
    document.getElementById('btnFullscreen').addEventListener('click', () => {
      const el = document.documentElement;
      if (!document.fullscreenElement) el.requestFullscreen?.();
      else document.exitFullscreen?.();
    });

    // Topbar
    document.getElementById('btnExportPng').addEventListener('click', () => {
      toast('Export PNG (utilise la capture d\'écran système)');
    });
    document.getElementById('btnShare').addEventListener('click', () => {
      navigator.clipboard?.writeText(location.href);
      toast('Lien copié');
    });
    document.getElementById('btnHelp').addEventListener('click', () => {
      toast('Cliquez sur une région pour la sélectionner. Échap pour désélectionner.');
    });

    // Échap = désélectionner
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && state.selectedRegion) clearSelection();
    });
  }

  // ====================================================
  // UTILITAIRES UI
  // ====================================================
  function showLoader(show) {
    document.getElementById('mapLoader').hidden = !show;
  }

  function toast(text) {
    const el = document.getElementById('toast');
    document.getElementById('toastText').textContent = text;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.hidden = true; }, 2200);
  }

  // ====================================================
  // INIT
  // ====================================================
  function init() {
    if (typeof INDICATOR_DATA === 'undefined' || !INDICATOR_DATA.indicators?.length) {
      toast('Données indicateurs non chargées');
      return;
    }
    state.indicatorCode = INDICATOR_DATA.indicators[0].code;

    initMap();
    bindUi();
    bindSearch();
    renderIndicatorTrigger();
    renderGeoTrigger();
    renderKpis();
    loadGeoJson();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', MapExplorer.init);
