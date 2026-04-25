import { Router } from 'express';
import * as repo from './repository';
import * as accountRepo from '../accounts/repository';
import type { TileType } from './repository';

const router = Router();

const VALID_TILE_TYPES: TileType[] = ['transactions', 'balance_over_time', 'totals_by_category'];
const VALID_WINDOWS = /^(\d+[dw]|[0-9]+m|all)$/;

function isValidWindow(w: string): boolean {
    if (w === 'all') return true;
    if (w === '30d' || w === '3m' || w === '12m') return true;
    const weeksMatch = w.match(/^(\d+)w$/);
    if (weeksMatch) {
        const n = parseInt(weeksMatch[1], 10);
        return n >= 1 && n <= 52;
    }
    return false;
}

router.get('/', (_req, res) => {
    res.json({ items: repo.getAll() });
});

router.post('/:accountId', (req, res) => {
    const accountId = parseInt(req.params.accountId, 10);
    if (!accountRepo.findById(accountId)) {
        res.status(404).json({ error: 'account not found' });
        return;
    }
    const { tile_type, time_window } = req.body as { tile_type?: string; time_window?: string };
    if (!tile_type || !VALID_TILE_TYPES.includes(tile_type as TileType)) {
        res.status(400).json({ error: 'tile_type must be one of: transactions, balance_over_time, totals_by_category' });
        return;
    }
    const tileType = tile_type as TileType;
    if (tileType !== 'transactions') {
        if (!time_window) {
            res.status(400).json({ error: 'time_window is required for chart tiles' });
            return;
        }
        if (!isValidWindow(time_window)) {
            res.status(400).json({ error: 'invalid time_window value' });
            return;
        }
    }
    const item = repo.add(accountId, tileType, tileType !== 'transactions' ? time_window : undefined);
    res.status(201).json(item);
});

router.delete('/:id', (req, res) => {
    const tileId = parseInt(req.params.id, 10);
    const removed = repo.remove(tileId);
    if (!removed) {
        res.status(404).json({ error: 'tile not found in dashboard config' });
        return;
    }
    res.status(204).send();
});

router.put('/order', (req, res) => {
    const { tile_ids } = req.body as { tile_ids?: number[] };
    if (!Array.isArray(tile_ids)) {
        res.status(400).json({ error: 'tile_ids must be an array' });
        return;
    }
    const current = repo.getAll().map((item) => item.id);
    const currentSet = new Set(current);
    const valid = tile_ids.every((id) => currentSet.has(id));
    if (!valid || tile_ids.length !== current.length) {
        res.status(400).json({ error: 'tile_ids must match current dashboard config' });
        return;
    }
    repo.reorder(tile_ids);
    res.json({ items: repo.getAll() });
});

export default router;
