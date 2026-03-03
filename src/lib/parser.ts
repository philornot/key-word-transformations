/**
 * @fileoverview KWT-tuned heuristic parser for OCR output and pasted plain text.
 *
 * Handles both simple numbering ("1.") and compound numbering ("9.1.")
 * as used in Polish matura exam sheets.
 *
 * Key insight: the KWT block structure is deterministic regardless of
 * whether the gap marker survived OCR:
 *
 *   9.1. <sentence1 — may span multiple lines>
 *        KEYWORD
 *        <sentence2 — may span multiple lines, may or may not contain gap>
 *
 * We split on the keyword line. If a gap marker exists in sentence2 we
 * normalise it; if it doesn't, we insert a canonical gap at the first
 * plausible break point so the editor shows something the user can fix.
 *
 * This module contains no Node.js imports and is safe to use in both
 * server-side and client-side (browser) contexts.
 */

import type {ParsedKWTQuestion} from './types.js';
import {CANONICAL_GAP} from './constants.js';

/**
 * Matches numbered exercise starts in both formats:
 *   "1. text"   — simple
 *   "9.1. text" — compound matura-style
 */
const QUESTION_START_RE = /^\s*(\d+(?:[.]\d+)*[.)]\s?)\s*(.*)/;

/**
 * A standalone keyword line: a single word, 2–20 letters, ALL-CAPS or
 * title-cased (e.g. "SO", "LOST", "So"). OCR sometimes down-cases the
 * keyword, so we accept any-case single word here and uppercase it later.
 */
const KEYWORD_RE = /^[A-Za-z]{2,20}$/;

/**
 * Visual gap representations produced by scanners / Tesseract or copy-pasted
 * from PDF/Word documents:
 *  - 3+ underscores   (most common)
 *  - repeated em/en dashes
 *  - 4+ regular hyphens (Tesseract artefact)
 *  - 5+ dots
 */
const GAP_RE = /_{3,}|—{2,}|-{4,}|\.{5,}/g;

// ---------------------------------------------------------------------------
// OCR post-processing
// ---------------------------------------------------------------------------

/**
 * Common single-character substitution errors produced by Tesseract
 * when scanning serif fonts.
 */
const CHAR_FIXES: Array<[RegExp, string]> = [// Lone pipe → capital I (only when surrounded by whitespace / line edges).
    [/(?<!\w)\|(?!\w)/g, 'I'],];

/**
 * Cleans up common Tesseract character-recognition errors in raw OCR text.
 *
 * @param text - Raw string from Tesseract or pdf-parse.
 * @returns Cleaned string with known substitution errors corrected.
 */
function fixOcrArtefacts(text: string): string {
    let result = text;
    for (const [pattern, replacement] of CHAR_FIXES) {
        result = result.replace(pattern, replacement);
    }
    return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parses raw OCR text or pasted plain text into KWT question drafts.
 *
 * Safe to call in browser context (no Node.js APIs used).
 *
 * @param rawText - Plain text string from Tesseract, pdf-parse, or clipboard.
 * @returns Array of partially-filled {@link ParsedKWTQuestion} objects.
 */
export function parseQuestions(rawText: string): ParsedKWTQuestion[] {
    const cleaned = fixOcrArtefacts(rawText);

    const lines = cleaned
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

    const blocks = splitIntoBlocks(lines);
    return blocks
        .map(parseBlock)
        .filter((q) => q.sentence1.trim().length > 0);
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/**
 * Groups lines into per-question blocks delimited by numbered question starts.
 *
 * @param lines - Trimmed, non-empty lines from the source text.
 * @returns Array of line groups, one per question.
 */
function splitIntoBlocks(lines: string[]): string[][] {
    const blocks: string[][] = [];
    let current: string[] = [];

    for (const line of lines) {
        if (QUESTION_START_RE.test(line)) {
            if (current.length) blocks.push(current);
            current = [line];
        } else if (current.length) {
            current.push(line);
        }
    }
    if (current.length) blocks.push(current);
    return blocks;
}

/**
 * Converts one block of lines into a {@link ParsedKWTQuestion}.
 *
 * Strategy:
 *  - Find the first line that looks like a standalone keyword (KEYWORD_RE).
 *  - Lines before it → sentence1 (joined with spaces).
 *  - Lines after it  → sentence2 (joined with spaces).
 *  - Normalise any gap marker in sentence2 to `______`.
 *  - If no gap is found, insert a fallback gap so the editor always has
 *    something to show.
 *
 * `minWords` and `maxWords` are left at 0 because the parser cannot infer
 * the intended word count from the source document.
 *
 * @param block - Lines belonging to one numbered question.
 * @returns Parsed question draft.
 */
function parseBlock(block: string[]): ParsedKWTQuestion {
    const firstMatch = block[0].match(QUESTION_START_RE);
    const afterNumber = firstMatch ? firstMatch[2].trim() : block[0];

    const allLines = [afterNumber, ...block.slice(1)].filter((l) => l.length > 0);

    const kwIdx = allLines.findIndex((l) => KEYWORD_RE.test(l));

    let keyword = '';
    let s1Lines: string[];
    let s2Lines: string[];

    if (kwIdx === -1) {
        keyword = '';
        s1Lines = allLines;
        s2Lines = [];
    } else {
        // Always uppercase the keyword — OCR may have returned it in any case.
        keyword = allLines[kwIdx].toUpperCase();
        s1Lines = allLines.slice(0, kwIdx);
        s2Lines = allLines.slice(kwIdx + 1);
    }

    const sentence1 = s1Lines.join(' ').trim();

    const rawS2 = s2Lines.join(' ').trim();
    const hasGap = GAP_RE.test(rawS2);

    let sentence2WithGap: string;

    if (hasGap) {
        sentence2WithGap = rawS2.replace(GAP_RE, CANONICAL_GAP).trim();
    } else if (rawS2.length > 0) {
        sentence2WithGap = insertFallbackGap(rawS2);
    } else {
        sentence2WithGap = '';
    }

    return {
        sentence1,
        sentence2WithGap,
        keyword,
        correctAnswer: null,
        alternativeAnswers: [],
        exampleWrongAnswers: [],
        minWords: 0,
        maxWords: 0,
    };
}

/**
 * Inserts a canonical gap into a sentence2 string that contains no gap marker.
 *
 * Heuristic: split at the first sentence-internal dash or comma; fall back
 * to inserting after the first 3–4 words.
 *
 * @param s - Raw sentence2 string with no gap marker.
 * @returns Sentence2 string with `______` inserted.
 */
function insertFallbackGap(s: string): string {
    const dashMatch = s.match(/^(.+?[,–—])\s+(.+)$/);
    if (dashMatch) {
        return `${dashMatch[1].trim()} ${CANONICAL_GAP} ${dashMatch[2].trim()}`.trim();
    }

    const words = s.split(/\s+/);
    const pivot = Math.min(4, Math.max(1, Math.floor(words.length / 2)));
    return [words.slice(0, pivot).join(' '), CANONICAL_GAP, words.slice(pivot).join(' ')]
        .filter(Boolean)
        .join(' ');
}