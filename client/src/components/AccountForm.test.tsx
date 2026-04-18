import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AccountForm from './AccountForm';

describe('AccountForm', () => {
    it('renders the title', () => {
        render(<AccountForm title="New account" onSubmit={vi.fn()} onCancel={vi.fn()} />);
        expect(screen.getByText('New account')).toBeTruthy();
    });

    it('pre-fills name when initialName is provided', () => {
        render(
            <AccountForm
                title="Rename account"
                initialName="Office"
                onSubmit={vi.fn()}
                onCancel={vi.fn()}
            />,
        );
        expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('Office');
    });

    it('calls onSubmit with trimmed name on submit', () => {
        const onSubmit = vi.fn();
        render(<AccountForm title="New account" onSubmit={onSubmit} onCancel={vi.fn()} />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: '  Training  ' } });
        fireEvent.click(screen.getByRole('button', { name: /save/i }));
        expect(onSubmit).toHaveBeenCalledWith('Training');
    });

    it('shows error and does not submit when name is empty', () => {
        const onSubmit = vi.fn();
        render(<AccountForm title="New account" onSubmit={onSubmit} onCancel={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: /save/i }));
        expect(onSubmit).not.toHaveBeenCalled();
        expect(screen.getByText('Name is required.')).toBeTruthy();
    });

    it('calls onCancel when cancel is clicked', () => {
        const onCancel = vi.fn();
        render(<AccountForm title="New account" onSubmit={vi.fn()} onCancel={onCancel} />);
        fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
        expect(onCancel).toHaveBeenCalled();
    });
});
