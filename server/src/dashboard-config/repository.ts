import db from '../db';

export type TileType = 'transactions' | 'balance_over_time' | 'totals_by_category';

export interface DashboardConfigItem {
    id: number;
    account_id: number;
    position: number;
    tile_type: TileType;
    time_window: string | null;
}

export function getAll(): DashboardConfigItem[] {
    return db
        .prepare('SELECT id, account_id, position, tile_type, time_window FROM dashboard_config ORDER BY position')
        .all() as DashboardConfigItem[];
}

export function add(accountId: number, tileType: TileType, timeWindow?: string): DashboardConfigItem {
    const maxRow = db
        .prepare('SELECT COALESCE(MAX(position), 0) AS max_pos FROM dashboard_config')
        .get() as { max_pos: number };
    const nextPos = maxRow.max_pos + 1;
    const result = db
        .prepare('INSERT INTO dashboard_config (account_id, position, tile_type, time_window) VALUES (?, ?, ?, ?)')
        .run(accountId, nextPos, tileType, timeWindow ?? null);
    return db
        .prepare('SELECT id, account_id, position, tile_type, time_window FROM dashboard_config WHERE id = ?')
        .get(result.lastInsertRowid) as DashboardConfigItem;
}

export function remove(tileId: number): boolean {
    const result = db
        .prepare('DELETE FROM dashboard_config WHERE id = ?')
        .run(tileId);
    return result.changes > 0;
}

export function reorder(tileIds: number[]): void {
    const update = db.prepare('UPDATE dashboard_config SET position = ? WHERE id = ?');
    const run = db.transaction((ids: number[]) => {
        ids.forEach((id, index) => update.run(index + 1, id));
    });
    run(tileIds);
}
