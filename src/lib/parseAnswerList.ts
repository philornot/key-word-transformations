/**
 * @fileoverview Utility for parsing semicolon-delimited KWT answer lists.
 */

/**
 * Parses a multi-line, semicolon-delimited answer list into an array of strings.
 *
 * Line breaks produced by word-wrap in printed/PDF tables are collapsed into
 * spaces before splitting, so e.g.:
 *   "had lost\ncontact with; lost touch" → ["had lost contact with", "lost touch"]
 *
 * @param raw - Raw pasted string from clipboard.
 * @returns Array of trimmed, non-empty answer strings.
 */
export function parseAnswerList(raw: string): string[] {
    return raw
        .replace(/\r?\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean);
}