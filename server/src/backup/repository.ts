import db from '../db';
import type { BackupPayload, BackupAccount, BackupTransaction, BackupAttachment, BackupBudget, BackupSavedView, BackupTag, BackupTransactionTag, ImportResult } from './types';

function formatTimestamp(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export function exportAll(): BackupPayload {
    const accounts = db.prepare(`SELECT id, name, created_at, deleted_at FROM accounts ORDER BY id`).all() as BackupAccount[];

    const transactions = db.prepare(`SELECT id, account_id, category, description, amount_cents, type, date, notes, created_at, updated_at, deleted_at, recurrence, recurrence_end_date, recurrence_source_id FROM transactions ORDER BY id`).all() as BackupTransaction[];

    const rawAttachments = db.prepare(`SELECT id, transaction_id, filename, mime_type, size_bytes, data, created_at, deleted_at FROM attachments ORDER BY id`).all() as (Omit<BackupAttachment, 'data'> & { data: Buffer })[];

    const attachments: BackupAttachment[] = rawAttachments.map((a) => ({
        ...a,
        data: a.data.toString('base64'),
    }));

    const budgets = db.prepare(`SELECT id, account_id, category, amount_cents, period, warning_threshold, danger_threshold, created_at, deleted_at FROM budgets ORDER BY id`).all() as BackupBudget[];

    const saved_views = db.prepare(`SELECT id, scope, account_id, name, filters, is_default, position, created_at, deleted_at FROM saved_views ORDER BY id`).all() as BackupSavedView[];

    const tags = db.prepare(`SELECT id, name, colour, created_at, deleted_at FROM tags ORDER BY id`).all() as BackupTag[];

    const transaction_tags = db.prepare(`SELECT transaction_id, tag_id FROM transaction_tags ORDER BY transaction_id, tag_id`).all() as BackupTransactionTag[];

    return {
        version: 4,
        exported_at: new Date().toISOString(),
        accounts,
        transactions,
        attachments,
        budgets,
        saved_views,
        tags,
        transaction_tags,
    };
}

export function importMerge(payload: BackupPayload): ImportResult {
    const insertAccount = db.prepare(`INSERT INTO accounts (name, created_at, deleted_at) VALUES (?, ?, ?)`);
    const insertTransaction = db.prepare(`INSERT INTO transactions (account_id, category, description, amount_cents, type, date, notes, created_at, updated_at, deleted_at, recurrence, recurrence_end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const updateRecurrenceSource = db.prepare(`UPDATE transactions SET recurrence_source_id = ? WHERE id = ?`);
    const insertAttachment = db.prepare(`INSERT INTO attachments (transaction_id, filename, mime_type, size_bytes, data, created_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const findActiveByName = db.prepare(`SELECT id FROM accounts WHERE lower(name) = lower(?) AND deleted_at IS NULL`);

    const insertDashboardConfig = db.prepare(
        `INSERT INTO dashboard_config (account_id, position)
         VALUES (?, COALESCE((SELECT MAX(position) FROM dashboard_config), 0) + 1)`,
    );

    const run = db.transaction((p: BackupPayload) => {
        const timestamp = formatTimestamp(new Date());
        const accountIdMap = new Map<number, number>();
        const transactionIdMap = new Map<number, number>();

        for (const account of p.accounts) {
            const conflict = findActiveByName.get(account.name) as { id: number } | undefined;
            const name = conflict ? `${account.name} ${timestamp}` : account.name;
            const result = insertAccount.run(name, account.created_at, account.deleted_at);
            const newId = result.lastInsertRowid as number;
            accountIdMap.set(account.id, newId);
            if (!account.deleted_at) {
                insertDashboardConfig.run(newId);
            }
        }

        for (const tx of p.transactions) {
            const newAccountId = accountIdMap.get(tx.account_id);
            if (newAccountId === undefined) continue;
            const result = insertTransaction.run(
                newAccountId, tx.category, tx.description, tx.amount_cents,
                tx.type, tx.date, tx.notes, tx.created_at, tx.updated_at, tx.deleted_at,
                tx.recurrence ?? null, tx.recurrence_end_date ?? null,
            );
            transactionIdMap.set(tx.id, result.lastInsertRowid as number);
        }

        // Second pass: wire up recurrence_source_id using remapped IDs
        for (const tx of p.transactions) {
            if (!tx.recurrence_source_id) continue;
            const newId = transactionIdMap.get(tx.id);
            const newSourceId = transactionIdMap.get(tx.recurrence_source_id);
            if (newId !== undefined && newSourceId !== undefined) {
                updateRecurrenceSource.run(newSourceId, newId);
            }
        }

        for (const att of p.attachments) {
            const newTxId = transactionIdMap.get(att.transaction_id);
            if (newTxId === undefined) continue;
            const dataBuffer = Buffer.from(att.data, 'base64');
            insertAttachment.run(newTxId, att.filename, att.mime_type, att.size_bytes, dataBuffer, att.created_at, att.deleted_at);
        }

        let budgetsImported = 0;
        if (Array.isArray(p.budgets)) {
            const upsertBudget = db.prepare(
                `INSERT INTO budgets (account_id, category, amount_cents, period, warning_threshold, danger_threshold, created_at, deleted_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(account_id, category) DO UPDATE SET
                   amount_cents = excluded.amount_cents,
                   period = excluded.period,
                   warning_threshold = excluded.warning_threshold,
                   danger_threshold = excluded.danger_threshold,
                   deleted_at = excluded.deleted_at`,
            );
            for (const budget of p.budgets) {
                const newAccountId = accountIdMap.get(budget.account_id);
                if (newAccountId === undefined) continue;
                upsertBudget.run(newAccountId, budget.category, budget.amount_cents, budget.period, budget.warning_threshold, budget.danger_threshold, budget.created_at, budget.deleted_at);
                budgetsImported++;
            }
        }

        let savedViewsImported = 0;
        if (Array.isArray(p.saved_views)) {
            const upsertView = db.prepare(
                `INSERT INTO saved_views (scope, account_id, name, filters, is_default, position, created_at, deleted_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(scope, COALESCE(account_id, -1), LOWER(name))
                   WHERE deleted_at IS NULL
                   DO UPDATE SET
                     filters = excluded.filters,
                     is_default = excluded.is_default,
                     position = excluded.position`,
            );
            const clearDefaultAcct = db.prepare(
                `UPDATE saved_views SET is_default = 0
                 WHERE scope = ? AND account_id = ? AND is_default = 1 AND deleted_at IS NULL`,
            );
            const clearDefaultGlobal = db.prepare(
                `UPDATE saved_views SET is_default = 0
                 WHERE scope = ? AND account_id IS NULL AND is_default = 1 AND deleted_at IS NULL`,
            );
            for (const view of p.saved_views) {
                let newAccountId: number | null = null;
                if (view.scope === 'account') {
                    if (view.account_id === null) continue;
                    const mapped = accountIdMap.get(view.account_id);
                    if (mapped === undefined) continue;
                    newAccountId = mapped;
                }
                if (view.is_default === 1 && !view.deleted_at) {
                    if (newAccountId === null) {
                        clearDefaultGlobal.run(view.scope);
                    } else {
                        clearDefaultAcct.run(view.scope, newAccountId);
                    }
                }
                upsertView.run(view.scope, newAccountId, view.name, view.filters, view.is_default, view.position, view.created_at, view.deleted_at);
                savedViewsImported++;
            }
        }

        let tagsImported = 0;
        if (Array.isArray(p.tags)) {
            const upsertTag = db.prepare(
                `INSERT INTO tags (name, colour, created_at, deleted_at)
                 VALUES (?, ?, ?, ?)
                 ON CONFLICT(LOWER(name)) WHERE deleted_at IS NULL
                 DO NOTHING`,
            );
            const findTagByName = db.prepare(`SELECT id FROM tags WHERE LOWER(name) = LOWER(?) AND deleted_at IS NULL`);
            const tagIdMap = new Map<number, number>();

            for (const tag of p.tags) {
                upsertTag.run(tag.name, tag.colour, tag.created_at, tag.deleted_at);
                const existing = findTagByName.get(tag.name) as { id: number } | undefined;
                if (existing) tagIdMap.set(tag.id, existing.id);
                tagsImported++;
            }

            if (Array.isArray(p.transaction_tags)) {
                const insertTT = db.prepare('INSERT OR IGNORE INTO transaction_tags (transaction_id, tag_id) VALUES (?, ?)');
                for (const tt of p.transaction_tags) {
                    const newTxId = transactionIdMap.get(tt.transaction_id);
                    const newTagId = tagIdMap.get(tt.tag_id);
                    if (newTxId !== undefined && newTagId !== undefined) {
                        insertTT.run(newTxId, newTagId);
                    }
                }
            }
        }

        return {
            accounts: accountIdMap.size,
            transactions: transactionIdMap.size,
            attachments: p.attachments.filter((a) => transactionIdMap.has(a.transaction_id)).length,
            budgets: budgetsImported,
            saved_views: savedViewsImported,
            tags: tagsImported,
        };
    });

    return run(payload) as ImportResult;
}

export function importWipe(payload: BackupPayload): ImportResult {
    const insertAccount = db.prepare(`INSERT INTO accounts (id, name, created_at, deleted_at) VALUES (?, ?, ?, ?)`);
    const insertTransaction = db.prepare(`INSERT INTO transactions (id, account_id, category, description, amount_cents, type, date, notes, created_at, updated_at, deleted_at, recurrence, recurrence_end_date, recurrence_source_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const insertAttachment = db.prepare(`INSERT INTO attachments (id, transaction_id, filename, mime_type, size_bytes, data, created_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

    const run = db.transaction((p: BackupPayload) => {
        db.prepare(`DELETE FROM dashboard_config`).run();
        db.prepare(`DELETE FROM attachments`).run();
        db.prepare(`DELETE FROM transactions`).run();
        db.prepare(`DELETE FROM budgets`).run();
        db.prepare(`DELETE FROM saved_views`).run();
        db.prepare(`DELETE FROM accounts`).run();

        for (const account of p.accounts) {
            insertAccount.run(account.id, account.name, account.created_at, account.deleted_at);
        }

        // Re-seed dashboard_config for all non-deleted accounts in alphabetical order
        db.prepare(`
            INSERT INTO dashboard_config (account_id, position)
            SELECT id, ROW_NUMBER() OVER (ORDER BY name) AS position
            FROM accounts
            WHERE deleted_at IS NULL
        `).run();

        for (const tx of p.transactions) {
            insertTransaction.run(
                tx.id, tx.account_id, tx.category, tx.description, tx.amount_cents,
                tx.type, tx.date, tx.notes, tx.created_at, tx.updated_at, tx.deleted_at,
                tx.recurrence ?? null, tx.recurrence_end_date ?? null, tx.recurrence_source_id ?? null,
            );
        }

        for (const att of p.attachments) {
            const dataBuffer = Buffer.from(att.data, 'base64');
            insertAttachment.run(att.id, att.transaction_id, att.filename, att.mime_type, att.size_bytes, dataBuffer, att.created_at, att.deleted_at);
        }

        let budgetsImported = 0;
        if (Array.isArray(p.budgets)) {
            const insertBudget = db.prepare(
                `INSERT INTO budgets (id, account_id, category, amount_cents, period, warning_threshold, danger_threshold, created_at, deleted_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            );
            for (const budget of p.budgets) {
                insertBudget.run(budget.id, budget.account_id, budget.category, budget.amount_cents, budget.period, budget.warning_threshold, budget.danger_threshold, budget.created_at, budget.deleted_at);
                budgetsImported++;
            }
        }

        let savedViewsImported = 0;
        if (Array.isArray(p.saved_views)) {
            const insertView = db.prepare(
                `INSERT INTO saved_views (id, scope, account_id, name, filters, is_default, position, created_at, deleted_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            );
            for (const view of p.saved_views) {
                insertView.run(view.id, view.scope, view.account_id, view.name, view.filters, view.is_default, view.position, view.created_at, view.deleted_at);
                savedViewsImported++;
            }
        }

        let tagsImported = 0;
        if (Array.isArray(p.tags)) {
            db.prepare('DELETE FROM transaction_tags').run();
            db.prepare('DELETE FROM tags').run();
            const insertTag = db.prepare(
                `INSERT INTO tags (id, name, colour, created_at, deleted_at) VALUES (?, ?, ?, ?, ?)`,
            );
            for (const tag of p.tags) {
                insertTag.run(tag.id, tag.name, tag.colour, tag.created_at, tag.deleted_at);
                tagsImported++;
            }
            if (Array.isArray(p.transaction_tags)) {
                const insertTT = db.prepare('INSERT OR IGNORE INTO transaction_tags (transaction_id, tag_id) VALUES (?, ?)');
                for (const tt of p.transaction_tags) {
                    insertTT.run(tt.transaction_id, tt.tag_id);
                }
            }
        }

        return {
            accounts: p.accounts.length,
            transactions: p.transactions.length,
            attachments: p.attachments.length,
            budgets: budgetsImported,
            saved_views: savedViewsImported,
            tags: tagsImported,
        };
    });

    return run(payload) as ImportResult;
}
