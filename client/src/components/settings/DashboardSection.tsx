import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    getDashboardConfig,
    addToDashboard,
    removeFromDashboard,
    reorderDashboard,
    type TileType,
    type DashboardConfigItem,
} from '../../api/dashboardConfig';
import { listAccounts } from '../../api/accounts';

const TILE_TYPE_LABELS: Record<TileType, string> = {
    transactions: 'Transactions',
    balance_over_time: 'Balance over time',
    totals_by_category: 'Totals by category',
};

const WINDOW_OPTIONS = [
    { value: '30d', label: 'Last 30 days' },
    { value: '3m', label: 'Last 3 months' },
    { value: '12m', label: 'Last 12 months' },
    { value: 'all', label: 'All time' },
    { value: 'custom_weeks', label: 'Last X weeks' },
];

function tileLabel(item: DashboardConfigItem, accountName: string): string {
    if (item.tile_type === 'transactions') return accountName;
    return `${accountName} — ${TILE_TYPE_LABELS[item.tile_type]}`;
}

function isValidWeeks(value: string): boolean {
    const n = parseInt(value, 10);
    return /^\d+$/.test(value) && n >= 1 && n <= 52;
}

const ChevronUpIcon = () => (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
    </svg>
);

const ChevronDownIcon = () => (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
);

const XIcon = () => (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
);

const inputCls = 'font-body text-[14px] border-[1.5px] border-[var(--border)] rounded-[var(--radius-input)] px-3 py-[9px] bg-[var(--white)] text-[var(--text-primary)]';

