/* =========================================================
   CHRONOGRAMME — Option C · Timeline épurée
   Dépend de CHRONO_DATA (../chronogramme2/data.js : relevés datés avec quantités).
   Positions sur la frise en % de sa largeur ; l'échelle ne change que --mois-w.
   La page défile verticalement ; seule la frise défile horizontalement.
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
  const jours = n => `${n} j`;

  const deb = new Date(T_DEB), fin = new Date(T_FIN);
  const NB_MOIS = (fin.getUTCFullYear() - deb.getUTCFullYear()) * 12 + fin.getUTCMonth() - deb.getUTCMonth() + 1;
  const MOIS = Array.from({ length: NB_MOIS }, (_, i) => {
    const y = deb.getUTCFullYear() + Math.floor((deb.getUTCMonth() + i) / 12), m = (deb.getUTCMonth() + i) % 12;
    return { y, m, a: Date.UTC(y, m, 1), b: Date.UTC(y, m + 1, 0) };
  });

  /* ===== États et formes ===== */
  const ORDRE_ETATS = ['retard', 'sansSuivi', 'echeance', 'conforme', 'avenir', 'cloturee'];
  const LIB_ETAT = { retard: 'En retard', sansSuivi: 'Sans suivi', echeance: 'Échéance sous 30 j', conforme: 'En cours', avenir: 'À venir', cloturee: 'Clôturée' };
  const SVG = {
    conforme:  '<svg viewBox="0 0 14 14"><circle cx="7" cy="7" r="5.6"/></svg>',
    retard:    '<svg viewBox="0 0 14 14"><path d="M7 1 L13.4 12.6 L0.6 12.6 Z"/></svg>',
    echeance:  '<svg viewBox="0 0 14 14"><rect x="1.8" y="1.8" width="10.4" height="10.4" rx="1.5"/></svg>',
    sansSuivi: '<svg viewBox="0 0 14 14"><path class="s" d="M2.4 2.4 L11.6 11.6 M11.6 2.4 L2.4 11.6"/></svg>',
    cloturee:  '<svg viewBox="0 0 14 14"><path class="s" d="M1.8 7.6 L5.4 11.2 L12.2 2.8"/></svg>',
    avenir:    '<svg viewBox="0 0 14 14"><circle class="s" cx="7" cy="7" r="5" style="stroke-width:2.2"/></svg>'
  };
  const forme = etat => `<span class="c3-shape" data-etat="${etat}" aria-hidden="true">${SVG[etat]}</span>`;

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
      kids,
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

  /* ===== État de l'interface ===== */
  const state = { groupe: 'resultat', echelle: 'mois', q: '', etat: null, replies: new Set(), sel: null };
  const MOIS_W = { trimestre: 56, mois: 150, semaine: 440 };   // largeur d'un mois selon l'échelle
  const SCROLL = $('#c3-scroll'), GANTT = $('#c3-gantt');
  let survol = null;

  /* ===== Synthèse ===== */
  function construireStats() {
    $('#c3-ptba').textContent = D.projet.ptba;
    $('#c3-sub').textContent = `${D.projet.sigle} · ${D.projet.composante} · situation au ${fd(TODAY)}`;
    const n = e => ACTS.filter(k => k.etat === e).length;
    $('#c3-stats').innerHTML = `<div class="c3-stat c3-stat--avc">
        <span class="c3-stat__n">${pct(COMPO.real)}</span>
        <span class="c3-avc">
          <span class="c3-stat__l">Réalisé, pondéré par le cadre logique · attendu à date <b>${pct(COMPO.attendu)}</b></span>
          <span class="c3-avc__bar"><i style="width:${Math.min(COMPO.real, 100)}%"></i><b style="left:${Math.min(COMPO.attendu, 100)}%"></b></span>
        </span>
      </div>`
      + ['retard', 'sansSuivi', 'echeance', 'cloturee'].map(e => `<button class="c3-stat" type="button" data-etat="${e}" data-f="${e}" aria-pressed="false" title="Afficher seulement : ${LIB_ETAT[e]}">
          ${forme(e)}<span><span class="c3-stat__n">${n(e)}</span><br><span class="c3-stat__l">${LIB_ETAT[e]}</span></span></button>`).join('');
  }
  function majStats() {
    $$('#c3-stats [data-f]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.f === state.etat)));
    $('#c3-stats').classList.toggle('is-filtered', !!state.etat);
  }

  /* ===== Échelle (reconstruite au changement d'échelle) ===== */
  function isoSemaine(t) {
    const jour = (new Date(t).getUTCDay() + 6) % 7;
    const an = new Date(t + (3 - jour) * JOUR).getUTCFullYear();
    const jan4 = Date.UTC(an, 0, 4);
    const lundiS1 = jan4 - ((new Date(jan4).getUTCDay() + 6) % 7) * JOUR;
    return 1 + Math.round((t - jour * JOUR - lundiS1) / (7 * JOUR));
  }

  function construireEchelle() {
    const top = $('#c3-lane-top'), bot = $('#c3-lane-bot'), grid = $('#c3-grid');
    top.innerHTML = bot.innerHTML = grid.innerHTML = '';
    const cell = (lane, a, b, txt) => {
      const c = el('div', 'c3-cell', `<span>${txt}</span>`);
      c.style.left = x0(Math.max(a, T_DEB)) + '%';
      c.style.width = (x1(Math.min(b, T_FIN)) - x0(Math.max(a, T_DEB))) + '%';
      lane.appendChild(c);
    };
    const ligne = (t, fort) => {
      if (t <= T_DEB) return;
      const g = el('div', 'c3-gl' + (fort ? ' c3-gl--fort' : ''));
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
      let lundi = T_DEB - ((new Date(T_DEB).getUTCDay() + 6) % 7) * JOUR;
      for (; lundi <= T_FIN; lundi += 7 * JOUR) {
        cell(bot, lundi, lundi + 6 * JOUR, 'S' + isoSemaine(lundi));
        ligne(lundi, false);
      }
    }
    GANTT.style.setProperty('--nb-mois', NB_MOIS);
    GANTT.style.setProperty('--mois-w', MOIS_W[e] + 'px');
  }

  /* ===== Lignes ===== */
  const pos = (l, r) => `left:${l}%;width:${Math.max(r - l, 0)}%`;

  function correspond(k) {
    const q = state.q.trim().toLowerCase();
    return (!state.etat || k.etat === state.etat)
      && (!q || `${k.a.code} ${k.a.libelle} ${k.a.acteur} ${k.a.localite}`.toLowerCase().includes(q));
  }

  function groupes() {
    if (state.groupe === 'resultat') {
      return D.groupes.map(g => ({ id: g.code, entete: `<span class="c3-gcode">${g.code}</span><span class="c3-glib" title="${g.libelle}">${g.libelle}</span>`, x: GRP[g.code], kids: GRP[g.code].kids }));
    }
    return ORDRE_ETATS.map(e => ({ id: 'e-' + e, etat: e, entete: `${forme(e)}<span class="c3-glib">${LIB_ETAT[e]}</span>`, kids: ACTS.filter(k => k.etat === e) }));
  }

  function ligneGauche(k) {
    const r = el('div', 'c3-lrow is-act',
      `<span class="c3-lt" title="${k.a.libelle}">${k.a.libelle}</span>`
      + `<span class="c3-ls">${forme(k.etat)}<span class="c3-mono">${k.a.code}</span>· ${k.a.localite}</span>`);
    r.dataset.row = k.a.code;
    r.tabIndex = 0;
    r.setAttribute('role', 'button');
    r.setAttribute('aria-label', `${k.a.libelle}, ${LIB_ETAT[k.etat]} : afficher le détail`);
    return r;
  }

  function ligneFrise(k) {
    const r = el('div', 'c3-trow is-act');
    r.dataset.row = k.a.code;
    r.dataset.etat = k.etat;
    const l = x0(k.dp), rr = x1(k.fp);
    const suivi = !k.debute ? 'avenir' : (!k.hasRel && !k.a.cloturee ? 'nonsuivi' : 'ok');

    let h = `<div class="c3-plan" data-suivi="${suivi}" style="${pos(l, rr)}">`;
    // Pas de repère « attendu » sur la barre : il tomberait toujours sur la ligne « aujourd'hui »
    if (k.hasRel) h += `<div class="c3-fill" style="width:${Math.min(k.realExact, 100)}%"></div>`;
    h += '</div>';

    // Dépassement de la fin prévue : jusqu'à la clôture réelle, ou jusqu'à aujourd'hui
    let finX = rr;
    const depasse = k.a.cloturee ? (k.finR > k.fp ? k.finR : null) : (k.echu ? TODAY : null);
    if (depasse) { finX = x1(depasse); h += `<div class="c3-over" style="${pos(rr, finX)}"></div>`; }

    const txt = k.hasRel ? `<b>${pct(k.realExact)}</b>` : (k.debute ? 'Aucun relevé' : `Démarre le ${fdc(k.dp)}`);
    const retard = k.ecartType === 'echu' || (k.ecartType === 'clos' && k.ecartJ > 0);
    const badge = retard ? `<span class="c3-late">+${jours(k.ecartJ)}</span>` : '';
    const flip = finX > 90;
    h += `<div class="c3-lbl${flip ? ' is-flip' : ''}" style="${flip ? `right:${100 - l}%` : `left:${finX}%`}"><span>${txt}</span>${badge}</div>`;
    r.innerHTML = h;
    return r;
  }

  function rendre() {
    const L = $('#c3-lrows'), R = $('#c3-trows');
    L.innerHTML = R.innerHTML = '';

    // Jalons
    L.appendChild(el('div', 'c3-lrow is-jal', 'Jalons'));
    const rj = el('div', 'c3-trow is-jal');
    rj.id = 'c3-jal';
    D.jalons.forEach(j => {
      const t = d(j.date);
      const div = el('div', 'c3-jalon', `<i></i><span>${j.libelle} · ${fdc(t)}</span>`);
      div.dataset.x = (x0(t) + x1(t)) / 2;
      div.style.left = `calc(${div.dataset.x}% - 6px)`;
      div.title = `${j.libelle} — ${fd(t)}`;
      rj.appendChild(div);
    });
    R.appendChild(rj);

    let n = 0;
    groupes().forEach(gr => {
      const kids = gr.kids.filter(correspond);
      if (!kids.length) return;
      n += kids.length;
      const ouvert = !state.replies.has(gr.id);
      const val = gr.x ? pct(gr.x.real) : String(kids.length);
      const lg = el('div', 'c3-lrow is-grp',
        `<button class="c3-caret" type="button" data-g="${gr.id}" aria-expanded="${ouvert}" aria-label="${ouvert ? 'Replier' : 'Déplier'} le groupe"><i class="fas fa-chevron-down"></i></button>`
        + gr.entete + `<span class="c3-gval">${val}</span>`);
      if (gr.etat) lg.dataset.etat = gr.etat;
      lg.dataset.row = gr.id;
      const rg = el('div', 'c3-trow is-grp', gr.x
        ? `<div class="c3-sum" style="${pos(x0(gr.x.dp), x1(gr.x.fp))}"><i style="width:${Math.min(gr.x.real, 100)}%"></i></div>`
        : '');
      rg.dataset.row = gr.id;
      L.appendChild(lg);
      R.appendChild(rg);
      if (ouvert) kids.forEach(k => { L.appendChild(ligneGauche(k)); R.appendChild(ligneFrise(k)); });
    });

    $('#c3-count').textContent = n;
    $('#c3-empty').hidden = n > 0;
    if (state.sel) marquerSelection();
    placerJalons();
    majDefilement();
  }

  // Chaque libellé de jalon s'arrête avant le suivant (ou le bord de la frise)
  function placerJalons() {
    const row = $('#c3-jal');
    if (!row) return;
    const W = row.clientWidth;
    const items = $$('#c3-jal .c3-jalon').sort((a, b) => a.dataset.x - b.dataset.x);
    items.forEach((it, i) => {
      const x = it.dataset.x / 100 * W;
      const limite = i < items.length - 1 ? items[i + 1].dataset.x / 100 * W - 16 : W - 6;
      const place = limite - x - 14;
      const span = it.querySelector('span');
      span.style.maxWidth = Math.max(0, place) + 'px';
      span.hidden = place < 40;
    });
  }

  /* ===== Survol et sélection ===== */
  function surligner(code) {
    if (code === survol) return;
    $$('.is-hl').forEach(e => e.classList.remove('is-hl'));
    survol = code;
    if (code) $$(`[data-row="${code}"]`).forEach(e => e.classList.add('is-hl'));
  }
  function marquerSelection() {
    $$('.is-sel').forEach(e => e.classList.remove('is-sel'));
    if (state.sel) $$(`[data-row="${state.sel}"]`).forEach(e => e.classList.add('is-sel'));
  }

  /* ===== Panneau de détail ===== */
  function texteEcart(k) {
    switch (k.ecartType) {
      case 'echu': return `${jours(k.ecartJ)} de retard sur la fin prévue (${fd(k.fp)})`;
      case 'clos': return k.ecartJ > 0 ? `Clôturée ${jours(k.ecartJ)} après la fin prévue`
        : k.ecartJ < 0 ? `Clôturée ${jours(-k.ecartJ)} avant la fin prévue` : 'Clôturée à la date prévue';
      case 'reste': return `Reste ${jours(k.restants)} avant la fin prévue`;
      default: return `Démarrage prévu dans ${jours(ecart(TODAY, k.dp))}`;
    }
  }

  function ouvrirDetail(code) {
    if (state.sel === code) { fermerDetail(); return; }
    state.sel = code;
    const k = K[code], a = k.a;
    const tard = k.ecartType === 'echu' || (k.ecartType === 'clos' && k.ecartJ > 0);
    const reel = !k.hasRel ? '—' : a.cloturee ? `${fd(k.debR)} → ${fd(k.finR)}` : `depuis le ${fd(k.debR)}`;
    const releves = k.rel.length
      ? `<table class="c3-rel"><thead><tr><th>Période</th><th>Date</th><th class="n">Qté</th><th class="n">Cumul</th></tr></thead><tbody>`
        + k.rel.map(r => `<tr><td>${r.periode.replace('-', ' ')}</td><td>${fdc(r.t)}</td><td class="n">${nf0.format(r.qte)}</td><td class="n">${nf0.format(r.cum)}</td></tr>`).join('')
        + `</tbody></table>`
      : `<p class="c3-d-note">Aucun relevé validé${k.debute ? ' depuis le démarrage prévu.' : '.'}</p>`;
    const proj = k.proj
      ? `<p class="c3-d-note">Au rythme observé, fin estimée le <b>${fd(k.proj.fin)}</b>${k.proj.ecart > 0 ? `, soit ${jours(k.proj.ecart)} après la fin prévue` : ''}.</p>`
      : '';

    const p = $('#c3-detail');
    p.dataset.etat = k.etat;
    p.innerHTML = `
      <div class="c3-d-head">
        <span class="c3-tag" data-etat="${k.etat}">${forme(k.etat)}${LIB_ETAT[k.etat]}</span>
        <button class="c3-close" type="button" id="c3-d-close" aria-label="Fermer le détail"><i class="fas fa-xmark"></i></button>
      </div>
      <div>
        <h2>${a.libelle}</h2>
        <p class="c3-d-sub"><span class="c3-mono">${a.code}</span> · ${k.g.code} ${k.g.libelle}</p>
      </div>
      <div class="c3-d-prog">
        <div class="c3-d-line"><span>Réalisé</span><b>${pct1(k.realExact)}</b></div>
        <div class="c3-d-bar"><i style="width:${Math.min(k.realExact, 100)}%"></i>${a.cloturee || !k.debute ? '' : `<b style="left:${Math.min(k.attendu, 100)}%"></b>`}</div>
        <div class="c3-d-line is-dim"><span>${nf0.format(k.qr)} / ${nf0.format(a.qtePrevue)} ${a.unite}</span>${a.cloturee || !k.debute ? '' : `<span>attendu à date ${pct(k.attendu)}</span>`}</div>
      </div>
      <p class="c3-d-ecart${tard ? ' is-late' : ''}">${texteEcart(k)}</p>
      <dl>
        <dt>Acteur</dt><dd>${a.acteur}</dd>
        <dt>Localité</dt><dd>${a.localite}</dd>
        <dt>Prévu</dt><dd>${fd(k.dp)} → ${fd(k.fp)} · ${jours(k.prevJ)}</dd>
        <dt>Réel</dt><dd>${reel}</dd>
        <dt>Poids</dt><dd>${a.poids} dans ${k.g.code}</dd>
      </dl>
      <h3>Relevés validés</h3>
      ${releves}
      ${proj}`;
    p.hidden = false;
    $('#c3-layout').classList.add('has-detail');
    marquerSelection();
  }

  function fermerDetail() {
    const code = state.sel;
    state.sel = null;
    $('#c3-detail').hidden = true;
    $('#c3-layout').classList.remove('has-detail');
    marquerSelection();
    const row = code && $(`.c3-lrow[data-row="${code}"]`);
    if (row && document.activeElement && document.activeElement.closest('#c3-detail')) row.focus();
  }

  /* ===== Légende ===== */
  function construireLegende() {
    $('#c3-legend').innerHTML = [
      `<span class="c3-lg"><span class="c3-sw c3-sw--plan"><i></i></span>Prévu au PTBA, rempli selon le réalisé (à comparer à la ligne « Aujourd'hui »)</span>`,
      `<span class="c3-lg"><span class="c3-sw c3-sw--over"></span>Dépassement de la fin prévue</span>`,
      `<span class="c3-lg"><span class="c3-sw c3-sw--none"></span>Aucun relevé</span>`,
      `<span class="c3-lg"><span class="c3-sw-today"></span>Aujourd'hui</span>`,
      `<span class="c3-lg"><span class="c3-sw-jalon"></span>Jalon</span>`,
      ...ORDRE_ETATS.map(e => `<span class="c3-lg">${forme(e)}${LIB_ETAT[e]}</span>`)
    ].join('');
  }

  /* ===== Défilement horizontal ===== */
  const lisse = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

  function majDefilement() {
    const x = SCROLL.scrollLeft, max = SCROLL.scrollWidth - SCROLL.clientWidth;
    $('#c3-thead-track').style.transform = `translateX(${-x}px)`;
    GANTT.classList.toggle('is-scrolled', x > 0);
    $('#c3-prev').disabled = x <= 1;
    $('#c3-next').disabled = x >= max - 1;
    // Le libellé du haut coupé par le bord gauche glisse pour rester lisible
    $$('#c3-lane-top .c3-cell').forEach(c => {
      const s = c.firstElementChild;
      const dx = Math.min(Math.max(0, x - c.offsetLeft), c.offsetWidth - s.offsetWidth);
      s.style.transform = dx > 0 ? `translateX(${dx}px)` : '';
    });
    // Un jalon sorti par la gauche n'affiche plus de libellé orphelin
    $$('#c3-jal .c3-jalon').forEach(j => { j.style.visibility = j.offsetLeft + 6 < x ? 'hidden' : ''; });
  }

  // Place une date aux trois cinquièmes de la zone visible : le réalisé (passé) reste lisible
  function allerA(t, behavior = lisse()) {
    const x = (x0(t) + x1(t)) / 2 / 100 * SCROLL.scrollWidth;
    SCROLL.scrollTo({ left: x - SCROLL.clientWidth * 0.6, behavior });
  }

  // Une période à la fois (année, trimestre ou mois selon l'échelle), calée sur son début
  function decaler(sens) {
    const W = SCROLL.scrollWidth, x = SCROLL.scrollLeft;
    const debuts = $$('#c3-lane-top .c3-cell').map(c => parseFloat(c.style.left) / 100 * W);
    const cible = sens > 0 ? debuts.find(p => p > x + 2) : debuts.filter(p => p < x - 2).pop();
    SCROLL.scrollTo({ left: cible ?? (sens > 0 ? W : 0), behavior: lisse() });
  }

  function changerEchelle(v) {
    if (v === state.echelle) return;
    const centre = (SCROLL.scrollLeft + SCROLL.clientWidth / 2) / SCROLL.scrollWidth;
    state.echelle = v;
    $$('#c3-echelle button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
    construireEchelle();
    placerJalons();
    SCROLL.scrollLeft = centre * SCROLL.scrollWidth - SCROLL.clientWidth / 2;
    majDefilement();
  }

  /* ===== Thème ===== */
  const CLE_THEME = 'chronogramme_theme';
  function appliquerTheme(theme) {
    document.documentElement.dataset.theme = theme;
    $('#c3-theme i').className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    $('#c3-theme span').textContent = theme === 'dark' ? 'Clair' : 'Sombre';
  }

  /* ===== Événements ===== */
  function brancher() {
    SCROLL.addEventListener('scroll', majDefilement, { passive: true });
    new ResizeObserver(() => { majDefilement(); placerJalons(); }).observe(SCROLL);
    $('#c3-prev').addEventListener('click', () => decaler(-1));
    $('#c3-next').addEventListener('click', () => decaler(1));
    $('#c3-today-btn').addEventListener('click', () => allerA(TODAY));
    $('#c3-echelle').addEventListener('click', e => {
      const b = e.target.closest('[data-v]');
      if (b) changerEchelle(b.dataset.v);
    });
    $('#c3-groupe').addEventListener('click', e => {
      const b = e.target.closest('[data-v]');
      if (!b || b.dataset.v === state.groupe) return;
      state.groupe = b.dataset.v;
      state.replies.clear();
      $$('#c3-groupe button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      rendre();
    });
    $('#c3-q').addEventListener('input', e => { state.q = e.target.value; rendre(); });
    $('#c3-stats').addEventListener('click', e => {
      const b = e.target.closest('[data-f]');
      if (!b) return;
      state.etat = state.etat === b.dataset.f ? null : b.dataset.f;
      majStats();
      rendre();
    });

    // Gantt : repli des groupes, ouverture du détail, survol synchronisé
    GANTT.addEventListener('click', e => {
      const c = e.target.closest('.c3-caret');
      if (c) {
        const g = c.dataset.g;
        if (state.replies.has(g)) state.replies.delete(g); else state.replies.add(g);
        rendre();
        const nc = $(`.c3-caret[data-g="${g}"]`);
        if (nc) nc.focus();
        return;
      }
      const row = e.target.closest('.c3-lrow.is-act, .c3-trow.is-act');
      if (row) ouvrirDetail(row.dataset.row);
    });
    GANTT.addEventListener('keydown', e => {
      const row = e.target.closest('.c3-lrow.is-act');
      if (row && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); ouvrirDetail(row.dataset.row); }
    });
    GANTT.addEventListener('mousemove', e => {
      const row = e.target.closest('[data-row]');
      surligner(row ? row.dataset.row : null);
    });
    GANTT.addEventListener('mouseleave', () => surligner(null));

    $('#c3-detail').addEventListener('click', e => { if (e.target.closest('#c3-d-close')) fermerDetail(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && state.sel) fermerDetail(); });

    $('#c3-theme').addEventListener('click', () => {
      const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      appliquerTheme(theme);
      try { localStorage.setItem(CLE_THEME, theme); } catch (_) { /* stockage indisponible */ }
    });
  }

  /* ===== Initialisation ===== */
  let themeInitial = 'light';
  try { themeInitial = localStorage.getItem(CLE_THEME) || 'light'; } catch (_) { /* stockage indisponible */ }
  appliquerTheme(themeInitial);
  construireStats();
  construireEchelle();
  construireLegende();
  $('#c3-today-line').style.left = XT + '%';
  const pill = $('#c3-today-pill');
  pill.style.left = XT + '%';
  pill.textContent = `Aujourd'hui · ${fdc(TODAY)}`;
  brancher();
  rendre();
  allerA(TODAY, 'auto');
  majDefilement();
})();
