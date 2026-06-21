import db from '../db';
import * as rulesRepo from './repository';
import type { Rule } from './repository';

export interface TxForRules {
    description: string;
    amount_cents: number;
    type: 'income' | 'expense' | 'transfer';
    account_id: number;
}

export interface RuleResult {
    category: string | null;
    tagIds: number[];
    notesPrefix: string | null;
}

const MAX_PATTERN_LENGTH = 200;
const MAX_INPUT_LENGTH = 500;

export function matchTransaction(tx: TxForRules, rule: Rule): boolean {
    if (rule.account_id !== null && rule.account_id !== tx.account_id) return false;
    if (rule.tx_type !== null && rule.tx_type !== tx.type) return false;

    const absCents = Math.abs(tx.amount_cents);
    if (rule.amount_min_cents !== null && absCents < rule.amount_min_cents) return false;
    if (rule.amount_max_cents !== null && absCents > rule.amount_max_cents) return false;

    if (rule.description_pattern !== null) {
        if (rule.description_pattern.length > MAX_PATTERN_LENGTH) return false;
        const input = tx.description.slice(0, MAX_INPUT_LENGTH);
        if (rule.match_type === 'regex') {
            let re: RegExp;
            try {
                re = new RegExp(rule.description_pattern, 'i');
            } catch {
                return false;
            }
            if (!re.test(input)) return false;
        } else {
            if (!input.toLowerCase().includes(rule.description_pattern.toLowerCase())) return false;
        }
    }

    return true;
}

export function applyRules(tx: TxForRules, rules: Rule[]): RuleResult {
    let category: string | null = null;
    const tagIds: number[] = [];
    const prefixes: string[] = [];

    for (const rule of rules) {
        if (rule.enabled !== 1) continue;
        if (!matchTransaction(tx, rule)) continue;

        if (category === null && rule.set_category) {
            category = rule.set_category;
        }

        if (rule.add_tag_ids) {
            for (const id of rule.add_tag_ids) {
                if (!tagIds.includes(id)) tagIds.push(id);
            }
        }

        if (rule.notes_prefix) {
            prefixes.push(rule.notes_prefix);
        }
    }

    return {
        category,
        tagIds,
        notesPrefix: prefixes.length > 0 ? prefixes.join(' ') : null,
    };
}

export interface RunAcrossOptions {
    from?: string;
    to?: string;
    account_id?: number;
    dry_run?: boolean;
}

export interface RunAcrossResult {
    affected: number;
    per_rule: { id: number; name: string; match_count: number }[];
}

interface TxRow {
    id: number;
    description: string;
    amount_cents: number;
    type: 'income' | 'expense' | 'transfer';
    account_id: number;
    notes: string | null;
}

export function runAcross(options: RunAcrossOptions): RunAcrossResult {
    const rules = rulesRepo.list();
    const enabledRules = rules.filter((r) => r.enabled === 1);

    const perRuleMatchCount = new Map<number, number>(enabledRules.map((r) => [r.id, 0]));

    if (enabledRules.length === 0) {
        return { affected: 0, per_rule: [] };
    }

    const conditions: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];

    if (options.from) {
        conditions.push('date >= ?');
        params.push(options.from);
    }
    if (options.to) {
        conditions.push('date <= ?');
        params.push(options.to);
    }
    if (options.account_id !== undefined) {
        conditions.push('account_id = ?');
        params.push(options.account_id);
    }

    const sql = `SELECT id, description, amount_cents, type, account_id, notes FROM transactions WHERE ${conditions.join(' AND ')} ORDER BY date ASC, id ASC`;
    const transactions = db.prepare(sql).all(...params) as TxRow[];

    let affected = 0;

    const updateCategory = db.prepare(
        `UPDATE transactions SET category = ?, updated_at = datetime('now') WHERE id = ?`,
    );
    const updateNotes = db.prepare(
        `UPDATE transactions SET notes = ?, updated_at = datetime('now') WHERE id = ?`,
    );
    const insertTag = db.prepare(
        `INSERT OR IGNORE INTO transaction_tags (transaction_id, tag_id) VALUES (?, ?)`,
    );

    const doRun = db.transaction(() => {
        for (const tx of transactions) {
            const txForRules: TxForRules = {
                description: tx.description,
                amount_cents: tx.amount_cents,
                type: tx.type,
                account_id: tx.account_id,
            };

            let txAffected = false;
            let categoryToSet: string | null = null;
            const tagIdsToAdd: number[] = [];
            const prefixesToAdd: string[] = [];

            for (const rule of enabledRules) {
                if (!matchTransaction(txForRules, rule)) continue;

                perRuleMatchCount.set(rule.id, (perRuleMatchCount.get(rule.id) ?? 0) + 1);
                txAffected = true;

                if (categoryToSet === null && rule.set_category) {
                    categoryToSet = rule.set_category;
                }

                if (rule.add_tag_ids) {
                    for (const id of rule.add_tag_ids) {
                        if (!tagIdsToAdd.includes(id)) tagIdsToAdd.push(id);
                    }
                }

                if (rule.notes_prefix) {
                    prefixesToAdd.push(rule.notes_prefix);
                }
            }

            if (!txAffected) continue;
            affected++;

            if (!options.dry_run) {
                if (categoryToSet !== null) {
                    updateCategory.run(categoryToSet, tx.id);
                }
                for (const tagId of tagIdsToAdd) {
                    insertTag.run(tx.id, tagId);
                }
                if (prefixesToAdd.length > 0) {
                    const prefix = prefixesToAdd.join(' ');
                    const existingNotes = tx.notes ?? '';
                    if (!existingNotes.startsWith(prefix)) {
                        const newNotes = (prefix + (existingNotes ? ' ' + existingNotes : '')).trim();
                        updateNotes.run(newNotes, tx.id);
                    }
                }
            }
        }

        if (!options.dry_run) {
            for (const rule of enabledRules) {
                rulesRepo.updateAudit(rule.id, perRuleMatchCount.get(rule.id) ?? 0);
            }
        }
    });

    doRun();

    return {
        affected,
        per_rule: enabledRules.map((r) => ({
            id: r.id,
            name: r.name,
            match_count: perRuleMatchCount.get(r.id) ?? 0,
        })),
    };
}

export function dryRunRule(ruleData: Partial<Rule>): number {
    const tempRule: Rule = {
        id: -1,
        name: 'preview',
        priority: 100,
        enabled: 1,
        last_run_at: null,
        last_match_count: 0,
        created_at: new Date().toISOString(),
        deleted_at: null,
        set_category: null,
        add_tag_ids: null,
        notes_prefix: null,
        account_id: null,
        match_type: 'substring',
        description_pattern: null,
        amount_min_cents: null,
        amount_max_cents: null,
        tx_type: null,
        ...ruleData,
    };

    const conditions: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];

    if (tempRule.account_id !== null) {
        conditions.push('account_id = ?');
        params.push(tempRule.account_id);
    }

    const txs = db.prepare(
        `SELECT id, description, amount_cents, type, account_id FROM transactions WHERE ${conditions.join(' AND ')}`,
    ).all(...params) as TxForRules[];

    let matchCount = 0;
    for (const tx of txs) {
        if (matchTransaction(tx, tempRule)) matchCount++;
    }

    return matchCount;
}
