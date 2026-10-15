/* =========================================================
   CHRONOGRAMME — Option D · Option A modernisée, sans excès
   Même structure et mêmes calculs que chronogramme/ (option A) ;
   les onze propositions sont appliquées d'office (« Écran proposé »),
   un sélecteur permet de revenir à l'écran actuel pour comparer.
   Dépend de CHRONO_DATA (data.js). Dates manipulées en UTC, au jour près.
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

  /* ===== Dates ===== */
  const JOUR = 86400000;
  const d = s => { const [y, m, j] = s.split('-').map(Number); return Date.UTC(y, m - 1, j); };
  const TODAY = d(D.dateReference);
  const T_DEB = d(D.debutFrise), T_FIN = d(D.finFrise);
  const SPAN = (T_FIN - T_DEB) / JOUR + 1;
  const ecart = (a, b) => Math.round((b - a) / JOUR);       // jours entre deux dates
  const duree = (a, b) => ecart(a, b) + 1;                  // durée inclusive
  const x0 = t => (t - T_DEB) / JOUR / SPAN * 100;          // début du jour t, en %
  const x1 = t => ((t - T_DEB) / JOUR + 1) / SPAN * 100;    // fin du jour t, en %
  const trimestre = code => {
    const [y, t] = code.split('-T').map(Number);
    return [Date.UTC(y, (t - 1) * 3, 1), Date.UTC(y, t * 3, 0)];
  };

  const nf0 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  const nf2 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct = n => nf0.format(n) + ' %';
  const pct2 = n => nf2.format(n) + ' %';
  const dfmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const fd = t => dfmt.format(new Date(t)).replace(/^1 /, '1er ');
  const jours = n => `${n} j`;

  /* ===== États et formes ===== */
  const LIB_ETAT = { conforme: 'Conforme', retard: 'En retard', echeance: 'Échéance sous 30 j', sansSuivi: 'Sans suivi', cloturee: 'Clôturée', avenir: 'À venir' };
  const SVG = {
    conforme:  '<svg viewBox="0 0 14 14"><circle cx="7" cy="7" r="5.6"/></svg>',
    retard:    '<svg viewBox="0 0 14 14"><path d="M7 1 L13.4 12.6 L0.6 12.6 Z"/></svg>',
    echeance:  '<svg viewBox="0 0 14 14"><rect x="1.8" y="1.8" width="10.4" height="10.4"/></svg>',
    sansSuivi: '<svg viewBox="0 0 14 14"><path class="s" d="M2.4 2.4 L11.6 11.6 M11.6 2.4 L2.4 11.6"/></svg>',
    cloturee:  '<svg viewBox="0 0 14 14"><path class="s" d="M1.8 7.6 L5.4 11.2 L12.2 2.8"/></svg>',
    avenir:    '<svg viewBox="0 0 14 14"><circle class="s" cx="7" cy="7" r="5" style="stroke-width:2.2"/></svg>'
  };
  const forme = (etat, cls = '') => `<span class="ch-shape ${cls}" data-etat="${etat}" aria-hidden="true">${SVG[etat]}</span>`;

  /* ===== État de la page ===== */
  const PROPS = D.propositions;
  const F = {};
  PROPS.forEach(p => { F[p.id] = true; });   // écran proposé par défaut
  let filtre = null;           // compteur actif de la bande de synthèse
  let recherche = '';
  const replies = new Set();   // regroupements repliés
  let CACHE = {};

  /* ===== Calculs ===== */
  function calcActivite(a) {
    const dp = d(a.debutPrevu), fp = d(a.finPrevue);
    const prevJ = duree(dp, fp);
    let r = null;
    if (a.releves.length) {
      r = F.P11
        ? { deb: d(a.debutReel), fin: d(a.finReel) }
        : { deb: trimestre(a.releves[0])[0], fin: trimestre(a.releves[a.releves.length - 1])[1] };
      r.j = duree(r.deb, r.fin);
    }
    // Écran actuel : prévu ÷ réel, non borné. P1 : réel ÷ prévu, borné à 100 %.
    const exact = r ? (F.P1 ? r.j / prevJ * 100 : prevJ / r.j * 100) : 0;
    const aff = F.P1 ? Math.min(100, Math.round(exact)) : Math.round(exact);
    const debute = dp <= TODAY, echu = fp < TODAY;
    const restants = ecart(TODAY, fp);
    let retard = 0;
    if (a.cloturee) { if (r && r.fin > fp) retard = ecart(fp, r.fin); }
    else if (echu) retard = ecart(fp, TODAY);
    const deborde = !!r && r.fin > fp;
    const realExact = a.qteReelle / a.qtePrevue * 100;
    let etat;
    if (a.cloturee) etat = 'cloturee';
    else if (echu) etat = 'retard';
    else if (!r && debute) etat = 'sansSuivi';
    else if (restants <= 30) etat = 'echeance';
    else if (!debute) etat = 'avenir';
    else etat = 'conforme';
    return {
      a, dp, fp, prevJ, r, exact, aff, debute, echu, restants, retard, deborde,
      realExact, realAff: Math.round(realExact), etat,
      suivi: r ? 'suivi' : (debute ? 'nonsuivi' : 'avenir')
    };
  }

  function calcGroupe(g, kids) {
    const dp = Math.min(...kids.map(k => k.dp)), fp = Math.max(...kids.map(k => k.fp));
    const prevJ = duree(dp, fp);
    const avecReleves = kids.filter(k => k.r);
    let r = null;
    if (avecReleves.length) {
      r = { deb: Math.min(...avecReleves.map(k => k.r.deb)), fin: Math.max(...avecReleves.map(k => k.r.fin)) };
      r.j = duree(r.deb, r.fin);
    }
    const sp = kids.reduce((s, k) => s + k.a.poids, 0);
    let exact, formule;
    if (F.P10) {
      // Moyenne pondérée des valeurs affichées, pour que la salle puisse refaire le calcul
      exact = kids.reduce((s, k) => s + k.aff * k.a.poids, 0) / sp;
      formule = `(${kids.map(k => `${k.aff}×${k.a.poids}`).join(' + ')}) ÷ ${sp}`;
    } else {
      // Écran actuel : même ratio que les activités, appliqué aux dates agrégées
      exact = r ? (F.P1 ? r.j / prevJ * 100 : prevJ / r.j * 100) : 0;
      formule = r ? (F.P1 ? `${jours(r.j)} ÷ ${jours(prevJ)}` : `${jours(prevJ)} ÷ ${jours(r.j)}`) : 'aucun relevé';
    }
    const aff = F.P1 ? Math.min(100, Math.round(exact)) : Math.round(exact);
    let realExact, realFormule;
    if (F.P10) {
      realExact = kids.reduce((s, k) => s + k.realAff * k.a.poids, 0) / sp;
      realFormule = `(${kids.map(k => `${k.realAff}×${k.a.poids}`).join(' + ')}) ÷ ${sp}`;
    } else {
      realExact = kids.reduce((s, k) => s + k.realAff, 0) / kids.length;
      realFormule = `(${kids.map(k => k.realAff).join(' + ')}) ÷ ${kids.length}`;
    }
    return { grp: true, g, kids, dp, fp, prevJ, r, sp, exact, aff, formule, realExact, realAff: Math.round(realExact), realFormule };
  }

  const PRED = {
    retard:    k => !k.a.cloturee && k.echu,
    sansSuivi: k => k.debute && !k.r,
    echeance:  k => !k.a.cloturee && k.restants >= 0 && k.restants <= 30,
    cloturee:  k => k.a.cloturee
  };
  const LIB_FILTRE = { retard: 'En retard', sansSuivi: 'Sans suivi', echeance: 'Échéance sous 30 j', cloturee: 'Clôturées' };

  /* ===== Construction du DOM ===== */
  const REF = {};

  function construireFrise() {
    const MOIS_C = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    const MOIS_L = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    const deb = new Date(T_DEB), fin = new Date(T_FIN);
    const nbMois = (fin.getUTCFullYear() - deb.getUTCFullYear()) * 12 + fin.getUTCMonth() - deb.getUTCMonth() + 1;
    $('#ch-gantt').style.setProperty('--nb-mois', nbMois);   // largeur de la frise (défilement horizontal)

    for (let i = 0; i < nbMois; i++) {
      const y = deb.getUTCFullYear() + Math.floor((deb.getUTCMonth() + i) / 12), m = (deb.getUTCMonth() + i) % 12;
      const a = Date.UTC(y, m, 1), b = Date.UTC(y, m + 1, 0);
      const div = el('div', 'ch-m', `<span class="ch-m-s">${MOIS_C[m]}</span><span class="ch-m-l">${MOIS_L[m]}</span>`);
      div.style.left = x0(a) + '%';
      div.style.width = (x1(b) - x0(a)) + '%';
      $('#ch-mrow').appendChild(div);
      if (i > 0) {
        const gl = el('div', 'ch-gl' + (m % 3 === 0 ? ' ch-gl--q' : '') + (m === 0 ? ' ch-gl--y' : ''));
        gl.style.left = x0(a) + '%';
        $('#ch-glines').appendChild(gl);
      }
      if (m % 3 === 0) {
        const qb = Date.UTC(y, m + 3, 0);
        const q = el('div', 'ch-q', `<span>T${m / 3 + 1} ${y}</span>`);
        q.style.left = x0(a) + '%';
        q.style.width = (x1(qb) - x0(a)) + '%';
        $('#ch-qrow').appendChild(q);
      }
    }

    const xt = (x0(TODAY) + x1(TODAY)) / 2;
    $('#ch-today-line').style.left = xt + '%';
    const pill = $('#ch-today-pill');
    pill.style.left = xt + '%';
    pill.textContent = `Aujourd'hui · ${fd(TODAY).replace(/ \d{4}$/, '')}`;

    D.jalons.forEach(j => {
      const t = d(j.date);
      const div = el('div', 'ch-jalon', `<i></i><span>${j.libelle} · ${fd(t).replace(/ \d{4}$/, '')}</span>`);
      div.dataset.x = (x0(t) + x1(t)) / 2;
      div.style.left = `calc(${div.dataset.x}% - 6px)`;
      div.title = `${j.libelle} — ${fd(t)}`;
      $('#ch-jal').appendChild(div);
    });
    // La largeur de la frise varie (fenêtre, colonnes P9/P10, mode présentation)
    new ResizeObserver(placerJalons).observe($('#ch-jal'));
  }

  // Chaque libellé s'arrête avant le jalon suivant (ou le bord de la frise), tronqué au besoin
  function placerJalons() {
    const W = $('#ch-jal').clientWidth;
    const items = $$('#ch-jal .ch-jalon').sort((a, b) => a.dataset.x - b.dataset.x);
    items.forEach((it, i) => {
      const x = it.dataset.x / 100 * W;
      const limite = i < items.length - 1 ? items[i + 1].dataset.x / 100 * W - 16 : W - 6;
      const place = limite - x - 14;   // losange + espacement
      const span = it.querySelector('span');
      span.style.maxWidth = Math.max(0, place) + 'px';
      span.hidden = place < 40;
    });
  }

  function construireLignes() {
    const L = $('#ch-lrows'), R = $('#ch-trows');
    D.groupes.forEach(g => {
      const lg = el('div', 'ch-lrow is-grp');
      lg.dataset.row = g.code;
      lg.innerHTML = `<span class="c-code"><button class="ch-caret" type="button" aria-expanded="true" aria-label="Replier ${g.code}" data-g="${g.code}"><i class="fas fa-caret-down"></i></button>${g.code}</span>`
        + `<span class="c-lib">${g.libelle}</span>`
        + `<span class="c-poids"><span class="ch-in ch-num"></span></span>`
        + `<span class="c-cal"><span class="ch-in"><span class="ch-pct"></span></span></span>`
        + `<span class="c-real"><span class="ch-in"><span class="ch-mini"><i></i></span><span class="ch-rt ch-num"></span></span></span>`;
      const rg = el('div', 'ch-trow is-grp', '<div class="ch-gbar"><div class="ch-fill"></div></div>');
      rg.dataset.row = g.code;
      L.appendChild(lg);
      R.appendChild(rg);
      REF[g.code] = {
        l: lg, r: rg, gbar: rg.querySelector('.ch-gbar'), fill: rg.querySelector('.ch-fill'),
        poids: lg.querySelector('.c-poids .ch-in'), pct: lg.querySelector('.ch-pct'),
        mini: lg.querySelector('.ch-mini i'), rt: lg.querySelector('.ch-rt')
      };

      g.activites.forEach(a => {
        const l = el('div', 'ch-lrow is-act');
        l.dataset.row = a.code;
        l.tabIndex = 0;
        l.innerHTML = `<span class="c-code">${a.code}</span><span class="c-lib">${a.libelle}</span>`
          + `<span class="c-poids"><span class="ch-in ch-num"></span></span>`
          + `<span class="c-cal"><span class="ch-in"><span class="ch-pct"></span></span></span>`
          + `<span class="c-real"><span class="ch-in">${forme('retard', 'ch-flag')}<span class="ch-mini"><i></i></span><span class="ch-rt ch-num"></span></span></span>`;
        const r = el('div', 'ch-trow is-act',
          '<div class="ch-bar"><div class="ch-fill"></div></div><div class="ch-stub"></div>'
          + '<div class="ch-real"><div class="ch-real-over"></div></div>'
          + '<div class="ch-after"><span class="ch-mk"></span><span class="ch-delay"></span></div>');
        r.dataset.row = a.code;
        L.appendChild(l);
        R.appendChild(r);
        REF[a.code] = {
          l, r, bar: r.querySelector('.ch-bar'), fill: r.querySelector('.ch-fill'), stub: r.querySelector('.ch-stub'),
          real: r.querySelector('.ch-real'), over: r.querySelector('.ch-real-over'), after: r.querySelector('.ch-after'),
          mk: r.querySelector('.ch-mk'), delay: r.querySelector('.ch-delay'),
          poids: l.querySelector('.c-poids .ch-in'), pct: l.querySelector('.ch-pct'),
          realCell: l.querySelector('.c-real'), mini: l.querySelector('.ch-mini i'), rt: l.querySelector('.ch-rt')
        };
      });
    });
  }

  function construireEntete() {
    $('#ch-ptba').textContent = D.projet.ptba;
    $('#ch-sub').textContent = `${D.projet.sigle} · ${D.projet.composante} · situation au ${fd(TODAY)} · données de démonstration`;

    const acts = D.groupes.flatMap(g => g.activites);
    const tri = (a, b) => a.localeCompare(b, 'fr');
    [...new Set(acts.map(a => a.localite))].sort(tri).forEach(v => $('#ch-f-loc').appendChild(new Option(v, v)));
    [...new Set(acts.map(a => a.acteur))].sort(tri).forEach(v => $('#ch-f-act').appendChild(new Option(v, v)));

    const synth = $('#ch-synth');
    Object.keys(LIB_FILTRE).forEach(f => {
      const b = el('button', 'ch-cnt', `${forme(f)}<span class="ch-cnt__n">0</span><span class="ch-cnt__l">${LIB_FILTRE[f]}</span>`);
      b.type = 'button';
      b.dataset.f = f;
      b.dataset.etat = f;
      b.setAttribute('aria-pressed', 'false');
      synth.appendChild(b);
    });
  }

  /* ===== Mise à jour ===== */
  function update() {
    const app = $('#chrono-app');
    PROPS.forEach(p => app.classList.toggle('f-' + p.id, F[p.id]));

    CACHE = {};
    D.groupes.forEach(g => {
      const kids = g.activites.map(calcActivite);
      kids.forEach(k => { CACHE[k.a.code] = k; });
      CACHE[g.code] = calcGroupe(g, kids);
    });

    D.groupes.forEach(g => g.activites.forEach(a => majActivite(CACHE[a.code], REF[a.code])));
    D.groupes.forEach(g => majGroupe(CACHE[g.code], REF[g.code]));
    majVisibilite();

    $('#ch-h-cal').textContent = F.P9 ? 'Calendaire' : 'Avancement';
    majLegende();
    const propose = PROPS.every(p => F[p.id]);
    $$('#ch-vue button').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.vue === 'propose') === propose)));

    if (survol) afficherTip(survol, dernierX, dernierY);
  }

  function majActivite(k, E) {
    const L0 = x0(k.dp), L1 = x1(k.fp);
    E.bar.style.left = L0 + '%';
    E.bar.style.width = (L1 - L0) + '%';
    E.bar.dataset.etat = F.P6 ? k.etat : 'base';
    E.bar.dataset.suivi = F.P2 ? k.suivi : 'suivi';
    E.fill.style.width = Math.min(k.aff, 100) + '%';   // le remplissage suit exactement le % affiché

    // Débordement hachuré (P2), remplacé par la barre réelle quand P4 est active
    const stubOn = F.P2 && !F.P4 && k.deborde;
    E.stub.classList.toggle('is-on', stubOn);
    E.stub.style.left = L1 + '%';
    E.stub.style.width = (k.deborde ? x1(k.r.fin) - L1 : 0) + '%';

    // Période réelle (P4)
    if (k.r) {
      const r0 = x0(k.r.deb), r1 = x1(k.r.fin);
      E.real.style.left = r0 + '%';
      E.real.style.width = (r1 - r0) + '%';
      E.over.style.width = (k.deborde ? (r1 - L1) / (r1 - r0) * 100 : 0) + '%';
    }
    E.real.classList.toggle('is-on', F.P4 && !!k.r);

    // Forme d'état (P6) et retard en jours (P3), placés après la barre
    const ancre = stubOn ? x1(k.r.fin) : L1;
    if (ancre > 92) {
      E.after.classList.add('is-flip');
      E.after.style.left = 'auto';
      E.after.style.right = (100 - L0) + '%';
    } else {
      E.after.classList.remove('is-flip');
      E.after.style.right = 'auto';
      E.after.style.left = ancre + '%';
    }
    E.mk.innerHTML = forme(k.etat);
    E.delay.textContent = F.P3 && k.retard > 0 ? `+${jours(k.retard)}` : '';

    // Colonnes
    if (F.P2 && !k.r) {
      E.pct.textContent = k.debute ? 'non suivi' : 'à venir';
      E.pct.classList.add('is-muted');
    } else {
      E.pct.textContent = pct(k.aff);
      E.pct.classList.remove('is-muted');
    }
    E.poids.textContent = k.a.poids;
    E.mini.style.width = Math.min(k.realAff, 100) + '%';
    E.rt.textContent = pct(k.realAff);
    E.realCell.classList.toggle('is-gap', !!k.r && k.aff - k.realAff >= 40);
  }

  function majGroupe(k, E) {
    E.gbar.style.left = x0(k.dp) + '%';
    E.gbar.style.width = (x1(k.fp) - x0(k.dp)) + '%';
    E.fill.style.width = Math.min(k.aff, 100) + '%';
    E.pct.textContent = pct(k.aff);
    E.poids.textContent = k.sp;
    E.mini.style.width = Math.min(k.realAff, 100) + '%';
    E.rt.textContent = pct(k.realAff);
  }

  function majVisibilite() {
    const loc = $('#ch-f-loc').value, act = $('#ch-f-act').value;
    const q = recherche.trim().toLowerCase();
    const base = k => (!loc || k.a.localite === loc) && (!act || k.a.acteur === act)
      && (!q || `${k.a.code} ${k.a.libelle} ${k.a.acteur} ${k.a.localite}`.toLowerCase().includes(q));
    if (!F.P5) filtre = null;

    let total = 0;
    D.groupes.forEach(g => {
      let n = 0;
      g.activites.forEach(a => {
        const k = CACHE[a.code];
        const ok = base(k) && (!filtre || PRED[filtre](k));
        if (ok) n++;
        const voir = ok && !replies.has(g.code);
        REF[a.code].l.hidden = !voir;
        REF[a.code].r.hidden = !voir;
      });
      total += n;
      REF[g.code].l.hidden = REF[g.code].r.hidden = n === 0;
    });
    $('#ch-empty').hidden = total > 0;

    // Bande de synthèse (P5) : compteurs calculés sur les filtres localité / acteur
    const visibles = D.groupes.flatMap(g => g.activites.map(a => CACHE[a.code])).filter(base);
    $$('#ch-synth .ch-cnt').forEach(b => {
      const f = b.dataset.f;
      b.querySelector('.ch-cnt__n').textContent = visibles.filter(PRED[f]).length;
      b.setAttribute('aria-pressed', String(filtre === f));
    });
    $('#ch-synth').classList.toggle('is-filtered', !!filtre);
    $('#ch-synth-note').innerHTML = filtre
      ? `Filtre : <b>${LIB_FILTRE[filtre]}</b> <button type="button" id="ch-clear-f">Retirer</button>`
      : `${visibles.length} activités`;
    $('#ch-synth-wrap').classList.toggle('is-open', F.P5);
  }

  function majLegende() {
    const it = [];
    it.push(`<span class="ch-lg"><span class="ch-sw-bar" data-etat="${F.P6 ? 'conforme' : 'base'}"><i></i></span>Période prévue au PTBA, remplie selon la couverture des relevés</span>`);
    if (F.P6) Object.keys(LIB_ETAT).forEach(e => it.push(`<span class="ch-lg">${forme(e)}${LIB_ETAT[e]}</span>`));
    if (F.P2) {
      it.push('<span class="ch-lg"><span class="ch-sw-bar ch-sw-bar--dash"></span>Aucun relevé</span>');
      it.push('<span class="ch-lg"><span class="ch-sw-bar ch-sw-bar--hatch"></span>Débordement après la fin prévue</span>');
    }
    if (F.P4) it.push(`<span class="ch-lg"><span class="ch-sw-real"></span>Période réelle (${F.P11 ? 'dates de terrain' : 'bornes de trimestre'})</span>`);
    if (F.P7) it.push(`<span class="ch-lg"><span class="ch-sw-today"></span>Aujourd'hui</span>`);
    it.push('<span class="ch-lg"><span class="ch-sw-jalon"></span>Jalon</span>');
    $('#ch-legend').innerHTML = it.join('');
  }

  /* ===== Infobulle (P8 : riche ; sinon libellé seul, comme l'écran actuel) ===== */
  const tip = $('#ch-tip');
  let survol = null, dernierX = 0, dernierY = 0;

  function listeTrimestres(rel) {
    if (!rel.length) return '0';
    const t = rel.map(s => 'T' + s.split('-T')[1]);
    const s = t.length > 1 ? t.slice(0, -1).join(', ') + ' et ' + t[t.length - 1] : t[0];
    return `${rel.length} · ${s} ${rel[0].split('-')[0]}`;
  }
  function ecartTexte(k) {
    if (k.retard > 0) {
      return `<span class="ch-late">+${jours(k.retard)}</span> <span class="ch-dim">· ${k.a.cloturee ? 'clôturée après la fin prévue' : 'échéance dépassée, non clôturée'}</span>`;
    }
    if (k.a.cloturee) {
      const avance = ecart(k.r.fin, k.fp);
      return avance > 0 ? `clôturée ${jours(avance)} avant la fin prévue` : 'clôturée à la date prévue';
    }
    if (!k.debute) return `démarrage prévu dans ${jours(ecart(TODAY, k.dp))}`;
    return `échéance dans ${jours(k.restants)}`;
  }
  const dl = lignes => '<dl>' + lignes.map(([t, v]) => `<dt>${t}</dt><dd>${v}</dd>`).join('') + '</dl>';

  function contenuTip(code) {
    const k = CACHE[code];
    if (!k) return null;

    if (k.grp) {
      const g = k.g;
      if (!F.P8) return { simple: true, html: `${g.code} : ${g.libelle}` };
      const lignes = [
        ['Prévu (agrégé)', `${fd(k.dp)} → ${fd(k.fp)} <span class="ch-dim">· ${jours(k.prevJ)}</span>`],
        ['Avancement', `<b>${pct2(k.exact)}</b> <span class="ch-dim">· ${F.P10 ? 'moyenne pondérée par le poids CL' : 'calcul sur dates agrégées'}</span><br><span class="ch-formule">${k.formule}</span>`]
      ];
      if (F.P9) lignes.push(['Réalisation', `<b>${pct2(k.realExact)}</b> <span class="ch-dim">· ${F.P10 ? 'pondérée' : 'moyenne simple'}</span><br><span class="ch-formule">${k.realFormule}</span>`]);
      lignes.push(['Activités', String(k.kids.length)]);
      return { html: `<div class="ch-tip__h"><span class="ch-num">${g.code}</span>${g.libelle}</div>` + dl(lignes) };
    }

    const a = k.a, r = k.r;
    if (!F.P8) return { simple: true, html: `${a.code} : ${a.libelle}` };
    const formule = r ? (F.P1 ? `${jours(r.j)} ÷ ${jours(k.prevJ)}` : `${jours(k.prevJ)} ÷ ${jours(r.j)}`) : 'aucun relevé';
    const plafond = r && k.aff !== Math.round(k.exact) ? ` · affiché ${pct(k.aff)}` : '';
    const lignes = [
      ['Prévu', `${fd(k.dp)} → ${fd(k.fp)} <span class="ch-dim">· ${jours(k.prevJ)}</span>`],
      ['Réel', r
        ? `${fd(r.deb)} → ${fd(r.fin)} <span class="ch-dim">· ${jours(r.j)}, ${F.P11 ? 'dates de terrain' : 'bornes de trimestre'}</span>`
        : '<span class="ch-dim">aucun relevé validé</span>'],
      ['Responsable', a.acteur],
      ['Localité', a.localite],
      ['Relevés validés', listeTrimestres(a.releves)],
      ['Écart', ecartTexte(k)],
      [F.P1 ? 'Couverture' : 'Ratio affiché', `<b>${pct2(k.exact)}</b> <span class="ch-dim">· ${formule}${plafond}</span>`]
    ];
    if (F.P9) lignes.push(['Réalisation', `${nf0.format(a.qteReelle)} / ${nf0.format(a.qtePrevue)} ${a.unite} · <b>${pct2(k.realExact)}</b>`]);
    if (F.P10) lignes.push(['Poids au cadre logique', `${a.poids} / 100`]);
    return { html: `<div class="ch-tip__h"><span class="ch-num">${a.code}</span>${a.libelle}</div>` + dl(lignes) };
  }

  function afficherTip(code, x, y) {
    const c = contenuTip(code);
    if (!c) return masquerTip();
    tip.className = 'ch-tip is-on' + (c.simple ? ' is-simple' : '');
    tip.innerHTML = c.html;
    placerTip(x, y);
  }
  function placerTip(x, y) {
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let left = x + 16, top = y + 18;
    if (left + w > innerWidth - 8) left = x - 16 - w;
    if (top + h > innerHeight - 8) top = y - 14 - h;
    tip.style.left = Math.max(8, left) + 'px';
    tip.style.top = Math.max(8, top) + 'px';
  }
  function masquerTip() { tip.className = 'ch-tip'; }
  function surligner(code) {
    if (survol && REF[survol]) { REF[survol].l.classList.remove('is-hl'); REF[survol].r.classList.remove('is-hl'); }
    survol = code;
    if (code && REF[code]) { REF[code].l.classList.add('is-hl'); REF[code].r.classList.add('is-hl'); }
  }

  /* ===== Commandes ===== */
  // « Écran actuel » = aucune proposition ; « Écran proposé » = les onze
  function choisirVue(vue) {
    PROPS.forEach(p => { F[p.id] = vue === 'propose'; });
    update();
  }

  /* Thème : clair par défaut comme le reste de l'application, choix mémorisé */
  const CLE_THEME = 'chronogramme_theme';
  function appliquerTheme(theme) {
    document.documentElement.dataset.theme = theme;
    const btn = $('#ch-btn-theme');
    btn.querySelector('i').className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    btn.querySelector('span').textContent = theme === 'dark' ? 'Clair' : 'Sombre';
  }

  /* ===== Défilement horizontal de la frise ===== */
  const SCROLL = $('#ch-tl-scroll');
  const lisse = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

  function majDefilement() {
    const x = SCROLL.scrollLeft, max = SCROLL.scrollWidth - SCROLL.clientWidth;
    $('#ch-thead-track').style.transform = `translateX(${-x}px)`;
    // Le libellé du trimestre coupé par le bord gauche glisse pour rester lisible
    $$('#ch-qrow .ch-q').forEach(q => {
      const s = q.firstElementChild;
      const dx = Math.min(Math.max(0, x - q.offsetLeft), q.offsetWidth - s.offsetWidth);
      s.style.transform = dx > 0 ? `translateX(${dx}px)` : '';
    });
    $('#ch-gantt').classList.toggle('is-scrolled', x > 0);
    $('#ch-nav-prev').disabled = x <= 1;
    $('#ch-nav-next').disabled = x >= max - 1;
  }

  // Place une date à un tiers de la zone visible (le passé récent reste lisible)
  function allerA(t, behavior = lisse()) {
    const x = (x0(t) + x1(t)) / 2 / 100 * SCROLL.scrollWidth;
    SCROLL.scrollTo({ left: x - SCROLL.clientWidth / 3, behavior });
  }

  // Avance ou recule d'un trimestre, calé sur le début du trimestre
  function decaler(sens) {
    const W = SCROLL.scrollWidth;
    const debuts = $$('#ch-qrow .ch-q').map(q => parseFloat(q.style.left) / 100 * W);
    const x = SCROLL.scrollLeft;
    const cible = sens > 0
      ? debuts.find(p => p > x + 2)
      : debuts.filter(p => p < x - 2).pop();
    SCROLL.scrollTo({ left: cible ?? (sens > 0 ? W : 0), behavior: lisse() });
  }

  function brancherEvenements() {
    SCROLL.addEventListener('scroll', () => { majDefilement(); masquerTip(); surligner(null); }, { passive: true });
    new ResizeObserver(majDefilement).observe(SCROLL);
    $('#ch-nav-prev').addEventListener('click', () => decaler(-1));
    $('#ch-nav-next').addEventListener('click', () => decaler(1));
    $('#ch-nav-today').addEventListener('click', () => allerA(TODAY));

    $('#ch-vue').addEventListener('click', e => {
      const b = e.target.closest('[data-vue]');
      if (b) choisirVue(b.dataset.vue);
    });
    $('#ch-q').addEventListener('input', e => { recherche = e.target.value; update(); });
    $('#ch-synth').addEventListener('click', e => {
      const b = e.target.closest('.ch-cnt');
      if (!b) return;
      filtre = filtre === b.dataset.f ? null : b.dataset.f;
      update();
    });
    $('#ch-synth-note').addEventListener('click', e => {
      if (e.target.id === 'ch-clear-f') { filtre = null; update(); }
    });
    $('#ch-f-loc').addEventListener('change', update);
    $('#ch-f-act').addEventListener('change', update);

    // Survol synchronisé tableau / frise + infobulle
    const gantt = $('#ch-gantt');
    gantt.addEventListener('mousemove', e => {
      dernierX = e.clientX;
      dernierY = e.clientY;
      const row = e.target.closest('[data-row]');
      const code = row ? row.dataset.row : null;
      if (code !== survol) {
        surligner(code);
        if (code) afficherTip(code, e.clientX, e.clientY); else masquerTip();
      } else if (code) placerTip(e.clientX, e.clientY);
    });
    gantt.addEventListener('mouseleave', () => { surligner(null); masquerTip(); });
    gantt.addEventListener('focusin', e => {
      const row = e.target.closest('.ch-lrow.is-act');
      if (!row) return;
      const rc = REF[row.dataset.row].bar.getBoundingClientRect();
      surligner(row.dataset.row);
      dernierX = rc.right;
      dernierY = rc.bottom;
      afficherTip(row.dataset.row, rc.right, rc.bottom);
    });
    gantt.addEventListener('focusout', () => { surligner(null); masquerTip(); });
    gantt.addEventListener('click', e => {
      const b = e.target.closest('.ch-caret');
      if (!b) return;
      const g = b.dataset.g;
      if (replies.has(g)) replies.delete(g); else replies.add(g);
      b.setAttribute('aria-expanded', String(!replies.has(g)));
      b.setAttribute('aria-label', (replies.has(g) ? 'Déplier ' : 'Replier ') + g);
      update();
    });

    $('#ch-btn-theme').addEventListener('click', () => {
      const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      appliquerTheme(theme);
      try { localStorage.setItem(CLE_THEME, theme); } catch (_) { /* stockage indisponible */ }
    });
  }

  /* ===== Initialisation ===== */
  let themeInitial = 'light';
  try { themeInitial = localStorage.getItem(CLE_THEME) || 'light'; } catch (_) { /* stockage indisponible */ }

  construireFrise();
  construireLignes();
  construireEntete();
  brancherEvenements();
  appliquerTheme(themeInitial);
  update();
  allerA(TODAY, 'auto');
  majDefilement();
})();
