import { Router } from 'express';
import * as repo from './repository';
import { findById as findAccount } from '../accounts/repository';

const router = Router({ mergeParams: true });

router.get<{ accountId: string }>('/', (req, res) => {
    const accountId = parseInt(req.params.accountId, 10);
    if (!findAccount(accountId)) {
        res.status(404).json({ error: 'account not found' });
        return;
    }
    res.json(repo.findByAccount(accountId));
});

router.post<{ accountId: string }>('/', (req, res) => {
    const accountId = parseInt(req.params.accountId, 10);
    if (!findAccount(accountId)) {
        res.status(404).json({ error: 'account not found' });
        return;
    }

    const { description, amount, type, date, notes } = req.body as {
        description?: string;
        amount?: number;
        type?: string;
        date?: string;
        notes?: string;
    };

    if (!description || description.trim() === '') {
        res.status(400).json({ error: 'description is required' });
        return;
    }
    if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) <= 0) {
        res.status(400).json({ error: 'amount must be a positive number' });
        return;
    }
    if (type !== 'income' && type !== 'expense') {
        res.status(400).json({ error: 'type must be income or expense' });
        return;
    }
    if (!date || date.trim() === '') {
        res.status(400).json({ error: 'date is required' });
        return;
    }

    const transaction = repo.create({
        account_id: accountId,
        description: description.trim(),
        amount: Number(amount),
        type,
        date: date.trim(),
        notes: notes?.trim() || undefined,
    });
    res.status(201).json(transaction);
});

router.get<{ accountId: string; id: string }>('/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const transaction = repo.findById(id);
    if (!transaction || transaction.account_id !== parseInt(req.params.accountId, 10)) {
        res.status(404).json({ error: 'transaction not found' });
        return;
    }
    res.json(transaction);
});

router.put<{ accountId: string; id: string }>('/:id', (req, res) => {
    const accountId = parseInt(req.params.accountId, 10);
    const id = parseInt(req.params.id, 10);

    const existing = repo.findById(id);
    if (!existing || existing.account_id !== accountId) {
        res.status(404).json({ error: 'transaction not found' });
        return;
    }

    const { description, amount, type, date, notes, account_id } = req.body as {
        description?: string;
        amount?: number;
        type?: string;
        date?: string;
        notes?: string | null;
        account_id?: number;
    };

    if (description !== undefined && description.trim() === '') {
        res.status(400).json({ error: 'description cannot be empty' });
        return;
    }
    if (amount !== undefined && (isNaN(Number(amount)) || Number(amount) <= 0)) {
        res.status(400).json({ error: 'amount must be a positive number' });
        return;
    }
    if (type !== undefined && type !== 'income' && type !== 'expense') {
        res.status(400).json({ error: 'type must be income or expense' });
        return;
    }
    if (date !== undefined && date.trim() === '') {
        res.status(400).json({ error: 'date cannot be empty' });
        return;
    }

    const updated = repo.update(id, {
        account_id: account_id !== undefined ? Number(account_id) : undefined,
        description: description?.trim(),
        amount: amount !== undefined ? Number(amount) : undefined,
        type: type as 'income' | 'expense' | undefined,
        date: date?.trim(),
        notes: notes !== undefined ? (notes?.trim() || null) : undefined,
    });

    if (!updated) {
        res.status(404).json({ error: 'transaction not found' });
        return;
    }
    res.json(updated);
});

router.delete<{ accountId: string; id: string }>('/:id', (req, res) => {
    const accountId = parseInt(req.params.accountId, 10);
    const id = parseInt(req.params.id, 10);

    const existing = repo.findById(id);
    if (!existing || existing.account_id !== accountId) {
        res.status(404).json({ error: 'transaction not found' });
        return;
    }

    repo.softDelete(id);
    res.status(204).send();
});

export default router;
