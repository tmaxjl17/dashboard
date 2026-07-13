/* =========================================================
   DASHBOARD INDICATEURS 2 - Option I : Race vers l'objectif
   ========================================================= */

const Indicators2 = (() => {

  let currentIndicatorCode = INDICATOR_DATA.indicators[0].code;
  let currentGeoLevelId = 'level1';
  let validatedOnly = false;
  let selectedRegion = null;

  let chartInstance = null;
  let map = null;
  let geoLayer = null;

  // ====================================================
  // HELPERS
  // ====================================================
  const fmt = n => (n === null || n === undefined) ? '—' : n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  const fmtDate = d => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

  function getIndicator(code) { return INDICATOR_DATA.indicators.find(i => i.code === code); }
  function getVisibleIndicators() {
    if (!validatedOnly) return INDICATOR_DATA.indicators;
    return INDICATOR_DATA.indicators.filter(i => i.validated);
  }
  function getKpisDef(ind, levelId) { return ind.kpis[levelId] || ind.kpis.level1; }

  /** % atteint vers la cible — gère asc/desc */
  function computeAchievement(ind, actualValue) {
    if (actualValue === null || actualValue === undefined) return null;
    const ref = ind.reference, tgt = ind.target;
    if (ind.direction === 'desc') {
      const span = ref - tgt;
      if (span <= 0) return null;
      return ((ref - actualValue) / span) * 100;
    } else {
      const span = tgt - ref;
      if (span <= 0) return null;
      return ((actualValue - ref) / span) * 100;
    }
  }

  function classify(pct) {
    if (pct === null || pct === undefined) return 'low';
    if (pct >= 100) return 'over';
    if (pct >= 70)  return 'high';
    if (pct >= 40)  return 'mid';
    return 'low';
  }

  function getChoroColor(pct) {
    if (pct === null || pct === undefined) return '#E4ECF2';
    if (pct >= 100) return '#0F6796';
    if (pct >= 80)  return '#137EB4';
    if (pct >= 50)  return '#5BA3CB';
    if (pct >= 25)  return '#9DC8E0';
    return '#D5E5EE';
  }

  /** Cible attendue à la date courante (interpolation linéaire entre startDate et endDate) */
  function expectedAtToday(ind) {
    const start = new Date(ind.startDate).getTime();
    const end   = new Date(ind.endDate).getTime();
    const now   = new Date('2026-04-30').getTime(); // date courante simulée
    if (now <= start) return 0;
    if (now >= end) return 100;
    return ((now - start) / (end - start)) * 100;
  }

  // ====================================================
  // SÉLECTEURS CUSTOM
  // ====================================================
  function buildSelector(triggerId, dropdownId, getItems, getCurrentValue, onSelect, opts = {}) {
    const trigger = document.getElementById(triggerId);
    const dropdown = document.getElementById(dropdownId);
    const searchable = opts.searchable !== false;
    const renderOption = opts.renderOption || (it => `<span>${it.label}</span>`);

    function render(filter = '') {
      const items = getItems();
      const filtered = items.filter(it =>
        !filter ||
        it.label.toLowerCase().includes(filter.toLowerCase()) ||
        (it.value || '').toLowerCase().includes(filter.toLowerCase())
      );
      const cv = getCurrentValue();
      const searchHtml = searchable ? `
        <div class="r-selector__search">
          <input type="text" placeholder="Rechercher..." value="${filter}">
        </div>` : '';

      dropdown.innerHTML = searchHtml + filtered.map(it => `
        <button class="r-selector__option ${it.value === cv ? 'is-selected' : ''}" data-value="${it.value}">
          <i class="fas fa-check r-selector__option-check"></i>
          ${renderOption(it)}
        </button>
      `).join('');

      if (searchable) {
        const input = dropdown.querySelector('.r-selector__search input');
        input.addEventListener('input', e => render(e.target.value));
        input.addEventListener('click', e => e.stopPropagation());
        setTimeout(() => input.focus(), 50);
      }
      dropdown.querySelectorAll('.r-selector__option').forEach(btn => {
        btn.addEventListener('click', () => { onSelect(btn.dataset.value); close(); });
      });
    }

    function open() {
      document.querySelectorAll('.r-selector__dropdown.is-open').forEach(d => {
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

  function updateIndicatorTrigger() {
    const ind = getIndicator(currentIndicatorCode);
    document.getElementById('indicatorValue').textContent = `${ind.code} – ${ind.name}`;
  }

  function updateGeoTrigger() {
    const lvl = INDICATOR_DATA.geoLevels.find(l => l.id === currentGeoLevelId);
    document.getElementById('geoValue').textContent = lvl.label;
  }

  // ====================================================
  // HERO : cercle géant + identité + statut
  // ====================================================
  function getCurrentValue() {
    const ind = getIndicator(currentIndicatorCode);
    const k = getKpisDef(ind, currentGeoLevelId);
    if (selectedRegion && k.regions[selectedRegion] !== undefined) {
      return k.regions[selectedRegion];
    }
    return k.actual;
  }

  function renderHero() {
    const ind = getIndicator(currentIndicatorCode);
    const value = getCurrentValue();
    const pct = computeAchievement(ind, value);
    const expected = expectedAtToday(ind);
    const cls = classify(pct);

    // Cercle de progression
    const heroEl = document.getElementById('hero');
    heroEl.className = `hero hero--${cls}`;

    const radius = 92;
    const circumference = 2 * Math.PI * radius;
    const ratio = pct === null ? 0 : Math.min(Math.max(pct, 0), 100) / 100;
    const offset = circumference * (1 - ratio);

    document.getElementById('heroCircleFill').setAttribute('stroke-dasharray', circumference);
    document.getElementById('heroCircleFill').setAttribute('stroke-dashoffset', offset);
    document.getElementById('heroCirclePct').textContent = pct === null ? '—' : Math.round(pct);

    // Identité
    document.getElementById('heroCode').textContent = ind.code;
    document.getElementById('heroTitle').textContent = ind.name;
    document.getElementById('heroDefinition').textContent = ind.definition;

    // Badge validation
    const validBadge = document.getElementById('heroValidatedBadge');
    if (ind.validated) {
      validBadge.className = 'hero-info__validated-badge';
      validBadge.innerHTML = '<i class="fas fa-circle-check"></i> Validé';
    } else {
      validBadge.className = 'hero-info__validated-badge hero-info__validated-badge--off';
      validBadge.innerHTML = '<i class="fas fa-circle-exclamation"></i> En validation';
    }

    // Chips meta
    const dirChipCls = ind.direction === 'desc' ? 'hero-info__chip--desc' : 'hero-info__chip--asc';
    const dirIcon = ind.direction === 'desc' ? 'fa-arrow-down' : 'fa-arrow-up';
    const dirText = ind.direction === 'desc' ? 'Doit diminuer' : 'Doit augmenter';
    document.getElementById('heroMeta').innerHTML = `
      <div class="hero-info__chip ${dirChipCls}"><i class="fas ${dirIcon}"></i> ${dirText}</div>
      <div class="hero-info__chip"><i class="fas fa-ruler"></i><span>Unité</span><strong>${ind.unit}</strong></div>
      <div class="hero-info__chip"><i class="fas fa-layer-group"></i><span>Type</span><strong>${ind.type}</strong></div>
      <div class="hero-info__chip"><i class="far fa-calendar-check"></i><span>Début</span><strong>${fmtDate(ind.startDate)}</strong></div>
      <div class="hero-info__chip"><i class="far fa-calendar-times"></i><span>Fin</span><strong>${fmtDate(ind.endDate)}</strong></div>
    `;

    // Bloc statut "en avance / à l'heure / en retard"
    renderStatus(pct, expected);
  }

  function renderStatus(pct, expected) {
    const el = document.getElementById('heroStatus');
    if (pct === null) {
      el.className = 'hero-status hero-status--unknown';
      el.innerHTML = `
        <i class="fas fa-question fa-circle-question hero-status__icon"></i>
        <div class="hero-status__label">Pas de données</div>
        <div class="hero-status__desc">Impossible d'évaluer la progression</div>
      `;
      return;
    }

    const delta = pct - expected;
    let cls, icon, label, desc;

    if (delta >= 5) {
      cls = 'ahead'; icon = 'fa-rocket';
      label = `+${fmt(delta)} pts`;
      desc = `En avance sur la trajectoire`;
    } else if (delta >= -5) {
      cls = 'on-track'; icon = 'fa-circle-check';
      label = `À l'heure`;
      desc = `Pile sur la trajectoire (${delta >= 0 ? '+' : ''}${fmt(delta)} pts)`;
    } else if (delta >= -15) {
      cls = 'behind'; icon = 'fa-clock';
      label = `${fmt(delta)} pts`;
      desc = `En léger retard sur la trajectoire`;
    } else {
      cls = 'late'; icon = 'fa-triangle-exclamation';
      label = `${fmt(delta)} pts`;
      desc = `En retard significatif`;
    }

    el.className = `hero-status hero-status--${cls}`;
    el.innerHTML = `
      <i class="fas ${icon} hero-status__icon"></i>
      <div class="hero-status__label">${label}</div>
      <div class="hero-status__desc">${desc}</div>
    `;
  }

  // ====================================================
  // RACE TRACK
  // ====================================================
  function renderRaceTrack() {
    const ind = getIndicator(currentIndicatorCode);
    const value = getCurrentValue();
    const pct = computeAchievement(ind, value);
    const expected = expectedAtToday(ind);
    const cls = classify(pct);

    // Position du pin (clamp 0-100%)
    const pinPct = pct === null ? 0 : Math.min(Math.max(pct, 0), 100);
    const ghostPct = Math.min(Math.max(expected, 0), 100);

    // Le track a 60px de padding gauche/droite. La piste utilisable = 100% - 120px.
    // Mais comme on utilise des % CSS, on calcule la position relative à la piste.
    // Le pin et le ghost se positionnent en % au sein de la piste (entre les deux drapeaux).

    // line-progress
    const lineProgress = document.getElementById('raceLineProgress');
    lineProgress.style.width = `calc((100% - 120px) * ${pinPct / 100})`;
    lineProgress.className = `race-track__line-progress race-track__line-progress--${cls}`;

    // Pin
    const pin = document.getElementById('racePin');
    pin.style.left = `calc(60px + (100% - 120px) * ${pinPct / 100})`;
    pin.className = `race-pin race-pin--${cls}`;

    document.getElementById('racePinValue').textContent = pct === null ? '—' : `${fmt(pct)}%`;

    // Ghost (cible attendue aujourd'hui)
    const ghost = document.getElementById('raceGhost');
    if (ghostPct > 0 && ghostPct < 100) {
      ghost.style.display = 'flex';
      ghost.style.left = `calc(60px + (100% - 120px) * ${ghostPct / 100})`;
      document.getElementById('raceGhostBubble').textContent = `Cible aujourd'hui : ${fmt(ghostPct)}%`;
    } else {
      ghost.style.display = 'none';
    }

    // Drapeaux (valeurs)
    const unit = ind.unit === '%' ? ' %' : ' ' + ind.unit;
    document.getElementById('raceFlagStartValue').textContent = fmt(ind.reference) + unit;
    document.getElementById('raceFlagEndValue').textContent   = fmt(ind.target) + unit;

    // Scope
    document.getElementById('raceScope').innerHTML = selectedRegion
      ? `<i class="fas fa-location-dot"></i> Région : ${selectedRegion}`
      : `<i class="fas fa-globe"></i> Niveau global`;
  }

  // ====================================================
  // GRAPHE D'ÉVOLUTION avec corridor
  // ====================================================
  function renderChart() {
    const ind = getIndicator(currentIndicatorCode);
    const ctx = document.getElementById('evoChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();

    const grad = ctx.createLinearGradient(0, 0, 0, 380);
    grad.addColorStop(0, 'rgba(19,126,180,0.3)');
    grad.addColorStop(1, 'rgba(19,126,180,0)');

    const labels = ind.timeline.labels;
    // Cible finale fixe sur toutes les périodes
    const target = labels.map(() => ind.target);

    // Série actual ajustée à la zone géographique sélectionnée
    const k = getKpisDef(ind, currentGeoLevelId);
    let zoneActual;
    if (selectedRegion && k.regions[selectedRegion] !== undefined) {
      zoneActual = k.regions[selectedRegion];
    } else {
      zoneActual = k.actual;
    }
    const baseActual = ind.timeline.actual.slice();
    const ratio = baseActual[baseActual.length - 1] !== 0
      ? zoneActual / baseActual[baseActual.length - 1]
      : 1;
    const actual = baseActual.map((v, i) => i === 0 ? v : +(v * ratio).toFixed(2));
    actual[actual.length - 1] = zoneActual;

    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          // Ligne cible horizontale (cible finale = constante)
          {
            label: `Valeur cible (${fmt(ind.target)}${ind.unit === '%' ? ' %' : ' ' + ind.unit})`,
            data: target,
            borderColor: '#7BA888',
            borderWidth: 2,
            borderDash: [6, 5],
            tension: 0,
            pointRadius: 0,
            pointHoverRadius: 0,
            fill: false
          },
          // Valeur relevée
          {
            label: 'Valeur relevée',
            data: actual,
            borderColor: '#137EB4',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0,
            borderWidth: 3,
            pointBackgroundColor: '#FFFFFF',
            pointBorderColor: '#137EB4',
            pointBorderWidth: 2.5,
            pointRadius: 5,
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
          legend: { display: false },
          tooltip: {
            backgroundColor: '#131A20', padding: 12, cornerRadius: 8,
            titleColor: '#F1F6F9', bodyColor: '#D2DDE5',
            callbacks: {
              label: ctx => {
                const lbl = ctx.dataset.label;
                const v = ctx.parsed.y;
                if (v === null || v === undefined) return null;
                return `${lbl} : ${fmt(v)}${ind.unit === '%' ? ' %' : ' ' + ind.unit}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(181,194,204,0.35)' },
            ticks: {
              font: { size: 11 }, color: '#6A7884',
              callback: v => v + (ind.unit === '%' ? ' %' : '')
            }
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 10, weight: '500' }, color: '#4D5A65', maxRotation: 45 }
          }
        }
      }
    });

    // Sub-titre
    const geoLabel = (INDICATOR_DATA.geoLevels.find(g => g.id === currentGeoLevelId) || {}).label || '';
    const scopeLabel = selectedRegion ? selectedRegion : `${geoLabel} (moyenne)`;
    document.getElementById('evoSub').textContent = `Zone : ${scopeLabel} · cible ${fmt(ind.target)}${ind.unit === '%' ? ' %' : ' ' + ind.unit}`;
  }

  // ====================================================
  // CARTE
  // ====================================================
  function initMap() {
    if (!document.getElementById('map')) return;
    map = L.map('map', { center: [7.6, -5.5], zoom: 6, zoomControl: true });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd', maxZoom: 18
    }).addTo(map);
  }

  async function loadGeoJson() {
    if (!map) return;
    const lvl = INDICATOR_DATA.geoLevels.find(l => l.id === currentGeoLevelId);
    const loadingEl = document.getElementById('mapLoading');
    if (loadingEl) loadingEl.classList.remove('is-hidden');

    if (geoLayer) { map.removeLayer(geoLayer); geoLayer = null; }

    try {
      const res = await fetch(lvl.geoUrl);
      const geojson = await res.json();
      drawGeoLayer(geojson, lvl.nameProp);
    } catch (err) {
      console.error('Erreur GeoJSON :', err);
      loadingEl.innerHTML = `<i class="fas fa-triangle-exclamation" style="font-size:24px;color:var(--danger)"></i><p>Impossible de charger la carte</p>`;
      return;
    }
    loadingEl.classList.add('is-hidden');
  }

  function styleFeature(feature, nameProp, regions, ind) {
    const name = feature.properties[nameProp];
    const value = regions[name];
    const pct = (value !== undefined) ? computeAchievement(ind, value) : null;
    const isSelected = selectedRegion === name;
    return {
      fillColor: getChoroColor(pct),
      weight: isSelected ? 3.5 : 1.2,
      opacity: 1,
      color: isSelected ? '#137EB4' : '#fff',
      fillOpacity: pct !== null ? (isSelected ? 1 : 0.85) : 0.3
    };
  }

  function buildTooltip(name, value, ind) {
    if (value === undefined) return `<div class="region-tooltip__name">${name}</div><div style="opacity:0.7">Pas de données</div>`;
    const pct = computeAchievement(ind, value);
    const unit = ind.unit === '%' ? ' %' : ' ' + ind.unit;
    return `
      <div class="region-tooltip__name">${name}</div>
      <div class="region-tooltip__row"><span>Valeur</span><strong>${fmt(value)}${unit}</strong></div>
      <div class="region-tooltip__row"><span>Cible</span><strong>${fmt(ind.target)}${unit}</strong></div>
      <div class="region-tooltip__row"><span>% atteint</span><strong>${pct === null ? '—' : fmt(pct) + ' %'}</strong></div>
    `;
  }

  function drawGeoLayer(geojson, nameProp) {
    const ind = getIndicator(currentIndicatorCode);
    const k = getKpisDef(ind, currentGeoLevelId);
    const regions = k.regions || {};

    geoLayer = L.geoJSON(geojson, {
      style: feature => styleFeature(feature, nameProp, regions, ind),
      onEachFeature: (feature, layer) => {
        const name = feature.properties[nameProp];
        layer.bindTooltip(buildTooltip(name, regions[name], ind), {
          className: 'region-tooltip', sticky: true, direction: 'top'
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
          if (regions[name] === undefined) return;
          if (selectedRegion === name) clearSelection();
          else selectRegion(name);
        });
      }
    }).addTo(map);

    map.off('click');
    map.on('click', () => { if (selectedRegion) clearSelection(); });

    try { map.fitBounds(geoLayer.getBounds(), { padding: [20, 20] }); } catch (e) {}
  }

  function refreshMapStyle() {
    if (!geoLayer) return;
    const ind = getIndicator(currentIndicatorCode);
    const k = getKpisDef(ind, currentGeoLevelId);
    const regions = k.regions || {};
    const lvl = INDICATOR_DATA.geoLevels.find(l => l.id === currentGeoLevelId);
    geoLayer.setStyle(feature => styleFeature(feature, lvl.nameProp, regions, ind));
    geoLayer.eachLayer(layer => {
      const name = layer.feature.properties[lvl.nameProp];
      layer.setTooltipContent(buildTooltip(name, regions[name], ind));
      if (selectedRegion === name) layer.bringToFront();
    });
  }

  function selectRegion(name) {
    selectedRegion = name;
    if (geoLayer) {
      refreshMapStyle();
      geoLayer.eachLayer(layer => {
        const lvl = INDICATOR_DATA.geoLevels.find(l => l.id === currentGeoLevelId);
        if (layer.feature.properties[lvl.nameProp] === name) {
          try { map.fitBounds(layer.getBounds(), { padding: [40, 40], maxZoom: 9 }); } catch (e) {}
        }
      });
    }
    renderHero();
    renderRaceTrack();
    renderChart();
    renderRegionsTable();
  }

  function clearSelection() {
    selectedRegion = null;
    if (geoLayer) {
      refreshMapStyle();
      try { map.fitBounds(geoLayer.getBounds(), { padding: [20, 20] }); } catch (e) {}
    }
    renderHero();
    renderRaceTrack();
    renderChart();
    renderRegionsTable();
  }

  // ====================================================
  // TABLEAU RÉGIONS
  // ====================================================
  function renderRegionsTable() {
    const tbody = document.getElementById('regionsTbody');
    if (!tbody) return;
    const ind = getIndicator(currentIndicatorCode);
    const k = getKpisDef(ind, currentGeoLevelId);
    const regions = k.regions || {};
    const countEl = document.getElementById('regionsCount');

    const entries = Object.entries(regions).map(([name, value]) => ({
      name, value, pct: computeAchievement(ind, value)
    })).sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));

    countEl.textContent = entries.length;

    if (entries.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4">
        <div class="regions-empty">
          <i class="fas fa-map-location-dot"></i>
          <p>Pas de données régionales</p>
        </div></td></tr>`;
      return;
    }

    tbody.innerHTML = entries.map((r, i) => {
      const cls = classify(r.pct);
      const w = Math.min(Math.max(r.pct ?? 0, 0), 100);
      return `
        <tr class="${selectedRegion === r.name ? 'is-selected' : ''}" data-region="${r.name.replace(/"/g, '&quot;')}">
          <td><span class="region-rank">#${i + 1}</span></td>
          <td><span class="region-name">${r.name}</span></td>
          <td class="region-value">${fmt(r.value)}${ind.unit === '%' ? '%' : ''}</td>
          <td>
            <div class="region-progress">
              <div class="region-progress__bar"><div class="region-progress__fill region-progress__fill--${cls}" style="width:${w}%"></div></div>
              <span class="region-progress__pct">${r.pct === null ? '—' : fmt(r.pct) + '%'}</span>
            </div>
          </td>
        </tr>`;
    }).join('');

    tbody.querySelectorAll('tr[data-region]').forEach(tr => {
      tr.addEventListener('click', () => {
        const name = tr.dataset.region;
        if (selectedRegion === name) clearSelection();
        else selectRegion(name);
      });
    });
  }

  // ====================================================
  // CHANGE HANDLERS
  // ====================================================
  function onIndicatorChange(code) {
    currentIndicatorCode = code;
    selectedRegion = null;
    updateIndicatorTrigger();
    renderHero();
    renderRaceTrack();
    renderChart();
    renderRegionsTable();
    refreshMapStyle();
  }

  function onGeoLevelChange(levelId) {
    currentGeoLevelId = levelId;
    selectedRegion = null;
    updateGeoTrigger();
    renderHero();
    renderRaceTrack();
    renderRegionsTable();
    loadGeoJson();
  }

  function onValidatedChange(checked) {
    validatedOnly = checked;
    const visible = getVisibleIndicators();
    if (validatedOnly && !visible.find(i => i.code === currentIndicatorCode)) {
      if (visible.length > 0) onIndicatorChange(visible[0].code);
    }
  }

  // ====================================================
  // INIT
  // ====================================================
  function init() {
    buildSelector(
      'indicatorTrigger', 'indicatorDropdown',
      () => getVisibleIndicators().map(i => ({ value: i.code, label: i.name, _ind: i })),
      () => currentIndicatorCode,
      onIndicatorChange,
      {
        searchable: true,
        renderOption: it => `
          <div class="r-selector__option-content">
            <span class="r-selector__option-code">${it.value}</span>
            <div class="r-selector__option-name">
              ${it.label}
              ${it._ind && !it._ind.validated ? '<i class="fas fa-circle-exclamation r-selector__option-unvalidated" title="Non validé"></i>' : ''}
            </div>
          </div>`
      }
    );

    buildSelector(
      'geoTrigger', 'geoDropdown',
      () => INDICATOR_DATA.geoLevels.map(l => ({ value: l.id, label: l.label })),
      () => currentGeoLevelId,
      onGeoLevelChange,
      { searchable: false }
    );

    document.getElementById('validatedToggle').addEventListener('change', e => onValidatedChange(e.target.checked));

    updateIndicatorTrigger();
    updateGeoTrigger();
    renderHero();
    renderRaceTrack();
    renderChart();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', Indicators2.init);
