# WebPhase: publish correctly on Netlify

## What this update fixes
- The homepage now falls back to the bundled `data/site-data.json` when `/api/public` is unavailable, so the 6 Studio cards and 8 Selected Work cards still render on a static Netlify deployment.
- The 6 Studio cards now use the original WebPhase MP4 reel URLs with poster images.
- The WhatsApp buttons use WebPhase's published contact number: +92 321 5409469.

## Important: Admin panel needs the API server online
Netlify's static hosting does not run `server/index.js`. A static-only deploy will always return 404 for `/api/auth/status`, `/api/auth/setup`, uploads, saving edits and leads. The included Render blueprint runs the Express API with a persistent disk so the admin password, uploaded files and edits survive deploys.

### Deploy the API on Render
1. Push this project folder to a GitHub repository.
2. In Render, choose **New + → Blueprint**, select that repository, and let Render read `render.yaml`.
3. Open the created `webphase-api` service and wait until it is Live. Copy its URL, for example `https://webphase-api.onrender.com`.
4. In Render → Environment, set `CORS_ORIGIN` to your exact Netlify site origin, for example `https://your-site-name.netlify.app` (no trailing slash). Save and redeploy.
5. In Netlify → Site configuration → Environment variables, add `VITE_API_BASE` with the Render URL, e.g. `https://webphase-api.onrender.com` (no trailing slash).
6. Trigger a new Netlify deploy so Vite embeds the API URL in the frontend.
7. Open `https://your-site-name.netlify.app/admin` and create the admin password (10+ characters).

### Verify
- API health: `https://YOUR-RENDER-SERVICE.onrender.com/api/health` should return `{"ok":true,"service":"webphase-api"}`.
- Public data: `https://YOUR-RENDER-SERVICE.onrender.com/api/public` should return the website content.
- Then reload the Netlify homepage. Studio videos and project cards are shown from the bundled content even if the API is temporarily unavailable; admin saving and uploads require the live API.

Do not use `npm audit fix --force` as part of this deployment; it can introduce breaking dependency changes.
