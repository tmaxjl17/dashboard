# Dashboard — Tableaux de bord de suivi de projets

Application web (HTML/CSS/JS vanilla) pour visualiser les indicateurs, activités et données financières de projets de développement, avec cartographie interactive et un éditeur de dashboards personnalisés (Studio).

Aucun framework, aucun build : les pages s'ouvrent/se servent telles quelles depuis un serveur statique (WAMP en local).

**URL locale (WAMP)** : `http://localhost/dashboard/`

## Fonctionnalités

- **Page d'accueil** listant les tableaux de bord prédéfinis (cards, recherche, mini-KPIs, barre d'avancement) ainsi que les dashboards personnalisés créés dans le Studio.
- **3 onglets standard** par dashboard : Indicateurs, Activités, Données Financières — KPIs, graphes Chart.js, tableaux triables/filtrables, sparklines.
- **Cartographie interactive** (Leaflet + GeoJSON) : choroplèthes par région, drill-down au clic (zoom + bascule des KPIs sur la région sélectionnée), plusieurs variantes de dashboards géocentrés (map-first, bento grid, storytelling, timeline narrative...).
- **Studio** : éditeur de dashboards personnalisés en glisser-déposer (grille 12 colonnes, 5 types de widgets, templates de démarrage, persistance locale).
- **Plusieurs thèmes** : clair (par défaut), dark pro (cyan/violet), soft editorial (serif Fraunces).

## Stack technique

- HTML / CSS / JavaScript vanilla — pas de framework, pas de bundler
- [Chart.js 4.4.0](https://www.chartjs.org/) (CDN jsdelivr) — graphes
- [Leaflet 1.9.4](https://leafletjs.com/) (CDN unpkg) — cartes
- [Font Awesome 6.4.0](https://fontawesome.com/) — icônes
- Google Fonts — Inter, Fraunces, JetBrains Mono
- Fond de carte CartoDB Light · GeoJSON [geoBoundaries](https://www.geoboundaries.org/) (Côte d'Ivoire, ADM0/1/2)
- Serveur local : WAMP

## Installation

1. Cloner le dépôt dans le dossier servi par WAMP :
   ```bash
   git clone https://github.com/tmaxjl17/dashboard.git C:\wamp64\www\dashboard
   ```
2. Démarrer WAMP.
3. Ouvrir `http://localhost/dashboard/` dans un navigateur.

Aucune dépendance à installer (pas de `npm install`) : tout est chargé via CDN ou servi statiquement.

## Structure du projet

```
dashboard/
├── index.html              page d'accueil (dashboards prédéfinis + personnalisés)
├── dashboards.js            registre des dashboards prédéfinis
├── PROJECT.md               journal détaillé des fonctionnalités (FR)
│
├── shared/                  code mutualisé entre tous les dashboards
│   ├── css/                 tokens (variables), composants, sidebar, panels, home
│   ├── js/                  charts, sidebar, navigation, onglets indicateurs/activités/financier
│   └── geo/                 GeoJSON Côte d'Ivoire (ADM0/ADM1/ADM2)
│
├── studio/                  éditeur de dashboards personnalisés (Studio)
│
└── dashboards/               un dossier par dashboard
    ├── demo/ demo2/ demo3/       3 thèmes (clair / dark pro / soft editorial)
    ├── activity*/                variantes du dashboard Activités (options A/B/C/D/F)
    ├── indicateurs*/             variantes du dashboard Indicateurs (options A/I/C)
    ├── progress-report/          rapport d'avancement éditorial
    └── map-explorer/             carte plein écran avec drill-down régional
```

Voir [PROJECT.md](PROJECT.md) pour le détail complet de ce qui a été réalisé sur chaque dashboard et ce qui reste à faire.

## Ajouter un dashboard

1. Dupliquer un dossier existant : `cp -r dashboards/demo dashboards/<nouveau-slug>`
2. Éditer les données dans `dashboards/<nouveau-slug>/data.js`
3. Déclarer le dashboard dans `dashboards.js` (le `slug` doit correspondre au nom du dossier)

## Ajouter un thème

- Créer `dashboards/<slug>/css/theme-<nom>.css` qui surcharge les variables CSS `:root` définies dans `shared/css/tokens.css`
- Optionnel : `dashboards/<slug>/theme-<nom>.js` pour adapter les couleurs Chart.js (`CHART_DEFAULTS`)

## Modifier le code partagé

Toute modification dans `shared/css/` ou `shared/js/` impacte l'ensemble des dashboards. Garder ces fichiers génériques ; les spécificités propres à un dashboard vont dans son propre dossier.

## Licence

Projet privé — usage interne.
