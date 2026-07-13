/* =========================================================
   PATCH des couleurs Chart.js pour le thème Soft / Editorial
   ========================================================= */

const SOFT_GRID = 'rgba(181,194,204,0.35)';
const SOFT_TICK = '#6A7884';
const SOFT_TICK_STRONG = '#4D5A65';

const THEME = {
  primary: '#137EB4',
  primaryRGB: '19,126,180',
  primaryDark: '#0F6796',
  success: '#7BA888',
  warning: '#D4A574',
  danger: '#C97B7B',
  info: '#8FAFC7',
  bgSurface: '#FFFFFF'
};

document.addEventListener('DOMContentLoaded', () => {
  if (typeof CHART_DEFAULTS === 'undefined') return;

  CHART_DEFAULTS.tooltip.backgroundColor = '#131A20';
  CHART_DEFAULTS.tooltip.titleColor = '#F1F6F9';
  CHART_DEFAULTS.tooltip.bodyColor = '#D2DDE5';
  CHART_DEFAULTS.tooltip.padding = 14;
  CHART_DEFAULTS.tooltip.cornerRadius = 12;
  CHART_DEFAULTS.tooltip.titleFont = { size: 13, weight: '500', family: "'Fraunces', Georgia, serif" };
  CHART_DEFAULTS.tooltip.bodyFont = { size: 12, family: "'Inter', sans-serif" };

  CHART_DEFAULTS.scales.y.grid.color = SOFT_GRID;
  CHART_DEFAULTS.scales.y.grid.lineWidth = 1;
  CHART_DEFAULTS.scales.y.ticks.color = SOFT_TICK;
  CHART_DEFAULTS.scales.x.ticks.color = SOFT_TICK_STRONG;
  CHART_DEFAULTS.scales.x.ticks.font = { size: 12, weight: '500', family: "'Inter', sans-serif" };

  CHART_DEFAULTS.legend.labels.color = SOFT_TICK_STRONG;
  CHART_DEFAULTS.legend.labels.font = { size: 13, family: "'Inter', sans-serif" };
  CHART_DEFAULTS.legend.labels.padding = 20;
});

// Override gradient avec terracotta doux
function makeBlueGradient(ctx, height = 320, fromAlpha = 0.3) {
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, `rgba(${THEME.primaryRGB},${fromAlpha})`);
  g.addColorStop(1, `rgba(${THEME.primaryRGB},0)`);
  return g;
}

// === Indicateur ===
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
          borderColor: THEME.primary,
          backgroundColor: makeBlueGradient(ctx),
          borderWidth: 2.5,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#fff',
          pointBorderColor: THEME.primary,
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 8
        },
        {
          label: 'Cible',
          data: labels.map(() => indicator.target ?? null),
          borderColor: THEME.success,
          borderWidth: 2,
          borderDash: [4, 6],
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
        borderWidth: 4,
        hoverOffset: 16,
        hoverBorderWidth: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '72%',
      plugins: {
        legend: { display: false },
        tooltip: {
          ...CHART_DEFAULTS.tooltip,
          callbacks: {
            label: (ctx) => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = ((ctx.raw / total) * 100).toFixed(1);
              return `${ctx.label} · ${ctx.raw} activité(s) · ${pct}%`;
            }
          }
        }
      }
    }
  });
}

// === Évolution activités (combo) ===
function buildActivitiesEvolution(canvas, quarters) {
  const ctx = canvas.getContext('2d');
  const gradient = makeBlueGradient(ctx, 360, 0.35);

  return new Chart(ctx, {
    data: {
      labels: quarters.labels,
      datasets: [
        {
          type: 'bar',
          label: 'Taux physique',
          data: quarters.physique,
          backgroundColor: gradient,
          borderColor: 'rgba(201,123,91,0.4)',
          borderWidth: 1,
          borderRadius: 12,
          barThickness: 56
        },
        {
          type: 'line',
          label: 'Taux budgétaire',
          data: quarters.budget,
          borderColor: THEME.success,
          backgroundColor: THEME.success,
          borderWidth: 2.5,
          tension: 0.4,
          pointBackgroundColor: '#fff',
          pointBorderColor: THEME.success,
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
          callbacks: { label: (ctx) => `${ctx.dataset.label} · ${ctx.parsed.y}%` }
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

// === Évolution financière ===
function buildFinancialEvolution(canvas, evolution) {
  const ctx = canvas.getContext('2d');
  const grad = makeBlueGradient(ctx, 320, 0.3);

  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: evolution.labels,
      datasets: [
        {
          label: 'Taux décaissement',
          data: evolution.actual,
          borderColor: THEME.primary,
          backgroundColor: grad,
          fill: true,
          tension: 0.4,
          borderWidth: 2.5,
          pointBackgroundColor: '#fff',
          pointBorderColor: THEME.primary,
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 8
        },
        {
          label: 'Cible',
          data: evolution.target,
          borderColor: THEME.success,
          borderWidth: 2,
          borderDash: [4, 6],
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
          callbacks: { label: ctx => `${ctx.dataset.label} · ${ctx.parsed.y}%` }
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

// === Donut sources ===
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
        borderWidth: 5,
        hoverOffset: 18
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '74%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { padding: 18, font: { size: 12, family: "'Inter', sans-serif" }, color: SOFT_TICK_STRONG, usePointStyle: true, pointStyle: 'circle', boxWidth: 10 }
        },
        tooltip: {
          ...CHART_DEFAULTS.tooltip,
          callbacks: {
            label: ctx => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = ((ctx.raw / total) * 100).toFixed(1);
              return ` ${fmt(ctx.raw)} CAD · ${pct}%`;
            }
          }
        }
      }
    }
  });
}
