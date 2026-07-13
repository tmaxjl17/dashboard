/* =========================================================
   PATCH des couleurs Chart.js pour le thème dark
   À charger AVANT charts.js
   ========================================================= */

// Couleurs adaptées au thème dark
const DARK_GRID = 'rgba(148,163,184,0.1)';
const DARK_TICK = '#94A3B8';
const DARK_TICK_STRONG = '#CBD5E1';
const DARK_TOOLTIP_BG = 'rgba(15,23,42,0.95)';

// Couleurs primaires/secondaires du thème
const THEME = {
  primary: '#06B6D4',
  primaryRGB: '6,182,212',
  accent: '#A855F7',
  accentRGB: '168,85,247',
  success: '#10B981',
  danger: '#F43F5E',
  bgSurface: '#0F172A'
};

// Patche CHART_DEFAULTS dès que charts.js est chargé
document.addEventListener('DOMContentLoaded', () => {
  if (typeof CHART_DEFAULTS === 'undefined') return;

  CHART_DEFAULTS.tooltip.backgroundColor = DARK_TOOLTIP_BG;
  CHART_DEFAULTS.tooltip.borderColor = 'rgba(148,163,184,0.2)';
  CHART_DEFAULTS.tooltip.borderWidth = 1;
  CHART_DEFAULTS.tooltip.titleColor = '#F1F5F9';
  CHART_DEFAULTS.tooltip.bodyColor = '#CBD5E1';

  CHART_DEFAULTS.scales.y.grid.color = DARK_GRID;
  CHART_DEFAULTS.scales.y.ticks.color = DARK_TICK;
  CHART_DEFAULTS.scales.x.ticks.color = DARK_TICK_STRONG;

  CHART_DEFAULTS.legend.labels.color = DARK_TICK_STRONG;
});

/* =========================================================
   Surcharge : factories de charts adaptées au thème
   ========================================================= */

// Override de makeBlueGradient pour utiliser le cyan du thème
function makeBlueGradient(ctx, height = 320, fromAlpha = 0.4) {
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, `rgba(${THEME.primaryRGB},${fromAlpha})`);
  g.addColorStop(1, `rgba(${THEME.primaryRGB},0)`);
  return g;
}

// === Chart Indicateur (override couleurs) ===
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
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: THEME.bgSurface,
          pointBorderColor: THEME.primary,
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointHoverBackgroundColor: THEME.primary,
          pointHoverBorderColor: '#fff'
        },
        {
          label: 'Cible',
          data: labels.map(() => indicator.target ?? null),
          borderColor: THEME.success,
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

// === Donut activités (override) ===
function buildDonut(canvas, data) {
  const ctx = canvas.getContext('2d');
  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.labels,
      datasets: [{
        data: data.values,
        backgroundColor: data.colors,
        borderColor: THEME.bgSurface,
        borderWidth: 3,
        hoverOffset: 14,
        hoverBorderColor: '#1E293B'
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

// === Évolution activités (combo bar+line) ===
function buildActivitiesEvolution(canvas, quarters) {
  const ctx = canvas.getContext('2d');
  const gradient = makeBlueGradient(ctx, 360, 0.5);

  return new Chart(ctx, {
    data: {
      labels: quarters.labels,
      datasets: [
        {
          type: 'bar',
          label: 'Taux physique',
          data: quarters.physique,
          backgroundColor: gradient,
          borderColor: THEME.primary,
          borderWidth: 1,
          borderRadius: 8,
          barThickness: 60
        },
        {
          type: 'line',
          label: 'Taux budgétaire',
          data: quarters.budget,
          borderColor: THEME.accent,
          backgroundColor: THEME.accent,
          borderWidth: 3,
          tension: 0.35,
          pointBackgroundColor: THEME.bgSurface,
          pointBorderColor: THEME.accent,
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

// === Évolution financière (override) ===
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
          borderColor: THEME.primary,
          backgroundColor: grad,
          fill: true,
          tension: 0.35,
          borderWidth: 3,
          pointBackgroundColor: THEME.bgSurface,
          pointBorderColor: THEME.primary,
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7
        },
        {
          label: 'Cible',
          data: evolution.target,
          borderColor: THEME.success,
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

// === Donut sources (override) ===
function buildSourceDonut(canvas, sources, fmt) {
  const ctx = canvas.getContext('2d');
  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: sources.map(s => s.name),
      datasets: [{
        data: sources.map(s => s.decaisse),
        backgroundColor: sources.map(s => s.color),
        borderColor: THEME.bgSurface,
        borderWidth: 4,
        hoverOffset: 16
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { padding: 14, font: { size: 11 }, color: DARK_TICK_STRONG, usePointStyle: true, pointStyle: 'circle', boxWidth: 8 }
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
