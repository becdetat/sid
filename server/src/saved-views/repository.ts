import db from '../db';

export type SavedViewScope = 'account' | 'global';

export interface SavedView {
    id: number;
    scope: SavedViewScope;
    account_id: number | null;
    name: string;
    filters: Record<string, unknown>;
    is_default: boolean;
    position: number;
    created_at: string;
    deleted_at: string | null;
}

interface SavedViewRow {
    id: number;
    scope: SavedViewScope;
    account_id: number | null;
    name: string;
    filters: string;
    is_default: number;
    position: number;
    created_at: string;
    deleted_at: string | null;
}

function rowToSavedView(row: SavedViewRow): SavedView {
    let parsed: Record<string, unknown>;
    try {
        const v = JSON.parse(row.filters);
        parsed = v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
    } catch {
        parsed = {};
    }
    return {
        id: row.id,
        scope: row.scope,
        account_id: row.account_id,
        name: row.name,
        filters: parsed,
        is_default: row.is_default === 1,
        position: row.position,
        created_at: row.created_at,
        deleted_at: row.deleted_at,
    };
}

export interface ListFilter {
    scope?: SavedViewScope;
    accountId?: number;
}

export function list(opts: ListFilter = {}): SavedView[] {
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    if (opts.scope) {
        conditions.push('scope = ?');
        params.push(opts.scope);
    }
    if (opts.accountId !== undefined) {
        conditions.push('account_id = ?');
        params.push(opts.accountId);
    }
    const rows = db
        .prepare(
            `SELECT * FROM saved_views WHERE ${conditions.join(' AND ')} ORDER BY position ASC, id ASC`,
        )
        .all(...params) as SavedViewRow[];
    return rows.map(rowToSavedView);
}

export function findById(id: number): SavedView | undefined {
    const row = db
        .prepare(`SELECT * FROM saved_views WHERE id = ? AND deleted_at IS NULL`)
        .get(id) as SavedViewRow | undefined;
    return row ? rowToSavedView(row) : undefined;
}

export interface CreateInput {
    scope: SavedViewScope;
    account_id: number | null;
    name: string;
    filters: Record<string, unknown>;
    is_default?: boolean;
}

export function create(input: CreateInput): SavedView {
    const filtersJson = JSON.stringify(input.filters ?? {});
    const isDefault = input.is_default ? 1 : 0;

    const run = db.transaction(() => {
        if (isDefault === 1) {
            clearDefaultInScope(input.scope, input.account_id);
        }
        const result = db
            .prepare(
                `INSERT INTO saved_views (scope, account_id, name, filters, is_default)
                 VALUES (?, ?, ?, ?, ?)`,
            )
            .run(input.scope, input.account_id, input.name, filtersJson, isDefault);
        return findById(result.lastInsertRowid as number)!;
    });
    return run();
}

export interface UpdateInput {
    name?: string;
    filters?: Record<string, unknown>;
}

export function update(id: number, input: UpdateInput): SavedView | undefined {
    const existing = findById(id);
    if (!existing) return undefined;
    db.prepare(
        `UPDATE saved_views SET name = ?, filters = ? WHERE id = ? AND deleted_at IS NULL`,
    ).run(
        input.name ?? existing.name,
        input.filters !== undefined ? JSON.stringify(input.filters) : JSON.stringify(existing.filters),
        id,
    );
    return findById(id);
}

function clearDefaultInScope(scope: SavedViewScope, accountId: number | null): void {
    if (accountId === null) {
        db.prepare(
            `UPDATE saved_views SET is_default = 0
             WHERE scope = ? AND account_id IS NULL AND is_default = 1 AND deleted_at IS NULL`,
        ).run(scope);
    } else {
        db.prepare(
            `UPDATE saved_views SET is_default = 0
             WHERE scope = ? AND account_id = ? AND is_default = 1 AND deleted_at IS NULL`,
        ).run(scope, accountId);
    }
}

export function setDefault(id: number, isDefault: boolean): SavedView | undefined {
    const existing = findById(id);
    if (!existing) return undefined;
    const run = db.transaction(() => {
        if (isDefault) {
            clearDefaultInScope(existing.scope, existing.account_id);
            db.prepare(`UPDATE saved_views SET is_default = 1 WHERE id = ?`).run(id);
        } else {
            db.prepare(`UPDATE saved_views SET is_default = 0 WHERE id = ?`).run(id);
        }
        return findById(id);
    });
    return run();
}

export function softDelete(id: number): boolean {
    const result = db
        .prepare(`UPDATE saved_views SET deleted_at = datetime('now') WHERE id = ? AND deleted_at IS NULL`)
        .run(id);
    return result.changes > 0;
}
