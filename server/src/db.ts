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

try {
    db.exec(`ALTER TABLE transactions ADD COLUMN category TEXT`);
} catch {
    // column already exists
}

try {
    db.exec(`ALTER TABLE transactions ADD COLUMN created_at DATETIME`);
    db.exec(`UPDATE transactions SET created_at = datetime('now') WHERE created_at IS NULL`);
} catch {
    // column already exists
}

try {
    db.exec(`ALTER TABLE dashboard_config ADD COLUMN tile_type TEXT DEFAULT 'transactions'`);
} catch {
    // column already exists
}

try {
    db.exec(`ALTER TABLE dashboard_config ADD COLUMN time_window TEXT`);
} catch {
    // column already exists
}

db.exec(`
    CREATE TABLE IF NOT EXISTS dashboard_config (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id  INTEGER NOT NULL REFERENCES accounts(id),
        position    INTEGER NOT NULL,
        tile_type   TEXT NOT NULL DEFAULT 'transactions',
        time_window TEXT
    );
`);

// Seed dashboard_config for existing accounts on first run (no-op if already populated)
const seeded = (db.prepare('SELECT COUNT(*) AS cnt FROM dashboard_config').get() as { cnt: number }).cnt;
if (seeded === 0) {
    db.exec(`
        INSERT INTO dashboard_config (account_id, position)
        SELECT id, ROW_NUMBER() OVER (ORDER BY name) AS position
        FROM accounts
        WHERE deleted_at IS NULL
    `);
}

export default db;
