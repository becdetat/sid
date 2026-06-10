import { randomUUID } from 'crypto';
import db from '../db';
import { findById } from '../transactions/repository';
import type { Transaction } from '../transactions/repository';

export function generateTransferGroupId(): string {
    return randomUUID().replace(/-/g, '').slice(0, 12);
}

export interface CreateTransferInput {
    source_account_id: number;
    destination_account_id: number;
    amount: number;
    date: string;
    description?: string;
    notes?: string | null;
    recurrence?: string | null;
    recurrence_end_date?: string | null;
}

export interface TransferPair {
    source: Transaction;
    destination: Transaction;
    transfer_group_id: string;
}

export function findByGroupId(groupId: string): TransferPair | undefined {
    const rows = db
        .prepare(
            `SELECT * FROM transactions WHERE transfer_group_id = ? AND deleted_at IS NULL ORDER BY amount_cents ASC`,
        )
        .all(groupId) as Omit<Transaction, 'tags'>[];

    if (rows.length < 2) return undefined;

    const source = rows.find((r) => r.amount_cents < 0);
    const destination = rows.find((r) => r.amount_cents > 0);
    if (!source || !destination) return undefined;

    return {
        source: { ...source, tags: [] },
        destination: { ...destination, tags: [] },
        transfer_group_id: groupId,
    };
}

export function createTransfer(input: CreateTransferInput): TransferPair {
    const amount_cents = Math.round(Math.abs(input.amount) * 100);
    const groupId = generateTransferGroupId();
    const description = input.description?.trim() || 'Transfer';

    const insertStmt = db.prepare(
        `INSERT INTO transactions (account_id, description, amount_cents, type, date, notes, transfer_group_id, recurrence, recurrence_end_date)
         VALUES (?, ?, ?, 'transfer', ?, ?, ?, ?, ?)`,
    );

    const run = db.transaction(() => {
        const srcResult = insertStmt.run(
            input.source_account_id,
            description,
            -amount_cents,
            input.date,
            input.notes ?? null,
            groupId,
            input.recurrence ?? null,
            input.recurrence_end_date ?? null,
        );
        const dstResult = insertStmt.run(
            input.destination_account_id,
            description,
            amount_cents,
            input.date,
            input.notes ?? null,
            groupId,
            null,
            null,
        );
        return { srcId: srcResult.lastInsertRowid as number, dstId: dstResult.lastInsertRowid as number };
    });

    const { srcId, dstId } = run() as { srcId: number; dstId: number };
    return {
        source: findById(srcId)!,
        destination: findById(dstId)!,
        transfer_group_id: groupId,
    };
}

export interface UpdateTransferInput {
    source_account_id?: number;
    destination_account_id?: number;
    amount?: number;
    date?: string;
    description?: string;
    notes?: string | null;
    recurrence?: string | null;
    recurrence_end_date?: string | null;
}

export function updateTransfer(groupId: string, input: UpdateTransferInput): TransferPair | undefined {
    const pair = findByGroupId(groupId);
    if (!pair) return undefined;

    const { source, destination } = pair;
    const newAmount = input.amount !== undefined ? Math.round(Math.abs(input.amount) * 100) : Math.abs(source.amount_cents);
    const newDate = input.date ?? source.date;
    const newDescription = input.description?.trim() ?? source.description;
    const newNotes = 'notes' in input ? (input.notes ?? null) : source.notes;
    const newSourceAccountId = input.source_account_id ?? source.account_id;
    const newDestAccountId = input.destination_account_id ?? destination.account_id;

    const run = db.transaction(() => {
        db.prepare(
            `UPDATE transactions SET account_id=?, description=?, amount_cents=?, date=?, notes=?,
             recurrence=?, recurrence_end_date=?, updated_at=datetime('now')
             WHERE id=? AND deleted_at IS NULL`,
        ).run(
            newSourceAccountId,
            newDescription,
            -newAmount,
            newDate,
            newNotes,
            'recurrence' in input ? (input.recurrence ?? null) : source.recurrence,
            'recurrence_end_date' in input ? (input.recurrence_end_date ?? null) : source.recurrence_end_date,
            source.id,
        );

        db.prepare(
            `UPDATE transactions SET account_id=?, description=?, amount_cents=?, date=?, notes=?,
             updated_at=datetime('now')
             WHERE id=? AND deleted_at IS NULL`,
        ).run(
            newDestAccountId,
            newDescription,
            newAmount,
            newDate,
            newNotes,
            destination.id,
        );
    });

    run();
    return findByGroupId(groupId);
}

export function softDeleteTransfer(groupId: string): boolean {
    const pair = findByGroupId(groupId);
    if (!pair) return false;

    const deleteAttachments = db.prepare(
        `UPDATE attachments SET deleted_at=datetime('now') WHERE transaction_id=? AND deleted_at IS NULL`,
    );
    const deleteTx = db.prepare(
        `UPDATE transactions SET deleted_at=datetime('now') WHERE id=? AND deleted_at IS NULL`,
    );

    db.transaction(() => {
        deleteAttachments.run(pair.source.id);
        deleteAttachments.run(pair.destination.id);
        deleteTx.run(pair.source.id);
        deleteTx.run(pair.destination.id);
    })();

    return true;
}
