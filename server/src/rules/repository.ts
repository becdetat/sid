import db from '../db';

interface RuleDbRow {
    id: number;
    name: string;
    priority: number;
    enabled: number;
    account_id: number | null;
    match_type: 'substring' | 'regex';
    description_pattern: string | null;
    amount_min_cents: number | null;
    amount_max_cents: number | null;
    tx_type: 'income' | 'expense' | 'transfer' | null;
    set_category: string | null;
    add_tag_ids: string | null;
    notes_prefix: string | null;
    last_run_at: string | null;
    last_match_count: number;
    created_at: string;
    deleted_at: string | null;
}

export interface Rule {
    id: number;
    name: string;
    priority: number;
    enabled: number;
    account_id: number | null;
    match_type: 'substring' | 'regex';
    description_pattern: string | null;
    amount_min_cents: number | null;
    amount_max_cents: number | null;
    tx_type: 'income' | 'expense' | 'transfer' | null;
    set_category: string | null;
    add_tag_ids: number[] | null;
    notes_prefix: string | null;
    last_run_at: string | null;
    last_match_count: number;
    created_at: string;
    deleted_at: string | null;
}

function fromRow(row: RuleDbRow): Rule {
    let add_tag_ids: number[] | null = null;
    if (row.add_tag_ids) {
        try {
            add_tag_ids = JSON.parse(row.add_tag_ids) as number[];
        } catch {
            add_tag_ids = null;
        }
    }
    return { ...row, add_tag_ids };
}

export interface CreateRuleInput {
    name: string;
    priority?: number;
    enabled?: boolean;
    account_id?: number | null;
    match_type?: 'substring' | 'regex';
    description_pattern?: string | null;
    amount_min_cents?: number | null;
    amount_max_cents?: number | null;
    tx_type?: 'income' | 'expense' | 'transfer' | null;
    set_category?: string | null;
    add_tag_ids?: number[] | null;
    notes_prefix?: string | null;
}

export interface UpdateRuleInput {
    name?: string;
    priority?: number;
    enabled?: boolean;
    account_id?: number | null;
    match_type?: 'substring' | 'regex';
    description_pattern?: string | null;
    amount_min_cents?: number | null;
    amount_max_cents?: number | null;
    tx_type?: 'income' | 'expense' | 'transfer' | null;
    set_category?: string | null;
    add_tag_ids?: number[] | null;
    notes_prefix?: string | null;
}

export function list(): Rule[] {
    const rows = db.prepare(
        `SELECT * FROM rules WHERE deleted_at IS NULL ORDER BY priority ASC, id ASC`,
    ).all() as RuleDbRow[];
    return rows.map(fromRow);
}

export function findById(id: number): Rule | undefined {
    const row = db.prepare(
        `SELECT * FROM rules WHERE id = ? AND deleted_at IS NULL`,
    ).get(id) as RuleDbRow | undefined;
    return row ? fromRow(row) : undefined;
}

export function create(input: CreateRuleInput): Rule {
    const result = db.prepare(`
        INSERT INTO rules (name, priority, enabled, account_id, match_type, description_pattern,
            amount_min_cents, amount_max_cents, tx_type, set_category, add_tag_ids, notes_prefix)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        input.name,
        input.priority ?? 100,
        input.enabled !== false ? 1 : 0,
        input.account_id ?? null,
        input.match_type ?? 'substring',
        input.description_pattern ?? null,
        input.amount_min_cents ?? null,
        input.amount_max_cents ?? null,
        input.tx_type ?? null,
        input.set_category ?? null,
        input.add_tag_ids ? JSON.stringify(input.add_tag_ids) : null,
        input.notes_prefix ?? null,
    );
    return findById(result.lastInsertRowid as number)!;
}

export function update(id: number, input: UpdateRuleInput): Rule | undefined {
    const existing = findById(id);
    if (!existing) return undefined;

    db.prepare(`
        UPDATE rules SET
            name = ?,
            priority = ?,
            enabled = ?,
            account_id = ?,
            match_type = ?,
            description_pattern = ?,
            amount_min_cents = ?,
            amount_max_cents = ?,
            tx_type = ?,
            set_category = ?,
            add_tag_ids = ?,
            notes_prefix = ?
        WHERE id = ? AND deleted_at IS NULL
    `).run(
        input.name ?? existing.name,
        input.priority ?? existing.priority,
        input.enabled !== undefined ? (input.enabled ? 1 : 0) : existing.enabled,
        'account_id' in input ? (input.account_id ?? null) : existing.account_id,
        input.match_type ?? existing.match_type,
        'description_pattern' in input ? (input.description_pattern ?? null) : existing.description_pattern,
        'amount_min_cents' in input ? (input.amount_min_cents ?? null) : existing.amount_min_cents,
        'amount_max_cents' in input ? (input.amount_max_cents ?? null) : existing.amount_max_cents,
        'tx_type' in input ? (input.tx_type ?? null) : existing.tx_type,
        'set_category' in input ? (input.set_category ?? null) : existing.set_category,
        'add_tag_ids' in input
            ? (input.add_tag_ids ? JSON.stringify(input.add_tag_ids) : null)
            : (existing.add_tag_ids ? JSON.stringify(existing.add_tag_ids) : null),
        'notes_prefix' in input ? (input.notes_prefix ?? null) : existing.notes_prefix,
        id,
    );
    return findById(id);
}

export function softDelete(id: number): boolean {
    const result = db.prepare(
        `UPDATE rules SET deleted_at = datetime('now') WHERE id = ? AND deleted_at IS NULL`,
    ).run(id);
    return result.changes > 0;
}

export function updateAudit(id: number, matchCount: number): void {
    db.prepare(
        `UPDATE rules SET last_run_at = datetime('now'), last_match_count = ? WHERE id = ?`,
    ).run(matchCount, id);
}
