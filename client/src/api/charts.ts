import axios from 'axios';

export interface BalancePoint {
    date: string;
    balance_cents: number;
}

export interface CategoryTotal {
    category: string;
    total_cents: number;
}

export async function getBalanceChart(accountId: number, window: string): Promise<BalancePoint[]> {
    const { data } = await axios.get<BalancePoint[]>(`/api/accounts/${accountId}/chart/balance`, {
        params: { window },
    });
    return data;
}

export async function getCategoryChart(accountId: number, window: string): Promise<CategoryTotal[]> {
    const { data } = await axios.get<CategoryTotal[]>(`/api/accounts/${accountId}/chart/categories`, {
        params: { window },
    });
    return data;
}
