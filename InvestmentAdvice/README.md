# Financial Asset Views

A static, client-side dashboard for maintaining market views. It loads default data from `data/default_views.json` and lets you override it in localStorage via `admin.html`.

**File Layout**
- `index.html` Public dashboard
- `admin.html` Admin editor (localStorage + import/export)
- `assets/styles.css` Styles
- `assets/app.js` Public app bootstrap
- `assets/admin.js` Admin logic
- `assets/storage.js` Data loading and validation
- `assets/render.js` Rendering helpers
- `data/default_views.json` Default data and sample chart points

**Run Locally**
1. `python -m http.server`
2. Open `http://localhost:8000/` in your browser.

**Deploy on Cloudflare Pages**
Option A: Drag and drop
1. Zip the project folder (or select the folder) and upload to Cloudflare Pages.
2. No build step is required.

Option B: Git integration
1. Push this folder to a Git repo.
2. In Cloudflare Pages, set:
3. Build command: leave empty
4. Build output directory: `.`

**Data Storage and Updates**
- Default data lives in `data/default_views.json`.
- The admin editor saves to localStorage under the key `assetViews:v1`.
- Use Export to download your edits as JSON.
- Use Import to load a JSON file back into localStorage.
- Use Reset to default to clear localStorage and reload from `data/default_views.json`.
- To make edits permanent for all users, update `data/default_views.json` and redeploy.
