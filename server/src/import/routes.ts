import { Router } from 'express';
import multer from 'multer';
import db from '../db';
import { findById as findAccount } from '../accounts/repository';
import { create } from '../transactions/repository';
import { parseImportCSV } from './csv';
import type { ImportRow } from './csv';

const router = Router({ mergeParams: true });
const upload = multer({ storage: multer.memoryStorage() });

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

    const result = parseImportCSV(file.buffer);

    if ('error' in result) {
        res.status(422).json({ error: result.error });
        return;
    }

    const insertAll = db.transaction((rows: ImportRow[]) => {
        for (const row of rows) {
            create({
                account_id: accountId,
                description: row.description,
                amount: row.amount,
                type: row.type,
                date: row.date,
                notes: row.notes ?? undefined,
            });
        }
    });

    insertAll(result.rows);

    res.json({ imported: result.rows.length });
});

export default router;
