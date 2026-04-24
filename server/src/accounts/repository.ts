import db from '../db';

export interface Account {
    id: number;
    name: string;
    created_at: string;
    deleted_at: string | null;
    transaction_count: number;
}

export function findAll(): Account[] {
    return db.prepare(`
        SELECT a.*,
            (SELECT COUNT(*) FROM transactions t WHERE t.account_id = a.id AND t.deleted_at IS NULL) AS transaction_count
        FROM accounts a
        WHERE a.deleted_at IS NULL
        ORDER BY a.name
    `).all() as Account[];
}

export function findById(id: number): Account | undefined {
    return db
        .prepare(`
            SELECT a.*,
                (SELECT COUNT(*) FROM transactions t WHERE t.account_id = a.id AND t.deleted_at IS NULL) AS transaction_count
            FROM accounts a
            WHERE a.id = ? AND a.deleted_at IS NULL
        `)
        .get(id) as Account | undefined;
}

export function findByName(name: string): Account | undefined {
    return db
        .prepare(`
            SELECT a.*,
                (SELECT COUNT(*) FROM transactions t WHERE t.account_id = a.id AND t.deleted_at IS NULL) AS transaction_count
            FROM accounts a
            WHERE lower(a.name) = lower(?) AND a.deleted_at IS NULL
        `)
        .get(name) as Account | undefined;
}

export function create(name: string): Account {
    const result = db.prepare('INSERT INTO accounts (name) VALUES (?)').run(name);
    return findById(result.lastInsertRowid as number)!;
}

export function update(id: number, name: string): Account | undefined {
    db.prepare('UPDATE accounts SET name = ? WHERE id = ? AND deleted_at IS NULL').run(name, id);
    return findById(id);
}

export function softDelete(id: number): boolean {
    const softDeleteAccounts = db.prepare(
        'UPDATE accounts SET deleted_at = datetime(\'now\') WHERE id = ? AND deleted_at IS NULL',
    );
    const softDeleteTransactions = db.prepare(
        'UPDATE transactions SET deleted_at = datetime(\'now\') WHERE account_id = ? AND deleted_at IS NULL',
    );
    const softDeleteAttachments = db.prepare(`
        UPDATE attachments SET deleted_at = datetime('now')
        WHERE transaction_id IN (SELECT id FROM transactions WHERE account_id = ?)
        AND deleted_at IS NULL
    `);

    const deleteDashboardConfig = db.prepare(
        'DELETE FROM dashboard_config WHERE account_id = ?',
    );

    const run = db.transaction((accountId: number) => {
        softDeleteAttachments.run(accountId);
        softDeleteTransactions.run(accountId);
        deleteDashboardConfig.run(accountId);
        const result = softDeleteAccounts.run(accountId);
        return result.changes > 0;
    });

    return run(id) as boolean;
}
