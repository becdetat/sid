import express from 'express';
import request from 'supertest';
import t from 'tap';
import db from '../db';
import dashboardRoutes from './routes';

function resetDatabase() {
    db.exec(`
        DELETE FROM attachments;
        DELETE FROM transactions;
        DELETE FROM dashboard_config;
        DELETE FROM accounts;
    `);
}

t.beforeEach(() => {
    resetDatabase();
});

t.teardown(() => {
    resetDatabase();
});

t.test('does not duplicate recent transactions when an account has multiple dashboard tiles', async () => {
    const accountId = Number(
        db.prepare(`INSERT INTO accounts (name) VALUES (?)`).run('Holiday savings').lastInsertRowid,
    );

    db.prepare(
        `INSERT INTO transactions (account_id, category, description, amount_cents, type, date, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(accountId, 'Holiday savings', 'Holiday savings', 20000, 'income', '2026-04-02', null);
    db.prepare(
        `INSERT INTO transactions (account_id, category, description, amount_cents, type, date, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(accountId, 'Holiday savings', 'Holiday savings', 20000, 'income', '2026-04-09', null);

    db.prepare(
        `INSERT INTO dashboard_config (account_id, position, tile_type, time_window)
         VALUES (?, ?, ?, ?)`,
    ).run(accountId, 1, 'transactions', null);
    db.prepare(
        `INSERT INTO dashboard_config (account_id, position, tile_type, time_window)
         VALUES (?, ?, ?, ?)`,
    ).run(accountId, 2, 'balance_over_time', '3m');

    const app = express();
    app.use('/api/dashboard', dashboardRoutes);

    const response = await request(app).get('/api/dashboard').expect(200);

    t.same(response.body, {
        accounts: [
            {
                id: accountId,
                name: 'Holiday savings',
                balance_cents: 40000,
                recent_transactions: [
                    {
                        id: 2,
                        description: 'Holiday savings',
                        amount_cents: 20000,
                        type: 'income',
                        date: '2026-04-09',
                    },
                    {
                        id: 1,
                        description: 'Holiday savings',
                        amount_cents: 20000,
                        type: 'income',
                        date: '2026-04-02',
                    },
                ],
            },
        ],
    });
});