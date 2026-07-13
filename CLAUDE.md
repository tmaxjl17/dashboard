# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Static HTML/CSS/JS application (no build step, no package manager, no framework) for visualizing project-monitoring dashboards: indicators, activities, financial data, and geographic drill-down maps for development projects. Served locally via WAMP.

- **Local URL**: `http://localhost/dashboard/`
- **Stack**: vanilla HTML/CSS/JS, Chart.js 4.4.0 (CDN jsdelivr), Leaflet 1.9.4 (CDN unpkg), Font Awesome 6.4.0, Google Fonts (Inter / Fraunces / JetBrains Mono). No transpilation, bundling, or package.json — just open/serve the HTML files directly.
- There are no automated tests, linters, or build commands in this repo. "Running" the project means serving it via WAMP (or any static file server) and opening pages in a browser.
- `PROJECT.md` at the repo root is a living, French-language changelog/spec of everything built so far (per-dashboard feature lists, what's done vs. planned). Check it for context on a dashboard's intended design before modifying it, and update it when you ship a notable feature.

## Architecture

### Three top-level pieces

1. **Home (`index.html` + `dashboards.js`)** — landing page listing all dashboards.
   - `dashboards.js` is a static registry (`DASHBOARDS` array): one object per predefined dashboard (slug, title, cover image, dates, KPIs). Adding a dashboard to the home grid means adding an entry here — the slug must match the folder name under `dashboards/`.
   - The home page also renders a second grid of **user-created Studio dashboards**, read live from `localStorage` (key `dashboard_studio_v1.index` + one `dashboard_studio_v1.<id>` entry per dashboard). This is pure client-side state; there is no backend.

2. **`dashboards/<slug>/`** — one self-contained folder per dashboard (e.g. `demo`, `demo2`, `demo3`, `activity`, `activity2`, `activity3`, `activity-timeline`, `activity-map`, `indicateurs`, `indicateurs2`, `indicateurs3`, `progress-report`, `map-explorer`). Each folder has its own `index.html` and `data.js`, and pulls in shared CSS/JS via relative `../../shared/...` paths. Several are visual/UX variants exploring different layouts for the same underlying data (e.g. `indicateurs`, `indicateurs2`, `indicateurs3` are Option A/I/C takes on the same indicator-tracking screen; `activity*` are Option A/B/C/D/F takes on the activity screen). When asked to change "the indicators dashboard" or similar, clarify which variant/option is meant if ambiguous.

3. **`shared/`** — code and assets used by every dashboard:
   - `shared/css/tokens.css` — CSS custom properties (design tokens), base styles, animations. Themes override these `:root` variables rather than duplicating rules.
   - `shared/css/components.css` — tabs, KPI cards, buttons, tables (generic components).
   - `shared/css/sidebar.css`, `shared/css/panels.css` — the project sidebar and the 3-tab main panel layout used by the "classic" dashboards (demo/demo2/demo3 and similar).
   - `shared/css/home.css` — home page + custom-dashboards section styling.
   - `shared/js/app.js` — tab navigation with lazy per-tab init (`Indicateurs`/`Activites`/`Financier` modules are only initialized the first time their tab is opened).
   - `shared/js/sidebar.js` — sidebar accordion, time-progress bar, milestone timeline.
   - `shared/js/charts.js` — Chart.js `CHART_DEFAULTS` config object and chart factory functions (e.g. `buildIndicatorChart`). New charts should reuse these factories/defaults rather than redefining Chart.js options inline.
   - `shared/js/indicateurs.js`, `shared/js/activites.js`, `shared/js/financier.js` — logic for each of the three standard tabs (indicators / activities / financials) in the classic dashboard layout.
   - `shared/geo/*.geojson` — Côte d'Ivoire administrative boundaries at 3 levels (ADM0/ADM1/ADM2, from geoBoundaries) used by every map/choropleth feature across dashboards.

   **Rule of thumb**: changes to `shared/css` or `shared/js` affect every dashboard simultaneously. Keep shared code generic; put dashboard-specific behavior/styling inside that dashboard's own folder (each dashboard typically has its own extra `.css`/`.js` alongside its `index.html`/`data.js` for anything not generic enough for `shared/`).

### Data pattern

Each dashboard's content is driven by a plain JS global object defined in its own `data.js` (e.g. `DASHBOARD_DATA` for the classic layout, `INDICATOR_DATA` for indicator-focused dashboards), loaded via a `<script>` tag before the shared JS files. There is no fetch/API call for this data — everything is inlined as JS literals. Geo-enabled dashboards additionally reference `geoLevels` (pointing at the shared GeoJSON files) and per-region KPI values keyed by geography level, used to drive Leaflet choropleths and drill-down interactions (click a region → highlight + zoom + swap KPI panel to that region's values; click empty space or a "back" control → return to national view). This click-to-drill-down / KPI-swap pattern recurs across `activity*`, `indicateurs*`, and `map-explorer` and should be kept consistent when extending them.

Script load order matters in each dashboard's `index.html`: Chart.js CDN → `data.js` → `shared/js/charts.js` → other shared modules → `shared/js/app.js` (or the dashboard's own bootstrap script) last, since later scripts assume earlier globals (`DASHBOARD_DATA`, `CHART_DEFAULTS`, etc.) already exist.

### Studio (`studio/`)

A self-contained visual dashboard builder (`studio/index.html`, `studio/studio.css`, `studio/studio.js`) — separate from the `dashboards/<slug>/` pattern. Three-column editor (widget palette / canvas grid / inspector) supporting drag-and-drop placement on a 12-column grid with a push-down + compact layout algorithm, 5 widget types (KPI, stat-card, line chart, donut, text), 4 starter templates, and Edit/Preview modes. State persists to `localStorage` under `dashboard_studio_v1.<id>` with auto-save; the home page's "custom dashboards" grid and `studio/index.html?id=<id>` read/write this same storage key. Studio's data source for widgets currently comes from `dashboards/indicateurs/data.js`.

## Conventions

**Adding a new predefined dashboard**:
1. Copy an existing folder as a starting point, e.g. `cp -r dashboards/demo dashboards/<new-slug>`.
2. Edit `dashboards/<new-slug>/data.js` with the new dashboard's data.
3. Register it in `dashboards.js` (the `slug` must equal the folder name) so it appears on the home page.

**Adding a new theme** for an existing dashboard family:
- Create `dashboards/<slug>/css/theme-<name>.css` overriding the `:root` CSS variables from `shared/css/tokens.css`.
- Optionally add `dashboards/<slug>/theme-<name>.js` to patch `CHART_DEFAULTS` (Chart.js colors) for that theme.

**Language**: UI copy, data labels, and code comments in this repo are in French — match that when adding content.
