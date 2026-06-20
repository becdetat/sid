import t from 'tap';
import db from '../db';
import { buildTokenCategoryMap, suggestCategory, tokenize } from './suggester';

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
}): number {
    return Number(
        db
            .prepare(
                `INSERT INTO transactions (account_id, category, description, amount_cents, type, date)
                 VALUES (?, ?, ?, ?, ?, ?)`,
            )
            .run(args.accountId, args.category ?? null, args.description, -1000, 'expense', '2026-05-01')
            .lastInsertRowid,
    );
}

t.beforeEach(() => {
    resetDatabase();
});

t.teardown(() => {
    resetDatabase();
});

t.test('tokenize: lowercases, splits on non-alphanumeric, drops short tokens', async () => {
    t.same(tokenize('WOOLWORTHS 1234'), ['woolworths', '1234']);
    // "'", space, and "#" all split tokens; "s" and "42" are dropped for being under 3 characters.
    t.same(tokenize("McDonald's #42"), ['mcdonald']);
});

t.test('suggestCategory: suggests the most-common category when evidence is strong', async () => {
    const a = insertAccount('Everyday');
    for (let i = 0; i < 5; i++) {
        insertTransaction({ accountId: a, description: `Woolworths ${i}`, category: 'Groceries' });
    }

    const tokenMap = buildTokenCategoryMap(a);
    const result = suggestCategory('WOOLWORTHS 9876', tokenMap);

    t.equal(result.category, 'Groceries');
    t.ok(result.confidence >= 0.5);
});

t.test('suggestCategory: no suggestion with fewer than 2 supporting transactions', async () => {
    const a = insertAccount('Everyday');
    insertTransaction({ accountId: a, description: 'Woolworths 1', category: 'Groceries' });

    const tokenMap = buildTokenCategoryMap(a);
    const result = suggestCategory('Woolworths 2', tokenMap);

    t.equal(result.category, null);
    t.equal(result.confidence, 0);
});

t.test('suggestCategory: no suggestion when confidence is below threshold', async () => {
    const a = insertAccount('Everyday');
    // "shared" token splits evenly between two categories -> confidence 0.5 for each is right at the
    // threshold, so tip it under by adding one more transaction tagged with a third category.
    insertTransaction({ accountId: a, description: 'shared token one', category: 'Groceries' });
    insertTransaction({ accountId: a, description: 'shared token two', category: 'Dining' });
    insertTransaction({ accountId: a, description: 'shared token three', category: 'Transport' });

    const tokenMap = buildTokenCategoryMap(a);
    const result = suggestCategory('shared token', tokenMap);

    t.equal(result.category, null);
    t.equal(result.confidence, 0);
});

t.test('suggestCategory: ignores transactions with no category', async () => {
    const a = insertAccount('Everyday');
    insertTransaction({ accountId: a, description: 'Woolworths 1', category: null });
    insertTransaction({ accountId: a, description: 'Woolworths 2', category: null });

    const tokenMap = buildTokenCategoryMap(a);
    const result = suggestCategory('Woolworths 3', tokenMap);

    t.equal(result.category, null);
});

t.test('suggestCategory: scoped to the account passed in', async () => {
    const a = insertAccount('Everyday');
    const b = insertAccount('Savings');
    for (let i = 0; i < 5; i++) {
        insertTransaction({ accountId: a, description: `Woolworths ${i}`, category: 'Groceries' });
    }

    const tokenMap = buildTokenCategoryMap(b);
    const result = suggestCategory('Woolworths 9876', tokenMap);

    t.equal(result.category, null);
});
