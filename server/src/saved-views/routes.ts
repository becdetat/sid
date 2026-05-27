import { Router } from 'express';
import { findById as findAccount } from '../accounts/repository';
import * as repo from './repository';

const router = Router();

function validateName(name: unknown): string | null {
    if (typeof name !== 'string') return 'Name is required';
    const trimmed = name.trim();
    if (trimmed.length === 0) return 'Name is required';
    if (trimmed.length > 60) return 'Name must be 1–60 characters';
    return null;
}

function validateScope(scope: unknown): 'account' | 'global' | null {
    if (scope === 'account' || scope === 'global') return scope;
    return null;
}

router.get('/', (req, res) => {
    const scope = validateScope(req.query.scope);
    const accountIdRaw = req.query.account_id;
    const opts: repo.ListFilter = {};
    if (scope) opts.scope = scope;
    if (typeof accountIdRaw === 'string' && accountIdRaw) {
        const n = parseInt(accountIdRaw, 10);
        if (!Number.isFinite(n)) {
            res.status(400).json({ error: 'account_id must be a number' });
            return;
        }
        opts.accountId = n;
    }
    res.json(repo.list(opts));
});

router.post('/', (req, res) => {
    const { scope, account_id, name, filters, is_default } = req.body as {
        scope?: unknown;
        account_id?: unknown;
        name?: unknown;
        filters?: unknown;
        is_default?: unknown;
    };

    const validScope = validateScope(scope);
    if (!validScope) {
        res.status(400).json({ error: 'scope must be "account" or "global"' });
        return;
    }
    const nameError = validateName(name);
    if (nameError) {
        res.status(400).json({ error: nameError });
        return;
    }
    let accountId: number | null = null;
    if (validScope === 'account') {
        if (typeof account_id !== 'number' || !Number.isFinite(account_id)) {
            res.status(400).json({ error: 'Account is required for account-scoped views' });
            return;
        }
        if (!findAccount(account_id)) {
            res.status(404).json({ error: 'account not found' });
            return;
        }
        accountId = account_id;
    }
    const filtersObj: Record<string, unknown> =
        filters && typeof filters === 'object' && !Array.isArray(filters)
            ? (filters as Record<string, unknown>)
            : {};

    try {
        const view = repo.create({
            scope: validScope,
            account_id: accountId,
            name: (name as string).trim(),
            filters: filtersObj,
            is_default: is_default === true,
        });
        res.status(201).json(view);
    } catch (err: unknown) {
        if (err instanceof Error && /UNIQUE constraint failed.*saved_views/i.test(err.message)) {
            res.status(409).json({ error: 'A view with this name already exists' });
            return;
        }
        throw err;
    }
});

router.put('/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
        res.status(400).json({ error: 'invalid id' });
        return;
    }
    const { name, filters } = req.body as { name?: unknown; filters?: unknown };
    const update: repo.UpdateInput = {};
    if (name !== undefined) {
        const nameError = validateName(name);
        if (nameError) {
            res.status(400).json({ error: nameError });
            return;
        }
        update.name = (name as string).trim();
    }
    if (filters !== undefined) {
        if (!filters || typeof filters !== 'object' || Array.isArray(filters)) {
            res.status(400).json({ error: 'filters must be an object' });
            return;
        }
        update.filters = filters as Record<string, unknown>;
    }
    try {
        const updated = repo.update(id, update);
        if (!updated) {
            res.status(404).json({ error: 'saved view not found' });
            return;
        }
        res.json(updated);
    } catch (err: unknown) {
        if (err instanceof Error && /UNIQUE constraint failed.*saved_views/i.test(err.message)) {
            res.status(409).json({ error: 'A view with this name already exists' });
            return;
        }
        throw err;
    }
});

router.put('/:id/default', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
        res.status(400).json({ error: 'invalid id' });
        return;
    }
    const { is_default } = req.body as { is_default?: unknown };
    if (typeof is_default !== 'boolean') {
        res.status(400).json({ error: 'is_default must be a boolean' });
        return;
    }
    const updated = repo.setDefault(id, is_default);
    if (!updated) {
        res.status(404).json({ error: 'saved view not found' });
        return;
    }
    res.json(updated);
});

router.delete('/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
        res.status(400).json({ error: 'invalid id' });
        return;
    }
    const ok = repo.softDelete(id);
    if (!ok) {
        res.status(404).json({ error: 'saved view not found' });
        return;
    }
    res.status(204).send();
});

export default router;
