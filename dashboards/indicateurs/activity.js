/* =========================================================
   DASHBOARD INDICATEURS - Logique
   ========================================================= */

const IndicatorsDashboard = (() => {

  // === État ===
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

  function getIndicator(code) {
    return INDICATOR_DATA.indicators.find(i => i.code === code);
  }

  function getVisibleIndicators() {
    if (!validatedOnly) return INDICATOR_DATA.indicators;
    return INDICATOR_DATA.indicators.filter(i => i.validated);
  }

  function getKpisDef(indicator, levelId) {
    return indicator.kpis[levelId] || indicator.kpis.level1;
  }

  /**
   * Calcule le % atteint vers la cible.
   * Direction asc : (actual - reference) / (target - reference)
   * Direction desc : (reference - actual) / (reference - target)
   */
  function computeAchievement(indicator, actualValue) {
    const ref = indicator.reference;
    const tgt = indicator.target;
    if (actualValue === null || actualValue === undefined) return null;

    if (indicator.direction === 'desc') {
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
    if (pct >= 70) return 'high';
    if (pct >= 40) return 'mid';
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
        <div class="selector__search">
          <input type="text" placeholder="Rechercher..." value="${filter}">
        </div>` : '';

      dropdown.innerHTML = searchHtml + filtered.map(it => `
        <button class="selector__option ${it.value === cv ? 'is-selected' : ''}" data-value="${it.value}">
          <i class="fas fa-check selector__option-check"></i>
          ${renderOption(it)}
        </button>
      `).join('');

      if (searchable) {
        const input = dropdown.querySelector('.selector__search input');
        input.addEventListener('input', e => render(e.target.value));
        input.addEventListener('click', e => e.stopPropagation());
        setTimeout(() => input.focus(), 50);
      }

      dropdown.querySelectorAll('.selector__option').forEach(btn => {
        btn.addEventListener('click', () => { onSelect(btn.dataset.value); close(); });
      });
    }

    function open() {
      document.querySelectorAll('.selector__dropdown.is-open').forEach(d => {
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
    document.getElementById('indicatorTriggerLabel').textContent = `${ind.code} – ${ind.name}`;
  }

  function updateGeoTrigger() {
    const lvl = INDICATOR_DATA.geoLevels.find(l => l.id === currentGeoLevelId);
    document.getElementById('geoTriggerLabel').textContent = lvl.label;
  }

  // ====================================================
  // MÉTADONNÉES
  // ====================================================
  function renderMetadata() {
    const ind = getIndicator(currentIndicatorCode);
    document.getElementById('metaUnit').textContent = ind.unit;
    document.getElementById('metaType').textContent = ind.type;
    document.getElementById('metaStartDate').textContent = fmtDate(ind.startDate);
    document.getElementById('metaEndDate').textContent = fmtDate(ind.endDate);
    document.getElementById('metaDefinition').textContent = ind.definition;

    const dirEl = document.getElementById('metaDirection');
    if (ind.direction === 'desc') {
      dirEl.className = 'metadata__direction metadata__direction--desc';
      dirEl.innerHTML = '<i class="fas fa-arrow-down"></i> Doit diminuer';
    } else {
      dirEl.className = 'metadata__direction metadata__direction--asc';
      dirEl.innerHTML = '<i class="fas fa-arrow-up"></i> Doit augmenter';
    }
  }

  // ====================================================
  // STAT CARDS
  // ====================================================
  function renderStatCards() {
    const ind = getIndicator(currentIndicatorCode);
    const k = getKpisDef(ind, currentGeoLevelId);

    let actualValue;
    if (selectedRegion && k.regions[selectedRegion] !== undefined) {
      actualValue = k.regions[selectedRegion];
    } else {
      actualValue = k.actual;
    }

    const pct = computeAchievement(ind, actualValue);

    document.getElementById('statRefValue').textContent = fmt(ind.reference);
    document.getElementById('statRefSuffix').textContent = ind.unit === '%' ? ' %' : ' ' + ind.unit;

    document.getElementById('statCurrentValue').textContent = fmt(actualValue);
    document.getElementById('statCurrentSuffix').textContent = ind.unit === '%' ? ' %' : ' ' + ind.unit;
    document.getElementById('statCurrentDelta').textContent = selectedRegion
      ? `Région : ${selectedRegion}`
      : 'Valeur globale';

    document.getElementById('statTargetValue').textContent = fmt(ind.target);
    document.getElementById('statTargetSuffix').textContent = ind.unit === '%' ? ' %' : ' ' + ind.unit;

    document.getElementById('statProgressValue').textContent = pct === null ? '—' : fmt(pct);
    document.getElementById('statProgressSuffix').textContent = ' %';
  }

  // ====================================================
  // PROGRESSION VERS LA CIBLE — par zone géographique
  // ====================================================
  function renderProgressBar() {
    const ind = getIndicator(currentIndicatorCode);
    const k = getKpisDef(ind, currentGeoLevelId);

    const unitSuffix = ind.unit === '%' ? ' %' : ' ' + ind.unit;
    const globalPct = computeAchievement(ind, k.actual);
    const globalCls = classify(globalPct);

    // Header badge = moyenne globale (ou région sélectionnée si applicable)
    const badge = document.getElementById('progressBadge');
    badge.className = `progress-card__pct-badge progress-card__pct-badge--${globalCls}`;
    badge.textContent = globalPct === null ? '—' : `${fmt(globalPct)}% atteint`;

    // Légende
    document.getElementById('legendRefValue').textContent = fmt(ind.reference) + unitSuffix;
    document.getElementById('legendCurrentValue').textContent = fmt(k.actual) + unitSuffix;
    document.getElementById('legendTargetValue').textContent = fmt(ind.target) + unitSuffix;

    // Sous-titre adaptatif
    const sub = document.getElementById('progressSub');
    const geoLabel = (INDICATOR_DATA.geoLevels.find(g => g.id === currentGeoLevelId) || {}).label || '';
    sub.textContent = `Par zone géographique · ${geoLabel} · classé par % atteint`;

    // Build rows
    const wrap = document.getElementById('progressRows');
    const regions = k.regions || {};
    const entries = Object.entries(regions)
      .map(([name, val]) => ({ name, val, pct: computeAchievement(ind, val) }))
      .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));

    if (entries.length === 0) {
      wrap.innerHTML = `<div class="progress-rows__empty">Pas de ventilation géographique disponible à ce niveau.</div>`;
      return;
    }

    // ====== Slope chart : 3 marqueurs Référence / Actuel / Cible ======
    // Échelle X commune en valeurs réelles. Domaine = [refMin, valMax]
    // où refMin tient compte des indicateurs descendants (ref > target).
    const refVal = ind.reference;
    const tgtVal = ind.target;
    const allVals = entries.map(r => r.val ?? 0);
    const domainLow = Math.min(refVal, tgtVal, ...allVals);
    const domainHigh = Math.max(refVal, tgtVal, ...allVals);
    const span = domainHigh - domainLow || 1;
    const padding = span * 0.06; // marge de chaque côté pour respirer
    const dMin = domainLow - padding;
    const dMax = domainHigh + padding;

    const posOf = (v) => Math.max(0, Math.min(100, ((v - dMin) / (dMax - dMin)) * 100));
    const refPos = posOf(refVal);
    const tgtPos = posOf(tgtVal);

    // Échelle X dynamique en haut (5 graduations dans l'unité réelle)
    const scaleEl = document.getElementById('progressScale');
    if (scaleEl) {
      const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => fmt(dMin + (dMax - dMin) * t) + unitSuffix);
      scaleEl.innerHTML = ticks.map(t => `<div class="progress-bar-scale__item">${t}</div>`).join('');
    }

    wrap.innerHTML = entries.map((r, idx) => {
      const cls = classify(r.pct);
      const valPos = posOf(r.val ?? 0);
      const isSel = selectedRegion === r.name;
      const rank = String(idx + 1).padStart(2, '0');

      // Segment "parcouru" : entre référence et actuel
      const segLeft = Math.min(refPos, valPos);
      const segWidth = Math.abs(valPos - refPos);

      // Headers (Référence / Actuel / Cible) seulement sur la 1ère row
      const headers = idx === 0 ? `
        <div class="progress-row__slope-headers">
          <span class="progress-row__slope-header" style="left:${refPos}%">Référence</span>
          <span class="progress-row__slope-header" style="left:${valPos}%">Actuel</span>
          <span class="progress-row__slope-header" style="left:${tgtPos}%">Cible</span>
        </div>` : '';

      return `
        <div class="progress-row ${isSel ? 'is-selected' : ''}" data-region="${r.name.replace(/"/g, '&quot;')}" title="${r.name} · réf ${fmt(refVal)}${unitSuffix} · actuel ${fmt(r.val)}${unitSuffix} · cible ${fmt(tgtVal)}${unitSuffix} · ${r.pct === null ? '—' : fmt(r.pct) + '% atteint'}">
          <div class="progress-row__name">
            <span class="progress-row__name-rank">№${rank}</span>${r.name}
          </div>
          <div class="progress-row__slope">
            ${headers}
            <div class="progress-row__slope-line" style="left:${Math.min(refPos, tgtPos)}%;width:${Math.abs(tgtPos - refPos)}%"></div>
            <div class="progress-row__slope-line-traveled progress-row__slope-line-traveled--${cls}" style="left:${segLeft}%;width:${segWidth}%"></div>
            <div class="progress-row__slope-ref" style="left:${refPos}%"></div>
            <div class="progress-row__slope-target" style="left:${tgtPos}%"></div>
            <div class="progress-row__slope-actual progress-row__slope-actual--${cls}" style="left:${valPos}%"></div>
            <span class="progress-row__slope-value" style="left:${refPos}%">${fmt(refVal)}${unitSuffix}</span>
            <span class="progress-row__slope-value progress-row__slope-value--actual" style="left:${valPos}%">${fmt(r.val)}${unitSuffix}</span>
            <span class="progress-row__slope-value progress-row__slope-value--target" style="left:${tgtPos}%">${fmt(tgtVal)}${unitSuffix}</span>
          </div>
          <div class="progress-row__pct progress-row__pct--${cls}">${r.pct === null ? '—' : fmt(r.pct) + '%'}</div>
        </div>
      `;
    }).join('');

    // Bind clicks → sélection croisée avec la carte
    wrap.querySelectorAll('.progress-row').forEach(row => {
      row.addEventListener('click', () => {
        const name = row.dataset.region;
        if (selectedRegion === name) clearSelection();
        else selectRegion(name);
      });
    });
  }

  // ====================================================
  // GRAPHE D'ÉVOLUTION
  // ====================================================
  function renderChart() {
    const ind = getIndicator(currentIndicatorCode);
    const ctx = document.getElementById('indicatorChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();

    const grad = ctx.createLinearGradient(0, 0, 0, 360);
    grad.addColorStop(0, 'rgba(19,126,180,0.3)');
    grad.addColorStop(1, 'rgba(19,126,180,0)');

    const labels = ind.timeline.labels;
    // Valeur cible = la cible finale de l'indicateur, identique sur toutes les périodes
    const target = labels.map(() => ind.target);

    // Série "actual" ajustée à la zone géographique sélectionnée :
    // on garde la trajectoire historique nationale, mais on cale le dernier
    // point sur la valeur de la zone (région ou moyenne du niveau).
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
      data: {
        labels,
        datasets: [
          {
            type: 'line',
            label: `Valeur cible (${fmt(ind.target)}${ind.unit === '%' ? ' %' : ' ' + ind.unit})`,
            data: target,
            borderColor: '#7BA888',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [6, 5],
            tension: 0,
            pointRadius: 0,
            pointHoverRadius: 0,
            fill: false,
            order: 2
          },
          {
            type: 'line',
            label: 'Valeur relevée',
            data: actual,
            borderColor: '#137EB4',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0,
            borderWidth: 2.5,
            pointBackgroundColor: '#FFFFFF',
            pointBorderColor: '#137EB4',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 7,
            order: 1
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
            backgroundColor: '#131A20', padding: 12, cornerRadius: 8,
            titleColor: '#F1F6F9', bodyColor: '#D2DDE5',
            callbacks: { label: ctx => `${ctx.dataset.label} : ${fmt(ctx.parsed.y)}${ind.unit === '%' ? ' %' : ' ' + ind.unit}` }
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
            ticks: { font: { size: 10, weight: '500' }, color: '#4D5A65', maxRotation: 45, minRotation: 0 }
          }
        }
      }
    });

    // Sub-titre
    const geoLabel = (INDICATOR_DATA.geoLevels.find(g => g.id === currentGeoLevelId) || {}).label || '';
    const scopeLabel = selectedRegion ? selectedRegion : `${geoLabel} (moyenne)`;
    document.getElementById('chartSub').textContent = `Zone : ${scopeLabel} · cible ${fmt(ind.target)}${ind.unit === '%' ? ' %' : ' ' + ind.unit}`;
  }

  // ====================================================
  // CARTE LEAFLET
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
    if (value === undefined) {
      return `<div class="region-tooltip__name">${name}</div><div style="opacity:0.7">Pas de données</div>`;
    }
    const pct = computeAchievement(ind, value);
    return `
      <div class="region-tooltip__name">${name}</div>
      <div class="region-tooltip__row"><span>Valeur</span><strong>${fmt(value)}${ind.unit === '%' ? ' %' : ' ' + ind.unit}</strong></div>
      <div class="region-tooltip__row"><span>Cible</span><strong>${fmt(ind.target)}${ind.unit === '%' ? ' %' : ' ' + ind.unit}</strong></div>
      <div class="region-tooltip__row"><span>% atteint</span><strong>${pct === null ? '—' : fmt(pct) + ' %'}</strong></div>
      <div class="region-tooltip__hint">${selectedRegion === name ? 'Cliquez pour désélectionner' : 'Cliquez pour zoomer'}</div>
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
    renderStatCards();
    renderProgressBar();
    renderRegionsTable();
    renderChart();
  }

  function clearSelection() {
    selectedRegion = null;
    if (geoLayer) {
      refreshMapStyle();
      try { map.fitBounds(geoLayer.getBounds(), { padding: [20, 20] }); } catch (e) {}
    }
    renderStatCards();
    renderProgressBar();
    renderRegionsTable();
    renderChart();
  }

  // ====================================================
  // TABLEAU DES RÉGIONS
  // ====================================================
  function renderRegionsTable() {
    const tbody = document.getElementById('regionsTbody');
    if (!tbody) return;
    const ind = getIndicator(currentIndicatorCode);
    const k = getKpisDef(ind, currentGeoLevelId);
    const regions = k.regions || {};
    const countEl = document.getElementById('regionsCount');

    const entries = Object.entries(regions).map(([name, value]) => ({
      name,
      value,
      pct: computeAchievement(ind, value)
    })).sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));

    countEl.textContent = entries.length;

    if (entries.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4">
        <div class="regions-empty">
          <i class="fas fa-map-location-dot"></i>
          <p>Pas de données régionales pour ce niveau géographique</p>
        </div>
      </td></tr>`;
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
        </tr>
      `;
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
    renderMetadata();
    renderStatCards();
    renderProgressBar();
    renderChart();
    renderRegionsTable();
    refreshMapStyle();
  }

  function onGeoLevelChange(levelId) {
    currentGeoLevelId = levelId;
    selectedRegion = null;
    updateGeoTrigger();
    renderStatCards();
    renderProgressBar();
    renderRegionsTable();
    loadGeoJson();
  }

  function onValidatedChange(checked) {
    validatedOnly = checked;

    // Si l'indicateur courant n'est plus visible, basculer sur le premier visible
    const visible = getVisibleIndicators();
    if (validatedOnly && !visible.find(i => i.code === currentIndicatorCode)) {
      if (visible.length > 0) {
        onIndicatorChange(visible[0].code);
      }
    }
    // Le sélecteur va se re-render automatiquement à la prochaine ouverture
  }

  // ====================================================
  // INIT
  // ====================================================
  function init() {
    // Sélecteur indicateur (avec rendu custom : code + nom + badge non validé)
    buildSelector(
      'indicatorTrigger', 'indicatorDropdown',
      () => getVisibleIndicators().map(i => ({ value: i.code, label: i.name, _ind: i })),
      () => currentIndicatorCode,
      onIndicatorChange,
      {
        searchable: true,
        renderOption: it => `
          <div class="selector__option-content">
            <span class="selector__option-code">${it.value}</span>
            <div class="selector__option-name">
              ${it.label}
              ${it._ind && !it._ind.validated ? '<i class="fas fa-circle-exclamation selector__option-unvalidated" title="Données non validées"></i>' : ''}
            </div>
          </div>`
      }
    );

    // Sélecteur niveau géographique
    buildSelector(
      'geoTrigger', 'geoDropdown',
      () => INDICATOR_DATA.geoLevels.map(l => ({ value: l.id, label: l.label })),
      () => currentGeoLevelId,
      onGeoLevelChange,
      { searchable: false }
    );

    // Checkbox données validées
    document.getElementById('validatedToggle').addEventListener('change', e => onValidatedChange(e.target.checked));

    updateIndicatorTrigger();
    updateGeoTrigger();
    renderMetadata();
    renderStatCards();
    renderProgressBar();
    renderChart();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', IndicatorsDashboard.init);
