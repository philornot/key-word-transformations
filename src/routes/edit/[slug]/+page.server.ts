/**
 * @fileoverview Server load for /edit/[slug].
 *
 * Both admins and regular users receive the full question data (including
 * correct answers) so the editor can be pre-populated. There is no security
 * concern here — the edit page is a creation/fork tool, not a test-taking
 * page, so showing answers is intentional.
 *
 * The `isAdmin` flag is forwarded to the client so the UI can show the
 * appropriate save label and subtitle.
 */

import type {PageServerLoad} from './$types.js';
import {db} from '$lib/server/db.js';
import {error} from '@sveltejs/kit';
import {env} from '$env/dynamic/private';
import type {KWTQuestion} from '$lib/types.js';
import type {ExerciseType} from '$lib/constants.js';
import {EXERCISE_TYPES} from '$lib/constants.js';

const ADMIN_COOKIE = 'kwt_admin';

type SetRow = {
    id: number; title: string; source_label: string | null; is_public: number; type: string;
};

type QRow = {
    id: number;
    position: number;
    sentence1: string;
    sentence2_with_gap: string;
    keyword: string;
    correct_answer: string;
    alternative_answers: string;
    example_wrong_answers: string;
    min_words: number;
    max_words: number;
};

export const load: PageServerLoad = ({params, cookies}) => {
    const isAdmin = !!env.ADMIN_PASSWORD && cookies.get(ADMIN_COOKIE) === env.ADMIN_PASSWORD;

    const set = db
        .prepare('SELECT id, title, source_label, is_public, type FROM sets WHERE slug = ?')
        .get(params.slug) as SetRow | undefined;

    if (!set) throw error(404, 'Set not found.');

    const qRows = db
        .prepare(`
            SELECT id,
                   position,
                   sentence1,
                   sentence2_with_gap,
                   keyword,
                   correct_answer,
                   alternative_answers,
                   example_wrong_answers,
                   min_words,
                   max_words
            FROM questions
            WHERE set_id = ?
            ORDER BY position
        `)
        .all(set.id) as QRow[];

    const setType: ExerciseType = (EXERCISE_TYPES.includes(set.type as ExerciseType) ? set.type : 'kwt') as ExerciseType;

    const questions: KWTQuestion[] = qRows.map((r) => ({
        id: r.id,
        position: r.position,
        sentence1: r.sentence1,
        sentence2WithGap: r.sentence2_with_gap,
        keyword: r.keyword,
        correctAnswer: r.correct_answer,
        alternativeAnswers: JSON.parse(r.alternative_answers || '[]'),
        exampleWrongAnswers: JSON.parse(r.example_wrong_answers || '[]'),
        minWords: r.min_words ?? 0,
        maxWords: r.max_words,
    }));

    return {
        isAdmin, set: {
            id: set.id,
            slug: params.slug,
            title: set.title,
            sourceLabel: set.source_label,
            isPublic: set.is_public === 1,
            type: setType,
            questions,
        },
    };
};