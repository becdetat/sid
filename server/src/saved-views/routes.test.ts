import express from 'express';
import request from 'supertest';
import t from 'tap';
import db from '../db';
import savedViewRoutes from './routes';

function resetDatabase() {
    db.exec(`
        DELETE FROM saved_views;
        DELETE FROM accounts;
    `);
}

function makeApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/saved-views', savedViewRoutes);
    return app;
}

function insertAccount(name: string): number {
    return Number(db.prepare('INSERT INTO accounts (name) VALUES (?)').run(name).lastInsertRowid);
}

t.beforeEach(() => {
    resetDatabase();
});

t.teardown(() => {
    resetDatabase();
});

t.test('POST /api/saved-views creates an account-scoped view', async () => {
    const acct = insertAccount('Everyday');
    const res = await request(makeApp())
        .post('/api/saved-views')
        .send({
            scope: 'account',
            account_id: acct,
            name: 'Subscriptions',
            filters: { type: 'expense', category: 'Subs' },
        })
        .expect(201);

    t.equal(res.body.scope, 'account');
    t.equal(res.body.account_id, acct);
    t.equal(res.body.name, 'Subscriptions');
    t.same(res.body.filters, { type: 'expense', category: 'Subs' });
    t.equal(res.body.is_default, false);
});

t.test('POST /api/saved-views creates a global view (no account_id)', async () => {
    const res = await request(makeApp())
        .post('/api/saved-views')
        .send({ scope: 'global', name: 'Uncategorised', filters: {} })
        .expect(201);

    t.equal(res.body.scope, 'global');
    t.equal(res.body.account_id, null);
});

t.test('POST rejects account-scoped without account_id', async () => {
    const res = await request(makeApp())
        .post('/api/saved-views')
        .send({ scope: 'account', name: 'X', filters: {} })
        .expect(400);
    t.match(res.body.error, /Account is required/i);
});

t.test('POST rejects bad scope', async () => {
    const res = await request(makeApp())
        .post('/api/saved-views')
        .send({ scope: 'whatever', name: 'X', filters: {} })
        .expect(400);
    t.match(res.body.error, /scope/i);
});

t.test('POST rejects missing or oversized name', async () => {
    await request(makeApp()).post('/api/saved-views').send({ scope: 'global', name: '', filters: {} }).expect(400);
    await request(makeApp())
        .post('/api/saved-views')
        .send({ scope: 'global', name: 'x'.repeat(61), filters: {} })
        .expect(400);
});

t.test('POST rejects duplicate name within the same scope (case-insensitive)', async () => {
    const acct = insertAccount('Everyday');
    await request(makeApp())
        .post('/api/saved-views')
        .send({ scope: 'account', account_id: acct, name: 'Big spend', filters: {} })
        .expect(201);
    const res = await request(makeApp())
        .post('/api/saved-views')
        .send({ scope: 'account', account_id: acct, name: 'BIG SPEND', filters: {} })
        .expect(409);
    t.match(res.body.error, /already exists/i);
});

t.test('same name allowed in different scopes', async () => {
    const acct = insertAccount('Everyday');
    await request(makeApp())
        .post('/api/saved-views')
        .send({ scope: 'account', account_id: acct, name: 'Recent', filters: {} })
        .expect(201);
    await request(makeApp())
        .post('/api/saved-views')
        .send({ scope: 'global', name: 'Recent', filters: {} })
        .expect(201);
});

