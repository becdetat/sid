import axios from 'axios';

const base = '/api/dashboard-config';

export type TileType = 'transactions' | 'balance_over_time' | 'totals_by_category';

export interface DashboardConfigItem {
    id: number;
    account_id: number;
    position: number;
    tile_type: TileType;
    time_window: string | null;
}

export async function getDashboardConfig(): Promise<DashboardConfigItem[]> {
    const { data } = await axios.get<{ items: DashboardConfigItem[] }>(base);
    return data.items;
}

export async function addToDashboard(
    accountId: number,
    tileType: TileType,
    timeWindow?: string,
): Promise<DashboardConfigItem> {
    const { data } = await axios.post<DashboardConfigItem>(`${base}/${accountId}`, {
        tile_type: tileType,
        time_window: timeWindow,
    });
    return data;
}

export async function removeFromDashboard(tileId: number): Promise<void> {
    await axios.delete(`${base}/${tileId}`);
}

export async function reorderDashboard(tileIds: number[]): Promise<void> {
    await axios.put(`${base}/order`, { tile_ids: tileIds });
}
