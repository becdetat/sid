import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.DATABASE_PATH ?? path.resolve('sid.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        name       TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT (datetime('now')),
        deleted_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS transactions (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id   INTEGER NOT NULL REFERENCES accounts(id),
        description  TEXT NOT NULL,
        amount_cents INTEGER NOT NULL,
        type         TEXT NOT NULL CHECK(type IN ('income', 'expense')),
        date         DATE NOT NULL,
        notes        TEXT,
        created_at   DATETIME NOT NULL DEFAULT (datetime('now')),
        updated_at   DATETIME NOT NULL DEFAULT (datetime('now')),
        deleted_at   DATETIME
    );

    CREATE TABLE IF NOT EXISTS attachments (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id INTEGER NOT NULL REFERENCES transactions(id),
        filename       TEXT NOT NULL,
        mime_type      TEXT NOT NULL,
        size_bytes     INTEGER NOT NULL DEFAULT 0,
        data           BLOB NOT NULL,
        created_at     DATETIME NOT NULL DEFAULT (datetime('now')),
        deleted_at     DATETIME
    );
`);

try {
    db.exec(`ALTER TABLE attachments ADD COLUMN size_bytes INTEGER NOT NULL DEFAULT 0`);
} catch {
    // column already exists
}

export default db;
