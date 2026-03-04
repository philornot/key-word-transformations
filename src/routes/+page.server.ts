import type {PageServerLoad} from './$types.js';
import {db} from '$lib/server/db.js';
import type {SetSummary} from '$lib/types.js';
import type {ExerciseType} from '$lib/constants.js';
import {EXERCISE_TYPES} from '$lib/constants.js';

type SetRow = {
    slug: string; title: string; source_label: string | null; type: string; created_at: string; question_count: number;
};

export const load: PageServerLoad = () => {
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

    /** Sets grouped by exercise type. Only types with at least one set are included. */
    const setsByType = EXERCISE_TYPES.reduce((acc, type) => {
        acc[type] = sets.filter((s) => s.type === type);
        return acc;
    }, {} as Record<ExerciseType, SetSummary[]>,);

    return {setsByType};
};