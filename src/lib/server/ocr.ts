/**
 * @fileoverview OCR pipeline: extract raw text from uploaded images or PDFs.
 *
 * - Images (JPEG, PNG, WEBP, etc.): pre-processed with sharp, then run
 *   through Tesseract.js with PSM 6 (single uniform block of text).
 * - PDFs: text extracted directly with pdf-parse.
 *
 * Image preprocessing pipeline (why each step matters):
 *  1. Crop left sidebar  — rotated "Matura rozszerzona…" label produces
 *                          noise tokens that confuse the parser.
 *  2. Crop right margin  — "do 4 wyrazów" note lands mid-sentence otherwise.
 *  3. 2× upscale         — Tesseract accuracy improves significantly on
 *                          characters larger than ~20 px tall.
 *  4. Grayscale          — colour info is irrelevant and slows OCR.
 *  5. Underline detection — worksheet gaps (______) are printed as long
 *                          horizontal lines; Tesseract ignores or mangles
 *                          them. We detect them via pixel density, white
 *                          them out, and inject '______' markers into the
 *                          reconstructed text at the correct positions.
 *  6. OCR with per-word data — we use image_to_data (confidence + bounding
 *                          boxes) so low-confidence noise words can be
 *                          dropped and underline positions can be correlated
 *                          with text line positions.
 */

import {createWorker} from 'tesseract.js';
import pdfParse from 'pdf-parse';
import {join} from 'path';
import sharp from 'sharp';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Extracts raw text from the given file buffer.
 *
 * @param buffer - The raw file bytes.
 * @param mimeType - MIME type of the file (e.g. "image/jpeg", "application/pdf").
 * @returns The extracted plain text string.
 * @throws {Error} If the MIME type is unsupported or OCR fails.
 */
export async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
    if (mimeType === 'application/pdf') {
        return extractTextFromPdf(buffer);
    }

    if (mimeType.startsWith('image/')) {
        return extractTextFromImage(buffer);
    }

    throw new Error(`Unsupported file type: ${mimeType}`);
}

// ---------------------------------------------------------------------------
// Image OCR
// ---------------------------------------------------------------------------

/** Minimum word-confidence threshold — words below this are treated as noise. */
const MIN_WORD_CONFIDENCE = 40;

/** Fraction of image width that must be dark for a row to count as an underline. */
const UNDERLINE_DARK_FRACTION = 0.25;

/** Pixel value (0–255) below which a pixel is considered "dark". */
const DARK_THRESHOLD = 80;

/** Gap between rows (in scaled pixels) that separates two distinct underline bands. */
const UNDERLINE_GAP = 10;

/**
 * A detected horizontal underline band with its pixel row extent.
 */
interface UnderlineBand {
    /** First row index (inclusive) of the band in the scaled image. */
    rowStart: number;
    /** Last row index (inclusive) of the band in the scaled image. */
    rowEnd: number;
}

/**
 * Pre-processes an image buffer to improve Tesseract OCR quality on printed
 * English-grammar worksheets and returns cleaned text with gap markers.
 *
 * @param buffer - Raw image bytes (JPEG, PNG, WEBP, …).
 * @returns Extracted text with `______` inserted where underline gaps were detected.
 */
async function extractTextFromImage(buffer: Buffer): Promise<string> {
    const meta = await sharp(buffer).metadata();
    const origW = meta.width ?? 1000;
    const origH = meta.height ?? 1000;

    // ── Step 1 & 2: crop sidebars ────────────────────────────────────────
    // Left sidebar contains rotated label text → noise.
    // Right margin contains word-count notes ("do 4 wyrazów") → noise.
    const leftCrop = Math.floor(origW * 0.065);
    const topCrop = Math.floor(origH * 0.02);
    const rightEdge = Math.floor(origW * 0.82);
    const cropW = rightEdge - leftCrop;
    const cropH = origH - topCrop;

    // ── Step 3 & 4: upscale 2×, convert to grayscale ────────────────────
    const SCALE = 2;
    const scaledW = cropW * SCALE;
    const scaledH = cropH * SCALE;

    const grayBuffer = await sharp(buffer)
        .extract({left: leftCrop, top: topCrop, width: cropW, height: cropH})
        .resize(scaledW, scaledH, {kernel: sharp.kernel.lanczos3})
        .grayscale()
        .raw()
        .toBuffer();

    // ── Step 5: detect underline bands ──────────────────────────────────
    const bands = detectUnderlineBands(grayBuffer, scaledW, scaledH);

    // White-out the underline rows so Tesseract doesn't try to read them
    // (it produces garbage on pure horizontal lines).
    const cleanBuffer = Buffer.from(grayBuffer);
    for (const band of bands) {
        const r0 = Math.max(0, band.rowStart - 2);
        const r1 = Math.min(scaledH - 1, band.rowEnd + 2);
        for (let r = r0; r <= r1; r++) {
            cleanBuffer.fill(255, r * scaledW, (r + 1) * scaledW);
        }
    }

    // Re-encode the cleaned raw buffer as PNG for Tesseract.
    const cleanPng = await sharp(cleanBuffer, {raw: {width: scaledW, height: scaledH, channels: 1}})
        .png()
        .toBuffer();

    // ── Step 6: OCR with per-word bounding boxes ─────────────────────────
    const worker = await createWorker(['eng', 'pol'], 1, {
        langPath: join(process.cwd()), logger: () => {
        },
    });

    // PSM 6 = single uniform block of text — best for worksheets where the
    // page has been cropped to remove layout elements.
    await worker.setParameters({tessedit_pageseg_mode: '6' as any});

    const {data} = await worker.recognize(cleanPng);
    await worker.terminate();

    return reconstructText(data, bands);
}

