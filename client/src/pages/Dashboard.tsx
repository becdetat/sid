import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import AccountCard from '../components/AccountCard';
import AccountForm from '../components/AccountForm';
import ConfirmDialog from '../components/ConfirmDialog';
import SkeletonCard from '../components/SkeletonCard';
import TransactionForm from '../components/TransactionForm';
import { getDashboard } from '../api/dashboard';
import { createAccount, updateAccount, deleteAccount } from '../api/accounts';
import { createTransaction, type TransactionPayload } from '../api/transactions';
import { uploadAttachments } from '../api/attachments';
import { formatCents, balanceColor } from '../utils/format';
import type { DashboardAccount } from '../types/dashboard';

type Modal =
    | { type: 'create' }
    | { type: 'edit'; account: DashboardAccount }
    | { type: 'delete'; account: DashboardAccount }
    | { type: 'add-transaction'; account: DashboardAccount }
    | null;

const WaveIcon = () => (
    <svg width="32" height="14" viewBox="0 0 32 14" fill="none" style={{ opacity: 0.45 }}>
        <path d="M0 7 Q4 2 8 7 Q12 12 16 7 Q20 2 24 7 Q28 12 32 7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
);

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

    const updateMutation = useMutation({
        mutationFn: ({ id, name }: { id: number; name: string }) => updateAccount(id, name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            setModal(null);
            toast.success('Account renamed.');
        },
        onError: () => toast.error('Failed to rename account.'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => deleteAccount(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            setModal(null);
            toast.success('Account deleted.');
        },
        onError: () => toast.error('Failed to delete account.'),
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
        <div style={{ minHeight: '100vh' }}>
            {/* Nav */}
            <header style={{
                background: 'var(--white)',
                borderBottom: '1.5px solid var(--border)',
                boxShadow: '0 1px 0 var(--cream-dark)',
                position: 'sticky',
                top: 0,
                zIndex: 100,
            }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 32px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 700, color: 'var(--teak-dark)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                            Sid
                        </h1>
                        <WaveIcon />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            Net:{' '}
                            <span style={{ color: balanceColor(totalBalance), fontFamily: 'var(--font-display)' }}>
                                {formatCents(totalBalance)}
                            </span>
                        </span>
                        <button className="sid-btn sid-btn-primary" onClick={() => setModal({ type: 'create' })}>
                            + New account
                        </button>
                    </div>
                </div>
                <div className="sid-header-stripe" />
            </header>

            <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '36px 32px' }}>
                {isLoading && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '20px' }}>
                        {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
                    </div>
                )}

                {!isLoading && accounts.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '80px 0' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>⚓</div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginBottom: '20px' }}>
                            No accounts yet. Cast your first line.
                        </p>
                        <button className="sid-btn sid-btn-primary" onClick={() => setModal({ type: 'create' })}>
                            Create your first account
                        </button>
                    </div>
                )}

                {!isLoading && accounts.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '20px' }}>
                        {accounts.map((account) => (
                            <AccountCard
                                key={account.id}
                                account={account}
                                onEdit={(a) => setModal({ type: 'edit', account: a })}
                                onDelete={(a) => setModal({ type: 'delete', account: a })}
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
            {modal?.type === 'edit' && (
                <AccountForm
                    title="Rename account"
                    initialName={modal.account.name}
                    onSubmit={(name) => updateMutation.mutate({ id: modal.account.id, name })}
                    onCancel={() => setModal(null)}
                />
            )}
            {modal?.type === 'delete' && (
                <ConfirmDialog
                    message={`Delete "${modal.account.name}"? This will also delete all transactions and attachments.`}
                    onConfirm={() => deleteMutation.mutate(modal.account.id)}
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
