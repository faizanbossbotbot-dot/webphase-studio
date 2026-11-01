# WebPhase Studio — Complete Project

This project preserves the existing WebPhase-inspired React design and expands the Express admin/API so the site's primary content is editable and persisted. It includes public sections, project/service/testimonial editing, hero/studio media upload, client logo and award management, navigation management, SEO/contact settings, lead management, password change, and JSON backup/restore.

> **Production storage note:** Static Netlify hosting does not run this Express server and does not provide persistent local uploads. This project is configured for a Netlify-hosted frontend plus a Node/Express backend on a persistent-disk host (the included `render.yaml` is a starting point for Render). Keep `DATA_DIR`, `UPLOAD_DIR`, and `JWT_SECRET` configured on the backend host. Do not deploy the backend to an ephemeral filesystem and expect uploads/data to persist.

## Requirements

- Windows 10/11
- Node.js 20+ (Node.js 22 LTS recommended)
- npm, installed with Node.js

## Run locally (Windows CMD)

1. Extract the ZIP.
2. Open **Command Prompt** in the `webphase-inspired-site` folder. For the user's existing location, for example:

   ```bat
   E:
   cd \WebPhase\webphase-inspired-site
   ```

3. Install dependencies:

   ```bat
   npm install
   ```

4. Start the frontend and backend in one command:

   ```bat
   npm run dev
   ```

5. Open these addresses:
   - Website: `http://localhost:5173`
   - Admin: `http://localhost:5173/admin`
   - API health/status: `http://localhost:3001/api/auth/status`

Keep the CMD window open while using the local website. Vite proxies `/api` and `/uploads` to Express on port 3001.

## First admin setup

1. Start `npm run dev`.
2. Visit `http://localhost:5173/admin`.
3. Enter a password of at least 10 characters and enter it again in the confirmation field.
4. Select **Create admin account**. The dashboard only appears after authentication and the protected data has loaded.
5. On later visits, use the login form. Refreshing `/admin` restores the session while its HTTP-only cookie remains valid (8 hours).

The password is stored as a bcrypt hash in `data/admin.json`. It is never sent to the frontend or stored as plain text. The JWT signing secret is generated in `data/jwt-secret.txt` for local use, or supplied using the `JWT_SECRET` environment variable in production. Back up these private files securely; never publish them.

### Change or reset the admin password

- While logged in, open **Settings & Socials** and use **Change admin password**. You must provide the current password and a new password of at least 10 characters. You will be logged out and asked to sign in again.
- If you have lost the password and are operating locally, stop the server, back up the `data` directory, delete only `data/admin.json`, restart the server, then create a new password at `/admin`. Do not do this on production unless you intend to reset the admin account.

## Admin features

- **Website Content:** edit the hero and section headings/descriptions, plus contact and footer copy.
- **Selected Work:** add/edit/delete projects, category, description, project link, image/video URL, and upload media.
- **Services:** add/edit/delete services, descriptions, image URL and upload a service image.
- **Testimonials:** edit name, role, quote, photo, and testimonial video; add/delete entries.
- **Hero & Studio Media:** replace the hero video/poster and manage up to three studio media cards, including uploaded images/videos.
- **Client Logos:** add/edit/delete logo entries, image uploads and destination URLs.
- **Awards:** add/edit/delete award name, issuer, year and URL.
- **Navigation:** add/edit/delete navigation labels and target links/sections.
- **Settings & Socials:** WhatsApp number, contact email, office/location, social profile URLs, SEO title/description, and password change.
- **Customer Inquiries:** view contact form submissions, update their status, reply using WhatsApp, and delete entries.
- **Backup & Restore:** download all saved website data as JSON and restore from a prior backup. Restoring replaces the current saved content.

All changes made in the admin editor require clicking **Save changes**. Uploads are saved by the backend; upload paths are not data-embedded in the JSON backup, so also back up the `uploads` directory (or your persistent media storage) to preserve the actual media files.

## Production build and local production run

```bat
npm run build
npm start
```

After a successful build, the Express server serves the built frontend at `http://localhost:3001`. The API and public website are served from the same origin in this mode.

Useful checks:

```bat
npm run check
npm run build
npm run test:smoke
npm audit
```

Review audit findings before upgrading dependencies. Do not run `npm audit fix --force` blindly because it can introduce breaking major-version upgrades.

## Deploy frontend to Netlify and backend with persistent storage

### 1. Deploy the Express backend

The included `render.yaml` is a Render Blueprint starting point. Review it before deploying. It requests a persistent disk mounted at `/var/data` and configures:

- `DATA_DIR=/var/data/data`
- `UPLOAD_DIR=/var/data/uploads`
- `JWT_SECRET` generated by the host
- `TRUST_PROXY=1` so login and inquiry rate limits use the original client IP behind Render's reverse proxy
- `CORS_ORIGIN` set to the exact public Netlify site origin

