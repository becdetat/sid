import { Router } from 'express';
import * as repo from './repository';
import { parseFilters } from './routes';

const router = Router();

router.get('/', (req, res) => {
    const filters = parseFilters(req.query as Record<string, unknown>);
    res.json(repo.searchAll(Object.keys(filters).length > 0 ? filters : undefined));
});

export default router;
