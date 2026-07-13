/* =========================================================
   ONGLET DONNÉES FINANCIÈRES - Logique
   ========================================================= */

const Financier = (() => {
  let initialized = false;
  const fmt = n => n.toLocaleString('fr-FR');

  function getProgressClass(pct) {
    if (pct >= 80) return 'progress-cell__fill--high';
    if (pct >= 40) return 'progress-cell__fill--mid';
    return 'progress-cell__fill--low';
  }

  function renderPlanTable() {
    const tbody = document.getElementById('planTableBody');
    tbody.innerHTML = DASHBOARD_DATA.financial.sources.map(s => {
      const pct = (s.decaisse / s.montant) * 100;
      const dispo = s.montant - s.decaisse;
      const cls = getProgressClass(pct);

      return `<tr>
        <td>
          <div class="source-cell">
            <span class="source-dot" style="background:${s.color}"></span>
            <span class="source-name">${s.name}</span>
          </div>
        </td>
        <td class="text-right">${fmt(s.montant)}</td>
        <td class="text-right">${fmt(s.decaisse)}</td>
        <td class="text-right">
          <div class="progress-cell progress-cell--right progress-cell--gradient">
            <div class="progress-cell__bar"><div class="progress-cell__fill ${cls}" style="width:${Math.min(pct, 100)}%"></div></div>
            <span class="progress-cell__pct">${pct.toFixed(1)}%</span>
          </div>
        </td>
        <td class="text-right">${fmt(dispo)}</td>
      </tr>`;
    }).join('');
  }

  function init() {
    if (initialized) return;
    const data = DASHBOARD_DATA.financial;

    renderPlanTable();
    buildFinancialEvolution(document.getElementById('finEvoChart'), data.evolution);
    buildSourceDonut(document.getElementById('sourceDonut'), data.sources, fmt);

    initialized = true;
  }

  return { init };
})();
