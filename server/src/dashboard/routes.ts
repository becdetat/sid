import { Router } from 'express';
import db from '../db';

const router = Router();

interface DashboardRow {
    id: number;
    name: string;
    balance_cents: number;
    t_id: number | null;
    t_description: string | null;
    t_amount_cents: number | null;
    t_type: string | null;
    t_date: string | null;
}

router.get('/', (_req, res) => {
    const rows = db
        .prepare(
            `
        WITH balances AS (
            SELECT account_id, SUM(amount_cents) AS balance_cents
            FROM transactions
            WHERE deleted_at IS NULL
            GROUP BY account_id
        ),
        ranked AS (
            SELECT id, account_id, description, amount_cents, type, date,
                   ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY date DESC, id DESC) AS rn
            FROM transactions
            WHERE deleted_at IS NULL
        )
        SELECT
            a.id,
            a.name,
            COALESCE(b.balance_cents, 0) AS balance_cents,
            r.id AS t_id,
            r.description AS t_description,
            r.amount_cents AS t_amount_cents,
            r.type AS t_type,
            r.date AS t_date
        FROM accounts a
        LEFT JOIN balances b ON b.account_id = a.id
        LEFT JOIN ranked r ON r.account_id = a.id AND r.rn <= 5
        WHERE a.deleted_at IS NULL
        ORDER BY a.name, r.date DESC, r.id DESC
    `,
        )
        .all() as DashboardRow[];

    const accountMap = new Map<number, object>();
    for (const row of rows) {
        if (!accountMap.has(row.id)) {
            accountMap.set(row.id, {
                id: row.id,
                name: row.name,
                balance_cents: row.balance_cents,
                recent_transactions: [],
            });
        }
        if (row.t_id !== null) {
            (accountMap.get(row.id) as any).recent_transactions.push({
                id: row.t_id,
                description: row.t_description,
                amount_cents: row.t_amount_cents,
                type: row.t_type,
                date: row.t_date,
            });
        }
    }

    res.json({ accounts: Array.from(accountMap.values()) });
});

export default router;
