/**
 * @fileoverview Heuristic paste-splitter for KWT answer lists.
 *
 * Tries a sequence of delimiter strategies in priority order and returns
 * the first one that yields 2+ distinct answers. Returns null when the
 * pasted text looks like a single answer so the caller can fall through
 * to normal paste behaviour.
 *
 * Supported patterns (examples):
 *   Semicolons (inline):    "ans1; ans2; ans3"
 *   Semicolons (per-line):  "ans1;\nans2;\nans3"
 *   Pipes:                  "ans1 | ans2 | ans3"
 *   Slashes:                "ans1 / ans2 / ans3"
 *   Numbered list:          "1. ans1\n2. ans2"
 *   Letter list:            "a) ans1\nb) ans2"
 *   Commas (inline):        "ans1, ans2, ans3"
 *   Commas (per-line):      "ans1,\nans2,\nans3,"
 *   Plain newlines:         "ans1\nans2\nans3"
 */

/** One splitting strategy: returns tokens or null if the pattern doesn't match. */
type Strategy = (text: string) => string[] | null;

/**
 * Normalises a single answer token:
 *  - Collapses internal whitespace (handles PDF word-wrap newlines).
 *  - Strips trailing list-delimiter characters (`,`, `;`, `/`) so that
 *    per-line delimiters like "ans1,\nans2," produce clean tokens.
 *
 * @param s - Raw token string.
 * @returns Clean, trimmed answer string.
 */
function normaliseToken(s: string): string {
    return s
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/[,;/]+$/, '')
        .trim();
}

/**
 * Splits `text` on `delimiter` and returns clean, non-empty tokens.
 * Collapses intra-token newlines before splitting so that multi-line
 * PDF cells (e.g. "had lost\ncontact with; lost touch") are handled
 * correctly for inline delimiters.
 *
 * For newline-based splitting we do NOT collapse first — the newline IS
 * the delimiter and must be preserved until we split on it.
 *
 * @param text - Input string.
 * @param delimiter - Delimiter string or regex.
 * @param collapseNewlines - Whether to collapse newlines before splitting.
 * @returns Array of clean tokens.
 */
function splitOn(text: string, delimiter: string | RegExp, collapseNewlines = true,): string[] {
    const normalised = collapseNewlines ? text.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ') : text;
    return normalised
        .split(delimiter)
        .map(normaliseToken)
        .filter(Boolean);
}

/**
 * Returns true when every token looks like a plausible KWT answer:
 * non-empty and at most 8 words (gap answers are never longer).
 *
 * @param tokens - Candidate token array.
 */
function allPlausible(tokens: string[]): boolean {
    return tokens.every((t) => t.length > 0 && t.split(/\s+/).length <= 8);
}

const STRATEGIES: Strategy[] = [// ── 1. Semicolons ────────────────────────────────────────────────
    // Works both inline ("a; b; c") and per-line ("a;\nb;\nc").
    // Intra-token newlines are collapsed so PDF word-wrapped cells work.
    (text) => {
        if (!text.includes(';')) return null;
        return splitOn(text, ';');
    },

    // ── 2. Pipe  ─────────────────────────────────────────────────────
    (text) => {
        if (!text.includes('|')) return null;
        return splitOn(text, /\s*\|\s*/);
    },

    // ── 3. Slash  ────────────────────────────────────────────────────
    (text) => {
        if (!text.includes('/')) return null;
        const tokens = splitOn(text, /\s*\/\s*/);
        // Guard: reject if it looks like a URL or date ("2024/01/01").
        if (tokens.some((t) => /^\d+$/.test(t))) return null;
        return tokens;
    },

    // ── 4. Numbered list ─────────────────────────────────────────────
    // "1. ans", "1) ans", "(1) ans", "1: ans"
    (text) => {
        const lines = text.split(/\r?\n/).map(normaliseToken).filter(Boolean);
        if (lines.length < 2) return null;
        const marker = /^(?:\(\d+\)|\d+[.):])\s*/;
        if (!lines.every((l) => marker.test(l))) return null;
        return lines.map((l) => l.replace(marker, '').trim()).filter(Boolean);
    },

    // ── 5. Letter list ───────────────────────────────────────────────
    // "a) ans", "a. ans", "(a) ans"
    (text) => {
        const lines = text.split(/\r?\n/).map(normaliseToken).filter(Boolean);
        if (lines.length < 2) return null;
        const marker = /^(?:\([a-zA-Z]\)|[a-zA-Z][.):])[\s]*/;
        if (!lines.every((l) => marker.test(l))) return null;
        return lines.map((l) => l.replace(marker, '').trim()).filter(Boolean);
    },

    // ── 6. Commas ────────────────────────────────────────────────────
    // Handles both inline ("a, b, c") and per-line ("a,\nb,\nc,").
    // normaliseToken already strips trailing commas, so per-line works
    // via the newline strategy below — this handles the inline case.
    // Guard: every token must be ≤ 8 words (avoids splitting prose sentences
    // like "however, he decided to leave" into bogus answers).
    (text) => {
        if (!text.includes(',')) return null;
        const tokens = splitOn(text, ',');
        if (tokens.length < 2) return null;
        if (!allPlausible(tokens)) return null;
        return tokens;
    },

    // ── 7. Plain newlines ────────────────────────────────────────────
    // Each non-empty line is one answer. normaliseToken strips trailing
    // `,;/` so "ans1,\nans2," → ["ans1", "ans2"].
    (text) => {
        const lines = text
            .split(/\r?\n/)
            .map(normaliseToken)
            .filter(Boolean);
        if (lines.length < 2) return null;
        return lines;
    },];

/**
 * Attempts to detect the delimiter pattern in pasted text and split it into
 * an array of trimmed, non-empty answer strings.
 *
 * Returns `null` when the text looks like a single answer so the caller can
 * allow the default paste behaviour.
 *
 * @param text - Raw pasted string from the clipboard.
 * @returns Array of answers, or null if no multi-answer pattern was detected.
 */
export function smartSplit(text: string): string[] | null {
    for (const strategy of STRATEGIES) {
        const result = strategy(text);
        if (result && result.length > 1) return result;
    }
    return null;
}