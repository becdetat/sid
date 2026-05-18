import axios from 'axios';
import type { Transaction } from '../types/transaction';

function base(accountId: number): string {
    return `/api/accounts/${accountId}/transactions`;
}

export interface TransactionFilters {
    keyword?: string;
    from?: string;
    to?: string;
    category?: string;
    type?: 'income' | 'expense' | '';
    amountMin?: string;
    amountMax?: string;
}

export async function listTransactions(
    accountId: number,
    filters?: TransactionFilters,
): Promise<Transaction[]> {
    const params: Record<string, string> = {};
    if (filters?.keyword) params.keyword = filters.keyword;
    if (filters?.from) params.from = filters.from;
    if (filters?.to) params.to = filters.to;
    if (filters?.category) params.category = filters.category;
    if (filters?.type) params.type = filters.type;
    if (filters?.amountMin) params.amountMin = filters.amountMin;
    if (filters?.amountMax) params.amountMax = filters.amountMax;
    const { data } = await axios.get<Transaction[]>(base(accountId), { params });
    return data;
}

export async function getTransaction(accountId: number, id: number): Promise<Transaction> {
    const { data } = await axios.get<Transaction>(`${base(accountId)}/${id}`);
    return data;
}

export interface TransactionPayload {
    category?: string | null;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    date: string;
    notes?: string | null;
    account_id?: number;
}

export async function createTransaction(
    accountId: number,
    payload: TransactionPayload,
): Promise<Transaction> {
    const { data } = await axios.post<Transaction>(base(accountId), payload);
    return data;
}

export async function updateTransaction(
    accountId: number,
    id: number,
    payload: Partial<TransactionPayload>,
): Promise<Transaction> {
    const { data } = await axios.put<Transaction>(`${base(accountId)}/${id}`, payload);
    return data;
}

export async function deleteTransaction(accountId: number, id: number): Promise<void> {
    await axios.delete(`${base(accountId)}/${id}`);
}

export async function bulkDeleteTransactions(accountId: number, ids: number[]): Promise<void> {
    await axios.delete(`${base(accountId)}/bulk`, { data: { ids } });
}

export async function bulkExportTransactions(accountId: number, ids: number[]): Promise<void> {
    const response = await axios.post(`/api/accounts/${accountId}/export/bulk`, { ids }, { responseType: 'blob' });
    const disposition = response.headers['content-disposition'] as string | undefined;
    const match = disposition?.match(/filename="([^"]+)"/);
    const filename = match?.[1] ?? `export-${new Date().toISOString().slice(0, 10)}.csv`;
    const url = URL.createObjectURL(new Blob([response.data as BlobPart], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export async function importTransactions(
    accountId: number,
    file: File,
): Promise<{ imported: number }> {
    const form = new FormData();
    form.append('file', file);
    const { data } = await axios.post<{ imported: number }>(`${base(accountId)}/import`, form);
    return data;
}
