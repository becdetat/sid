import axios from 'axios';

const base = '/api/dashboard-config';

export type TileType = 'transactions' | 'balance_over_time' | 'totals_by_category' | 'income_vs_expense' | 'budget_progress';

export interface DashboardConfigItem {
    id: number;
    account_id: number;
    position: number;
    tile_type: TileType;
    time_window: string | null;
    show_balance: boolean;
    balance_cents: number | null;
}

export interface UpdateTilePayload {
    account_id: number;
    tile_type: TileType;
    time_window?: string;
    show_balance: boolean;
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

export async function updateTile(tileId: number, payload: UpdateTilePayload): Promise<DashboardConfigItem> {
    const { data } = await axios.patch<DashboardConfigItem>(`${base}/${tileId}`, {
        account_id: payload.account_id,
        tile_type: payload.tile_type,
        time_window: payload.time_window,
        show_balance: payload.show_balance,
    });
    return data;
}

export async function removeFromDashboard(tileId: number): Promise<void> {
    await axios.delete(`${base}/${tileId}`);
}

export async function reorderDashboard(tileIds: number[]): Promise<void> {
    await axios.put(`${base}/order`, { tile_ids: tileIds });
}
