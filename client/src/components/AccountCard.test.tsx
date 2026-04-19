import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AccountCard from './AccountCard';
import type { DashboardAccount } from '../types/dashboard';

const account: DashboardAccount = {
    id: 1,
    name: 'Office',
    balance_cents: -15000,
    recent_transactions: [],
};

function renderCard(onAddTransaction = vi.fn()) {
    return render(
        <MemoryRouter>
            <AccountCard
                account={account}
                onAddTransaction={onAddTransaction}
            />
        </MemoryRouter>,
    );
}

describe('AccountCard', () => {
    it('renders account name as a link', () => {
        renderCard();
        expect(screen.getByRole('link', { name: 'Office' })).toBeTruthy();
    });

    it('does not show edit or delete buttons', () => {
        renderCard();
        expect(screen.queryByRole('button', { name: /edit office/i })).toBeNull();
        expect(screen.queryByRole('button', { name: /delete office/i })).toBeNull();
    });

    it('shows balance colour-coded red for negative', () => {
        renderCard();
        const el = screen.getByText('\u2212$150.00');
        expect(el.style.color).toBe('var(--red)');
    });

    it('shows "No transactions yet" when recent_transactions is empty', () => {
        renderCard();
        expect(screen.getByText('No transactions yet')).toBeTruthy();
    });

    it('calls onAddTransaction when add transaction button is clicked', () => {
        const onAddTransaction = vi.fn();
        renderCard(onAddTransaction);
        fireEvent.click(screen.getByRole('button', { name: /add transaction/i }));
        expect(onAddTransaction).toHaveBeenCalledWith(account);
    });
});
