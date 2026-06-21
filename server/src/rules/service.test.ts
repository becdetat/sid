import t from 'tap';
import db from '../db';
import { matchTransaction, applyRules, runAcross } from './service';
import * as repo from './repository';
import type { Rule } from './repository';

function resetDatabase() {
    db.exec(`
        DELETE FROM transaction_tags;
        DELETE FROM transactions;
        DELETE FROM accounts;
        DELETE FROM tags;
        DELETE FROM rules;
    `);
}

function insertAccount(name: string): number {
    return Number(db.prepare('INSERT INTO accounts (name) VALUES (?)').run(name).lastInsertRowid);
}

function insertTransaction(args: {
    accountId: number;
    description: string;
    amount_cents?: number;
    type?: string;
    date?: string;
    notes?: string | null;
}): number {
    return Number(
        db.prepare(
            `INSERT INTO transactions (account_id, description, amount_cents, type, date, notes)
             VALUES (?, ?, ?, ?, ?, ?)`,
        ).run(
            args.accountId,
            args.description,
            args.amount_cents ?? -1000,
            args.type ?? 'expense',
            args.date ?? '2026-01-01',
            args.notes ?? null,
        ).lastInsertRowid,
    );
}

function makeRule(overrides: Partial<Rule> = {}): Rule {
    return {
        id: 1,
        name: 'test',
        priority: 100,
        enabled: 1,
        account_id: null,
        match_type: 'substring',
        description_pattern: null,
        amount_min_cents: null,
        amount_max_cents: null,
        tx_type: null,
        set_category: null,
        add_tag_ids: null,
        notes_prefix: null,
        last_run_at: null,
        last_match_count: 0,
        created_at: '2026-01-01T00:00:00.000Z',
        deleted_at: null,
        ...overrides,
    };
}

t.beforeEach(() => resetDatabase());

// matchTransaction

t.test('substring match - case insensitive', (t) => {
    const rule = makeRule({ description_pattern: 'uber', match_type: 'substring' });
    t.ok(matchTransaction({ description: 'UBER TRIP', amount_cents: -1000, type: 'expense', account_id: 1 }, rule));
    t.notOk(matchTransaction({ description: 'coffee shop', amount_cents: -1000, type: 'expense', account_id: 1 }, rule));
    t.end();
});

t.test('regex match', (t) => {
    const rule = makeRule({ description_pattern: 'uber.*trip', match_type: 'regex' });
    t.ok(matchTransaction({ description: 'UBER TRIP #123', amount_cents: -1000, type: 'expense', account_id: 1 }, rule));
    t.notOk(matchTransaction({ description: 'TRIP UBER', amount_cents: -1000, type: 'expense', account_id: 1 }, rule));
    t.end();
});

t.test('invalid regex returns false', (t) => {
    const rule = makeRule({ description_pattern: '(unclosed', match_type: 'regex' });
    t.notOk(matchTransaction({ description: 'anything', amount_cents: -1000, type: 'expense', account_id: 1 }, rule));
    t.end();
});

t.test('amount range filter', (t) => {
    const rule = makeRule({ amount_min_cents: 500, amount_max_cents: 2000 });
    t.ok(matchTransaction({ description: 'x', amount_cents: -1000, type: 'expense', account_id: 1 }, rule));
    t.notOk(matchTransaction({ description: 'x', amount_cents: -100, type: 'expense', account_id: 1 }, rule));
    t.notOk(matchTransaction({ description: 'x', amount_cents: -5000, type: 'expense', account_id: 1 }, rule));
    t.end();
});

t.test('tx_type filter', (t) => {
    const rule = makeRule({ tx_type: 'income' });
    t.ok(matchTransaction({ description: 'x', amount_cents: 1000, type: 'income', account_id: 1 }, rule));
    t.notOk(matchTransaction({ description: 'x', amount_cents: -1000, type: 'expense', account_id: 1 }, rule));
    t.end();
});

t.test('account scope filter', (t) => {
    const rule = makeRule({ account_id: 5 });
    t.ok(matchTransaction({ description: 'x', amount_cents: -1000, type: 'expense', account_id: 5 }, rule));
    t.notOk(matchTransaction({ description: 'x', amount_cents: -1000, type: 'expense', account_id: 6 }, rule));
    t.end();
});

t.test('all-null conditions matches everything', (t) => {
    const rule = makeRule();
    t.ok(matchTransaction({ description: 'anything', amount_cents: -9999, type: 'expense', account_id: 99 }, rule));
    t.end();
});

