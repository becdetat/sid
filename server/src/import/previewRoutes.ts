import { Router } from 'express';
import multer from 'multer';
import { findById as findAccount } from '../accounts/repository';
import { computeAmountCents } from '../transactions/repository';
import { parseImportCSV } from './csv';
import type { DateFormat, ImportRow } from './csv';
import { findDuplicates, findWithinBatchDuplicates } from './duplicates';
import { buildTokenCategoryMap, suggestCategory } from './suggester';

const router = Router({ mergeParams: true });
const upload = multer({ storage: multer.memoryStorage() });

export type PreviewAction = 'import' | 'skip' | 'update_existing';

export interface PreviewRow {
    row_index: number;
    date: string;
    description: string;
    category: string | null;
    amount_cents: number;
    type: ImportRow['type'];
    notes: string | null;
    transfer_group_id: string | null;
    suggested_category: string | null;
    suggested_category_confidence: number;
    duplicate_of: number | null;
    duplicate_within_batch: boolean;
    action: PreviewAction;
}

export interface PreviewSummary {
    total: number;
    duplicates: number;
    categorised: number;
}

router.post('/', upload.single('file'), (req, res) => {
    const accountId = parseInt((req.params as Record<string, string>).accountId, 10);

    const account = findAccount(accountId);
    if (!account) {
        res.status(404).json({ error: 'account not found' });
        return;
    }

    const file = req.file;
    if (!file) {
        res.status(400).json({ error: 'Choose a CSV file to import' });
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

    // Category is suggested rather than required for smart import — the CSV doesn't need to supply it.
    const result = parseImportCSV(file.buffer, dateFormat, { requireCategory: false });

    if ('ambiguousDateFormat' in result) {
        res.status(422).json({ code: 'ambiguous_date_format' });
        return;
    }

    if ('errors' in result) {
        res.status(422).json({ errors: result.errors });
        return;
    }

    const candidateRows = result.rows.map((row) => ({
        date: row.date,
        amount_cents: computeAmountCents(row.amount, row.type),
        description: row.description,
    }));

    const duplicateIds = findDuplicates(accountId, candidateRows);
    const withinBatch = findWithinBatchDuplicates(candidateRows);
    const tokenMap = buildTokenCategoryMap(accountId);

    let duplicates = 0;
    let categorised = 0;

    const rows: PreviewRow[] = result.rows.map((row, i) => {
        const duplicateOf = duplicateIds[i];
        const isWithinBatchDup = withinBatch[i];
        if (duplicateOf !== null) duplicates++;

        // A row that already came in with a category doesn't need a suggestion.
        const suggestion = row.category ? { category: null, confidence: 0 } : suggestCategory(row.description, tokenMap);
        if (suggestion.category) categorised++;

        const action: PreviewAction = duplicateOf !== null || isWithinBatchDup ? 'skip' : 'import';

        return {
            row_index: i,
            date: row.date,
            description: row.description,
            category: row.category || null,
            amount_cents: candidateRows[i].amount_cents,
            type: row.type,
            notes: row.notes,
            transfer_group_id: row.transfer_group_id,
            suggested_category: suggestion.category,
            suggested_category_confidence: suggestion.confidence,
            duplicate_of: duplicateOf,
            duplicate_within_batch: isWithinBatchDup,
            action,
        };
    });

    const summary: PreviewSummary = { total: rows.length, duplicates, categorised };
    res.json({ rows, summary });
});

export default router;
