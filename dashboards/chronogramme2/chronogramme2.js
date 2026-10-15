/* =========================================================
   CHRONOGRAMME — Option B · Écran cible
   Dépend de CHRONO_DATA (data.js). Dates manipulées en UTC, au jour près.
   Positions sur la frise en % de sa largeur : le zoom ne change que --tl-w.
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

  /* ===== Dates et formats ===== */
  const JOUR = 86400000;
  const d = s => { const [y, m, j] = s.split('-').map(Number); return Date.UTC(y, m - 1, j); };
  const TODAY = d(D.dateReference);
  const T_DEB = d(D.debutFrise), T_FIN = d(D.finFrise);
  const SPAN = (T_FIN - T_DEB) / JOUR + 1;
  const ecart = (a, b) => Math.round((b - a) / JOUR);
  const duree = (a, b) => ecart(a, b) + 1;
  const x0 = t => (t - T_DEB) / JOUR / SPAN * 100;
  const x1 = t => ((t - T_DEB) / JOUR + 1) / SPAN * 100;
  const XT = (x0(TODAY) + x1(TODAY)) / 2;

  const MOIS_C = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  const MOIS_L = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const nf0 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const pct = n => nf0.format(Math.round(n)) + ' %';
  const pct1 = n => nf1.format(n) + ' %';
  const dfmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const fd = t => dfmt.format(new Date(t)).replace(/^1 /, '1er ');
  const fdc = t => fd(t).replace(/ \d{4}$/, '');
  const fmois = t => { const x = new Date(t); return `${MOIS_L[x.getUTCMonth()]} ${x.getUTCFullYear()}`; };
  const jours = n => `${n} j`;
  const signe = n => (n > 0 ? '+' : n < 0 ? '−' : '') + jours(Math.abs(n));
  const iso = t => new Date(t).toISOString().slice(0, 10);

  /* ===== États et formes ===== */
  const LIB_ETAT = { retard: 'En retard', sansSuivi: 'Sans suivi', echeance: 'Échéance sous 30 j', conforme: 'En cours', cloturee: 'Clôturée', avenir: 'À venir' };
  const SVG = {
    conforme:  '<svg viewBox="0 0 14 14"><circle cx="7" cy="7" r="5.6"/></svg>',
    retard:    '<svg viewBox="0 0 14 14"><path d="M7 1 L13.4 12.6 L0.6 12.6 Z"/></svg>',
    echeance:  '<svg viewBox="0 0 14 14"><rect x="1.8" y="1.8" width="10.4" height="10.4"/></svg>',
    sansSuivi: '<svg viewBox="0 0 14 14"><path class="s" d="M2.4 2.4 L11.6 11.6 M11.6 2.4 L2.4 11.6"/></svg>',
    cloturee:  '<svg viewBox="0 0 14 14"><path class="s" d="M1.8 7.6 L5.4 11.2 L12.2 2.8"/></svg>',
    avenir:    '<svg viewBox="0 0 14 14"><circle class="s" cx="7" cy="7" r="5" style="stroke-width:2.2"/></svg>',
    tous:      '<svg viewBox="0 0 14 14"><rect x="1" y="2" width="12" height="2.6" rx="1"/><rect x="1" y="5.7" width="8" height="2.6" rx="1"/><rect x="1" y="9.4" width="10" height="2.6" rx="1"/></svg>'
  };
  const forme = etat => `<span class="g2-shape" data-etat="${etat}" aria-hidden="true">${SVG[etat]}</span>`;

  /* ===== Calculs (données figées : une seule passe) ===== */
  function calcActivite(a, g) {
    const dp = d(a.debutPrevu), fp = d(a.finPrevue), prevJ = duree(dp, fp);
    let cum = 0;
    const rel = a.releves.map(r => { cum += r.qte; return { ...r, t: d(r.date), cum }; });
    const qr = cum, hasRel = rel.length > 0;
    const deb = hasRel ? d(a.debutReel) : null;
    const last = hasRel ? rel[rel.length - 1].t : null;
    const fin = a.cloturee ? d(a.finReel) : last;          // fin documentée
    const realExact = qr / a.qtePrevue * 100;
    const debute = dp <= TODAY, echu = fp < TODAY, restants = ecart(TODAY, fp);
    const attendu = a.cloturee ? 100 : Math.min(100, Math.max(0, (ecart(dp, TODAY) + 1) / prevJ * 100));

    let ecartJ = null, ecartType;
    if (a.cloturee) { ecartJ = ecart(fp, fin); ecartType = 'clos'; }
    else if (echu) { ecartJ = ecart(fp, TODAY); ecartType = 'echu'; }
    else ecartType = debute ? 'reste' : 'avenir';

    let etat;
    if (a.cloturee) etat = 'cloturee';
    else if (echu) etat = 'retard';
    else if (!hasRel && debute) etat = 'sansSuivi';
    else if (restants <= 30) etat = 'echeance';
    else if (!debute) etat = 'avenir';
    else etat = 'conforme';

    // Projection : le rythme observé (quantités / jours entre début réel et dernier relevé) se prolonge
    let proj = null;
    if (!a.cloturee && hasRel && qr < a.qtePrevue) {
      const rythme = qr / duree(deb, last);
      const finP = last + Math.ceil((a.qtePrevue - qr) / rythme) * JOUR;
      proj = { fin: finP, ecart: ecart(fp, finP), rythme };
    }

    const gap = attendu - realExact;
    let ton;
    if (a.cloturee) ton = 'done';
    else if (!debute) ton = 'none';
    else ton = gap >= 30 ? 'bad' : gap >= 15 ? 'warn' : 'ok';

    return { a, g, dp, fp, prevJ, rel, qr, hasRel, deb, last, fin, realExact, attendu, debute, echu, restants,
             ecartJ, ecartType, etat, proj, gap, ton };
  }

  const K = {};
  const GRP = {};
  D.groupes.forEach(g => {
    const kids = g.activites.map(a => calcActivite(a, g));
    kids.forEach(k => { K[k.a.code] = k; });
    const sp = kids.reduce((s, k) => s + k.a.poids, 0);
    const real = kids.reduce((s, k) => s + k.realExact * k.a.poids, 0) / sp;
    const attendu = kids.reduce((s, k) => s + k.attendu * k.a.poids, 0) / sp;
    const gap = attendu - real;
    GRP[g.code] = {
      g, kids, sp, real, attendu,
      dp: Math.min(...kids.map(k => k.dp)), fp: Math.max(...kids.map(k => k.fp)),
      ton: gap >= 30 ? 'bad' : gap >= 15 ? 'warn' : 'ok',
      formuleReal: `(${kids.map(k => `${nf1.format(k.realExact)}×${k.a.poids}`).join(' + ')}) ÷ ${sp}`
    };
  });
  const ACTS = D.groupes.flatMap(g => g.activites.map(a => K[a.code]));
  // Composante : moyenne des résultats (même poids pour chaque résultat)
  const COMPO = {
    real: Object.values(GRP).reduce((s, x) => s + x.real, 0) / D.groupes.length,
    attendu: Object.values(GRP).reduce((s, x) => s + x.attendu, 0) / D.groupes.length
  };

  const FILTRES = {
    tous:      { lib: 'Toutes les activités', pred: () => true },
    retard:    { lib: 'En retard', pred: k => !k.a.cloturee && k.echu },
    sansSuivi: { lib: 'Sans suivi', pred: k => k.debute && !k.hasRel },
    echeance:  { lib: 'Échéance sous 30 j', pred: k => !k.a.cloturee && k.restants >= 0 && k.restants <= 30 },
    cloturee:  { lib: 'Clôturées', pred: k => k.a.cloturee }
  };

  /* ===== État de l'interface ===== */
  const state = { zoom: 'mois', filtre: 'tous', q: '', loc: '', act: '', replies: new Set(), sel: null, tiroir: false };
  const REF = {};

  /* ===== Construction ===== */
  function construireEntete() {
    $('#g2-ptba').textContent = D.projet.ptba;
    $('#g2-sub').textContent = `${D.projet.sigle} · ${D.projet.composante} · situation au ${fd(TODAY)}`;

    const kpi = $('#g2-kpi');
    kpi.dataset.etat = 'tous';
    kpi.innerHTML = `<span class="g2-kpi__value">${pct(COMPO.real)}</span>`
      + `<span class="g2-kpi__label"><b>Réalisé, pondéré par le cadre logique</b> · attendu à date ${pct(COMPO.attendu)}</span>`
      + `<span class="g2-bullet" data-tone="${COMPO.attendu - COMPO.real >= 30 ? 'bad' : COMPO.attendu - COMPO.real >= 15 ? 'warn' : 'ok'}"`
      + ` title="Remplissage : réalisé ${pct1(COMPO.real)} · repère : attendu ${pct1(COMPO.attendu)}">`
      + `<i style="width:${Math.min(COMPO.real, 100)}%"></i><b style="left:${Math.min(COMPO.attendu, 100)}%"></b></span>`;

    const health = $('.g2-health');
    Object.keys(FILTRES).forEach(f => {
      const b = el('button', 'g2-filter', `${forme(f)}<span class="g2-filter__n">0</span><span class="g2-filter__l">${FILTRES[f].lib}</span>`);
      b.type = 'button';
      b.dataset.f = f;
      b.dataset.etat = f;
      b.setAttribute('aria-pressed', String(f === 'tous'));
      health.appendChild(b);
    });

    const tri = (a, b) => a.localeCompare(b, 'fr');
    [...new Set(ACTS.map(k => k.a.localite))].sort(tri).forEach(v => $('#g2-f-loc').appendChild(new Option(v, v)));
    [...new Set(ACTS.map(k => k.a.acteur))].sort(tri).forEach(v => $('#g2-f-act').appendChild(new Option(v, v)));

    $('#g2-legend-etats').innerHTML = ['retard', 'sansSuivi', 'echeance', 'conforme', 'cloturee', 'avenir']
      .map(e => `<span class="g2-lg">${forme(e)}${LIB_ETAT[e]}</span>`).join('');
  }

  function construireJalons() {
    D.jalons.forEach(j => {
      const t = d(j.date);
      const div = el('div', 'g2-jalon', `<i></i><span>${j.libelle} · ${fdc(t)}</span>`);
      div.dataset.x = (x0(t) + x1(t)) / 2;
      div.style.left = `calc(${div.dataset.x}% - 6px)`;
      div.title = `${j.libelle} — ${fd(t)}`;
      $('#g2-jal').appendChild(div);
    });
  }

  // Chaque libellé s'arrête avant le jalon suivant (ou le bord de la frise), tronqué au besoin
  function placerJalons(W) {
    const items = $$('#g2-jal .g2-jalon').sort((a, b) => a.dataset.x - b.dataset.x);
    items.forEach((it, i) => {
      const x = it.dataset.x / 100 * W;
      const limite = i < items.length - 1 ? items[i + 1].dataset.x / 100 * W - 16 : W - 6;
      const place = limite - x - 14;
      const span = it.querySelector('span');
      span.style.maxWidth = Math.max(0, place) + 'px';
      span.hidden = place < 40;
    });
  }

  function texteEcart(k) {
    if (k.ecartType === 'clos') return { txt: k.ecartJ === 0 ? 'à date' : signe(k.ecartJ), cls: k.ecartJ > 0 ? 'is-late' : 'is-early' };
    if (k.ecartType === 'echu') return { txt: signe(k.ecartJ), cls: 'is-late' };
    if (k.ecartType === 'reste') return { txt: `reste ${jours(k.restants)}`, cls: 'is-rest' };
    return { txt: `dans ${jours(ecart(TODAY, k.dp))}`, cls: 'is-rest' };
  }
  const puce = (real, attendu, ton) =>
    `<span class="g2-bullet" data-tone="${ton}"><i style="width:${Math.min(real, 100)}%"></i><b style="left:${Math.min(attendu, 100)}%"></b></span>`;
  const pos = (l, r) => `left:${l}%;width:${Math.max(r - l, 0)}%`;

  function ligneActivite(k) {
    const a = k.a;
    const row = el('div', 'g2-row is-act');
    row.dataset.row = a.code;
    row.dataset.etat = k.etat;
    if (k.proj) row.dataset.proj = k.proj.ecart > 0 ? 'tard' : 'ok';
    const e = texteEcart(k);

    const left = `<div class="g2-left">`
      + `<span class="g2-code">${forme(k.etat)}<span>${a.code}</span></span>`
      + `<span class="g2-lib"><span class="g2-lib-t">${a.libelle}</span><span class="g2-lib-s">${a.acteur} · ${a.localite}</span></span>`
      + `<span class="g2-ecart ${e.cls}">${e.txt}</span>`
      + `<span class="g2-av">${puce(k.realExact, k.attendu, k.ton)}<span class="g2-pct">${pct(k.realExact)}</span></span>`
      + `</div>`;

    let t = `<div class="g2-base" style="${pos(x0(k.dp), x1(k.fp))}"></div>`;
    let finTrace = x1(k.fp);
    if (k.hasRel) {
      const l = x0(k.deb), r = x1(k.fin);
      const ticks = k.rel
        .map(rv => (x1(rv.t) - l) / (r - l) * 100)
        .filter(p => p < 99.5)
        .map(p => `<span class="g2-tick" style="left:${p}%"></span>`).join('');
      t += `<div class="g2-act" style="${pos(l, r)}"><div class="g2-fill" style="width:${Math.min(k.realExact, 100)}%"></div>${ticks}</div>`;
      finTrace = Math.max(finTrace, r);
      if (!a.cloturee && k.last < TODAY) {
        t += `<div class="g2-stale" style="${pos(r, XT)}"></div>`;
        finTrace = Math.max(finTrace, XT);
      }
    } else if (k.debute) {
      t += `<div class="g2-ghost" style="${pos(x0(k.dp), x1(k.fp))}"></div>`;
    }

    let finProj = finTrace;
    if (k.proj) {
      const debP = Math.max(XT, x1(k.last));
      if (k.proj.fin > T_FIN) {
        t += `<div class="g2-proj" style="${pos(debP, 100)}"></div>`
          + `<span class="g2-proj-out"><i class="fas fa-arrow-right"></i>${fmois(k.proj.fin)}</span>`;
        finProj = 100;
      } else {
        const xp = x1(k.proj.fin);
        t += `<div class="g2-proj" style="${pos(debP, xp)}"></div><span class="g2-proj-end" style="left:${xp}%"></span>`;
        finProj = Math.max(finTrace, xp + 0.6);
      }
    }

    if ((k.ecartType === 'echu') || (k.ecartType === 'clos' && k.ecartJ > 0)) {
      t += `<span class="g2-tag" style="--tag-base:${finTrace}%;--tag-proj:${finProj}%">${signe(k.ecartJ)}</span>`;
    }

    row.innerHTML = left + `<div class="g2-track">${t}</div>`;
    return row;
  }

  function ligneGroupe(x) {
    const g = x.g;
    const row = el('div', 'g2-row is-grp');
    row.dataset.row = g.code;
    const comptes = ['retard', 'sansSuivi', 'echeance', 'conforme', 'cloturee', 'avenir']
      .map(e => [e, x.kids.filter(k => k.etat === e).length])
      .filter(([, n]) => n > 0)
      .map(([e, n]) => `<span class="g2-count" title="${LIB_ETAT[e]}">${forme(e)}${n}</span>`).join('');
    row.innerHTML = `<div class="g2-left">`
      + `<span class="g2-code"><button class="g2-caret" type="button" aria-expanded="true" aria-label="Replier ${g.code}"><i class="fas fa-caret-down"></i></button>${g.code}</span>`
      + `<span class="g2-lib"><span class="g2-lib-t">${g.libelle}</span><span class="g2-lib-s">${comptes}</span></span>`
      + `<span class="g2-ecart"></span>`
      + `<span class="g2-av">${puce(x.real, x.attendu, 'group')}<span class="g2-pct">${pct(x.real)}</span></span>`
      + `</div><div class="g2-track"><div class="g2-sum" style="${pos(x0(x.dp), x1(x.fp))}"><div class="g2-fill" style="width:${Math.min(x.real, 100)}%"></div></div></div>`;
    return row;
  }

  function construireLignes() {
    const host = $('#g2-rows');
    D.groupes.forEach(g => {
      const rg = ligneGroupe(GRP[g.code]);
      host.appendChild(rg);
      REF[g.code] = { row: rg, grp: true };
      g.activites.forEach(a => {
        const r = ligneActivite(K[a.code]);
        host.appendChild(r);
        REF[a.code] = { row: r, grp: false, g: g.code };
      });
    });
  }

  /* ===== Échelle de temps (reconstruite au zoom) ===== */
  function largeurGauche() { return $('.g2-head .g2-left').getBoundingClientRect().width; }
  function largeurFrise() {
    const dispo = $('#g2-scroll').clientWidth - largeurGauche() - 2;
    const ppd = { fit: 1.3, mois: 4.93, semaine: 11 }[state.zoom];   // mois ≈ 150 px, comme les options A et D
    return Math.max(dispo, SPAN * ppd);
  }

  function isoSemaine(t) {
    const jour = (new Date(t).getUTCDay() + 6) % 7;
    const jeudi = t + (3 - jour) * JOUR;
    const an = new Date(jeudi).getUTCFullYear();
    const jan4 = Date.UTC(an, 0, 4);
    const lundiS1 = jan4 - ((new Date(jan4).getUTCDay() + 6) % 7) * JOUR;
    return 1 + Math.round((t - jour * JOUR - lundiS1) / (7 * JOUR));
  }

  function construireEchelle(W) {
    const ppd = W / SPAN;
    const head = $('#g2-head-track'), overlay = $('#g2-overlay');
    head.innerHTML = '';
    overlay.innerHTML = '';
    const top = el('div', 'g2-lane g2-lane--top'), bot = el('div', 'g2-lane g2-lane--bot');
    const cell = (lane, a, b, txt) => {
      const c = el('div', 'g2-cell', txt);
      c.style.left = x0(a) + '%';
      c.style.width = (x1(b) - x0(a)) + '%';
      lane.appendChild(c);
    };
    const ligne = (t, cls) => { const g = el('div', 'g2-gl ' + cls); g.style.left = x0(t) + '%'; overlay.appendChild(g); };
    const semaine = state.zoom === 'semaine';

    const deb = new Date(T_DEB), fin = new Date(T_FIN);
    const nbMois = (fin.getUTCFullYear() - deb.getUTCFullYear()) * 12 + fin.getUTCMonth() - deb.getUTCMonth() + 1;
    for (let i = 0; i < nbMois; i++) {
      const y = deb.getUTCFullYear() + Math.floor((deb.getUTCMonth() + i) / 12), m = (deb.getUTCMonth() + i) % 12;
      const a = Date.UTC(y, m, 1), b = Date.UTC(y, m + 1, 0);
      if (semaine) {
        cell(top, a, b, `${MOIS_L[m]} ${y}`);
      } else {
        cell(bot, a, b, ppd * 30 >= 40 ? MOIS_L[m] : MOIS_C[m]);
        if (m % 3 === 0) cell(top, a, Date.UTC(y, m + 3, 0), `T${m / 3 + 1} ${y}`);
      }
      if (i > 0) ligne(a, 'g2-gl' + (m === 0 ? '--y' : (m % 3 === 0 || semaine) ? '--q' : ''));
    }
    if (semaine) {
      const j = (deb.getUTCDay() + 6) % 7;
      for (let lundi = T_DEB - j * JOUR; lundi <= T_FIN; lundi += 7 * JOUR) {
        const a = Math.max(lundi, T_DEB), b = Math.min(lundi + 6 * JOUR, T_FIN);
        cell(bot, a, b, 'S' + isoSemaine(lundi));
        if (lundi > T_DEB) ligne(lundi, 'g2-gl--w');
      }
    }
    const pill = el('div', 'g2-today-pill', `Aujourd'hui · ${fdc(TODAY)}`);
    pill.style.left = XT + '%';
    head.append(top, bot, pill);
  }

  function mettreEnPage() {
    const W = largeurFrise();
    $('#g2-grid').style.setProperty('--tl-w', W + 'px');
    construireEchelle(W);
    placerJalons(W);
  }

  function allerAujourdhui(behavior = 'smooth') {
    const sc = $('#g2-scroll');
    const vis = sc.clientWidth - largeurGauche();
    sc.scrollTo({ left: Math.max(0, XT / 100 * largeurFrise() - vis / 2), behavior });
  }

  /* ===== Filtres ===== */
  function correspond(k) {
    const q = state.q.trim().toLowerCase();
    return (!state.loc || k.a.localite === state.loc)
      && (!state.act || k.a.acteur === state.act)
      && (!q || `${k.a.code} ${k.a.libelle} ${k.a.acteur} ${k.a.localite}`.toLowerCase().includes(q));
  }

  function appliquerFiltres() {
    const base = ACTS.filter(correspond);
    $$('.g2-filter').forEach(b => {
      const f = b.dataset.f;
      b.querySelector('.g2-filter__n').textContent = base.filter(FILTRES[f].pred).length;
      b.setAttribute('aria-pressed', String(state.filtre === f));
    });

    let total = 0;
    D.groupes.forEach(g => {
      let n = 0;
      g.activites.forEach(a => {
        const k = K[a.code];
        const ok = correspond(k) && FILTRES[state.filtre].pred(k);
        if (ok) n++;
        REF[a.code].row.hidden = !ok || state.replies.has(g.code);
      });
      total += n;
      REF[g.code].row.hidden = n === 0;
      const caret = REF[g.code].row.querySelector('.g2-caret');
      const replie = state.replies.has(g.code);
      caret.setAttribute('aria-expanded', String(!replie));
      caret.setAttribute('aria-label', (replie ? 'Déplier ' : 'Replier ') + g.code);
    });
    $('#g2-empty').hidden = total > 0;
    const tout = state.replies.size === D.groupes.length;
    $('#g2-btn-fold span').textContent = tout ? 'Tout déplier' : 'Tout replier';
    $('#g2-btn-fold i').className = tout ? 'fas fa-expand' : 'fas fa-compress';
  }

  const lignesVisibles = () => ACTS.map(k => k.a.code).filter(c => !REF[c].row.hidden);

  /* ===== Infobulle ===== */
  const tip = $('#g2-tip');
  let survol = null;

  function contenuTip(code) {
    if (REF[code].grp) {
      const x = GRP[code];
      return `<div class="g2-tip__h"><span class="g2-mono">${code}</span>${x.g.libelle}</div><dl>`
        + `<dt>Prévu</dt><dd>${fd(x.dp)} → ${fd(x.fp)}</dd>`
        + `<dt>Réalisé pondéré</dt><dd><b>${pct1(x.real)}</b></dd>`
        + `<dt>Calcul</dt><dd class="g2-mono">${x.formuleReal}</dd>`
        + `<dt>Attendu à date</dt><dd>${pct1(x.attendu)}</dd></dl>`;
    }
    const k = K[code], a = k.a, e = texteEcart(k);
    return `<div class="g2-tip__h"><span class="g2-mono">${a.code}</span>${a.libelle}</div><dl>`
      + `<dt>Prévu</dt><dd>${fd(k.dp)} → ${fd(k.fp)}</dd>`
      + `<dt>Réel</dt><dd>${k.hasRel ? `${fd(k.deb)} → ${a.cloturee ? fd(k.fin) : 'en cours'}` : 'aucun relevé validé'}</dd>`
      + `<dt>Réalisé</dt><dd><b>${nf0.format(k.qr)} / ${nf0.format(a.qtePrevue)} ${a.unite}</b> · ${pct1(k.realExact)}</dd>`
      + `<dt>Écart</dt><dd>${e.txt}</dd>`
      + (k.proj ? `<dt>Fin projetée</dt><dd>${fd(k.proj.fin)} (${signe(k.proj.ecart)})</dd>` : '')
      + `</dl><div class="g2-tip__foot">Cliquer pour le détail</div>`;
  }
  function placerTip(x, y) {
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let left = x + 16, top = y + 18;
    if (left + w > innerWidth - 8) left = x - 16 - w;
    if (top + h > innerHeight - 8) top = y - 14 - h;
    tip.style.left = Math.max(8, left) + 'px';
    tip.style.top = Math.max(8, top) + 'px';
  }
  function surligner(code) {
    if (survol && REF[survol]) REF[survol].row.classList.remove('is-hl');
    survol = code;
    if (code && REF[code]) REF[code].row.classList.add('is-hl');
  }

  /* ===== Panneau de détail ===== */
  function courbe(k) {
    const a = k.a, W = 400, H = 200, m = { l: 50, r: 14, t: 12, b: 32 };
    const xa = Math.min(k.dp, k.deb ?? k.dp);
    let xb = Math.max(k.fp, TODAY, k.fin ?? k.fp);
    const projVisible = k.proj && k.proj.fin <= xb + 150 * JOUR;
    if (projVisible) xb = Math.max(xb, k.proj.fin);
    const X = t => m.l + (t - xa) / (xb - xa) * (W - m.l - m.r);
    const Y = v => m.t + (1 - Math.min(v, 100) / 100) * (H - m.t - m.b);

    let s = `<svg class="g2-curve" viewBox="0 0 ${W} ${H}" role="img" aria-label="Courbe d'avancement : réalisé ${pct1(k.realExact)}, attendu ${pct1(k.attendu)}">`;
    [0, 50, 100].forEach(v => {
      s += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}" style="stroke:var(--g-rule);stroke-width:1"/>`
        + `<text x="${m.l - 8}" y="${Y(v) + 5}" text-anchor="end">${v} %</text>`;
    });
    s += `<text x="${m.l}" y="${H - 8}">${fmois(xa)}</text><text x="${W - m.r}" y="${H - 8}" text-anchor="end">${fmois(xb)}</text>`;
    if (TODAY >= xa && TODAY <= xb) {
      s += `<line x1="${X(TODAY)}" x2="${X(TODAY)}" y1="${m.t}" y2="${H - m.b}" style="stroke:var(--g-ink);stroke-width:1.5"/>`;
    }
    s += `<line x1="${X(k.dp)}" y1="${Y(0)}" x2="${X(k.fp)}" y2="${Y(100)}" style="stroke:var(--g-base);stroke-width:2;stroke-dasharray:6 4"/>`;
    if (k.hasRel) {
      let p = `M${X(k.deb)},${Y(0)}`, prev = 0, pts = '';
      k.rel.forEach(r => {
        const v = r.cum / a.qtePrevue * 100;
        p += ` L${X(r.t)},${Y(prev)} L${X(r.t)},${Y(v)}`;
        pts += `<circle cx="${X(r.t)}" cy="${Y(v)}" r="3.5" style="fill:var(--c)"/>`;
        prev = v;
      });
      if (!a.cloturee && k.last < TODAY) {
        s += `<line x1="${X(k.last)}" y1="${Y(prev)}" x2="${X(TODAY)}" y2="${Y(prev)}" style="stroke:var(--c);stroke-width:2;stroke-dasharray:2 4;opacity:.7"/>`;
      }
      if (projVisible) {
        s += `<line x1="${X(k.last)}" y1="${Y(prev)}" x2="${X(k.proj.fin)}" y2="${Y(100)}" style="stroke:var(--g-slate);stroke-width:2;stroke-dasharray:2 4"/>`
          + `<circle cx="${X(k.proj.fin)}" cy="${Y(100)}" r="5" style="fill:var(--g-surface);stroke:var(--g-slate);stroke-width:2"/>`;
      }
      s += `<path d="${p}" style="fill:none;stroke:var(--c);stroke-width:2.5;stroke-linejoin:round"/>` + pts;
    }
    return s + '</svg>';
  }

  function pointsAttention(k) {
    const a = k.a, pts = [];
    if (k.ecartType === 'echu') pts.push(`Échéance dépassée de <b>${jours(k.ecartJ)}</b> sans clôture.`);
    if (k.ecartType === 'clos' && k.ecartJ > 0) pts.push(`Clôturée <b>${jours(k.ecartJ)}</b> après la fin prévue.`);
    if (!k.hasRel && k.debute) pts.push(`Démarrage prévu il y a <b>${jours(ecart(k.dp, TODAY))}</b>, aucun relevé validé depuis.`);
    if (k.hasRel && !a.cloturee && k.gap >= 30) pts.push(`<b>${pct(k.attendu)}</b> du calendrier écoulé pour <b>${pct(k.realExact)}</b> des quantités réalisées.`);
    if (k.hasRel && !a.cloturee && ecart(k.last, TODAY) > 60) pts.push(`Dernier relevé il y a <b>${jours(ecart(k.last, TODAY))}</b> : la situation réelle n'est pas documentée depuis.`);
    if (k.proj && k.proj.ecart > 0) pts.push(`Au rythme observé, fin estimée le <b>${fd(k.proj.fin)}</b>, soit ${signe(k.proj.ecart)} après la fin prévue.`);
    return pts;
  }

  function remplirTiroir(code) {
    const k = K[code], a = k.a, e = texteEcart(k);
    $('#g2-drawer-title').innerHTML = `<span class="g2-status" data-etat="${k.etat}">${forme(k.etat)}${LIB_ETAT[k.etat]}<span class="g2-code-txt">· ${a.code}</span></span>`
      + `<h2>${a.libelle}</h2><p class="g2-drawer__meta">${k.g.code} ${k.g.libelle}<br>${a.acteur} · ${a.localite}</p>`;

    const pts = pointsAttention(k);
    let projTxt;
    if (k.proj) projTxt = `${fd(k.proj.fin)} · ${signe(k.proj.ecart)} par rapport à la fin prévue`;
    else if (a.cloturee) projTxt = 'activité clôturée';
    else if (k.hasRel) projTxt = 'quantité prévue atteinte';
    else projTxt = 'impossible sans relevé';

    const body = $('#g2-drawer-body');
    body.dataset.etat = k.etat;
    body.innerHTML =
      (pts.length ? `<section class="g2-sec"><h3>Points d'attention</h3><ul class="g2-note" style="padding-left:18px;display:grid;gap:4px">${pts.map(p => `<li>${p}</li>`).join('')}</ul></section>` : '')
      + `<section class="g2-sec"><h3>Avancement</h3><div class="g2-stats">`
      + `<div class="g2-stat"><div class="g2-stat__v">${pct1(k.realExact)}</div><div class="g2-stat__l">réalisé · ${nf0.format(k.qr)} / ${nf0.format(a.qtePrevue)} ${a.unite}</div></div>`
      + `<div class="g2-stat"><div class="g2-stat__v">${pct1(k.attendu)}</div><div class="g2-stat__l">attendu à date (calendrier écoulé)</div></div>`
      + `<div class="g2-stat"><div class="g2-stat__v ${e.cls}">${e.txt}</div><div class="g2-stat__l">${k.ecartType === 'clos' ? 'écart à la fin prévue' : k.ecartType === 'echu' ? 'retard sur la fin prévue' : k.ecartType === 'reste' ? 'avant la fin prévue' : 'avant le démarrage prévu'}</div></div>`
      + `<div class="g2-stat"><div class="g2-stat__v">${a.poids}<span class="g2-dim" style="font-size:15px"> / 100</span></div><div class="g2-stat__l">poids dans ${k.g.code} (cadre logique)</div></div>`
      + `</div></section>`
      + `<section class="g2-sec"><h3>Calendrier</h3><dl class="g2-dates">`
      + `<dt>Prévu au PTBA</dt><dd>${fd(k.dp)} → ${fd(k.fp)} · ${jours(k.prevJ)}</dd>`
      + `<dt>Réel</dt><dd>${k.hasRel ? `${fd(k.deb)} → ${a.cloturee ? fd(k.fin) : 'en cours'}` : 'non démarré (aucun relevé)'}</dd>`
      + `<dt>Dernier relevé</dt><dd>${k.hasRel ? `${fd(k.last)} · il y a ${jours(ecart(k.last, TODAY))}` : '—'}</dd>`
      + `<dt>Fin projetée</dt><dd>${projTxt}</dd>`
      + `</dl></section>`
      + `<section class="g2-sec"><h3>Courbe d'avancement</h3>${courbe(k)}`
      + `<div class="g2-curve-legend"><span><i></i>Cumul réalisé (relevés)</span><span><i class="is-plan"></i>Plan linéaire</span>${k.proj ? '<span><i class="is-proj"></i>Projection</span>' : ''}</div></section>`
      + `<section class="g2-sec"><h3>Relevés validés</h3>`
      + (k.hasRel
        ? `<table class="g2-table"><thead><tr><th>Période</th><th>Date terrain</th><th class="is-num">Quantité</th><th class="is-num">Cumul</th></tr></thead><tbody>`
          + k.rel.map(r => `<tr><td>${r.periode.replace('-', ' ')}</td><td>${fd(r.t)}</td><td class="is-num">${nf0.format(r.qte)}</td><td class="is-num">${nf0.format(r.cum)} · ${pct(r.cum / a.qtePrevue * 100)}</td></tr>`).join('')
          + `</tbody></table>`
        : `<p class="g2-note">Aucun relevé validé pour cette activité.</p>`)
      + `</section>`;
    const vis = lignesVisibles(), i = vis.indexOf(code);
    $('#g2-prev').disabled = i <= 0;
    $('#g2-next').disabled = i < 0 || i >= vis.length - 1;
  }

  function selectionner(code, ouvrir = true) {
    if (state.sel && REF[state.sel]) REF[state.sel].row.classList.remove('is-sel');
    state.sel = code;
    if (!code) return;
    const row = REF[code].row;
    row.classList.add('is-sel');
    row.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (ouvrir || state.tiroir) ouvrirTiroir(code);
  }
  function ouvrirTiroir(code) {
    remplirTiroir(code);
    state.tiroir = true;
    $('#g2-drawer').classList.add('is-open');
    $('#g2-drawer').setAttribute('aria-hidden', 'false');
    $('#g2-app').classList.add('has-drawer');
  }
  function fermerTiroir() {
    state.tiroir = false;
    $('#g2-drawer').classList.remove('is-open');
    $('#g2-drawer').setAttribute('aria-hidden', 'true');
    $('#g2-app').classList.remove('has-drawer');
  }
  function deplacer(sens) {
    const vis = lignesVisibles();
    if (!vis.length) return;
    const i = vis.indexOf(state.sel);
    const j = i < 0 ? 0 : Math.min(vis.length - 1, Math.max(0, i + sens));
    selectionner(vis[j], false);
  }

  /* ===== Export ===== */
  function exporter() {
    const lignes = [['Résultat', 'Code', 'Activité', 'Acteur', 'Localité', 'Début prévu', 'Fin prévue', 'Début réel',
      'Fin réelle ou dernier relevé', 'Statut', 'Réalisé (%)', 'Attendu (%)', 'Écart (j)', 'Fin projetée', 'Poids CL']];
    // Toutes les activités filtrées, y compris celles des résultats repliés
    ACTS.filter(k => correspond(k) && FILTRES[state.filtre].pred(k)).forEach(k => {
      const a = k.a;
      lignes.push([k.g.code, a.code, a.libelle, a.acteur, a.localite, iso(k.dp), iso(k.fp),
        k.hasRel ? iso(k.deb) : '', k.hasRel ? iso(k.fin) : '', LIB_ETAT[k.etat],
        nf1.format(k.realExact), nf1.format(k.attendu), k.ecartJ ?? '', k.proj ? iso(k.proj.fin) : '', a.poids]);
    });
    const csv = lignes.map(l => l.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const lien = el('a');
    lien.href = url;
    lien.download = `chronogramme-${D.projet.ptba.toLowerCase().replace(/\s+/g, '-')}.csv`;
    document.body.appendChild(lien);
    lien.click();
    lien.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ===== Thème (même clé que l'option A) ===== */
  const CLE_THEME = 'chronogramme_theme';
  function appliquerTheme(theme) {
    document.documentElement.dataset.theme = theme;
    const btn = $('#g2-btn-theme');
    btn.querySelector('i').className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    btn.querySelector('span').textContent = theme === 'dark' ? 'Thème clair' : 'Thème sombre';
  }

  /* ===== Événements ===== */
  function brancher() {
    $('.g2-health').addEventListener('click', e => {
      const b = e.target.closest('.g2-filter');
      if (!b) return;
      state.filtre = state.filtre === b.dataset.f ? 'tous' : b.dataset.f;
      appliquerFiltres();
    });
    $('#g2-q').addEventListener('input', e => { state.q = e.target.value; appliquerFiltres(); });
    $('#g2-f-loc').addEventListener('change', e => { state.loc = e.target.value; appliquerFiltres(); });
    $('#g2-f-act').addEventListener('change', e => { state.act = e.target.value; appliquerFiltres(); });

    $('#g2-zoom').addEventListener('click', e => {
      const b = e.target.closest('[data-zoom]');
      if (!b || b.dataset.zoom === state.zoom) return;
      state.zoom = b.dataset.zoom;
      $$('#g2-zoom button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      mettreEnPage();
      if (state.zoom !== 'fit') setTimeout(allerAujourdhui, 320);
    });
    $('#g2-btn-today').addEventListener('click', () => allerAujourdhui());
    $('#g2-btn-proj').addEventListener('click', e => {
      const on = $('#g2-app').classList.toggle('no-proj');
      e.currentTarget.setAttribute('aria-pressed', String(!on));
    });
    $('#g2-btn-dense').addEventListener('click', e => {
      const on = $('#g2-app').classList.toggle('is-dense');
      e.currentTarget.setAttribute('aria-pressed', String(on));
    });
    $('#g2-btn-fold').addEventListener('click', () => {
      if (state.replies.size === D.groupes.length) state.replies.clear();
      else D.groupes.forEach(g => state.replies.add(g.code));
      appliquerFiltres();
    });

    const body = $('#g2-bodywrap');
    body.addEventListener('mousemove', e => {
      const row = e.target.closest('.g2-row[data-row]');
      const code = row ? row.dataset.row : null;
      if (code !== survol) {
        surligner(code);
        if (code) { tip.innerHTML = contenuTip(code); tip.classList.add('is-on'); }
        else tip.classList.remove('is-on');
      }
      if (code) placerTip(e.clientX, e.clientY);
    });
    body.addEventListener('mouseleave', () => { surligner(null); tip.classList.remove('is-on'); });
    body.addEventListener('click', e => {
      const row = e.target.closest('.g2-row[data-row]');
      if (!row) return;
      tip.classList.remove('is-on');
      const code = row.dataset.row;
      if (REF[code].grp) {
        if (state.replies.has(code)) state.replies.delete(code); else state.replies.add(code);
        appliquerFiltres();
      } else {
        selectionner(code, true);
      }
    });

    $('#g2-drawer-close').addEventListener('click', fermerTiroir);
    $('#g2-prev').addEventListener('click', () => deplacer(-1));
    $('#g2-next').addEventListener('click', () => deplacer(1));
    $('#g2-btn-export').addEventListener('click', exporter);
    $('#g2-btn-theme').addEventListener('click', () => {
      const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      appliquerTheme(theme);
      try { localStorage.setItem(CLE_THEME, theme); } catch (_) { /* stockage indisponible */ }
    });

    document.addEventListener('keydown', e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target.closest && e.target.closest('input, select, textarea')) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); deplacer(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); deplacer(-1); }
      else if (e.key === 'Enter' && state.sel) { ouvrirTiroir(state.sel); }
      else if (e.key === 'Escape' && state.tiroir) { fermerTiroir(); }
      else if (e.key.toLowerCase() === 't') { allerAujourdhui(); }
    });

    let attente = 0;
    new ResizeObserver(() => {
      cancelAnimationFrame(attente);
      attente = requestAnimationFrame(mettreEnPage);
    }).observe($('#g2-scroll'));
  }

  /* ===== Initialisation ===== */
  let themeInitial = 'light';
  try { themeInitial = localStorage.getItem(CLE_THEME) || 'light'; } catch (_) { /* stockage indisponible */ }
  appliquerTheme(themeInitial);
  construireEntete();
  construireJalons();
  construireLignes();
  $('#g2-today').style.left = `calc(var(--left-w) + var(--tl-w) * ${XT / 100})`;
  brancher();
  appliquerFiltres();
  mettreEnPage();
  allerAujourdhui('auto');   // la frise défile à l'horizontale : on l'ouvre sur aujourd'hui
  requestAnimationFrame(() => requestAnimationFrame(() => $('#g2-app').classList.add('is-ready')));
})();
