import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { extractText } from '$lib/server/ocr.js';
import { parseQuestions } from '$lib/server/parser.js';

const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'application/pdf'
]);

export const POST: RequestHandler = async ({ request }) => {
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