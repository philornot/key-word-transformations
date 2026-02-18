/**
 * @fileoverview Module-level reactive store for the OCR review workflow.
 *
 * Survives navigation between /create/scan and /review within the same
 * browser session. A page refresh resets it — that is intentional.
 */

import type { ParsedKWTQuestion } from './types.js';

/** Mutable reactive state for the question-review workflow. */
export const reviewState = $state<{
  questions: ParsedKWTQuestion[];
  rawText: string;
  title: string;
}>({
  questions: [],
  rawText: '',
  title: '',
});