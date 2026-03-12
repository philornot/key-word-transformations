/**
 * @fileoverview Shared type definitions for Key Word Transformation exercises.
 */

import type { ExerciseType } from '$lib/constants.js';

/**
 * A single KWT question as returned from the OCR/parse pipeline,
 * before it is saved to the database.
 */
export interface ParsedKWTQuestion {
    /** Full original sentence (the "stem"). Only used for 'kwt' type sets. */
    sentence1: string;
    /** Second sentence containing `______` as the gap placeholder. */
    sentence2WithGap: string;
    /** The key word, written in uppercase. Only used for 'kwt' type sets. */
    keyword: string;
    /** The primary correct answer. Null until set by user. */
    correctAnswer: string | null;
    /** Additional accepted answers (e.g. contraction variants, CKE alternates). */
    alternativeAnswers: string[];
    /**
     * Answers that are definitively wrong and used to generate specific
     * feedback in the result view (e.g. CKE-published incorrect examples).
     */
    exampleWrongAnswers: string[];
    /** Minimum number of words required in the answer (inclusive). */
    minWords: number;
    /** Maximum number of words allowed in the answer (inclusive). */
    maxWords: number;
}

/** A persisted KWT question loaded from the database. */
export interface KWTQuestion {
    id: number;
    position: number;
    sentence1: string;
    sentence2WithGap: string;
    keyword: string;
    correctAnswer: string;
    alternativeAnswers: string[];
    exampleWrongAnswers: string[];
    /** Minimum number of words required in the answer (inclusive). */
    minWords: number;
    /** Maximum number of words allowed in the answer (inclusive). */
    maxWords: number;
}

/** A question sent to the browser for test-taking (no answers). */
export interface PublicKWTQuestion {
    id: number;
    position: number;
    sentence1: string;
    sentence2WithGap: string;
    keyword: string;
    /** Minimum number of words required in the answer (inclusive). */
    minWords: number;
    /** Maximum number of words allowed in the answer (inclusive). */
    maxWords: number;
}

/** A set as sent to the browser. */
export interface PublicSet {
    id: number;
    slug: string;
    title: string;
    sourceLabel: string | null;
    /** Exercise type that determines how questions are displayed and validated. */
    type: ExerciseType;
    questions: PublicKWTQuestion[];
}

/** Summary row used on the home page set listing. */
export interface SetSummary {
    slug: string;
    title: string;
    sourceLabel: string | null;
    /** Exercise type for grouping on the home page. */
    type: ExerciseType;
    questionCount: number;
    createdAt: string;
}

/** A single submitted answer from the test-taker. */
export interface SubmittedAnswer {
    questionId: number;
    given: string;
}

/** One graded answer in the attempt result. */
export interface AnswerResult {
    questionId: number;
    position: number;
    sentence1: string;
    sentence2WithGap: string;
    keyword: string;
    given: string | null;
    correctAnswer: string;
    alternativeAnswers: string[];
    /**
     * Surface-form variants of the answer the user submitted that they did
     * not write — computed from the parenthesised optional segments in the
     * stored answer (e.g. "so noisy outside (that)").
     * Empty when the matched answer has no optional parts, or when wrong.
     */
    siblingVariants: string[];
    isCorrect: boolean;
    /** True when `given` exactly matches one of the teacher-supplied wrong examples. */
    isKnownWrongAnswer: boolean;
}

/** Full attempt result returned after grading. */
export interface AttemptResult {
    attemptSlug: string;
    setSlug: string;
    setTitle: string;
    score: number;
    total: number;
    percentage: number;
    answers: AnswerResult[];
}

/** Response from the /api/upload endpoint. */
export interface UploadResponse {
    questions: ParsedKWTQuestion[];
    rawText: string;
}

/** Full KWT set with questions, as loaded for the edit page. */
export interface EditableSet {
    id: number;
    slug: string;
    title: string;
    sourceLabel: string | null;
    isPublic: boolean;
    /** Exercise type that determines editor behaviour. */
    type: ExerciseType;
    questions: KWTQuestion[];
}
