/* =========================================================
   DASHBOARD ACTIVITÉS — FUSION (Option E)
   Sidebar + évolution annuelle + commentaires (activity)
   + répartition géographique + régions classées (activity2)
   + frise chronologique + KPI (activity-timeline)

   La frise pilote l'ensemble des données : KPI, carte, régions
   classées et graphe sont interpolés selon la position temporelle
   courante du curseur.
   ========================================================= */

const ActivityFusion = (() => {

  // === État ===
  let currentActivityCode = ACTIVITY_DATA.activities[0].code;
  let currentGeoLevelId = 'level1';
  let selectedRegion = null;

  const projectStart = new Date('2011-01-01').getTime();
  const projectEnd   = new Date('2020-12-31').getTime();
  const projectDuration = projectEnd - projectStart;

  let currentTime = projectStart;
  let isPlaying = false;
  let playSpeed = 1;
  let playStartTimestamp = 0;
  let playStartTime = 0;
  let isDragging = false;

  let chartInstance = null;
  let map = null;
  let geoLayer = null;

  // ================= HELPERS =================
  const fmt = n => (n === null || n === undefined) ? '—' : n.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
  const fmtDate = d => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  const fmtMonth = ts => new Date(ts).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  function getActivity(code) { return ACTIVITY_DATA.activities.find(a => a.code === code); }
  function getKpisDef(activity, levelId) { return activity.kpis[levelId] || activity.kpis.level1; }

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

  // === Interpolation temporelle : la frise pilote KPI, carte et graphe ===
  function getKpiAtTime(activity, levelId) {
    const k = getKpisDef(activity, levelId);
    const aStart = new Date(activity.startDate).getTime();
    const aEnd   = new Date(activity.endDate).getTime();
    if (currentTime < aStart) return { budget: 0, physique: 0, achievement: 0 };
    if (currentTime >= aEnd) return { budget: k.budget, physique: k.physique, achievement: k.achievement };
    const ratio = (currentTime - aStart) / (aEnd - aStart);
    return { budget: k.budget * ratio, physique: k.physique * ratio, achievement: k.achievement * ratio };
  }

  function getRegionsAtTime(activity, levelId) {
    const k = getKpisDef(activity, levelId);
    const regions = k.regions || {};
    const aStart = new Date(activity.startDate).getTime();
    const aEnd   = new Date(activity.endDate).getTime();

    let ratio;
    if (currentTime < aStart) ratio = 0;
    else if (currentTime >= aEnd) ratio = 1;
    else ratio = (currentTime - aStart) / (aEnd - aStart);

    const result = {};
    Object.entries(regions).forEach(([name, r]) => {
      result[name] = {
        budget: r.budget * ratio,
        physique: r.physique * ratio,
        achievement: r.achievement * ratio,
        active: ratio > 0
      };
    });
    return result;
  }

  function timeToPosition(ts) { return ((ts - projectStart) / projectDuration) * 100; }
  function positionToTime(pct) { return projectStart + (pct / 100) * projectDuration; }

  // ================= SÉLECTEURS (sidebar) =================
  function buildSelector(triggerId, dropdownId, items, currentValue, onSelect, opts = {}) {
    const trigger = document.getElementById(triggerId);
    const dropdown = document.getElementById(dropdownId);
    const searchable = opts.searchable !== false;

    function render(filter = '') {
      const filtered = items.filter(it =>
        !filter || it.label.toLowerCase().includes(filter.toLowerCase())
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

  // ================= MÉTADONNÉES + COMMENTAIRES =================
  function renderMetadata() {
    const a = getActivity(currentActivityCode);
    document.getElementById('metaUnit').textContent = a.unit;
    document.getElementById('metaResponsible').textContent = a.responsible;
    document.getElementById('metaStartDate').textContent = fmtDate(a.startDate);
    document.getElementById('metaEndDate').textContent = fmtDate(a.endDate);
    const statusEl = document.getElementById('metaStatus');
    statusEl.textContent = a.status;
    statusEl.dataset.status = a.status;
  }

  function renderComments() {
    const a = getActivity(currentActivityCode);
    document.getElementById('comments').textContent = a.comments;
  }

  // ================= PANNEAU RÉGION SÉLECTIONNÉE (sidebar) =================
  function renderRegionPanel() {
    const panel = document.getElementById('regionPanel');
    if (!selectedRegion) { panel.classList.add('is-hidden'); return; }

    const a = getActivity(currentActivityCode);
    const regions = getRegionsAtTime(a, currentGeoLevelId);
    const r = regions[selectedRegion];
    if (!r) { panel.classList.add('is-hidden'); return; }

    panel.classList.remove('is-hidden');
    document.getElementById('regionPanelName').textContent = selectedRegion;
    document.getElementById('regionPanelBudget').textContent = fmt(r.budget) + '%';
    document.getElementById('regionPanelPhysique').textContent = fmt(r.physique) + '%';
    document.getElementById('regionPanelAchievement').textContent = fmt(r.achievement) + '%';
  }

  function selectRegion(name) {
    selectedRegion = (selectedRegion === name) ? null : name;
    refreshMapStyle();
    renderRegionPanel();
    renderDrillDown();
    if (selectedRegion) zoomMapToRegion(selectedRegion);
    else try { map.fitBounds(geoLayer.getBounds(), { padding: [20, 20] }); } catch (e) {}
  }

  function clearSelection() {
    selectedRegion = null;
    refreshMapStyle();
    renderRegionPanel();
    renderDrillDown();
    try { map.fitBounds(geoLayer.getBounds(), { padding: [20, 20] }); } catch (e) {}
  }

  function zoomMapToRegion(name) {
    if (!geoLayer) return;
    const lvl = ACTIVITY_DATA.geoLevels.find(l => l.id === currentGeoLevelId);
    geoLayer.eachLayer(layer => {
      if (layer.feature.properties[lvl.nameProp] === name) {
        try { map.fitBounds(layer.getBounds(), { padding: [40, 40], maxZoom: 9 }); } catch (e) {}
      }
    });
  }

  // ================= KPI (pilotés par la frise) =================
  function renderKpis() {
    const a = getActivity(currentActivityCode);
    const k = getKpiAtTime(a, currentGeoLevelId);
    const target = getKpisDef(a, currentGeoLevelId);
    setKpi('Budget', k.budget, target.budget);
    setKpi('Physique', k.physique, target.physique);
    setKpi('Achievement', k.achievement, target.achievement);
  }

  function setKpi(suffix, value, target) {
    document.getElementById('kpi' + suffix + 'Value').textContent = fmt(value);
    const w = Math.min((value / Math.max(target, 1)) * 100, 100);
    document.getElementById('kpi' + suffix + 'Bar').style.width = w + '%';
  }

  // ================= RÉGIONS CLASSÉES (filtre régions, sous les KPI) =================
  function renderDrillDown() {
    const a = getActivity(currentActivityCode);
    const regions = getRegionsAtTime(a, currentGeoLevelId);
    const list = document.getElementById('drillList');
    const countEl = document.getElementById('drillCount');

    const entries = Object.entries(regions)
      .map(([name, r]) => ({ name, ...r }))
      .sort((x, y) => y.achievement - x.achievement);

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
        <div class="drill-item drill-item--${cls} ${selectedRegion === r.name ? 'is-highlighted' : ''}" data-region="${r.name.replace(/"/g, '&quot;')}">
          <div class="drill-item__rank">${i + 1}</div>
          <div class="drill-item__main">
            <div class="drill-item__name">${r.name}</div>
            <div class="drill-item__bar"><div class="drill-item__bar-fill" style="width:${w}%"></div></div>
          </div>
          <div class="drill-item__pct">${fmt(r.achievement)}%</div>
        </div>`;
    }).join('');

    list.querySelectorAll('.drill-item').forEach(el => {
      el.addEventListener('click', () => selectRegion(el.dataset.region));
    });
  }

  // ================= ÉVOLUTION ANNUELLE (sans filtre de dates) =================
  // Tronquée à l'année du curseur : le graphe se construit au fil de la frise.
  function renderChart() {
    const a = getActivity(currentActivityCode);
    const ctx = document.getElementById('activityChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();

    const currentYear = new Date(currentTime).getFullYear();
    const allLabels = a.yearly.labels;
    const cutoff = Math.max(1, allLabels.filter(y => y <= currentYear).length);

    const labels = allLabels.slice(0, cutoff);
    const budget = a.yearly.budget.slice(0, cutoff);
    const physique = a.yearly.physique.slice(0, cutoff);

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
            pointRadius: labels.map(l => l === currentYear ? 8 : 5),
            pointHoverRadius: 9,
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

  // ================= CARTE LEAFLET =================
  function initMap() {
    map = L.map('map', {
      center: [7.6, -5.5],
      zoom: 6,
      zoomControl: true
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

    if (geoLayer) { map.removeLayer(geoLayer); geoLayer = null; }

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

  function styleFeature(feature, nameProp, regions) {
    const name = feature.properties[nameProp];
    const r = regions[name];
    const value = r ? r.achievement : null;
    const isActive = r && r.active;
    const isSelected = selectedRegion === name;
    return {
      fillColor: isActive ? getChoroColor(value) : '#F1F6F9',
      weight: isSelected ? 3.5 : 1.2,
      opacity: 1,
      color: isSelected ? '#137EB4' : '#fff',
      fillOpacity: isActive ? (isSelected ? 1 : 0.85) : 0.3
    };
  }

  function buildTooltip(name, r) {
    if (!r) return `<div class="region-tooltip__name">${name}</div><div style="opacity:0.7">Pas de données</div>`;
    if (!r.active) return `<div class="region-tooltip__name">${name}</div><div style="opacity:0.7">Pas encore active</div>`;
    return `
      <div class="region-tooltip__name">${name}</div>
      <div class="region-tooltip__row"><span>% Budget</span><strong>${fmt(r.budget)}%</strong></div>
      <div class="region-tooltip__row"><span>% Physique</span><strong>${fmt(r.physique)}%</strong></div>
      <div class="region-tooltip__row"><span>% Achèvement</span><strong>${fmt(r.achievement)}%</strong></div>
      <div class="region-tooltip__hint">${selectedRegion === name ? 'Cliquez pour désélectionner' : 'Cliquez pour sélectionner'}</div>
    `;
  }

  function drawGeoLayer(geojson, nameProp) {
    const a = getActivity(currentActivityCode);
    const regions = getRegionsAtTime(a, currentGeoLevelId);

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
          if (selectedRegion !== name) { layer.setStyle({ weight: 2.5, color: '#137EB4' }); layer.bringToFront(); }
        });
        layer.on('mouseout', () => { if (selectedRegion !== name) geoLayer.resetStyle(layer); });
        layer.on('click', e => {
          L.DomEvent.stopPropagation(e);
          const r = regions[name];
          if (!r || !r.active) return;
          selectRegion(name);
        });
      }
    }).addTo(map);

    map.off('click');
    map.on('click', () => { if (selectedRegion) clearSelection(); });

    try { map.fitBounds(geoLayer.getBounds(), { padding: [20, 20] }); } catch (e) {}
  }

  function refreshMapStyle() {
    if (!geoLayer) return;
    const a = getActivity(currentActivityCode);
    const regions = getRegionsAtTime(a, currentGeoLevelId);
    const lvl = ACTIVITY_DATA.geoLevels.find(l => l.id === currentGeoLevelId);

    geoLayer.setStyle(feature => styleFeature(feature, lvl.nameProp, regions));

    geoLayer.eachLayer(layer => {
      const name = layer.feature.properties[lvl.nameProp];
      layer.setTooltipContent(buildTooltip(name, regions[name]));
      if (selectedRegion === name) layer.bringToFront();
    });
  }

  // ================= FRISE : piste + jalons + curseur =================
  function renderYears() {
    const top = document.getElementById('tlYears');
    const startY = new Date(projectStart).getFullYear();
    const endY = new Date(projectEnd).getFullYear();
    const yearsHtml = [];
    for (let y = startY; y <= endY; y++) yearsHtml.push(`<span>${y}</span>`);
    top.innerHTML = yearsHtml.join('');
  }

  function renderMilestones() {
    const wrap = document.getElementById('tlMilestones');
    wrap.innerHTML = ACTIVITY_DATA.milestones.map(m => {
      const ts = new Date(m.date).getTime();
      const pos = timeToPosition(ts);
      const isPassed = ts <= currentTime;
      return `
        <div class="tl-milestone tl-milestone--${m.type} ${isPassed ? 'is-passed' : 'is-future'}"
             style="left:${pos}%"
             data-ts="${ts}">
          <div class="tl-milestone-tooltip">
            <div class="tl-milestone-tooltip__title">
              <i class="fas ${m.icon}"></i> ${m.label}
            </div>
            <div class="tl-milestone-tooltip__date">${fmtDate(ts)}</div>
            <div class="tl-milestone-tooltip__desc">${m.desc}</div>
          </div>
        </div>
      `;
    }).join('');

    wrap.querySelectorAll('.tl-milestone').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        setTime(parseInt(el.dataset.ts));
      });
    });
  }

  function updateCursorPosition() {
    const pos = timeToPosition(currentTime);
    document.getElementById('tlCursor').style.left = pos + '%';
    document.getElementById('tlProgress').style.width = pos + '%';
    document.getElementById('tlCursorTag').textContent = fmtMonth(currentTime);
    document.getElementById('tlCurrentDate').textContent = fmtMonth(currentTime);

    document.querySelectorAll('.tl-milestone').forEach(el => {
      const ts = parseInt(el.dataset.ts);
      el.classList.toggle('is-passed', ts <= currentTime);
      el.classList.toggle('is-future', ts > currentTime);
    });
  }

  // ================= DRAG & DROP CURSEUR =================
  function initDragCursor() {
    const cursor = document.getElementById('tlCursor');
    const track = document.getElementById('tlTrack');

    function onMove(e) {
      if (!isDragging) return;
      const rect = track.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setTime(positionToTime(pct));
    }

    function startDrag(e) {
      e.preventDefault();
      isDragging = true;
      cursor.classList.add('is-dragging');
      stopPlay();
      document.addEventListener('mousemove', onMove);
      document.addEventListener('touchmove', onMove);
    }

    function endDrag() {
      isDragging = false;
      cursor.classList.remove('is-dragging');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('touchmove', onMove);
    }

    cursor.addEventListener('mousedown', startDrag);
    cursor.addEventListener('touchstart', startDrag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);

    track.addEventListener('click', e => {
      if (e.target.closest('.tl-milestone') || e.target.closest('.tl-milestone-tooltip')) return;
      const rect = track.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = (x / rect.width) * 100;
      setTime(positionToTime(pct));
    });
  }

  // ================= PLAY / PAUSE =================
  function togglePlay() {
    if (isPlaying) stopPlay();
    else startPlay();
  }

  function startPlay() {
    if (currentTime >= projectEnd) currentTime = projectStart;
    isPlaying = true;
    document.getElementById('tlPlayBtn').classList.add('is-playing');
    document.getElementById('tlPlayBtn').innerHTML = '<i class="fas fa-pause"></i>';
    playStartTimestamp = Date.now();
    playStartTime = currentTime;
    requestAnimationFrame(animatePlay);
  }

  function stopPlay() {
    isPlaying = false;
    document.getElementById('tlPlayBtn').classList.remove('is-playing');
    document.getElementById('tlPlayBtn').innerHTML = '<i class="fas fa-play"></i>';
  }

  function animatePlay() {
    if (!isPlaying) return;

    // 30 secondes pour parcourir 10 ans à vitesse 1x
    const elapsedMs = Date.now() - playStartTimestamp;
    const projectMsPerSecond = projectDuration / 30;
    const newTime = playStartTime + elapsedMs * (projectMsPerSecond / 1000) * playSpeed;

    if (newTime >= projectEnd) {
      currentTime = projectEnd;
      stopPlay();
    } else {
      currentTime = newTime;
    }
    refreshAll();
    if (isPlaying) requestAnimationFrame(animatePlay);
  }

  // ================= ORCHESTRATION (la frise pilote tout) =================
  function setTime(ts) {
    currentTime = Math.max(projectStart, Math.min(projectEnd, ts));
    refreshAll();
  }

  function refreshAll() {
    updateCursorPosition();
    renderKpis();
    renderDrillDown();
    renderChart();
    refreshMapStyle();
    renderRegionPanel();
  }

  // ================= CHANGEMENTS ACTIVITÉ / NIVEAU GÉO =================
  function onActivityChange(code) {
    currentActivityCode = code;
    selectedRegion = null;
    updateActivityTrigger();
    renderMetadata();
    renderComments();
    refreshAll();
  }

  function onGeoLevelChange(levelId) {
    currentGeoLevelId = levelId;
    selectedRegion = null;
    updateGeoTrigger();
    renderRegionPanel();
    loadGeoJson();
    refreshAll();
  }

  // ================= INIT =================
  function init() {
    buildSelector(
      'activityTrigger', 'activityDropdown',
      ACTIVITY_DATA.activities.map(a => ({ value: a.code, label: `${a.code}: ${a.name}` })),
      currentActivityCode,
      onActivityChange,
      { searchable: true }
    );

    buildSelector(
      'geoTrigger', 'geoDropdown',
      ACTIVITY_DATA.geoLevels.map(l => ({ value: l.id, label: l.label })),
      currentGeoLevelId,
      onGeoLevelChange,
      { searchable: false }
    );

    document.getElementById('regionPanelClose').addEventListener('click', clearSelection);
    document.getElementById('tlPlayBtn').addEventListener('click', togglePlay);
    document.querySelectorAll('input[name="tlSpeed"]').forEach(input => {
      input.addEventListener('change', e => playSpeed = parseFloat(e.target.value));
    });

    updateActivityTrigger();
    updateGeoTrigger();
    renderMetadata();
    renderComments();
    renderYears();
    renderMilestones();
    initDragCursor();

    currentTime = projectStart;
    refreshAll();

    initMap();
    loadGeoJson();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', ActivityFusion.init);
