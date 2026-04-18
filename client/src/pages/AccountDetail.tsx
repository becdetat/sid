import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getAccount } from '../api/accounts';
import {
    listTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    type TransactionPayload,
} from '../api/transactions';
import { uploadAttachments } from '../api/attachments';
import TransactionRow from '../components/TransactionRow';
import TransactionForm from '../components/TransactionForm';
import ConfirmDialog from '../components/ConfirmDialog';
import ExportDialog from '../components/ExportDialog';
import { formatCents } from '../utils/format';
import type { Transaction } from '../types/transaction';

type Modal =
    | { type: 'create' }
    | { type: 'edit'; transaction: Transaction }
    | { type: 'delete'; transaction: Transaction }
    | null;

export default function AccountDetail() {
    const { id } = useParams<{ id: string }>();
    const accountId = parseInt(id!, 10);
    const queryClient = useQueryClient();
    const [modal, setModal] = useState<Modal>(null);
    const [showExport, setShowExport] = useState(false);

    const { data: account, isLoading: accountLoading } = useQuery({
        queryKey: ['accounts', accountId],
        queryFn: () => getAccount(accountId),
    });

    const { data: transactions = [], isLoading: txLoading } = useQuery({
        queryKey: ['transactions', accountId],
        queryFn: () => listTransactions(accountId),
    });

    const balance = transactions.reduce((sum, t) => sum + t.amount_cents, 0);

    const createMutation = useMutation({
        mutationFn: (data: TransactionPayload) => createTransaction(accountId, data),
        onError: () => toast.error('Failed to add transaction.'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id: txId, data }: { id: number; data: TransactionPayload }) =>
            updateTransaction(accountId, txId, data),
        onError: () => toast.error('Failed to update transaction.'),
    });

    const deleteMutation = useMutation({
        mutationFn: (txId: number) => deleteTransaction(accountId, txId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions', accountId] });
            setModal(null);
            toast.success('Transaction deleted.');
        },
        onError: () => toast.error('Failed to delete transaction.'),
    });

    async function handleCreate(data: TransactionPayload, pendingFiles: File[]) {
        const tx = await createMutation.mutateAsync(data);
        queryClient.invalidateQueries({ queryKey: ['transactions', accountId] });
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

    async function handleUpdate(txId: number, data: TransactionPayload, pendingFiles: File[]) {
        await updateMutation.mutateAsync({ id: txId, data });
        queryClient.invalidateQueries({ queryKey: ['transactions', accountId] });
        if (pendingFiles.length > 0) {
            try {
                await uploadAttachments(txId, pendingFiles);
                queryClient.invalidateQueries({ queryKey: ['attachments', txId] });
            } catch {
                setModal(null);
                toast.warning('Transaction saved, but some attachments failed to upload.');
                return;
            }
        }
        setModal(null);
        toast.success('Transaction updated.');
    }

    if (accountLoading) {
        return <div className="p-8 text-sm text-gray-400">Loading…</div>;
    }

    if (!account) {
        return <div className="p-8 text-sm text-red-500">Account not found.</div>;
    }

    return (
        <div className="p-8 max-w-3xl mx-auto">
            <div className="mb-6">
                <Link to="/dashboard" className="text-sm text-blue-600 hover:underline">
                    ← Accounts
                </Link>
                <div className="flex items-center justify-between mt-2">
                    <h1 className="text-2xl font-bold">{account.name}</h1>
                    <span
                        className={`text-lg font-semibold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                        {formatCents(balance)}
                    </span>
                </div>
            </div>

            <div className="flex justify-end gap-2 mb-4">
                <button
                    onClick={() => setShowExport(true)}
                    className="px-4 py-2 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                    Export CSV
                </button>
                <button
                    onClick={() => setModal({ type: 'create' })}
                    className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                    New transaction
                </button>
            </div>

            {txLoading && <p className="text-sm text-gray-400">Loading…</p>}

            {!txLoading && transactions.length === 0 && (
                <p className="text-sm text-gray-400">No transactions yet.</p>
            )}

            {transactions.length > 0 && (
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-200 text-left">
                            <th className="pb-2 pr-4 text-xs font-medium text-gray-500">Date</th>
                            <th className="pb-2 pr-4 text-xs font-medium text-gray-500">
                                Description
                            </th>
                            <th className="pb-2 pr-4 text-xs font-medium text-gray-500">Type</th>
                            <th className="pb-2 pr-4 text-xs font-medium text-gray-500 text-right">
                                Amount
                            </th>
                            <th className="pb-2" />
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map((t) => (
                            <TransactionRow
                                key={t.id}
                                transaction={t}
                                onEdit={(tx) => setModal({ type: 'edit', transaction: tx })}
                                onDelete={(tx) => setModal({ type: 'delete', transaction: tx })}
                            />
                        ))}
                    </tbody>
                </table>
            )}

            {modal?.type === 'create' && (
                <TransactionForm
                    onSubmit={(data, files) => handleCreate(data, files)}
                    onCancel={() => setModal(null)}
                />
            )}

            {modal?.type === 'edit' && (
                <TransactionForm
                    initial={modal.transaction}
                    onSubmit={(data, files) =>
                        handleUpdate(modal.transaction.id, data, files)
                    }
                    onCancel={() => setModal(null)}
                />
            )}

            {showExport && (
                <ExportDialog
                    accountId={accountId}
                    accountName={account.name}
                    defaultFrom={transactions.at(-1)?.date ?? ''}
                    defaultTo={new Date().toISOString().slice(0, 10)}
                    onCancel={() => setShowExport(false)}
                />
            )}

            {modal?.type === 'delete' && (
                <ConfirmDialog
                    message={`Delete "${modal.transaction.description}"? This will also delete any attachments.`}
                    onConfirm={() => deleteMutation.mutate(modal.transaction.id)}
                    onCancel={() => setModal(null)}
                />
            )}
        </div>
    );
}
