import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TransactionForm from './TransactionForm';
import type { Transaction } from '../types/transaction';

const existing: Transaction = {
    id: 1,
    account_id: 1,
    category: 'Food',
    description: 'Coffee',
    amount_cents: -450,
    type: 'expense',
    date: '2024-01-15',
    notes: 'morning coffee',
    created_at: '2024-01-15T00:00:00',
    updated_at: '2024-01-15T00:00:00',
    deleted_at: null,
};

function wrap(ui: React.ReactElement) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('TransactionForm', () => {
    it('renders "New transaction" title when no initial', () => {
        wrap(<TransactionForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
        expect(screen.getByText('New transaction')).toBeTruthy();
    });

    it('renders "Edit transaction" title when initial provided', () => {
        wrap(<TransactionForm initial={existing} onSubmit={vi.fn()} onCancel={vi.fn()} />);
        expect(screen.getByText('Edit transaction')).toBeTruthy();
    });

    it('renders Category field before Description field', () => {
        wrap(<TransactionForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
        expect(screen.getByLabelText(/category/i)).toBeTruthy();
        expect(screen.getByLabelText(/description/i)).toBeTruthy();
    });

    it('pre-populates fields from initial', () => {
        wrap(<TransactionForm initial={existing} onSubmit={vi.fn()} onCancel={vi.fn()} />);
        const inputs = screen.getAllByRole('textbox');
        const descInput = inputs.find(
            (el) => (el as HTMLInputElement).value === 'Coffee',
        );
        expect(descInput).toBeTruthy();
        const catInput = inputs.find(
            (el) => (el as HTMLInputElement).value === 'Food',
        );
        expect(catInput).toBeTruthy();
    });

    it('shows validation errors when submitted empty', () => {
        wrap(<TransactionForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: /save/i }));
        expect(screen.getByText('Description is required.')).toBeTruthy();
        expect(screen.getByText('Enter a positive amount.')).toBeTruthy();
    });

    it('does not submit when validation fails', () => {
        const onSubmit = vi.fn();
        wrap(<TransactionForm onSubmit={onSubmit} onCancel={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: /save/i }));
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('calls onSubmit with pre-filled values when editing', () => {
        const onSubmit = vi.fn();
        wrap(<TransactionForm initial={existing} onSubmit={onSubmit} onCancel={vi.fn()} />);

        fireEvent.submit(document.querySelector('form')!);

        expect(onSubmit).toHaveBeenCalledWith(
            expect.objectContaining({
                category: 'Food',
                description: 'Coffee',
                amount: 4.5,
                type: 'expense',
                date: '2024-01-15',
            }),
            [],
        );
    });

    it('passes null category when field is empty', () => {
        const onSubmit = vi.fn();
        const noCategory: Transaction = { ...existing, category: null };
        wrap(<TransactionForm initial={noCategory} onSubmit={onSubmit} onCancel={vi.fn()} />);

        fireEvent.submit(document.querySelector('form')!);

        expect(onSubmit).toHaveBeenCalledWith(
            expect.objectContaining({ category: null }),
            [],
        );
    });

    it('calls onCancel when cancel is clicked', () => {
        const onCancel = vi.fn();
        wrap(<TransactionForm onSubmit={vi.fn()} onCancel={onCancel} />);
        fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
        expect(onCancel).toHaveBeenCalled();
    });

    it('toggles type between expense and income', () => {
        wrap(<TransactionForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
        const incomeBtn = screen.getByRole('button', { name: /income/i });
        fireEvent.click(incomeBtn);
        expect((incomeBtn as HTMLButtonElement).style.background).toBe('var(--green)');
    });
});
