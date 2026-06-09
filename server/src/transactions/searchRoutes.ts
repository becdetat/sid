import { Router } from 'express';
import * as repo from './repository';
import * as tagRepo from '../tags/repository';
import { parseFilters } from './routes';

const router = Router();

router.get('/', (req, res) => {
    const filters = parseFilters(req.query as Record<string, unknown>);
    res.json(repo.searchAll(Object.keys(filters).length > 0 ? filters : undefined));
});

export const bulkTagRouter = Router();

bulkTagRouter.post('/', (req, res) => {
    const { transaction_ids, add, remove } = req.body as {
        transaction_ids?: unknown;
        add?: unknown;
        remove?: unknown;
    };
    if (!Array.isArray(transaction_ids) || transaction_ids.length === 0 || !transaction_ids.every((x) => typeof x === 'number')) {
        res.status(400).json({ error: 'transaction_ids must be a non-empty array of numbers' });
        return;
    }
    if (add !== undefined && (!Array.isArray(add) || !add.every((x) => typeof x === 'number'))) {
        res.status(400).json({ error: 'add must be an array of numbers' });
        return;
    }
    if (remove !== undefined && (!Array.isArray(remove) || !remove.every((x) => typeof x === 'number'))) {
        res.status(400).json({ error: 'remove must be an array of numbers' });
        return;
    }
    tagRepo.bulkTag(transaction_ids as number[], (add as number[]) ?? [], (remove as number[]) ?? []);
    res.status(204).send();
});

export default router;
