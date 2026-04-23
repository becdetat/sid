import db from '../db';

export interface Transaction {
    id: number;
    account_id: number;
    category: string | null;
    description: string;
    amount_cents: number;
    type: 'income' | 'expense';
    date: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export interface CreateTransactionInput {
    account_id: number;
    category?: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    date: string;
    notes?: string;
}

export interface UpdateTransactionInput {
    account_id?: number;
    category?: string | null;
    description?: string;
    amount?: number;
    type?: 'income' | 'expense';
    date?: string;
    notes?: string | null;
}

function toAmountCents(amount: number, type: 'income' | 'expense'): number {
    const abs = Math.round(Math.abs(amount) * 100);
    return type === 'income' ? abs : -abs;
}

export interface TransactionFilters {
    keyword?: string;
    from?: string;
    to?: string;
    category?: string;
    type?: 'income' | 'expense';
    amountMin?: number;
    amountMax?: number;
}

export function findByAccount(accountId: number, filters?: TransactionFilters): Transaction[] {
    const conditions: string[] = ['account_id = ?', 'deleted_at IS NULL'];
    const params: unknown[] = [accountId];

    if (filters?.keyword) {
        conditions.push('(description LIKE ? OR notes LIKE ?)');
        const kw = `%${filters.keyword}%`;
        params.push(kw, kw);
    }
    if (filters?.from) {
        conditions.push('date >= ?');
        params.push(filters.from);
    }
    if (filters?.to) {
        conditions.push('date <= ?');
        params.push(filters.to);
    }
    if (filters?.category) {
        conditions.push('category = ?');
        params.push(filters.category);
    }
    if (filters?.type) {
        conditions.push('type = ?');
        params.push(filters.type);
    }
    if (filters?.amountMin !== undefined) {
        conditions.push('ABS(amount_cents) >= ?');
        params.push(Math.round(filters.amountMin * 100));
    }
    if (filters?.amountMax !== undefined) {
        conditions.push('ABS(amount_cents) <= ?');
        params.push(Math.round(filters.amountMax * 100));
    }

    const sql = `SELECT * FROM transactions WHERE ${conditions.join(' AND ')} ORDER BY date DESC, id DESC`;
    return db.prepare(sql).all(...params) as Transaction[];
}

export function findById(id: number): Transaction | undefined {
    return db
        .prepare('SELECT * FROM transactions WHERE id = ? AND deleted_at IS NULL')
        .get(id) as Transaction | undefined;
}

export function create(input: CreateTransactionInput): Transaction {
    const amount_cents = toAmountCents(input.amount, input.type);
    const result = db
        .prepare(
            `INSERT INTO transactions (account_id, category, description, amount_cents, type, date, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
            input.account_id,
            input.category ?? null,
            input.description,
            amount_cents,
            input.type,
            input.date,
            input.notes ?? null,
        );
    return findById(result.lastInsertRowid as number)!;
}

export function update(id: number, input: UpdateTransactionInput): Transaction | undefined {
    const existing = findById(id);
    if (!existing) return undefined;

    const newType = input.type ?? existing.type;
    const newAmount =
        input.amount !== undefined ? input.amount : Math.abs(existing.amount_cents) / 100;
    const amount_cents = toAmountCents(newAmount, newType);

    db.prepare(
        `UPDATE transactions
         SET account_id = ?, category = ?, description = ?, amount_cents = ?, type = ?, date = ?, notes = ?,
             updated_at = datetime('now')
         WHERE id = ? AND deleted_at IS NULL`,
    ).run(
        input.account_id ?? existing.account_id,
        input.category !== undefined ? input.category : existing.category,
        input.description ?? existing.description,
        amount_cents,
        newType,
        input.date ?? existing.date,
        input.notes !== undefined ? input.notes : existing.notes,
        id,
    );
    return findById(id);
}

export function softDelete(id: number): boolean {
    const deleteAttachments = db.prepare(
        `UPDATE attachments SET deleted_at = datetime('now') WHERE transaction_id = ? AND deleted_at IS NULL`,
    );
    const deleteTransaction = db.prepare(
        `UPDATE transactions SET deleted_at = datetime('now') WHERE id = ? AND deleted_at IS NULL`,
    );

    const run = db.transaction((txId: number) => {
        deleteAttachments.run(txId);
        const result = deleteTransaction.run(txId);
        return result.changes > 0;
    });

    return run(id) as boolean;
}

export function getBalance(accountId: number): number {
    const row = db
        .prepare(
            'SELECT COALESCE(SUM(amount_cents), 0) AS balance FROM transactions WHERE account_id = ? AND deleted_at IS NULL',
        )
        .get(accountId) as { balance: number };
    return row.balance;
}
