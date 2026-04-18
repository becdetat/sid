import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmDialog from './ConfirmDialog';

describe('ConfirmDialog', () => {
    it('renders the message', () => {
        render(
            <ConfirmDialog
                message='Delete "Office"?'
                onConfirm={vi.fn()}
                onCancel={vi.fn()}
            />,
        );
        expect(screen.getByText('Delete "Office"?')).toBeTruthy();
    });

    it('calls onConfirm when Delete is clicked', () => {
        const onConfirm = vi.fn();
        render(
            <ConfirmDialog message="Are you sure?" onConfirm={onConfirm} onCancel={vi.fn()} />,
        );
        fireEvent.click(screen.getByRole('button', { name: /delete/i }));
        expect(onConfirm).toHaveBeenCalled();
    });

    it('calls onCancel when Cancel is clicked', () => {
        const onCancel = vi.fn();
        render(
            <ConfirmDialog message="Are you sure?" onConfirm={vi.fn()} onCancel={onCancel} />,
        );
        fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
        expect(onCancel).toHaveBeenCalled();
    });
});
