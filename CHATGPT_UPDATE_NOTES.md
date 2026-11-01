# WebPhase design update

This package is a full multi-section WebPhase-inspired website, not a hero-only mockup. It includes the cream collage hero, ticker, studio intro/reel, selected work, client logos, testimonials, awards, services, contact/footer, and the admin content controls already included in the project.

## Latest change
The three Studio video cards now show their bundled local photo fallback immediately. A video fades in only after the browser confirms it can play; a failed remote video no longer leaves a black/empty card. The hero collage images are bundled locally in `public/media/`.

## Run locally
1. Install Node.js LTS.
2. Open this folder in a terminal.
3. Run `npm ci`.
4. Run `npm run dev`.
5. Open the Vite URL shown in the terminal (usually http://localhost:5173).

## Deployment note
The included Express backend is required for admin login, uploaded media, and persistent content. A static-only Netlify deployment does not run the Express server or persist local uploads. Use the included Render backend blueprint plus Netlify frontend configuration, and set the environment variables described in README.md.

## Verification status
Backend syntax and site-data JSON were checked during packaging. A fresh Vite production build could not be run in this packaging environment because dependency installation did not complete (`vite` was unavailable). Please run `npm ci` and `npm run build` on the local machine before deployment. Remote source videos may still be unavailable depending on the original host; local fallback photos remain visible until a video is playable.
