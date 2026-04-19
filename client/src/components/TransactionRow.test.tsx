import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
    return render(
        <table>
            <tbody>
                <TransactionRow 
                    transaction={t} 
                    onEdit={onEdit}
                    onDelete={onDelete}
                    isLast={false}
                    gridTemplate="100px 150px 1fr 100px 100px"
                />
            </tbody>
        </table>,
    );
}

describe('TransactionRow', () => {
    it('renders description', () => {
        renderRow();
        expect(screen.getByText('Coffee')).toBeTruthy();
    });

    it('renders formatted date', () => {
        renderRow();
        expect(screen.getByText('15 Jan 2024')).toBeTruthy();
    });

    it('renders expense amount in red with minus sign', () => {
        renderRow();
        const cell = screen.getByText('−$4.50');
        expect(cell.style.color).toBe('var(--red)');
    });

    it('renders income amount in green with plus sign', () => {
        renderRow(income);
        const cell = screen.getByText('+$1,000.00');
        expect(cell.style.color).toBe('var(--green)');
    });

    it('calls onEdit when edit button is clicked', () => {
        const onEdit = vi.fn();
        renderRow(expense, onEdit);
        fireEvent.click(screen.getByRole('button', { name: /edit coffee/i }));
        expect(onEdit).toHaveBeenCalledWith(expense);
    });

    it('calls onDelete when delete button is clicked', () => {
        const onDelete = vi.fn();
        renderRow(expense, vi.fn(), onDelete);
        fireEvent.click(screen.getByRole('button', { name: /delete coffee/i }));
        expect(onDelete).toHaveBeenCalledWith(expense);
    });
});
