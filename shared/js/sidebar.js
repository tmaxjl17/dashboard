/* =========================================================
   SIDEBAR - Logique (accordéon, progression, dates importantes)
   ========================================================= */

function toggleCard(header) {
  header.parentElement.classList.toggle('is-open');
}

function initSidebarProgress() {
  const start = new Date(DASHBOARD_DATA.project.startDate);
  const end   = new Date(DASHBOARD_DATA.project.endDate);
  const today = new Date();

  let pct;
  if (today < start) pct = 0;
  else if (today > end) pct = 100;
  else pct = ((today - start) / (end - start)) * 100;
  pct = Math.round(pct);

  setTimeout(() => {
    document.getElementById('progressFill').style.width = pct + '%';
    document.getElementById('progressPct').textContent = pct + '%';
  }, 200);
}

/* === DATES IMPORTANTES (timeline) === */
function initMilestones() {
  const list = document.getElementById('milestoneList');
  if (!list) return;

  const today = new Date();
  const fmtDate = d => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

  const sorted = [...DASHBOARD_DATA.milestones].sort(
    (a, b) => new Date(a.planned) - new Date(b.planned)
  );

  list.innerHTML = sorted.map(m => {
    const planned = new Date(m.planned);
    const actual  = m.actual ? new Date(m.actual) : null;
    let status, statusLabel, icon;

    if (actual) {
      const delay = actual - planned;
      if (delay <= 0)            { status = 'done-on';   statusLabel = 'Réalisé à temps'; icon = 'fa-check'; }
      else if (delay < 86400000) { status = 'done-on';   statusLabel = 'Réalisé';         icon = 'fa-check'; }
      else                       { status = 'done-late'; statusLabel = 'Réalisé en retard'; icon = 'fa-check'; }
    } else if (planned < today) {
      status = 'overdue'; statusLabel = 'En retard'; icon = 'fa-triangle-exclamation';
    } else {
      status = 'upcoming'; statusLabel = 'À venir'; icon = 'fa-clock';
    }

    return `
      <li class="milestone milestone--${status}">
        <span class="milestone__dot"><i class="fas ${icon}"></i></span>
        <div class="milestone__body">
          <div class="milestone__name">${m.name}</div>
          <div class="milestone__dates">
            <span class="milestone__date">
              <i class="far fa-calendar"></i> Prévu : <strong>${fmtDate(m.planned)}</strong>
            </span>
            ${actual ? `
              <span class="milestone__date milestone__date--actual">
                <i class="fas fa-check-circle"></i> Réel : <strong>${fmtDate(m.actual)}</strong>
              </span>` : ''}
          </div>
          <span class="milestone__status">${statusLabel}</span>
        </div>
      </li>`;
  }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  initSidebarProgress();
  initMilestones();
});
