# Financial Asset Views

A static, client-side dashboard for maintaining market views with price targets, narrative, and uploaded chart images.

**File Layout**
- `index.html` Public dashboard
- `admin.html` Admin editor (localStorage + import/export)
- `assets/styles.css` Styles
- `assets/app.js` Public app bootstrap
- `assets/admin.js` Admin logic
- `assets/storage.js` Data loading and validation
- `assets/render.js` Rendering helpers
- `data/default_views.json` Default data (schemaVersion 2)
- `functions/api/upload.js` Upload chart images to R2
- `functions/api/chart/[...key].js` Serve chart images from R2

**Run Locally**
1. `python -m http.server`
2. Open `http://localhost:8000/` in your browser.

Note: Chart uploads require the `/api/upload` function. If you are only running a static server, uploads will fall back to localStorage only.

**Deploy on Cloudflare Pages**
Option A: Drag and drop
1. Zip the project folder (or select the folder) and upload to Cloudflare Pages.
2. No build step is required.

Option B: Git integration
1. Push this folder to a Git repo.
2. In Cloudflare Pages, set:
3. Build command: leave empty
4. Build output directory: `.`

**R2 Chart Upload Setup**
1. Create an R2 bucket (for example: `asset-charts`).
2. In your Cloudflare Pages project settings, add an R2 binding:
3. Binding name: `CHART_BUCKET`
4. Bucket: your R2 bucket name

Uploads from `admin.html` will POST to `/api/upload`, which stores the image in R2 and returns a URL like `/api/chart/charts/<asset>/<file>`.

**Data Storage and Updates**
- Default data lives in `data/default_views.json`.
- Each asset stores price targets, narrative (Markdown), and `chart.imageUrl`.
- The admin editor saves to localStorage under the key `assetViews:v1`.
- Use Export to download your edits as JSON.
- Use Import to load a JSON file back into localStorage.
- Use Reset to default to clear localStorage and reload from `data/default_views.json`.
- To make edits permanent for all users, update `data/default_views.json` and redeploy.