Replace `https://YOUR-SITE.netlify.app` in `render.yaml` with your real site origin, or set `CORS_ORIGIN` in the backend dashboard. For a custom domain, include that origin as well. The CORS value is a comma-separated allowlist of exact origins; do not add a trailing slash. If the host uses a different disk mount path, update both directory variables to match it.

The backend host must support a persistent disk. A free/ephemeral service without a persistent disk is not suitable for durable JSON data or media uploads. For higher traffic or multiple backend instances, migrate the JSON file storage to a real database and object storage; the included JSON database is designed for a small single-instance deployment.

### 2. Deploy the frontend to Netlify

1. Connect this project repository to Netlify or upload the built `dist` output.
2. Build command: `npm ci && npm run build`.
3. Publish directory: `dist`.
4. Set Netlify environment variable `VITE_API_BASE` to the backend's public origin, for example `https://your-backend.onrender.com` (no trailing slash).
5. Trigger a new deploy after setting the variable.

`netlify.toml` includes the Vite build settings and SPA fallback for `/admin`. The browser uses `VITE_API_BASE` for API calls and for backend-hosted upload URLs. The backend must allow the exact Netlify origin through `CORS_ORIGIN` and use HTTPS in production so the admin cookie can use `SameSite=None; Secure` across the two domains.

### 3. Persistence and backup

- Website content and inquiries: `DATA_DIR/site-data.json`.
- Password hash: `DATA_DIR/admin.json`.
- JWT signing key: `DATA_DIR/jwt-secret.txt` (unless managed with `JWT_SECRET`).
- Uploaded images/videos: `UPLOAD_DIR/`.
- Downloaded JSON backups do not contain the binary upload files. Back up the uploads folder or external object-storage bucket separately.

Do not use Netlify's static deploy as the location for `data/` or `uploads/`. A Netlify-only static site cannot persist these files. This configuration intentionally keeps the persistent backend separate instead of pretending static hosting can store uploaded media.

## Contact and WhatsApp

The default number is `03413614268`. It is normalized to Pakistan's international country code when generating `wa.me` links. The contact form validates required fields, saves the inquiry via the backend, displays a success/error result, and then opens a WhatsApp message containing the submitted details. If a browser blocks the WhatsApp popup, the site displays a manual link.

## Data and uploaded media

Local default storage:

- `data/site-data.json` — editable website data and inquiries.
- `data/admin.json` — bcrypt hash only.
- `data/jwt-secret.txt` — generated local JWT secret.
- `uploads/` — uploaded image/video files.

Supported uploads: JPG/JPEG, PNG, WebP, GIF, MP4 and WebM; 15 MB maximum per file. SVG is intentionally blocked because active SVG content can create a stored cross-site scripting risk. The server checks extension/MIME pairs and basic file signatures.

## Troubleshooting

- **Admin cannot connect:** make sure the backend is running on port 3001 and the frontend uses the expected origin.
- **Session fails after Netlify deploy:** check that `VITE_API_BASE` is set, `CORS_ORIGIN` exactly matches the deployed site origin, both sites use HTTPS, and backend cookies are allowed by the browser.
- **Images show locally but not after deployment:** upload URLs must resolve on the backend host; set `VITE_API_BASE` to that backend's public origin and ensure the persistent upload directory is mounted.
- **Password setup says an account already exists:** log in, or use the documented password-reset process if you control the server.
- **Production page is missing:** run `npm run build` successfully before `npm start` or redeploy Netlify after environment changes.

## Verification status for this delivery

Checks performed while preparing this ZIP:

- `node --check server/index.js` — passed.
- `package.json` and `data/site-data.json` JSON parsing — passed.
- TypeScript parser JSX/JavaScript syntax check of `client/src/main.jsx` — passed (syntax only, not a Vite build).
- CSS parser check — to be run before final packaging.
- `npm ci` — not completed: package registry download stalled; `npm ci --offline` explicitly failed because the `yargs-parser@21.1.1` tarball is not cached.
- `npm run build`, live backend/API tests, browser/admin tests, real upload tests, and responsive visual tests — not verified in this environment because dependencies could not be installed completely.

A built-in Node integration smoke test is included as `tests/smoke.test.mjs`. I attempted `npm run test:smoke`, but it failed before the server could start because the incomplete dependency tree did not contain Express. After a successful dependency install, run `npm run test:smoke` to exercise first-time setup, incorrect/correct login, unauthorized access, data CRUD, image/video upload persistence, lead status/delete, backup/restore and data persistence across a backend restart. Do not treat runtime tests as passed until run on a machine with the full dependency install.

## Netlify deployment note
See `NETLIFY_DEPLOY_FIX.md`. Netlify static hosting serves the frontend only; deploy the included Express API separately on Render to enable the admin password, persistent uploads, editing and lead storage.
