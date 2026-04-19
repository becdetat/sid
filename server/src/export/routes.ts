import { Router } from 'express';
import db from '../db';
import { findById } from '../accounts/repository';
import { toCSV } from './csv';

const router = Router({ mergeParams: true });

function isValidDate(s: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
}

router.get('/', (req, res) => {
    const accountId = parseInt((req.params as any).id, 10);
    const { from, to } = req.query as { from?: string; to?: string };

    if (!from) return void res.status(400).json({ error: 'from date is required' });
    if (!to) return void res.status(400).json({ error: 'to date is required' });
    if (!isValidDate(from) || !isValidDate(to))
        return void res.status(400).json({ error: 'invalid date format' });
    if (from > to) return void res.status(400).json({ error: 'from must be on or before to' });

    const account = findById(accountId);
    if (!account) return void res.status(404).json({ error: 'account not found' });

    const rows = db
        .prepare(
            `SELECT date, category, description, type, amount_cents, notes
             FROM transactions
             WHERE account_id = ? AND deleted_at IS NULL AND date >= ? AND date <= ?
             ORDER BY date ASC, id ASC`,
        )
        .all(accountId, from, to) as {
        date: string;
        category: string | null;
        description: string;
        type: string;
        amount_cents: number;
        notes: string | null;
    }[];

    const csv = toCSV(rows);
    const safeName = account.name.replace(/[^a-zA-Z0-9\-_]/g, '_');
    const filename = `${safeName}-${from}-${to}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
});

export default router;
