/* =========================================================
   CHART.JS - Configuration partagée + factories
   ========================================================= */

const CHART_DEFAULTS = {
  font: { family: "'Inter', sans-serif", size: 12 },
  legend: {
    position: 'bottom',
    labels: { padding: 16, font: { size: 12 }, usePointStyle: true, pointStyle: 'circle' }
  },
  tooltip: {
    backgroundColor: '#1F2937',
    padding: 12,
    cornerRadius: 8,
    titleFont: { size: 13, weight: '600' },
    bodyFont: { size: 12 },
    boxPadding: 4
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: { color: '#F3F4F6' },
      ticks: { font: { size: 11 }, color: '#6B7280' }
    },
    x: {
      grid: { display: false },
      ticks: { font: { size: 11, weight: '600' }, color: '#374151' }
    }
  }
};

// Helper pour créer un dégradé vertical
function makeGradient(ctx, height, color, fromAlpha = 0.4, toAlpha = 0) {
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, color.replace(')', `, ${fromAlpha})`).replace('rgb', 'rgba'));
  g.addColorStop(1, color.replace(')', `, ${toAlpha})`).replace('rgb', 'rgba'));
  return g;
}

// Dégradé bleu primary
function makeBlueGradient(ctx, height = 320, fromAlpha = 0.4) {
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, `rgba(33,150,243,${fromAlpha})`);
  g.addColorStop(1, 'rgba(33,150,243,0)');
  return g;
}

// === Chart Indicateur (ligne avec cible pointillée) ===
function buildIndicatorChart(canvas, indicator) {
  const ctx = canvas.getContext('2d');
  const labels = ['Référence', ...Object.keys(indicator.years)];
  const values = [indicator.ref ?? 0, ...Object.values(indicator.years)];

  return new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Valeur relevée',
          data: values,
          borderColor: '#2196F3',
          backgroundColor: makeBlueGradient(ctx),
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#fff',
          pointBorderColor: '#2196F3',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7
        },
        {
          label: 'Cible',
          data: labels.map(() => indicator.target ?? null),
          borderColor: '#10B981',
          borderWidth: 2,
          borderDash: [6, 6],
          fill: false,
          pointRadius: 0,
          tension: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: CHART_DEFAULTS.legend,
        tooltip: CHART_DEFAULTS.tooltip
      },
      scales: CHART_DEFAULTS.scales
    }
  });
}

// === Donut activités ===
function buildDonut(canvas, data) {
  const ctx = canvas.getContext('2d');
  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.labels,
      datasets: [{
        data: data.values,
        backgroundColor: data.colors,
        borderColor: '#fff',
        borderWidth: 3,
        hoverOffset: 12
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '70%',
      plugins: {
        legend: { display: false },
        tooltip: {
          ...CHART_DEFAULTS.tooltip,
          callbacks: {
            label: (ctx) => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = ((ctx.raw / total) * 100).toFixed(1);
              return `${ctx.label}: ${ctx.raw} activité(s) (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

// === Évolution activités (bar + line combo) ===
function buildActivitiesEvolution(canvas, quarters) {
  const ctx = canvas.getContext('2d');
  const gradient = makeBlueGradient(ctx, 360);

  return new Chart(ctx, {
    data: {
      labels: quarters.labels,
      datasets: [
        {
          type: 'bar',
          label: 'Taux physique',
          data: quarters.physique,
          backgroundColor: gradient,
          borderColor: '#2196F3',
          borderWidth: 2,
          borderRadius: 8,
          barThickness: 60
        },
        {
          type: 'line',
          label: 'Taux budgétaire',
          data: quarters.budget,
          borderColor: '#EF4444',
          backgroundColor: '#EF4444',
          borderWidth: 3,
          tension: 0.35,
          pointBackgroundColor: '#fff',
          pointBorderColor: '#EF4444',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: CHART_DEFAULTS.legend,
        tooltip: {
          ...CHART_DEFAULTS.tooltip,
          callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}%` }
        }
      },
      scales: {
        y: {
          ...CHART_DEFAULTS.scales.y,
          max: 100,
          ticks: { ...CHART_DEFAULTS.scales.y.ticks, callback: v => v + '%' }
        },
        x: CHART_DEFAULTS.scales.x
      }
    }
  });
}

// === Évolution décaissement (ligne + cible) ===
function buildFinancialEvolution(canvas, evolution) {
  const ctx = canvas.getContext('2d');
  const grad = makeBlueGradient(ctx, 320, 0.35);

  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: evolution.labels,
      datasets: [
        {
          label: 'Taux décaissement',
          data: evolution.actual,
          borderColor: '#2196F3',
          backgroundColor: grad,
          fill: true,
          tension: 0.35,
          borderWidth: 3,
          pointBackgroundColor: '#fff',
          pointBorderColor: '#2196F3',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7
        },
        {
          label: 'Cible',
          data: evolution.target,
          borderColor: '#10B981',
          borderWidth: 2,
          borderDash: [6, 6],
          pointRadius: 0,
          fill: false,
          tension: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: CHART_DEFAULTS.legend,
        tooltip: {
          ...CHART_DEFAULTS.tooltip,
          callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y}%` }
        }
      },
      scales: {
        y: {
          ...CHART_DEFAULTS.scales.y,
          max: 100,
          ticks: { ...CHART_DEFAULTS.scales.y.ticks, callback: v => v + '%' }
        },
        x: CHART_DEFAULTS.scales.x
      }
    }
  });
}

// === Donut sources financières ===
function buildSourceDonut(canvas, sources, fmt) {
  const ctx = canvas.getContext('2d');
  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: sources.map(s => s.name),
      datasets: [{
        data: sources.map(s => s.decaisse),
        backgroundColor: sources.map(s => s.color),
        borderColor: '#fff',
        borderWidth: 4,
        hoverOffset: 14
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { padding: 14, font: { size: 11 }, usePointStyle: true, pointStyle: 'circle', boxWidth: 8 }
        },
        tooltip: {
          ...CHART_DEFAULTS.tooltip,
          callbacks: {
            label: ctx => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = ((ctx.raw / total) * 100).toFixed(1);
              return ` ${fmt(ctx.raw)} CAD (${pct}%)`;
            }
          }
        }
      }
    }
  });
}