// applyRules

t.test('first matching rule wins for category', (t) => {
    const ruleA = makeRule({ id: 1, priority: 10, description_pattern: 'uber', set_category: 'Transport' });
    const ruleB = makeRule({ id: 2, priority: 50, description_pattern: 'uber', set_category: 'Rides' });
    const result = applyRules({ description: 'uber trip', amount_cents: -500, type: 'expense', account_id: 1 }, [ruleA, ruleB]);
    t.equal(result.category, 'Transport');
    t.end();
});

t.test('tags accumulate from all matching rules', (t) => {
    const ruleA = makeRule({ id: 1, priority: 10, description_pattern: 'uber', add_tag_ids: [1, 2] });
    const ruleB = makeRule({ id: 2, priority: 50, description_pattern: 'uber', add_tag_ids: [3] });
    const result = applyRules({ description: 'uber', amount_cents: -500, type: 'expense', account_id: 1 }, [ruleA, ruleB]);
    t.same(result.tagIds.sort(), [1, 2, 3]);
    t.end();
});

t.test('disabled rule does not apply', (t) => {
    const rule = makeRule({ enabled: 0, description_pattern: 'uber', set_category: 'Transport' });
    const result = applyRules({ description: 'uber', amount_cents: -500, type: 'expense', account_id: 1 }, [rule]);
    t.equal(result.category, null);
    t.same(result.tagIds, []);
    t.end();
});

t.test('notes prefixes concatenate', (t) => {
    const ruleA = makeRule({ id: 1, description_pattern: 'uber', notes_prefix: '[ride]' });
    const ruleB = makeRule({ id: 2, description_pattern: 'uber', notes_prefix: '[work]' });
    const result = applyRules({ description: 'uber', amount_cents: -500, type: 'expense', account_id: 1 }, [ruleA, ruleB]);
    t.equal(result.notesPrefix, '[ride] [work]');
    t.end();
});

// runAcross

t.test('runAcross dry-run does not modify transactions', (t) => {
    const accountId = insertAccount('test');
    const txId = insertTransaction({ accountId, description: 'uber trip' });
    repo.create({ name: 'uber rule', description_pattern: 'uber', set_category: 'Transport' });

    const result = runAcross({ dry_run: true });
    t.equal(result.affected, 1);

    const tx = db.prepare('SELECT category FROM transactions WHERE id = ?').get(txId) as { category: string | null };
    t.not(tx.category, 'Transport');
    t.end();
});

t.test('runAcross applies category and tags', (t) => {
    const accountId = insertAccount('test');
    const txId = insertTransaction({ accountId, description: 'uber trip' });
    const tagId = Number(db.prepare('INSERT INTO tags (name) VALUES (?)').run('commute').lastInsertRowid);
    repo.create({ name: 'uber rule', description_pattern: 'uber', set_category: 'Transport', add_tag_ids: [tagId] });

    const result = runAcross({ dry_run: false });
    t.equal(result.affected, 1);

    const tx = db.prepare('SELECT category FROM transactions WHERE id = ?').get(txId) as { category: string };
    t.equal(tx.category, 'Transport');

    const tt = db.prepare('SELECT tag_id FROM transaction_tags WHERE transaction_id = ?').get(txId) as { tag_id: number } | undefined;
    t.equal(tt?.tag_id, tagId);
    t.end();
});

t.test('runAcross updates last_match_count', (t) => {
    const accountId = insertAccount('test');
    insertTransaction({ accountId, description: 'uber trip' });
    insertTransaction({ accountId, description: 'uber trip 2' });
    const rule = repo.create({ name: 'uber rule', description_pattern: 'uber', set_category: 'Transport' });

    runAcross({ dry_run: false });

    const updated = repo.findById(rule.id)!;
    t.equal(updated.last_match_count, 2);
    t.ok(updated.last_run_at);
    t.end();
});

t.test('runAcross date range filter', (t) => {
    const accountId = insertAccount('test');
    insertTransaction({ accountId, description: 'uber trip', date: '2025-01-15' });
    insertTransaction({ accountId, description: 'uber trip', date: '2026-06-15' });
    repo.create({ name: 'uber rule', description_pattern: 'uber', set_category: 'Transport' });

    const result = runAcross({ from: '2026-01-01', dry_run: true });
    t.equal(result.affected, 1);
    t.end();
});