t.test('GET filters by scope and account_id', async () => {
    const a = insertAccount('A');
    const b = insertAccount('B');
    await request(makeApp()).post('/api/saved-views').send({ scope: 'account', account_id: a, name: 'A view', filters: {} });
    await request(makeApp()).post('/api/saved-views').send({ scope: 'account', account_id: b, name: 'B view', filters: {} });
    await request(makeApp()).post('/api/saved-views').send({ scope: 'global', name: 'Global', filters: {} });

    const accountA = await request(makeApp()).get('/api/saved-views').query({ scope: 'account', account_id: String(a) }).expect(200);
    t.equal(accountA.body.length, 1);
    t.equal(accountA.body[0].name, 'A view');

    const globalOnly = await request(makeApp()).get('/api/saved-views').query({ scope: 'global' }).expect(200);
    t.equal(globalOnly.body.length, 1);
    t.equal(globalOnly.body[0].name, 'Global');
});

t.test('PUT /:id/default sets at most one default per scope', async () => {
    const acct = insertAccount('Everyday');
    const a = (await request(makeApp())
        .post('/api/saved-views')
        .send({ scope: 'account', account_id: acct, name: 'A', filters: {} })).body;
    const b = (await request(makeApp())
        .post('/api/saved-views')
        .send({ scope: 'account', account_id: acct, name: 'B', filters: {} })).body;

    await request(makeApp()).put(`/api/saved-views/${a.id}/default`).send({ is_default: true }).expect(200);
    const list1 = (await request(makeApp()).get('/api/saved-views').query({ scope: 'account', account_id: String(acct) })).body;
    t.equal(list1.find((v: { id: number }) => v.id === a.id).is_default, true);

    await request(makeApp()).put(`/api/saved-views/${b.id}/default`).send({ is_default: true }).expect(200);
    const list2 = (await request(makeApp()).get('/api/saved-views').query({ scope: 'account', account_id: String(acct) })).body;
    t.equal(list2.find((v: { id: number }) => v.id === a.id).is_default, false);
    t.equal(list2.find((v: { id: number }) => v.id === b.id).is_default, true);
});

t.test('PUT /:id updates filters and round-trips JSON', async () => {
    const created = (await request(makeApp())
        .post('/api/saved-views')
        .send({ scope: 'global', name: 'V', filters: { type: 'expense' } })).body;

    const res = await request(makeApp())
        .put(`/api/saved-views/${created.id}`)
        .send({ filters: { type: 'income', recurringOnly: true } })
        .expect(200);
    t.same(res.body.filters, { type: 'income', recurringOnly: true });
});

t.test('PUT /:id rejects duplicate rename', async () => {
    const acct = insertAccount('Everyday');
    await request(makeApp())
        .post('/api/saved-views')
        .send({ scope: 'account', account_id: acct, name: 'Alpha', filters: {} });
    const b = (await request(makeApp())
        .post('/api/saved-views')
        .send({ scope: 'account', account_id: acct, name: 'Beta', filters: {} })).body;

    await request(makeApp()).put(`/api/saved-views/${b.id}`).send({ name: 'alpha' }).expect(409);
});

t.test('DELETE /:id soft-deletes — gone from list, name is reusable', async () => {
    const acct = insertAccount('Everyday');
    const v = (await request(makeApp())
        .post('/api/saved-views')
        .send({ scope: 'account', account_id: acct, name: 'X', filters: {} })).body;

    await request(makeApp()).delete(`/api/saved-views/${v.id}`).expect(204);
    const list = (await request(makeApp()).get('/api/saved-views').query({ scope: 'account', account_id: String(acct) })).body;
    t.equal(list.length, 0);

    // Reusing the name after delete is allowed because the unique index is partial on deleted_at IS NULL
    await request(makeApp())
        .post('/api/saved-views')
        .send({ scope: 'account', account_id: acct, name: 'X', filters: {} })
        .expect(201);
});

t.test('forward-compat: unknown JSON keys round-trip unchanged through the server', async () => {
    const res = await request(makeApp())
        .post('/api/saved-views')
        .send({
            scope: 'global',
            name: 'Future',
            filters: { type: 'expense', futureKnob: 'on', tagIds: [1, 2] },
        })
        .expect(201);
    t.same(res.body.filters, { type: 'expense', futureKnob: 'on', tagIds: [1, 2] });
});
