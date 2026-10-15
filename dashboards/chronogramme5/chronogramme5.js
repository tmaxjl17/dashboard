/* =========================================================
   CHRONOGRAMME — Option E · Outil de pilotage professionnel
   Dépend de CHRONO_DATA (../chronogramme2/data.js : relevés datés avec quantités).
   Deux vues sur les mêmes activités filtrées : Chronologie et Tableau triable.
   Positions sur la frise en % de sa largeur ; l'échelle ne change que --mois-w.
   ========================================================= */

(() => {
  'use strict';

  const D = CHRONO_DATA;
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ===== Dates et formats ===== */
  const JOUR = 86400000;
  const d = s => { const [y, m, j] = s.split('-').map(Number); return Date.UTC(y, m - 1, j); };
  const TODAY = d(D.dateReference);
  const T_DEB = d(D.debutFrise), T_FIN = d(D.finFrise);
  const SPAN = (T_FIN - T_DEB) / JOUR + 1;
  const ecart = (a, b) => Math.round((b - a) / JOUR);
  const duree = (a, b) => ecart(a, b) + 1;
  const x0 = t => (t - T_DEB) / JOUR / SPAN * 100;          // début du jour t, en %
  const x1 = t => ((t - T_DEB) / JOUR + 1) / SPAN * 100;    // fin du jour t, en %
  const XT = (x0(TODAY) + x1(TODAY)) / 2;

  const MOIS_L = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const nf0 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const pct = n => nf0.format(Math.round(n)) + ' %';
  const pct1 = n => nf1.format(n) + ' %';
  const dfmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const fd = t => dfmt.format(new Date(t)).replace(/^1 /, '1er ');
  const fdc = t => fd(t).replace(/ \d{4}$/, '');
  const iso = t => new Date(t).toISOString().slice(0, 10);
  const jours = n => `${n} j`;

  const dDeb = new Date(T_DEB), dFin = new Date(T_FIN);
  const NB_MOIS = (dFin.getUTCFullYear() - dDeb.getUTCFullYear()) * 12 + dFin.getUTCMonth() - dDeb.getUTCMonth() + 1;
  const MOIS = Array.from({ length: NB_MOIS }, (_, i) => {
    const y = dDeb.getUTCFullYear() + Math.floor((dDeb.getUTCMonth() + i) / 12), m = (dDeb.getUTCMonth() + i) % 12;
    return { y, m, a: Date.UTC(y, m, 1), b: Date.UTC(y, m + 1, 0) };
  });

  /* ===== Statuts, formes, responsables ===== */
  const ORDRE = ['retard', 'sansSuivi', 'echeance', 'conforme', 'avenir', 'cloturee'];
  const LIB = { retard: 'En retard', sansSuivi: 'Sans suivi', echeance: 'Échéance proche', conforme: 'En cours', avenir: 'À venir', cloturee: 'Clôturée' };
  const SVG = {
    conforme:  '<svg viewBox="0 0 14 14"><circle cx="7" cy="7" r="5.6"/></svg>',
    retard:    '<svg viewBox="0 0 14 14"><path d="M7 1 L13.4 12.6 L0.6 12.6 Z"/></svg>',
    echeance:  '<svg viewBox="0 0 14 14"><rect x="1.8" y="1.8" width="10.4" height="10.4" rx="1.5"/></svg>',
    sansSuivi: '<svg viewBox="0 0 14 14"><path class="s" d="M2.4 2.4 L11.6 11.6 M11.6 2.4 L2.4 11.6"/></svg>',
    cloturee:  '<svg viewBox="0 0 14 14"><path class="s" d="M1.8 7.6 L5.4 11.2 L12.2 2.8"/></svg>',
    avenir:    '<svg viewBox="0 0 14 14"><circle class="s" cx="7" cy="7" r="5" style="stroke-width:2.2"/></svg>'
  };
  const forme = etat => `<span class="e-shape" data-etat="${etat}" aria-hidden="true">${SVG[etat]}</span>`;
  const pastille = etat => `<span class="e-pill" data-etat="${etat}">${forme(etat)}${LIB[etat]}</span>`;

  const MOTS_VIDES = new Set(['de', 'du', 'des', 'la', 'le', 'les', "d'", "l'", '—', 'lot', 'zone']);
  const initiales = nom => nom.replace(/[’']/g, "' ").split(/\s+/)
    .filter(m => m && !MOTS_VIDES.has(m.toLowerCase()) && /^\p{L}/u.test(m))
    .slice(0, 2).map(m => m[0].toUpperCase()).join('');
  const avatar = nom => `<span class="e-av" title="${esc(nom)}" aria-hidden="true">${initiales(nom)}</span>`;

  /* ===== Calculs (données figées : une seule passe) ===== */
  function calcActivite(a, g) {
    const dp = d(a.debutPrevu), fp = d(a.finPrevue), prevJ = duree(dp, fp);
    let cum = 0;
    const rel = a.releves.map(r => { cum += r.qte; return { ...r, t: d(r.date), cum }; });
    const qr = cum, hasRel = rel.length > 0;
    const debR = hasRel ? d(a.debutReel) : null;
    const last = hasRel ? rel[rel.length - 1].t : null;
    const finR = a.cloturee ? d(a.finReel) : last;
    const realExact = qr / a.qtePrevue * 100;
    const debute = dp <= TODAY, echu = fp < TODAY, restants = ecart(TODAY, fp);
    const attendu = a.cloturee ? 100 : clamp((ecart(dp, TODAY) + 1) / prevJ * 100, 0, 100);

    let ecartJ = null, ecartType;
    if (a.cloturee) { ecartJ = ecart(fp, finR); ecartType = 'clos'; }
    else if (echu) { ecartJ = ecart(fp, TODAY); ecartType = 'echu'; }
    else ecartType = debute ? 'reste' : 'avenir';

    let etat;
    if (a.cloturee) etat = 'cloturee';
    else if (echu) etat = 'retard';
    else if (!hasRel && debute) etat = 'sansSuivi';
    else if (restants <= 30) etat = 'echeance';
    else if (!debute) etat = 'avenir';
    else etat = 'conforme';

    let proj = null;
    if (!a.cloturee && hasRel && qr < a.qtePrevue) {
      const rythme = qr / duree(debR, last);
      const finP = last + Math.ceil((a.qtePrevue - qr) / rythme) * JOUR;
      proj = { fin: finP, ecart: ecart(fp, finP) };
    }
    return { a, g, dp, fp, prevJ, rel, qr, hasRel, debR, last, finR, realExact, attendu, debute, echu, restants, ecartJ, ecartType, etat, proj };
  }

  const K = {}, GRP = {};
  D.groupes.forEach(g => {
    const kids = g.activites.map(a => calcActivite(a, g));
    kids.forEach(k => { K[k.a.code] = k; });
    const sp = kids.reduce((s, k) => s + k.a.poids, 0);
    GRP[g.code] = {
      real: kids.reduce((s, k) => s + k.realExact * k.a.poids, 0) / sp,
      attendu: kids.reduce((s, k) => s + k.attendu * k.a.poids, 0) / sp,
      dp: Math.min(...kids.map(k => k.dp)), fp: Math.max(...kids.map(k => k.fp))
    };
  });
  const ACTS = D.groupes.flatMap(g => g.activites.map(a => K[a.code]));
  const COMPO = {
    real: Object.values(GRP).reduce((s, x) => s + x.real, 0) / D.groupes.length,
    attendu: Object.values(GRP).reduce((s, x) => s + x.attendu, 0) / D.groupes.length
  };

  // Écart lisible + clé de tri (le plus en retard d'abord en tri décroissant)
  function ecartInfo(k) {
    switch (k.ecartType) {
      case 'echu': return { txt: `+${jours(k.ecartJ)}`, late: true, cle: 1000 + k.ecartJ };
      case 'clos': return { txt: k.ecartJ > 0 ? `+${jours(k.ecartJ)}` : k.ecartJ < 0 ? `−${jours(-k.ecartJ)}` : 'à la date', late: k.ecartJ > 0, cle: k.ecartJ };
      case 'reste': return { txt: `reste ${jours(k.restants)}`, late: false, cle: -k.restants };
      default: return { txt: `dans ${jours(ecart(TODAY, k.dp))}`, late: false, cle: -1000 - ecart(TODAY, k.dp) };
    }
  }

  /* ===== État de l'interface ===== */
  const state = {
    vue: 'chrono', groupe: 'resultat', echelle: 'mois',
    q: '', statut: '', resp: '', loc: '',
    replies: new Set(), sel: null, tri: { col: 'ecart', dir: -1 }
  };
  const MOIS_W = { trimestre: 56, mois: 150, semaine: 440 };   // largeur d'un mois selon l'échelle
  const SCROLL = $('#e-scroll'), GANTT = $('#e-gantt');
  let VIS = [];                                                  // codes visibles, dans l'ordre affiché
  let survol = null;

  /* ===== En-tête et indicateurs ===== */
  function construireEntete() {
    $('#e-crumb-projet').textContent = D.projet.sigle;
    $('#e-crumb-ptba').textContent = D.projet.ptba;
    $('#e-title').textContent = `Chronogramme ${D.projet.ptba}`;
    $('#e-sub').textContent = `${D.projet.composante} · situation au ${fd(TODAY)}`;
  }

  function construireKpis() {
    const n = e => ACTS.filter(k => k.etat === e).length;
    $('#e-kpis').innerHTML = `<div class="e-kpi">
        <span class="e-kpi__l">Avancement pondéré par le cadre logique</span>
        <span class="e-kpi__v">${pct(COMPO.real)}<small>attendu à date ${pct(COMPO.attendu)}</small></span>
        <span class="e-kpi__bar"><i style="width:${Math.min(COMPO.real, 100)}%"></i><b style="left:${Math.min(COMPO.attendu, 100)}%"></b></span>
      </div>`
      + ['retard', 'sansSuivi', 'echeance', 'cloturee'].map(e => `<button class="e-kpi" type="button" data-etat="${e}" data-f="${e}" aria-pressed="false" title="Filtrer : ${LIB[e]}">
          <span class="e-kpi__l">${forme(e)}${LIB[e]}</span>
          <span class="e-kpi__v">${n(e)}<small>/ ${ACTS.length}</small></span>
        </button>`).join('');
  }

  function construireFiltres() {
    const opt = (sel, vals) => vals.forEach(([v, t]) => sel.appendChild(new Option(t, v)));
    opt($('#e-f-statut'), ORDRE.map(e => [e, `${LIB[e]} (${ACTS.filter(k => k.etat === e).length})`]));
    opt($('#e-f-resp'), [...new Set(ACTS.map(k => k.a.acteur))].sort((a, b) => a.localeCompare(b, 'fr')).map(v => [v, v]));
    opt($('#e-f-loc'), [...new Set(ACTS.map(k => k.a.localite))].sort((a, b) => a.localeCompare(b, 'fr')).map(v => [v, v]));
  }

  function majFiltres() {
    $('#e-f-statut').value = state.statut;
    $$('#e-kpis [data-f]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.f === state.statut)));
    [['#e-f-statut', state.statut], ['#e-f-resp', state.resp], ['#e-f-loc', state.loc]]
      .forEach(([s, v]) => $(s).closest('.e-prop').classList.toggle('is-set', !!v));
    $('#e-clear').hidden = !(state.q || state.statut || state.resp || state.loc);
  }

  /* ===== Filtrage et groupes ===== */
  function correspond(k) {
    const q = state.q.trim().toLowerCase();
    return (!state.statut || k.etat === state.statut)
      && (!state.resp || k.a.acteur === state.resp)
      && (!state.loc || k.a.localite === state.loc)
      && (!q || `${k.a.code} ${k.a.libelle} ${k.a.acteur} ${k.a.localite}`.toLowerCase().includes(q));
  }

  function groupes() {
    const f = ACTS.filter(correspond);
    if (state.groupe === 'resultat') {
      return D.groupes.map(g => ({ id: g.code, titre: `<span class="e-mono">${g.code}</span> ${esc(g.libelle)}`, x: GRP[g.code], kids: f.filter(k => k.g === g) }))
        .filter(gr => gr.kids.length);
    }
    if (state.groupe === 'statut') {
      return ORDRE.map(e => ({ id: 's-' + e, etat: e, titre: `${forme(e)}${LIB[e]}`, kids: f.filter(k => k.etat === e) }))
        .filter(gr => gr.kids.length);
    }
    return f.length ? [{ id: 'tout', titre: null, kids: f }] : [];
  }

  /* ===== Échelle de la frise ===== */
  function isoSemaine(t) {
    const jour = (new Date(t).getUTCDay() + 6) % 7;
    const an = new Date(t + (3 - jour) * JOUR).getUTCFullYear();
    const jan4 = Date.UTC(an, 0, 4);
    const lundiS1 = jan4 - ((new Date(jan4).getUTCDay() + 6) % 7) * JOUR;
    return 1 + Math.round((t - jour * JOUR - lundiS1) / (7 * JOUR));
  }

  function construireEchelle() {
    const top = $('#e-lane-top'), bot = $('#e-lane-bot'), grid = $('#e-grid');
    top.innerHTML = bot.innerHTML = grid.innerHTML = '';
    const cell = (lane, a, b, txt) => {
      const c = el('div', 'e-cell', `<span>${txt}</span>`);
      c.style.left = x0(Math.max(a, T_DEB)) + '%';
      c.style.width = (x1(Math.min(b, T_FIN)) - x0(Math.max(a, T_DEB))) + '%';
      lane.appendChild(c);
    };
    const ligne = (t, fort) => {
      if (t <= T_DEB) return;
      const g = el('div', 'e-gl' + (fort ? ' e-gl--fort' : ''));
      g.style.left = x0(t) + '%';
      grid.appendChild(g);
    };
    const e = state.echelle;

    MOIS.forEach(({ y, m, a, b }, i) => {
      const debutTrim = m % 3 === 0, debutAn = m === 0;
      if (e === 'trimestre') {
        if (debutAn || i === 0) cell(top, a, Date.UTC(y, 11, 31), String(y));
        if (debutTrim) { cell(bot, a, Date.UTC(y, m + 3, 0), `T${m / 3 + 1}`); ligne(a, debutAn); }
      } else if (e === 'mois') {
        if (debutTrim || i === 0) cell(top, a, Date.UTC(y, m - m % 3 + 3, 0), `T${Math.floor(m / 3) + 1} ${y}`);
        cell(bot, a, b, MOIS_L[m]);
        ligne(a, debutTrim);
      } else {
        cell(top, a, b, `${MOIS_L[m]} ${y}`);
        ligne(a, true);
      }
    });
    if (e === 'semaine') {
      // Semaines ISO et week-ends grisés
      let lundi = T_DEB - ((new Date(T_DEB).getUTCDay() + 6) % 7) * JOUR;
      for (; lundi <= T_FIN; lundi += 7 * JOUR) {
        cell(bot, lundi, lundi + 6 * JOUR, `S${isoSemaine(lundi)} · ${new Date(lundi).getUTCDate()}`);
        ligne(lundi, false);
        const sam = lundi + 5 * JOUR;
        if (sam <= T_FIN) {
          const we = el('div', 'e-we');
          we.style.cssText = `left:${x0(sam)}%;width:${x1(Math.min(sam + JOUR, T_FIN)) - x0(sam)}%`;
          grid.prepend(we);
        }
      }
    }
    GANTT.style.setProperty('--nb-mois', NB_MOIS);
    GANTT.style.setProperty('--mois-w', MOIS_W[e] + 'px');
  }

  /* ===== Vue Chronologie ===== */
  const pos = (l, r) => `left:${l}%;width:${Math.max(r - l, 0)}%`;

  function ligneGauche(k) {
    const r = el('div', 'e-lrow is-act',
      `<span class="e-lact">${avatar(k.a.acteur)}<span class="e-lact__t" title="${esc(k.a.libelle)}"><span class="e-mono">${k.a.code}</span>${esc(k.a.libelle)}</span></span>`
      + `<span class="e-lst">${pastille(k.etat)}</span>`);
    r.dataset.row = k.a.code;
    r.tabIndex = -1;
    return r;
  }

  function ligneFrise(k) {
    const r = el('div', 'e-trow is-act');
    r.dataset.row = k.a.code;
    r.dataset.etat = k.etat;
    const l = x0(k.dp), rr = x1(k.fp);
    const suivi = !k.debute ? 'avenir' : (!k.hasRel && !k.a.cloturee ? 'nonsuivi' : 'ok');

    let h = `<div class="e-bar" data-suivi="${suivi}" style="${pos(l, rr)}">`
      + (k.hasRel ? `<div class="e-fill" style="width:${Math.min(k.realExact, 100)}%"></div>` : '') + '</div>';

    // Dépassement de la fin prévue : jusqu'à la clôture réelle, ou jusqu'à aujourd'hui
    let finX = rr;
    const depasse = k.a.cloturee ? (k.finR > k.fp ? k.finR : null) : (k.echu ? TODAY : null);
    if (depasse) { finX = x1(depasse); h += `<div class="e-over" style="${pos(rr, finX)}"></div>`; }

    const txt = k.hasRel
      ? `<b>${pct(k.realExact)}</b><span>${nf0.format(k.qr)} / ${nf0.format(k.a.qtePrevue)} ${k.a.unite}</span>`
      : `<span>${k.debute ? 'Aucun relevé' : `Démarre le ${fdc(k.dp)}`}</span>`;
    const ei = ecartInfo(k);
    const badge = ei.late ? `<span class="e-late">${ei.txt}</span>` : '';
    const flip = finX > 88;
    h += `<div class="e-lbl${flip ? ' is-flip' : ''}" style="${flip ? `right:${100 - l}%` : `left:${finX}%`}">${txt}${badge}</div>`;
    r.innerHTML = h;
    return r;
  }

  function rendreChrono(grs) {
    const L = $('#e-lrows'), R = $('#e-trows');
    L.innerHTML = R.innerHTML = '';

    L.appendChild(el('div', 'e-lrow is-jal', 'Jalons'));
    const rj = el('div', 'e-trow is-jal');
    rj.id = 'e-jal';
    D.jalons.forEach(j => {
      const t = d(j.date);
      const div = el('div', 'e-jalon', `<i></i><span>${esc(j.libelle)} · ${fdc(t)}</span>`);
      div.dataset.x = (x0(t) + x1(t)) / 2;
      div.style.left = `calc(${div.dataset.x}% - 6px)`;
      div.title = `${j.libelle} — ${fd(t)}`;
      rj.appendChild(div);
    });
    R.appendChild(rj);

    grs.forEach(gr => {
      const ouvert = !state.replies.has(gr.id);
      if (gr.titre) {
        const lg = el('div', 'e-lrow is-grp',
          `<button class="e-caret" type="button" data-g="${gr.id}" aria-expanded="${ouvert}" aria-label="${ouvert ? 'Replier' : 'Déplier'} le groupe"><i class="fas fa-chevron-down"></i></button>`
          + `<span class="e-glib">${gr.titre}</span><span class="e-gcount">${gr.kids.length}</span>`
          + (gr.x ? `<span class="e-gval" title="Réalisé pondéré">${pct(gr.x.real)}</span>` : ''));
        lg.dataset.row = gr.id;
        if (gr.etat) lg.dataset.etat = gr.etat;
        const rg = el('div', 'e-trow is-grp', gr.x
          ? `<div class="e-sum" style="${pos(x0(gr.x.dp), x1(gr.x.fp))}"><i style="width:${Math.min(gr.x.real, 100)}%"></i></div>` : '');
        rg.dataset.row = gr.id;
        L.appendChild(lg);
        R.appendChild(rg);
      }
      if (ouvert || !gr.titre) gr.kids.forEach(k => { L.appendChild(ligneGauche(k)); R.appendChild(ligneFrise(k)); VIS.push(k.a.code); });
    });
    placerJalons();
    majDefilement();
  }

  // Chaque libellé de jalon s'arrête avant le suivant (ou le bord de la frise)
  function placerJalons() {
    const row = $('#e-jal');
    if (!row) return;
    const W = row.clientWidth;
    const items = $$('#e-jal .e-jalon').sort((a, b) => a.dataset.x - b.dataset.x);
    items.forEach((it, i) => {
      const x = it.dataset.x / 100 * W;
      const limite = i < items.length - 1 ? items[i + 1].dataset.x / 100 * W - 16 : W - 6;
      const place = limite - x - 14;
      const span = it.querySelector('span');
      span.style.maxWidth = Math.max(0, place) + 'px';
      span.hidden = place < 40;
    });
  }

  /* ===== Vue Tableau ===== */
  const COLS = [
    { id: 'code',   lib: 'Code',          cle: k => k.a.code },
    { id: 'act',    lib: 'Activité',      cle: k => k.a.libelle },
    { id: 'statut', lib: 'Statut',        cle: k => ORDRE.indexOf(k.etat) },
    { id: 'resp',   lib: 'Responsable',   cle: k => k.a.acteur },
    { id: 'loc',    lib: 'Localité',      cle: k => k.a.localite },
    { id: 'fin',    lib: 'Fin prévue',    cle: k => k.fp,          n: true },
    { id: 'real',   lib: 'Réalisé',       cle: k => k.realExact,   n: true },
    { id: 'ecart',  lib: 'Écart',         cle: k => ecartInfo(k).cle, n: true }
  ];

  function enteteTableau() {
    $('#e-thead-row').innerHTML = COLS.map(c => {
      const actif = state.tri.col === c.id;
      const sens = actif ? (state.tri.dir > 0 ? 'ascending' : 'descending') : 'none';
      const ico = actif ? (state.tri.dir > 0 ? 'fa-arrow-up' : 'fa-arrow-down') : 'fa-sort';
      return `<th scope="col" class="${c.n ? 'n' : ''}" aria-sort="${sens}"><button type="button" data-col="${c.id}">${c.lib} <i class="fas ${ico}"></i></button></th>`;
    }).join('');
  }

  function ligneTableau(k) {
    const ei = ecartInfo(k);
    const tr = el('tr', '',
      `<td class="e-mono dim">${k.a.code}</td>`
      + `<td class="t">${esc(k.a.libelle)}</td>`
      + `<td>${pastille(k.etat)}</td>`
      + `<td><span class="e-resp">${avatar(k.a.acteur)}<span>${esc(k.a.acteur)}</span></span></td>`
      + `<td class="dim">${esc(k.a.localite)}</td>`
      + `<td class="n">${fdc(k.fp)} ${new Date(k.fp).getUTCFullYear()}</td>`
      + `<td class="n" data-etat="${k.etat}"><span class="e-prog"><span class="e-prog__bar"><i style="width:${Math.min(k.realExact, 100)}%"></i></span>${k.hasRel ? pct(k.realExact) : '—'}</span></td>`
      + `<td class="n"><span class="${ei.late ? 'e-late' : 'dim'}">${ei.txt}</span></td>`);
    tr.dataset.row = k.a.code;
    return tr;
  }

  function rendreTableau(grs) {
    enteteTableau();
    const col = COLS.find(c => c.id === state.tri.col);
    const cmp = (a, b) => {
      const va = col.cle(a), vb = col.cle(b);
      const r = typeof va === 'string' ? va.localeCompare(vb, 'fr') : va - vb;
      return r * state.tri.dir || a.a.code.localeCompare(b.a.code);
    };
    const tb = $('#e-tbody');
    tb.innerHTML = '';
    grs.forEach(gr => {
      if (gr.titre) {
        const tr = el('tr', 'is-grp', `<td colspan="${COLS.length}"><span style="display:inline-flex;align-items:center;gap:8px">${gr.titre} <span class="e-gcount">${gr.kids.length}</span></span></td>`);
        if (gr.etat) tr.dataset.etat = gr.etat;
        tb.appendChild(tr);
      }
      [...gr.kids].sort(cmp).forEach(k => { tb.appendChild(ligneTableau(k)); VIS.push(k.a.code); });
    });
  }

  /* ===== Rendu commun ===== */
  function rendre() {
    VIS = [];
    survol = null;
    const grs = groupes();
    const vide = !grs.length;
    $('#e-empty').hidden = !vide;
    $('#e-view-chrono').hidden = state.vue !== 'chrono' || vide;
    $('#e-view-table').hidden = state.vue !== 'table' || vide;
    if (state.vue === 'chrono') rendreChrono(grs); else rendreTableau(grs);
    majFiltres();
    marquerSelection();
  }

  /* ===== Survol et sélection ===== */
  function surligner(code) {
    if (code === survol) return;
    $$('.e-gantt .is-hl').forEach(e => e.classList.remove('is-hl'));
    survol = code;
    if (code) $$(`.e-gantt [data-row="${code}"]`).forEach(e => e.classList.add('is-hl'));
  }
  function marquerSelection() {
    $$('.is-sel').forEach(e => e.classList.remove('is-sel'));
    if (state.sel) $$(`.e-gantt [data-row="${state.sel}"], .e-table [data-row="${state.sel}"]`).forEach(e => e.classList.add('is-sel'));
  }

  // Rend la ligne visible (verticalement) et la barre (horizontalement)
  function montrer(code) {
    const row = $(`.e-lrow[data-row="${code}"]`) || $(`.e-table tr[data-row="${code}"]`);
    if (!row) return;
    const r = row.getBoundingClientRect(), haut = 60, bas = window.innerHeight - 20;
    if (r.top < haut || r.bottom > bas) window.scrollBy({ top: r.top < haut ? r.top - haut - 40 : r.bottom - bas + 40 });
    if (state.vue === 'chrono') {
      const k = K[code], W = SCROLL.scrollWidth, x = SCROLL.scrollLeft, vis = SCROLL.clientWidth;
      const a = x0(k.dp) / 100 * W, b = x1(k.fp) / 100 * W;
      if (b < x + 40 || a > x + vis - 40) SCROLL.scrollTo({ left: a - 60, behavior: lisse() });
    }
  }

  /* ===== Volet de détail ===== */
  function texteEcart(k) {
    switch (k.ecartType) {
      case 'echu': return `${jours(k.ecartJ)} de retard sur la fin prévue`;
      case 'clos': return k.ecartJ > 0 ? `Clôturée ${jours(k.ecartJ)} après la fin prévue`
        : k.ecartJ < 0 ? `Clôturée ${jours(-k.ecartJ)} avant la fin prévue` : 'Clôturée à la date prévue';
      case 'reste': return `Reste ${jours(k.restants)} avant la fin prévue`;
      default: return `Démarrage prévu dans ${jours(ecart(TODAY, k.dp))}`;
    }
  }

  function remplirVolet(k) {
    const a = k.a, i = VIS.indexOf(a.code);
    const tard = k.ecartType === 'echu' || (k.ecartType === 'clos' && k.ecartJ > 0);
    const enCours = !a.cloturee && k.debute;
    const reel = !k.hasRel ? '—' : a.cloturee ? `${fd(k.debR)} → ${fd(k.finR)}` : `depuis le ${fd(k.debR)}`;
    const fil = k.rel.length
      ? `<ol class="e-feed">${[...k.rel].reverse().map(r => `<li data-etat="${k.etat}">
          <span class="e-feed__dot"></span>
          <span><span class="e-feed__t">+${nf0.format(r.qte)} ${a.unite}</span><br><span class="e-feed__s">${r.periode.replace('-', ' ')} · relevé du ${fd(r.t)}</span></span>
          <span class="e-feed__n">${nf0.format(r.cum)} / ${nf0.format(a.qtePrevue)}</span></li>`).join('')}</ol>`
      : `<p class="e-note">Aucun relevé validé${k.debute ? ' depuis le démarrage prévu.' : '.'}</p>`;
    const estim = k.proj
      ? `<p class="e-note">Au rythme observé, fin estimée le <b>${fd(k.proj.fin)}</b>${k.proj.ecart > 0 ? `, soit ${jours(k.proj.ecart)} après la fin prévue` : ''}.</p>` : '';

    $('#e-sheet').innerHTML = `
      <div class="e-sh-bar">
        <span class="e-mono">${a.code} · ${i + 1} / ${VIS.length}</span>
        <span class="e-sh-tools">
          <button class="e-icon" type="button" data-nav="-1" aria-label="Activité précédente" title="Précédente (↑)" ${i <= 0 ? 'disabled' : ''}><i class="fas fa-chevron-up"></i></button>
          <button class="e-icon" type="button" data-nav="1" aria-label="Activité suivante" title="Suivante (↓)" ${i >= VIS.length - 1 ? 'disabled' : ''}><i class="fas fa-chevron-down"></i></button>
          <button class="e-icon" type="button" data-close aria-label="Fermer" title="Fermer (Échap)"><i class="fas fa-xmark"></i></button>
        </span>
      </div>
      <div class="e-sh-body">
        <div>${pastille(k.etat)}</div>
        <h2>${esc(a.libelle)}</h2>
        <dl class="e-props">
          <dt>Responsable</dt><dd><span class="e-resp">${avatar(a.acteur)}<span>${esc(a.acteur)}</span></span></dd>
          <dt>Localité</dt><dd>${esc(a.localite)}</dd>
          <dt>Résultat</dt><dd><span class="e-mono">${k.g.code}</span> ${esc(k.g.libelle)}</dd>
          <dt>Prévu</dt><dd>${fd(k.dp)} → ${fd(k.fp)} · ${jours(k.prevJ)}</dd>
          <dt>Réel</dt><dd>${reel}</dd>
          <dt>Poids</dt><dd>${a.poids} dans ${k.g.code}</dd>
        </dl>
        <div class="e-card" data-etat="${k.etat}">
          <div class="e-card__line"><span>Réalisé</span><b>${pct1(k.realExact)}</b></div>
          <div class="e-card__bar"><i style="width:${Math.min(k.realExact, 100)}%"></i>${enCours ? `<b style="left:${Math.min(k.attendu, 100)}%" title="Attendu à date"></b>` : ''}</div>
          <div class="e-card__line is-dim"><span>${nf0.format(k.qr)} / ${nf0.format(a.qtePrevue)} ${a.unite}</span>${enCours ? `<span>attendu à date ${pct(k.attendu)}</span>` : ''}</div>
          <p class="e-ecart${tard ? ' is-late' : ''}">${texteEcart(k)}</p>
        </div>
        <div>
          <h3>Relevés validés</h3>
        </div>
        ${fil}
        ${estim}
      </div>`;
  }

  function selectionner(code, ouvrir = true) {
    state.sel = code;
    marquerSelection();
    if (!code) return;
    if (ouvrir) {
      remplirVolet(K[code]);
      const s = $('#e-sheet');
      s.classList.add('is-open');
      s.setAttribute('aria-hidden', 'false');
    }
    montrer(code);
  }

  function fermerVolet() {
    const s = $('#e-sheet');
    s.classList.remove('is-open');
    s.setAttribute('aria-hidden', 'true');
    state.sel = null;
    marquerSelection();
  }

  function deplacer(sens) {
    if (!VIS.length) return;
    const i = state.sel ? VIS.indexOf(state.sel) : -1;
    const j = i < 0 ? (sens > 0 ? 0 : VIS.length - 1) : clamp(i + sens, 0, VIS.length - 1);
    selectionner(VIS[j]);
  }

  /* ===== Légende ===== */
  function construireLegende() {
    $('#e-legend').innerHTML = [
      `<span class="e-lg"><span class="e-sw e-sw--plan"><i></i></span>Période prévue, remplie selon le réalisé (à comparer à « Aujourd'hui »)</span>`,
      `<span class="e-lg"><span class="e-sw e-sw--over"></span>Dépassement de la fin prévue</span>`,
      `<span class="e-lg"><span class="e-sw e-sw--none"></span>Aucun relevé</span>`,
      `<span class="e-lg"><span class="e-sw-today"></span>Aujourd'hui</span>`,
      `<span class="e-lg"><span class="e-sw-jalon"></span>Jalon</span>`
    ].join('');
  }

  /* ===== Défilement horizontal ===== */
  const lisse = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

  function majDefilement() {
    const x = SCROLL.scrollLeft, max = SCROLL.scrollWidth - SCROLL.clientWidth;
    $('#e-thead-track').style.transform = `translateX(${-x}px)`;
    GANTT.classList.toggle('is-scrolled', x > 0);
    $('#e-prev').disabled = x <= 1;
    $('#e-next').disabled = x >= max - 1;
    // Le libellé coupé par le bord gauche glisse pour rester lisible
    $$('#e-lane-top .e-cell').forEach(c => {
      const s = c.firstElementChild;
      const dx = Math.min(Math.max(0, x - c.offsetLeft), c.offsetWidth - s.offsetWidth);
      s.style.transform = dx > 0 ? `translateX(${dx}px)` : '';
    });
    // Un jalon sorti par la gauche n'affiche plus de libellé orphelin
    $$('#e-jal .e-jalon').forEach(j => { j.style.visibility = j.offsetLeft + 6 < x ? 'hidden' : ''; });
  }

  // Place une date aux trois cinquièmes de la zone visible : le réalisé (passé) reste lisible
  function allerA(t, behavior = lisse()) {
    const x = (x0(t) + x1(t)) / 2 / 100 * SCROLL.scrollWidth;
    SCROLL.scrollTo({ left: x - SCROLL.clientWidth * 0.6, behavior });
  }

  // Une période à la fois (année, trimestre ou mois selon l'échelle), calée sur son début
  function decaler(sens) {
    const W = SCROLL.scrollWidth, x = SCROLL.scrollLeft;
    const debuts = $$('#e-lane-top .e-cell').map(c => parseFloat(c.style.left) / 100 * W);
    const cible = sens > 0 ? debuts.find(p => p > x + 2) : debuts.filter(p => p < x - 2).pop();
    SCROLL.scrollTo({ left: cible ?? (sens > 0 ? W : 0), behavior: lisse() });
  }

  function changerEchelle(v) {
    if (v === state.echelle) return;
    const centre = (SCROLL.scrollLeft + SCROLL.clientWidth / 2) / SCROLL.scrollWidth;
    state.echelle = v;
    $$('#e-echelle button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
    construireEchelle();
    placerJalons();
    SCROLL.scrollLeft = centre * SCROLL.scrollWidth - SCROLL.clientWidth / 2;
    majDefilement();
  }

  function changerVue(v) {
    if (v === state.vue) return;
    state.vue = v;
    $$('.e-tabs [role="tab"]').forEach(t => t.setAttribute('aria-selected', String(t.dataset.view === v)));
    $('.e-work').classList.toggle('is-table', v === 'table');
    rendre();
    if (v === 'chrono') allerA(TODAY, 'auto');
  }

  /* ===== Export CSV (activités filtrées) ===== */
  function exporter() {
    const lignes = [['Code', 'Activité', 'Résultat', 'Statut', 'Responsable', 'Localité', 'Début prévu', 'Fin prévue',
      'Quantité prévue', 'Quantité réalisée', 'Unité', 'Réalisé (%)', 'Attendu à date (%)', 'Écart']];
    ACTS.filter(correspond).forEach(k => lignes.push([
      k.a.code, k.a.libelle, k.g.code, LIB[k.etat], k.a.acteur, k.a.localite, iso(k.dp), iso(k.fp),
      k.a.qtePrevue, k.qr, k.a.unite, nf1.format(k.realExact), nf1.format(k.attendu), ecartInfo(k).txt
    ]));
    const csv = lignes.map(l => l.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const lien = el('a');
    lien.href = url;
    lien.download = `chronogramme-${D.projet.sigle}-${D.projet.ptba.replace(/\s+/g, '-')}.csv`;
    document.body.appendChild(lien);
    lien.click();
    lien.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ===== Thème ===== */
  const CLE_THEME = 'chronogramme_theme';
  function appliquerTheme(theme) {
    document.documentElement.dataset.theme = theme;
    const b = $('#e-theme'), lib = theme === 'dark' ? 'Thème clair' : 'Thème sombre';
    b.querySelector('i').className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    b.setAttribute('aria-label', lib);
    b.title = lib;
  }

  /* ===== Événements ===== */
  function brancher() {
    SCROLL.addEventListener('scroll', majDefilement, { passive: true });
    new ResizeObserver(() => { majDefilement(); placerJalons(); }).observe(SCROLL);
    $('#e-prev').addEventListener('click', () => decaler(-1));
    $('#e-next').addEventListener('click', () => decaler(1));
    $('#e-today').addEventListener('click', () => allerA(TODAY));
    $('#e-echelle').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) changerEchelle(b.dataset.v); });
    $('.e-tabs').addEventListener('click', e => { const t = e.target.closest('[data-view]'); if (t) changerVue(t.dataset.view); });

    // Filtres
    $('#e-q').addEventListener('input', e => { state.q = e.target.value; rendre(); });
    $('#e-f-statut').addEventListener('change', e => { state.statut = e.target.value; rendre(); });
    $('#e-f-resp').addEventListener('change', e => { state.resp = e.target.value; rendre(); });
    $('#e-f-loc').addEventListener('change', e => { state.loc = e.target.value; rendre(); });
    $('#e-groupe').addEventListener('change', e => { state.groupe = e.target.value; state.replies.clear(); rendre(); });
    $('#e-kpis').addEventListener('click', e => {
      const b = e.target.closest('[data-f]');
      if (!b) return;
      state.statut = state.statut === b.dataset.f ? '' : b.dataset.f;
      rendre();
    });
    const effacer = () => {
      state.q = state.statut = state.resp = state.loc = '';
      $('#e-q').value = $('#e-f-resp').value = $('#e-f-loc').value = '';
      rendre();
    };
    $('#e-clear').addEventListener('click', effacer);
    $('#e-clear2').addEventListener('click', effacer);

    // Chronologie : repli des groupes, sélection, survol synchronisé
    GANTT.addEventListener('click', e => {
      const c = e.target.closest('.e-caret');
      if (c) {
        const g = c.dataset.g;
        if (state.replies.has(g)) state.replies.delete(g); else state.replies.add(g);
        rendre();
        const nc = $(`.e-caret[data-g="${g}"]`);
        if (nc) nc.focus();
        return;
      }
      const row = e.target.closest('.e-lrow.is-act, .e-trow.is-act');
      if (row) {
        if (row.dataset.row === state.sel) fermerVolet(); else selectionner(row.dataset.row);
      }
    });
    GANTT.addEventListener('mousemove', e => {
      const row = e.target.closest('[data-row]');
      surligner(row ? row.dataset.row : null);
    });
    GANTT.addEventListener('mouseleave', () => surligner(null));

    // Tableau : tri et sélection
    $('#e-table').addEventListener('click', e => {
      const h = e.target.closest('[data-col]');
      if (h) {
        const col = h.dataset.col;
        state.tri = state.tri.col === col ? { col, dir: -state.tri.dir } : { col, dir: COLS.find(c => c.id === col).n ? -1 : 1 };
        rendre();
        return;
      }
      const tr = e.target.closest('tr[data-row]');
      if (tr) { if (tr.dataset.row === state.sel) fermerVolet(); else selectionner(tr.dataset.row); }
    });

    // Volet
    $('#e-sheet').addEventListener('click', e => {
      if (e.target.closest('[data-close]')) { fermerVolet(); return; }
      const n = e.target.closest('[data-nav]');
      if (n && !n.disabled) deplacer(+n.dataset.nav);
    });

    // Clavier : / recherche · ↑ ↓ parcourir · Entrée ouvrir · Échap fermer
    document.addEventListener('keydown', e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const saisie = e.target.closest && e.target.closest('input, select, textarea');
      if (e.key === 'Escape') {
        if (saisie && e.target.id === 'e-q' && state.q) return;   // le champ efface lui-même sa saisie
        if (state.sel) { e.preventDefault(); fermerVolet(); }
        return;
      }
      if (saisie) return;
      if (e.key === '/') { e.preventDefault(); $('#e-q').focus(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (e.target.closest('button') && !e.target.closest('.e-sheet')) return;
        e.preventDefault();
        deplacer(e.key === 'ArrowDown' ? 1 : -1);
        return;
      }
      if (e.key === 'Enter' && state.sel && !e.target.closest('button, a')) {
        e.preventDefault();
        selectionner(state.sel);
      }
    });

    $('#e-export').addEventListener('click', exporter);
    $('#e-theme').addEventListener('click', () => {
      const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      appliquerTheme(theme);
      try { localStorage.setItem(CLE_THEME, theme); } catch (_) { /* stockage indisponible */ }
    });
  }

  /* ===== Initialisation ===== */
  let themeInitial = 'light';
  try { themeInitial = localStorage.getItem(CLE_THEME) || 'light'; } catch (_) { /* stockage indisponible */ }
  appliquerTheme(themeInitial);
  construireEntete();
  construireKpis();
  construireFiltres();
  construireEchelle();
  construireLegende();
  $('#e-today-line').style.left = XT + '%';
  const pill = $('#e-today-pill');
  pill.style.left = XT + '%';
  pill.textContent = `Aujourd'hui · ${fdc(TODAY)}`;
  brancher();
  rendre();
  allerA(TODAY, 'auto');
  majDefilement();
})();
