# Fixing the Netlify admin setup (404)

The admin password cannot be created on a static Netlify deployment by itself. The API must be deployed as a separate persistent Node service.

1. Deploy this repository to Render using the included `render.yaml` blueprint.
2. In Render, set `CORS_ORIGIN` to your exact Netlify URL (no trailing slash). Keep the persistent disk mounted at `/var/data`; the blueprint configures `DATA_DIR` and `UPLOAD_DIR`.
3. Wait for the Render service to be live. Test `https://YOUR-RENDER-SERVICE.onrender.com/api/health`; it must return JSON with `ok: true`.
4. In Netlify → Site configuration → Environment variables, add `VITE_API_BASE` with the Render service origin only, e.g. `https://webphase-api.onrender.com` (no trailing slash).
5. Trigger a fresh Netlify deploy.
6. Open `/admin` again. The first password setup should now call the live API.

If `/api/health` is not reachable, admin setup will continue to fail; do not repeatedly submit passwords. A persistent disk is required so the password hash and uploaded media survive restarts.

The public website still uses `data/site-data.json` as a fallback when the API is unavailable, so the 6 studio cards and 8 project cards render without the admin API. Video URLs and image URLs still need to be publicly reachable from the browser.
