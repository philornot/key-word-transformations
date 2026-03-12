/**
 * @fileoverview OCR upload endpoint.
 *
 * Accepts JPEG, PNG, WEBP, or PDF files up to 20 MB, runs OCR via
 * extractText(), and returns the raw text alongside parsed question drafts.
 *
 * A simple in-memory rate limiter caps each IP to one upload every
 * RATE_LIMIT_MS milliseconds to prevent runaway Tesseract load on the RPi.
 * Stale entries are cleaned up periodically so the Map does not grow forever.
 */

import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { extractText } from '$lib/server/ocr.js';
import { parseQuestions } from '$lib/parser.js';

const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
]);

// ── Rate limiter ──────────────────────────────────────────────────────────────

/** Minimum milliseconds between uploads from the same IP. */
const RATE_LIMIT_MS = 15_000;

/** Last upload timestamp keyed by IP address. */
const lastUpload = new Map<string, number>();

// Remove entries older than 2× the rate-limit window every 10 minutes
// so the Map does not accumulate stale IPs indefinitely.
const cleanup = setInterval(
    () => {
        const cutoff = Date.now() - RATE_LIMIT_MS * 2;
        for (const [ip, ts] of lastUpload) {
            if (ts < cutoff) lastUpload.delete(ip);
        }
    },
    10 * 60_000,
);

// Prevent the timer from keeping the process alive during graceful shutdown.
if (typeof cleanup.unref === 'function') cleanup.unref();

/**
 * Returns true when the given IP is allowed to upload now, and records
 * the current timestamp so the next call respects the cooldown.
 *
 * @param ip - Client IP address string.
 * @returns True if the request should proceed.
 */
function checkRateLimit(ip: string): boolean {
    const last = lastUpload.get(ip) ?? 0;
    if (Date.now() - last < RATE_LIMIT_MS) return false;
    lastUpload.set(ip, Date.now());
    return true;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export const POST: RequestHandler = async ({ request }) => {
    const ip =
        request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
        request.headers.get('x-real-ip') ??
        'unknown';

    if (!checkRateLimit(ip)) {
        throw error(429, 'Too many requests — wait a moment before uploading again.');
    }

    let formData: FormData;
    try {
        formData = await request.formData();
    } catch {
        throw error(400, 'Invalid multipart form data.');
    }

    const file = formData.get('file');
    if (!(file instanceof File)) throw error(400, 'No file provided.');
    if (!ALLOWED_TYPES.has(file.type)) throw error(415, `Unsupported file type: ${file.type}.`);
    if (file.size > MAX_BYTES) throw error(413, 'File exceeds 20 MB limit.');

    const buffer = Buffer.from(await file.arrayBuffer());

    let rawText: string;
    try {
        rawText = await extractText(buffer, file.type);
    } catch (err) {
        console.error('OCR error:', err);
        throw error(500, 'OCR processing failed.');
    }

    if (!rawText.trim()) throw error(422, 'No text could be extracted from the file.');

    const questions = parseQuestions(rawText);
    return json({ questions, rawText });
};
