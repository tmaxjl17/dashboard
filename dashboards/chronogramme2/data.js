/* =========================================================
   CHRONOGRAMME — Option B · Écran cible
   Données de démonstration (projet fictif), situation au 14 octobre 2026.
   Par rapport à l'option A, chaque relevé validé porte sa date de terrain
   et la quantité constatée : c'est ce qui alimente le remplissage des barres,
   les crans de relevé, la courbe d'avancement et la projection de fin.
   ========================================================= */

const CHRONO_DATA = {
  projet: {
    sigle: 'PAEPA-R',
    composante: "Composante 1 — Accès durable à l'eau potable en milieu rural",
    ptba: 'PTBA 2026'
  },

  dateReference: '2026-10-14',
  debutFrise: '2026-01-01',
  finFrise: '2027-03-31',

  jalons: [
    { date: '2026-06-15', libelle: "Mission d'appui du bailleur" },
    { date: '2026-12-31', libelle: 'Clôture PTBA' }
  ],

  /* releves : relevés validés — période de découpage, date de collecte sur le terrain, quantité constatée
     debutReel : premier jour d'exécution observé · finReel : date de clôture (activités clôturées) */
  groupes: [
    {
      code: 'R1.1', libelle: "Points d'eau fonctionnels",
      activites: [
        { code: 'GA0101', libelle: 'Réhabilitation de 40 puits busés', localite: 'Korhogo', acteur: 'Entreprise de travaux — lot 1',
          debutPrevu: '2026-02-02', finPrevue: '2026-12-31', debutReel: '2026-02-16', finReel: null, cloturee: false,
          qtePrevue: 40, unite: 'puits', poids: 35,
          releves: [
            { periode: '2026-T1', date: '2026-03-27', qte: 6 },
            { periode: '2026-T2', date: '2026-06-22', qte: 11 }
          ] },
        { code: 'GA0102', libelle: 'Construction de 12 forages équipés', localite: 'Ferkessédougou', acteur: 'Entreprise de forage — lot 2',
          debutPrevu: '2026-01-15', finPrevue: '2026-06-30', debutReel: '2026-01-20', finReel: null, cloturee: false,
          qtePrevue: 12, unite: 'forages', poids: 40,
          releves: [
            { periode: '2026-T1', date: '2026-03-25', qte: 3 },
            { periode: '2026-T2', date: '2026-06-26', qte: 4 },
            { periode: '2026-T3', date: '2026-09-18', qte: 2 }
          ] },
        { code: 'GA0103', libelle: "Contrôle qualité de l'eau des ouvrages", localite: 'Korhogo', acteur: "Laboratoire régional d'analyses",
          debutPrevu: '2026-04-01', finPrevue: '2026-11-06', debutReel: null, finReel: null, cloturee: false,
          qtePrevue: 40, unite: 'analyses', poids: 10, releves: [] },
        { code: 'GA0104', libelle: 'Pose de 6 mini-adductions solaires', localite: 'Odienné', acteur: 'Entreprise de travaux — lot 3',
          debutPrevu: '2026-11-16', finPrevue: '2027-03-31', debutReel: null, finReel: null, cloturee: false,
          qtePrevue: 6, unite: 'systèmes', poids: 15, releves: [] }
      ]
    },
    {
      code: 'R1.2', libelle: 'Gestion communautaire assurée',
      activites: [
        { code: 'GB0101', libelle: 'Formation de 52 comités de gestion', localite: 'Bouaké', acteur: 'ONG partenaire — zone Centre',
          debutPrevu: '2026-03-02', finPrevue: '2026-07-31', debutReel: '2026-03-09', finReel: '2026-08-28', cloturee: true,
          qtePrevue: 52, unite: 'comités', poids: 30,
          releves: [
            { periode: '2026-T1', date: '2026-03-31', qte: 10 },
            { periode: '2026-T2', date: '2026-06-29', qte: 30 },
            { periode: '2026-T3', date: '2026-08-28', qte: 12 }
          ] },
        { code: 'GB0102', libelle: 'Formation de 24 artisans réparateurs', localite: 'Ferkessédougou', acteur: "Direction régionale de l'Hydraulique",
          debutPrevu: '2026-02-02', finPrevue: '2026-05-29', debutReel: '2026-02-03', finReel: '2026-05-27', cloturee: true,
          qtePrevue: 24, unite: 'artisans', poids: 15,
          releves: [
            { periode: '2026-T1', date: '2026-03-30', qte: 14 },
            { periode: '2026-T2', date: '2026-05-27', qte: 10 }
          ] },
        { code: 'GB0103', libelle: "Recouvrement des redevances d'eau", localite: 'Bouaké', acteur: 'Cellule technique UGP',
          debutPrevu: '2026-05-04', finPrevue: '2026-10-30', debutReel: '2026-05-11', finReel: null, cloturee: false,
          qtePrevue: 52, unite: 'comités en recouvrement', poids: 35,
          releves: [
            { periode: '2026-T2', date: '2026-06-30', qte: 3 },
            { periode: '2026-T3', date: '2026-09-24', qte: 6 }
          ] },
        { code: 'GB0104', libelle: 'Sensibilisation hygiène et lavage des mains', localite: 'Daloa', acteur: 'ONG partenaire — zone Ouest',
          debutPrevu: '2026-01-12', finPrevue: '2026-12-18', debutReel: '2026-01-19', finReel: null, cloturee: false,
          qtePrevue: 120, unite: 'séances', poids: 20,
          releves: [
            { periode: '2026-T1', date: '2026-03-27', qte: 30 },
            { periode: '2026-T2', date: '2026-06-26', qte: 32 },
            { periode: '2026-T3', date: '2026-09-30', qte: 26 }
          ] }
      ]
    },
    {
      code: 'R1.3', libelle: 'Suivi et capitalisation',
      activites: [
        { code: 'GC0101', libelle: "Enquête de référence sur l'accès à l'eau", localite: 'Man', acteur: 'Spécialiste suivi-évaluation UGP',
          debutPrevu: '2026-01-05', finPrevue: '2026-03-31', debutReel: '2026-01-07', finReel: '2026-03-27', cloturee: true,
          qtePrevue: 1, unite: 'rapport', poids: 25,
          releves: [
            { periode: '2026-T1', date: '2026-03-27', qte: 1 }
          ] },
        { code: 'GC0102', libelle: 'Mise à jour de la base des ouvrages', localite: 'Abidjan', acteur: 'Spécialiste SIG UGP',
          debutPrevu: '2026-03-02', finPrevue: '2026-09-30', debutReel: null, finReel: null, cloturee: false,
          qtePrevue: 380, unite: 'ouvrages géoréférencés', poids: 20, releves: [] },
        { code: 'GC0103', libelle: 'Revue à mi-parcours du projet', localite: 'Abidjan', acteur: 'Coordination UGP',
          debutPrevu: '2026-09-01', finPrevue: '2026-11-27', debutReel: '2026-09-14', finReel: null, cloturee: false,
          qtePrevue: 4, unite: 'missions de terrain', poids: 30,
          releves: [
            { periode: '2026-T3', date: '2026-09-29', qte: 1 }
          ] },
        { code: 'GC0104', libelle: 'Atelier régional de capitalisation', localite: 'Bouaké', acteur: 'Spécialiste communication UGP',
          debutPrevu: '2026-12-07', finPrevue: '2026-12-11', debutReel: null, finReel: null, cloturee: false,
          qtePrevue: 1, unite: 'atelier', poids: 25, releves: [] }
      ]
    }
  ]
};
