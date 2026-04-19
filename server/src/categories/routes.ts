import { Router } from 'express';
import db from '../db';

const router = Router();

router.get('/', (_req, res) => {
    const rows = db
        .prepare(
            `SELECT DISTINCT category FROM transactions
             WHERE category IS NOT NULL AND category != '' AND deleted_at IS NULL
             ORDER BY category ASC`,
        )
        .all() as { category: string }[];

    res.json({ categories: rows.map((r) => r.category) });
});

export default router;
