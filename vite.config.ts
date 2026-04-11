import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [sveltekit()],
    ssr: {
        /**
         * Keep these as bare require() calls in the server bundle so they are
         * resolved at runtime on the RPi where the correct platform binaries
         * are installed. better-sqlite3 is intentionally omitted — it is
         * loaded via a dynamic require() inside db.ts to defer native binary
         * loading until the first HTTP request (never during vite build).
         */
        external: ['sharp', 'tesseract.js', 'pdf-parse'],
    },
});