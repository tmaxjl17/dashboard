/* =========================================================
   APP - Navigation entre onglets (lazy init)
   ========================================================= */

const App = (() => {

  const initializers = {
    indicateurs: () => {}, // déjà initialisé au chargement
    activites:   () => Activites.init(),
    financier:   () => Financier.init()
  };

  const initialized = { indicateurs: true, activites: false, financier: false };

  function switchTab(target) {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === target));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + target));

    if (!initialized[target]) {
      initializers[target]();
      initialized[target] = true;
    }
  }

  function init() {
    document.querySelectorAll('.tab').forEach(t => {
      t.addEventListener('click', () => switchTab(t.dataset.tab));
    });
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
