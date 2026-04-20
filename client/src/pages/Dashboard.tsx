import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import AccountCard from '../components/AccountCard';
import AccountForm from '../components/AccountForm';
import SkeletonCard from '../components/SkeletonCard';
import TransactionForm from '../components/TransactionForm';
import { getDashboard } from '../api/dashboard';
import { createAccount } from '../api/accounts';
import { createTransaction, type TransactionPayload } from '../api/transactions';
import { uploadAttachments } from '../api/attachments';
import { formatCents, balanceColor } from '../utils/format';
import type { DashboardAccount } from '../types/dashboard';
import { GearIcon } from '../components/GearIcon';
import { WaveIcon } from '../components/WaveIcon';

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

    const createMutation = useMutation({
        mutationFn: (name: string) => createAccount(name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
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

    const totalBalance = accounts.reduce((s, a) => s + a.balance_cents, 0);

    return (
        <div className="min-h-screen">
            {/* Nav */}
            <header className="bg-[var(--white)] [border-bottom:1.5px_solid_var(--border)] shadow-[0_1px_0_var(--cream-dark)] sticky top-0 z-[100]">
                <div className="max-w-[1100px] mx-auto px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h1 className="font-display text-[26px] font-bold text-[var(--teak-dark)] tracking-[-0.02em] leading-none">
                            <a href="/">Sid</a>
                        </h1>
                        <WaveIcon />
                        <h2 className="font-display text-xl font-bold text-[var(--teak-dark)] m-0">
                            Dashboard
                        </h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-[13px] text-[var(--text-muted)] font-semibold font-body">
                            Net
                        </span>
                        <span className="font-display text-xl font-bold" style={{ color: balanceColor(totalBalance) }}>
                            {formatCents(totalBalance)}
                        </span>
                        <Link to="/settings" aria-label="Settings" className="sid-icon-btn">
                            <GearIcon />
                        </Link>
                    </div>
                </div>
                <div className="sid-header-stripe" />
            </header>

            <main className="max-w-[1100px] mx-auto px-8 py-[36px]">
                {isLoading && (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(310px,1fr))] gap-5">
                        {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
                    </div>
                )}

                {!isLoading && accounts.length === 0 && (
                    <div className="text-center py-[80px]">
                        <p className="text-[var(--text-muted)] text-[15px] mb-5">
                            No accounts yet. Get started by adding one.
                        </p>
                        <button className="sid-btn sid-btn-primary" onClick={() => setModal({ type: 'create' })}>
                            Create your first account
                        </button>
                    </div>
                )}

                {!isLoading && accounts.length > 0 && (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(310px,1fr))] gap-5">
                        {accounts.map((account) => (
                            <AccountCard
                                key={account.id}
                                account={account}
                                onAddTransaction={(a) => setModal({ type: 'add-transaction', account: a })}
                            />
                        ))}
                    </div>
                )}
            </main>

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
        </div>
    );
}
