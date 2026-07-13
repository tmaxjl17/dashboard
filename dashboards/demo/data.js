/* =========================================================
   DONNÉES DU DASHBOARD
   ========================================================= */

const DASHBOARD_DATA = {

  project: {
    startDate: '2011-01-01',
    endDate:   '2020-12-31'
  },

  milestones: [
    { name: 'Ceci est un jalon',          planned: '2012-06-01', actual: null         },
    { name: 'Examen Semestriel',          planned: '2016-06-30', actual: '2016-06-30' },
    { name: 'Évaluation finale du projet', planned: '2019-04-18', actual: null         },
    { name: 'Évaluation du projet',       planned: '2019-12-31', actual: '2019-12-31' },
    { name: 'Date marquée',               planned: '2022-07-08', actual: null         }
  ],

  indicators: [
    { code:'%BENEF_DEMO', name:'% Bénéficiaires',                    ref:0.9,  current:22.5, target:0.8, years:{2011:0.2, 2015:22.5}, progress:2813, sparkline:[0.9,0.2,5,12,22.5], validated:true  },
    { code:'001TESTIND_', name:'Test indicateur trans 17',           ref:0,    current:0,    target:0,   years:{2011:0},              progress:null, sparkline:[0,0,0,0],          validated:false },
    { code:'010102',      name:'% jeunes ayant utilisé services SRHR', ref:0,  current:0,    target:0,   years:{2011:0},              progress:0,    sparkline:[0,0,0,0],          validated:true  },
    { code:'012',         name:'BRD - 418',                          ref:null, current:null, target:null, years:{},                    progress:null, sparkline:[2,3,5,4,6],        validated:false }
  ],

  activities: {
    physique: {
      labels: ['0–39%', '50–60%', '61–80%', '100–300%'],
      values: [9, 1, 1, 3],
      colors: ['#EF4444', '#3B82F6', '#06B6D4', '#10B981']
    },
    budget: {
      labels: ['0–39%', '40–49%', '50–60%', '61–80%', '100–300%'],
      values: [9, 1, 1, 2, 3],
      colors: ['#EF4444', '#F59E0B', '#3B82F6', '#06B6D4', '#10B981']
    },
    years: [2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020],
    activeYear: 2020,
    quarters: {
      labels: ['T1 (mars)', 'T2 (juin)', 'T3 (sept.)', 'T4 (déc.)'],
      physique: [30, 78, 78, 78],
      budget:   [33, 74, 74, 74]
    }
  },

  financial: {
    sources: [
      { name: 'Banque Mondiale',          montant: 2500000000, decaisse: 1750000000, color: '#06B6D4' },
      { name: 'Budget National',          montant: 1326015000, decaisse: 1326015000, color: '#8B5CF6' },
      { name: 'Banque Africaine de Dév.', montant: 1500000000, decaisse:  500000000, color: '#10B981' }
    ],
    evolution: {
      labels: ['2011','2012','2013','2015','2016','2020','2021','2023'],
      actual: [4.5, 19, 25, 35, 58, 58, 68, 68],
      target: [10, 25, 40, 55, 65, 80, 90, 100]
    }
  }

};
