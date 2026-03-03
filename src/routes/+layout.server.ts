import type {LayoutServerLoad} from './$types.js';
import {env} from '$env/dynamic/private';

const COOKIE = 'kwt_admin';

/**
 * Exposes admin session state to the root layout and all child pages.
 *
 * @param cookies - SvelteKit cookies handle.
 * @returns Object with `isAdmin` flag.
 */
export const load: LayoutServerLoad = ({cookies}) => {
    const isAdmin = !!env.ADMIN_PASSWORD && cookies.get(COOKIE) === env.ADMIN_PASSWORD;

    return {isAdmin};
};