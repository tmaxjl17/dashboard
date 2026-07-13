/* =========================================================
   STUDIO — Tableau de bord personnalisé (Phase 1 MVP)
   - 5 widgets : kpi, stat, chart, donut, text
   - Largeur 1-12 cols, ordre séquentiel (réordonner ↑↓)
   - Modes Édition / Aperçu
   - Persistance localStorage
   - 4 templates de démarrage
   ========================================================= */

const Studio = (() => {

  // =====================================================
  // CONFIG
  // =====================================================
  const STORAGE_KEY = 'dashboard_studio_v1';
  const COLORS = ['blue', 'cyan', 'green', 'amber', 'rose', 'violet', 'slate'];

  const WIDGET_DEFS = {
    kpi: {
      label: 'KPI', desc: 'Grand chiffre + label',
      icon: 'fa-bullseye', paletteIcon: 'palette-item__icon--kpi',
      defaultW: 3, defaultH: 2, minW: 2, minH: 2,
      defaultConfig: { title: 'KPI', indicator: null, metric: 'current', color: 'blue', sub: '' }
    },
    stat: {
      label: 'Stat-card', desc: 'Chiffre + delta + icône',
      icon: 'fa-chart-simple', paletteIcon: 'palette-item__icon--stat',
      defaultW: 4, defaultH: 2, minW: 3, minH: 2,
      defaultConfig: { title: 'Indicateur', indicator: null, metric: 'current', color: 'cyan', icon: 'fa-bolt', showDelta: true }
    },
    chart: {
      label: 'Courbe', desc: 'Évolution dans le temps',
      icon: 'fa-chart-line', paletteIcon: 'palette-item__icon--chart',
      defaultW: 8, defaultH: 4, minW: 4, minH: 3,
      defaultConfig: { title: 'Évolution', indicator: null, color: 'violet', showTarget: true }
    },
    donut: {
      label: 'Donut', desc: '% atteint vs restant',
      icon: 'fa-circle-half-stroke', paletteIcon: 'palette-item__icon--donut',
      defaultW: 4, defaultH: 4, minW: 3, minH: 3,
      defaultConfig: { title: 'Atteinte de la cible', indicator: null, color: 'amber' }
    },
    text: {
      label: 'Texte', desc: 'Titre + description',
      icon: 'fa-align-left', paletteIcon: 'palette-item__icon--text',
      defaultW: 12, defaultH: 2, minW: 2, minH: 1,
      defaultConfig: { title: 'Titre de section', body: 'Ajoutez ici une description ou un commentaire libre.', align: 'left' }
    }
  };

  const GRID_COLS = 12;
  const ROW_PX = 80;
  const GRID_GAP = 16;

  const TEMPLATES = [
    {
      id: 'blank', name: 'Vierge', icon: 'fa-file',
      desc: 'Canvas vide — partez de zéro',
      widgets: []
    },
    {
      id: 'exec', name: 'Vue exécutive', icon: 'fa-briefcase',
      desc: '4 stat-cards + 1 graphe + 1 donut',
      widgets: [
        { type: 'text',  x: 0, y: 0, w: 12, h: 1, config: { title: 'Vue d\'ensemble du projet', body: 'Synthèse des indicateurs clés et avancement global.', align: 'left' } },
        { type: 'stat',  x: 0, y: 1, w: 3,  h: 2, config: { title: 'Bénéficiaires', indicator: '%BENEF_DEMO',  metric: 'pct', color: 'blue',   icon: 'fa-users',         showDelta: true } },
        { type: 'stat',  x: 3, y: 1, w: 3,  h: 2, config: { title: 'Puits réhabilités', indicator: '#PUITS_REHAB', metric: 'current', color: 'cyan', icon: 'fa-faucet-drip', showDelta: true } },
        { type: 'stat',  x: 6, y: 1, w: 3,  h: 2, config: { title: 'Réduction conflits', indicator: '%CONFLITS', metric: 'pct', color: 'green',  icon: 'fa-handshake',     showDelta: true } },
        { type: 'stat',  x: 9, y: 1, w: 3,  h: 2, config: { title: 'Jeunes formés', indicator: '#JEUNES_FORM', metric: 'current', color: 'amber',   icon: 'fa-graduation-cap',showDelta: true } },
        { type: 'chart', x: 0, y: 3, w: 8,  h: 4, config: { title: 'Évolution % Bénéficiaires', indicator: '%BENEF_DEMO', color: 'violet', showTarget: true } },
        { type: 'donut', x: 8, y: 3, w: 4,  h: 4, config: { title: 'Atteinte cible', indicator: '%BENEF_DEMO', color: 'blue' } }
      ]
    },
    {
      id: 'indic', name: 'Suivi indicateur', icon: 'fa-bullseye',
      desc: '1 KPI + 1 stat + 1 chart + 1 donut',
      widgets: [
        { type: 'text',  x: 0, y: 0, w: 12, h: 1, config: { title: '% Bénéficiaires', body: 'Suivi détaillé de l\'indicateur principal du projet.', align: 'left' } },
        { type: 'kpi',   x: 0, y: 1, w: 4,  h: 3, config: { title: 'Valeur actuelle', indicator: '%BENEF_DEMO', metric: 'current', color: 'blue', sub: 'Niveau global' } },
        { type: 'stat',  x: 4, y: 1, w: 4,  h: 3, config: { title: 'Atteinte de la cible', indicator: '%BENEF_DEMO', metric: 'pct', color: 'green', icon: 'fa-flag-checkered', showDelta: false } },
        { type: 'donut', x: 8, y: 1, w: 4,  h: 4, config: { title: 'Progression', indicator: '%BENEF_DEMO', color: 'amber' } },
        { type: 'chart', x: 0, y: 5, w: 12, h: 4, config: { title: 'Évolution dans le temps', indicator: '%BENEF_DEMO', color: 'violet', showTarget: true } }
      ]
    },
    {
      id: 'multi', name: 'Comparatif 4 indicateurs', icon: 'fa-table-cells-large',
      desc: '4 charts en grille 2×2',
      widgets: [
        { type: 'text',  x: 0, y: 0, w: 12, h: 1, config: { title: 'Comparatif des indicateurs', body: 'Évolution des 4 principaux indicateurs côte à côte.', align: 'left' } },
        { type: 'chart', x: 0, y: 1, w: 6, h: 4, config: { title: '% Bénéficiaires',       indicator: '%BENEF_DEMO',  color: 'blue',   showTarget: true } },
        { type: 'chart', x: 6, y: 1, w: 6, h: 4, config: { title: 'Puits réhabilités',     indicator: '#PUITS_REHAB', color: 'cyan',   showTarget: true } },
        { type: 'chart', x: 0, y: 5, w: 6, h: 4, config: { title: 'Réduction des conflits', indicator: '%CONFLITS',   color: 'green',  showTarget: true } },
        { type: 'chart', x: 6, y: 5, w: 6, h: 4, config: { title: 'Jeunes formés',         indicator: '#JEUNES_FORM', color: 'amber',  showTarget: true } }
      ]
    }
  ];

  // =====================================================
  // ÉTAT
  // =====================================================
  const state = {
    id: null,
    name: 'Mon dashboard',
    filters: { project: 'DEMO', geoLevel: 'level1' },
    widgets: [],            // [{ id, type, w, config }]
    selectedWidgetId: null,
    mode: 'edit'
  };

  const chartInstances = {}; // id -> Chart instance
  let saveTimer = null;

  // =====================================================
  // HELPERS
  // =====================================================
  const uid = () => 'w_' + Math.random().toString(36).slice(2, 10);
  const fmt = n => (n === null || n === undefined) ? '—' : n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });

  function hasIndicators() {
    return typeof INDICATOR_DATA !== 'undefined' && INDICATOR_DATA && Array.isArray(INDICATOR_DATA.indicators);
  }

  function getAllIndicators() {
    return hasIndicators() ? INDICATOR_DATA.indicators : [];
  }

  function getIndicator(code) {
    if (!hasIndicators() || !code) return null;
    return INDICATOR_DATA.indicators.find(i => i.code === code) || null;
  }

  function unitSuffix(ind) {
    if (!ind) return '';
    return ind.unit === '%' ? ' %' : ' ' + ind.unit;
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

  function getMetricValue(ind, metric, geoLevel) {
    if (!ind) return { value: null, label: '—', suffix: '' };
    const k = ind.kpis[geoLevel] || ind.kpis.level1;
    let value, label, suffix = unitSuffix(ind);
    switch (metric) {
      case 'reference':
        value = ind.reference; label = 'Référence'; break;
      case 'target':
        value = ind.target; label = 'Cible'; break;
      case 'pct':
        value = computeAchievement(ind, k.actual); label = '% atteint'; suffix = ' %'; break;
      case 'current':
      default:
        value = k.actual; label = 'Valeur actuelle'; break;
    }
    return { value, label, suffix };
  }

  function colorHex(name) {
    return {
      blue: '#2563EB', cyan: '#06B6D4', green: '#10B981',
      amber: '#F59E0B', rose: '#F43F5E', violet: '#8B5CF6', slate: '#64748B'
    }[name] || '#2563EB';
  }

  // =====================================================
  // GRILLE — collisions, compact, migration
  // =====================================================
  function collides(a, b) {
    return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
  }

  // Vérifie si un rectangle (x,y,w,h) chevauche un widget existant (autre que ignoreId)
  function collidesAny(rect, ignoreId, list) {
    return (list || state.widgets).some(o => o.id !== ignoreId && collides(rect, o));
  }

  // Algo de "push-down" après dépôt d'un widget (movingId) à sa nouvelle position
  function resolveCollisions(movingId) {
    const moved = state.widgets.find(w => w.id === movingId);
    if (!moved) return;
    let safety = 0;
    let again = true;
    while (again && safety++ < 200) {
      again = false;
      for (const w of state.widgets) {
        if (w.id === movingId) continue;
        if (collides(moved, w)) {
          // Pousser w en-dessous de moved
          w.y = moved.y + moved.h;
          again = true;
        }
      }
      // Cascade : un widget poussé peut maintenant en pousser un autre
      for (const a of state.widgets) {
        for (const b of state.widgets) {
          if (a === b) continue;
          if (a.id === movingId || b.id === movingId) continue;
          if (collides(a, b)) {
            // Le plus haut reste, l'autre descend
            const top = a.y <= b.y ? a : b;
            const bot = a.y <= b.y ? b : a;
            bot.y = top.y + top.h;
            again = true;
          }
        }
      }
    }
  }

  // Remonte tous les widgets le plus haut possible (sans changer leur ordre vertical)
  function compactWidgets() {
    const sorted = [...state.widgets].sort((a, b) => a.y - b.y || a.x - b.x);
    for (const w of sorted) {
      let bestY = 0;
      for (const o of sorted) {
        if (o === w) continue;
        if (o.y >= w.y && o !== w) continue; // ignore widgets en-dessous
        // Overlap horizontal ?
        if (!(w.x + w.w <= o.x || o.x + o.w <= w.x)) {
          bestY = Math.max(bestY, o.y + o.h);
        }
      }
      w.y = bestY;
    }
  }

  // Trouve la prochaine position libre pour un widget de taille (w,h)
  function findFreeSlot(w, h) {
    for (let y = 0; y < 200; y++) {
      for (let x = 0; x <= GRID_COLS - w; x++) {
        if (!collidesAny({ x, y, w, h }, null)) return { x, y };
      }
    }
    return { x: 0, y: 0 };
  }

  // Migration des widgets Phase 1 (juste w) vers Phase 2 (x, y, w, h)
  function migrateWidgets(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return arr || [];
    // Phase 2 déjà en place ?
    if (arr.every(x => x.x !== undefined && x.y !== undefined && x.h !== undefined)) return arr;
    let cursorX = 0, cursorY = 0, rowMaxH = 0;
    return arr.map(w => {
      const def = WIDGET_DEFS[w.type] || { defaultH: 2 };
      const h = w.h ?? def.defaultH;
      const ww = w.w ?? def.defaultW;
      if (cursorX + ww > GRID_COLS) {
        cursorX = 0;
        cursorY += rowMaxH || 1;
        rowMaxH = 0;
      }
      const placed = { ...w, x: cursorX, y: cursorY, w: ww, h };
      cursorX += ww;
      rowMaxH = Math.max(rowMaxH, h);
      if (cursorX >= GRID_COLS) { cursorX = 0; cursorY += rowMaxH; rowMaxH = 0; }
      return placed;
    });
  }

  // =====================================================
  // PERSISTANCE
  // =====================================================
  function loadIndex() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY + '.index');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  function saveIndex(index) {
    localStorage.setItem(STORAGE_KEY + '.index', JSON.stringify(index));
  }

  function loadDashboard(id) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY + '.' + id);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function persist() {
    if (!state.id) state.id = 'd_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const data = {
      id: state.id,
      name: state.name,
      filters: state.filters,
      widgets: state.widgets,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY + '.' + state.id, JSON.stringify(data));

    // Index
    const index = loadIndex().filter(d => d.id !== state.id);
    index.unshift({
      id: state.id,
      name: state.name,
      widgetsCount: state.widgets.length,
      updatedAt: data.updatedAt
    });
    saveIndex(index);
  }

  function deleteDashboard(id) {
    localStorage.removeItem(STORAGE_KEY + '.' + id);
    const index = loadIndex().filter(d => d.id !== id);
    saveIndex(index);
  }

  function scheduleSave() {
    showSaved('saving');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      persist();
      showSaved('saved');
    }, 500);
  }

  function showSaved(status) {
    const el = document.getElementById('savedIndicator');
    if (status === 'saving') {
      el.className = 'studio-saved is-visible is-saving';
      el.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Enregistrement…';
    } else {
      el.className = 'studio-saved is-visible';
      el.innerHTML = '<i class="fas fa-check"></i> Enregistré';
      setTimeout(() => el.classList.remove('is-visible'), 2000);
    }
  }

  // =====================================================
  // PALETTE
  // =====================================================
  function renderPalette() {
    const list = document.getElementById('paletteWidgets');
    list.innerHTML = Object.entries(WIDGET_DEFS).map(([type, def]) => `
      <button class="palette-item" data-add-widget="${type}">
        <span class="palette-item__icon ${def.paletteIcon}"><i class="fas ${def.icon}"></i></span>
        <span class="palette-item__body">
          <span class="palette-item__name">${def.label}</span>
          <span class="palette-item__desc">${def.desc}</span>
        </span>
      </button>
    `).join('');

    // Note : le clic ajoute au slot libre, le drag dépose au curseur.
    // Les deux comportements sont gérés dans le DragSystem (onMouseUp).
    // Pour les utilisateurs sans souris (touch), fallback click :
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      list.querySelectorAll('[data-add-widget]').forEach(btn => {
        btn.addEventListener('click', () => addWidget(btn.dataset.addWidget));
      });
    }

    const tplList = document.getElementById('paletteTemplates');
    tplList.innerHTML = TEMPLATES.map(t => `
      <button class="palette-item" data-template="${t.id}">
        <span class="palette-item__icon palette-item__icon--template"><i class="fas ${t.icon}"></i></span>
        <span class="palette-item__body">
          <span class="palette-item__name">${t.name}</span>
          <span class="palette-item__desc">${t.desc}</span>
        </span>
      </button>
    `).join('');

    tplList.querySelectorAll('[data-template]').forEach(btn => {
      btn.addEventListener('click', () => applyTemplate(btn.dataset.template));
    });
  }

  function addWidget(type, atPos = null) {
    const def = WIDGET_DEFS[type];
    if (!def) return null;

    let x, y;
    const ww = def.defaultW;
    const hh = def.defaultH;

    if (atPos) {
      x = Math.max(0, Math.min(GRID_COLS - ww, atPos.x));
      y = Math.max(0, atPos.y);
    } else {
      const slot = findFreeSlot(ww, hh);
      x = slot.x;
      y = slot.y;
    }

    const w = {
      id: uid(),
      type,
      x, y,
      w: ww, h: hh,
      config: structuredClone(def.defaultConfig)
    };
    if (['kpi', 'stat', 'chart', 'donut'].includes(type) && hasIndicators()) {
      w.config.indicator = INDICATOR_DATA.indicators[0].code;
    }
    state.widgets.push(w);
    if (atPos) resolveCollisions(w.id);
    state.selectedWidgetId = w.id;
    renderCanvas();
    renderInspector();
    scheduleSave();

    setTimeout(() => {
      const el = document.querySelector(`[data-widget-id="${w.id}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
    return w;
  }

  function applyTemplate(id) {
    const tpl = TEMPLATES.find(t => t.id === id);
    if (!tpl) return;

    if (state.widgets.length > 0) {
      openModal({
        title: 'Remplacer le contenu actuel ?',
        body: `Le template « ${tpl.name} » va remplacer les ${state.widgets.length} widgets actuels. Cette action est irréversible.`,
        confirm: () => doApplyTemplate(tpl)
      });
      return;
    }
    doApplyTemplate(tpl);
  }

  function doApplyTemplate(tpl) {
    state.widgets = tpl.widgets.map(w => {
      const def = WIDGET_DEFS[w.type] || {};
      return {
        id: uid(),
        type: w.type,
        x: w.x ?? 0,
        y: w.y ?? 0,
        w: w.w ?? def.defaultW ?? 4,
        h: w.h ?? def.defaultH ?? 2,
        config: structuredClone(w.config)
      };
    });
    state.selectedWidgetId = null;
    state.name = state.name === 'Mon dashboard' ? tpl.name : state.name;
    document.getElementById('dashName').value = state.name;
    renderCanvas();
    renderInspector();
    scheduleSave();
    toast(`Template « ${tpl.name} » appliqué`);
  }

  // =====================================================
  // CANVAS
  // =====================================================
  function renderCanvas() {
    const canvas = document.getElementById('canvas');

    // Détruire les anciens charts
    Object.values(chartInstances).forEach(c => c.destroy());
    Object.keys(chartInstances).forEach(k => delete chartInstances[k]);

    if (state.widgets.length === 0) {
      canvas.innerHTML = `
        <div class="canvas-empty">
          <div class="canvas-empty__icon"><i class="fas fa-shapes"></i></div>
          <h2>Composez votre tableau de bord</h2>
          <p>Cliquez sur un widget dans la palette de gauche pour l'ajouter, ou choisissez un template pour démarrer rapidement.</p>
          <button class="canvas-empty__cta" data-open-template>
            <i class="fas fa-wand-magic-sparkles"></i> Choisir un template
          </button>
        </div>`;
      const cta = canvas.querySelector('[data-open-template]');
      if (cta) cta.addEventListener('click', () => applyTemplate('exec'));
      return;
    }

    canvas.innerHTML = state.widgets.map(w => renderWidgetWrapper(w)).join('');

    // Bind sélection (clic) + handles
    canvas.querySelectorAll('.canvas-widget').forEach(el => {
      const id = el.dataset.widgetId;
      el.addEventListener('click', e => {
        if (e.target.closest('.canvas-widget__handle, .canvas-widget__resize')) return;
        if (drag.justDragged) return; // évite la sélection après un drag
        selectWidget(id);
      });
    });
    canvas.querySelectorAll('[data-handle="del"]').forEach(b => {
      b.addEventListener('click', e => { e.stopPropagation(); deleteWidget(b.dataset.id); });
    });

    // Render charts (après que le DOM soit en place)
    state.widgets.forEach(w => {
      if (w.type === 'chart') renderChartWidget(w);
      if (w.type === 'donut') renderDonutWidget(w);
    });
  }

  function renderWidgetWrapper(w) {
    const sel = state.selectedWidgetId === w.id ? 'is-selected' : '';
    const style = `grid-column: ${w.x + 1} / span ${w.w}; grid-row: ${w.y + 1} / span ${w.h};`;
    return `
      <div class="canvas-widget ${sel}" data-widget-id="${w.id}" style="${style}">
        <div class="canvas-widget__handles">
          <button class="canvas-widget__handle canvas-widget__handle--drag" data-handle="drag" data-id="${w.id}" title="Glissez pour déplacer">
            <i class="fas fa-up-down-left-right"></i>
          </button>
          <button class="canvas-widget__handle canvas-widget__handle--danger" data-handle="del" data-id="${w.id}" title="Supprimer">
            <i class="fas fa-trash"></i>
          </button>
        </div>
        ${renderWidgetBody(w)}
        <div class="canvas-widget__resize" data-resize="${w.id}" title="Redimensionner"></div>
      </div>
    `;
  }

  // Met à jour seulement la position/taille d'un widget dans le DOM (sans re-render complet)
  function updateWidgetEl(w) {
    const el = document.querySelector(`[data-widget-id="${w.id}"]`);
    if (!el) return;
    el.style.gridColumn = `${w.x + 1} / span ${w.w}`;
    el.style.gridRow = `${w.y + 1} / span ${w.h}`;
  }

  function renderWidgetBody(w) {
    switch (w.type) {
      case 'kpi':   return renderKPI(w);
      case 'stat':  return renderStat(w);
      case 'chart': return renderChartShell(w);
      case 'donut': return renderDonutShell(w);
      case 'text':  return renderText(w);
      default: return '';
    }
  }

  // ===== Widget KPI =====
  function renderKPI(w) {
    const ind = getIndicator(w.config.indicator);
    const m = getMetricValue(ind, w.config.metric, state.filters.geoLevel);
    return `
      <div class="cw-kpi cw-kpi--${w.config.color}">
        <div class="cw-header">
          <span class="cw-title">${escapeHtml(w.config.title || m.label)}</span>
        </div>
        <div class="cw-kpi__value">
          <span>${fmt(m.value)}</span><span class="cw-kpi__suffix">${m.suffix.trim()}</span>
        </div>
        <div class="cw-kpi__sub">${escapeHtml(w.config.sub || (ind ? ind.code : 'Aucun indicateur'))}</div>
      </div>
    `;
  }

  // ===== Widget Stat-card =====
  function renderStat(w) {
    const ind = getIndicator(w.config.indicator);
    const m = getMetricValue(ind, w.config.metric, state.filters.geoLevel);
    let deltaHtml = '';
    if (w.config.showDelta && ind && m.value !== null) {
      const ref = ind.reference;
      let delta;
      if (w.config.metric === 'pct') {
        delta = m.value;
      } else {
        delta = ind.direction === 'desc' ? (ref - m.value) : (m.value - ref);
      }
      const cls = delta > 0 ? 'up' : (delta < 0 ? 'down' : 'flat');
      const arrow = delta > 0 ? 'fa-arrow-trend-up' : (delta < 0 ? 'fa-arrow-trend-down' : 'fa-minus');
      const sign = delta > 0 ? '+' : '';
      deltaHtml = `<span class="cw-stat__delta cw-stat__delta--${cls}">
        <i class="fas ${arrow}"></i> ${sign}${fmt(delta)}${m.suffix.trim()}
      </span>`;
    }
    return `
      <div class="cw-stat cw-stat--${w.config.color}">
        <div class="cw-stat__row">
          <div class="cw-stat__icon"><i class="fas ${w.config.icon || 'fa-bolt'}"></i></div>
          <div class="cw-stat__body">
            <div class="cw-stat__label">${escapeHtml(w.config.title || m.label)}</div>
            <div class="cw-stat__value">
              <span>${fmt(m.value)}</span><span class="cw-stat__suffix">${m.suffix.trim()}</span>
            </div>
            ${deltaHtml}
          </div>
        </div>
      </div>
    `;
  }

  // ===== Widget Chart (shell + Chart.js) =====
  function renderChartShell(w) {
    return `
      <div class="cw-chart">
        <div class="cw-header">
          <span class="cw-title">${escapeHtml(w.config.title || 'Évolution')}</span>
        </div>
        <div class="cw-chart-body">
          <canvas data-chart-id="${w.id}"></canvas>
        </div>
      </div>
    `;
  }

  function renderChartWidget(w) {
    const canvas = document.querySelector(`canvas[data-chart-id="${w.id}"]`);
    if (!canvas) return;
    const ind = getIndicator(w.config.indicator);
    if (!ind) {
      canvas.parentElement.innerHTML = `<div style="display:grid;place-items:center;height:100%;color:var(--st-text-mute);font-size:13px;font-weight:500">Sélectionnez un indicateur dans l'inspecteur</div>`;
      return;
    }
    const ctx = canvas.getContext('2d');
    const color = colorHex(w.config.color);
    const grad = ctx.createLinearGradient(0, 0, 0, 240);
    grad.addColorStop(0, color + '40');
    grad.addColorStop(1, color + '00');

    const datasets = [
      {
        type: 'line',
        label: 'Valeur relevée',
        data: ind.timeline.actual,
        borderColor: color,
        backgroundColor: grad,
        fill: true,
        tension: 0.3,
        borderWidth: 2.5,
        pointBackgroundColor: '#FFF',
        pointBorderColor: color,
        pointBorderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 6
      }
    ];
    if (w.config.showTarget) {
      datasets.push({
        type: 'line',
        label: 'Cible',
        data: ind.timeline.target,
        borderColor: '#94A3B8',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [6, 5],
        tension: 0,
        pointRadius: 0,
        fill: false
      });
    }

    chartInstances[w.id] = new Chart(ctx, {
      data: { labels: ind.timeline.labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { size: 11 }, usePointStyle: true, padding: 10, color: '#4D5A65' }
          },
          tooltip: {
            backgroundColor: '#131A20', padding: 10, cornerRadius: 8,
            titleColor: '#F1F6F9', bodyColor: '#D2DDE5'
          }
        },
        scales: {
          y: {
            beginAtZero: ind.reference >= 0,
            grid: { color: 'rgba(181,194,204,0.30)' },
            ticks: { font: { size: 10 }, color: '#6A7884' }
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 10 }, color: '#4D5A65', maxRotation: 30, autoSkip: true, maxTicksLimit: 10 }
          }
        }
      }
    });
  }

  // ===== Widget Donut =====
  function renderDonutShell(w) {
    return `
      <div class="cw-donut">
        <div class="cw-header">
          <span class="cw-title">${escapeHtml(w.config.title || 'Atteinte de la cible')}</span>
        </div>
        <div class="cw-donut-body">
          <canvas data-donut-id="${w.id}"></canvas>
        </div>
      </div>
    `;
  }

  function renderDonutWidget(w) {
    const canvas = document.querySelector(`canvas[data-donut-id="${w.id}"]`);
    if (!canvas) return;
    const ind = getIndicator(w.config.indicator);
    if (!ind) {
      canvas.parentElement.innerHTML = `<div style="display:grid;place-items:center;height:100%;color:var(--st-text-mute);font-size:13px;font-weight:500">Sélectionnez un indicateur dans l'inspecteur</div>`;
      return;
    }
    const k = ind.kpis[state.filters.geoLevel] || ind.kpis.level1;
    const pct = computeAchievement(ind, k.actual);
    const filled = Math.max(0, Math.min(100, pct ?? 0));
    const remaining = 100 - filled;
    const ctx = canvas.getContext('2d');
    const color = colorHex(w.config.color);

    chartInstances[w.id] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Atteint', 'Restant'],
        datasets: [{
          data: [filled, remaining],
          backgroundColor: [color, '#EEF2F6'],
          borderWidth: 0,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { size: 11 }, usePointStyle: true, padding: 10, color: '#4D5A65' }
          },
          tooltip: {
            backgroundColor: '#131A20', padding: 10, cornerRadius: 8,
            callbacks: { label: c => `${c.label} : ${fmt(c.parsed)} %` }
          }
        }
      },
      plugins: [{
        id: 'centerText',
        afterDraw(chart) {
          const { ctx, chartArea: { left, right, top, bottom } } = chart;
          const cx = (left + right) / 2, cy = (top + bottom) / 2;
          ctx.save();
          ctx.fillStyle = '#1F2D3D';
          ctx.font = '700 22px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(fmt(filled) + ' %', cx, cy - 6);
          ctx.font = '500 11px Inter, sans-serif';
          ctx.fillStyle = '#8090A0';
          ctx.fillText('atteint', cx, cy + 14);
          ctx.restore();
        }
      }]
    });
  }

  // ===== Widget Texte =====
  function renderText(w) {
    const titleCls = w.config.title ? '' : 'is-empty';
    const bodyCls = w.config.body ? '' : 'is-empty';
    const alignCls = w.config.align === 'center' ? 'cw-text--center' : (w.config.align === 'right' ? 'cw-text--right' : '');
    return `
      <div class="cw-text ${alignCls}">
        <div class="cw-text__title ${titleCls}">${escapeHtml(w.config.title || 'Titre vide')}</div>
        <div class="cw-text__body ${bodyCls}">${escapeHtml(w.config.body || 'Cliquez pour ajouter du texte…')}</div>
      </div>
    `;
  }

  // =====================================================
  // INSPECTOR
  // =====================================================
  function selectWidget(id) {
    state.selectedWidgetId = id;
    document.querySelectorAll('.canvas-widget').forEach(el => {
      el.classList.toggle('is-selected', el.dataset.widgetId === id);
    });
    renderInspector();
  }

  function deselectWidget() {
    state.selectedWidgetId = null;
    document.querySelectorAll('.canvas-widget').forEach(el => el.classList.remove('is-selected'));
    renderInspector();
  }

  function renderInspector() {
    const empty = document.getElementById('inspectorEmpty');
    const body = document.getElementById('inspectorBody');
    const w = state.widgets.find(x => x.id === state.selectedWidgetId);

    if (!w) {
      empty.style.display = '';
      body.hidden = true;
      return;
    }
    empty.style.display = 'none';
    body.hidden = false;

    const def = WIDGET_DEFS[w.type];
    body.innerHTML = `
      <div class="insp-header">
        <div class="insp-header__icon insp-header__icon--${w.type}"><i class="fas ${def.icon}"></i></div>
        <div class="insp-header__body">
          <div class="insp-header__type">Widget</div>
          <div class="insp-header__title">${def.label}</div>
        </div>
      </div>

      ${renderInspSourceFields(w)}
      ${renderInspAppearanceFields(w)}
      ${renderInspLayoutFields(w)}

      <button class="insp-delete" data-action="delete-widget">
        <i class="fas fa-trash"></i> Supprimer ce widget
      </button>
    `;

    bindInspector(w);
  }

  function renderInspSourceFields(w) {
    if (w.type === 'text') return '';
    const indicators = getAllIndicators();
    const opts = indicators.map(i => `<option value="${i.code}" ${w.config.indicator === i.code ? 'selected' : ''}>${i.code} — ${i.name}</option>`).join('');
    const noDataNotice = indicators.length === 0
      ? `<div style="background:var(--st-warning-soft);color:#92400E;padding:8px 10px;border-radius:6px;font:500 11.5px var(--font);margin-bottom:10px"><i class="fas fa-triangle-exclamation"></i> Aucun indicateur chargé. Vérifiez que <code>data.js</code> est bien servi.</div>`
      : '';

    let metricField = '';
    if (['kpi', 'stat'].includes(w.type)) {
      metricField = `
        <div class="insp-field">
          <label>Métrique</label>
          <select data-field="metric">
            <option value="reference" ${w.config.metric === 'reference' ? 'selected' : ''}>Référence (point de départ)</option>
            <option value="current"   ${w.config.metric === 'current'   ? 'selected' : ''}>Valeur actuelle</option>
            <option value="target"    ${w.config.metric === 'target'    ? 'selected' : ''}>Cible (fin de projet)</option>
            <option value="pct"       ${w.config.metric === 'pct'       ? 'selected' : ''}>% atteint</option>
          </select>
        </div>`;
    }

    return `
      <div class="insp-section">
        <div class="insp-section__title">Source</div>
        ${noDataNotice}
        <div class="insp-field">
          <label>Indicateur</label>
          <select data-field="indicator">
            <option value="">— Aucun —</option>
            ${opts}
          </select>
        </div>
        ${metricField}
      </div>
    `;
  }

  function renderInspAppearanceFields(w) {
    let fields = `
      <div class="insp-field">
        <label>Titre</label>
        <input type="text" data-field="title" value="${escapeAttr(w.config.title || '')}" placeholder="Ex : % Bénéficiaires">
      </div>
    `;

    if (w.type === 'text') {
      fields += `
        <div class="insp-field">
          <label>Contenu</label>
          <textarea data-field="body" placeholder="Texte libre…">${escapeHtml(w.config.body || '')}</textarea>
        </div>
        <div class="insp-field">
          <label>Alignement</label>
          <select data-field="align">
            <option value="left"   ${w.config.align === 'left'   ? 'selected' : ''}>Gauche</option>
            <option value="center" ${w.config.align === 'center' ? 'selected' : ''}>Centré</option>
            <option value="right"  ${w.config.align === 'right'  ? 'selected' : ''}>Droite</option>
          </select>
        </div>
      `;
    } else {
      fields += `
        <div class="insp-field">
          <label>Couleur</label>
          <div class="insp-colors">
            ${COLORS.map(c => `
              <button class="insp-color insp-color--${c} ${w.config.color === c ? 'is-selected' : ''}" data-color="${c}" title="${c}"></button>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (w.type === 'kpi') {
      fields += `
        <div class="insp-field">
          <label>Sous-titre</label>
          <input type="text" data-field="sub" value="${escapeAttr(w.config.sub || '')}" placeholder="Ex : Niveau global">
        </div>
      `;
    }

    if (w.type === 'stat') {
      fields += `
        <div class="insp-field">
          <label>Icône</label>
          <select data-field="icon">
            ${['fa-bolt','fa-users','fa-graduation-cap','fa-handshake','fa-faucet-drip','fa-flag','fa-flag-checkered','fa-bullseye','fa-chart-line','fa-leaf','fa-globe','fa-heart-pulse']
              .map(i => `<option value="${i}" ${w.config.icon === i ? 'selected' : ''}>${i.replace('fa-', '')}</option>`).join('')}
          </select>
        </div>
        <div class="insp-field">
          <label class="insp-toggle">
            <input type="checkbox" data-field="showDelta" ${w.config.showDelta ? 'checked' : ''}>
            <span class="insp-toggle__sw"></span>
            <span class="insp-toggle__text">Afficher l'écart vs référence</span>
          </label>
        </div>
      `;
    }

    if (w.type === 'chart') {
      fields += `
        <div class="insp-field">
          <label class="insp-toggle">
            <input type="checkbox" data-field="showTarget" ${w.config.showTarget ? 'checked' : ''}>
            <span class="insp-toggle__sw"></span>
            <span class="insp-toggle__text">Afficher la trajectoire cible</span>
          </label>
        </div>
      `;
    }

    return `
      <div class="insp-section">
        <div class="insp-section__title">Apparence</div>
        ${fields}
      </div>
    `;
  }

  function renderInspLayoutFields(w) {
    const def = WIDGET_DEFS[w.type] || {};
    const minW = def.minW || 1;
    const minH = def.minH || 1;
    const maxW = GRID_COLS - w.x;
    return `
      <div class="insp-section">
        <div class="insp-section__title">Taille</div>
        <div class="insp-field">
          <label>Largeur (cellules) — <strong data-resize-label="w">${w.w}</strong> / 12</label>
          <div class="insp-slider">
            <input type="range" min="${minW}" max="${maxW}" value="${w.w}" data-resize-input="w">
          </div>
        </div>
        <div class="insp-field">
          <label>Hauteur (cellules) — <strong data-resize-label="h">${w.h}</strong></label>
          <div class="insp-slider">
            <input type="range" min="${minH}" max="12" value="${w.h}" data-resize-input="h">
          </div>
        </div>
        <div class="insp-position">
          Position : <strong>x=${w.x}</strong> · <strong>y=${w.y}</strong>
        </div>
      </div>
    `;
  }

  function bindInspector(w) {
    const body = document.getElementById('inspectorBody');

    // Champs simples (input text + textarea + select)
    body.querySelectorAll('[data-field]').forEach(el => {
      el.addEventListener('input', () => {
        const k = el.dataset.field;
        if (el.type === 'checkbox') w.config[k] = el.checked;
        else w.config[k] = el.value === '' ? null : el.value;
        if (k === 'indicator' && el.value === '') w.config[k] = null;
        rerenderWidget(w);
        scheduleSave();
      });
    });

    // Couleurs
    body.querySelectorAll('[data-color]').forEach(btn => {
      btn.addEventListener('click', () => {
        w.config.color = btn.dataset.color;
        body.querySelectorAll('[data-color]').forEach(b => b.classList.toggle('is-selected', b === btn));
        rerenderWidget(w);
        scheduleSave();
      });
    });

    // Sliders Largeur / Hauteur
    body.querySelectorAll('[data-resize-input]').forEach(slider => {
      slider.addEventListener('input', () => {
        const k = slider.dataset.resizeInput; // 'w' ou 'h'
        const val = parseInt(slider.value, 10);
        if (k === 'w' && w.x + val > GRID_COLS) {
          w.w = GRID_COLS - w.x;
        } else {
          w[k] = val;
        }
        const lbl = body.querySelector(`[data-resize-label="${k}"]`);
        if (lbl) lbl.textContent = w[k];
        updateWidgetEl(w);
        if (chartInstances[w.id]) {
          requestAnimationFrame(() => chartInstances[w.id].resize());
        }
      });
      slider.addEventListener('change', () => {
        // Au relâchement, on lance la résolution de collisions + compact
        resolveCollisions(w.id);
        compactWidgets();
        state.widgets.forEach(updateWidgetEl);
        // Met à jour la position affichée
        const posEl = body.querySelector('.insp-position');
        if (posEl) posEl.innerHTML = `Position : <strong>x=${w.x}</strong> · <strong>y=${w.y}</strong>`;
        scheduleSave();
      });
    });

    // Bouton supprimer
    body.querySelector('[data-action="delete-widget"]').addEventListener('click', () => deleteWidget(w.id));
  }

  function rerenderWidget(w) {
    const el = document.querySelector(`[data-widget-id="${w.id}"]`);
    if (!el) return;
    // Re-render uniquement le contenu (pas les handles)
    const handles = el.querySelector('.canvas-widget__handles');
    el.innerHTML = '';
    el.appendChild(handles);
    el.insertAdjacentHTML('beforeend', renderWidgetBody(w));
    el.dataset.w = w.w;

    if (w.type === 'chart') {
      if (chartInstances[w.id]) { chartInstances[w.id].destroy(); delete chartInstances[w.id]; }
      renderChartWidget(w);
    }
    if (w.type === 'donut') {
      if (chartInstances[w.id]) { chartInstances[w.id].destroy(); delete chartInstances[w.id]; }
      renderDonutWidget(w);
    }
  }

  // =====================================================
  // ACTIONS WIDGET
  // =====================================================
  function deleteWidget(id) {
    const w = state.widgets.find(x => x.id === id);
    if (!w) return;
    state.widgets = state.widgets.filter(x => x.id !== id);
    if (state.selectedWidgetId === id) state.selectedWidgetId = null;
    compactWidgets();
    renderCanvas();
    renderInspector();
    scheduleSave();
    toast('Widget supprimé');
  }

  // =====================================================
  // MODAL & TOAST
  // =====================================================
  function openModal({ title, body, confirm }) {
    const modal = document.getElementById('modal');
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').textContent = body;
    modal.hidden = false;

    const ok = document.getElementById('modalConfirm');
    const cancel = document.getElementById('modalCancel');
    const close = () => { modal.hidden = true; ok.onclick = null; cancel.onclick = null; };
    ok.onclick = () => { confirm(); close(); };
    cancel.onclick = close;
    modal.querySelector('.modal__backdrop').onclick = close;
  }

  function toast(text) {
    const el = document.getElementById('toast');
    document.getElementById('toastText').textContent = text;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.hidden = true; }, 2200);
  }

  // =====================================================
  // MODE TOGGLE
  // =====================================================
  function setMode(mode) {
    state.mode = mode;
    document.getElementById('studio').classList.toggle('is-preview', mode === 'preview');
    document.getElementById('modeEdit').classList.toggle('is-active', mode === 'edit');
    document.getElementById('modePreview').classList.toggle('is-active', mode === 'preview');
    if (mode === 'preview') deselectWidget();

    // Recalculer la taille des charts (la largeur du canvas a changé)
    setTimeout(() => {
      Object.values(chartInstances).forEach(c => c.resize());
    }, 50);
  }

  // =====================================================
  // DRAG & DROP SYSTEM (move, palette, resize)
  // =====================================================
  const DRAG_THRESHOLD = 5; // px avant qu'un mousedown devienne un drag

  const drag = {
    pending: false,        // mousedown enregistré, on attend mouvement > THRESHOLD
    active: false,         // drag en cours
    type: null,            // 'move' | 'palette' | 'resize'
    widgetId: null,
    paletteType: null,
    startClientX: 0, startClientY: 0,
    offsetX: 0, offsetY: 0,
    snapshotWidget: null,  // état initial du widget (pour move/resize)
    ghost: null,
    preview: null,
    justDragged: false     // flag pour ignorer le click qui suit un drag
  };

  // Calcule les dimensions d'une cellule de la grille (rect canvas)
  function getCellSize() {
    const canvas = document.getElementById('canvas');
    const rect = canvas.getBoundingClientRect();
    const cellW = (rect.width - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;
    return { cellW, cellH: ROW_PX, rect };
  }

  // Convertit (clientX, clientY) en cellule (x, y) sur la grille
  function clientToCell(clientX, clientY) {
    const { cellW, cellH, rect } = getCellSize();
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;
    const x = Math.max(0, Math.min(GRID_COLS - 1, Math.round(relX / (cellW + GRID_GAP))));
    const y = Math.max(0, Math.round(relY / (cellH + GRID_GAP)));
    return { x, y };
  }

  // ---- Drop preview ----
  function showDropPreview(x, y, w, h, invalid = false) {
    let p = document.getElementById('dropPreview');
    if (!p) {
      p = document.createElement('div');
      p.id = 'dropPreview';
      p.className = 'drop-preview';
      document.getElementById('canvas').appendChild(p);
    }
    p.classList.toggle('drop-preview--invalid', invalid);
    p.style.gridColumn = `${x + 1} / span ${w}`;
    p.style.gridRow = `${y + 1} / span ${h}`;
    p.hidden = false;
  }
  function hideDropPreview() {
    const p = document.getElementById('dropPreview');
    if (p) p.hidden = true;
  }

  // ---- Ghost (drag depuis palette) ----
  function showGhost(type, clientX, clientY) {
    const def = WIDGET_DEFS[type];
    if (!def) return;
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.innerHTML = `
      <span class="drag-ghost__icon drag-ghost__icon--${type}"><i class="fas ${def.icon}"></i></span>
      <span>${def.label}</span>
    `;
    document.body.appendChild(ghost);
    drag.ghost = ghost;
    moveGhost(clientX, clientY);
  }
  function moveGhost(clientX, clientY) {
    if (!drag.ghost) return;
    drag.ghost.style.left = clientX + 'px';
    drag.ghost.style.top = clientY + 'px';
  }
  function hideGhost() {
    if (drag.ghost) { drag.ghost.remove(); drag.ghost = null; }
  }

  // ---- Démarre un drag-move ----
  function startMoveDrag(e, id) {
    if (state.mode !== 'edit') return;
    drag.pending = true;
    drag.type = 'move';
    drag.widgetId = id;
    drag.startClientX = e.clientX;
    drag.startClientY = e.clientY;
    const w = state.widgets.find(x => x.id === id);
    if (w) drag.snapshotWidget = { x: w.x, y: w.y, w: w.w, h: w.h };
  }

  // ---- Démarre un drag-palette ----
  function startPaletteDrag(e, type) {
    if (state.mode !== 'edit') return;
    drag.pending = true;
    drag.type = 'palette';
    drag.paletteType = type;
    drag.startClientX = e.clientX;
    drag.startClientY = e.clientY;
  }

  // ---- Démarre un resize ----
  function startResize(e, id) {
    if (state.mode !== 'edit') return;
    const w = state.widgets.find(x => x.id === id);
    if (!w) return;
    e.preventDefault();
    e.stopPropagation();
    drag.active = true;
    drag.type = 'resize';
    drag.widgetId = id;
    drag.startClientX = e.clientX;
    drag.startClientY = e.clientY;
    drag.snapshotWidget = { x: w.x, y: w.y, w: w.w, h: w.h };
    document.body.classList.add('is-resizing-widget');
    document.getElementById('studio').classList.add('is-resizing');
    selectWidget(id);
    const el = document.querySelector(`[data-widget-id="${id}"]`);
    if (el) el.classList.add('is-resizing');
  }

  // ---- Promote pending → active ----
  function activateDrag() {
    drag.pending = false;
    drag.active = true;
    document.body.classList.add('is-dragging-widget');
    document.getElementById('studio').classList.add('is-dragging');

    if (drag.type === 'move') {
      const el = document.querySelector(`[data-widget-id="${drag.widgetId}"]`);
      if (el) el.classList.add('is-dragging');
      selectWidget(drag.widgetId);
    } else if (drag.type === 'palette') {
      showGhost(drag.paletteType, drag.startClientX, drag.startClientY);
    }
  }

  // ---- Mousemove global ----
  function onMouseMove(e) {
    if (drag.pending) {
      const dx = e.clientX - drag.startClientX;
      const dy = e.clientY - drag.startClientY;
      if (Math.hypot(dx, dy) >= DRAG_THRESHOLD) activateDrag();
      else return;
    }
    if (!drag.active) return;

    if (drag.type === 'palette') {
      moveGhost(e.clientX, e.clientY);
      // Si curseur sur le canvas, montrer le preview
      const canvas = document.getElementById('canvas');
      const rect = canvas.getBoundingClientRect();
      const overCanvas = e.clientX >= rect.left && e.clientX <= rect.right
                      && e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (overCanvas) {
        const def = WIDGET_DEFS[drag.paletteType];
        const cell = clientToCell(e.clientX, e.clientY);
        const x = Math.max(0, Math.min(GRID_COLS - def.defaultW, cell.x));
        showDropPreview(x, cell.y, def.defaultW, def.defaultH);
      } else {
        hideDropPreview();
      }
    } else if (drag.type === 'move') {
      const w = state.widgets.find(x => x.id === drag.widgetId);
      if (!w) return;
      const cell = clientToCell(e.clientX, e.clientY);
      const targetX = Math.max(0, Math.min(GRID_COLS - w.w, cell.x));
      const targetY = Math.max(0, cell.y);
      showDropPreview(targetX, targetY, w.w, w.h);
    } else if (drag.type === 'resize') {
      const w = state.widgets.find(x => x.id === drag.widgetId);
      if (!w) return;
      const { cellW, cellH } = getCellSize();
      const dx = e.clientX - drag.startClientX;
      const dy = e.clientY - drag.startClientY;
      const def = WIDGET_DEFS[w.type] || {};
      const minW = def.minW || 2;
      const minH = def.minH || 1;
      const dCols = Math.round(dx / (cellW + GRID_GAP));
      const dRows = Math.round(dy / (cellH + GRID_GAP));
      const newW = Math.max(minW, Math.min(GRID_COLS - w.x, drag.snapshotWidget.w + dCols));
      const newH = Math.max(minH, Math.min(20, drag.snapshotWidget.h + dRows));
      if (newW !== w.w || newH !== w.h) {
        w.w = newW;
        w.h = newH;
        updateWidgetEl(w);
        if (chartInstances[w.id]) {
          requestAnimationFrame(() => chartInstances[w.id].resize());
        }
        // Met à jour les sliders dans l'inspector si visible
        const ws = document.querySelector('[data-resize-input="w"]');
        const hs = document.querySelector('[data-resize-input="h"]');
        if (ws) { ws.value = newW; const lbl = document.querySelector('[data-resize-label="w"]'); if (lbl) lbl.textContent = newW; }
        if (hs) { hs.value = newH; const lbl = document.querySelector('[data-resize-label="h"]'); if (lbl) lbl.textContent = newH; }
      }
    }
  }

  // ---- Mouseup global ----
  function onMouseUp(e) {
    // Cas 1 : pending sans drag → c'était un click
    if (drag.pending) {
      if (drag.type === 'palette') {
        // Click sur palette → ajout standard (slot libre)
        addWidget(drag.paletteType);
      }
      // Pour 'move' : le click suit son cours → bind sélection
      resetDrag();
      return;
    }
    if (!drag.active) return;

    // Cas 2 : drag actif
    if (drag.type === 'palette') {
      const canvas = document.getElementById('canvas');
      const rect = canvas.getBoundingClientRect();
      const overCanvas = e.clientX >= rect.left && e.clientX <= rect.right
                      && e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (overCanvas) {
        const def = WIDGET_DEFS[drag.paletteType];
        const cell = clientToCell(e.clientX, e.clientY);
        const x = Math.max(0, Math.min(GRID_COLS - def.defaultW, cell.x));
        addWidget(drag.paletteType, { x, y: cell.y });
      }
      hideGhost();
    } else if (drag.type === 'move') {
      const w = state.widgets.find(x => x.id === drag.widgetId);
      if (w) {
        const cell = clientToCell(e.clientX, e.clientY);
        w.x = Math.max(0, Math.min(GRID_COLS - w.w, cell.x));
        w.y = Math.max(0, cell.y);
        resolveCollisions(w.id);
        compactWidgets();
        // Re-render minimal : positions de tous les widgets
        state.widgets.forEach(updateWidgetEl);
        scheduleSave();
      }
      const el = document.querySelector(`[data-widget-id="${drag.widgetId}"]`);
      if (el) el.classList.remove('is-dragging');
    } else if (drag.type === 'resize') {
      const w = state.widgets.find(x => x.id === drag.widgetId);
      if (w) {
        resolveCollisions(w.id);
        compactWidgets();
        state.widgets.forEach(updateWidgetEl);
        if (chartInstances[w.id]) chartInstances[w.id].resize();
        scheduleSave();
      }
      const el = document.querySelector(`[data-widget-id="${drag.widgetId}"]`);
      if (el) el.classList.remove('is-resizing');
    }

    hideDropPreview();
    drag.justDragged = true;
    setTimeout(() => { drag.justDragged = false; }, 50);
    resetDrag();
  }

  function resetDrag() {
    drag.pending = false;
    drag.active = false;
    drag.type = null;
    drag.widgetId = null;
    drag.paletteType = null;
    drag.snapshotWidget = null;
    document.body.classList.remove('is-dragging-widget', 'is-resizing-widget');
    document.getElementById('studio').classList.remove('is-dragging', 'is-resizing');
  }

  // ---- Bindings globaux drag ----
  function bindDragSystem() {
    // Détecte le mobile/touch — désactive le drag, fallback sur flèches
    const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    if (isTouch && window.innerWidth < 980) return;

    // Mousedown sur palette → drag-palette
    document.getElementById('palette').addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      const item = e.target.closest('[data-add-widget]');
      if (!item) return;
      e.preventDefault();
      startPaletteDrag(e, item.dataset.addWidget);
    });

    // Mousedown sur widget → drag-move (sauf zones interactives)
    const canvas = document.getElementById('canvas');
    canvas.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      if (state.mode !== 'edit') return;
      const widgetEl = e.target.closest('.canvas-widget');
      if (!widgetEl) return;
      // Resize ?
      const resizeEl = e.target.closest('[data-resize]');
      if (resizeEl) { startResize(e, resizeEl.dataset.resize); return; }
      // Boutons handles ?
      if (e.target.closest('.canvas-widget__handle')) {
        // Sauf si c'est le handle drag : on autorise
        const h = e.target.closest('.canvas-widget__handle');
        if (h.dataset.handle === 'drag') {
          e.preventDefault();
          startMoveDrag(e, widgetEl.dataset.widgetId);
        }
        return;
      }
      // Zones interactives : laisser passer
      if (e.target.closest('input, textarea, select, button, a')) return;
      // Si widget contient un canvas chart → ne pas démarrer le drag
      if (e.target.tagName === 'CANVAS') return;
      e.preventDefault();
      startMoveDrag(e, widgetEl.dataset.widgetId);
    });

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    // Échap pour annuler un drag en cours
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && drag.active) {
        if (drag.type === 'move' && drag.snapshotWidget) {
          const w = state.widgets.find(x => x.id === drag.widgetId);
          if (w) { Object.assign(w, drag.snapshotWidget); updateWidgetEl(w); }
        }
        if (drag.type === 'resize' && drag.snapshotWidget) {
          const w = state.widgets.find(x => x.id === drag.widgetId);
          if (w) { Object.assign(w, drag.snapshotWidget); updateWidgetEl(w); if (chartInstances[w.id]) chartInstances[w.id].resize(); }
        }
        if (drag.type === 'palette') hideGhost();
        const el = document.querySelector(`[data-widget-id="${drag.widgetId}"]`);
        if (el) el.classList.remove('is-dragging', 'is-resizing');
        hideDropPreview();
        resetDrag();
      }
    });
  }

  // =====================================================
  // HTML helpers
  // =====================================================
  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
  function escapeAttr(s) {
    return String(s ?? '').replace(/"/g, '&quot;');
  }

  // =====================================================
  // INIT
  // =====================================================
  function init() {
    // Charger un dashboard existant si ?id=...
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    if (id) {
      const data = loadDashboard(id);
      if (data) {
        state.id = data.id;
        state.name = data.name;
        state.filters = data.filters || state.filters;
        state.widgets = migrateWidgets(data.widgets || []);
      }
    }

    document.getElementById('dashName').value = state.name;

    renderPalette();
    renderCanvas();
    renderInspector();
    bindDragSystem();

    // Topbar handlers
    document.getElementById('dashName').addEventListener('input', e => {
      state.name = e.target.value || 'Mon dashboard';
      scheduleSave();
    });
    document.getElementById('modeEdit').addEventListener('click', () => setMode('edit'));
    document.getElementById('modePreview').addEventListener('click', () => setMode('preview'));

    document.getElementById('btnSave').addEventListener('click', () => {
      persist();
      showSaved('saved');
      toast('Dashboard enregistré');
    });

    document.getElementById('btnDuplicate').addEventListener('click', () => {
      state.id = null;
      state.name = state.name + ' (copie)';
      document.getElementById('dashName').value = state.name;
      persist();
      // mettre à jour l'URL
      history.replaceState(null, '', '?id=' + state.id);
      toast('Dashboard dupliqué');
    });

    document.getElementById('btnDelete').addEventListener('click', () => {
      if (!state.id) {
        // Dashboard pas encore sauvé
        if (state.widgets.length === 0) { location.href = '../index.html'; return; }
        openModal({
          title: 'Effacer le contenu ?',
          body: 'Ce dashboard n\'est pas encore enregistré. Vider le canvas ?',
          confirm: () => {
            state.widgets = []; state.selectedWidgetId = null;
            renderCanvas(); renderInspector();
          }
        });
        return;
      }
      openModal({
        title: 'Supprimer ce dashboard ?',
        body: `« ${state.name} » sera supprimé définitivement.`,
        confirm: () => {
          deleteDashboard(state.id);
          location.href = '../index.html';
        }
      });
    });

    // Désélection au clic en dehors
    document.getElementById('canvas').addEventListener('click', e => {
      if (e.target.id === 'canvas') deselectWidget();
    });

    // Échap pour désélectionner
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && state.selectedWidgetId) deselectWidget();
    });
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', Studio.init);
