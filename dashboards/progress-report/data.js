/* =========================================================
   PROGRESS REPORT — Données factices (rapport d'avancement)
   ========================================================= */

const PROGRESS_REPORT_DATA = {

  reportId: 'pr_demo_t2_2023',

  project: {
    code: 'DEMO',
    title: 'Projet DEMO',
    subtitle: 'Lutte contre les conflits ruraux',
    location: 'Côte d\'Ivoire',
    startDate: '2020-01-01',
    endDate: '2027-12-31'
  },

  report: {
    period: 'T2 2026 · Rapport mensuel',
    title: "Rapport d'exécution du projet",
    subtitle: 'Synthèse trimestrielle des avancées physiques et financières — avril à juin 2026',
    status: 'validated',           // validated | review | draft
    statusLabel: 'Validé',

    kpis: [
      {
        key: 'decaissement',
        label: 'Décaissement',
        value: 68,
        unit: '%',
        delta: 5,
        deltaLabel: 'vs T1',
        icon: 'fa-coins',
        color: 'blue'
      },
      {
        key: 'physique',
        label: 'Avancement physique',
        value: 95,
        unit: '%',
        delta: 3,
        deltaLabel: 'vs T1',
        icon: 'fa-helmet-safety',
        color: 'green'
      },
      {
        key: 'delai',
        label: 'Calendrier écoulé',
        value: 100,
        unit: '%',
        delta: 0,
        deltaLabel: 'projet clos',
        icon: 'fa-clock',
        color: 'amber'
      }
    ],

    sections: [
      {
        id: 'synthese',
        title: 'Synthèse exécutive',
        icon: 'fa-clipboard-list',
        content: `
<p>Le second trimestre 2026 marque une <strong>accélération significative</strong> des opérations sur le terrain, avec une progression de <strong>+3 points</strong> sur l'avancement physique et <strong>+5 points</strong> sur le décaissement par rapport au trimestre précédent.</p>

<p>Les équipes ont concentré leurs efforts sur la finalisation des travaux dans les districts du <em>Bas-Sassandra</em> et de <em>Comoé</em>, tout en démarrant les ultimes réceptions techniques sur le district autonome d'Abidjan.</p>

<div class="callout callout--info">
  <i class="fas fa-circle-info"></i>
  <div>
    <strong>Information clé</strong>
    Sur les 500 puits planifiés au démarrage du projet, <strong>495 ont été réhabilités</strong> et réceptionnés à la fin du trimestre. Les 5 restants sont en cours de finition.
  </div>
</div>
`
      },
      {
        id: 'realisations',
        title: 'Travaux réalisés',
        icon: 'fa-circle-check',
        content: `
<p>Au cours du trimestre, les principales réalisations ont été :</p>

<ul class="check-list">
  <li><strong>15 puits réhabilités</strong> dans la région des Lacs (objectif : 12)</li>
  <li><strong>8 sessions de formation</strong> aux métiers ruraux pour 320 jeunes (objectif : 250)</li>
  <li><strong>3 plateformes de dialogue</strong> mises en place pour la gestion des conflits agro-pastoraux</li>
  <li><strong>Réception définitive</strong> du puits pilote de Bouna après 18 mois de fonctionnement</li>
</ul>

<figure class="report-figure">
  <img src="https://images.unsplash.com/photo-1517649763962-0c623066013b?w=900" alt="Puits réhabilité avec habitations traditionnelles">
  <figcaption>
    <strong>Réhabilitation d'une habitation à Bouna — avril 2026</strong>
    <span>Photo : QUENUM Max · Mission de terrain T2 2026</span>
  </figcaption>
</figure>

<p>L'engagement des communautés locales a été déterminant pour atteindre ces résultats, notamment via la mise en place de <em>comités de gestion villageois</em> qui assurent désormais la maintenance courante.</p>
`
      },
      {
        id: 'risques',
        title: 'Risques identifiés',
        icon: 'fa-triangle-exclamation',
        content: `
<p>Trois zones d'attention ont été identifiées au cours du trimestre :</p>

<div class="callout callout--warning">
  <i class="fas fa-triangle-exclamation"></i>
  <div>
    <strong>Risque opérationnel — Région des Savanes</strong>
    Les conditions de sécurité dégradées dans 2 des 6 communes ciblées ralentissent les missions de suivi. Une mission conjointe avec les autorités locales est prévue en juillet pour rétablir l'accès terrain.
  </div>
</div>

<div class="callout callout--danger">
  <i class="fas fa-circle-exclamation"></i>
  <div>
    <strong>Risque financier — Conversion EUR/XOF</strong>
    La volatilité du taux de change a généré un écart de <strong>−2,3 %</strong> sur les enveloppes prévisionnelles du semestre. Une revue budgétaire avec le bailleur est planifiée pour le mois prochain.
  </div>
</div>

<div class="callout callout--info">
  <i class="fas fa-circle-info"></i>
  <div>
    <strong>Risque programmatique — Suivi post-projet</strong>
    Le dispositif de suivi-évaluation prévu pour les 24 mois suivant la clôture du projet n'a pas encore été contractualisé avec un prestataire externe.
  </div>
</div>
`
      },
      {
        id: 'decisions',
        title: 'Décisions à prendre',
        icon: 'fa-flag',
        content: `
<p>Le comité de pilotage est invité à se prononcer sur les points suivants lors de sa prochaine session :</p>

<ol class="decision-list">
  <li>
    <strong>Réallocation budgétaire</strong> du reliquat (estimé à <strong>4,5 % de l'enveloppe initiale</strong>) vers le renforcement du dispositif de suivi post-projet.
  </li>
  <li>
    <strong>Validation du calendrier de clôture financière</strong> au 31 décembre 2027, avec un audit final indépendant entre octobre et novembre 2027.
  </li>
  <li>
    <strong>Modalités de transfert de propriété</strong> des infrastructures réhabilitées aux comités de gestion villageois — projet de convention en pièce jointe.
  </li>
</ol>

<div class="callout callout--success">
  <i class="fas fa-circle-check"></i>
  <div>
    <strong>Prochaine étape</strong>
    Le rapport de clôture sera diffusé à l'ensemble des parties prenantes au plus tard le <strong>15 octobre 2027</strong>.
  </div>
</div>
`
      }
    ],

    author: {
      name: 'OUELLETTE Christelle',
      role: 'Coordinatrice projet',
      avatar: 'https://i.pravatar.cc/80?img=47'
    },
    validator: {
      name: 'QUENUM Max',
      role: 'Chef de mission',
      avatar: 'https://i.pravatar.cc/80?img=33'
    },
    version: '1.3',
    createdAt: '2026-04-15T10:00:00',
    updatedAt: '2026-05-04T16:30:00',
    tags: ['Q2 2026', 'Avancement', 'Réhabilitation', 'Mission terrain']
  },

  // Conversation initiale (sera persistée + enrichie en localStorage)
  comments: [
    {
      id: 'c1',
      author: 'QUENUM Max',
      role: 'Chargé S&E',
      avatar: 'https://i.pravatar.cc/80?img=12',
      timestamp: '2026-04-25T10:30:00',
      text: 'Bravo pour la qualité du rapport. Pourrait-on ajouter une carte des zones d\'intervention dans la prochaine version ?'
    },
    {
      id: 'c2',
      author: 'QUENUM Max',
      role: 'Chargé S&E',
      avatar: 'https://i.pravatar.cc/80?img=12',
      timestamp: '2026-05-02T15:20:00',
      text: 'Je viens de relire la section "Risques" — penser à intégrer le retour de la mission terrain de la semaine dernière (notamment sur les Savanes).'
    }
  ]
};