// ---------------------------------------------------------------------------
// Underline detection
// ---------------------------------------------------------------------------

/**
 * Finds horizontal underline bands in a grayscale image by counting dark
 * pixels per row.  A row is part of an underline band when the fraction of
 * dark pixels (value < {@link DARK_THRESHOLD}) exceeds
 * {@link UNDERLINE_DARK_FRACTION} of the row width.
 *
 * @param pixels - Raw grayscale pixel buffer (1 byte per pixel, row-major).
 * @param width  - Image width in pixels.
 * @param height - Image height in pixels.
 * @returns Array of detected {@link UnderlineBand} objects, sorted by row.
 */
function detectUnderlineBands(pixels: Buffer, width: number, height: number): UnderlineBand[] {
    const threshold = Math.floor(width * UNDERLINE_DARK_FRACTION);
    const darkRows: number[] = [];

    for (let r = 0; r < height; r++) {
        let darkCount = 0;
        const rowStart = r * width;
        for (let c = 0; c < width; c++) {
            if (pixels[rowStart + c] < DARK_THRESHOLD) darkCount++;
        }
        if (darkCount >= threshold) darkRows.push(r);
    }

    if (darkRows.length === 0) return [];

    // Cluster consecutive dark rows into bands.
    const bands: UnderlineBand[] = [];
    let bandStart = darkRows[0];
    let prev = darkRows[0];

    for (const r of darkRows.slice(1)) {
        if (r - prev > UNDERLINE_GAP) {
            bands.push({rowStart: bandStart, rowEnd: prev});
            bandStart = r;
        }
        prev = r;
    }
    bands.push({rowStart: bandStart, rowEnd: prev});

    return bands;
}

// ---------------------------------------------------------------------------
// Text reconstruction
// ---------------------------------------------------------------------------

/**
 * Reconstructs a clean text string from Tesseract word-level data, inserting
 * `______` markers wherever a detected underline band falls between two
 * consecutive OCR text lines.
 *
 * Words with confidence below {@link MIN_WORD_CONFIDENCE} are dropped —
 * they are typically noise tokens produced by border pixels or scanner
 * artefacts.
 *
 * @param data   - Tesseract `recognize` result data object (word-level).
 * @param bands  - Underline bands detected by {@link detectUnderlineBands}.
 * @returns Reconstructed text string with `______` gap markers.
 */
function reconstructText(data: Awaited<ReturnType<Awaited<ReturnType<typeof createWorker>>['recognize']>>['data'], bands: UnderlineBand[],): string {
    // Group words into lines keyed by Tesseract's line_num.
    interface LineInfo {
        words: string[];
        top: number;
        bottom: number;
    }

    const lineMap = new Map<number, LineInfo>();

    for (const word of data.words) {
        if (word.confidence < MIN_WORD_CONFIDENCE) continue;
        const text = word.text.trim();
        if (!text) continue;

        const ln = word.line_num ?? 0;
        const top = word.bbox.y0;
        const bottom = word.bbox.y1;

        if (!lineMap.has(ln)) {
            lineMap.set(ln, {words: [], top, bottom});
        }
        const info = lineMap.get(ln)!;
        info.words.push(text);
        info.top = Math.min(info.top, top);
        info.bottom = Math.max(info.bottom, bottom);
    }

    const sortedLines = Array.from(lineMap.entries()).sort(([a], [b]) => a - b);
    const resultLines: string[] = [];
    let prevBottom = 0;

    for (const [, info] of sortedLines) {
        // Inject ______ for every underline band that falls in the gap above this line.
        for (const band of bands) {
            if (prevBottom < band.rowStart && band.rowStart < info.top) {
                resultLines.push('______');
            }
        }

        const lineText = cleanLineText(info.words.join(' '));
        if (lineText) resultLines.push(lineText);
        prevBottom = info.bottom;
    }

    // Inject ______ for underline bands that fall after the last text line.
    for (const band of bands) {
        if (band.rowStart > prevBottom) {
            resultLines.push('______');
        }
    }

    // Collapse consecutive duplicate ______ into one.
    const deduped: string[] = [];
    for (const line of resultLines) {
        if (line === '______' && deduped.at(-1) === '______') continue;
        deduped.push(line);
    }

    return deduped.join('\n');
}

/**
 * Cleans a single reconstructed text line by stripping pipe/colon border
 * artefacts that Tesseract emits when scanning near image edges.
 *
 * @param line - Raw joined word string for a single OCR line.
 * @returns Cleaned string, or empty string if nothing meaningful remains.
 */
function cleanLineText(line: string): string {
    // Strip leading/trailing pipe and colon artefacts from border scanning.
    let cleaned = line.replace(/^[\s|:]+/, '').replace(/[\s|:]+$/, '');
    // Remove trailing "| |" or similar multi-pipe noise.
    cleaned = cleaned.replace(/(\s*\|\s*){2,}$/, '').trim();
    // Drop lines that are only punctuation/symbols (≤4 chars, no letters).
    if (/^[^\w]{1,4}$/.test(cleaned)) return '';
    return cleaned;
}

// ---------------------------------------------------------------------------
// PDF extraction
// ---------------------------------------------------------------------------

/**
 * Extracts text from a PDF using pdf-parse.
 * Works best for digitally-created PDFs.  For purely scanned PDFs the result
 * may be empty and the caller should fall back to rasterising + OCR.
 *
 * @param buffer - Raw PDF bytes.
 * @returns Extracted text content.
 */
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
    const data = await pdfParse(buffer);
    return data.text;
}