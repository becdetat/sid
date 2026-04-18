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
import type { DashboardAccount } from '../types/dashboard';

type Modal =
    | { type: 'create' }
    | { type: 'edit'; account: DashboardAccount }
    | { type: 'delete'; account: DashboardAccount }
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

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Sid</h1>
                <button
                    onClick={() => setModal({ type: 'create' })}
                    className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                    New account
                </button>
            </div>

            {isLoading && (
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <SkeletonCard key={i} />
                    ))}
                </div>
            )}

            {!isLoading && accounts.length === 0 && (
                <div className="flex flex-col items-center gap-4 py-16 text-center">
                    <p className="text-gray-500">No accounts yet.</p>
                    <button
                        onClick={() => setModal({ type: 'create' })}
                        className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
                    >
                        Create your first account
                    </button>
                </div>
            )}

            {!isLoading && accounts.length > 0 && (
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
