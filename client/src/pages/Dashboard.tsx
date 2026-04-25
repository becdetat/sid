import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import AccountTile from '../components/AccountTile';
import BalanceChartTile from '../components/BalanceChartTile';
import CategoryChartTile from '../components/CategoryChartTile';
import AccountForm from '../components/AccountForm';
import SkeletonCard from '../components/SkeletonCard';
import TransactionForm from '../components/TransactionForm';
import { getDashboard } from '../api/dashboard';
import { getDashboardConfig } from '../api/dashboardConfig';
import { createAccount, listAccountsWithBalances } from '../api/accounts';
import { createTransaction, type TransactionPayload } from '../api/transactions';
import { uploadAttachments } from '../api/attachments';
import { Page } from '../components/Page';
import PageLink from '../components/PageLink';
import type { DashboardAccount } from '../types/dashboard';

type Modal =
    | { type: 'create' }
    | { type: 'add-transaction'; account: DashboardAccount }
    | null;

export default function Dashboard() {
    const queryClient = useQueryClient();
    const [modal, setModal] = useState<Modal>(null);

    const { data: tileConfig = [], isLoading: configLoading } = useQuery({
        queryKey: ['dashboard-config'],
        queryFn: getDashboardConfig,
    });

    const { data: dashboardAccounts = [] } = useQuery({
        queryKey: ['dashboard'],
        queryFn: getDashboard,
    });

    const { data: allAccountsWithBalances = [] } = useQuery({
        queryKey: ['accounts-balances'],
        queryFn: listAccountsWithBalances,
    });

    const accountMap = new Map(dashboardAccounts.map((a) => [a.id, a]));

    const createMutation = useMutation({
        mutationFn: (name: string) => createAccount(name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['accounts-balances'] });
            setModal(null);
            toast.success('Account created.');
        },
        onError: () => toast.error('Failed to create account.'),
    });

    const addTransactionMutation = useMutation({
        mutationFn: ({ accountId, data }: { accountId: number; data: TransactionPayload }) =>
            createTransaction(accountId, data),
        onError: () => toast.error('Failed to add transaction.'),
    });

    async function handleAddTransaction(data: TransactionPayload, pendingFiles: File[]) {
        if (modal?.type !== 'add-transaction') return;
        const tx = await addTransactionMutation.mutateAsync({ accountId: modal.account.id, data });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['accounts-balances'] });
        if (pendingFiles.length > 0) {
            try {
                await uploadAttachments(tx.id, pendingFiles);
            } catch {
                setModal(null);
                toast.warning('Transaction saved, but some attachments failed to upload.');
                return;
            }
        }
        setModal(null);
        toast.success('Transaction added.');
    }

    const totalBalance = allAccountsWithBalances.reduce((s, a) => s + a.balance_cents, 0);
    const noAccountsInSystem = !configLoading && allAccountsWithBalances.length === 0;
    const tilesExistButNoneConfigured = !configLoading && allAccountsWithBalances.length > 0 && tileConfig.length === 0;

    return (
        <Page pageTitle="Dashboard" balance={totalBalance}>
            {configLoading && (
                <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(310px,1fr))] gap-5">
                    {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
                </div>
            )}

            {noAccountsInSystem && (
                <div className="text-center py-[80px]">
                    <p className="text-[var(--text-muted)] text-[15px] mb-5">
                        No accounts yet. Get started by adding one.
                    </p>
                    <button className="sid-btn sid-btn-primary" onClick={() => setModal({ type: 'create' })}>
                        Create your first account
                    </button>
                </div>
            )}

            {tilesExistButNoneConfigured && (
                <div className="text-center py-[80px]">
                    <p className="text-[var(--text-muted)] text-[15px] mb-5">
                        No tiles are configured for the dashboard.
                    </p>
                    <Link to="/settings?section=dashboard" className="sid-btn sid-btn-primary">
                        Configure dashboard
                    </Link>
                </div>
            )}

            {!configLoading && tileConfig.length > 0 && (
                <>
                    <PageLink to="/accounts">All accounts → </PageLink>
                    <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(310px,1fr))] gap-5">
                        {tileConfig.map((tile) => {
                            if (tile.tile_type === 'transactions') {
                                const account = accountMap.get(tile.account_id);
                                if (!account) return null;
                                return (
                                    <AccountTile
                                        key={tile.id}
                                        account={account}
                                        onAddTransaction={(a) => setModal({ type: 'add-transaction', account: a })}
                                    />
                                );
                            }
                            if (tile.tile_type === 'balance_over_time') {
                                const account = allAccountsWithBalances.find((a) => a.id === tile.account_id);
                                return (
                                    <BalanceChartTile
                                        key={tile.id}
                                        accountId={tile.account_id}
                                        accountName={account?.name ?? `Account ${tile.account_id}`}
                                        window={tile.time_window ?? '30d'}
                                    />
                                );
                            }
                            if (tile.tile_type === 'totals_by_category') {
                                const account = allAccountsWithBalances.find((a) => a.id === tile.account_id);
                                return (
                                    <CategoryChartTile
                                        key={tile.id}
                                        accountId={tile.account_id}
                                        accountName={account?.name ?? `Account ${tile.account_id}`}
                                        window={tile.time_window ?? '30d'}
                                    />
                                );
                            }
                            return null;
                        })}
                    </div>
                </>
            )}

            {modal?.type === 'create' && (
                <AccountForm
                    title="New account"
                    onSubmit={(name) => createMutation.mutate(name)}
                    onCancel={() => setModal(null)}
                />
            )}
            {modal?.type === 'add-transaction' && (
                <TransactionForm
                    onSubmit={handleAddTransaction}
                    onCancel={() => setModal(null)}
                />
            )}
        </Page>
    );
}
