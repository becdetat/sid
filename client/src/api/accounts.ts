import axios from 'axios';
import type { Account } from '../types/account';

const base = '/api/accounts';

export async function listAccounts(): Promise<Account[]> {
    const { data } = await axios.get<Account[]>(base);
    return data;
}

export async function getAccount(id: number): Promise<Account> {
    const { data } = await axios.get<Account>(`${base}/${id}`);
    return data;
}

export async function createAccount(name: string): Promise<Account> {
    const { data } = await axios.post<Account>(base, { name });
    return data;
}

export async function updateAccount(id: number, name: string): Promise<Account> {
    const { data } = await axios.put<Account>(`${base}/${id}`, { name });
    return data;
}

export async function deleteAccount(id: number): Promise<void> {
    await axios.delete(`${base}/${id}`);
}
