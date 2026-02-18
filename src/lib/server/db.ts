import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(process.cwd(), 'data');
mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(join(DATA_DIR, 'worksheet.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS sets (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    slug       TEXT    UNIQUE NOT NULL,
    title      TEXT    NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS questions (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    set_id             INTEGER NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
    position           INTEGER NOT NULL,
    sentence1          TEXT    NOT NULL,
    sentence2_with_gap TEXT    NOT NULL,
    keyword            TEXT    NOT NULL,
    correct_answer     TEXT    NOT NULL,
    max_words          INTEGER NOT NULL DEFAULT 5
  );

  CREATE TABLE IF NOT EXISTS attempts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    set_id     INTEGER NOT NULL REFERENCES sets(id),
    slug       TEXT    UNIQUE NOT NULL,
    score      INTEGER NOT NULL,
    total      INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS answers (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    attempt_id  INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES questions(id),
    given       TEXT,
    is_correct  INTEGER NOT NULL
  );
`);