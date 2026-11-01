import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// In local development run `netlify dev`, which serves the Netlify Functions for /api and /uploads alongside Vite.
export default defineConfig({ plugins: [react()], root: '.', build: { outDir: 'dist', emptyOutDir: true } });
