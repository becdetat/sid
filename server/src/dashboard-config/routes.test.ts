import express from 'express';
import request from 'supertest';
import t from 'tap';
import db from '../db';
import dashboardConfigRoutes from './routes';

function resetDatabase() {
    db.exec(`
        DELETE FROM attachments;
        DELETE FROM transactions;
        DELETE FROM dashboard_config;
        DELETE FROM accounts;
    `);
}

function makeApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/dashboard-config', dashboardConfigRoutes);
    return app;
}

t.beforeEach(() => {
    resetDatabase();
});

t.teardown(() => {
    resetDatabase();
});

t.test('PATCH /:id — updates show_balance to true', async (t) => {
    const accountId = Number(
        db.prepare(`INSERT INTO accounts (name) VALUES (?)`).run('Savings').lastInsertRowid,
    );
    db.prepare(
        `INSERT INTO dashboard_config (account_id, position, tile_type, show_balance) VALUES (?, 1, 'transactions', 0)`,
    ).run(accountId);
    const tileId = Number((db.prepare('SELECT last_insert_rowid() AS id').get() as { id: number }).id);

    const app = makeApp();
    await request(app)
        .patch(`/api/dashboard-config/${tileId}`)
        .send({ show_balance: true })
        .expect(204);

    const row = db.prepare('SELECT show_balance FROM dashboard_config WHERE id = ?').get(tileId) as { show_balance: number };
    t.equal(row.show_balance, 1);
});

t.test('PATCH /:id — updates show_balance to false', async (t) => {
    const accountId = Number(
        db.prepare(`INSERT INTO accounts (name) VALUES (?)`).run('Savings').lastInsertRowid,
    );
    db.prepare(
        `INSERT INTO dashboard_config (account_id, position, tile_type, show_balance) VALUES (?, 1, 'transactions', 1)`,
    ).run(accountId);
    const tileId = Number((db.prepare('SELECT last_insert_rowid() AS id').get() as { id: number }).id);

    const app = makeApp();
    await request(app)
        .patch(`/api/dashboard-config/${tileId}`)
        .send({ show_balance: false })
        .expect(204);

    const row = db.prepare('SELECT show_balance FROM dashboard_config WHERE id = ?').get(tileId) as { show_balance: number };
    t.equal(row.show_balance, 0);
});

t.test('PATCH /:id — returns 400 when show_balance is not a boolean', async () => {
    const app = makeApp();
    await request(app)
        .patch('/api/dashboard-config/1')
        .send({ show_balance: 'yes' })
        .expect(400);
});

t.test('PATCH /:id — returns 404 when tile does not exist', async () => {
    const app = makeApp();
    await request(app)
        .patch('/api/dashboard-config/9999')
        .send({ show_balance: true })
        .expect(404);
});

t.test('GET / — includes show_balance as boolean in response', async (t) => {
    const accountId = Number(
        db.prepare(`INSERT INTO accounts (name) VALUES (?)`).run('Savings').lastInsertRowid,
    );
    db.prepare(
        `INSERT INTO dashboard_config (account_id, position, tile_type, show_balance) VALUES (?, 1, 'transactions', 1)`,
    ).run(accountId);

    const app = makeApp();
    const response = await request(app).get('/api/dashboard-config').expect(200);

    t.equal(response.body.items[0].show_balance, true);
    t.type(response.body.items[0].show_balance, 'boolean');
});

t.test('GET / — includes balance_cents for transactions tiles', async (t) => {
    const accountId = Number(
        db.prepare(`INSERT INTO accounts (name) VALUES (?)`).run('Savings').lastInsertRowid,
    );
    db.prepare(
        `INSERT INTO transactions (account_id, description, category, amount_cents, type, date) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(accountId, 'Pay', 'Pay', 100000, 'income', '2026-01-01');
    db.prepare(
        `INSERT INTO dashboard_config (account_id, position, tile_type, show_balance) VALUES (?, 1, 'transactions', 1)`,
    ).run(accountId);

    const app = makeApp();
    const response = await request(app).get('/api/dashboard-config').expect(200);

    t.equal(response.body.items[0].balance_cents, 100000);
});

t.test('GET / — balance_cents is null for ineligible tile types', async (t) => {
    const accountId = Number(
        db.prepare(`INSERT INTO accounts (name) VALUES (?)`).run('Savings').lastInsertRowid,
    );
    db.prepare(
        `INSERT INTO dashboard_config (account_id, position, tile_type, time_window, show_balance) VALUES (?, 1, 'totals_by_category', '30d', 0)`,
    ).run(accountId);

    const app = makeApp();
    const response = await request(app).get('/api/dashboard-config').expect(200);

    t.equal(response.body.items[0].balance_cents, null);
});
