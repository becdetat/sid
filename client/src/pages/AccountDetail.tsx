import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getAccount } from '../api/accounts';
import {
    listTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    importTransactions,
    type TransactionPayload,
} from '../api/transactions';
import { downloadImportTemplate } from '../utils/importTemplate';
import { uploadAttachments } from '../api/attachments';
import TransactionRow from '../components/TransactionRow';
import TransactionForm from '../components/TransactionForm';
import ConfirmDialog from '../components/ConfirmDialog';
import ExportDialog from '../components/ExportDialog';
import { formatCents, balanceColor } from '../utils/format';
import type { Transaction } from '../types/transaction';
import { GearIcon } from '../components/GearIcon';
import DashboardLink from '../components/DashboardLink';
import { WaveIcon } from '../components/WaveIcon';

type Modal =
    | { type: 'create' }
    | { type: 'edit'; transaction: Transaction }
    | { type: 'delete'; transaction: Transaction }
    | null;

const TX_GRID = '130px 120px 1fr 90px 120px 72px';

export default function AccountDetail() {
    const { id } = useParams<{ id: string }>();
    const accountId = parseInt(id!, 10);
    const queryClient = useQueryClient();
    const [modal, setModal] = useState<Modal>(null);
    const [showExport, setShowExport] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const importInputRef = useRef<HTMLInputElement>(null);

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

    async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';
        setIsImporting(true);
        try {
            const { imported } = await importTransactions(accountId, file);
            queryClient.invalidateQueries({ queryKey: ['transactions', accountId] });
            toast.success(`${imported} ${imported === 1 ? 'transaction' : 'transactions'} imported.`);
        } catch (err: any) {
            const message = err?.response?.data?.error ?? 'Failed to import transactions.';
            toast.error(message);
        } finally {
            setIsImporting(false);
        }
    }

    if (accountLoading) {
        return <div className="p-12 text-[var(--text-muted)] font-body">Loading…</div>;
    }

    if (!account) {
        return <div className="p-12 text-[var(--red)] font-body">Account not found.</div>;
    }

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
                            {account.name}
                        </h2>
                    </div>
                    <div className="flex items-center gap-5">
                        <span className="text-[13px] text-[var(--text-muted)] font-semibold font-body">
                            Balance
                        </span>
                        <span className="font-display text-xl font-bold" style={{ color: balanceColor(balance) }}>
                            {formatCents(balance)}
                        </span>
                        <Link to="/settings" aria-label="Settings" className="sid-icon-btn">
                            <GearIcon />
                        </Link>
                    </div>
                </div>
                <div className="sid-header-stripe" />
            </header>

            <main className="max-w-[1100px] mx-auto px-8 py-[36px]">
                <DashboardLink />

                {/* Action bar */}
                <div className="flex justify-end gap-2 mb-7">
                    <input
                        ref={importInputRef}
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={handleImport}
                    />
                    <button className="sid-btn sid-btn-ghost sid-btn-sm" onClick={downloadImportTemplate}>
                        Download template
                    </button>
                    <button
                        className="sid-btn sid-btn-ghost sid-btn-sm"
                        onClick={() => importInputRef.current?.click()}
                        disabled={isImporting}
                    >
                        {isImporting ? 'Importing…' : 'Import CSV'}
                    </button>
                    <button className="sid-btn sid-btn-ghost sid-btn-sm" onClick={() => setShowExport(true)}>
                        Export CSV
                    </button>
                    <button className="sid-btn sid-btn-primary sid-btn-sm" onClick={() => setModal({ type: 'create' })}>
                        + New transaction
                    </button>
                </div>

                {txLoading && (
                    <p className="text-sm text-[var(--text-muted)]">Loading…</p>
                )}

                {!txLoading && transactions.length === 0 && (
                    <div className="text-center py-[60px]">
                        <p className="text-[var(--text-muted)] text-sm mb-4">No transactions yet.</p>
                        <button className="sid-btn sid-btn-primary sid-btn-sm" onClick={() => setModal({ type: 'create' })}>
                            Add first transaction
                        </button>
                    </div>
                )}

                {transactions.length > 0 && (
                    <div className="bg-[var(--white)] rounded-2xl [border:1.5px_solid_var(--border)] overflow-hidden shadow-[var(--shadow-sm)]">
                        {/* Table header */}
                        <div
                            className="grid px-5 py-[10px] bg-[var(--cream)] [border-bottom:1.5px_solid_var(--border)]"
                            style={{ gridTemplateColumns: TX_GRID }}
                        >
                            {['Date', 'Category', 'Description', 'Type', 'Amount', ''].map((h, i) => (
                                <div key={i} className={`text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.07em] ${i === 4 ? 'text-right' : 'text-left'}`}>
                                    {h}
                                </div>
                            ))}
                        </div>
                        {/* Rows */}
                        {transactions.map((t, idx) => (
                            <TransactionRow
                                key={t.id}
                                transaction={t}
                                isLast={idx === transactions.length - 1}
                                gridTemplate={TX_GRID}
                                onEdit={(tx) => setModal({ type: 'edit', transaction: tx })}
                                onDelete={(tx) => setModal({ type: 'delete', transaction: tx })}
                            />
                        ))}
                    </div>
                )}
            </main>

            {modal?.type === 'create' && (
                <TransactionForm
                    onSubmit={(data, files) => handleCreate(data, files)}
                    onCancel={() => setModal(null)}
                />
            )}
            {modal?.type === 'edit' && (
                <TransactionForm
                    initial={modal.transaction}
                    onSubmit={(data, files) => handleUpdate(modal.transaction.id, data, files)}
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
