/**
 * @fileoverview Server-side re-export of the shared KWT parser.
 * The actual implementation lives in `$lib/parser.ts` so that it can also
 * be used in browser context (e.g. the /create/scan paste handler).
 */
export {parseQuestions} from '$lib/parser.js';