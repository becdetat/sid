import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import AccountCard from '../components/AccountCard';
import AccountForm from '../components/AccountForm';
import SkeletonCard from '../components/SkeletonCard';
import TransactionForm from '../components/TransactionForm';
import { getDashboard } from '../api/dashboard';
import { createAccount, listAccountsWithBalances } from '../api/accounts';
import { createTransaction, type TransactionPayload } from '../api/transactions';
import { uploadAttachments } from '../api/attachments';
import { formatCents, balanceColor } from '../utils/format';
import type { DashboardAccount } from '../types/dashboard';
import { GearIcon } from '../components/GearIcon';
import { WaveIcon } from '../components/WaveIcon';
import { Page } from '../components/Page';
import PageLink from '../components/PageLink';

type Modal =
    | { type: 'create' }
    | { type: 'add-transaction'; account: DashboardAccount }
    | null;

export default function Dashboard() {
    const queryClient = useQueryClient();
    const [modal, setModal] = useState<Modal>(null);

    const { data: accounts = [], isLoading } = useQuery({
        queryKey: ['dashboard'],
        queryFn: getDashboard,
    });

    const { data: allAccountsWithBalances = [] } = useQuery({
        queryKey: ['accounts-balances'],
        queryFn: listAccountsWithBalances,
    });

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
    const noAccountsInSystem = !isLoading && allAccountsWithBalances.length === 0;
    const accountsExistButNoneConfigured = !isLoading && allAccountsWithBalances.length > 0 && accounts.length === 0;

    return (
        <Page pageTitle="Dashboard" balance={totalBalance}>
            {isLoading && (
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

            {accountsExistButNoneConfigured && (
                <div className="text-center py-[80px]">
                    <p className="text-[var(--text-muted)] text-[15px] mb-5">
                        No accounts are configured for the dashboard.
                    </p>
                    <Link to="/settings?section=dashboard" className="sid-btn sid-btn-primary">
                        Configure dashboard
                    </Link>
                </div>
            )}

            {!isLoading && accounts.length > 0 && (
                <>
                    <PageLink to="/accounts">All accounts → </PageLink>
                    <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(310px,1fr))] gap-5">
                        {accounts.map((account) => (
                            <AccountCard
                                key={account.id}
                                account={account}
                                onAddTransaction={(a) => setModal({ type: 'add-transaction', account: a })}
                            />
                        ))}
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
