import { Router } from 'express';
import { findById } from '../accounts/repository';
import { findByAccount } from '../transactions/repository';
import type { TransactionFilters } from '../transactions/repository';
import { toCSV } from './csv';

const router = Router({ mergeParams: true });

router.get('/', (req, res) => {
    const accountId = parseInt((req.params as any).id, 10);
    const account = findById(accountId);
    if (!account) return void res.status(404).json({ error: 'account not found' });

    const { keyword, from, to, category, type, amountMin, amountMax } = req.query;
    const filters: TransactionFilters = {};
    if (typeof keyword === 'string' && keyword) filters.keyword = keyword;
    if (typeof from === 'string' && from) filters.from = from;
    if (typeof to === 'string' && to) filters.to = to;
    if (typeof category === 'string' && category) filters.category = category;
    if (type === 'income' || type === 'expense') filters.type = type;
    if (typeof amountMin === 'string' && amountMin && !isNaN(Number(amountMin))) {
        filters.amountMin = Number(amountMin);
    }
    if (typeof amountMax === 'string' && amountMax && !isNaN(Number(amountMax))) {
        filters.amountMax = Number(amountMax);
    }

    const transactions = findByAccount(accountId, Object.keys(filters).length > 0 ? filters : undefined);
    const rows = transactions.map((t) => ({
        date: t.date,
        category: t.category,
        description: t.description,
        type: t.type,
        amount_cents: t.amount_cents,
        notes: t.notes,
    })).reverse();

    const csv = toCSV(rows);
    const safeName = account.name.replace(/[^a-zA-Z0-9\-_]/g, '_');
    const today = new Date().toISOString().slice(0, 10);
    const filename = `${safeName}-${today}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
});

export default router;
