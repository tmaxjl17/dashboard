/* =========================================================
   INDICATEURS — Cockpit Editorial (Option C)
   ========================================================= */

const Cockpit = (() => {

  // ====== ÉTAT ======
  let currentIndicatorCode = INDICATOR_DATA.indicators[0].code;
  let currentGeoLevelId = 'level0';
  let validatedOnly = false;
  let selectedRegion = null;

  let chartInstance = null;
  let map = null;
  let geoLayer = null;

  // Date "aujourd'hui" simulée pour le calcul de statut
  // (les données projet vont jusqu'à 2020 — on simule fin 2018 pour avoir du sens)
  const TODAY = new Date('2018-06-30');

  // ====== HELPERS ======
  const fmt = (n, max = 2) => (n === null || n === undefined)
    ? '—'
    : n.toLocaleString('fr-FR', { maximumFractionDigits: max });
  const fmtDate = d => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

  const getIndicator = code => INDICATOR_DATA.indicators.find(i => i.code === code);
  const getVisibleIndicators = () => validatedOnly
    ? INDICATOR_DATA.indicators.filter(i => i.validated)
    : INDICATOR_DATA.indicators;
  const getKpisDef = (ind, levelId) => ind.kpis[levelId] || ind.kpis.level1;

  function unitSuffix(ind) {
    return ind.unit === '%' ? '%' : ' ' + ind.unit;
  }

  // % atteint vers la cible (gère asc/desc)
  function computeAchievement(ind, value) {
    if (value === null || value === undefined) return null;
    const ref = ind.reference;
    const tgt = ind.target;
    if (ind.direction === 'desc') {
      const span = ref - tgt;
      if (span <= 0) return null;
      return ((ref - value) / span) * 100;
    }
    const span = tgt - ref;
    if (span <= 0) return null;
    return ((value - ref) / span) * 100;
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

  // ====== SÉLECTEURS CUSTOM ======
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
        <div class="cp-selector__search">
          <input type="text" placeholder="Rechercher..." value="${filter}">
        </div>` : '';
      dropdown.innerHTML = searchHtml + `<div class="cp-selector__options">` + filtered.map(it => `
        <button class="cp-selector__option ${it.value === cv ? 'is-selected' : ''}" data-value="${it.value}">
          <i class="fas fa-check cp-selector__option-check"></i>
          ${renderOption(it)}
        </button>`).join('') + `</div>`;

      if (searchable) {
        const input = dropdown.querySelector('.cp-selector__search input');
        input.addEventListener('input', e => render(e.target.value));
        input.addEventListener('click', e => e.stopPropagation());
        setTimeout(() => input.focus(), 50);
      }
      dropdown.querySelectorAll('.cp-selector__option').forEach(btn => {
        btn.addEventListener('click', () => { onSelect(btn.dataset.value); close(); });
      });
    }

    function open() {
      document.querySelectorAll('.cp-selector__dropdown.is-open').forEach(d => {
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
      trigger.classList.contains('is-open') ? close() : open();
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

  // ====== SIDEBAR : Définition + meta + timeline projet ======
  function renderSidebar() {
    const ind = getIndicator(currentIndicatorCode);
    document.getElementById('metaDefinition').textContent = ind.definition;
    document.getElementById('metaUnit').textContent = ind.unit;
    document.getElementById('metaType').textContent = ind.type;
    document.getElementById('metaStartDate').textContent = fmtDate(ind.startDate);
    document.getElementById('metaEndDate').textContent = fmtDate(ind.endDate);

    const dirEl = document.getElementById('metaDirection');
    if (ind.direction === 'desc') {
      dirEl.className = 'cp-meta__direction cp-meta__direction--desc';
      dirEl.innerHTML = '<i class="fas fa-arrow-down"></i> Doit diminuer';
    } else {
      dirEl.className = 'cp-meta__direction cp-meta__direction--asc';
      dirEl.innerHTML = '<i class="fas fa-arrow-up"></i> Doit augmenter';
    }

    // Timeline : avancement temporel projet
    const start = new Date(ind.startDate).getTime();
    const end = new Date(ind.endDate).getTime();
    const now = Math.min(Math.max(TODAY.getTime(), start), end);
    const pct = Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100));
    document.getElementById('timelineFill').style.width = pct + '%';
    document.getElementById('timelineCursor').style.left = pct + '%';
    document.getElementById('timelineProgressText').textContent = `${fmt(pct, 0)}% du calendrier projet écoulé`;
  }

  // ====== HERO : gauge + identité + sparkline + statut ======
  function getCurrentValue(ind) {
    const k = getKpisDef(ind, currentGeoLevelId);
    if (selectedRegion && k.regions[selectedRegion] !== undefined) return k.regions[selectedRegion];
    return k.actual;
  }

  function expectedValueAtToday(ind) {
    // Trajectoire linéaire référence -> cible au prorata du temps
    const start = new Date(ind.startDate).getTime();
    const end = new Date(ind.endDate).getTime();
    const now = Math.min(Math.max(TODAY.getTime(), start), end);
    const t = (now - start) / (end - start);
    return ind.reference + (ind.target - ind.reference) * t;
  }

  function computeStatus(ind, actualValue) {
    // Compare la valeur actuelle à la trajectoire linéaire attendue
    const expected = expectedValueAtToday(ind);
    const ref = ind.reference;
    const tgt = ind.target;
    const span = Math.abs(tgt - ref);
    if (span === 0) return { key: 'on-track', label: 'À l\'heure', desc: 'Pas de trajectoire à comparer' };

    // Pour direction asc : meilleur = plus haut. Pour desc : meilleur = plus bas.
    const isAsc = ind.direction !== 'desc';
    const diff = isAsc ? (actualValue - expected) : (expected - actualValue);
    const ratio = (diff / span) * 100;

    if (ratio >= 5) {
      return { key: 'ahead', icon: 'fa-rocket', label: 'En avance', desc: `${fmt(Math.abs(ratio), 1)} pts au-dessus de la trajectoire` };
    }
    if (ratio >= -5) {
      return { key: 'on-track', icon: 'fa-circle-check', label: 'À l\'heure', desc: 'Vous suivez la trajectoire prévue' };
    }
    if (ratio >= -20) {
      return { key: 'late', icon: 'fa-triangle-exclamation', label: 'En retard', desc: `${fmt(Math.abs(ratio), 1)} pts en-dessous de la trajectoire` };
    }
    return { key: 'critical', icon: 'fa-circle-xmark', label: 'En retard significatif', desc: `${fmt(Math.abs(ratio), 1)} pts sous la trajectoire — alerte` };
  }

  function renderHero() {
    const ind = getIndicator(currentIndicatorCode);
    const actual = getCurrentValue(ind);
    const pct = computeAchievement(ind, actual);
    const cls = classify(pct);
    const colorMap = {
      low: '#E8595A', mid: '#E8A444', high: '#4FA972', over: '#0F6796'
    };

    // Identité
    document.getElementById('heroCode').textContent = ind.code;
    document.getElementById('heroTitle').textContent = ind.name;

    const validatedEl = document.getElementById('heroValidated');
    if (ind.validated) {
      validatedEl.className = 'cp-hero__validated';
      validatedEl.innerHTML = '<i class="fas fa-circle-check"></i> Validé';
    } else {
      validatedEl.className = 'cp-hero__validated is-unvalidated';
      validatedEl.innerHTML = '<i class="fas fa-circle-exclamation"></i> Non validé';
    }

    // Gauge — animation stroke-dasharray
    const gaugePctEl = document.getElementById('gaugePct');
    const arc = document.getElementById('gaugeArc');
    const targetPct = Math.max(0, Math.min(100, pct ?? 0));
    arc.setAttribute('stroke', colorMap[cls]);
    // Reset
    arc.setAttribute('stroke-dasharray', `0 100`);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        arc.setAttribute('stroke-dasharray', `${targetPct} ${100 - targetPct}`);
      });
    });

    // Count-up gauge
    animateCount(gaugePctEl, parseFloat(gaugePctEl.textContent.replace(',', '.')) || 0, targetPct, 700, v => fmt(v, 1).replace('.', ','));

    // Position du marqueur fantôme (trajectoire attendue) sur l'arc
    const expectedPct = computeAchievement(ind, expectedValueAtToday(ind));
    const ghost = document.getElementById('gaugeGhost');
    if (expectedPct !== null) {
      const angle = Math.PI * (1 - Math.max(0, Math.min(100, expectedPct)) / 100);
      const cx = 110 + 90 * Math.cos(angle);
      const cy = 120 - 90 * Math.sin(angle);
      ghost.setAttribute('cx', cx);
      ghost.setAttribute('cy', cy);
      ghost.style.display = '';
    } else {
      ghost.style.display = 'none';
    }

    // Sparkline
    renderSparkline(ind);

    // Statut adaptatif
    const status = computeStatus(ind, actual);
    const statusEl = document.getElementById('heroStatus');
    statusEl.className = 'cp-status is-' + status.key;
    statusEl.querySelector('.cp-status__icon').innerHTML = `<i class="fas ${status.icon || 'fa-circle-check'}"></i>`;
    statusEl.querySelector('.cp-status__label').textContent = status.label;
    statusEl.querySelector('.cp-status__desc').textContent = status.desc;
  }

  function renderSparkline(ind) {
    const svg = document.getElementById('heroSpark');
    const W = 280, H = 56, P = 4;
    const series = ind.timeline.actual;
    if (!series || series.length < 2) {
      svg.innerHTML = '';
      return;
    }
    const min = Math.min(...series);
    const max = Math.max(...series);
    const range = max - min || 1;

    const points = series.map((v, i) => {
      const x = P + (i / (series.length - 1)) * (W - 2 * P);
      const y = H - P - ((v - min) / range) * (H - 2 * P);
      return [x, y];
    });

    const path = points.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(' ');
    const area = `M ${P} ${H - P} ` + points.map(p => `L ${p[0]} ${p[1]}`).join(' ') + ` L ${W - P} ${H - P} Z`;
    const last = points[points.length - 1];

    svg.innerHTML = `
      <defs>
        <linearGradient id="sparkGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#137EB4" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="#137EB4" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${area}" fill="url(#sparkGrad)"/>
      <path d="${path}" fill="none" stroke="#137EB4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${last[0]}" cy="${last[1]}" r="4" fill="#FFFFFF" stroke="#137EB4" stroke-width="2"/>
    `;

    // Tendance
    const delta = ind.direction === 'desc'
      ? (ind.reference - series[series.length - 1])
      : (series[series.length - 1] - ind.reference);
    const trendEl = document.getElementById('heroTrend');
    const isPositive = delta >= 0;
    trendEl.className = 'cp-hero__spark-trend' + (isPositive ? '' : ' is-down');
    const arrow = isPositive ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down';
    const sign = isPositive ? '+' : '−';
    trendEl.innerHTML = `<i class="fas ${arrow}"></i> ${sign}${fmt(Math.abs(delta), 1)} ${ind.unit === '%' ? 'pts' : ind.unit}`;
  }

  function animateCount(el, from, to, duration, formatter) {
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from + (to - from) * eased;
      el.textContent = formatter(v);
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ====== STAT-CARDS ======
  function renderStatCards() {
    const ind = getIndicator(currentIndicatorCode);
    const actual = getCurrentValue(ind);
    const pct = computeAchievement(ind, actual);
    const u = unitSuffix(ind);

    document.getElementById('statRef').textContent = fmt(ind.reference);
    document.getElementById('statRefUnit').textContent = u;

    document.getElementById('statCurrent').textContent = fmt(actual);
    document.getElementById('statCurrentUnit').textContent = u;
    document.getElementById('statCurrentScope').textContent = selectedRegion
      ? `Région : ${selectedRegion}`
      : 'Niveau global';

    document.getElementById('statTarget').textContent = fmt(ind.target);
    document.getElementById('statTargetUnit').textContent = u;

    // Restant à parcourir
    const gap = ind.direction === 'desc'
      ? (actual - ind.target)
      : (ind.target - actual);
    document.getElementById('statGap').textContent = fmt(Math.max(0, gap), 1);
    document.getElementById('statGapUnit').textContent = ind.unit === '%' ? ' pts' : ' ' + ind.unit;
    document.getElementById('statGapHint').textContent = pct !== null && pct >= 100
      ? 'Cible atteinte'
      : (ind.direction === 'desc' ? 'Encore à diminuer' : 'Encore à gagner');
  }

  // ====== GRAPHE ÉVOLUTION ======
  function renderChart() {
    const ind = getIndicator(currentIndicatorCode);
    const ctx = document.getElementById('indicatorChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();

    const labels = ind.timeline.labels;
    // Trajectoire cible linéaire référence -> cible
    const target = labels.map((_, i) => {
      const t = i / Math.max(1, labels.length - 1);
      return ind.reference + (ind.target - ind.reference) * t;
    });

    // Cale la dernière valeur sur la valeur de la zone sélectionnée
    const k = getKpisDef(ind, currentGeoLevelId);
    let zoneActual;
    if (selectedRegion && k.regions[selectedRegion] !== undefined) zoneActual = k.regions[selectedRegion];
    else zoneActual = k.actual;
    const baseActual = ind.timeline.actual.slice();
    const ratio = baseActual[baseActual.length - 1] !== 0
      ? zoneActual / baseActual[baseActual.length - 1]
      : 1;
    const actual = baseActual.map((v, i) => i === 0 ? v : +(v * ratio).toFixed(2));
    actual[actual.length - 1] = zoneActual;

    const grad = ctx.createLinearGradient(0, 0, 0, 320);
    grad.addColorStop(0, 'rgba(19,126,180,0.30)');
    grad.addColorStop(1, 'rgba(19,126,180,0)');

    chartInstance = new Chart(ctx, {
      data: {
        labels,
        datasets: [
          {
            type: 'line',
            label: 'Trajectoire cible',
            data: target,
            borderColor: '#4FA972',
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
            backgroundColor: grad,
            fill: true,
            tension: 0.32,
            borderWidth: 2.5,
            pointBackgroundColor: '#FFFFFF',
            pointBorderColor: '#137EB4',
            pointBorderWidth: 2,
            pointRadius: ctxPt => ctxPt.dataIndex === actual.length - 1 ? 6 : 3,
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
          legend: { display: false },
          tooltip: {
            backgroundColor: '#131A20', padding: 12, cornerRadius: 8,
            titleColor: '#F1F6F9', bodyColor: '#D2DDE5',
            callbacks: {
              label: c => `${c.dataset.label} : ${fmt(c.parsed.y)}${unitSuffix(ind)}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: ind.reference >= 0,
            grid: { color: 'rgba(181,194,204,0.30)' },
            ticks: {
              font: { size: 11 }, color: '#6A7884',
              callback: v => v + (ind.unit === '%' ? ' %' : '')
            }
          },
          x: {
            grid: { display: false },
            ticks: {
              font: { size: 10.5, weight: '500' },
              color: '#4D5A65',
              maxRotation: 30,
              minRotation: 0,
              autoSkip: true,
              maxTicksLimit: 12
            }
          }
        }
      }
    });

    const geoLabel = (INDICATOR_DATA.geoLevels.find(g => g.id === currentGeoLevelId) || {}).label || '';
    const scope = selectedRegion ? `Région : ${selectedRegion}` : geoLabel;
    document.getElementById('chartSub').textContent = `${scope} · cible ${fmt(ind.target)}${unitSuffix(ind)}`;
  }

  // ====== CARTE LEAFLET ======
  function initMap() {
    if (map) return;
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
      console.error('GeoJSON error:', err);
      loadingEl.innerHTML = `<i class="fas fa-triangle-exclamation" style="font-size:24px;color:var(--cp-perf-low)"></i>
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
      <div class="region-tooltip__row"><span>Valeur</span><strong>${fmt(value)}${unitSuffix(ind)}</strong></div>
      <div class="region-tooltip__row"><span>Cible</span><strong>${fmt(ind.target)}${unitSuffix(ind)}</strong></div>
      <div class="region-tooltip__row"><span>% atteint</span><strong>${pct === null ? '—' : fmt(pct) + ' %'}</strong></div>
      <div class="region-tooltip__hint">${selectedRegion === name ? 'Cliquez pour désélectionner' : 'Cliquez pour zoomer'}</div>
    `;
  }

  function drawGeoLayer(geojson, nameProp) {
    const ind = getIndicator(currentIndicatorCode);
    const k = getKpisDef(ind, currentGeoLevelId);
    const regions = k.regions || {};

    geoLayer = L.geoJSON(geojson, {
      style: f => styleFeature(f, nameProp, regions, ind),
      onEachFeature: (f, layer) => {
        const name = f.properties[nameProp];
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
    geoLayer.setStyle(f => styleFeature(f, lvl.nameProp, regions, ind));
    geoLayer.eachLayer(layer => {
      const name = layer.feature.properties[lvl.nameProp];
      layer.setTooltipContent(buildTooltip(name, regions[name], ind));
      if (selectedRegion === name) layer.bringToFront();
    });
  }

  function selectRegion(name) {
    selectedRegion = name;
    document.getElementById('clearSelectionBtn').hidden = false;
    if (geoLayer) {
      refreshMapStyle();
      const lvl = INDICATOR_DATA.geoLevels.find(l => l.id === currentGeoLevelId);
      geoLayer.eachLayer(layer => {
        if (layer.feature.properties[lvl.nameProp] === name) {
          try { map.fitBounds(layer.getBounds(), { padding: [40, 40], maxZoom: 9 }); } catch (e) {}
        }
      });
    }
    renderHero();
    renderStatCards();
    renderRegionsList();
    renderChart();
  }

  function clearSelection() {
    selectedRegion = null;
    document.getElementById('clearSelectionBtn').hidden = true;
    if (geoLayer) {
      refreshMapStyle();
      try { map.fitBounds(geoLayer.getBounds(), { padding: [20, 20] }); } catch (e) {}
    }
    renderHero();
    renderStatCards();
    renderRegionsList();
    renderChart();
  }

  // ====== LISTE RÉGIONS ======
  function renderRegionsList() {
    const wrap = document.getElementById('regionsList');
    const ind = getIndicator(currentIndicatorCode);
    const k = getKpisDef(ind, currentGeoLevelId);
    const regions = k.regions || {};
    const entries = Object.entries(regions)
      .map(([name, value]) => ({ name, value, pct: computeAchievement(ind, value) }))
      .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));

    document.getElementById('regionsCount').textContent = entries.length;

    if (entries.length === 0) {
      wrap.innerHTML = `<div class="cp-regions-empty">
        <i class="fas fa-map-location-dot"></i>
        Pas de ventilation régionale à ce niveau géographique
      </div>`;
      return;
    }

    wrap.innerHTML = entries.map((r, i) => {
      const cls = classify(r.pct);
      const w = Math.min(Math.max(r.pct ?? 0, 0), 100);
      return `
        <div class="cp-region ${selectedRegion === r.name ? 'is-selected' : ''}" data-region="${r.name.replace(/"/g, '&quot;')}">
          <div class="cp-region__rank">#${i + 1}</div>
          <div class="cp-region__body">
            <div class="cp-region__name">${r.name}</div>
            <div class="cp-region__bar">
              <div class="cp-region__bar-fill cp-region__bar-fill--${cls}" style="width:${w}%"></div>
            </div>
          </div>
          <div class="cp-region__pct cp-region__pct--${cls}">${r.pct === null ? '—' : fmt(r.pct, 1) + '%'}</div>
        </div>`;
    }).join('');

    wrap.querySelectorAll('.cp-region').forEach(el => {
      el.addEventListener('click', () => {
        const name = el.dataset.region;
        if (selectedRegion === name) clearSelection();
        else selectRegion(name);
      });
    });
  }

  // ====== HANDLERS ======
  function onIndicatorChange(code) {
    currentIndicatorCode = code;
    selectedRegion = null;
    document.getElementById('clearSelectionBtn').hidden = true;
    updateIndicatorTrigger();
    renderSidebar();
    renderHero();
    renderStatCards();
    renderChart();
    renderRegionsList();
    refreshMapStyle();
  }
  function onGeoLevelChange(levelId) {
    currentGeoLevelId = levelId;
    selectedRegion = null;
    document.getElementById('clearSelectionBtn').hidden = true;
    updateGeoTrigger();
    renderHero();
    renderStatCards();
    renderRegionsList();
    loadGeoJson();
    renderChart();
  }
  function onValidatedChange(checked) {
    validatedOnly = checked;
    const visible = getVisibleIndicators();
    if (validatedOnly && !visible.find(i => i.code === currentIndicatorCode)) {
      if (visible.length > 0) onIndicatorChange(visible[0].code);
    }
  }

  // ====== INIT ======
  function init() {
    buildSelector(
      'indicatorTrigger', 'indicatorDropdown',
      () => getVisibleIndicators().map(i => ({ value: i.code, label: i.name, _ind: i })),
      () => currentIndicatorCode,
      onIndicatorChange,
      {
        searchable: true,
        renderOption: it => `
          <div class="cp-selector__option-content">
            <span class="cp-selector__option-code">${it.value}</span>
            <div class="cp-selector__option-name">
              ${it.label}
              ${it._ind && !it._ind.validated ? '<i class="fas fa-circle-exclamation cp-selector__option-unvalidated" title="Non validé"></i>' : ''}
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
    document.getElementById('clearSelectionBtn').addEventListener('click', clearSelection);

    updateIndicatorTrigger();
    updateGeoTrigger();
    renderSidebar();
    renderHero();
    renderStatCards();
    renderChart();
    renderRegionsList();
    initMap();
    loadGeoJson();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', Cockpit.init);
