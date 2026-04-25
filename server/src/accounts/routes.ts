import { Router } from 'express';
import db from '../db';
import * as repo from './repository';
import * as dashboardConfig from '../dashboard-config/repository';

const router = Router();

router.get('/', (_req, res) => {
    res.json(repo.findAll());
});

// Must be registered before /:id to avoid Express matching 'balances' as an ID
router.get('/balances', (_req, res) => {
    const rows = db
        .prepare(
            `
        WITH balances AS (
            SELECT account_id, SUM(amount_cents) AS balance_cents
            FROM transactions
            WHERE deleted_at IS NULL
            GROUP BY account_id
        )
        SELECT a.id, a.name, COALESCE(b.balance_cents, 0) AS balance_cents
        FROM accounts a
        LEFT JOIN balances b ON b.account_id = a.id
        WHERE a.deleted_at IS NULL
        ORDER BY a.name
    `,
        )
        .all();
    res.json(rows);
});

router.post('/', (req, res) => {
    const { name } = req.body as { name?: string };
    if (!name || name.trim() === '') {
        res.status(400).json({ error: 'name is required' });
        return;
    }
    if (repo.findByName(name.trim())) {
        res.status(409).json({ error: 'name already exists' });
        return;
    }
    const account = repo.create(name.trim());
    dashboardConfig.add(account.id, 'transactions');
    res.status(201).json(account);
});

router.get('/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const account = repo.findById(id);
    if (!account) {
        res.status(404).json({ error: 'account not found' });
        return;
    }
    res.json(account);
});

router.put('/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { name } = req.body as { name?: string };
    if (!name || name.trim() === '') {
        res.status(400).json({ error: 'name is required' });
        return;
    }
    const existing = repo.findByName(name.trim());
    if (existing && existing.id !== id) {
        res.status(409).json({ error: 'name already exists' });
        return;
    }
    const account = repo.update(id, name.trim());
    if (!account) {
        res.status(404).json({ error: 'account not found' });
        return;
    }
    res.json(account);
});

router.delete('/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const deleted = repo.softDelete(id);
    if (!deleted) {
        res.status(404).json({ error: 'account not found' });
        return;
    }
    res.status(204).send();
});

export default router;
