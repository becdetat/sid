import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import AccountCard from '../components/AccountCard';
import AccountForm from '../components/AccountForm';
import ConfirmDialog from '../components/ConfirmDialog';
import { listAccounts, createAccount, updateAccount, deleteAccount } from '../api/accounts';
import type { Account } from '../types/account';

type Modal =
    | { type: 'create' }
    | { type: 'edit'; account: Account }
    | { type: 'delete'; account: Account }
    | null;

export default function Dashboard() {
    const queryClient = useQueryClient();
    const [modal, setModal] = useState<Modal>(null);

    const { data: accounts = [], isLoading } = useQuery({
        queryKey: ['accounts'],
        queryFn: listAccounts,
    });

    const createMutation = useMutation({
        mutationFn: (name: string) => createAccount(name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            setModal(null);
            toast.success('Account created.');
        },
        onError: () => toast.error('Failed to create account.'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, name }: { id: number; name: string }) => updateAccount(id, name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            setModal(null);
            toast.success('Account renamed.');
        },
        onError: () => toast.error('Failed to rename account.'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => deleteAccount(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            setModal(null);
            toast.success('Account deleted.');
        },
        onError: () => toast.error('Failed to delete account.'),
    });

    return (
        <div className="p-8 max-w-xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Accounts</h1>
                <button
                    onClick={() => setModal({ type: 'create' })}
                    className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                    New account
                </button>
            </div>

            {isLoading && <p className="text-sm text-gray-400">Loading…</p>}

            {!isLoading && accounts.length === 0 && (
                <p className="text-sm text-gray-400">No accounts yet. Create one to get started.</p>
            )}

            <div className="flex flex-col gap-2">
                {accounts.map((account) => (
                    <AccountCard
                        key={account.id}
                        account={account}
                        onEdit={(a) => setModal({ type: 'edit', account: a })}
                        onDelete={(a) => setModal({ type: 'delete', account: a })}
                    />
                ))}
            </div>

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
        </div>
    );
}
