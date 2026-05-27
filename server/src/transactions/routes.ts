import { Router } from 'express';
import * as repo from './repository';
import { findById as findAccount } from '../accounts/repository';

export function parseFilters(query: Record<string, unknown>): repo.TransactionFilters {
    const { keyword, from, to, category, type, amountMin, amountMax, hasAttachment, recurringOnly } = query;
    const filters: repo.TransactionFilters = {};
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
    if (hasAttachment === 'true') filters.hasAttachment = true;
    else if (hasAttachment === 'false') filters.hasAttachment = false;
    if (recurringOnly === 'true') filters.recurringOnly = true;
    return filters;
}

const router = Router({ mergeParams: true });

router.get<{ accountId: string }>('/', (req, res) => {
    const accountId = parseInt(req.params.accountId, 10);
    if (!findAccount(accountId)) {
        res.status(404).json({ error: 'account not found' });
        return;
    }

    const filters = parseFilters(req.query);
    res.json(repo.findByAccount(accountId, Object.keys(filters).length > 0 ? filters : undefined));
});

router.post<{ accountId: string }>('/', (req, res) => {
    const accountId = parseInt(req.params.accountId, 10);
    if (!findAccount(accountId)) {
        res.status(404).json({ error: 'account not found' });
        return;
    }

    const { category, description, amount, type, date, notes, recurrence, recurrence_end_date } = req.body as {
        category?: string;
        description?: string;
        amount?: number;
        type?: string;
        date?: string;
        notes?: string;
        recurrence?: string;
        recurrence_end_date?: string;
    };

    if (!category || category.trim() === '') {
        res.status(400).json({ error: 'category is required' });
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

    const categoryTrimmed = category.trim();
    const transaction = repo.create({
        account_id: accountId,
        category: categoryTrimmed,
        description: description?.trim() || categoryTrimmed,
        amount: Number(amount),
        type,
        date: date.trim(),
        notes: notes?.trim() || undefined,
        recurrence: recurrence as repo.RecurrenceFrequency | undefined,
        recurrence_end_date: recurrence_end_date || undefined,
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

    const { category, description, amount, type, date, notes, account_id, recurrence, recurrence_end_date, scope } = req.body as {
        category?: string | null;
        description?: string;
        amount?: number;
        type?: string;
        date?: string;
        notes?: string | null;
        account_id?: number;
        recurrence?: string | null;
        recurrence_end_date?: string | null;
        scope?: string;
    };

    if (category !== undefined && (category === null || category.trim() === '')) {
        res.status(400).json({ error: 'category cannot be empty' });
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

    const categoryTrimmed = typeof category === 'string' ? category.trim() : undefined;
    const effectiveDescription = description !== undefined
        ? (description.trim() || (categoryTrimmed ?? existing.category ?? existing.description))
        : undefined;

    const updateInput: repo.UpdateTransactionInput = {
        account_id: account_id !== undefined ? Number(account_id) : undefined,
        category: categoryTrimmed !== undefined ? (categoryTrimmed || null) : undefined,
        description: effectiveDescription,
        amount: amount !== undefined ? Number(amount) : undefined,
        type: type as 'income' | 'expense' | undefined,
        date: date?.trim(),
        notes: notes !== undefined ? (notes?.trim() || null) : undefined,
    };
    if ('recurrence' in req.body) updateInput.recurrence = (recurrence ?? null) as repo.RecurrenceFrequency | null;
    if ('recurrence_end_date' in req.body) updateInput.recurrence_end_date = recurrence_end_date ?? null;

    const updated = repo.update(id, updateInput);

    if (!updated) {
        res.status(404).json({ error: 'transaction not found' });
        return;
    }

    // "This and all future" scope: update the template and soft-delete future generated instances
    if (scope === 'future') {
        const templateId = existing.recurrence_source_id ?? existing.id;
        // Update the template with the same field changes
        const templateInput: repo.UpdateTransactionInput = { ...updateInput };
        delete templateInput.date; // don't move the template's date
        repo.update(templateId, templateInput);
        // Soft-delete all generated transactions after the selected one's date
        repo.softDeleteFutureOccurrences(templateId, existing.date);
    }

    res.json(updated);
});

router.delete<{ accountId: string }>('/bulk', (req, res) => {
    const accountId = parseInt(req.params.accountId, 10);
    if (!findAccount(accountId)) {
        res.status(404).json({ error: 'account not found' });
        return;
    }

    const { ids } = req.body as { ids?: unknown };
    if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === 'number')) {
        res.status(400).json({ error: 'ids must be a non-empty array of numbers' });
        return;
    }

    const ok = repo.bulkSoftDelete(ids as number[], accountId);
    if (!ok) {
        res.status(400).json({ error: 'one or more transactions not found or do not belong to this account' });
        return;
    }
    res.status(204).send();
});

router.delete<{ accountId: string; id: string }>('/:id', (req, res) => {
    const accountId = parseInt(req.params.accountId, 10);
    const id = parseInt(req.params.id, 10);

    const existing = repo.findById(id);
    if (!existing || existing.account_id !== accountId) {
        res.status(404).json({ error: 'transaction not found' });
        return;
    }

    const { scope } = req.body as { scope?: string };

    if (scope === 'future') {
        const templateId = existing.recurrence_source_id ?? existing.id;
        repo.softDeleteFutureOccurrences(templateId, existing.date);
        if (existing.recurrence_source_id) {
            // It's a generated transaction — update template end date to day before this one
            const [y, m, d] = existing.date.split('-').map(Number);
            const prev = new Date(y, m - 1, d - 1);
            const prevStr = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`;
            repo.updateTemplateEndDate(templateId, prevStr);
        } else {
            // It IS the template — soft-delete the template itself
            repo.softDelete(id);
        }
    } else {
        repo.softDelete(id);
    }

    res.status(204).send();
});

export default router;
