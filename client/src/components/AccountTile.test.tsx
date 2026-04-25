import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AccountTile from './AccountTile';
import type { DashboardAccount } from '../types/dashboard';

const account: DashboardAccount = {
    id: 1,
    name: 'Office',
    balance_cents: -15000,
    recent_transactions: [],
};

function renderTile(onAddTransaction = vi.fn()) {
    return render(
        <MemoryRouter>
            <AccountTile
                account={account}
                onAddTransaction={onAddTransaction}
            />
        </MemoryRouter>,
    );
}

describe('AccountTile', () => {
    it('renders account name as a link', () => {
        renderTile();
        expect(screen.getByRole('link', { name: 'Office' })).toBeTruthy();
    });

    it('does not show edit or delete buttons', () => {
        renderTile();
        expect(screen.queryByRole('button', { name: /edit office/i })).toBeNull();
        expect(screen.queryByRole('button', { name: /delete office/i })).toBeNull();
    });

    it('shows balance colour-coded red for negative', () => {
        renderTile();
        const el = screen.getByText('\u2212$150.00');
        expect(el.style.color).toBe('var(--red)');
    });

    it('shows "No transactions yet" when recent_transactions is empty', () => {
        renderTile();
        expect(screen.getByText('No transactions yet')).toBeTruthy();
    });

    it('calls onAddTransaction when add transaction button is clicked', () => {
        const onAddTransaction = vi.fn();
        renderTile(onAddTransaction);
        fireEvent.click(screen.getByRole('button', { name: /add transaction/i }));
        expect(onAddTransaction).toHaveBeenCalledWith(account);
    });
});
