/* =========================================================
   ONGLET ACTIVITÉS - Logique
   ========================================================= */

const Activites = (() => {
  let initialized = false;

  function makeLegend(elId, data, chart) {
    const el = document.getElementById(elId);
    el.innerHTML = data.labels.map((l, i) => `
      <div class="legend-item" data-idx="${i}">
        <span class="legend-item__dot" style="background:${data.colors[i]}"></span>
        <span class="legend-item__label">${l}</span>
        <span class="legend-item__count">${data.values[i]}</span>
      </div>
    `).join('');

    el.querySelectorAll('.legend-item').forEach(item => {
      item.addEventListener('mouseenter', () => {
        chart.setActiveElements([{ datasetIndex: 0, index: +item.dataset.idx }]);
        chart.update();
      });
      item.addEventListener('mouseleave', () => {
        chart.setActiveElements([]);
        chart.update();
      });
    });
  }

  function initYearPills() {
    const pillsEl = document.getElementById('yearPills');
    const { years, activeYear } = DASHBOARD_DATA.activities;

    pillsEl.innerHTML = years.map(y =>
      `<button class="year-pill ${y === activeYear ? 'active' : ''}" data-year="${y}">${y}</button>`
    ).join('');

    pillsEl.querySelectorAll('.year-pill').forEach(p => {
      p.addEventListener('click', () => {
        pillsEl.querySelectorAll('.year-pill').forEach(x => x.classList.remove('active'));
        p.classList.add('active');
      });
    });
  }

  function init() {
    if (initialized) return;
    const data = DASHBOARD_DATA.activities;

    const chartP = buildDonut(document.getElementById('donutPhysique'), data.physique);
    const chartB = buildDonut(document.getElementById('donutBudget'), data.budget);
    makeLegend('legendPhysique', data.physique, chartP);
    makeLegend('legendBudget', data.budget, chartB);

    initYearPills();
    buildActivitiesEvolution(document.getElementById('evoChart'), data.quarters);

    initialized = true;
  }

  return { init };
})();
