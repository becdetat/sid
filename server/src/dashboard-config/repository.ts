import db from '../db';

export interface DashboardConfigItem {
    id: number;
    account_id: number;
    position: number;
}

export function getAll(): DashboardConfigItem[] {
    return db
        .prepare('SELECT id, account_id, position FROM dashboard_config ORDER BY position')
        .all() as DashboardConfigItem[];
}

export function findByAccountId(accountId: number): DashboardConfigItem | undefined {
    return db
        .prepare('SELECT id, account_id, position FROM dashboard_config WHERE account_id = ?')
        .get(accountId) as DashboardConfigItem | undefined;
}

export function add(accountId: number): DashboardConfigItem {
    const maxRow = db
        .prepare('SELECT COALESCE(MAX(position), 0) AS max_pos FROM dashboard_config')
        .get() as { max_pos: number };
    const nextPos = maxRow.max_pos + 1;
    const result = db
        .prepare('INSERT INTO dashboard_config (account_id, position) VALUES (?, ?)')
        .run(accountId, nextPos);
    return db
        .prepare('SELECT id, account_id, position FROM dashboard_config WHERE id = ?')
        .get(result.lastInsertRowid) as DashboardConfigItem;
}

export function remove(accountId: number): boolean {
    const result = db
        .prepare('DELETE FROM dashboard_config WHERE account_id = ?')
        .run(accountId);
    return result.changes > 0;
}

export function reorder(accountIds: number[]): void {
    const update = db.prepare('UPDATE dashboard_config SET position = ? WHERE account_id = ?');
    const run = db.transaction((ids: number[]) => {
        ids.forEach((id, index) => update.run(index + 1, id));
    });
    run(accountIds);
}
