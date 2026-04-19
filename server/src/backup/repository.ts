import db from '../db';
import type { BackupPayload, BackupAccount, BackupTransaction, BackupAttachment, ImportResult } from './types';

function formatTimestamp(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export function exportAll(): BackupPayload {
    const accounts = db.prepare(`SELECT id, name, created_at, deleted_at FROM accounts ORDER BY id`).all() as BackupAccount[];

    const transactions = db.prepare(`SELECT id, account_id, category, description, amount_cents, type, date, notes, created_at, updated_at, deleted_at FROM transactions ORDER BY id`).all() as BackupTransaction[];

    const rawAttachments = db.prepare(`SELECT id, transaction_id, filename, mime_type, size_bytes, data, created_at, deleted_at FROM attachments ORDER BY id`).all() as (Omit<BackupAttachment, 'data'> & { data: Buffer })[];

    const attachments: BackupAttachment[] = rawAttachments.map((a) => ({
        ...a,
        data: a.data.toString('base64'),
    }));

    return {
        version: 1,
        exported_at: new Date().toISOString(),
        accounts,
        transactions,
        attachments,
    };
}

export function importMerge(payload: BackupPayload): ImportResult {
    const insertAccount = db.prepare(`INSERT INTO accounts (name, created_at, deleted_at) VALUES (?, ?, ?)`);
    const insertTransaction = db.prepare(`INSERT INTO transactions (account_id, category, description, amount_cents, type, date, notes, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const insertAttachment = db.prepare(`INSERT INTO attachments (transaction_id, filename, mime_type, size_bytes, data, created_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const findActiveByName = db.prepare(`SELECT id FROM accounts WHERE lower(name) = lower(?) AND deleted_at IS NULL`);

    const run = db.transaction((p: BackupPayload) => {
        const timestamp = formatTimestamp(new Date());
        const accountIdMap = new Map<number, number>();
        const transactionIdMap = new Map<number, number>();

        for (const account of p.accounts) {
            const conflict = findActiveByName.get(account.name) as { id: number } | undefined;
            const name = conflict ? `${account.name} ${timestamp}` : account.name;
            const result = insertAccount.run(name, account.created_at, account.deleted_at);
            accountIdMap.set(account.id, result.lastInsertRowid as number);
        }

        for (const tx of p.transactions) {
            const newAccountId = accountIdMap.get(tx.account_id);
            if (newAccountId === undefined) continue;
            const result = insertTransaction.run(
                newAccountId, tx.category, tx.description, tx.amount_cents,
                tx.type, tx.date, tx.notes, tx.created_at, tx.updated_at, tx.deleted_at,
            );
            transactionIdMap.set(tx.id, result.lastInsertRowid as number);
        }

        for (const att of p.attachments) {
            const newTxId = transactionIdMap.get(att.transaction_id);
            if (newTxId === undefined) continue;
            const dataBuffer = Buffer.from(att.data, 'base64');
            insertAttachment.run(newTxId, att.filename, att.mime_type, att.size_bytes, dataBuffer, att.created_at, att.deleted_at);
        }

        return {
            accounts: accountIdMap.size,
            transactions: transactionIdMap.size,
            attachments: p.attachments.filter((a) => transactionIdMap.has(a.transaction_id)).length,
        };
    });

    return run(payload) as ImportResult;
}

export function importWipe(payload: BackupPayload): ImportResult {
    const insertAccount = db.prepare(`INSERT INTO accounts (id, name, created_at, deleted_at) VALUES (?, ?, ?, ?)`);
    const insertTransaction = db.prepare(`INSERT INTO transactions (id, account_id, category, description, amount_cents, type, date, notes, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const insertAttachment = db.prepare(`INSERT INTO attachments (id, transaction_id, filename, mime_type, size_bytes, data, created_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

    const run = db.transaction((p: BackupPayload) => {
        db.prepare(`DELETE FROM attachments`).run();
        db.prepare(`DELETE FROM transactions`).run();
        db.prepare(`DELETE FROM accounts`).run();

        for (const account of p.accounts) {
            insertAccount.run(account.id, account.name, account.created_at, account.deleted_at);
        }

        for (const tx of p.transactions) {
            insertTransaction.run(
                tx.id, tx.account_id, tx.category, tx.description, tx.amount_cents,
                tx.type, tx.date, tx.notes, tx.created_at, tx.updated_at, tx.deleted_at,
            );
        }

        for (const att of p.attachments) {
            const dataBuffer = Buffer.from(att.data, 'base64');
            insertAttachment.run(att.id, att.transaction_id, att.filename, att.mime_type, att.size_bytes, dataBuffer, att.created_at, att.deleted_at);
        }

        return {
            accounts: p.accounts.length,
            transactions: p.transactions.length,
            attachments: p.attachments.length,
        };
    });

    return run(payload) as ImportResult;
}
