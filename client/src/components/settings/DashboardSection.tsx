import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getDashboardConfig, addToDashboard, removeFromDashboard, reorderDashboard } from '../../api/dashboardConfig';
import { listAccounts } from '../../api/accounts';
import type { DashboardConfigItem } from '../../api/dashboardConfig';

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

export default function DashboardSection() {
    const queryClient = useQueryClient();

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
        mutationFn: (accountId: number) => removeFromDashboard(accountId),
        onSuccess: invalidate,
        onError: () => toast.error('Failed to remove account from dashboard.'),
    });

    const addMutation = useMutation({
        mutationFn: (accountId: number) => addToDashboard(accountId),
        onSuccess: invalidate,
        onError: () => toast.error('Failed to add account to dashboard.'),
    });

    function move(index: number, direction: 'up' | 'down') {
        const newConfig = [...config];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        [newConfig[index], newConfig[swapIndex]] = [newConfig[swapIndex], newConfig[index]];
        reorderMutation.mutate(newConfig.map((item) => item.account_id));
    }

    const configuredIds = new Set(config.map((item: DashboardConfigItem) => item.account_id));
    const unconfiguredAccounts = allAccounts.filter((a) => !configuredIds.has(a.id));

    return (
        <section>
            <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-[22px] font-bold text-[var(--teak-dark)] m-0">
                    Dashboard
                </h2>
            </div>

            <p className="text-[13px] text-[var(--text-muted)] mb-5">
                Choose which accounts appear on the dashboard and in what order.
            </p>

            {configLoading && (
                <p className="text-[var(--text-muted)] text-sm">Loading…</p>
            )}

            {!configLoading && config.length === 0 && (
                <div className="text-center py-[60px]">
                    <p className="text-[var(--text-muted)] text-[15px] mb-5">
                        No accounts are configured for the dashboard.
                    </p>
                </div>
            )}

            {!configLoading && config.length > 0 && (
                <table className="w-full border-collapse mb-4">
                    <thead>
                        <tr className="[border-bottom:1.5px_solid_var(--border)]">
                            <th className="text-left px-3 pt-2 pb-[10px] text-[11px] font-bold tracking-[0.06em] text-[var(--text-muted)] uppercase font-body">
                                Account
                            </th>
                            <th className="w-[100px]" />
                        </tr>
                    </thead>
                    <tbody>
                        {config.map((item, index) => {
                            const account = allAccounts.find((a) => a.id === item.account_id);
                            const name = account?.name ?? `Account ${item.account_id}`;
                            return (
                                <tr key={item.id} className="border-b border-[var(--cream-mid)]">
                                    <td className="p-3 text-sm font-semibold text-[var(--text-primary)] font-body">
                                        {name}
                                    </td>
                                    <td className="p-3 pl-0">
                                        <div className="flex gap-0.5 justify-end">
                                            <button
                                                aria-label={`Move ${name} up`}
                                                className="sid-icon-btn"
                                                onClick={() => move(index, 'up')}
                                                disabled={index === 0}
                                                title="Move up"
                                            >
                                                <ChevronUpIcon />
                                            </button>
                                            <button
                                                aria-label={`Move ${name} down`}
                                                className="sid-icon-btn"
                                                onClick={() => move(index, 'down')}
                                                disabled={index === config.length - 1}
                                                title="Move down"
                                            >
                                                <ChevronDownIcon />
                                            </button>
                                            <button
                                                aria-label={`Remove ${name} from dashboard`}
                                                className="sid-icon-btn danger"
                                                onClick={() => removeMutation.mutate(item.account_id)}
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

            {!configLoading && unconfiguredAccounts.length > 0 && (
                <div className="flex items-center gap-3">
                    <select
                        className="font-body text-[14px] border-[1.5px] border-[var(--border)] rounded-[var(--radius-input)] px-3 py-[9px] bg-[var(--white)] text-[var(--text-primary)] cursor-pointer"
                        value=""
                        onChange={(e) => {
                            const id = parseInt(e.target.value, 10);
                            if (id) addMutation.mutate(id);
                        }}
                    >
                        <option value="" disabled>+ Add account…</option>
                        {unconfiguredAccounts.map((a) => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                    </select>
                </div>
            )}
        </section>
    );
}
