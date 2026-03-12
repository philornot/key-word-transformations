/**
 * @fileoverview SvelteKit server hooks.
 *
 * Attaches security headers to every response. No CSP is set here because
 * SvelteKit injects inline scripts with nonces — use SvelteKit's built-in
 * csp config in svelte.config.js if you need a strict policy.
 */

import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
    const response = await resolve(event);

    // Prevent the app from being embedded in iframes on other origins.
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');

    // Stop browsers from sniffing the MIME type of responses.
    response.headers.set('X-Content-Type-Options', 'nosniff');

    // Send the full origin only to same-origin requests; only the origin
    // (no path) to cross-origin HTTPS; nothing to HTTP.
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Opt out of interest-cohort tracking (FLoC / Topics API).
    response.headers.set('Permissions-Policy', 'interest-cohort=()');

    return response;
};