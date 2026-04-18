import axios from 'axios';
import type { DashboardAccount } from '../types/dashboard';

export async function getDashboard(): Promise<DashboardAccount[]> {
    const res = await axios.get<{ accounts: DashboardAccount[] }>('/api/dashboard');
    return res.data.accounts;
}
