/* =========================================================
   DONNÃ‰ES DU DASHBOARD INDICATEURS
   ========================================================= */

const INDICATOR_DATA = {

  // === Niveaux géographiques (mÃªmes que activity) ===
  geoLevels: [
    {
      id: 'level0',
      label: 'Country / Pays',
      geoUrl: '../../shared/geo/civ-adm0.geojson',
      nameProp: 'shapeName'
    },
    {
      id: 'level1',
      label: 'Geography level 2 (Districts)',
      geoUrl: '../../shared/geo/civ-adm1.geojson',
      nameProp: 'shapeName'
    },
    {
      id: 'level2',
      label: 'Geography level 3 (Régions)',
      geoUrl: '../../shared/geo/civ-adm2.geojson',
      nameProp: 'shapeName'
    }
  ],

  // === Liste des indicateurs ===
  indicators: [
    {
      code: '%BENEF_DEMO',
      name: '% Bénéficiaires',
      definition: "Pourcentage de la population cible ayant bénéficié des actions du projet sur la période évaluée. Mesure l'effectivité de la couverture.",
      unit: '%',
      type: 'Cumulatif',
      direction: 'asc',          // asc = doit augmenter | desc = doit diminuer
      validated: true,
      startDate: '2011-01-01',
      endDate:   '2020-12-31',
      reference: 0.8,
      target: 45,
      // Série temporelle (CÃ´te d'Ivoire)
      timeline: {
        labels: ['Référence', 'S1 2011', 'S2 2011', 'S1 2012', 'S2 2012', 'S1 2013', 'S2 2013', 'S1 2014', 'S2 2014', 'S1 2015', 'S2 2015', 'S1 2016', 'S2 2016'],
        actual: [0.8, 0.5, 1.2, 2.5, 4.0, 6.5, 9.8, 12.5, 14.8, 18.0, 22.0, 28.0, 30.0],
        target: [0.8, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 42, 45]
      },
      // Valeurs par niveau géographique
      kpis: {
        level0: {
          actual: 30.0,
          regions: { 'CÃ´te dâ€™Ivoire': 30.0 }
        },
        level1: {
          actual: 30.0,
          regions: {
            'Bas-Sassandra':                     12.5,
            'Comoe':                             18.5,
            'Denguele':                          5.0,
            "District Autonome D'Abidjan":       45.5,
            'District Autonome De Yamoussoukro': 38.0,
            'Goh-Djiboua':                       22.0,
            'Lacs':                              48.5,
            'Lagunes':                           35.0,
            'Montagnes':                         16.0,
            'Sassandra-Marahoue':                20.0,
            'Savanes':                           8.5,
            'Valle Du Bandama':                  41.0,
            'Woroba':                            14.5,
            'Zanzan':                            10.0
          }
        },
        level2: { actual: 30.0, regions: {} }
      }
    },
    {
      code: '#PUITS_REHAB',
      name: 'Nombre de puits réhabilités',
      definition: "Cumul des points d'eau remis en état de fonctionnement Ã  travers le projet, vérifiés par les services techniques.",
      unit: 'unités',
      type: 'Cumulatif',
      direction: 'asc',
      validated: true,
      startDate: '2011-01-01',
      endDate:   '2020-12-31',
      reference: 0,
      target: 500,
      timeline: {
        labels: ['Référence', '2011', '2012', '2013', '2014', '2015', '2016', '2017', '2018', '2019', '2020'],
        actual: [0, 25, 80, 145, 220, 290, 355, 410, 450, 480, 495],
        target: [0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500]
      },
      kpis: {
        level0: { actual: 495, regions: { 'CÃ´te dâ€™Ivoire': 495 } },
        level1: {
          actual: 495,
          regions: {
            'Bas-Sassandra':                     38,
            'Comoe':                             42,
            'Denguele':                          15,
            "District Autonome D'Abidjan":       72,
            'District Autonome De Yamoussoukro': 55,
            'Goh-Djiboua':                       35,
            'Lacs':                              68,
            'Lagunes':                           45,
            'Montagnes':                         28,
            'Sassandra-Marahoue':                32,
            'Savanes':                           20,
            'Valle Du Bandama':                  62,
            'Woroba':                            22,
            'Zanzan':                            18
          }
        },
        level2: { actual: 495, regions: {} }
      }
    },
    {
      code: '%CONFLITS',
      name: 'Réduction des conflits ruraux',
      definition: "Pourcentage de réduction du nombre de conflits opposant agriculteurs et éleveurs, par rapport Ã  la situation de référence.",
      unit: '%',
      type: 'Annuel',
      direction: 'asc',          // doit augmenter (% de réduction)
      validated: true,
      startDate: '2011-01-01',
      endDate:   '2020-12-31',
      reference: 0,
      target: 60,
      timeline: {
        labels: ['Référence', '2012', '2013', '2014', '2015', '2016', '2017', '2018', '2019', '2020'],
        actual: [0, 5, 12, 18, 28, 35, 42, 48, 52, 55],
        target: [0, 6, 12, 18, 24, 30, 36, 42, 48, 60]
      },
      kpis: {
        level0: { actual: 55, regions: { 'CÃ´te dâ€™Ivoire': 55 } },
        level1: {
          actual: 55,
          regions: {
            'Bas-Sassandra':                     50,
            'Comoe':                             58,
            'Denguele':                          25,
            "District Autonome D'Abidjan":       70,
            'District Autonome De Yamoussoukro': 65,
            'Goh-Djiboua':                       55,
            'Lacs':                              72,
            'Lagunes':                           62,
            'Montagnes':                         48,
            'Sassandra-Marahoue':                52,
            'Savanes':                           32,
            'Valle Du Bandama':                  68,
            'Woroba':                            38,
            'Zanzan':                            30
          }
        },
        level2: { actual: 55, regions: {} }
      }
    },
    {
      code: '#JEUNES_FORM',
      name: 'Jeunes formés aux métiers ruraux',
      definition: "Nombre cumulé de jeunes (15-35 ans) ayant bénéficié des sessions de formation aux métiers ruraux organisées par le projet.",
      unit: 'jeunes',
      type: 'Cumulatif',
      direction: 'asc',
      validated: false,           // non validé pour démontrer la case Ã  cocher
      startDate: '2013-01-01',
      endDate:   '2020-12-31',
      reference: 0,
      target: 2000,
      timeline: {
        labels: ['Référence', '2013', '2014', '2015', '2016', '2017', '2018', '2019', '2020'],
        actual: [0, 120, 320, 580, 850, 1150, 1420, 1680, 1850],
        target: [0, 250, 500, 750, 1000, 1250, 1500, 1750, 2000]
      },
      kpis: {
        level0: { actual: 1850, regions: { 'CÃ´te dâ€™Ivoire': 1850 } },
        level1: {
          actual: 1850,
          regions: {
            'Bas-Sassandra':                     145,
            'Comoe':                             168,
            'Denguele':                          62,
            "District Autonome D'Abidjan":       320,
            'District Autonome De Yamoussoukro': 220,
            'Goh-Djiboua':                       138,
            'Lacs':                              275,
            'Lagunes':                           185,
            'Montagnes':                         95,
            'Savanes':                           75,
            'Valle Du Bandama':                  165
          }
        },
        level2: { actual: 1850, regions: {} }
      }
    },
    {
      code: '%ABANDON',
      name: 'Taux d\'abandon scolaire',
      definition: "Pourcentage d'élÃ¨ves abandonnant l'école primaire en cours d'année dans les zones du projet. Doit diminuer pour montrer une amélioration.",
      unit: '%',
      type: 'Annuel',
      direction: 'desc',          // doit DIMINUER (taux d'abandon)
      validated: true,
      startDate: '2011-01-01',
      endDate:   '2020-12-31',
      reference: 18,
      target: 5,
      timeline: {
        labels: ['Référence', '2012', '2013', '2014', '2015', '2016', '2017', '2018', '2019', '2020'],
        actual: [18, 16.5, 14.8, 13.0, 11.5, 10.0, 9.0, 8.2, 7.5, 7.0],
        target: [18, 16, 14, 12, 10, 9, 8, 7, 6, 5]
      },
      kpis: {
        level0: { actual: 7.0, regions: { 'CÃ´te dâ€™Ivoire': 7.0 } },
        level1: {
          actual: 7.0,
          regions: {
            'Bas-Sassandra':                     8.5,
            'Comoe':                             6.8,
            'Denguele':                          11.0,
            "District Autonome D'Abidjan":       4.5,
            'District Autonome De Yamoussoukro': 5.5,
            'Goh-Djiboua':                       7.2,
            'Lacs':                              5.0,
            'Lagunes':                           5.8,
            'Montagnes':                         9.5,
            'Sassandra-Marahoue':                7.8,
            'Savanes':                           12.0,
            'Valle Du Bandama':                  6.2,
            'Woroba':                            10.5,
            'Zanzan':                            13.0
          }
        },
        level2: { actual: 7.0, regions: {} }
      }
    }
  ]
};
