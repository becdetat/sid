import { Router } from 'express';
import * as repo from './repository';
import * as accountRepo from '../accounts/repository';

const router = Router();

router.get('/', (_req, res) => {
    res.json({ items: repo.getAll() });
});

router.post('/:accountId', (req, res) => {
    const accountId = parseInt(req.params.accountId, 10);
    if (!accountRepo.findById(accountId)) {
        res.status(404).json({ error: 'account not found' });
        return;
    }
    if (repo.findByAccountId(accountId)) {
        res.status(409).json({ error: 'account already on dashboard' });
        return;
    }
    const item = repo.add(accountId);
    res.status(201).json(item);
});

router.delete('/:accountId', (req, res) => {
    const accountId = parseInt(req.params.accountId, 10);
    const removed = repo.remove(accountId);
    if (!removed) {
        res.status(404).json({ error: 'account not found in dashboard config' });
        return;
    }
    res.status(204).send();
});

router.put('/order', (req, res) => {
    const { account_ids } = req.body as { account_ids?: number[] };
    if (!Array.isArray(account_ids)) {
        res.status(400).json({ error: 'account_ids must be an array' });
        return;
    }
    const current = repo.getAll().map((item) => item.account_id);
    const currentSet = new Set(current);
    const valid = account_ids.every((id) => currentSet.has(id));
    if (!valid || account_ids.length !== current.length) {
        res.status(400).json({ error: 'account_ids must match current dashboard config' });
        return;
    }
    repo.reorder(account_ids);
    res.json({ items: repo.getAll() });
});

export default router;