export default function DashboardSection() {
    const queryClient = useQueryClient();

    const [addAccountId, setAddAccountId] = useState('');
    const [addTileType, setAddTileType] = useState<TileType | ''>('');
    const [addWindowOption, setAddWindowOption] = useState('');
    const [addWeeks, setAddWeeks] = useState('');

    const { data: config = [], isLoading: configLoading } = useQuery({
        queryKey: ['dashboard-config'],
        queryFn: getDashboardConfig,
    });

    const { data: allAccounts = [] } = useQuery({
        queryKey: ['accounts'],
        queryFn: listAccounts,
    });

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-config'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    };

    const reorderMutation = useMutation({
        mutationFn: (ids: number[]) => reorderDashboard(ids),
        onSuccess: invalidate,
        onError: () => toast.error('Failed to reorder dashboard.'),
    });

    const removeMutation = useMutation({
        mutationFn: (tileId: number) => removeFromDashboard(tileId),
        onSuccess: invalidate,
        onError: () => toast.error('Failed to remove tile from dashboard.'),
    });

    const addMutation = useMutation({
        mutationFn: ({ accountId, tileType, timeWindow }: { accountId: number; tileType: TileType; timeWindow?: string }) =>
            addToDashboard(accountId, tileType, timeWindow),
        onSuccess: () => {
            invalidate();
            setAddAccountId('');
            setAddTileType('');
            setAddWindowOption('');
            setAddWeeks('');
        },
        onError: () => toast.error('Failed to add tile to dashboard.'),
    });

    function move(index: number, direction: 'up' | 'down') {
        const newConfig = [...config];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        [newConfig[index], newConfig[swapIndex]] = [newConfig[swapIndex], newConfig[index]];
        reorderMutation.mutate(newConfig.map((item) => item.id));
    }

    function resolvedTimeWindow(): string | undefined {
        if (addWindowOption === 'custom_weeks') {
            return isValidWeeks(addWeeks) ? `${addWeeks}w` : undefined;
        }
        return addWindowOption || undefined;
    }

    const isChartType = addTileType === 'balance_over_time' || addTileType === 'totals_by_category';
    const timeWindow = resolvedTimeWindow();
    const canAdd =
        addAccountId !== '' &&
        addTileType !== '' &&
        (!isChartType || (addWindowOption !== '' && (addWindowOption !== 'custom_weeks' || isValidWeeks(addWeeks))));

    function handleAdd() {
        if (!canAdd || !addTileType) return;
        addMutation.mutate({
            accountId: parseInt(addAccountId, 10),
            tileType: addTileType,
            timeWindow: isChartType ? timeWindow : undefined,
        });
    }

    return (
        <section>
            <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-[22px] font-bold text-[var(--teak-dark)] m-0">
                    Dashboard
                </h2>
            </div>

            <p className="text-[13px] text-[var(--text-muted)] mb-5">
                Choose which tiles appear on the dashboard and in what order.
            </p>

            {configLoading && (
                <p className="text-[var(--text-muted)] text-sm">Loading…</p>
            )}

            {!configLoading && config.length === 0 && (
                <div className="text-center py-[60px]">
                    <p className="text-[var(--text-muted)] text-[15px] mb-5">
                        No tiles are configured for the dashboard.
                    </p>
                </div>
            )}

            {!configLoading && config.length > 0 && (
                <table className="w-full border-collapse mb-4">
                    <thead>
                        <tr className="[border-bottom:1.5px_solid_var(--border)]">
                            <th className="text-left px-3 pt-2 pb-[10px] text-[11px] font-bold tracking-[0.06em] text-[var(--text-muted)] uppercase font-body">
                                Tile
                            </th>
                            <th className="w-[100px]" />
                        </tr>
                    </thead>
                    <tbody>
                        {config.map((item, index) => {
                            const account = allAccounts.find((a) => a.id === item.account_id);
                            const name = account?.name ?? `Account ${item.account_id}`;
                            const label = tileLabel(item, name);
                            return (
                                <tr key={item.id} className="border-b border-[var(--cream-mid)]">
                                    <td className="p-3 text-sm font-semibold text-[var(--text-primary)] font-body">
                                        {label}
                                    </td>
                                    <td className="p-3 pl-0">
                                        <div className="flex gap-0.5 justify-end">
                                            <button
                                                aria-label={`Move ${label} up`}
                                                className="sid-icon-btn"
                                                onClick={() => move(index, 'up')}
                                                disabled={index === 0}
                                                title="Move up"
                                            >
                                                <ChevronUpIcon />
                                            </button>
                                            <button
                                                aria-label={`Move ${label} down`}
                                                className="sid-icon-btn"
                                                onClick={() => move(index, 'down')}
                                                disabled={index === config.length - 1}
                                                title="Move down"
                                            >
                                                <ChevronDownIcon />
                                            </button>
                                            <button
                                                aria-label={`Remove ${label} from dashboard`}
                                                className="sid-icon-btn danger"
                                                onClick={() => removeMutation.mutate(item.id)}
                                                title="Remove from dashboard"
                                            >
                                                <XIcon />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}

            {!configLoading && allAccounts.length > 0 && (
                <div className="flex flex-wrap items-end gap-3 mt-2">
                    <select
                        aria-label="Account"
                        className={inputCls}
                        value={addAccountId}
                        onChange={(e) => setAddAccountId(e.target.value)}
                    >
                        <option value="" disabled>Account…</option>
                        {allAccounts.map((a) => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                    </select>

                    <select
                        aria-label="Tile type"
                        className={inputCls}
                        value={addTileType}
                        onChange={(e) => {
                            setAddTileType(e.target.value as TileType | '');
                            setAddWindowOption('');
                            setAddWeeks('');
                        }}
                    >
                        <option value="" disabled>Tile type…</option>
                        <option value="transactions">Transactions</option>
                        <option value="balance_over_time">Balance over time</option>
                        <option value="totals_by_category">Totals by category</option>
                    </select>

                    {isChartType && (
                        <select
                            aria-label="Time window"
                            className={inputCls}
                            value={addWindowOption}
                            onChange={(e) => {
                                setAddWindowOption(e.target.value);
                                setAddWeeks('');
                            }}
                        >
                            <option value="" disabled>Time window…</option>
                            {WINDOW_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    )}

                    {isChartType && addWindowOption === 'custom_weeks' && (
                        <input
                            type="number"
                            aria-label="Number of weeks"
                            className={`${inputCls} w-24`}
                            placeholder="Weeks"
                            min={1}
                            max={52}
                            value={addWeeks}
                            onChange={(e) => setAddWeeks(e.target.value)}
                        />
                    )}

                    <button
                        className="sid-btn sid-btn-ghost sid-btn-sm"
                        onClick={handleAdd}
                        disabled={!canAdd || addMutation.isPending}
                    >
                        {addMutation.isPending ? 'Adding…' : '+ Add tile'}
                    </button>
                </div>
            )}
        </section>
    );
}
