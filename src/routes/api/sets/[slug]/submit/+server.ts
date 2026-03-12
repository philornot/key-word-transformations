/**
 * @fileoverview Grading endpoint for a single exercise set attempt.
 *
 * Receives submitted answers, grades them against stored correct answers
 * (with contraction expansion and optional-segment support via answerUtils),
 * persists the attempt, and returns the attempt slug for the result page.
 */

import type { RequestHandler } from '@sveltejs/kit';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db.js';
import { nanoid } from 'nanoid';
import { normalise, buildAcceptedSet } from '$lib/answerUtils.js';

/** Row type for the set lookup query. */
type SetRow = { id: number };

/** Row type for the questions lookup query. */
type QRow = { id: number; correct_answer: string; alternative_answers: string };

export const POST: RequestHandler = async ({ request, params }) => {
    const { slug } = params;

    const set = db
        .prepare('SELECT id FROM sets WHERE slug = ?')
        .get(slug!) as SetRow | undefined;

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
        .prepare('SELECT id, correct_answer, alternative_answers FROM questions WHERE set_id = ?')
        .all(set.id) as QRow[];

    const qMap = new Map<number, QRow>(dbQuestions.map((q) => [q.id, q]));

    let score = 0;
    const graded: Array<{ questionId: number; given: string; isCorrect: boolean }> = [];

    for (const sub of body.answers) {
        const q = qMap.get(sub.questionId);
        if (!q) continue;

        const normGiven = normalise(sub.given ?? '');
        const alternatives: string[] = JSON.parse(q.alternative_answers || '[]');
        const acceptedNorm = buildAcceptedSet(q.correct_answer, alternatives);

        const isCorrect = normGiven.length > 0 && acceptedNorm.includes(normGiven);

        if (isCorrect) score++;
        graded.push({ questionId: sub.questionId, given: sub.given?.trim() ?? '', isCorrect });
    }

    const total = graded.length;
    const attemptSlug = nanoid(10);

    db.transaction(() => {
        const r = db
            .prepare('INSERT INTO attempts (set_id, slug, score, total) VALUES (?, ?, ?, ?)')
            .run(set.id, attemptSlug, score, total);
        const attemptId = r.lastInsertRowid as number;

        const insertAnswer = db.prepare(
            'INSERT INTO answers (attempt_id, question_id, given, is_correct) VALUES (?, ?, ?, ?)',
        );
        for (const g of graded) {
            insertAnswer.run(attemptId, g.questionId, g.given, g.isCorrect ? 1 : 0);
        }
    })();

    return json({ attemptSlug, score, total });
};
