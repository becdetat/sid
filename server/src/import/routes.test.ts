import express from 'express';
import request from 'supertest';
import t from 'tap';
import db from '../db';
import importRoutes from './routes';

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
    category?: string | null;
    amount_cents?: number;
    date?: string;
}): number {
    return Number(
        db
            .prepare(
                `INSERT INTO transactions (account_id, category, description, amount_cents, type, date)
                 VALUES (?, ?, ?, ?, ?, ?)`,
            )
            .run(
                args.accountId,
                args.category ?? null,
                args.description,
                args.amount_cents ?? -4523,
                'expense',
                args.date ?? '2026-05-12',
            ).lastInsertRowid,
    );
}

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/accounts/:accountId/transactions/import', importRoutes);
    return app;
}

t.beforeEach(() => {
    resetDatabase();
});

t.teardown(() => {
    resetDatabase();
});

t.test('preview: flags a duplicate of an existing transaction', async (t) => {
    const a = insertAccount('Everyday');
    const existingId = insertTransaction({ accountId: a, description: 'WOOLWORTHS 1234' });

    const csv = 'date,description,type,amount,notes\n2026-05-12,WOOLWORTHS 1234,expense,45.23,\n';

    const res = await request(buildApp())
        .post(`/api/accounts/${a}/transactions/import/preview`)
        .attach('file', Buffer.from(csv), 'import.csv');

    t.equal(res.status, 200);
    t.equal(res.body.rows.length, 1);
    t.equal(res.body.rows[0].duplicate_of, existingId);
    t.equal(res.body.rows[0].action, 'skip');
    t.equal(res.body.summary.duplicates, 1);
});

t.test('preview: within-batch duplicates — first imports, rest skip', async (t) => {
    const a = insertAccount('Everyday');

    const csv =
        'date,description,type,amount,notes\n' +
        '2026-05-12,Coffee,expense,4.50,\n' +
        '2026-05-12,coffee,expense,4.50,\n';

    const res = await request(buildApp())
        .post(`/api/accounts/${a}/transactions/import/preview`)
        .attach('file', Buffer.from(csv), 'import.csv');

    t.equal(res.status, 200);
    t.equal(res.body.rows[0].action, 'import');
    t.equal(res.body.rows[0].duplicate_within_batch, false);
    t.equal(res.body.rows[1].action, 'skip');
    t.equal(res.body.rows[1].duplicate_within_batch, true);
});

t.test('preview: suggests a category learned from existing transactions', async (t) => {
    const a = insertAccount('Everyday');
    for (let i = 0; i < 5; i++) {
        insertTransaction({ accountId: a, description: `Woolworths purchase ${i}`, category: 'Groceries', date: '2026-04-01' });
    }

    const csv = 'date,description,type,amount,notes\n2026-05-12,WOOLWORTHS 9876,expense,12.00,\n';

    const res = await request(buildApp())
        .post(`/api/accounts/${a}/transactions/import/preview`)
        .attach('file', Buffer.from(csv), 'import.csv');

    t.equal(res.status, 200);
    t.equal(res.body.rows[0].suggested_category, 'Groceries');
    t.equal(res.body.summary.categorised, 1);
});

t.test('preview: no suggestion when only one supporting transaction exists', async (t) => {
    const a = insertAccount('Everyday');
    insertTransaction({ accountId: a, description: 'Woolworths purchase', category: 'Groceries', date: '2026-04-01' });

    const csv = 'date,description,type,amount,notes\n2026-05-12,Woolworths 9876,expense,12.00,\n';

    const res = await request(buildApp())
        .post(`/api/accounts/${a}/transactions/import/preview`)
        .attach('file', Buffer.from(csv), 'import.csv');

    t.equal(res.status, 200);
    t.equal(res.body.rows[0].suggested_category, null);
});

