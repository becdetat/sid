import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardSection from './DashboardSection';

vi.mock('../../api/dashboardConfig', () => ({
    getDashboardConfig: vi.fn(),
    addToDashboard: vi.fn(),
    removeFromDashboard: vi.fn(),
    reorderDashboard: vi.fn(),
}));

vi.mock('../../api/accounts', () => ({
    listAccounts: vi.fn(),
}));

import * as dashboardConfigApi from '../../api/dashboardConfig';
import * as accountsApi from '../../api/accounts';

const mockConfig = [
    { id: 1, account_id: 10, position: 1 },
    { id: 2, account_id: 20, position: 2 },
    { id: 3, account_id: 30, position: 3 },
];

const mockAccounts = [
    { id: 10, name: 'Savings', created_at: '', deleted_at: null, transaction_count: 0 },
    { id: 20, name: 'Checking', created_at: '', deleted_at: null, transaction_count: 0 },
    { id: 30, name: 'Credit Card', created_at: '', deleted_at: null, transaction_count: 0 },
    { id: 40, name: 'Hidden Account', created_at: '', deleted_at: null, transaction_count: 0 },
];

function renderSection() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <DashboardSection />
        </QueryClientProvider>,
    );
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dashboardConfigApi.getDashboardConfig).mockResolvedValue(mockConfig);
    vi.mocked(accountsApi.listAccounts).mockResolvedValue(mockAccounts);
    vi.mocked(dashboardConfigApi.reorderDashboard).mockResolvedValue(undefined);
    vi.mocked(dashboardConfigApi.removeFromDashboard).mockResolvedValue(undefined);
    vi.mocked(dashboardConfigApi.addToDashboard).mockResolvedValue({ id: 4, account_id: 40, position: 4 });
});

describe('DashboardSection', () => {
    it('renders accounts in configured order', async () => {
        renderSection();
        await waitFor(() => {
            expect(screen.getByText('Savings')).toBeTruthy();
        });
        const rows = screen.getAllByRole('row').slice(1); // skip header
        expect(rows[0].textContent).toContain('Savings');
        expect(rows[1].textContent).toContain('Checking');
        expect(rows[2].textContent).toContain('Credit Card');
    });

    it('disables up button for the first account', async () => {
        renderSection();
        await waitFor(() => screen.getByText('Savings'));
        const upButtons = screen.getAllByRole('button', { name: /move .* up/i });
        expect((upButtons[0] as HTMLButtonElement).disabled).toBe(true);
        expect((upButtons[1] as HTMLButtonElement).disabled).toBe(false);
    });

    it('disables down button for the last account', async () => {
        renderSection();
        await waitFor(() => screen.getByText('Credit Card'));
        const downButtons = screen.getAllByRole('button', { name: /move .* down/i });
        expect((downButtons[downButtons.length - 1] as HTMLButtonElement).disabled).toBe(true);
        expect((downButtons[0] as HTMLButtonElement).disabled).toBe(false);
    });

    it('calls reorderDashboard with swapped ids when moving up', async () => {
        renderSection();
        await waitFor(() => screen.getByText('Checking'));
        const upButtons = screen.getAllByRole('button', { name: /move .* up/i });
        fireEvent.click(upButtons[1]); // move Checking up
        await waitFor(() => {
            expect(dashboardConfigApi.reorderDashboard).toHaveBeenCalledWith([20, 10, 30]);
        });
    });

    it('calls reorderDashboard with swapped ids when moving down', async () => {
        renderSection();
        await waitFor(() => screen.getByText('Savings'));
        const downButtons = screen.getAllByRole('button', { name: /move .* down/i });
        fireEvent.click(downButtons[0]); // move Savings down
        await waitFor(() => {
            expect(dashboardConfigApi.reorderDashboard).toHaveBeenCalledWith([20, 10, 30]);
        });
    });

    it('calls removeFromDashboard when remove button clicked', async () => {
        renderSection();
        await waitFor(() => screen.getByText('Savings'));
        const removeButtons = screen.getAllByRole('button', { name: /remove .* from dashboard/i });
        fireEvent.click(removeButtons[0]);
        await waitFor(() => {
            expect(dashboardConfigApi.removeFromDashboard).toHaveBeenCalledWith(10);
        });
    });

    it('shows only unconfigured accounts in the add dropdown', async () => {
        renderSection();
        await waitFor(() => screen.getByText('+ Add account…'));
        const select = screen.getByRole('combobox');
        const options = Array.from(select.querySelectorAll('option')).map((o) => o.textContent);
        expect(options).toContain('Hidden Account');
        expect(options).not.toContain('Savings');
        expect(options).not.toContain('Checking');
        expect(options).not.toContain('Credit Card');
    });

    it('calls addToDashboard when selecting from dropdown', async () => {
        renderSection();
        await waitFor(() => screen.getByRole('combobox'));
        fireEvent.change(screen.getByRole('combobox'), { target: { value: '40' } });
        await waitFor(() => {
            expect(dashboardConfigApi.addToDashboard).toHaveBeenCalledWith(40);
        });
    });

    it('hides add dropdown when all accounts are configured', async () => {
        vi.mocked(dashboardConfigApi.getDashboardConfig).mockResolvedValue([
            ...mockConfig,
            { id: 4, account_id: 40, position: 4 },
        ]);
        renderSection();
        await waitFor(() => screen.getByText('Savings'));
        expect(screen.queryByRole('combobox')).toBeNull();
    });

    it('shows empty state when no accounts are configured', async () => {
        vi.mocked(dashboardConfigApi.getDashboardConfig).mockResolvedValue([]);
        renderSection();
        await waitFor(() => screen.getByText(/no accounts are configured/i));
    });
});
