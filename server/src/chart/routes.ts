import { Router } from 'express';
import { findById } from '../accounts/repository';
import { isValidWindow, parseWindowToFromDate, getBalanceOverTime, getCategoryTotals } from './repository';

const router = Router({ mergeParams: true });

router.get('/balance', (req, res) => {
    const accountId = parseInt((req.params as any).id, 10);
    const account = findById(accountId);
    if (!account) return void res.status(404).json({ error: 'account not found' });

    const { window } = req.query as { window?: string };
    if (!window || !isValidWindow(window)) {
        return void res.status(400).json({ error: 'invalid or missing window parameter' });
    }

    const fromDate = parseWindowToFromDate(window);
    const data = getBalanceOverTime(accountId, fromDate);
    res.json(data);
});

router.get('/categories', (req, res) => {
    const accountId = parseInt((req.params as any).id, 10);
    const account = findById(accountId);
    if (!account) return void res.status(404).json({ error: 'account not found' });

    const { window } = req.query as { window?: string };
    if (!window || !isValidWindow(window)) {
        return void res.status(400).json({ error: 'invalid or missing window parameter' });
    }

    const fromDate = parseWindowToFromDate(window);
    const data = getCategoryTotals(accountId, fromDate);
    res.json(data);
});

export default router;
