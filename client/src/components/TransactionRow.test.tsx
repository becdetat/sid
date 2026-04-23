import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TransactionRow from './TransactionRow';
import type { Transaction } from '../types/transaction';

const expense: Transaction = {
    id: 1,
    account_id: 1,
    category: 'Food & Drink',
    description: 'Coffee',
    amount_cents: -450,
    type: 'expense',
    date: '2024-01-15',
    notes: null,
    created_at: '2024-01-15T00:00:00',
    updated_at: '2024-01-15T00:00:00',
    deleted_at: null,
};

const income: Transaction = {
    ...expense,
    id: 2,
    description: 'Salary',
    amount_cents: 100000,
    type: 'income',
};

function renderRow(t = expense, onEdit = vi.fn(), onDelete = vi.fn()) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <TransactionRow
                transaction={t}
                onEdit={onEdit}
                onDelete={onDelete}
                isLast={false}
                gridTemplate="100px 150px 1fr 100px 100px"
            />
        </QueryClientProvider>,
    );
}

describe('TransactionRow', () => {
    it('renders description', () => {
        renderRow();
        expect(screen.getAllByText('Coffee').length).toBeGreaterThan(0);
    });

    it('renders formatted date', () => {
        renderRow();
        expect(screen.getAllByText('15 Jan 2024').length).toBeGreaterThan(0);
    });

    it('renders expense amount in red with minus sign', () => {
        renderRow();
        const cells = screen.getAllByText('−$4.50');
        expect(cells[0].style.color).toBe('var(--red)');
    });

    it('renders income amount in green with plus sign', () => {
        renderRow(income);
        const cells = screen.getAllByText('+$1,000.00');
        expect(cells[0].style.color).toBe('var(--green)');
    });

    it('calls onEdit when edit button is clicked', () => {
        const onEdit = vi.fn();
        renderRow(expense, onEdit);
        fireEvent.click(screen.getAllByRole('button', { name: /edit coffee/i })[0]);
        expect(onEdit).toHaveBeenCalledWith(expense);
    });

    it('calls onDelete when delete button is clicked', () => {
        const onDelete = vi.fn();
        renderRow(expense, vi.fn(), onDelete);
        fireEvent.click(screen.getAllByRole('button', { name: /delete coffee/i })[0]);
        expect(onDelete).toHaveBeenCalledWith(expense);
    });
});
