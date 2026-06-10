import { Router } from 'express';
import { findById as findAccount } from '../accounts/repository';
import { createTransfer, updateTransfer, softDeleteTransfer, findByGroupId } from './repository';

const router = Router();

router.get('/:groupId', (req, res) => {
    const { groupId } = req.params;
    const pair = findByGroupId(groupId);
    if (!pair) {
        res.status(404).json({ error: 'Transfer not found' });
        return;
    }
    res.json(pair);
});

router.post('/', (req, res) => {
    const { source_account_id, destination_account_id, amount, date, description, notes, recurrence, recurrence_end_date } = req.body as {
        source_account_id?: number;
        destination_account_id?: number;
        amount?: number;
        date?: string;
        description?: string;
        notes?: string | null;
        recurrence?: string | null;
        recurrence_end_date?: string | null;
    };

    if (!source_account_id || !findAccount(source_account_id)) {
        res.status(400).json({ error: 'Account not found' });
        return;
    }
    if (!destination_account_id || !findAccount(destination_account_id)) {
        res.status(400).json({ error: 'Account not found' });
        return;
    }
    if (source_account_id === destination_account_id) {
        res.status(400).json({ error: 'Source and destination accounts must be different' });
        return;
    }
    if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) <= 0) {
        res.status(400).json({ error: 'Amount must be greater than zero' });
        return;
    }
    if (!date || date.trim() === '') {
        res.status(400).json({ error: 'Date is required' });
        return;
    }

    const VALID_RECURRENCES = ['daily', 'weekly', 'fortnightly', 'monthly', 'yearly'];
    if (recurrence != null && !VALID_RECURRENCES.includes(recurrence)) {
        res.status(400).json({ error: 'invalid recurrence value' });
        return;
    }
    if (recurrence_end_date) {
        if (recurrence_end_date <= date.trim()) {
            res.status(400).json({ error: 'End date must be after the transaction date' });
            return;
        }
        const today = new Date().toISOString().slice(0, 10);
        if (recurrence_end_date <= today) {
            res.status(400).json({ error: 'End date must be in the future' });
            return;
        }
    }

    const result = createTransfer({
        source_account_id: Number(source_account_id),
        destination_account_id: Number(destination_account_id),
        amount: Number(amount),
        date: date.trim(),
        description: description?.trim(),
        notes: notes ?? null,
        recurrence: recurrence ?? null,
        recurrence_end_date: recurrence_end_date ?? null,
    });

    res.status(201).json(result);
});

router.put('/:groupId', (req, res) => {
    const { groupId } = req.params;
    const existing = findByGroupId(groupId);
    if (!existing) {
        res.status(404).json({ error: 'Transfer not found' });
        return;
    }

    const { source_account_id, destination_account_id, amount, date, description, notes, recurrence, recurrence_end_date } = req.body as {
        source_account_id?: number;
        destination_account_id?: number;
        amount?: number;
        date?: string;
        description?: string;
        notes?: string | null;
        recurrence?: string | null;
        recurrence_end_date?: string | null;
    };

    if (source_account_id !== undefined && !findAccount(source_account_id)) {
        res.status(400).json({ error: 'Account not found' });
        return;
    }
    if (destination_account_id !== undefined && !findAccount(destination_account_id)) {
        res.status(400).json({ error: 'Account not found' });
        return;
    }
    const effectiveSrcId = source_account_id ?? existing.source.account_id;
    const effectiveDstId = destination_account_id ?? existing.destination.account_id;
    if (effectiveSrcId === effectiveDstId) {
        res.status(400).json({ error: 'Source and destination accounts must be different' });
        return;
    }
    if (amount !== undefined && (isNaN(Number(amount)) || Number(amount) <= 0)) {
        res.status(400).json({ error: 'Amount must be greater than zero' });
        return;
    }
    if (date !== undefined && date.trim() === '') {
        res.status(400).json({ error: 'Date is required' });
        return;
    }

    const VALID_RECURRENCES = ['daily', 'weekly', 'fortnightly', 'monthly', 'yearly'];
    if (recurrence != null && !VALID_RECURRENCES.includes(recurrence)) {
        res.status(400).json({ error: 'invalid recurrence value' });
        return;
    }

    const input: Parameters<typeof updateTransfer>[1] = {};
    if (source_account_id !== undefined) input.source_account_id = Number(source_account_id);
    if (destination_account_id !== undefined) input.destination_account_id = Number(destination_account_id);
    if (amount !== undefined) input.amount = Number(amount);
    if (date !== undefined) input.date = date.trim();
    if (description !== undefined) input.description = description;
    if ('notes' in req.body) input.notes = notes ?? null;
    if ('recurrence' in req.body) input.recurrence = recurrence ?? null;
    if ('recurrence_end_date' in req.body) input.recurrence_end_date = recurrence_end_date ?? null;

    const result = updateTransfer(groupId, input);
    if (!result) {
        res.status(404).json({ error: 'Transfer not found' });
        return;
    }

    res.json(result);
});

router.delete('/:groupId', (req, res) => {
    const { groupId } = req.params;
    const ok = softDeleteTransfer(groupId);
    if (!ok) {
        res.status(404).json({ error: 'Transfer not found' });
        return;
    }
    res.status(204).send();
});

export default router;
