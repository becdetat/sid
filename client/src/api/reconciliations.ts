import axios from 'axios';

export interface Reconciliation {
    id: number;
    account_id: number;
    statement_date: string;
    statement_balance_cents: number;
    completed_at: string;
    notes: string | null;
}

function base(accountId: number): string {
    return `/api/accounts/${accountId}/reconciliations`;
}

export async function listReconciliations(accountId: number): Promise<Reconciliation[]> {
    const { data } = await axios.get<Reconciliation[]>(base(accountId));
    return data;
}

export async function getLastReconciliation(accountId: number): Promise<Reconciliation | null> {
    const { data } = await axios.get<Reconciliation | null>(`${base(accountId)}/last`);
    return data;
}

export async function createReconciliation(
    accountId: number,
    payload: { statement_date: string; statement_balance_cents: number; notes?: string },
): Promise<Reconciliation> {
    const { data } = await axios.post<Reconciliation>(base(accountId), payload);
    return data;
}
