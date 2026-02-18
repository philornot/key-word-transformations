/**
 * @fileoverview Shared type definitions for Key Word Transformation exercises.
 */

/**
 * A single KWT question as returned from the OCR/parse pipeline,
 * before it is saved to the database. The `correctAnswer` may be null
 * if the parser couldn't detect it — the user fills it in during review.
 */
export interface ParsedKWTQuestion {
  /** Full original sentence (the "stem"). */
  sentence1: string;
  /** Second sentence containing `______` as the gap placeholder. */
  sentence2WithGap: string;
  /** The key word, written in uppercase. */
  keyword: string;
  /** The phrase that fills the gap, including the keyword. Null until set by user. */
  correctAnswer: string | null;
  /** Maximum number of words allowed (typically 3, 4, or 5). */
  maxWords: 3 | 4 | 5;
}

/** A persisted KWT question loaded from the database. */
export interface KWTQuestion {
  id: number;
  position: number;
  sentence1: string;
  sentence2WithGap: string;
  keyword: string;
  correctAnswer: string;
  maxWords: 3 | 4 | 5;
}

/** A question sent to the browser for test-taking (no correct answer). */
export interface PublicKWTQuestion {
  id: number;
  position: number;
  sentence1: string;
  sentence2WithGap: string;
  keyword: string;
  maxWords: 3 | 4 | 5;
}

/** A set as sent to the browser. */
export interface PublicSet {
  id: number;
  slug: string;
  title: string;
  questions: PublicKWTQuestion[];
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
  isCorrect: boolean;
}

/** Full attempt result returned after grading. */
export interface AttemptResult {
  attemptSlug: string;
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
