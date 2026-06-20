import db from '../db';

export interface DuplicateCandidateRow {
    date: string;
    amount_cents: number;
    description: string;
}

// (date, amount_cents, lower(description)) — strict but the user can override the resulting default action.
function key(date: string, amountCents: number, description: string): string {
    return `${date}|${amountCents}|${description.trim().toLowerCase()}`;
}

/**
 * For each row, returns the id of the first non-deleted existing transaction in the account that
 * matches on (date, amount_cents, case-insensitive description), or null if there's no match.
 */
export function findDuplicates(accountId: number, rows: DuplicateCandidateRow[]): (number | null)[] {
    const existing = db
        .prepare(
            `SELECT id, date, amount_cents, description FROM transactions
             WHERE account_id = ? AND deleted_at IS NULL
             ORDER BY id ASC`,
        )
        .all(accountId) as { id: number; date: string; amount_cents: number; description: string }[];

    const existingByKey = new Map<string, number>();
    for (const row of existing) {
        const k = key(row.date, row.amount_cents, row.description);
        if (!existingByKey.has(k)) existingByKey.set(k, row.id);
    }

    return rows.map((row) => existingByKey.get(key(row.date, row.amount_cents, row.description)) ?? null);
}

/**
 * Flags rows that match an earlier row in the same batch on (date, amount_cents, case-insensitive
 * description). The first occurrence is not flagged — only repeats are, so they default to 'skip'.
 */
export function findWithinBatchDuplicates(rows: DuplicateCandidateRow[]): boolean[] {
    const seen = new Set<string>();
    return rows.map((row) => {
        const k = key(row.date, row.amount_cents, row.description);
        if (seen.has(k)) return true;
        seen.add(k);
        return false;
    });
}
