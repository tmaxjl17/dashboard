/* =========================================================
   DASHBOARD ACTIVITY-TIMELINE - Option F
   Frise narrative scrubable avec mode play
   ========================================================= */

const TimelineDashboard = (() => {

  // === État ===
  let currentActivityCode = ACTIVITY_DATA.activities[0].code;
  let currentGeoLevelId = 'level1';

  // Bornes temporelles globales (calculées à partir des activités)
  const projectStart = new Date('2011-01-01').getTime();
  const projectEnd   = new Date('2020-12-31').getTime();
  const projectDuration = projectEnd - projectStart;

  let currentTime = projectStart;     // timestamp courant sur la frise
  let isPlaying = false;
  let playSpeed = 1;                   // 1x, 2x, 4x
  let playStartTimestamp = 0;
  let playStartTime = 0;

  let chartInstance = null;
  let map = null;
  let geoLayer = null;
  let isDragging = false;

  // ================= HELPERS =================
  const fmt = n => (n === null || n === undefined) ? '—' : n.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
  const fmtDate = ts => new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  const fmtMonth = ts => new Date(ts).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  function getActivity(code) { return ACTIVITY_DATA.activities.find(a => a.code === code); }
  function getKpisDef(activity, levelId) { return activity.kpis[levelId] || activity.kpis.level1; }

  function getChoroColor(value) {
    if (value === null || value === undefined) return '#E4ECF2';
    if (value >= 80) return '#0F6796';
    if (value >= 60) return '#137EB4';
    if (value >= 40) return '#5BA3CB';
    if (value >= 20) return '#9DC8E0';
    return '#D5E5EE';
  }

  // === INTERPOLATION TEMPORELLE ===
  // Pour une activité, on interpole entre les points yearly.{labels, budget, physique}
  // selon la position temporelle courante.
  function interpolateValue(activity, valueArrayKey) {
    const labels = activity.yearly.labels;
    const values = activity.yearly[valueArrayKey];

    // Hors période activité : avant = 0, après = dernière valeur
    const aStart = new Date(activity.startDate).getTime();
    const aEnd   = new Date(activity.endDate).getTime();
    if (currentTime < aStart) return 0;
    if (currentTime >= aEnd) {
      // On retourne la dernière valeur non-null
      for (let i = values.length - 1; i >= 0; i--) {
        if (values[i] !== null) return values[i];
      }
      return 0;
    }

    // Calcul du timestamp de chaque label (1er janvier de l'année, ou date relative à start/end)
    const yearTimes = labels.map(y => new Date(y, 0, 1).getTime());

    // Trouve l'intervalle [i, i+1] qui contient currentTime
    for (let i = 0; i < yearTimes.length - 1; i++) {
      if (currentTime >= yearTimes[i] && currentTime < yearTimes[i + 1]) {
        const v1 = values[i] ?? 0;
        const v2 = values[i + 1] ?? v1;
        const t = (currentTime - yearTimes[i]) / (yearTimes[i + 1] - yearTimes[i]);
        return v1 + (v2 - v1) * t;
      }
    }
    return values[values.length - 1] ?? 0;
  }

  // Pour les KPIs : on interpole entre 0 et la valeur cible finale en fonction du % temporel écoulé sur l'activité
  function getKpiAtTime(activity, levelId) {
    const k = getKpisDef(activity, levelId);
    const aStart = new Date(activity.startDate).getTime();
    const aEnd   = new Date(activity.endDate).getTime();

    if (currentTime < aStart) return { budget: 0, physique: 0, achievement: 0 };
    if (currentTime >= aEnd) return { budget: k.budget, physique: k.physique, achievement: k.achievement };

    const ratio = (currentTime - aStart) / (aEnd - aStart);
    return {
      budget:      k.budget * ratio,
      physique:    k.physique * ratio,
      achievement: k.achievement * ratio
    };
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
        budget:      r.budget * ratio,
        physique:    r.physique * ratio,
        achievement: r.achievement * ratio,
        active:      ratio > 0
      };
    });
    return result;
  }

  function timeToPosition(ts) {
    return ((ts - projectStart) / projectDuration) * 100;
  }

  function positionToTime(pct) {
    return projectStart + (pct / 100) * projectDuration;
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
        <div class="tl-selector__search">
          <input type="text" placeholder="Rechercher..." value="${filter}">
        </div>` : '';

      dropdown.innerHTML = searchHtml + filtered.map(it => `
        <button class="tl-selector__option ${it.value === currentValue ? 'is-selected' : ''}" data-value="${it.value}">
          <i class="fas fa-check tl-selector__option-check"></i>
          <span>${it.label}</span>
        </button>
      `).join('');

      if (searchable) {
        const input = dropdown.querySelector('.tl-selector__search input');
        input.addEventListener('input', e => render(e.target.value));
        input.addEventListener('click', e => e.stopPropagation());
        setTimeout(() => input.focus(), 50);
      }

      dropdown.querySelectorAll('.tl-selector__option').forEach(btn => {
        btn.addEventListener('click', () => { onSelect(btn.dataset.value); close(); });
      });
    }

    function open() {
      document.querySelectorAll('.tl-selector__dropdown.is-open').forEach(d => {
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

  function updateActivityBar() {
    const a = getActivity(currentActivityCode);
    document.getElementById('activityBarCode').textContent = a.code;
    document.getElementById('activityBarName').textContent = a.name;
    document.getElementById('activityValue').textContent = `${a.code} – ${a.name}`;
    const lvl = ACTIVITY_DATA.geoLevels.find(l => l.id === currentGeoLevelId);
    document.getElementById('geoValue').textContent = lvl.label;
  }

  // ================= TIMELINE TRACK =================
  function renderYears() {
    const top = document.getElementById('tlYears');
    const bottom = document.getElementById('tlYearsBottom');
    const startY = new Date(projectStart).getFullYear();
    const endY = new Date(projectEnd).getFullYear();
    const yearsHtml = [];
    for (let y = startY; y <= endY; y++) yearsHtml.push(`<span>${y}</span>`);
    top.innerHTML = yearsHtml.join('');
    bottom.innerHTML = '';
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

    // Click sur jalon = aller à cette date
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

    // Refresh état passed/future des jalons
    document.querySelectorAll('.tl-milestone').forEach(el => {
      const ts = parseInt(el.dataset.ts);
      el.classList.toggle('is-passed', ts <= currentTime);
      el.classList.toggle('is-future', ts > currentTime);
    });
  }

  // ================= DRAG & DROP CURSOR =================
  function initDragCursor() {
    const cursor = document.getElementById('tlCursor');
    const track = document.getElementById('tlTrack');

    function onMove(e) {
      if (!isDragging) return;
      const rect = track.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setTime(positionToTime(pct), false);
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

    // Click sur la barre pour aller à un point
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

  // ================= ACTIONS =================
  function setTime(ts, animate = true) {
    currentTime = Math.max(projectStart, Math.min(projectEnd, ts));
    refreshAll();
  }

  function refreshAll() {
    updateCursorPosition();
    renderKpis();
    renderStoryPanel();
    refreshChart();
    refreshMapStyle();
  }

  // ================= KPIs animés =================
  let lastKpiValues = { budget: 0, physique: 0, achievement: 0 };

  function renderKpis() {
    const a = getActivity(currentActivityCode);
    const k = getKpiAtTime(a, currentGeoLevelId);
    const target = getKpisDef(a, currentGeoLevelId);

    // Mise à jour avec animation rapide (transition CSS sur la valeur via interpolation JS)
    setKpi('Budget', k.budget, target.budget);
    setKpi('Physique', k.physique, target.physique);
    setKpi('Achievement', k.achievement, target.achievement);

    lastKpiValues = k;
  }

  function setKpi(suffix, value, target) {
    document.getElementById('kpi' + suffix + 'Value').textContent = fmt(value);
    const w = Math.min((value / Math.max(target, 1)) * 100, 100);
    document.getElementById('kpi' + suffix + 'Bar').style.width = w + '%';
  }

  // ================= STORY PANEL (texte narratif) =================
  function renderStoryPanel() {
    const a = getActivity(currentActivityCode);
    const k = getKpiAtTime(a, currentGeoLevelId);
    const aStart = new Date(a.startDate).getTime();
    const aEnd   = new Date(a.endDate).getTime();

    const yearEl = document.getElementById('storyYear');
    const labelEl = document.getElementById('storyLabel');
    const titleEl = document.getElementById('storyTitle');
    const textEl = document.getElementById('storyText');

    yearEl.textContent = new Date(currentTime).getFullYear();

    // Phase actuelle de l'activité
    let phase, label, title, text;
    if (currentTime < aStart) {
      phase = 'before';
      label = 'Avant le démarrage';
      title = 'Activité non démarrée';
      text = `À cette date (${fmtMonth(currentTime)}), l'activité « ${a.name} » n'avait pas encore débuté. Démarrage prévu le ${fmtDate(aStart)}.`;
    } else if (currentTime >= aEnd) {
      phase = 'after';
      label = 'Activité achevée';
      title = `Atteinte finale : ${fmt(k.achievement)}% de la cible`;
      text = `L'activité s'est terminée le ${fmtDate(aEnd)}. Avec ${fmt(k.physique)}% de réalisation physique pour ${fmt(k.budget)}% du budget consommé, le taux d'achèvement final est de ${fmt(k.achievement)}%.`;
    } else {
      const progress = ((currentTime - aStart) / (aEnd - aStart)) * 100;
      phase = 'during';
      label = `${progress.toFixed(0)}% du cycle écoulé`;
      if (k.achievement >= 80) {
        title = 'Performance excellente';
        text = `À ${fmtMonth(currentTime)}, l'activité affiche un taux d'achèvement de ${fmt(k.achievement)}%, dépassant les attentes. Le rythme physique (${fmt(k.physique)}%) suit bien la consommation budgétaire (${fmt(k.budget)}%).`;
      } else if (k.achievement >= 50) {
        title = 'Avancement régulier';
        text = `À mi-parcours (${fmtMonth(currentTime)}), l'activité progresse à ${fmt(k.achievement)}% de l'objectif. Réalisation physique : ${fmt(k.physique)}%. Budget consommé : ${fmt(k.budget)}%.`;
      } else {
        title = 'Démarrage en cours';
        text = `${fmtMonth(currentTime)} — l'activité est en phase de démarrage avec ${fmt(k.achievement)}% d'avancement. Les premières réalisations physiques (${fmt(k.physique)}%) sont en cours.`;
      }
    }

    labelEl.textContent = label;
    titleEl.textContent = title;
    textEl.textContent = text;
  }

  // ================= MINI-CHART (sparkline temporelle) =================
  function refreshChart() {
    const a = getActivity(currentActivityCode);
    const ctx = document.getElementById('tlChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();

    const labels = a.yearly.labels;
    const budget = a.yearly.budget;
    const physique = a.yearly.physique;

    // Position du curseur sur le graphe (annotation verticale)
    const currentYear = new Date(currentTime).getFullYear();

    const grad = ctx.createLinearGradient(0, 0, 0, 200);
    grad.addColorStop(0, 'rgba(19,126,180,0.35)');
    grad.addColorStop(1, 'rgba(19,126,180,0)');

    chartInstance = new Chart(ctx, {
      data: {
        labels,
        datasets: [
          {
            type: 'line',
            label: '% Budget',
            data: budget,
            borderColor: '#137EB4',
            backgroundColor: grad,
            fill: true,
            tension: 0.4,
            borderWidth: 2.5,
            pointBackgroundColor: '#fff',
            pointBorderColor: '#137EB4',
            pointBorderWidth: 2,
            pointRadius: labels.map(l => l === currentYear ? 7 : 4),
            pointHoverRadius: 7
          },
          {
            type: 'line',
            label: '% Physique',
            data: physique,
            borderColor: '#D4A574',
            backgroundColor: '#D4A574',
            borderWidth: 2.5,
            tension: 0.4,
            pointBackgroundColor: '#fff',
            pointBorderColor: '#D4A574',
            pointBorderWidth: 2,
            pointRadius: labels.map(l => l === currentYear ? 7 : 4),
            pointHoverRadius: 7,
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
            labels: { padding: 10, font: { size: 11, family: "'Inter', sans-serif" }, usePointStyle: true, pointStyle: 'circle', color: '#4D5A65', boxWidth: 8 }
          },
          tooltip: {
            backgroundColor: '#131A20',
            padding: 10,
            cornerRadius: 8,
            titleColor: '#F1F6F9',
            bodyColor: '#D2DDE5',
            callbacks: { label: ctx => `${ctx.dataset.label} : ${fmt(ctx.parsed.y)}` }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(181,194,204,0.35)' },
            ticks: { font: { size: 10 }, color: '#6A7884', maxTicksLimit: 4 }
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 10, weight: '500' }, color: '#4D5A65' }
          }
        }
      }
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
        <p>Impossible de charger la carte</p>`;
      return;
    }
    loadingEl.classList.add('is-hidden');
  }

  function styleFeature(feature, nameProp, regions) {
    const name = feature.properties[nameProp];
    const r = regions[name];
    const value = r ? r.achievement : null;
    const isActive = r && r.active;
    return {
      fillColor: isActive ? getChoroColor(value) : '#F1F6F9',
      weight: 1.2,
      opacity: 1,
      color: '#fff',
      fillOpacity: isActive ? 0.85 : 0.3
    };
  }

  function drawGeoLayer(geojson, nameProp) {
    const a = getActivity(currentActivityCode);
    const regions = getRegionsAtTime(a, currentGeoLevelId);

    geoLayer = L.geoJSON(geojson, {
      style: feature => styleFeature(feature, nameProp, regions),
      onEachFeature: (feature, layer) => {
        const name = feature.properties[nameProp];
        const r = regions[name];
        const tooltipContent = r && r.active ? `
          <div class="region-tooltip__name">${name}</div>
          <div class="region-tooltip__row"><span>% Budget</span><strong>${fmt(r.budget)}%</strong></div>
          <div class="region-tooltip__row"><span>% Physique</span><strong>${fmt(r.physique)}%</strong></div>
          <div class="region-tooltip__row"><span>% Achèvement</span><strong>${fmt(r.achievement)}%</strong></div>
        ` : `<div class="region-tooltip__name">${name}</div><div style="opacity:0.7">Pas encore active</div>`;

        layer.bindTooltip(tooltipContent, { className: 'region-tooltip', sticky: true, direction: 'top' });

        layer.on('mouseover', () => {
          layer.setStyle({ weight: 2.5, color: '#137EB4' });
          layer.bringToFront();
        });
        layer.on('mouseout', () => geoLayer.resetStyle(layer));
      }
    }).addTo(map);

    try { map.fitBounds(geoLayer.getBounds(), { padding: [20, 20] }); } catch (e) {}
  }

  function refreshMapStyle() {
    if (!geoLayer) return;
    const a = getActivity(currentActivityCode);
    const regions = getRegionsAtTime(a, currentGeoLevelId);
    const lvl = ACTIVITY_DATA.geoLevels.find(l => l.id === currentGeoLevelId);

    geoLayer.setStyle(feature => styleFeature(feature, lvl.nameProp, regions));

    let activeCount = 0;
    geoLayer.eachLayer(layer => {
      const name = layer.feature.properties[lvl.nameProp];
      const r = regions[name];
      if (r && r.active) activeCount++;
      const tooltipContent = r && r.active ? `
        <div class="region-tooltip__name">${name}</div>
        <div class="region-tooltip__row"><span>% Budget</span><strong>${fmt(r.budget)}%</strong></div>
        <div class="region-tooltip__row"><span>% Physique</span><strong>${fmt(r.physique)}%</strong></div>
        <div class="region-tooltip__row"><span>% Achèvement</span><strong>${fmt(r.achievement)}%</strong></div>
      ` : `<div class="region-tooltip__name">${name}</div><div style="opacity:0.7">Pas encore active</div>`;
      layer.setTooltipContent(tooltipContent);
    });

    document.getElementById('tlMapCounter').innerHTML = `<i class="fas fa-map-pin"></i> <strong>${activeCount}</strong> régions actives`;
  }

  // ================= CHANGE HANDLERS =================
  function onActivityChange(code) {
    currentActivityCode = code;
    updateActivityBar();
    refreshAll();
  }

  function onGeoLevelChange(levelId) {
    currentGeoLevelId = levelId;
    updateActivityBar();
    loadGeoJson();
    refreshAll();
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

    // Play / Pause
    document.getElementById('tlPlayBtn').addEventListener('click', togglePlay);

    // Speed
    document.querySelectorAll('input[name="tlSpeed"]').forEach(input => {
      input.addEventListener('change', e => playSpeed = parseFloat(e.target.value));
    });

    updateActivityBar();
    renderYears();
    renderMilestones();
    initDragCursor();

    // Position initiale : début projet
    currentTime = projectStart;
    refreshAll();

    initMap();
    loadGeoJson();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', TimelineDashboard.init);
