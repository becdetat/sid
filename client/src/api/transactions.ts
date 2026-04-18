import axios from 'axios';
import type { Transaction } from '../types/transaction';

function base(accountId: number): string {
    return `/api/accounts/${accountId}/transactions`;
}

export async function listTransactions(accountId: number): Promise<Transaction[]> {
    const { data } = await axios.get<Transaction[]>(base(accountId));
    return data;
}

export async function getTransaction(accountId: number, id: number): Promise<Transaction> {
    const { data } = await axios.get<Transaction>(`${base(accountId)}/${id}`);
    return data;
}

export interface TransactionPayload {
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
