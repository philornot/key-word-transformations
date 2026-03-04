/**
 * @fileoverview Shared constants used by both server and client code.
 */

/** Canonical gap placeholder stored in the database and rendered in the UI. */
export const CANONICAL_GAP = '______';

/** All valid exercise-set types. Order determines display order on the home page. */
export const EXERCISE_TYPES = ['kwt', 'grammar', 'translation'] as const;

/** Discriminated union of exercise-set types. */
export type ExerciseType = (typeof EXERCISE_TYPES)[number];