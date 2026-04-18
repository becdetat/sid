import db from '../db';

export interface Attachment {
    id: number;
    transaction_id: number;
    filename: string;
    mime_type: string;
    size_bytes: number;
    created_at: string;
    deleted_at: string | null;
}

export interface AttachmentBlob extends Attachment {
    data: Buffer;
}

export function findByTransaction(txId: number): Attachment[] {
    return db
        .prepare(
            `SELECT id, transaction_id, filename, mime_type, size_bytes, created_at, deleted_at
             FROM attachments WHERE transaction_id = ? AND deleted_at IS NULL`,
        )
        .all(txId) as Attachment[];
}

function findById(id: number): Attachment | undefined {
    return db
        .prepare(
            `SELECT id, transaction_id, filename, mime_type, size_bytes, created_at, deleted_at
             FROM attachments WHERE id = ?`,
        )
        .get(id) as Attachment | undefined;
}

export function create(
    txId: number,
    filename: string,
    mimeType: string,
    sizeBytes: number,
    data: Buffer,
): Attachment {
    const result = db
        .prepare(
            `INSERT INTO attachments (transaction_id, filename, mime_type, size_bytes, data)
             VALUES (?, ?, ?, ?, ?)`,
        )
        .run(txId, filename, mimeType, sizeBytes, data);
    return findById(result.lastInsertRowid as number)!;
}

export function findBlobById(id: number): AttachmentBlob | undefined {
    return db
        .prepare(`SELECT * FROM attachments WHERE id = ? AND deleted_at IS NULL`)
        .get(id) as AttachmentBlob | undefined;
}

export function softDelete(id: number): boolean {
    const result = db
        .prepare(
            `UPDATE attachments SET deleted_at = datetime('now') WHERE id = ? AND deleted_at IS NULL`,
        )
        .run(id);
    return result.changes > 0;
}
