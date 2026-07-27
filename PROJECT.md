# Projet — Tableaux de bord de suivi de projets

## Vue d'ensemble

Application web (HTML/CSS/JS, Chart.js + Leaflet) pour visualiser des indicateurs, activités et données financières de projets de développement. Architecture modulaire avec page d'accueil listant plusieurs tableaux de bord, code partagé dans `shared/`, et un dossier par dashboard dans `dashboards/`.

**URL locale (WAMP)** : `http://localhost/dashboard/`

---

## Arborescence

```
c:\wamp64\www\dashboard\
├── index.html              page d'accueil (dashboards prédéfinis + personnalisés)
├── dashboards.js           registre des dashboards prédéfinis
├── PROJECT.md              ce fichier
│
├── shared/                 code mutualisé
│   ├── css/
│   │   ├── tokens.css         variables, base, animations
│   │   ├── components.css     onglets, KPIs, boutons, tableaux
│   │   ├── sidebar.css        sidebar projet
│   │   ├── panels.css         3 onglets + responsive
│   │   └── home.css           page d'accueil (+ section dashboards personnalisés)
│   └── js/
│       ├── charts.js          factories Chart.js
│       ├── sidebar.js         accordéon + barre temporelle + milestones
│       ├── indicateurs.js     onglet B
│       ├── activites.js       onglet C
│       ├── financier.js       onglet D
│       └── app.js             navigation onglets + lazy init
│
├── studio/                 STUDIO — éditeur de dashboards personnalisés
│   ├── index.html             palette + canvas + inspector
│   ├── studio.css             design system editor
│   └── studio.js              état + rendu + 5 widgets + localStorage + templates
│
└── dashboards/
    ├── demo/                  thème clair (par défaut)
    ├── demo2/                 thème dark pro (cyan/violet)
    ├── demo3/                 thème soft editorial (#137EB4 + Fraunces)
    ├── activity/              workspace dense (Option A)
    ├── activity2/             storytelling vertical (Option B)
    ├── activity3/             bento grid modulaire (Option C)
    ├── activity-timeline/     timeline narrative (Option F)
    ├── activity-map/          map-first / géocentré (Option D)
    ├── indicateurs/           dashboard indicateurs - workspace dense (Option A)
    ├── indicateurs2/          dashboard indicateurs - race vers l'objectif (Option I)
    ├── indicateurs3/          dashboard indicateurs - cockpit editorial (Option C)
    │                          herite du theme soft (#137EB4) + Leaflet + GeoJSON CIV
    ├── progress-report/       rapport d'avancement editorial avec sidebar conversation
    │                          (refonte UX/UI complete : hero + KPIs + sommaire + sections
    │                           + callouts + lightbox + edition contentEditable + export PDF)
    └── map-explorer/          carte plein écran avec panneaux flottants glassmorphism
                               (Option D · drill-down régional + recherche + 5 fonds de carte)
```

---

## Réalisé

### Fondations
- [x] Page d'accueil avec liste de dashboards (cards, recherche, mini-KPIs, barre d'avancement)
- [x] Architecture modulaire `shared/` + `dashboards/<slug>/`
- [x] Système de design tokens (CSS variables) — surchargeables par thème
- [x] Sidebar "Présentation du projet" : hero image, badge statut animé, barre de progression temporelle, KPIs, carte coût gradient, sections accordéon avec icônes colorées, tags, milestones (timeline avec statuts auto-calculés)
- [x] Bouton retour vers l'accueil dans la sidebar

### Onglets
- [x] **Indicateurs** : KPIs synthétiques, liste avec badges progression + sparklines SVG, recherche live, graphe avec ligne cible pointillée, 4 stat-blocks colorés, tableau évolution avec barres de progression, **case "Données validées uniquement"** + icône warning sur items non validés
- [x] **Activités** : 4 KPIs, 2 donuts (taux physique/budget) avec chiffre central + légende interactive, pills années scrollables, synthèse 4 cellules, graphe combo bar+line
- [x] **Données Financières** : 4 KPIs (dont card gradient), graphe d'évolution avec ligne cible, donut sources avec total au centre, tableau plan de financement avec barres de progression intégrées + tri/filtres

