import db from '../db';

export interface BalancePoint {
    date: string;
    balance_cents: number;
}

export interface CategoryTotal {
    category: string;
    total_cents: number;
}

export function parseWindowToFromDate(window: string): string | null {
    const now = new Date();
    if (window === 'all') return null;
    if (window === '30d') {
        now.setDate(now.getDate() - 30);
        return now.toISOString().slice(0, 10);
    }
    if (window === '3m') {
        now.setMonth(now.getMonth() - 3);
        return now.toISOString().slice(0, 10);
    }
    if (window === '12m') {
        now.setFullYear(now.getFullYear() - 1);
        return now.toISOString().slice(0, 10);
    }
    const weeksMatch = window.match(/^(\d+)w$/);
    if (weeksMatch) {
        const weeks = parseInt(weeksMatch[1], 10);
        now.setDate(now.getDate() - weeks * 7);
        return now.toISOString().slice(0, 10);
    }
    return undefined as never;
}

export function isValidWindow(window: string): boolean {
    if (window === 'all' || window === '30d' || window === '3m' || window === '12m') return true;
    const m = window.match(/^(\d+)w$/);
    if (m) {
        const n = parseInt(m[1], 10);
        return n >= 1 && n <= 52;
    }
    return false;
}

export function getBalanceOverTime(accountId: number, fromDate: string | null): BalancePoint[] {
    // Starting balance: sum of all transactions before the window
    let startingBalance = 0;
    if (fromDate) {
        const row = db
            .prepare(
                `SELECT COALESCE(SUM(amount_cents), 0) AS total
                 FROM transactions
                 WHERE account_id = ? AND deleted_at IS NULL AND date < ?`,
            )
            .get(accountId, fromDate) as { total: number };
        startingBalance = row.total;
    }

    // Transactions within the window, grouped by date (chronological)
    const rows = fromDate
        ? (db
              .prepare(
                  `SELECT date, SUM(amount_cents) AS day_delta
                   FROM transactions
                   WHERE account_id = ? AND deleted_at IS NULL AND date >= ?
                   GROUP BY date
                   ORDER BY date ASC`,
              )
              .all(accountId, fromDate) as { date: string; day_delta: number }[])
        : (db
              .prepare(
                  `SELECT date, SUM(amount_cents) AS day_delta
                   FROM transactions
                   WHERE account_id = ? AND deleted_at IS NULL
                   GROUP BY date
                   ORDER BY date ASC`,
              )
              .all(accountId) as { date: string; day_delta: number }[]);

    const points: BalancePoint[] = [];
    let running = startingBalance;

    if (fromDate && rows.length > 0) {
        points.push({ date: fromDate, balance_cents: running });
    }

    for (const row of rows) {
        running += row.day_delta;
        points.push({ date: row.date, balance_cents: running });
    }

    return points;
}

export function getCategoryTotals(accountId: number, fromDate: string | null): CategoryTotal[] {
    const rows = fromDate
        ? (db
              .prepare(
                  `SELECT category, SUM(ABS(amount_cents)) AS total_cents
                   FROM transactions
                   WHERE account_id = ? AND deleted_at IS NULL AND type = 'expense'
                     AND category IS NOT NULL AND date >= ?
                   GROUP BY category
                   ORDER BY total_cents DESC`,
              )
              .all(accountId, fromDate) as CategoryTotal[])
        : (db
              .prepare(
                  `SELECT category, SUM(ABS(amount_cents)) AS total_cents
                   FROM transactions
                   WHERE account_id = ? AND deleted_at IS NULL AND type = 'expense'
                     AND category IS NOT NULL
                   GROUP BY category
                   ORDER BY total_cents DESC`,
              )
              .all(accountId) as CategoryTotal[]);
    return rows;
}
