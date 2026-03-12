import type { Actions, PageServerLoad } from './$types.js';
import type { Cookies } from '@sveltejs/kit';
import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db.js';
import type { SetSummary } from '$lib/types.js';
import type { ExerciseType } from '$lib/constants.js';
import { EXERCISE_TYPES } from '$lib/constants.js';
import { env } from '$env/dynamic/private';

const PASSWORD = env.ADMIN_PASSWORD;
const COOKIE = 'kwt_admin';

/**
 * Checks whether the incoming request carries a valid admin session cookie.
 *
 * @param cookies - SvelteKit cookies handle.
 * @returns True if the session cookie matches the configured password.
 */
function isAuthenticated(cookies: Cookies): boolean {
    if (!PASSWORD) return false;
    return cookies.get(COOKIE) === PASSWORD;
}

type SetRow = {
    slug: string;
    title: string;
    source_label: string | null;
    type: string;
    created_at: string;
    question_count: number;
};

export const load: PageServerLoad = ({ cookies }) => {
    if (!PASSWORD) throw error(503, 'Admin access is not configured (ADMIN_PASSWORD not set).');

    const authenticated = isAuthenticated(cookies);
    if (!authenticated) return { authenticated: false, sets: [] as SetSummary[] };

    const rows = db.prepare(`
        SELECT s.slug,
               s.title,
               s.source_label,
               s.type,
               s.created_at,
               COUNT(q.id) AS question_count
        FROM sets s
                 LEFT JOIN questions q ON q.set_id = s.id
        WHERE s.is_public = 1
        GROUP BY s.id
        ORDER BY s.source_label ASC, s.created_at DESC
    `).all() as SetRow[];

    const sets: SetSummary[] = rows.map((r) => ({
        slug: r.slug,
        title: r.title,
        sourceLabel: r.source_label,
        type: (EXERCISE_TYPES.includes(r.type as ExerciseType) ? r.type : 'kwt') as ExerciseType,
        questionCount: r.question_count,
        createdAt: r.created_at,
    }));

    return { authenticated: true, sets };
};

export const actions: Actions = {
    /**
     * Validates the submitted password, sets a session cookie,
     * and redirects back to the admin panel.
     */
    login: async ({ request, cookies }: { request: Request; cookies: Cookies }) => {
        const data = await request.formData();
        const password = data.get('password')?.toString() ?? '';

        if (password !== PASSWORD) return fail(401, { loginError: 'Nieprawidłowe hasło.' });

        cookies.set(COOKIE, PASSWORD!, {
            path: '/',
            httpOnly: true,
            sameSite: 'strict',
            maxAge: 60 * 60 * 8,
        });

        redirect(303, '/admin');
    },

    /**
     * Deletes a public set and all related data.
     *
     * `attempts` has no ON DELETE CASCADE on `set_id`, so we delete attempts
     * manually first (answers cascade from there), then delete the set
     * (questions cascade from there).
     *
     * Requires an active admin session.
     */
    deleteSet: async ({ request, cookies }: { request: Request; cookies: Cookies }) => {
        if (!isAuthenticated(cookies)) return fail(403, { error: 'Unauthorized.' });

        const data = await request.formData();
        const slug = data.get('slug')?.toString() ?? '';
        if (!slug) return fail(400, { error: 'Missing slug.' });

        const set = db
            .prepare('SELECT id FROM sets WHERE slug = ? AND is_public = 1')
            .get(slug) as { id: number } | undefined;

        if (!set) return fail(404, { error: 'Set not found.' });

        db.transaction(() => {
            db.prepare('DELETE FROM attempts WHERE set_id = ?').run(set.id);
            db.prepare('DELETE FROM sets WHERE id = ?').run(set.id);
        })();

        return { deleted: slug };
    },

    /**
     * Clears the admin session cookie and redirects to home.
     */
    logout: async ({ cookies }: { cookies: Cookies }) => {
        cookies.delete(COOKIE, { path: '/' });
        redirect(303, '/');
    },
};
