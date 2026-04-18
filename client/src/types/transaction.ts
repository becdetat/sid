export interface Transaction {
    id: number;
    account_id: number;
    description: string;
    amount_cents: number;
    type: 'income' | 'expense';
    date: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}
