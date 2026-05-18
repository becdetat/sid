import axios from 'axios';

export interface Budget {
    id: number;
    account_id: number;
    category: string;
    amount_cents: number;
    period: 'monthly' | 'weekly';
    warning_threshold: number;
    danger_threshold: number;
    created_at: string;
    deleted_at: string | null;
}

export interface BudgetProgress extends Budget {
    spent_cents: number;
    percent: number;
}

export interface BudgetPayload {
    category: string;
    amount: number;
    period: 'monthly' | 'weekly';
    warning_threshold: number;
    danger_threshold: number;
}

function base(accountId: number): string {
    return `/api/accounts/${accountId}/budgets`;
}

export async function getBudgets(accountId: number): Promise<Budget[]> {
    const { data } = await axios.get<Budget[]>(base(accountId));
    return data;
}

export async function getBudgetProgress(accountId: number): Promise<BudgetProgress[]> {
    const { data } = await axios.get<BudgetProgress[]>(`${base(accountId)}/progress`);
    return data;
}

export async function createBudget(accountId: number, payload: BudgetPayload): Promise<Budget> {
    const { data } = await axios.post<Budget>(base(accountId), payload);
    return data;
}

export async function updateBudget(accountId: number, id: number, payload: Partial<BudgetPayload>): Promise<Budget> {
    const { data } = await axios.put<Budget>(`${base(accountId)}/${id}`, payload);
    return data;
}

export async function deleteBudget(accountId: number, id: number): Promise<void> {
    await axios.delete(`${base(accountId)}/${id}`);
}
