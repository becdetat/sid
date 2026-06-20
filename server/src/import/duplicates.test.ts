import t from 'tap';
import db from '../db';
import { findDuplicates, findWithinBatchDuplicates } from './duplicates';

function resetDatabase() {
    db.exec(`
        DELETE FROM attachments;
        DELETE FROM transactions;
        DELETE FROM accounts;
    `);
}

function insertAccount(name: string): number {
    return Number(db.prepare('INSERT INTO accounts (name) VALUES (?)').run(name).lastInsertRowid);
}

function insertTransaction(args: {
    accountId: number;
    description: string;
    amount_cents?: number;
    date?: string;
    deleted?: boolean;
}): number {
    return Number(
        db
            .prepare(
                `INSERT INTO transactions (account_id, category, description, amount_cents, type, date, deleted_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
            )
            .run(
                args.accountId,
                'Groceries',
                args.description,
                args.amount_cents ?? -4523,
                'expense',
                args.date ?? '2026-05-12',
                args.deleted ? new Date().toISOString() : null,
            ).lastInsertRowid,
    );
}

t.beforeEach(() => {
    resetDatabase();
});

t.teardown(() => {
    resetDatabase();
});

t.test('findDuplicates: exact match on date, amount_cents, and case-insensitive description', async () => {
    const a = insertAccount('Everyday');
    const existingId = insertTransaction({ accountId: a, description: 'WOOLWORTHS 1234' });

    const result = findDuplicates(a, [
        { date: '2026-05-12', amount_cents: -4523, description: 'woolworths 1234' },
        { date: '2026-05-12', amount_cents: -4523, description: 'Something else' },
    ]);

    t.equal(result[0], existingId);
    t.equal(result[1], null);
});

t.test('findDuplicates: soft-deleted existing transactions are ignored', async () => {
    const a = insertAccount('Everyday');
    insertTransaction({ accountId: a, description: 'WOOLWORTHS 1234', deleted: true });

    const result = findDuplicates(a, [{ date: '2026-05-12', amount_cents: -4523, description: 'WOOLWORTHS 1234' }]);

    t.equal(result[0], null);
});

t.test('findDuplicates: a different account is not considered a match', async () => {
    const a = insertAccount('Everyday');
    const b = insertAccount('Savings');
    insertTransaction({ accountId: a, description: 'WOOLWORTHS 1234' });

    const result = findDuplicates(b, [{ date: '2026-05-12', amount_cents: -4523, description: 'WOOLWORTHS 1234' }]);

    t.equal(result[0], null);
});

t.test('findDuplicates: different date or amount does not match', async () => {
    const a = insertAccount('Everyday');
    insertTransaction({ accountId: a, description: 'WOOLWORTHS 1234' });

    const result = findDuplicates(a, [
        { date: '2026-05-13', amount_cents: -4523, description: 'WOOLWORTHS 1234' },
        { date: '2026-05-12', amount_cents: -4500, description: 'WOOLWORTHS 1234' },
    ]);

    t.equal(result[0], null);
    t.equal(result[1], null);
});

t.test('findWithinBatchDuplicates: first occurrence is not flagged, repeats are', async () => {
    const rows = [
        { date: '2026-05-12', amount_cents: -1000, description: 'Coffee' },
        { date: '2026-05-12', amount_cents: -1000, description: 'coffee' },
        { date: '2026-05-12', amount_cents: -1000, description: 'Coffee' },
        { date: '2026-05-13', amount_cents: -1000, description: 'Coffee' },
    ];

    const flags = findWithinBatchDuplicates(rows);

    t.same(flags, [false, true, true, false]);
});