### Dashboards demo (3 thèmes)
- [x] **demo** — Moderne accessible (bleu #2196F3, fond clair)
- [x] **demo2** — Dark Pro (cyan néon + violet, fond #020617, glassmorphism, JetBrains Mono)
- [x] **demo3** — Soft Editorial (#137EB4 sur fond gris-bleu #F1F6F9, Fraunces serif sur les titres)

### Dashboard activity (Option A — Workspace dense)
- [x] Layout 2 colonnes (panneau sticky 380px + zone principale)
- [x] Sélecteur activité custom avec recherche live
- [x] Sélecteur niveau géographique (Country / Districts / Régions)
- [x] Métadonnées en cards (Unité, Responsable, Dates, Statut)
- [x] 3 gauges semi-circulaires SVG colorées sémantiquement (Budget / Physique / Achèvement)
- [x] Graphe combo bar+line avec pills années pour filtrage
- [x] Carte Leaflet avec choroplèthe sur fond CartoDB (% Achèvement)
- [x] Tooltips riches avec 3 métriques par région
- [x] GeoJSON public geoBoundaries (CIV ADM0/1/2)
- [x] Filtrage croisé activité × niveau géographique
- [x] Légende choroplèthe + spinner de chargement
- [x] **Fix UI/UX** : dropdowns avec fond blanc opaque (z-index 1000), cards métadonnées blanches avec border, suppression du toggle metric inutile (achievement = métrique fixe)
- [x] **Fix cards blanches** : remplacement de tous les `var(--bg-surface)` par `#FFFFFF` direct (9 endroits) pour garantir le blanc pur sur toutes les cartes/sélecteurs/dropdowns, le body garde son fond gris-bleu du thème
- [x] **Carte interactive Option A** : clic région = surbrillance bleue (border 3.5px + opacity 1) + zoom + drill-down dans le panneau gauche (3 mini-KPIs colorés Budget/Physique/Achievement de la région), gauges du bandeau central basculent aussi sur les valeurs régionales, sous-titre adaptatif "Région sélectionnée : Lacs", bouton X pour désélectionner, clic dans le vide = retour vue globale, tooltip hint adaptatif "Cliquez pour zoomer / désélectionner"

### Dashboard indicateurs (`indicateurs/`)
- [x] **Option A** (`indicateurs`) — Workspace dense pour les indicateurs : panneau gauche sticky (sélecteurs indicateur + niveau géo + checkbox Données validées + métadonnées définition/sens d'évolution), 4 stat-cards colorées (Référence/Actuelle/Cible/% atteint) avec bordure haut sémantique, barre de progression vers la cible avec dégradé coloré + valeur dans le fill + échelle 0-100% + légende, graphe d'évolution avec ligne pointillée pour trajectoire cible, carte choroplèthe interactive (clic région = surbrillance + zoom + bascule des KPIs sur valeurs régionales), tableau régions classé par % atteint, calcul du % qui gère les indicateurs ascendants ET descendants (taux d'abandon doit baisser), case "Données validées uniquement" avec auto-bascule si l'indicateur courant disparaît
- [x] **Option I** (`indicateurs2`) — Race vers l'objectif : hero immersif avec cercle de progression géant 220px (couleur sémantique selon perf), badge validation, identité serif 32px, chips métadonnées, bloc statut adaptatif "À l'heure / En avance / En retard / En retard significatif" calculé par comparaison avec la trajectoire attendue à la date courante. Race track horizontale avec drapeau de départ (référence), pin animé "Vous êtes ici" (avec pulse), drapeau d'arrivée (cible) et **marqueur fantôme** "Cible aujourd'hui" calculé selon le temps écoulé.
### Studio — Tableaux de bord personnalisés (`studio/`)
- [x] **Phase 1 MVP** : éditeur 3 colonnes (palette gauche 260px + canvas central grille 12 cols + inspector droit 320px), topbar avec nom éditable inline + toggle Édition/Aperçu + boutons Dupliquer/Supprimer/Enregistrer + indicateur "Enregistré" auto-save
- [x] **5 widgets** : KPI (grand chiffre + label + sub), Stat-card (icône + chiffre + delta vs référence + bordure haute colorée), Chart line (Chart.js timeline + cible pointillée optionnelle), Donut (% atteint vs restant avec total au centre), Texte (titre + body + alignement)
- [x] **Inspector contextuel** : section Source (indicateur + métrique référence/actuelle/cible/%atteint), Apparence (titre, couleur 7 teintes, icône, toggle delta/cible/sous-titre), Taille (sliders w/h + position x/y affichée)
- [x] **4 templates de démarrage** : Vierge / Vue exécutive (4 stat-cards + chart + donut) / Suivi indicateur (KPI + stat + donut + chart) / Comparatif 4 indicateurs (4 charts en 2×2) — désormais avec positions x/y/h explicites
- [x] **Persistance localStorage** (clé `dashboard_studio_v1.<id>` + index `dashboard_studio_v1.index`) avec auto-save 500ms après modif et indicateur visuel "Enregistrement…/Enregistré"
- [x] **Modes** : Édition (palette + inspector + handles visibles, contour bleu sélection) / Aperçu (palette+inspector cachés, widgets read-only pleine taille)
- [x] **Modale de confirmation** + toast de feedback pour les actions destructives
- [x] **Source de données** : indicateurs chargés depuis `dashboards/indicateurs/data.js`, filtre niveau géo global piloté depuis le canvas
- [x] **Page d'accueil** : nouvelle section "Mes dashboards personnalisés" avec cards (nom + nb widgets + dernière modif) + bouton "+ Nouveau dashboard" + bouton supprimer par card + état vide avec illustration + CTA
- [x] **Phase 2 Drag & Drop** : grille libre 12 cols × auto-rows 80px avec positionnement `{x, y, w, h}` par widget. Drag depuis la palette (mousedown + threshold 5px → ghost flottant qui suit le curseur + preview pointillé bleu sur la cellule cible), drag-move des widgets existants (cursor grab/grabbing, opacity réduite pendant drag, drop preview en temps réel), resize via poignée bas-droite (snap à la cellule, contrainte par minW/minH du widget). Algorithme **push-down** : le widget déposé pousse les autres vers le bas en cas de chevauchement, puis `compactWidgets()` remonte tout le plus haut possible. Drop preview animé (rectangle bleu pointillé pulsant). **Migration auto** des dashboards Phase 1 (sans x/y/h) au chargement : packing séquentiel sur la grille. Échap pour annuler un drag/resize en cours. **Mobile/touch** : drag désactivé, fallback click sur palette pour ajouter au prochain slot libre.

### Map Explorer (`map-explorer/`)
- [x] **Option D · Map-first plein écran** : carte Leaflet 100% écran avec panneaux flottants glassmorphism. Topbar minimaliste sticky 56px (back + titre + actions PNG/Partager/Aide).
- [x] **Panneau gauche rétractable** (320px) : sélecteur indicateur custom (avec recherche live), sélecteur niveau géo (Country/Districts/Régions), toggle Données validées, bouton "Retour vue nationale" (visible quand région sélectionnée), **4 KPIs adaptatifs** (Référence/Actuelle/Cible/% Atteint) qui se mettent à jour selon la région, mini barre de progression, métadonnées (sens + type).
- [x] **Panneau droit rétractable** (320px) avec **2 onglets** : (1) **Données** = couches togglables avec checkbox + dot couleur + count badge (Choroplèthe / Marqueurs régions / Étiquettes / Limites administratives) regroupées par catégorie, (2) **Fond de carte** = grille de 5 thumbnails (Clair / Sombre / Satellite / Terrain / Routes) avec aperçus visuels.
- [x] **Recherche flottante top-center** (380px) avec autocomplete sur les noms de régions (sur le GeoJSON courant) + bouton "Ma position" (geolocation API) + résultats avec % atteint + Entrée sélectionne le 1er résultat.
- [x] **Drill-down régional dynamique** : clic région = `flyToBounds` animé (durée 0.7s) + highlight (border 4px #137EB4) + KPIs filtrés sur la région + label "Région : Lacs". Clic ailleurs / Échap / bouton "Retour" = `flyToBounds` retour vue nationale.
- [x] **Légende sticky bottom-left** glassmorphism : titre + gradient choroplèthe horizontal + bornes (0% / 25% / 50% / 80% / 100%+).
- [x] **Outils bottom-right** glassmorphism : Zoom +/- · Reset vue · Plein écran (Fullscreen API).
- [x] **Loader** centré pendant le fetch GeoJSON, toast de feedback pour les actions (export, partage, géoloc...).
- [x] **Source de données** : `dashboards/indicateurs/data.js` partagé (5 indicateurs avec données par région niveau 0/1/2 + GeoJSON geoBoundaries CIV).
- [x] **Tooltip riche** au survol des régions (nom + valeur + cible + % atteint + hint cliquer/désélectionner) avec backdrop blur.
- [x] **Étiquettes des régions** affichées sur la carte (nom centré sur le polygone, text-shadow blanc pour lisibilité).
- [x] **Mode mobile** : panneaux deviennent des bottom-sheets pull-up.

### Rapport d'avancement (`progress-report/`)
- [x] **Refonte complète UX/UI** d'un rapport d'exécution projet (vs ancienne maquette : barres rayées, KPIs cassés "478 %", conversation collée à droite, image orpheline). Stack : Inter + Fraunces sérif + palette `--primary` (#2196F3).
- [x] **Topbar** : back + breadcrumb + actions (Mode lecture · Exporter PDF · Modifier · Menu ⋯)
- [x] **Hero éditorial** : chip période + status (validé/relecture/brouillon), titre Fraunces 36px, sous-titre, mini-timeline projet avec curseur "Aujourd'hui" et % calendrier écoulé
- [x] **3 KPIs uniformes** (Décaissement / Avancement physique / Calendrier) avec icône colorée, valeur Fraunces 32px, delta vs T-1 (chip ↑/↓), barre de progression. **Gestion des valeurs >100 %** : barre clamped + chip "🎯 Cible dépassée"
- [x] **Sommaire (TOC)** : liste numérotée cliquable + scrollspy IntersectionObserver qui surligne la section active pendant le scroll
- [x] **4 sections de contenu** (Synthèse / Réalisations / Risques / Décisions) avec icônes, titres Fraunces, body riche (paragraphes, check-list ✓, decision-list numérotée, blockquotes)
- [x] **4 types de callouts** (info bleu / success vert / warning orange / danger rouge) avec bordure latérale colorée + icône + titre + texte
- [x] **Figures avec légende** : image + figcaption (titre + crédit photo en italique) + click → lightbox plein écran avec fond noir 92%
- [x] **Footer métadonnées riche** : avatars Auteur + Validateur (rôle + nom), version + dates création/modif, tags
- [x] **Sidebar conversation** persistée localStorage : header avec compteur, messages en bulles avec avatars + timestamps, dates sticky groupées par jour ("Aujourd'hui" / "Hier" / date), actions au hover (👍 ↩️ ⋯), zone de saisie avec textarea auto-resize + bouton Envoyer + hint Ctrl+Entrée. Bouton flottant 💬 avec badge compteur quand sidebar masquée
- [x] **Édition inline** : bouton "Modifier" → toutes les sections deviennent contentEditable avec contour bleu pointillé. **Toolbar flottante** centrée en bas avec : Gras / Italique / Souligné / Titre / Citation / Listes / Insertion de callouts (info/warning/success) / Annuler / Enregistrer. Persistance localStorage par section. Ctrl+S pour sauver, Échap pour quitter (à valider)
- [x] **Mode lecture** (focus) : Échap pour quitter, cache topbar + sidebar, élargit la police body à 17px, contenu centré max-width 980px
- [x] **Export PDF** via `window.print()` avec `@media print` qui cache topbar/conversation/toolbar et préserve les page-breaks entre sections
- [x] **Données factices riches** : projet DEMO, T2 2023, KPIs avec deltas, 4 sections développées, 2 commentaires initiaux, auteur OUELLETTE Christelle + validateur DUPONT Jean (avatars Pravatar)
- [x] **Inscription** dans `dashboards.js` (slug `progress-report`) — apparaît dans la home

### Indicateurs (anciens variants)
- [x] **Option C** (`indicateurs3`) — Cockpit Editorial : sidebar gauche compacte sticky 320px (sélecteurs + définition + métadonnées 3 chips + barre temporelle projet avec curseur "Aujourd'hui" et % calendrier écoulé), hero 2 colonnes avec **demi-gauge SVG 220×130** (arc semi-circulaire animé en stroke-dasharray, couleur sémantique selon perf, marqueur fantôme blanc qui montre la trajectoire attendue) + identité (code chip + badge validé/non validé + titre Fraunces 28px) + sparkline inline 280×56 avec gradient sous la courbe et chip de tendance (+/− pts depuis la référence) + bloc statut adaptatif coloré (À l'heure / En avance / En retard / En retard significatif) calculé vs trajectoire linéaire référence→cible au prorata du temps. Bandeau **4 stat-cards sémantiques** (Référence/Actuelle/Cible/Restant) avec bordure haute colorée + icône + count-up animé + scope adaptatif (région ou global). Graphe d'évolution avec axe X compact (autoSkip + maxTicksLimit 12), zone gradient + trajectoire cible pointillée verte + dernier point accentué. Section géo 2 colonnes : carte Leaflet choroplèthe (clic région = drill-down + bascule des KPIs) + classement des régions (cards avec barre de progression colorée + rang + nom + %). Bouton "Désélectionner" pill rouge en haut de la carte quand une région est active.

---

## À faire

### Dashboard activity — autres options
- [x] **Option B** (`activity2`) — Storytelling vertical : flux narratif 1 colonne, hero card avec sélecteurs en pills + métadonnées, bandeau KPIs avec donuts compacts + sparklines, drill-down régions interactif synchronisé avec la carte (clic région → highlight + zoom carte)
- [x] **Option C** (`activity3`) — Bento grid modulaire : grille 6 colonnes asymétrique, header activité, carte sur 3 rangs, KPIs cliquables qui filtrent le graphe, toggle calque carte (Clair/Sombre/Satellite), drill-down régions, animations en cascade au chargement
- [x] **Option F** (`activity-timeline`) — Timeline narrative : frise temporelle 2011-2020 scrubable (drag du curseur ou clic sur frise), 8 jalons projet accrochés (Démarrage / Examens / Événements / Clôture), mode lecture animé (Play/Pause + 1×/2×/4×) qui parcourt les 10 ans en ~30 sec, KPIs interpolés en temps réel (Budget/Physique/Achievement croissent au fil du temps), carte qui s'éclaire progressivement (régions inactives grises), story panel avec phrases narratives auto-générées selon la phase du projet (avant/pendant/après), mini-graphe avec point courant accentué
- [x] **Option D** (`activity-map`) — Map-first / Géocentré : carte plein-écran qui pilote tout, sélecteurs flottants top-left en glassmorphism, sidebar droite rétractable (380px) avec KPIs/graphe/métadonnées/commentaires, mini-cards flottantes au-dessus de chaque région avec son % achèvement (border colorée selon performance), bouton fullscreen qui cache la sidebar, clic sur région = sidebar passe en mode "détail région" + zoom carte + bouton X pour revenir au global, clic dans le vide = retour vue nationale
- [x] **Option E** (`activity4`) — Fusion : sidebar + évolution annuelle + commentaires (`activity`), répartition géographique + régions classées (`activity2`), frise chronologique + KPI (`activity-timeline`). Layout : sidebar fixe à gauche (sélecteurs, métadonnées, drill-down région), puis en colonne principale — frise temporelle en tête, carte choroplèthe à côté de 3 KPI (style carte demo3, valeur en police non-serif) suivis du classement "Régions classées" en dessous, évolution annuelle sans filtre de dates, commentaires en bas. La frise pilote l'intégralité des données affichées : en faisant défiler ou en lançant la lecture, les KPI, la carte (régions qui s'éclairent progressivement), le classement des régions et le graphe d'évolution (tronqué à l'année du curseur, point courant accentué) s'interpolent tous ensemble depuis 0 jusqu'à la valeur finale de l'activité sélectionnée. Sélection d'une région (carte ou classement) synchronisée avec le panneau drill-down du sidebar.

### Améliorations potentielles
- [ ] Persistance de l'état (sélection activité/niveau géo en localStorage)
- [ ] Export PDF / PNG des dashboards
- [ ] Mode print (CSS @media print)
- [ ] Dark mode toggle global (au-delà des thèmes demo2)
- [ ] Drill-down géographique (clic sur un district → zoom + chargement ADM2)
- [ ] Annotations sur le graphe (événements clés du projet)
- [ ] Comparaison multi-activités côte à côte

### Évolutions data
- [ ] Brancher sur une API/backend PHP (les `data.js` deviendront des endpoints)
- [ ] Ajouter de nouveaux dashboards de projets réels (suivre le pattern `dashboards/<slug>/`)
- [ ] Internationalisation (FR/EN) des labels

---

## Conventions de l'architecture

**Pour ajouter un dashboard** :
1. `cp -r dashboards/demo dashboards/<nouveau-slug>`
2. Éditer `dashboards/<slug>/data.js`
3. Inscrire dans `dashboards.js` (slug = nom de dossier)

**Pour ajouter un thème** :
- Créer `dashboards/<slug>/css/theme-<nom>.css` qui surcharge les CSS variables `:root`
- Optionnel : `dashboards/<slug>/theme-<nom>.js` pour patcher `CHART_DEFAULTS` (couleurs Chart.js)

**Pour modifier le code partagé** :
- Tout `shared/css/` ou `shared/js/` impacte tous les dashboards à la fois
- Garder ces fichiers génériques, les spécificités vont dans le dossier du dashboard

---

## Stack technique

- HTML/CSS/JS vanilla (pas de framework)
- **Chart.js 4.4.0** — graphes (CDN jsdelivr)
- **Leaflet 1.9.4** — cartes (CDN unpkg)
- **Font Awesome 6.4.0** — icônes
- **Google Fonts** — Inter (UI), Fraunces (serif demo3), JetBrains Mono (demo2)
- **Fond carto** — CartoDB Light (tiles)
- **GeoJSON** — geoBoundaries (Open Data)
- Serveur local : WAMP

---

*Dernière mise à jour : 2026-07-24 (ajout activity4 — Option E · fusion sidebar/frise/carte/KPI/commentaires, pilotée par la frise temporelle)*
