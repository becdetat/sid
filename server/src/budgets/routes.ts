import { Router } from 'express';
import { findById as findAccount } from '../accounts/repository';
import { add as addDashboardTile, getAll as getDashboardConfig } from '../dashboard-config/repository';
import * as repo from './repository';

const router = Router({ mergeParams: true });

function parseAccountId(req: { params: Record<string, string> }): number {
    return parseInt(req.params.accountId, 10);
}

router.get('/', (req, res) => {
    const accountId = parseAccountId(req);
    if (!findAccount(accountId)) return void res.status(404).json({ error: 'account not found' });
    res.json(repo.getBudgets(accountId));
});

router.get('/progress', (req, res) => {
    const accountId = parseAccountId(req);
    if (!findAccount(accountId)) return void res.status(404).json({ error: 'account not found' });
    res.json(repo.getBudgetProgress(accountId));
});

router.post('/', (req, res) => {
    const accountId = parseAccountId(req);
    if (!findAccount(accountId)) return void res.status(404).json({ error: 'account not found' });

    const { category, amount, period, warning_threshold, danger_threshold } = req.body as {
        category?: string;
        amount?: number;
        period?: string;
        warning_threshold?: number;
        danger_threshold?: number;
    };

    if (!category || category.trim() === '') {
        return void res.status(400).json({ error: 'Category is required' });
    }
    const amountNum = Number(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
        return void res.status(400).json({ error: 'Limit must be greater than zero' });
    }
    if (period !== 'monthly' && period !== 'weekly') {
        return void res.status(400).json({ error: 'period must be monthly or weekly' });
    }
    const wt = warning_threshold !== undefined ? Number(warning_threshold) : 80;
    const dt = danger_threshold !== undefined ? Number(danger_threshold) : 100;
    if (!Number.isInteger(wt) || wt < 1 || wt > 99) {
        return void res.status(400).json({ error: 'Warning threshold must be between 1 and 99' });
    }
    if (!Number.isInteger(dt) || dt <= wt || dt > 200) {
        return void res.status(400).json({ error: 'Danger threshold must be greater than the warning threshold' });
    }

    try {
        const budget = repo.createBudget(accountId, {
            category: category.trim(),
            amount_cents: Math.round(amountNum * 100),
            period,
            warning_threshold: wt,
            danger_threshold: dt,
        });

        const hasTile = getDashboardConfig().some(
            (t) => t.account_id === accountId && t.tile_type === 'budget_progress',
        );
        if (!hasTile) {
            addDashboardTile(accountId, 'budget_progress');
        }

        res.status(201).json(budget);
    } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
            return void res.status(409).json({ error: 'A budget for this category already exists' });
        }
        throw err;
    }
});

router.put('/:id', (req, res) => {
    const accountId = parseAccountId(req);
    const id = parseInt(req.params.id, 10);
    if (!findAccount(accountId)) return void res.status(404).json({ error: 'account not found' });

    const { category, amount, period, warning_threshold, danger_threshold } = req.body as {
        category?: string;
        amount?: number;
        period?: string;
        warning_threshold?: number;
        danger_threshold?: number;
    };

    if (category !== undefined && category.trim() === '') {
        return void res.status(400).json({ error: 'Category is required' });
    }
    if (amount !== undefined) {
        const amountNum = Number(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            return void res.status(400).json({ error: 'Limit must be greater than zero' });
        }
    }
    if (period !== undefined && period !== 'monthly' && period !== 'weekly') {
        return void res.status(400).json({ error: 'period must be monthly or weekly' });
    }
    if (warning_threshold !== undefined) {
        const wt = Number(warning_threshold);
        if (!Number.isInteger(wt) || wt < 1 || wt > 99) {
            return void res.status(400).json({ error: 'Warning threshold must be between 1 and 99' });
        }
    }
    if (danger_threshold !== undefined) {
        const dt = Number(danger_threshold);
        const wt = warning_threshold !== undefined ? Number(warning_threshold) : undefined;
        if (!Number.isInteger(dt) || dt > 200) {
            return void res.status(400).json({ error: 'Danger threshold must be greater than the warning threshold' });
        }
        if (wt !== undefined && dt <= wt) {
            return void res.status(400).json({ error: 'Danger threshold must be greater than the warning threshold' });
        }
    }

    try {
        const updated = repo.updateBudget(id, accountId, {
            category: category?.trim(),
            amount_cents: amount !== undefined ? Math.round(Number(amount) * 100) : undefined,
            period: period as 'monthly' | 'weekly' | undefined,
            warning_threshold: warning_threshold !== undefined ? Number(warning_threshold) : undefined,
            danger_threshold: danger_threshold !== undefined ? Number(danger_threshold) : undefined,
        });
        if (!updated) return void res.status(404).json({ error: 'budget not found' });
        res.json(updated);
    } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
            return void res.status(409).json({ error: 'A budget for this category already exists' });
        }
        throw err;
    }
});

router.delete('/:id', (req, res) => {
    const accountId = parseAccountId(req);
    const id = parseInt(req.params.id, 10);
    if (!findAccount(accountId)) return void res.status(404).json({ error: 'account not found' });
    const ok = repo.softDeleteBudget(id, accountId);
    if (!ok) return void res.status(404).json({ error: 'budget not found' });
    res.status(204).send();
});

export default router;
