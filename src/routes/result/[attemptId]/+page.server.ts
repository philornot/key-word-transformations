import type {PageServerLoad} from './$types.js';
import {db} from '$lib/server/db.js';
import {error} from '@sveltejs/kit';
import type {AttemptResult} from '$lib/types.js';

export const load: PageServerLoad = ({params}) => {
    const attempt = db.prepare('SELECT id, set_id, score, total FROM attempts WHERE slug = ?').get(params.attemptId) as {
        id: number; set_id: number; score: number; total: number
    } | undefined;

    if (!attempt) throw error(404, 'Result not found.');

    const set = db.prepare('SELECT title FROM sets WHERE id = ?').get(attempt.set_id) as { title: string } | undefined;

    type ARow = {
        question_id: number;
        position: number;
        sentence1: string;
        sentence2_with_gap: string;
        keyword: string;
        correct_answer: string;
        given: string | null;
        is_correct: number;
    };

    const rows = db.prepare(`SELECT a.question_id,
                                    q.position,
                                    q.sentence1,
                                    q.sentence2_with_gap,
                                    q.keyword,
                                    q.correct_answer,
                                    a.given,
                                    a.is_correct
                             FROM answers a
                                      JOIN questions q ON q.id = a.question_id
                             WHERE a.attempt_id = ?
                             ORDER BY q.position`).all(attempt.id) as ARow[];

    const result: AttemptResult = {
        attemptSlug: params.attemptId,
        setTitle: set?.title ?? 'Unknown set',
        score: attempt.score,
        total: attempt.total,
        percentage: attempt.total > 0 ? Math.round((attempt.score / attempt.total) * 100) : 0,
        answers: rows.map((r) => ({
            questionId: r.question_id,
            position: r.position,
            sentence1: r.sentence1,
            sentence2WithGap: r.sentence2_with_gap,
            keyword: r.keyword,
            given: r.given,
            correctAnswer: r.correct_answer,
            isCorrect: r.is_correct === 1,
        })),
    };

    return {result};
};