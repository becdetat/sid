import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ViewsDropdown from './ViewsDropdown';
import type { SavedView } from '../api/savedViews';

vi.mock('../api/savedViews', async () => {
    const actual = await vi.importActual<object>('../api/savedViews');
    return {
        ...actual,
        listSavedViews: vi.fn(),
        createSavedView: vi.fn(),
        updateSavedView: vi.fn(),
        deleteSavedView: vi.fn(),
        setSavedViewDefault: vi.fn(),
    };
});

import * as svApi from '../api/savedViews';

function view(over: Partial<SavedView>): SavedView {
    return {
        id: 1,
        scope: 'account',
        account_id: 1,
        name: 'My view',
        filters: {},
        is_default: false,
        position: 0,
        created_at: '',
        deleted_at: null,
        ...over,
    };
}

function renderDropdown(props: Partial<React.ComponentProps<typeof ViewsDropdown>> = {}) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <ViewsDropdown
                scope="account"
                accountId={1}
                currentFilters={{ keyword: 'hi' }}
                isFiltered={true}
                onApply={vi.fn()}
                onClear={vi.fn()}
                {...props}
            />
        </QueryClientProvider>,
    );
}

describe('ViewsDropdown', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(svApi.listSavedViews).mockResolvedValue([]);
    });

    it('opens to show "All transactions" and "Save current filters"', async () => {
        renderDropdown();
        fireEvent.click(screen.getByRole('button', { name: /saved views/i }));
        expect(screen.getByText('All transactions')).toBeTruthy();
        expect(screen.getByText(/save current filters/i)).toBeTruthy();
    });

    it('lists saved views and applies one on click', async () => {
        const onApply = vi.fn();
        vi.mocked(svApi.listSavedViews).mockImplementation(async (opts) =>
            opts?.scope === 'account' ? [view({ id: 5, name: 'Subscriptions', filters: { type: 'expense' } })] : [],
        );
        renderDropdown({ onApply });

        fireEvent.click(screen.getByRole('button', { name: /saved views/i }));
        const applyBtn = await screen.findByRole('button', { name: 'Subscriptions' });
        fireEvent.click(applyBtn);
        expect(onApply).toHaveBeenCalledWith({ type: 'expense' });
    });

    it('strips unknown filter keys when applying a view (forward-compat)', async () => {
        const onApply = vi.fn();
        vi.mocked(svApi.listSavedViews).mockImplementation(async (opts) =>
            opts?.scope === 'account'
                ? [view({ id: 6, name: 'Future view', filters: { type: 'expense', futureKnob: 'on', tagIds: [1, 2] } })]
                : [],
        );
        renderDropdown({ onApply });

        fireEvent.click(screen.getByRole('button', { name: /saved views/i }));
        const applyBtn = await screen.findByRole('button', { name: 'Future view' });
        fireEvent.click(applyBtn);
        expect(onApply).toHaveBeenCalledWith({ type: 'expense' });
    });

    it('disables "Save current filters" when no filters are set', () => {
        renderDropdown({ isFiltered: false });
        fireEvent.click(screen.getByRole('button', { name: /saved views/i }));
        const save = screen.getByText(/save current filters/i).closest('button')!;
        expect(save.disabled).toBe(true);
    });

    it('opens a name prompt and saves the current filters', async () => {
        vi.mocked(svApi.createSavedView).mockResolvedValue(view({ id: 9, name: 'New' }));
        renderDropdown({ currentFilters: { keyword: 'cafe', type: 'expense' } });

        fireEvent.click(screen.getByRole('button', { name: /saved views/i }));
        fireEvent.click(screen.getByText(/save current filters/i));
        const input = screen.getByPlaceholderText('View name');
        fireEvent.change(input, { target: { value: 'Cafes' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        await waitFor(() => {
            expect(svApi.createSavedView).toHaveBeenCalledWith({
                scope: 'account',
                account_id: 1,
                name: 'Cafes',
                filters: { keyword: 'cafe', type: 'expense' },
            });
        });
    });

    it('shows default chip and triggers setSavedViewDefault from the kebab menu', async () => {
        vi.mocked(svApi.listSavedViews).mockImplementation(async (opts) =>
            opts?.scope === 'account' ? [view({ id: 5, name: 'Subs', is_default: true })] : [],
        );
        renderDropdown();

        fireEvent.click(screen.getByRole('button', { name: /saved views/i }));
        await screen.findByRole('button', { name: /Subs.*default/i });
        expect(screen.getByText('default')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: /more options for subs/i }));
        const unsetBtn = await screen.findByRole('button', { name: /unset as default/i });
        fireEvent.click(unsetBtn);
        await waitFor(() => {
            expect(svApi.setSavedViewDefault).toHaveBeenCalledWith(5, false);
        });
    });

    it('shows global views section when scope is account and global views exist', async () => {
        vi.mocked(svApi.listSavedViews).mockImplementation(async (opts) => {
            if (opts?.scope === 'account') return [view({ id: 1, name: 'Account A' })];
            return [view({ id: 2, scope: 'global', account_id: null, name: 'Cross-account' })];
        });
        renderDropdown();

        fireEvent.click(screen.getByRole('button', { name: /saved views/i }));
        await waitFor(() => {
            expect(screen.getByText('Account A')).toBeTruthy();
            expect(screen.getByText('Cross-account')).toBeTruthy();
            expect(screen.getByText('Global views')).toBeTruthy();
        });
    });
});
