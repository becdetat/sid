import db from '../db';

export interface Reconciliation {
    id: number;
    account_id: number;
    statement_date: string;
    statement_balance_cents: number;
    completed_at: string;
    notes: string | null;
}

export function list(accountId: number): Reconciliation[] {
    return db
        .prepare(
            'SELECT * FROM reconciliations WHERE account_id = ? ORDER BY statement_date DESC, completed_at DESC',
        )
        .all(accountId) as Reconciliation[];
}

export function getLast(accountId: number): Reconciliation | null {
    const row = db
        .prepare('SELECT * FROM reconciliations WHERE account_id = ? ORDER BY completed_at DESC LIMIT 1')
        .get(accountId) as Reconciliation | undefined;
    return row ?? null;
}

export function create(input: {
    account_id: number;
    statement_date: string;
    statement_balance_cents: number;
    notes?: string | null;
}): Reconciliation {
    const result = db
        .prepare(
            'INSERT INTO reconciliations (account_id, statement_date, statement_balance_cents, notes) VALUES (?, ?, ?, ?)',
        )
        .run(input.account_id, input.statement_date, input.statement_balance_cents, input.notes ?? null);
    return db.prepare('SELECT * FROM reconciliations WHERE id = ?').get(result.lastInsertRowid) as Reconciliation;
}
