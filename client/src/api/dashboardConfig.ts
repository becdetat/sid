import axios from 'axios';

const base = '/api/dashboard-config';

export interface DashboardConfigItem {
    id: number;
    account_id: number;
    position: number;
}

export async function getDashboardConfig(): Promise<DashboardConfigItem[]> {
    const { data } = await axios.get<{ items: DashboardConfigItem[] }>(base);
    return data.items;
}

export async function addToDashboard(accountId: number): Promise<DashboardConfigItem> {
    const { data } = await axios.post<DashboardConfigItem>(`${base}/${accountId}`);
    return data;
}

export async function removeFromDashboard(accountId: number): Promise<void> {
    await axios.delete(`${base}/${accountId}`);
}

export async function reorderDashboard(accountIds: number[]): Promise<void> {
    await axios.put(`${base}/order`, { account_ids: accountIds });
}
