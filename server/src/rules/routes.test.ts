import express from 'express';
import request from 'supertest';
import t from 'tap';
import db from '../db';
import rulesRoutes from './routes';

function resetDatabase() {
    db.exec(`
        DELETE FROM transaction_tags;
        DELETE FROM transactions;
        DELETE FROM accounts;
        DELETE FROM tags;
        DELETE FROM rules;
    `);
}

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/rules', rulesRoutes);
    return app;
}

function insertAccount(name: string): number {
    return Number(db.prepare('INSERT INTO accounts (name) VALUES (?)').run(name).lastInsertRowid);
}

function insertTransaction(args: { accountId: number; description: string; amount_cents?: number; date?: string }) {
    return Number(
        db.prepare(
            `INSERT INTO transactions (account_id, description, amount_cents, type, date) VALUES (?, ?, ?, ?, ?)`,
        ).run(args.accountId, args.description, args.amount_cents ?? -1000, 'expense', args.date ?? '2026-01-01').lastInsertRowid,
    );
}

const validRule = {
    name: 'Uber rule',
    description_pattern: 'uber',
    set_category: 'Transport',
};

t.beforeEach(() => resetDatabase());

// CRUD

t.test('POST /api/rules creates a rule', async (t) => {
    const app = buildApp();
    const res = await request(app).post('/api/rules').send(validRule);
    t.equal(res.status, 201);
    t.equal(res.body.name, 'Uber rule');
    t.equal(res.body.set_category, 'Transport');
    t.end();
});

t.test('POST /api/rules validates name length', async (t) => {
    const app = buildApp();
    const res = await request(app).post('/api/rules').send({ name: '', description_pattern: 'x', set_category: 'A' });
    t.equal(res.status, 400);
    t.match(res.body.error, /Name must be 1/);
    t.end();
});

t.test('POST /api/rules requires at least one condition', async (t) => {
    const app = buildApp();
    const res = await request(app).post('/api/rules').send({ name: 'x', set_category: 'A' });
    t.equal(res.status, 400);
    t.match(res.body.error, /condition/);
    t.end();
});

t.test('POST /api/rules requires at least one action', async (t) => {
    const app = buildApp();
    const res = await request(app).post('/api/rules').send({ name: 'x', description_pattern: 'uber' });
    t.equal(res.status, 400);
    t.match(res.body.error, /action/);
    t.end();
});

t.test('POST /api/rules rejects invalid regex', async (t) => {
    const app = buildApp();
    const res = await request(app).post('/api/rules').send({
        name: 'x',
        match_type: 'regex',
        description_pattern: '(unclosed',
        set_category: 'A',
    });
    t.equal(res.status, 400);
    t.match(res.body.error, /Invalid regex/);
    t.end();
});

t.test('POST /api/rules rejects min > max', async (t) => {
    const app = buildApp();
    const res = await request(app).post('/api/rules').send({
        name: 'x',
        description_pattern: 'uber',
        amount_min_cents: 5000,
        amount_max_cents: 1000,
        set_category: 'A',
    });
    t.equal(res.status, 400);
    t.match(res.body.error, /Min must be/);
    t.end();
});

t.test('GET /api/rules lists rules', async (t) => {
    const app = buildApp();
    await request(app).post('/api/rules').send(validRule);
    const res = await request(app).get('/api/rules');
    t.equal(res.status, 200);
    t.equal(res.body.length, 1);
    t.end();
});

t.test('PUT /api/rules/:id updates a rule', async (t) => {
    const app = buildApp();
    const created = (await request(app).post('/api/rules').send(validRule)).body;
    const res = await request(app).put(`/api/rules/${created.id}`).send({ name: 'Updated' });
    t.equal(res.status, 200);
    t.equal(res.body.name, 'Updated');
    t.end();
});

t.test('PUT /api/rules/:id toggle enabled', async (t) => {
    const app = buildApp();
    const created = (await request(app).post('/api/rules').send(validRule)).body;
    const res = await request(app).put(`/api/rules/${created.id}`).send({ enabled: false });
    t.equal(res.status, 200);
    t.equal(res.body.enabled, 0);
    t.end();
});

t.test('DELETE /api/rules/:id soft deletes', async (t) => {
    const app = buildApp();
    const created = (await request(app).post('/api/rules').send(validRule)).body;
    const delRes = await request(app).delete(`/api/rules/${created.id}`);
    t.equal(delRes.status, 204);
    const listRes = await request(app).get('/api/rules');
    t.equal(listRes.body.length, 0);
    t.end();
});

// Dry-run

t.test('POST /api/rules/dry-run returns match count', async (t) => {
    const accountId = insertAccount('test');
    insertTransaction({ accountId, description: 'UBER TRIP' });
    insertTransaction({ accountId, description: 'coffee' });

    const app = buildApp();
    const res = await request(app).post('/api/rules/dry-run').send({
        description_pattern: 'uber',
        set_category: 'Transport',
    });
    t.equal(res.status, 200);
    t.equal(res.body.match_count, 1);
    t.end();
});

t.test('POST /api/rules/dry-run rejects invalid regex', async (t) => {
    const app = buildApp();
    const res = await request(app).post('/api/rules/dry-run').send({
        match_type: 'regex',
        description_pattern: '(unclosed',
        set_category: 'A',
    });
    t.equal(res.status, 400);
    t.match(res.body.error, /Invalid regex/);
    t.end();
});

// Run

t.test('POST /api/rules/run dry_run does not write', async (t) => {
    const accountId = insertAccount('test');
    const txId = insertTransaction({ accountId, description: 'uber trip' });
    db.prepare(`INSERT INTO rules (name, description_pattern, set_category) VALUES (?, ?, ?)`).run('rule', 'uber', 'Transport');

    const app = buildApp();
    const res = await request(app).post('/api/rules/run').send({ dry_run: true });
    t.equal(res.status, 200);
    t.equal(res.body.affected, 1);

    const tx = db.prepare('SELECT category FROM transactions WHERE id = ?').get(txId) as { category: string | null };
    t.not(tx.category, 'Transport');
    t.end();
});

t.test('POST /api/rules/run applies rules and updates audit', async (t) => {
    const accountId = insertAccount('test');
    const txId = insertTransaction({ accountId, description: 'uber trip' });
    const rule = db.prepare(`INSERT INTO rules (name, description_pattern, set_category) VALUES (?, ?, ?)`).run('rule', 'uber', 'Transport');
    const ruleId = Number(rule.lastInsertRowid);

    const app = buildApp();
    const res = await request(app).post('/api/rules/run').send({ dry_run: false });
    t.equal(res.status, 200);
    t.equal(res.body.affected, 1);

    const tx = db.prepare('SELECT category FROM transactions WHERE id = ?').get(txId) as { category: string };
    t.equal(tx.category, 'Transport');

    const r = db.prepare('SELECT last_match_count FROM rules WHERE id = ?').get(ruleId) as { last_match_count: number };
    t.equal(r.last_match_count, 1);
    t.end();
});
