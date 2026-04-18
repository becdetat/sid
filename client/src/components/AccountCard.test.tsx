import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AccountCard from './AccountCard';
import type { Account } from '../types/account';

const account: Account = { id: 1, name: 'Office', created_at: '2024-01-01', deleted_at: null };

function renderCard(onEdit = vi.fn(), onDelete = vi.fn()) {
    return render(
        <MemoryRouter>
            <AccountCard account={account} onEdit={onEdit} onDelete={onDelete} />
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
});
