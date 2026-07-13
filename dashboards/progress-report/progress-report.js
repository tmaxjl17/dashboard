/* =========================================================
   PROGRESS REPORT — Logique
   - Render hero + KPIs + sommaire + sections + footer
   - Édition contentEditable + toolbar
   - Sidebar conversation persistée localStorage
   - Mode lecture, export PDF, lightbox, scrollspy
   ========================================================= */

const ProgressReport = (() => {

  const STORAGE_PREFIX = 'progress_report_v1';

  // === État ===
  const state = {
    reportId: PROGRESS_REPORT_DATA.reportId,
    sectionsHTML: {},      // id -> HTML (édité)
    customSections: [],    // sections ajoutées par l'utilisateur [{id, title, icon}]
    sectionOrder: [],      // ordre d'affichage [id1, id2, ...] (vide = ordre naturel)
    comments: [],
    editing: false,
    convOpen: true,
    readingMode: false,
    currentUser: { name: 'Vous', avatar: 'https://i.pravatar.cc/80?img=68', role: 'Lecteur' }
  };

  // Catalogue d'icônes pour la création de section
  const ICONS = [
    'fa-clipboard-list', 'fa-circle-check', 'fa-triangle-exclamation', 'fa-flag',
    'fa-coins', 'fa-calculator', 'fa-chart-line', 'fa-chart-pie',
    'fa-globe', 'fa-leaf', 'fa-handshake', 'fa-bullseye',
    'fa-rocket', 'fa-star', 'fa-shield-halved', 'fa-graduation-cap',
    'fa-helmet-safety', 'fa-users', 'fa-comments', 'fa-lightbulb',
    'fa-gears', 'fa-magnifying-glass', 'fa-clock', 'fa-bell',
    'fa-paperclip', 'fa-pen-ruler', 'fa-folder-tree', 'fa-cube',
    'fa-flask', 'fa-fire', 'fa-thumbs-up', 'fa-tags'
  ];

  // Date de référence : aujourd'hui (date réelle au chargement)
  const TODAY = new Date();

  // ====================================================
  // HELPERS
  // ====================================================
  const fmt = (n, max = 1) => (n === null || n === undefined) ? '—' : n.toLocaleString('fr-FR', { maximumFractionDigits: max });
  const fmtDate = d => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  const fmtDateTime = d => new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  // ====================================================
  // PERSISTANCE
  // ====================================================
  function key(suffix) { return `${STORAGE_PREFIX}.${state.reportId}.${suffix}`; }

  function loadSections() {
    try {
      const raw = localStorage.getItem(key('sections'));
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  }
  function saveSections() {
    localStorage.setItem(key('sections'), JSON.stringify(state.sectionsHTML));
  }
  function loadComments() {
    try {
      const raw = localStorage.getItem(key('comments'));
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  }
  function saveComments() {
    localStorage.setItem(key('comments'), JSON.stringify(state.comments));
  }
  function loadCustomSections() {
    try {
      const raw = localStorage.getItem(key('customSections'));
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  }
  function saveCustomSections() {
    localStorage.setItem(key('customSections'), JSON.stringify(state.customSections));
  }
  function loadSectionOrder() {
    try {
      const raw = localStorage.getItem(key('sectionOrder'));
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  }
  function saveSectionOrder() {
    localStorage.setItem(key('sectionOrder'), JSON.stringify(state.sectionOrder));
  }
  function resetAll() {
    localStorage.removeItem(key('sections'));
    localStorage.removeItem(key('comments'));
    localStorage.removeItem(key('customSections'));
    localStorage.removeItem(key('sectionOrder'));
    state.sectionsHTML = {};
    state.customSections = [];
    state.sectionOrder = [];
    PROGRESS_REPORT_DATA.report.sections.forEach(s => { state.sectionsHTML[s.id] = s.content; });
    state.comments = [...PROGRESS_REPORT_DATA.comments];
    saveComments();
    renderAll();
    toast('Rapport réinitialisé');
  }

  // Liste fusionnée : sections par défaut + sections custom, triée par sectionOrder si défini
  function getAllSections() {
    const all = [
      ...PROGRESS_REPORT_DATA.report.sections.map(s => ({ ...s, custom: false })),
      ...state.customSections.map(s => ({ ...s, custom: true, content: state.sectionsHTML[s.id] || '<p>Section vide. Cliquez sur Modifier puis tapez votre contenu ici.</p>' }))
    ];
    if (!state.sectionOrder || state.sectionOrder.length === 0) return all;

    const ordered = [];
    state.sectionOrder.forEach(id => {
      const found = all.find(s => s.id === id);
      if (found) ordered.push(found);
    });
    // Ajouter à la fin les sections non encore listées (nouvelles depuis la dernière sauvegarde)
    all.forEach(s => {
      if (!state.sectionOrder.includes(s.id)) ordered.push(s);
    });
    return ordered;
  }

  // Déplace une section vers le haut (-1) ou le bas (+1)
  function moveSection(id, dir) {
    const all = getAllSections();
    const ids = all.map(s => s.id);
    const idx = ids.indexOf(id);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= ids.length) return;
    [ids[idx], ids[newIdx]] = [ids[newIdx], ids[idx]];
    state.sectionOrder = ids;
    saveSectionOrder();
    renderToc();
    renderSections();
    initScrollspy();
  }

  // ====================================================
  // RENDER : HERO
  // ====================================================
  function renderHero() {
    const r = PROGRESS_REPORT_DATA.report;
    const p = PROGRESS_REPORT_DATA.project;
    document.getElementById('reportPeriod').textContent = r.period;
    document.getElementById('reportTitle').textContent = r.title;
    document.getElementById('reportSubtitle').textContent = r.subtitle;

    const statusEl = document.getElementById('reportStatus');
    statusEl.className = `report-hero__status report-hero__status--${r.status}`;
    const icon = r.status === 'validated' ? 'fa-circle-check'
              : r.status === 'review' ? 'fa-clock'
              : 'fa-pen';
    statusEl.innerHTML = `<i class="fas ${icon}"></i> ${escapeHtml(r.statusLabel)}`;

    document.getElementById('tlStart').textContent = fmtDate(p.startDate);
    document.getElementById('tlEnd').textContent = fmtDate(p.endDate);

    const start = new Date(p.startDate).getTime();
    const end = new Date(p.endDate).getTime();
    const now = Math.min(Math.max(TODAY.getTime(), start), end);
    const pct = Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100));

    document.getElementById('timelineFill').style.width = pct + '%';
    document.getElementById('timelineCursor').style.left = pct + '%';
    document.getElementById('timelineText').textContent = `${Math.round(pct)}% du calendrier projet écoulé`;
  }

  // ====================================================
  // RENDER : KPIs
  // ====================================================
  function renderKpis() {
    const wrap = document.getElementById('reportKpis');
    // Cloner pour ne pas muter la donnée source
    const kpis = PROGRESS_REPORT_DATA.report.kpis.map(k => ({ ...k }));

    // Calcul dynamique du KPI "Calendrier écoulé" → cohérent avec la timeline du hero
    const delai = kpis.find(k => k.key === 'delai');
    if (delai) {
      const p = PROGRESS_REPORT_DATA.project;
      const start = new Date(p.startDate).getTime();
      const end = new Date(p.endDate).getTime();
      const now = Math.min(Math.max(TODAY.getTime(), start), end);
      const pct = Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100));
      delai.value = Math.round(pct);
      delai.deltaLabel = pct >= 100 ? 'projet clos'
                       : pct >= 75  ? 'phase finale'
                       : pct >= 50  ? 'mi-parcours'
                       : pct >= 25  ? 'phase de mise en œuvre'
                       :              'phase initiale';
    }
    wrap.innerHTML = kpis.map(k => {
      const overflow = k.value > 100;
      const barWidth = overflow ? 100 : k.value;
      let deltaCls = 'flat', deltaIcon = 'fa-minus', deltaText = '';
      if (k.delta > 0) { deltaCls = 'up'; deltaIcon = 'fa-arrow-trend-up'; deltaText = `+${k.delta} pts`; }
      else if (k.delta < 0) { deltaCls = 'down'; deltaIcon = 'fa-arrow-trend-down'; deltaText = `${k.delta} pts`; }
      else deltaText = '—';

      return `
        <div class="report-kpi report-kpi--${k.color}">
          <div class="report-kpi__head">
            <div class="report-kpi__icon"><i class="fas ${k.icon}"></i></div>
            <div class="report-kpi__label">${escapeHtml(k.label)}</div>
          </div>
          <div class="report-kpi__value">
            <span>${fmt(k.value)}</span><span class="report-kpi__suffix">${k.unit}</span>
            ${overflow ? `<span class="report-kpi__overflow-chip"><i class="fas fa-bullseye"></i> Cible dépassée</span>` : ''}
          </div>
          <div>
            <span class="report-kpi__delta report-kpi__delta--${deltaCls}">
              <i class="fas ${deltaIcon}"></i> ${deltaText}
            </span>
            <small style="color:var(--pr-text-mute);font:500 11px 'Inter';margin-left:6px">${escapeHtml(k.deltaLabel || '')}</small>
          </div>
          <div class="report-kpi__progress">
            <div class="report-kpi__progress-fill" style="width:${barWidth}%"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ====================================================
  // RENDER : SOMMAIRE + SECTIONS
  // ====================================================
  function renderToc() {
    const wrap = document.getElementById('tocList');
    const sections = getAllSections();
    const lastIdx = sections.length - 1;

    wrap.innerHTML = sections.map((s, i) => `
      <li class="report-toc__item">
        <a href="#${s.id}" data-toc="${s.id}" class="report-toc__link">${escapeHtml(s.title)}</a>
        <span class="report-toc__actions">
          <button class="report-toc__btn" data-move-up="${s.id}" title="Monter" ${i === 0 ? 'disabled' : ''}>
            <i class="fas fa-chevron-up"></i>
          </button>
          <button class="report-toc__btn" data-move-down="${s.id}" title="Descendre" ${i === lastIdx ? 'disabled' : ''}>
            <i class="fas fa-chevron-down"></i>
          </button>
          ${s.custom ? `<button class="report-toc__btn report-toc__btn--danger" data-delete-section="${s.id}" title="Supprimer"><i class="fas fa-trash"></i></button>` : ''}
        </span>
      </li>
    `).join('');

    wrap.querySelectorAll('a[data-toc]').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        const id = a.dataset.toc;
        const el = document.getElementById('section-' + id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    wrap.querySelectorAll('[data-move-up]').forEach(b => {
      b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); moveSection(b.dataset.moveUp, -1); });
    });
    wrap.querySelectorAll('[data-move-down]').forEach(b => {
      b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); moveSection(b.dataset.moveDown, +1); });
    });
    wrap.querySelectorAll('[data-delete-section]').forEach(b => {
      b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); deleteSection(b.dataset.deleteSection); });
    });
  }

  function renderSections() {
    const wrap = document.getElementById('reportContent');
    const sections = getAllSections();
    wrap.innerHTML = sections.map(s => `
      <section class="report-section" id="section-${s.id}" data-section-id="${s.id}">
        <header class="report-section__head">
          <div class="report-section__icon"><i class="fas ${s.icon}"></i></div>
          <h2 class="report-section__title">${escapeHtml(s.title)}</h2>
        </header>
        ${s.custom ? `<button class="report-section__delete" data-delete-section="${s.id}" title="Supprimer cette section"><i class="fas fa-trash"></i></button>` : ''}
        <div class="report-section__body" data-edit-target="${s.id}">${state.sectionsHTML[s.id] || s.content}</div>
      </section>
    `).join('');

    // Bind images → lightbox
    wrap.querySelectorAll('.report-figure').forEach(fig => {
      fig.addEventListener('click', () => {
        const img = fig.querySelector('img');
        const cap = fig.querySelector('figcaption');
        if (img) openLightbox(img.src, cap ? cap.innerHTML : '');
      });
    });

    // Bind suppression sur les sections custom
    wrap.querySelectorAll('[data-delete-section]').forEach(b => {
      b.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        deleteSection(b.dataset.deleteSection);
      });
    });
  }

  // ====================================================
  // CRÉATION / SUPPRESSION DE SECTIONS
  // ====================================================
  function openSectionModal() {
    const modal = document.getElementById('sectionModal');
    const titleInput = document.getElementById('sectionTitleInput');
    const grid = document.getElementById('sectionIconGrid');

    titleInput.value = '';
    grid.innerHTML = ICONS.map((ic, i) => `
      <button type="button" class="pr-icon-btn ${i === 0 ? 'is-selected' : ''}" data-icon="${ic}">
        <i class="fas ${ic}"></i>
      </button>
    `).join('');

    grid.querySelectorAll('[data-icon]').forEach(btn => {
      btn.addEventListener('click', () => {
        grid.querySelectorAll('[data-icon]').forEach(b => b.classList.toggle('is-selected', b === btn));
      });
    });

    modal.hidden = false;
    setTimeout(() => titleInput.focus(), 50);
  }

  function closeSectionModal() {
    document.getElementById('sectionModal').hidden = true;
  }

  function confirmCreateSection() {
    const title = document.getElementById('sectionTitleInput').value.trim();
    if (!title) {
      document.getElementById('sectionTitleInput').focus();
      toast('Veuillez saisir un titre');
      return;
    }
    const selectedIcon = document.querySelector('#sectionIconGrid .is-selected');
    const icon = selectedIcon ? selectedIcon.dataset.icon : 'fa-clipboard-list';

    const id = 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5);
    state.customSections.push({ id, title, icon });
    state.sectionsHTML[id] = `<p>Section "${escapeHtml(title)}" créée. Cliquez sur <strong>Modifier</strong> en haut pour rédiger son contenu.</p>`;
    if (state.sectionOrder && state.sectionOrder.length > 0) {
      state.sectionOrder.push(id);
      saveSectionOrder();
    }
    saveCustomSections();
    saveSections();

    closeSectionModal();
    renderToc();
    renderSections();
    initScrollspy();

    // Scroll vers la nouvelle section
    setTimeout(() => {
      const el = document.getElementById('section-' + id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    toast(`Section « ${title} » créée`);
  }

  function deleteSection(id) {
    const section = state.customSections.find(s => s.id === id);
    if (!section) return;
    if (!confirm(`Supprimer la section « ${section.title} » ? Son contenu sera perdu.`)) return;

    state.customSections = state.customSections.filter(s => s.id !== id);
    delete state.sectionsHTML[id];
    saveCustomSections();
    saveSections();
    renderToc();
    renderSections();
    initScrollspy();
    toast('Section supprimée');
  }

  // ====================================================
  // RENDER : FOOTER MÉTADONNÉES
  // ====================================================
  function renderFooter() {
    const r = PROGRESS_REPORT_DATA.report;
    document.getElementById('authorAvatar').src = r.author.avatar;
    document.getElementById('authorName').textContent = r.author.name;
    document.getElementById('authorRole').textContent = r.author.role;
    document.getElementById('validatorAvatar').src = r.validator.avatar;
    document.getElementById('validatorName').textContent = r.validator.name;
    document.getElementById('validatorRole').textContent = r.validator.role;
    document.getElementById('reportVersion').textContent = 'v' + r.version;
    document.getElementById('reportCreated').textContent = fmtDateTime(r.createdAt);
    document.getElementById('reportUpdated').textContent = fmtDateTime(r.updatedAt);

    const tags = document.getElementById('reportTags');
    tags.innerHTML = (r.tags || []).map(t => `<span class="report-tag">#${escapeHtml(t)}</span>`).join('');
  }

  // ====================================================
  // RENDER : CONVERSATION
  // ====================================================
  function renderConversation() {
    const body = document.getElementById('convBody');
    document.getElementById('convCount').textContent = state.comments.length;
    document.getElementById('convPinCount').textContent = state.comments.length;

    if (state.comments.length === 0) {
      body.innerHTML = `
        <div class="conv-empty">
          <i class="fas fa-comments"></i>
          <p>Aucun commentaire</p>
          <small>Soyez le premier à laisser un commentaire</small>
        </div>`;
      return;
    }

    // Grouper par jour
    const groups = {};
    state.comments.forEach(c => {
      const d = new Date(c.timestamp);
      const dayKey = d.toDateString();
      if (!groups[dayKey]) groups[dayKey] = { date: d, items: [] };
      groups[dayKey].items.push(c);
    });

    let html = '';
    Object.values(groups).forEach(g => {
      html += `<div class="conv-date-sticky">${formatRelativeDate(g.date)}</div>`;
      html += g.items.map(c => renderMessage(c)).join('');
    });
    body.innerHTML = html;

    // Bind actions
    body.querySelectorAll('[data-msg-delete]').forEach(b => {
      b.addEventListener('click', () => deleteComment(b.dataset.msgDelete));
    });

    // Auto-scroll
    body.scrollTop = body.scrollHeight;
  }

  function renderMessage(c) {
    const t = new Date(c.timestamp);
    const time = t.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const isMine = c.author === state.currentUser.name;
    return `
      <div class="conv-msg ${isMine ? 'conv-msg--mine' : ''}">
        <img class="conv-msg__avatar" src="${escapeHtml(c.avatar)}" alt="">
        <div class="conv-msg__body">
          <div class="conv-msg__head">
            <span class="conv-msg__name">${escapeHtml(c.author)}</span>
            <span class="conv-msg__time">${time}</span>
          </div>
          <div class="conv-msg__bubble">${escapeHtml(c.text).replace(/\n/g, '<br>')}</div>
        </div>
        <div class="conv-msg__actions">
          <button title="Réagir"><i class="far fa-thumbs-up"></i></button>
          <button title="Répondre"><i class="fas fa-reply"></i></button>
          ${isMine ? `<button class="conv-msg__action--danger" data-msg-delete="${c.id}" title="Supprimer"><i class="fas fa-trash"></i></button>` : ''}
        </div>
      </div>
    `;
  }

  function formatRelativeDate(d) {
    const today = new Date();
    today.setHours(0,0,0,0);
    const ydt = new Date(today);
    ydt.setDate(ydt.getDate() - 1);
    const dCopy = new Date(d);
    dCopy.setHours(0,0,0,0);

    if (dCopy.getTime() === today.getTime()) return "Aujourd'hui";
    if (dCopy.getTime() === ydt.getTime()) return 'Hier';
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function sendComment(text) {
    const c = {
      id: 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      author: state.currentUser.name,
      role: state.currentUser.role,
      avatar: state.currentUser.avatar,
      timestamp: new Date().toISOString(),
      text
    };
    state.comments.push(c);
    saveComments();
    renderConversation();
  }

  function deleteComment(id) {
    state.comments = state.comments.filter(c => c.id !== id);
    saveComments();
    renderConversation();
    toast('Commentaire supprimé');
  }

  // ====================================================
  // ÉDITION (contentEditable + toolbar)
  // ====================================================
  let editSnapshot = null;

  function enterEditMode() {
    state.editing = true;
    document.getElementById('reportApp').classList.add('is-editing');
    document.getElementById('btnEditToggle').classList.add('is-active');
    document.getElementById('btnEditToggle').innerHTML = '<i class="fas fa-pen"></i> <span>Édition active</span>';
    document.getElementById('editToolbar').hidden = false;

    // Snapshot pour annulation
    editSnapshot = { ...state.sectionsHTML };

    // Rendre les sections éditables
    document.querySelectorAll('.report-section__body').forEach(el => {
      el.contentEditable = 'true';
      el.spellcheck = true;
    });
  }

  function exitEditMode(save) {
    state.editing = false;
    document.getElementById('reportApp').classList.remove('is-editing');
    document.getElementById('btnEditToggle').classList.remove('is-active');
    document.getElementById('btnEditToggle').innerHTML = '<i class="fas fa-pen"></i> <span>Modifier</span>';
    document.getElementById('editToolbar').hidden = true;

    document.querySelectorAll('.report-section__body').forEach(el => {
      el.contentEditable = 'false';
      const id = el.dataset.editTarget;
      if (save) {
        state.sectionsHTML[id] = el.innerHTML;
      } else if (editSnapshot) {
        el.innerHTML = editSnapshot[id] || el.innerHTML;
        state.sectionsHTML[id] = editSnapshot[id];
      }
    });

    if (save) {
      saveSections();
      toast('Modifications enregistrées');
    } else {
      toast('Modifications annulées');
    }

    editSnapshot = null;
  }

  function applyEditCommand(cmd, arg) {
    if (cmd === 'callout') {
      insertCallout(arg);
      return;
    }
    if (cmd === 'exitBlock') {
      exitCurrentBlock();
      return;
    }
    document.execCommand(cmd, false, arg);
  }

  // Insère un nouveau paragraphe juste après le bloc spécial courant
  // (callout, blockquote, ul, ol, decision-list, check-list)
  // et y place le curseur. Marche aussi quand on est juste dans un <p> :
  // on ajoute un nouveau <p> à la suite.
  function exitCurrentBlock() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    let node = sel.anchorNode;
    if (!node) return;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;

    const sectionBody = node.closest('.report-section__body');
    if (!sectionBody) return;

    // Trouver le bloc enfant direct de la section éditable
    let block = node;
    while (block && block.parentElement !== sectionBody) block = block.parentElement;
    if (!block || block.parentElement !== sectionBody) {
      // Pas de bloc identifié : on append à la fin
      const p = document.createElement('p');
      p.innerHTML = '<br>';
      sectionBody.appendChild(p);
      placeCursorAt(p);
      return;
    }

    // Créer un nouveau paragraphe et l'insérer juste après le bloc courant
    const p = document.createElement('p');
    p.innerHTML = '<br>';
    block.insertAdjacentElement('afterend', p);
    placeCursorAt(p);
  }

  function placeCursorAt(el) {
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    el.focus?.();
  }

  function insertCallout(type) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const types = {
      info:    { icon: 'fa-circle-info',          label: 'Information' },
      warning: { icon: 'fa-triangle-exclamation', label: 'Attention' },
      success: { icon: 'fa-circle-check',         label: 'Succès' },
      danger:  { icon: 'fa-circle-exclamation',   label: 'Critique' }
    };
    const t = types[type] || types.info;

    // Trouver la section éditable courante (point d'ancrage)
    let node = sel.anchorNode;
    if (!node) return;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    const section = node.closest('.report-section__body');
    if (!section) return;

    // Trouver le bloc enfant direct de la section (paragraphe, callout, liste, etc.)
    // pour insérer le nouveau callout JUSTE APRÈS, jamais dedans.
    let block = node;
    while (block && block.parentElement !== section) block = block.parentElement;

    // Construire le callout (sans contenteditable=true imbriqué — la section parent est déjà éditable)
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<div class="callout callout--${type}">
      <i class="fas ${t.icon}"></i>
      <div><strong>${t.label}</strong>Cliquez pour modifier ce texte.</div>
    </div>`;
    const callout = wrapper.firstElementChild;

    if (block && block.parentElement === section) {
      // Insérer après le bloc parent
      block.insertAdjacentElement('afterend', callout);
    } else {
      // Pas de bloc enfant identifié : ajouter à la fin de la section
      section.appendChild(callout);
    }

    // Placer le curseur dans le texte du callout pour permettre la saisie immédiate
    const target = callout.querySelector('div');
    if (target) {
      const range = document.createRange();
      // Sélectionne la dernière ligne (après le <strong>)
      range.selectNodeContents(target);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  // ====================================================
  // CONVERSATION TOGGLE
  // ====================================================
  function toggleConversation(open) {
    state.convOpen = open;
    document.getElementById('reportApp').classList.toggle('is-conv-closed', !open);
  }

  // ====================================================
  // MODE LECTURE
  // ====================================================
  function toggleReadingMode() {
    state.readingMode = !state.readingMode;
    document.getElementById('reportApp').classList.toggle('is-reading', state.readingMode);
    document.getElementById('btnReadingMode').classList.toggle('is-active', state.readingMode);
    if (state.readingMode) toast('Mode lecture · Échap pour quitter');
  }

  // ====================================================
  // EXPORT PDF (via window.print)
  // ====================================================
  function exportPdf() {
    toast('Préparation de l\'export…');
    setTimeout(() => window.print(), 200);
  }

  // ====================================================
  // SCROLLSPY (TOC)
  // ====================================================
  function initScrollspy() {
    const sections = Array.from(document.querySelectorAll('.report-section'));
    const tocLinks = Array.from(document.querySelectorAll('.report-toc__list a'));
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.dataset.sectionId;
          tocLinks.forEach(a => a.classList.toggle('is-active', a.dataset.toc === id));
        }
      });
    }, { rootMargin: '-30% 0px -60% 0px' });

    sections.forEach(s => observer.observe(s));
  }

  // ====================================================
  // LIGHTBOX
  // ====================================================
  function openLightbox(src, caption) {
    document.getElementById('lightboxImg').src = src;
    document.getElementById('lightboxCaption').innerHTML = caption || '';
    document.getElementById('lightbox').hidden = false;
  }
  function closeLightbox() {
    document.getElementById('lightbox').hidden = true;
  }

  // ====================================================
  // TOAST
  // ====================================================
  function toast(text) {
    const el = document.getElementById('toast');
    document.getElementById('toastText').textContent = text;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.hidden = true; }, 2500);
  }

  // ====================================================
  // RENDER ALL
  // ====================================================
  function renderAll() {
    renderHero();
    renderKpis();
    renderToc();
    renderSections();
    renderFooter();
    renderConversation();
    initScrollspy();
  }

  // ====================================================
  // INIT
  // ====================================================
  function init() {
    // Charger sections custom + ordre personnalisé
    state.customSections = loadCustomSections() || [];
    state.sectionOrder = loadSectionOrder() || [];

    // Charger contenus de sections (défaut + custom)
    const savedSections = loadSections() || {};
    PROGRESS_REPORT_DATA.report.sections.forEach(s => {
      state.sectionsHTML[s.id] = savedSections[s.id] || s.content;
    });
    state.customSections.forEach(s => {
      state.sectionsHTML[s.id] = savedSections[s.id] || `<p>Section "${escapeHtml(s.title)}" créée. Cliquez sur <strong>Modifier</strong> en haut pour rédiger son contenu.</p>`;
    });

    // Charger commentaires
    state.comments = loadComments() || [...PROGRESS_REPORT_DATA.comments];

    renderAll();

    // Topbar handlers
    document.getElementById('btnEditToggle').addEventListener('click', () => {
      if (state.editing) exitEditMode(true);
      else enterEditMode();
    });
    document.getElementById('btnEditCancel').addEventListener('click', () => exitEditMode(false));
    document.getElementById('btnEditSave').addEventListener('click', () => exitEditMode(true));
    document.getElementById('btnReadingMode').addEventListener('click', toggleReadingMode);
    document.getElementById('btnExport').addEventListener('click', exportPdf);

    // Menu dropdown
    const menuBtn = document.getElementById('btnMenu');
    const menu = document.getElementById('menuDropdown');
    menuBtn.addEventListener('click', e => {
      e.stopPropagation();
      menu.hidden = !menu.hidden;
    });
    document.addEventListener('click', e => {
      if (!menu.contains(e.target) && !menuBtn.contains(e.target)) menu.hidden = true;
    });
    menu.querySelectorAll('[data-action]').forEach(b => {
      b.addEventListener('click', () => {
        const a = b.dataset.action;
        menu.hidden = true;
        if (a === 'reset') {
          if (confirm('Réinitialiser le rapport et tous les commentaires ? Cette action est irréversible.')) resetAll();
        } else if (a === 'duplicate') {
          toast('Dupliquer (à implémenter)');
        } else if (a === 'share') {
          navigator.clipboard?.writeText(location.href);
          toast('Lien copié dans le presse-papiers');
        } else if (a === 'history') {
          toast('Historique des versions (à implémenter)');
        }
      });
    });

    // Toolbar édition
    document.querySelectorAll('.edit-toolbar [data-cmd]').forEach(b => {
      b.addEventListener('click', e => {
        e.preventDefault();
        applyEditCommand(b.dataset.cmd, b.dataset.arg);
      });
    });

    // Conversation
    document.getElementById('btnConvClose').addEventListener('click', () => toggleConversation(false));
    document.getElementById('btnConvOpen').addEventListener('click', () => toggleConversation(true));

    // Compose textarea
    const textarea = document.getElementById('convInput');
    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(140, textarea.scrollHeight) + 'px';
    });
    textarea.addEventListener('keydown', e => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        submitComment();
      }
    });
    document.getElementById('btnSend').addEventListener('click', submitComment);

    function submitComment() {
      const text = textarea.value.trim();
      if (!text) return;
      sendComment(text);
      textarea.value = '';
      textarea.style.height = 'auto';
    }

    // Lightbox
    document.querySelector('.lightbox__close').addEventListener('click', closeLightbox);
    document.getElementById('lightbox').addEventListener('click', e => {
      if (e.target.id === 'lightbox') closeLightbox();
    });

    // Bouton "+ Ajouter une section"
    document.getElementById('btnAddSection').addEventListener('click', openSectionModal);

    // Modal de création de section
    document.getElementById('sectionModalClose').addEventListener('click', closeSectionModal);
    document.getElementById('sectionModalCancel').addEventListener('click', closeSectionModal);
    document.getElementById('sectionModalConfirm').addEventListener('click', confirmCreateSection);
    document.querySelector('#sectionModal .pr-modal__backdrop').addEventListener('click', closeSectionModal);
    document.getElementById('sectionTitleInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); confirmCreateSection(); }
    });

    // Échap
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (!document.getElementById('sectionModal').hidden) closeSectionModal();
        else if (state.readingMode) toggleReadingMode();
        else if (!document.getElementById('lightbox').hidden) closeLightbox();
      }
      // Ctrl+B / Ctrl+I en mode édition (déjà géré par contentEditable natif)
      // Ctrl+S = enregistrer édition
      if (state.editing && (e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        exitEditMode(true);
      }
      // Shift+Entrée = sortir du bloc courant (callout / liste / citation)
      if (state.editing && (e.shiftKey || e.metaKey) && e.key === 'Enter') {
        const sel = window.getSelection();
        const node = sel?.anchorNode;
        const inEditable = node && (node.nodeType === Node.TEXT_NODE ? node.parentElement : node)?.closest('.report-section__body');
        if (inEditable) {
          e.preventDefault();
          exitCurrentBlock();
        }
      }
    });
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', ProgressReport.init);
