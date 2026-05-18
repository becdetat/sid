import db from '../db';

type Frequency = 'daily' | 'weekly' | 'fortnightly' | 'monthly' | 'yearly';

interface TemplateRow {
    id: number;
    account_id: number;
    category: string | null;
    description: string;
    amount_cents: number;
    type: string;
    notes: string | null;
    recurrence: Frequency;
    recurrence_end_date: string | null;
}

export function getNextDate(dateStr: string, frequency: Frequency): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (frequency === 'daily') {
        return toDateStr(y, m, d + 1);
    }
    if (frequency === 'weekly') {
        return toDateStr(y, m, d + 7);
    }
    if (frequency === 'fortnightly') {
        return toDateStr(y, m, d + 14);
    }
    if (frequency === 'monthly') {
        const nextMonth = m === 12 ? 1 : m + 1;
        const nextYear = m === 12 ? y + 1 : y;
        const lastDay = daysInMonth(nextYear, nextMonth);
        return toDateStr(nextYear, nextMonth, Math.min(d, lastDay));
    }
    // yearly
    const nextYear = y + 1;
    const lastDay = daysInMonth(nextYear, m);
    return toDateStr(nextYear, m, Math.min(d, lastDay));
}

function daysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
}

function toDateStr(y: number, m: number, d: number): string {
    // Handle overflow: d > daysInMonth, m > 12
    const date = new Date(y, m - 1, d);
    const yy = date.getFullYear();
    const mm = date.getMonth() + 1;
    const dd = date.getDate();
    return `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

function today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function generateDueOccurrences(): void {
    const todayStr = today();

    const templates = db
        .prepare(
            `SELECT id, account_id, category, description, amount_cents, type, notes, recurrence, recurrence_end_date
             FROM transactions
             WHERE recurrence IS NOT NULL AND recurrence_source_id IS NULL AND deleted_at IS NULL`,
        )
        .all() as TemplateRow[];

    const insertStmt = db.prepare(
        `INSERT INTO transactions (account_id, category, description, amount_cents, type, date, notes, recurrence_source_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    const run = db.transaction(() => {
        for (const tmpl of templates) {
            const lastRow = db
                .prepare(
                    `SELECT MAX(date) AS last_date FROM transactions
                     WHERE (id = ? OR recurrence_source_id = ?) AND deleted_at IS NULL`,
                )
                .get(tmpl.id, tmpl.id) as { last_date: string | null };

            let lastDate = lastRow.last_date ?? tmpl.recurrence_end_date;
            if (!lastDate) continue;

            const ceiling = tmpl.recurrence_end_date && tmpl.recurrence_end_date < todayStr
                ? tmpl.recurrence_end_date
                : todayStr;

            let next = getNextDate(lastDate, tmpl.recurrence);
            while (next <= ceiling) {
                insertStmt.run(
                    tmpl.account_id,
                    tmpl.category,
                    tmpl.description,
                    tmpl.amount_cents,
                    tmpl.type,
                    next,
                    tmpl.notes,
                    tmpl.id,
                );
                lastDate = next;
                next = getNextDate(lastDate, tmpl.recurrence);
            }
        }
    });

    run();
}
