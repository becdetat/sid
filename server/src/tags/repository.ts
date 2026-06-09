import db from '../db';

export interface Tag {
    id: number;
    name: string;
    colour: string | null;
    created_at: string;
    deleted_at: string | null;
}

export interface TagWithUsage extends Tag {
    usage_count: number;
}

export interface TagRef {
    id: number;
    name: string;
    colour: string | null;
}

export function list(): TagWithUsage[] {
    return db.prepare(`
        SELECT t.*, COUNT(tt.transaction_id) AS usage_count
        FROM tags t
        LEFT JOIN transaction_tags tt ON tt.tag_id = t.id
        WHERE t.deleted_at IS NULL
        GROUP BY t.id
        ORDER BY t.name COLLATE NOCASE
    `).all() as TagWithUsage[];
}

export function findById(id: number): Tag | undefined {
    return db.prepare('SELECT * FROM tags WHERE id = ? AND deleted_at IS NULL').get(id) as Tag | undefined;
}

export function findByName(name: string): Tag | undefined {
    return db.prepare('SELECT * FROM tags WHERE LOWER(name) = LOWER(?) AND deleted_at IS NULL').get(name) as Tag | undefined;
}

export function create(name: string, colour?: string): Tag {
    const existing = findByName(name);
    if (existing) return existing;
    const result = db.prepare('INSERT INTO tags (name, colour) VALUES (?, ?)').run(name, colour ?? null);
    return findById(result.lastInsertRowid as number)!;
}

export function update(id: number, name?: string, colour?: string | null): Tag | undefined {
    const existing = findById(id);
    if (!existing) return undefined;
    db.prepare('UPDATE tags SET name = ?, colour = ? WHERE id = ? AND deleted_at IS NULL').run(
        name ?? existing.name,
        colour !== undefined ? colour : existing.colour,
        id,
    );
    return findById(id);
}

export function softDelete(id: number): boolean {
    const result = db.prepare("UPDATE tags SET deleted_at = datetime('now') WHERE id = ? AND deleted_at IS NULL").run(id);
    return result.changes > 0;
}

export function findByTransactionIds(txIds: number[]): Map<number, TagRef[]> {
    if (txIds.length === 0) return new Map();
    const placeholders = txIds.map(() => '?').join(',');
    const rows = db.prepare(`
        SELECT tt.transaction_id, t.id, t.name, t.colour
        FROM transaction_tags tt
        JOIN tags t ON t.id = tt.tag_id
        WHERE tt.transaction_id IN (${placeholders})
        ORDER BY t.name COLLATE NOCASE
    `).all(...txIds) as { transaction_id: number; id: number; name: string; colour: string | null }[];

    const map = new Map<number, TagRef[]>();
    for (const row of rows) {
        if (!map.has(row.transaction_id)) map.set(row.transaction_id, []);
        map.get(row.transaction_id)!.push({ id: row.id, name: row.name, colour: row.colour });
    }
    return map;
}

export function setTagsForTransaction(txId: number, tagIds: number[]): void {
    db.transaction(() => {
        db.prepare('DELETE FROM transaction_tags WHERE transaction_id = ?').run(txId);
        const insert = db.prepare('INSERT OR IGNORE INTO transaction_tags (transaction_id, tag_id) VALUES (?, ?)');
        for (const tagId of tagIds) {
            insert.run(txId, tagId);
        }
    })();
}

export function bulkTag(txIds: number[], add: number[] = [], remove: number[] = []): void {
    if (txIds.length === 0) return;
    const txPlaceholders = txIds.map(() => '?').join(',');
    db.transaction(() => {
        if (remove.length > 0) {
            const tagPlaceholders = remove.map(() => '?').join(',');
            db.prepare(`DELETE FROM transaction_tags WHERE transaction_id IN (${txPlaceholders}) AND tag_id IN (${tagPlaceholders})`).run(...txIds, ...remove);
        }
        if (add.length > 0) {
            const insert = db.prepare('INSERT OR IGNORE INTO transaction_tags (transaction_id, tag_id) VALUES (?, ?)');
            for (const txId of txIds) {
                for (const tagId of add) {
                    insert.run(txId, tagId);
                }
            }
        }
    })();
}
