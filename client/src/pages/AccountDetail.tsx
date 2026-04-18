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
import TransactionRow from '../components/TransactionRow';
import TransactionForm from '../components/TransactionForm';
import ConfirmDialog from '../components/ConfirmDialog';
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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions', accountId] });
            setModal(null);
            toast.success('Transaction added.');
        },
        onError: () => toast.error('Failed to add transaction.'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id: txId, data }: { id: number; data: TransactionPayload }) =>
            updateTransaction(accountId, txId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions', accountId] });
            setModal(null);
            toast.success('Transaction updated.');
        },
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

            <div className="flex justify-end mb-4">
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
                    onSubmit={(data) => createMutation.mutate(data)}
                    onCancel={() => setModal(null)}
                />
            )}

            {modal?.type === 'edit' && (
                <TransactionForm
                    initial={modal.transaction}
                    onSubmit={(data) =>
                        updateMutation.mutate({ id: modal.transaction.id, data })
                    }
                    onCancel={() => setModal(null)}
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
