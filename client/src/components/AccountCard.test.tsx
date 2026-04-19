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

function renderCard(onEdit = vi.fn(), onDelete = vi.fn(), onAddTransaction = vi.fn()) {
    return render(
        <MemoryRouter>
            <AccountCard 
                account={account} 
                onEdit={onEdit} 
                onDelete={onDelete}
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

    it('calls onEdit when edit button is clicked', () => {
        const onEdit = vi.fn();
        renderCard(onEdit);
        fireEvent.click(screen.getByRole('button', { name: /edit office/i }));
        expect(onEdit).toHaveBeenCalledWith(account);
    });

    it('calls onDelete when delete button is clicked', () => {
        const onDelete = vi.fn();
        renderCard(vi.fn(), onDelete);
        fireEvent.click(screen.getByRole('button', { name: /delete office/i }));
        expect(onDelete).toHaveBeenCalledWith(account);
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
});
