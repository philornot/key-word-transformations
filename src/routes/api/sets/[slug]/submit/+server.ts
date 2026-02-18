import type {RequestHandler} from '@sveltejs/kit';
import {error, json} from '@sveltejs/kit';
import {db} from '$lib/server/db.js';
import {nanoid} from 'nanoid';

/** Row type for the set lookup query. */
type SetRow = { id: number };

/** Row type for the questions lookup query. */
type QRow = { id: number; correct_answer: string; keyword: string };

/**
 * Normalizes a user-supplied answer string for comparison.
 * Lowercases, trims, and collapses internal whitespace.
 *
 * @param s - Raw answer string.
 * @returns Normalised string.
 */
function normalise(s: string): string {
    return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

export const POST: RequestHandler = async ({request, params}) => {
    const {slug} = params;

    // better-sqlite3's prepare<T> takes a single generic for the *result* row type.
    // Bind parameters are passed positionally to .get() / .all() / .run().
    const set = db.prepare('SELECT id FROM sets WHERE slug = ?').get(slug!) as SetRow | undefined;

    if (!set) throw error(404, 'Set not found.');

    let body: { answers: Array<{ questionId: number; given: string }> };
    try {
        body = await request.json();
    } catch {
        throw error(400, 'Invalid JSON.');
    }

    if (!Array.isArray(body.answers) || body.answers.length === 0) {
        throw error(400, 'answers array required.');
    }

    const dbQuestions = db
        .prepare('SELECT id, correct_answer, keyword FROM questions WHERE set_id = ?')
        .all(set.id) as QRow[];

    const qMap = new Map<number, QRow>(dbQuestions.map((q) => [q.id, q]));

    let score = 0;
    const graded: Array<{ questionId: number; given: string; isCorrect: boolean }> = [];

    for (const sub of body.answers) {
        const q = qMap.get(sub.questionId);
        if (!q) continue;

        const given = normalise(sub.given ?? '');
        const correct = normalise(q.correct_answer);
        const isCorrect = given === correct && given.includes(q.keyword.toLowerCase());

        if (isCorrect) score++;
        graded.push({questionId: sub.questionId, given: sub.given?.trim() ?? '', isCorrect});
    }

    const total = graded.length;
    const attemptSlug = nanoid(10);

    db.transaction(() => {
        const r = db
            .prepare('INSERT INTO attempts (set_id, slug, score, total) VALUES (?, ?, ?, ?)')
            .run(set.id, attemptSlug, score, total);
        const attemptId = r.lastInsertRowid as number;

        for (const g of graded) {
            db.prepare('INSERT INTO answers (attempt_id, question_id, given, is_correct) VALUES (?, ?, ?, ?)').run(attemptId, g.questionId, g.given, g.isCorrect ? 1 : 0);
        }
    })();

    return json({attemptSlug, score, total});
};