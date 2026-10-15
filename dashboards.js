/* =========================================================
   REGISTRE DES TABLEAUX DE BORD
   Pour ajouter un dashboard : créer dashboards/<slug>/
   puis l'inscrire dans cette liste.
   ========================================================= */

const DASHBOARDS = [
  {
    slug: 'demo',
    title: 'Tableau de bord DEMO',
    subtitle: 'Lutte contre les conflits ruraux',
    cover: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=600',
    status: 'active',           // active | paused | archived
    statusLabel: 'En cours',
    location: 'Kenya · Côte d\'Ivoire · Sénégal',
    startDate: '2011-01-01',
    endDate: '2020-12-31',
    kpis: {
      indicators: 4,
      activities: 15,
      sources: 3
    },
    disbursementPct: 68,
    lastUpdate: '28 avr. 2026'
  },
  {
    slug: 'demo2',
    title: 'Tableau de bord DEMO 2',
    subtitle: 'Lutte contre les conflits ruraux — Thème Dark Pro',
    cover: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=600',
    status: 'active',
    statusLabel: 'En cours',
    location: 'Kenya · Côte d\'Ivoire · Sénégal',
    startDate: '2011-01-01',
    endDate: '2020-12-31',
    kpis: {
      indicators: 4,
      activities: 15,
      sources: 3
    },
    disbursementPct: 68,
    lastUpdate: '28 avr. 2026'
  },
  {
    slug: 'demo3',
    title: 'Tableau de bord DEMO 3',
    subtitle: 'Lutte contre les conflits ruraux — Thème Soft Editorial',
    cover: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=600',
    status: 'active',
    statusLabel: 'En cours',
    location: 'Kenya · Côte d\'Ivoire · Sénégal',
    startDate: '2011-01-01',
    endDate: '2020-12-31',
    kpis: {
      indicators: 4,
      activities: 15,
      sources: 3
    },
    disbursementPct: 68,
    lastUpdate: '28 avr. 2026'
  },
  {
    slug: 'activity',
    title: 'Tableau de bord — Activités',
    subtitle: 'Option A · Workspace dense (sélecteurs + gauges + carte)',
    cover: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=600',
    status: 'active',
    statusLabel: 'Option A',
    location: 'Côte d\'Ivoire · Géo-localisé',
    startDate: '2011-01-01',
    endDate: '2020-12-31',
    kpis: {
      indicators: 6,
      activities: 6,
      sources: 3
    },
    disbursementPct: 56,
    lastUpdate: '28 avr. 2026'
  },
  {
    slug: 'activity2',
    title: 'Tableau de bord — Activités',
    subtitle: 'Option B · Storytelling vertical (hero + drill-down régions)',
    cover: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600',
    status: 'active',
    statusLabel: 'Option B',
    location: 'Côte d\'Ivoire · Géo-localisé',
    startDate: '2011-01-01',
    endDate: '2020-12-31',
    kpis: {
      indicators: 6,
      activities: 6,
      sources: 3
    },
    disbursementPct: 56,
    lastUpdate: '28 avr. 2026'
  },
  {
    slug: 'activity3',
    title: 'Tableau de bord — Activités',
    subtitle: 'Option C · Bento grid modulaire (KPI cliquables + multi-calques)',
    cover: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?w=600',
    status: 'active',
    statusLabel: 'Option C',
    location: 'Côte d\'Ivoire · Géo-localisé',
    startDate: '2011-01-01',
    endDate: '2020-12-31',
    kpis: {
      indicators: 6,
      activities: 6,
      sources: 3
    },
    disbursementPct: 56,
    lastUpdate: '28 avr. 2026'
  },
  {
    slug: 'activity-timeline',
    title: 'Tableau de bord — Activités',
    subtitle: 'Option F · Timeline narrative (frise scrubable + mode play)',
    cover: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=600',
    status: 'active',
    statusLabel: 'Option F',
    location: 'Côte d\'Ivoire · Géo-localisé',
    startDate: '2011-01-01',
    endDate: '2020-12-31',
    kpis: {
      indicators: 6,
      activities: 6,
      sources: 3
    },
    disbursementPct: 56,
    lastUpdate: '28 avr. 2026'
  },
  {
    slug: 'activity-map',
    title: 'Tableau de bord — Activités',
    subtitle: 'Option D · Map-first (carte plein écran + sidebar rétractable)',
    cover: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=600',
    status: 'active',
    statusLabel: 'Option D',
    location: 'Côte d\'Ivoire · Géo-localisé',
    startDate: '2011-01-01',
    endDate: '2020-12-31',
    kpis: {
      indicators: 6,
      activities: 6,
      sources: 3
    },
    disbursementPct: 56,
    lastUpdate: '28 avr. 2026'
  },
  {
    slug: 'indicateurs',
    title: 'Tableau de bord — Indicateurs',
    subtitle: 'Option A · Workspace dense (sélecteur indicateur + niveau géo + cible)',
    cover: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600',
    status: 'active',
    statusLabel: 'Indic. · A',
    location: 'Côte d\'Ivoire · Géo-localisé',
    startDate: '2011-01-01',
    endDate: '2020-12-31',
    kpis: {
      indicators: 5,
      activities: 6,
      sources: 3
    },
    disbursementPct: 66,
    lastUpdate: '28 avr. 2026'
  },
  {
    slug: 'indicateurs2',
    title: 'Tableau de bord — Indicateurs',
    subtitle: 'Option I · Race vers l\'objectif (cercle géant + race track)',
    cover: 'https://images.unsplash.com/photo-1530268729831-4b0b9e170218?w=600',
    status: 'active',
    statusLabel: 'Indic. · I',
    location: 'Côte d\'Ivoire · Géo-localisé',
    startDate: '2011-01-01',
    endDate: '2020-12-31',
    kpis: {
      indicators: 5,
      activities: 6,
      sources: 3
    },
    disbursementPct: 66,
    lastUpdate: '28 avr. 2026'
  },
  {
    slug: 'indicateurs3',
    title: 'Tableau de bord — Indicateurs',
    subtitle: 'Option C · Cockpit Editorial (sidebar + demi-gauge + sparkline + statut adaptatif)',
    cover: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600',
    status: 'active',
    statusLabel: 'Indic. · C',
    location: 'Côte d\'Ivoire · Géo-localisé',
    startDate: '2011-01-01',
    endDate: '2020-12-31',
    kpis: {
      indicators: 5,
      activities: 6,
      sources: 3
    },
    disbursementPct: 66,
    lastUpdate: '4 mai 2026'
  },
  {
    slug: 'progress-report',
    title: 'Rapport d\'avancement',
    subtitle: 'Refonte UX · Hero éditorial + KPIs + sommaire + sections + conversation',
    cover: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600',
    status: 'active',
    statusLabel: 'Rapport',
    location: 'Côte d\'Ivoire · T2 2026',
    startDate: '2020-01-01',
    endDate: '2027-12-31',
    kpis: {
      indicators: 3,
      activities: 4,
      sources: 1
    },
    disbursementPct: 68,
    lastUpdate: '4 mai 2026'
  },
  {
    slug: 'activity4',
    title: 'Tableau de bord — Activités',
    subtitle: 'Option E · Fusion (sidebar + frise chronologique + répartition géo + KPI + commentaires)',
    cover: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=600',
    status: 'active',
    statusLabel: 'Option E',
    location: 'Côte d\'Ivoire · Géo-localisé',
    startDate: '2011-01-01',
    endDate: '2020-12-31',
    kpis: {
      indicators: 6,
      activities: 6,
      sources: 3
    },
    disbursementPct: 56,
    lastUpdate: '24 juil. 2026'
  },
  {
    slug: 'map-explorer',
    title: 'Map Explorer',
    subtitle: 'Option D · Map-first plein écran + panneaux glassmorphism + drill-down régional',
    cover: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=600',
    status: 'active',
    statusLabel: 'Carte · D',
    location: 'Côte d\'Ivoire · Géo-localisé',
    startDate: '2011-01-01',
    endDate: '2020-12-31',
    kpis: {
      indicators: 5,
      activities: 0,
      sources: 5
    },
    disbursementPct: 66,
    lastUpdate: '4 mai 2026'
  },
  {
    slug: 'chronogramme',
    title: 'Chronogramme — Propositions',
    subtitle: 'Gantt PTBA · 11 propositions activables (avant / après) + mode présentation',
    cover: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=600',
    status: 'active',
    statusLabel: 'Gantt · A',
    location: 'Côte d\'Ivoire · PTBA 2026',
    startDate: '2026-01-01',
    endDate: '2027-03-31',
    kpis: {
      indicators: 0,
      activities: 12,
      sources: 1
    },
    disbursementPct: 0,
    lastUpdate: '14 oct. 2026'
  },
  {
    slug: 'chronogramme2',
    title: 'Chronogramme — Écran cible',
    subtitle: 'Option B · Gantt de suivi (prévu / réalisé / projection) + détail avec courbe d\'avancement',
    cover: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600',
    status: 'active',
    statusLabel: 'Gantt · B',
    location: 'Côte d\'Ivoire · PTBA 2026',
    startDate: '2026-01-01',
    endDate: '2027-03-31',
    kpis: {
      indicators: 0,
      activities: 12,
      sources: 1
    },
    disbursementPct: 0,
    lastUpdate: '14 oct. 2026'
  },
  {
    slug: 'chronogramme3',
    title: 'Chronogramme — Timeline épurée',
    subtitle: 'Option C · Liste étroite + barres porteuses d\'information, regroupement par résultat ou par état, panneau de détail',
    cover: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600',
    status: 'active',
    statusLabel: 'Gantt · C',
    location: 'Côte d\'Ivoire · PTBA 2026',
    startDate: '2026-01-01',
    endDate: '2027-03-31',
    kpis: {
      indicators: 0,
      activities: 12,
      sources: 1
    },
    disbursementPct: 0,
    lastUpdate: '15 oct. 2026'
  },
  {
    slug: 'chronogramme4',
    title: 'Chronogramme — Option A modernisée',
    subtitle: 'Option D · Structure de l\'option A, finition sobre + comparaison écran actuel / proposé',
    cover: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=600',
    status: 'active',
    statusLabel: 'Gantt · D',
    location: 'Côte d\'Ivoire · PTBA 2026',
    startDate: '2026-01-01',
    endDate: '2027-03-31',
    kpis: {
      indicators: 0,
      activities: 12,
      sources: 1
    },
    disbursementPct: 0,
    lastUpdate: '15 oct. 2026'
  },
  {
    slug: 'chronogramme5',
    title: 'Chronogramme — Outil de pilotage',
    subtitle: 'Option E · Vues Chronologie / Tableau triable, statuts en pastilles, filtres, volet de détail au clavier, export CSV',
    cover: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600',
    status: 'active',
    statusLabel: 'Gantt · E',
    location: 'Côte d\'Ivoire · PTBA 2026',
    startDate: '2026-01-01',
    endDate: '2027-03-31',
    kpis: {
      indicators: 0,
      activities: 12,
      sources: 1
    },
    disbursementPct: 0,
    lastUpdate: '15 oct. 2026'
  }
  // Ajouter ici les futurs tableaux de bord
];
