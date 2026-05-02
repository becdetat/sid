import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import BalanceChartTile from './BalanceChartTile';

vi.mock('../api/charts', () => ({
    getBalanceChart: vi.fn(),
}));

import * as chartsApi from '../api/charts';

function renderTile(window: string) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    return render(
        <QueryClientProvider client={client}>
            <MemoryRouter>
                <BalanceChartTile accountId={1} accountName="Savings" window={window} />
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

describe('BalanceChartTile', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(chartsApi.getBalanceChart).mockResolvedValue([]);
    });

    it('shows the selected preset duration', async () => {
        renderTile('3m');

        await waitFor(() => {
            expect(screen.getByText('Last 3 months')).toBeTruthy();
        });
    });

    it('shows a readable label for custom week durations', async () => {
        renderTile('6w');

        await waitFor(() => {
            expect(screen.getByText('Last 6 weeks')).toBeTruthy();
        });
    });
});