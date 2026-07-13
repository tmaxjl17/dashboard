/* =========================================================
   DONNÃ‰ES DU DASHBOARD ACTIVITY
   Source GeoJSON : geoBoundaries (Open Data, fond CIV ADM0/1/2)
   ========================================================= */

const ACTIVITY_DATA = {

  // === Niveaux géographiques ===
  // nameProp = propriété du GeoJSON utilisée pour matcher les régions des données
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

  // === Jalons projet sur la timeline ===
  milestones: [
    { date: '2011-02-02', label: 'Démarrage du projet',         type: 'start',     icon: 'fa-flag',          desc: 'Lancement officiel et inauguration des premiÃ¨res équipes terrain' },
    { date: '2012-06-15', label: 'Premier puit réhabilité',     type: 'event',     icon: 'fa-droplet',       desc: 'Inauguration du premier ouvrage Ã  Lacs' },
    { date: '2013-12-20', label: 'Examen mi-parcours',          type: 'review',    icon: 'fa-magnifying-glass', desc: 'Revue Ã  mi-parcours du projet par le comité de pilotage' },
    { date: '2015-04-10', label: 'Pic de réalisation 2015',     type: 'event',     icon: 'fa-arrow-up',      desc: '2 580 puits réhabilités cumulés en avril 2015' },
    { date: '2016-06-30', label: 'Examen semestriel',           type: 'review',    icon: 'fa-magnifying-glass', desc: 'Revue intermédiaire' },
    { date: '2018-03-31', label: 'Fin transhumance',            type: 'milestone', icon: 'fa-route',         desc: 'AchÃ¨vement de la mise en place des balises et pistes' },
    { date: '2019-12-31', label: 'Ã‰valuation finale',           type: 'review',    icon: 'fa-clipboard-check', desc: 'Ã‰valuation finale du projet par évaluateurs externes' },
    { date: '2020-12-31', label: 'ClÃ´ture du projet',           type: 'end',       icon: 'fa-flag-checkered', desc: 'Fin officielle du projet et remise des rapports finaux' }
  ],

  // === Liste des activités ===
  activities: [
    {
      code: 'GA0101',
      name: 'Well rehabilitation',
      unit: 'EXISTINSTN',
      responsible: 'CREDO2: M&E Specialist',
      startDate: '2011-02-02',
      endDate: '2015-12-14',
      status: 'En cours',
      comments: 'La réhabilitation des puits démarrera prioritairement dans les villages où les agents du RGPH (Recensement Général de la Population et de l\'Habitat) sont passés et les besoins ont été Ã  nouveau rappelés par les populations de ces villages.',
      kpis: {
        level0: {
          budget: 16.16, physique: 347.72, achievement: 100,
          regions: { 'CÃ´te dâ€™Ivoire': { budget: 16.16, physique: 347.72, achievement: 100 } }
        },
        level1: {
          budget: 16.16, physique: 347.72, achievement: 100,
          regions: {
            'Bas-Sassandra':                         { budget: 8,  physique: 245, achievement: 65 },
            'Comoe':                                 { budget: 11, physique: 270, achievement: 60 },
            'Denguele':                              { budget: 4,  physique: 160, achievement: 30 },
            "District Autonome D'Abidjan":           { budget: 22, physique: 380, achievement: 100 },
            'District Autonome De Yamoussoukro':     { budget: 18, physique: 320, achievement: 88 },
            'Goh-Djiboua':                           { budget: 12, physique: 285, achievement: 72 },
            'Lacs':                                  { budget: 22, physique: 380, achievement: 100 },
            'Lagunes':                               { budget: 12, physique: 280, achievement: 88 },
            'Montagnes':                             { budget: 14, physique: 290, achievement: 70 },
            'Sassandra-Marahoue':                    { budget: 10, physique: 250, achievement: 50 },
            'Savanes':                               { budget: 5,  physique: 180, achievement: 35 },
            'Valle Du Bandama':                      { budget: 18, physique: 310, achievement: 95 },
            'Woroba':                                { budget: 9,  physique: 260, achievement: 55 },
            'Zanzan':                                { budget: 7,  physique: 220, achievement: 45 }
          }
        },
        level2: { budget: 16.16, physique: 347.72, achievement: 100, regions: {} }
      },
      yearly: {
        labels: [2011, 2012, 2013, 2014, 2015],
        budget:   [1800, 50, 0, 0, 2550],
        physique: [950,  1100, null, null, 2580]
      }
    },
    {
      code: 'GA0102',
      name: 'Construction de nouveaux puits',
      unit: 'NEW_WELLS',
      responsible: 'CREDO2: M&E Specialist',
      startDate: '2011-03-15',
      endDate: '2016-06-30',
      status: 'En cours',
      comments: 'Construction de puits dans les zones identifiées comme prioritaires lors du diagnostic initial du projet.',
      kpis: {
        level0: {
          budget: 42, physique: 78, achievement: 65,
          regions: { 'CÃ´te dâ€™Ivoire': { budget: 42, physique: 78, achievement: 65 } }
        },
        level1: {
          budget: 42, physique: 78, achievement: 65,
          regions: {
            'Bas-Sassandra':                         { budget: 30, physique: 55, achievement: 45 },
            'Comoe':                                 { budget: 45, physique: 70, achievement: 65 },
            'Denguele':                              { budget: 18, physique: 35, achievement: 25 },
            "District Autonome D'Abidjan":           { budget: 55, physique: 85, achievement: 78 },
            'District Autonome De Yamoussoukro':     { budget: 50, physique: 78, achievement: 72 },
            'Goh-Djiboua':                           { budget: 42, physique: 67, achievement: 60 },
            'Lacs':                                  { budget: 55, physique: 85, achievement: 75 },
            'Lagunes':                               { budget: 38, physique: 65, achievement: 60 },
            'Montagnes':                             { budget: 35, physique: 62, achievement: 55 },
            'Sassandra-Marahoue':                    { budget: 40, physique: 68, achievement: 62 },
            'Savanes':                               { budget: 22, physique: 40, achievement: 30 },
            'Valle Du Bandama':                      { budget: 48, physique: 72, achievement: 68 },
            'Woroba':                                { budget: 32, physique: 58, achievement: 50 },
            'Zanzan':                                { budget: 28, physique: 50, achievement: 40 }
          }
        },
        level2: { budget: 42, physique: 78, achievement: 65, regions: {} }
      },
      yearly: {
        labels: [2011, 2012, 2013, 2014, 2015, 2016],
        budget:   [200, 450, 600, 750, 850, 1100],
        physique: [180, 420, 580, 720, 900, 1280]
      }
    },
    {
      code: 'GA0103',
      name: 'Fermeture des points d\'eau existants',
      unit: 'CLOSE_WP',
      responsible: 'CREDO2: M&E Specialist',
      startDate: '2012-01-01',
      endDate: '2014-12-31',
      status: 'Terminé',
      comments: 'Fermeture des points d\'eau identifiés comme dégradés ou contaminés.',
      kpis: {
        level0: {
          budget: 95, physique: 92, achievement: 100,
          regions: { 'CÃ´te dâ€™Ivoire': { budget: 95, physique: 92, achievement: 100 } }
        },
        level1: {
          budget: 95, physique: 92, achievement: 100,
          regions: {
            'Lacs':                                  { budget: 100, physique: 95, achievement: 100 },
            'Lagunes':                               { budget: 92,  physique: 88, achievement: 100 },
            'Savanes':                               { budget: 85,  physique: 82, achievement: 90 },
            'Valle Du Bandama':                      { budget: 98,  physique: 95, achievement: 100 },
            'Comoe':                                 { budget: 90,  physique: 88, achievement: 95 }
          }
        },
        level2: { budget: 95, physique: 92, achievement: 100, regions: {} }
      },
      yearly: {
        labels: [2012, 2013, 2014],
        budget:   [400, 750, 950],
        physique: [380, 720, 920]
      }
    },
    {
      code: 'GA0104',
      name: 'Ã‰tudes et forages d\'essai',
      unit: 'STUDIES',
      responsible: 'CREDO2: M&E Specialist',
      startDate: '2011-06-01',
      endDate: '2013-12-31',
      status: 'Terminé',
      comments: 'Ã‰tudes hydrogéologiques et forages exploratoires pour identifier les nappes.',
      kpis: {
        level0: {
          budget: 110, physique: 105, achievement: 100,
          regions: { 'CÃ´te dâ€™Ivoire': { budget: 110, physique: 105, achievement: 100 } }
        },
        level1: {
          budget: 110, physique: 105, achievement: 100,
          regions: {
            'Lacs':         { budget: 120, physique: 115, achievement: 100 },
            'Bas-Sassandra':{ budget: 105, physique: 100, achievement: 100 },
            'Montagnes':    { budget: 95,  physique: 92,  achievement: 100 },
            'Goh-Djiboua':  { budget: 108, physique: 102, achievement: 100 }
          }
        },
        level2: { budget: 110, physique: 105, achievement: 100, regions: {} }
      },
      yearly: {
        labels: [2011, 2012, 2013],
        budget:   [350, 720, 1100],
        physique: [320, 680, 1050]
      }
    },
    {
      code: 'GA0105',
      name: 'Balises et pistes de transhumance',
      unit: 'TRANSHUM',
      responsible: 'CREDO2: M&E Specialist',
      startDate: '2013-04-01',
      endDate: '2018-03-31',
      status: 'En cours',
      comments: 'Mise en place de balises et matérialisation des pistes de transhumance pour réduire les conflits agriculteurs-éleveurs.',
      kpis: {
        level0: {
          budget: 28, physique: 35, achievement: 42,
          regions: { 'CÃ´te dâ€™Ivoire': { budget: 28, physique: 35, achievement: 42 } }
        },
        level1: {
          budget: 28, physique: 35, achievement: 42,
          regions: {
            'Savanes':           { budget: 45, physique: 55, achievement: 65 },
            'Zanzan':            { budget: 38, physique: 48, achievement: 55 },
            'Woroba':            { budget: 32, physique: 40, achievement: 48 },
            'Denguele':          { budget: 15, physique: 22, achievement: 25 },
            'Valle Du Bandama':  { budget: 22, physique: 30, achievement: 35 }
          }
        },
        level2: { budget: 28, physique: 35, achievement: 42, regions: {} }
      },
      yearly: {
        labels: [2013, 2014, 2015, 2016, 2017, 2018],
        budget:   [120, 280, 420, 580, 720, 850],
        physique: [150, 320, 480, 650, 800, 980]
      }
    },
    {
      code: 'GA0106',
      name: 'Animation, organisation des négociations',
      unit: 'NEGOCIATIONS',
      responsible: 'CREDO2: M&E Specialist',
      startDate: '2011-09-01',
      endDate: '2020-12-31',
      status: 'En cours',
      comments: 'Animation communautaire et organisation des sessions de négociation entre parties prenantes.',
      kpis: {
        level0: {
          budget: 68, physique: 72, achievement: 75,
          regions: { 'CÃ´te dâ€™Ivoire': { budget: 68, physique: 72, achievement: 75 } }
        },
        level1: {
          budget: 68, physique: 72, achievement: 75,
          regions: {
            'Lacs':                                  { budget: 80, physique: 85, achievement: 88 },
            'Valle Du Bandama':                      { budget: 72, physique: 78, achievement: 80 },
            'Savanes':                               { budget: 55, physique: 60, achievement: 65 },
            'Zanzan':                                { budget: 50, physique: 55, achievement: 60 },
            'Lagunes':                               { budget: 75, physique: 80, achievement: 82 },
            "District Autonome D'Abidjan":           { budget: 82, physique: 88, achievement: 90 }
          }
        },
        level2: { budget: 68, physique: 72, achievement: 75, regions: {} }
      },
      yearly: {
        labels: [2011, 2013, 2015, 2017, 2019, 2020],
        budget:   [100, 280, 480, 680, 880, 1050],
        physique: [110, 295, 510, 710, 920, 1100]
      }
    }
  ]
};
