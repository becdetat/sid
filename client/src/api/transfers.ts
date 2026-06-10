import axios from 'axios';
import type { Transaction } from '../types/transaction';

export interface TransferPair {
    source: Transaction;
    destination: Transaction;
    transfer_group_id: string;
}

export interface TransferPayload {
    source_account_id: number;
    destination_account_id: number;
    amount: number;
    date: string;
    description?: string;
    notes?: string | null;
    recurrence?: string | null;
    recurrence_end_date?: string | null;
}

export async function getTransfer(groupId: string): Promise<TransferPair> {
    const { data } = await axios.get<TransferPair>(`/api/transfers/${groupId}`);
    return data;
}

export async function createTransfer(payload: TransferPayload): Promise<TransferPair> {
    const { data } = await axios.post<TransferPair>('/api/transfers', payload);
    return data;
}

export async function updateTransfer(
    groupId: string,
    payload: Partial<TransferPayload>,
): Promise<TransferPair> {
    const { data } = await axios.put<TransferPair>(`/api/transfers/${groupId}`, payload);
    return data;
}

export async function deleteTransfer(groupId: string): Promise<void> {
    await axios.delete(`/api/transfers/${groupId}`);
}