t.test('preview: does not insert any transactions', async (t) => {
    const a = insertAccount('Everyday');
    const csv = 'date,description,type,amount,notes\n2026-05-12,Coffee,expense,4.50,\n';

    await request(buildApp())
        .post(`/api/accounts/${a}/transactions/import/preview`)
        .attach('file', Buffer.from(csv), 'import.csv');

    const count = db.prepare('SELECT COUNT(*) AS c FROM transactions WHERE account_id = ?').get(a) as { c: number };
    t.equal(count.c, 0);
});

t.test('preview: missing file returns a friendly error', async (t) => {
    const a = insertAccount('Everyday');

    const res = await request(buildApp()).post(`/api/accounts/${a}/transactions/import/preview`);

    t.equal(res.status, 400);
    t.equal(res.body.error, 'Choose a CSV file to import');
});

t.test('commit: applies import, skip, and update_existing actions and returns counts', async (t) => {
    const a = insertAccount('Everyday');
    const existingId = insertTransaction({ accountId: a, description: 'Old description', category: 'Misc', amount_cents: -1000, date: '2026-05-01' });

    const rows = [
        {
            row_index: 0,
            date: '2026-05-12',
            description: 'New transaction',
            category: 'Groceries',
            amount_cents: -4500,
            type: 'expense',
            notes: null,
            duplicate_of: null,
            action: 'import',
        },
        {
            row_index: 1,
            date: '2026-05-13',
            description: 'Skip me',
            category: null,
            amount_cents: -1000,
            type: 'expense',
            notes: null,
            duplicate_of: null,
            action: 'skip',
        },
        {
            row_index: 2,
            date: '2026-05-01',
            description: 'Updated description',
            category: 'Dining',
            amount_cents: -1200,
            type: 'expense',
            notes: null,
            duplicate_of: existingId,
            action: 'update_existing',
        },
    ];

    const res = await request(buildApp())
        .post(`/api/accounts/${a}/transactions/import/commit`)
        .send({ rows });

    t.equal(res.status, 200);
    t.same(res.body, { imported: 1, skipped: 1, updated: 1 });

    const all = db.prepare('SELECT * FROM transactions WHERE account_id = ? ORDER BY id').all(a) as { description: string; category: string; amount_cents: number; date: string }[];
    t.equal(all.length, 2); // 1 pre-existing (updated) + 1 newly imported; the skip is a no-op
    const updatedRow = all.find((r) => r.description === 'Updated description');
    t.ok(updatedRow);
    t.equal(updatedRow?.category, 'Dining');
    t.equal(updatedRow?.amount_cents, -1200);
    t.equal(updatedRow?.date, '2026-05-01'); // date is kept from the existing row, not overwritten
});

t.test('commit: update_existing without duplicate_of is rejected', async (t) => {
    const a = insertAccount('Everyday');

    const res = await request(buildApp())
        .post(`/api/accounts/${a}/transactions/import/commit`)
        .send({
            rows: [
                {
                    row_index: 0,
                    date: '2026-05-12',
                    description: 'Orphan update',
                    category: null,
                    amount_cents: -1000,
                    type: 'expense',
                    notes: null,
                    duplicate_of: null,
                    action: 'update_existing',
                },
            ],
        });

    t.equal(res.status, 422);
    t.equal(res.body.errors[0].error, 'Cannot update — no matching transaction');
});

t.test('commit: a row to import with no description is rejected and nothing is committed', async (t) => {
    const a = insertAccount('Everyday');

    const res = await request(buildApp())
        .post(`/api/accounts/${a}/transactions/import/commit`)
        .send({
            rows: [
                {
                    row_index: 0,
                    date: '2026-05-12',
                    description: '   ',
                    category: null,
                    amount_cents: -1000,
                    type: 'expense',
                    notes: null,
                    duplicate_of: null,
                    action: 'import',
                },
            ],
        });

    t.equal(res.status, 422);
    t.match(res.body.errors[0].error, /description is required/);

    const count = db.prepare('SELECT COUNT(*) AS c FROM transactions WHERE account_id = ?').get(a) as { c: number };
    t.equal(count.c, 0);
});
