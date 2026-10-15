/* =========================================================
   CHRONOGRAMME — Données de démonstration (projet fictif)
   Gantt PTBA 2026 + 11 propositions d'évolution activables.
   Situation figée au 14 octobre 2026 pour que la démonstration
   reste identique quel que soit le jour de la présentation.
   ========================================================= */

const CHRONO_DATA = {
  projet: {
    sigle: 'PAEPA-R',
    composante: "Composante 1 — Accès durable à l'eau potable en milieu rural",
    ptba: 'PTBA 2026'
  },

  dateReference: '2026-10-14',   // « aujourd'hui » de la démonstration
  debutFrise: '2026-01-01',
  finFrise: '2027-03-31',

  jalons: [
    { date: '2026-06-15', libelle: "Mission d'appui du bailleur" },
    { date: '2026-12-31', libelle: 'Clôture PTBA' }
  ],

  /* Regroupements (résultats) > activités.
     releves : trimestres couverts par un relevé validé
     debutReel / finReel : dates observées sur le terrain (utilisées par P11)
     qtePrevue / qteReelle : quantités (P9) · poids : poids au cadre logique (P10) */
  groupes: [
    {
      code: 'R1.1', libelle: "Points d'eau fonctionnels",
      activites: [
        { code: 'GA0101', libelle: 'Réhabilitation de 40 puits busés', localite: 'Korhogo', acteur: 'Entreprise de travaux — lot 1',
          debutPrevu: '2026-02-02', finPrevue: '2026-12-31', releves: ['2026-T1', '2026-T2'], debutReel: '2026-02-16', finReel: '2026-06-22',
          cloturee: false, qtePrevue: 40, qteReelle: 17, unite: 'puits', poids: 35 },
        { code: 'GA0102', libelle: 'Construction de 12 forages équipés', localite: 'Ferkessédougou', acteur: 'Entreprise de forage — lot 2',
          debutPrevu: '2026-01-15', finPrevue: '2026-06-30', releves: ['2026-T1', '2026-T2', '2026-T3'], debutReel: '2026-01-20', finReel: '2026-09-18',
          cloturee: false, qtePrevue: 12, qteReelle: 9, unite: 'forages', poids: 40 },
        { code: 'GA0103', libelle: "Contrôle qualité de l'eau des ouvrages", localite: 'Korhogo', acteur: "Laboratoire régional d'analyses",
          debutPrevu: '2026-04-01', finPrevue: '2026-11-06', releves: [], debutReel: null, finReel: null,
          cloturee: false, qtePrevue: 40, qteReelle: 0, unite: 'analyses', poids: 10 },
        { code: 'GA0104', libelle: 'Pose de 6 mini-adductions solaires', localite: 'Odienné', acteur: 'Entreprise de travaux — lot 3',
          debutPrevu: '2026-11-16', finPrevue: '2027-03-31', releves: [], debutReel: null, finReel: null,
          cloturee: false, qtePrevue: 6, qteReelle: 0, unite: 'systèmes', poids: 15 }
      ]
    },
    {
      code: 'R1.2', libelle: 'Gestion communautaire assurée',
      activites: [
        { code: 'GB0101', libelle: 'Formation de 52 comités de gestion', localite: 'Bouaké', acteur: 'ONG partenaire — zone Centre',
          debutPrevu: '2026-03-02', finPrevue: '2026-07-31', releves: ['2026-T1', '2026-T2', '2026-T3'], debutReel: '2026-03-09', finReel: '2026-08-28',
          cloturee: true, qtePrevue: 52, qteReelle: 52, unite: 'comités', poids: 30 },
        { code: 'GB0102', libelle: 'Formation de 24 artisans réparateurs', localite: 'Ferkessédougou', acteur: "Direction régionale de l'Hydraulique",
          debutPrevu: '2026-02-02', finPrevue: '2026-05-29', releves: ['2026-T1', '2026-T2'], debutReel: '2026-02-03', finReel: '2026-05-27',
          cloturee: true, qtePrevue: 24, qteReelle: 24, unite: 'artisans', poids: 15 },
        { code: 'GB0103', libelle: "Recouvrement des redevances d'eau", localite: 'Bouaké', acteur: 'Cellule technique UGP',
          debutPrevu: '2026-05-04', finPrevue: '2026-10-30', releves: ['2026-T2', '2026-T3'], debutReel: '2026-05-11', finReel: '2026-09-24',
          cloturee: false, qtePrevue: 52, qteReelle: 9, unite: 'comités en recouvrement', poids: 35 },
        { code: 'GB0104', libelle: 'Sensibilisation hygiène et lavage des mains', localite: 'Daloa', acteur: 'ONG partenaire — zone Ouest',
          debutPrevu: '2026-01-12', finPrevue: '2026-12-18', releves: ['2026-T1', '2026-T2', '2026-T3'], debutReel: '2026-01-19', finReel: '2026-09-30',
          cloturee: false, qtePrevue: 120, qteReelle: 88, unite: 'séances', poids: 20 }
      ]
    },
    {
      code: 'R1.3', libelle: 'Suivi et capitalisation',
      activites: [
        { code: 'GC0101', libelle: "Enquête de référence sur l'accès à l'eau", localite: 'Man', acteur: 'Spécialiste suivi-évaluation UGP',
          debutPrevu: '2026-01-05', finPrevue: '2026-03-31', releves: ['2026-T1'], debutReel: '2026-01-07', finReel: '2026-03-27',
          cloturee: true, qtePrevue: 1, qteReelle: 1, unite: 'rapport', poids: 25 },
        { code: 'GC0102', libelle: 'Mise à jour de la base des ouvrages', localite: 'Abidjan', acteur: 'Spécialiste SIG UGP',
          debutPrevu: '2026-03-02', finPrevue: '2026-09-30', releves: [], debutReel: null, finReel: null,
          cloturee: false, qtePrevue: 380, qteReelle: 0, unite: 'ouvrages géoréférencés', poids: 20 },
        { code: 'GC0103', libelle: 'Revue à mi-parcours du projet', localite: 'Abidjan', acteur: 'Coordination UGP',
          debutPrevu: '2026-09-01', finPrevue: '2026-11-27', releves: ['2026-T3'], debutReel: '2026-09-14', finReel: '2026-09-29',
          cloturee: false, qtePrevue: 4, qteReelle: 1, unite: 'missions de terrain', poids: 30 },
        { code: 'GC0104', libelle: 'Atelier régional de capitalisation', localite: 'Bouaké', acteur: 'Spécialiste communication UGP',
          debutPrevu: '2026-12-07', finPrevue: '2026-12-11', releves: [], debutReel: null, finReel: null,
          cloturee: false, qtePrevue: 1, qteReelle: 0, unite: 'atelier', poids: 25 }
      ]
    }
  ],

  horizons: [
    { n: 1, titre: 'Rendre le chiffre juste' },
    { n: 2, titre: "Rendre l'écran actionnable" },
    { n: 3, titre: 'Changer ce qui est mesuré' }
  ],

  propositions: [
    { id: 'P1',  horizon: 1, titre: 'Ratio inversé, borné à 100 %', description: 'Le pourcentage devient réel ÷ prévu, plafonné à 100 % : il monte à chaque relevé au lieu de descendre.' },
    { id: 'P2',  horizon: 1, titre: 'Trois états de barre', description: "Sans relevé, la barre passe en pointillés au lieu d'afficher 0 % ; le débordement après la fin prévue apparaît en hachures." },
    { id: 'P3',  horizon: 1, titre: 'Retard en jours', description: "Les activités échues ou clôturées en retard affichent leur écart en jours, jusqu'à aujourd'hui ou jusqu'à la fin réelle." },
    { id: 'P4',  horizon: 2, titre: 'Période réelle sous le prévu', description: 'Une barre fine sous la barre prévue montre la période réellement couverte par les relevés.' },
    { id: 'P5',  horizon: 2, titre: 'Bande de synthèse', description: "Quatre compteurs ouvrent l'écran : en retard, sans suivi, échéance sous 30 jours, clôturées. Un clic filtre." },
    { id: 'P6',  horizon: 2, titre: 'Couleur et forme par état', description: 'Chaque état a sa couleur et sa forme : rond, triangle, carré, croix, coche, cercle vide.' },
    { id: 'P7',  horizon: 2, titre: "Ligne « aujourd'hui »", description: 'Un trait vertical au 14 octobre 2026 : une barre non clôturée qui finit à sa gauche est en dépassement.' },
    { id: 'P8',  horizon: 2, titre: 'Infobulle riche', description: 'Au survol : dates prévues et réelles, responsable, relevés, écart en jours et pourcentage exact.' },
    { id: 'P9',  horizon: 3, titre: 'Taux de réalisation', description: 'Une colonne compare quantités réalisées et prévues : GB0103 a consommé son calendrier pour 17 % de réalisation.' },
    { id: 'P10', horizon: 3, titre: 'Pondération du cadre logique', description: "L'avancement d'un résultat devient la moyenne de ses activités pondérée par leur poids au cadre logique." },
    { id: 'P11', horizon: 3, titre: 'Dates de terrain au jour près', description: 'Le réel part des dates observées, pas des bornes de trimestre : GC0103 ne démarre plus au 1er juillet.' }
  ]
};
