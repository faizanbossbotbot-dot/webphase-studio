# WebPhase Studio — Audit and Verification Report

Audit date: 2026-11-01

## Fixes made in this package

- Fixed a public-rendering crash: client logo data was an object but the public logo strip rendered it as a React child. The logo strip now supports text-only logos, uploaded images, and optional external links.
- Added rendering for award images and an admin upload control for them.
- Added admin management for the header/footer logo, hero collage images, future-section image, awards video/poster, and ticker copy.
- Added a request timeout and clearer network/API errors to the frontend API helper.
- Added reduced-motion CSS handling and explicit image/award/form-error styles.
- Tightened backend JSON body size, object/array validation, lead field length validation, allowed lead statuses, and backup restore validation.
- Hardened initial password creation against simultaneous first-time setup attempts and limited password length.
- Added basic rate limiting for public contact inquiries.
- Removed SVG uploads, which can be an active-content/XSS vector when served back from the upload directory; added basic file-signature checks for supported uploads.
- Added security response headers and a built-in end-to-end API smoke test script.

## Checks actually performed

| Check | Result | Evidence / reason |
|---|---|---|
| ZIP archive integrity | Passed for final package | Verified with `unzip -t` / Python ZIP test after packaging |
| Backend JavaScript syntax | Passed | `node --check server/index.js` |
| Smoke test file syntax | Passed | `node --check tests/smoke.test.mjs` |
| Frontend JSX/JavaScript syntax | Passed | Parsed/transpiled with the globally available TypeScript parser; this is not a Vite build |
| CSS syntax | Passed | Parsed with PostCSS |
| `package.json`, lockfile and website data JSON | Passed | JSON parsing |
| Clean dependency install (`npm ci`) | Not completed | Registry download stalled in this environment |
| Offline dependency install | Failed | Required `yargs-parser@21.1.1` tarball is not cached |
| Production build (`npm run build`) | Failed in this environment | `vite: not found` because dependencies were not installed completely |
| API smoke test | Failed before app startup | `express` package missing from the incomplete install; no API assertion was reached |
| Browser console and visual layout checks | Not verified | No functioning built app/browser session available in this environment |
| Responsive desktop/tablet/mobile testing | Not verified | Requires a running build and browser viewport tests |
| Netlify production deployment | Not verified | Requires deployed Netlify site, backend host, HTTPS origins, and configured environment variables |

## Deployment architecture

The Netlify site is a static frontend. It does not itself run the included Express server or persist local upload files. The included deployment approach is Netlify frontend + separate Node/Express backend with persistent disk configured through `DATA_DIR`, `UPLOAD_DIR`, and `JWT_SECRET`. Netlify Blobs is **not** wired into this project. Do not assume a Netlify-only deployment provides durable admin data, uploads, or leads.

## Remaining verification required before production

On a network-enabled Windows machine, run from the project folder:

```bat
npm ci
npm run check
npm run build
npm run test:smoke
npm audit
```

Then start the app using `npm run dev`, open `http://localhost:5173` and `http://localhost:5173/admin`, and verify visual design and responsive layouts in a browser. The smoke test is designed to exercise password setup, incorrect/correct login, protected routes, CRUD, image/video upload, lead updates/deletion, backup/restore, logout and data persistence after backend restart. These runtime checks must not be treated as passed until they complete successfully.

## Additional ChatGPT audit and corrections (2026-11-01)

The uploaded archive was independently extracted and reviewed. The following additional reliability fixes were applied to the source in this corrected package:

- Website-data writes now use unique temporary files and atomic replacement; temporary files are cleaned up even if a write fails.
- Admin content updates now persist a candidate copy before replacing the in-memory database, so a failed disk write does not leave the running server showing unsaved content.
- Inquiry creation, status updates, deletion, and backup restore now use the same persist-before-commit pattern and return clear storage errors.
- Admin setup and login async handlers now catch unexpected hashing/filesystem errors and return JSON errors instead of risking an unhandled async rejection.
- Admin password changes now use an atomic file replacement.
- Added `TRUST_PROXY` opt-in support and enabled it in the Render blueprint so IP-based login/inquiry throttling can see client IPs behind Render's proxy.
- Added a Permissions-Policy response header.

### Checks completed in this audit

- ZIP extraction and original archive integrity — passed.
- `node --check server/index.js` — passed after changes.
- `node --check tests/smoke.test.mjs` — passed.
- Frontend JSX/JavaScript syntax transpilation using the globally available TypeScript compiler — passed (not a Vite production build).
- CSS parsing using PostCSS — passed.
- `package.json`, `package-lock.json`, and `data/site-data.json` JSON parsing — passed.

### Still not verified

A fresh `npm ci --no-audit --no-fund` attempt timed out in this environment. Therefore the Vite production build, live Express API smoke test, browser UI, actual upload workflows, and responsive visual tests remain unverified. No production deployment was performed. Do not treat this ZIP as production-certified until those runtime checks pass on a machine with dependencies installed.
