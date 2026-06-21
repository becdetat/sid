import { Router } from 'express';
import multer from 'multer';
import db from '../db';
import { findById as findAccount } from '../accounts/repository';
import { create, update } from '../transactions/repository';
import { parseImportCSV } from './csv';
import type { ImportRow, DateFormat } from './csv';
import previewRoutes from './previewRoutes';
import type { PreviewAction } from './previewRoutes';
import { list as listRules } from '../rules/repository';
import { applyRules } from '../rules/service';

const router = Router({ mergeParams: true });
const upload = multer({ storage: multer.memoryStorage() });

router.use('/preview', previewRoutes);

router.post('/', upload.single('file'), (req, res) => {
    const accountId = parseInt((req.params as Record<string, string>).accountId, 10);

    const account = findAccount(accountId);
    if (!account) {
        res.status(404).json({ error: 'account not found' });
        return;
    }

    const file = req.file;
    if (!file) {
        res.status(400).json({ error: 'no file provided' });
        return;
    }

    const isCSV =
        file.mimetype === 'text/csv' ||
        file.mimetype === 'application/csv' ||
        file.originalname.toLowerCase().endsWith('.csv');
    if (!isCSV) {
        res.status(400).json({ error: 'File must be a CSV (.csv)' });
        return;
    }

    const rawDateFormat = (req.body as Record<string, unknown>).dateFormat;
    let dateFormat: DateFormat | undefined;
    if (rawDateFormat === 'MDY' || rawDateFormat === 'DMY') {
        dateFormat = rawDateFormat;
    } else if (rawDateFormat !== undefined && rawDateFormat !== '') {
        res.status(400).json({ error: "dateFormat must be 'MDY' or 'DMY'" });
        return;
    }

    const result = parseImportCSV(file.buffer, dateFormat);

    if ('ambiguousDateFormat' in result) {
        res.status(422).json({ code: 'ambiguous_date_format' });
        return;
    }

    if ('errors' in result) {
        res.status(422).json({ errors: result.errors });
        return;
    }

    const rules = listRules();

    const insertAll = db.transaction((rows: ImportRow[]) => {
        for (const row of rows) {
            const amount_cents = Math.round(row.amount * 100) * (row.type === 'expense' ? -1 : 1);
            const ruleResult = applyRules(
                { description: row.description, amount_cents, type: row.type, account_id: accountId },
                rules,
            );
            const category = ruleResult.category ?? row.category;
            const notes = ruleResult.notesPrefix
                ? (ruleResult.notesPrefix + (row.notes ? ' ' + row.notes : '')).trim()
                : row.notes ?? undefined;

            const tx = create({
                account_id: accountId,
                category,
                description: row.description,
                amount: row.amount,
                type: row.type,
                date: row.date,
                notes,
                transfer_group_id: row.transfer_group_id ?? undefined,
            });

            if (ruleResult.tagIds.length > 0) {
                const insertTag = db.prepare('INSERT OR IGNORE INTO transaction_tags (transaction_id, tag_id) VALUES (?, ?)');
                for (const tagId of ruleResult.tagIds) {
                    insertTag.run(tx.id, tagId);
                }
            }
        }
    });

    insertAll(result.rows);

    res.json({ imported: result.rows.length });
});

interface CommitRow {
    row_index: number;
    date: string;
    description: string;
    category: string | null;
    amount_cents: number;
    type: 'income' | 'expense' | 'transfer';
    notes?: string | null;
    transfer_group_id?: string | null;
    duplicate_of: number | null;
    action: PreviewAction;
}

router.post('/commit', (req, res) => {
    const accountId = parseInt((req.params as Record<string, string>).accountId, 10);

    const account = findAccount(accountId);
    if (!account) {
        res.status(404).json({ error: 'account not found' });
        return;
    }

    const body = req.body as { rows?: unknown };
    if (!Array.isArray(body.rows)) {
        res.status(400).json({ error: 'rows is required' });
        return;
    }
    const rows = body.rows as CommitRow[];

    const errors: { row: number; error: string }[] = [];
    for (const row of rows) {
        if (row.action === 'update_existing' && !row.duplicate_of) {
            errors.push({ row: row.row_index, error: 'Cannot update — no matching transaction' });
        } else if (row.action !== 'skip' && !row.description?.trim()) {
            errors.push({ row: row.row_index, error: `Row ${row.row_index}: description is required` });
        }
    }
    if (errors.length > 0) {
        res.status(422).json({ errors });
        return;
    }

    let imported = 0;
    let skipped = 0;
    let updated = 0;

    const commitRules = listRules();
    const insertTag = db.prepare('INSERT OR IGNORE INTO transaction_tags (transaction_id, tag_id) VALUES (?, ?)');

    const applyAll = db.transaction((rowsToApply: CommitRow[]) => {
        for (const row of rowsToApply) {
            if (row.action === 'skip') {
                skipped++;
                continue;
            }

            const amount = Math.abs(row.amount_cents) / 100;
            const category = row.category?.trim() || undefined;

            if (row.action === 'import') {
                const ruleResult = applyRules(
                    { description: row.description, amount_cents: row.amount_cents, type: row.type, account_id: accountId },
                    commitRules,
                );
                const effectiveNotes = ruleResult.notesPrefix
                    ? (ruleResult.notesPrefix + (row.notes ? ' ' + row.notes : '')).trim()
                    : row.notes ?? undefined;

                const tx = create({
                    account_id: accountId,
                    category,
                    description: row.description,
                    amount,
                    type: row.type,
                    date: row.date,
                    notes: effectiveNotes,
                    transfer_group_id: row.transfer_group_id ?? undefined,
                });

                for (const tagId of ruleResult.tagIds) {
                    insertTag.run(tx.id, tagId);
                }
                imported++;
            } else if (row.action === 'update_existing') {
                // Date is intentionally left untouched — the existing transaction's date is kept.
                update(row.duplicate_of!, {
                    description: row.description,
                    category: category ?? null,
                    amount,
                    type: row.type === 'income' || row.type === 'expense' ? row.type : undefined,
                    notes: row.notes ?? null,
                });
                updated++;
            }
        }
    });

    applyAll(rows);

    res.json({ imported, skipped, updated });
});

export default router;
