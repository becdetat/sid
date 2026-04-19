import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

type Modal =
    | { type: 'create' }
    | { type: 'edit'; transaction: Transaction }
    | { type: 'delete'; transaction: Transaction }
    | null;

const TX_GRID = '130px 120px 1fr 90px 120px 72px';

export default function AccountDetail() {
    const { id } = useParams<{ id: string }>();
    const accountId = parseInt(id!, 10);
    const navigate = useNavigate();
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
        return <div style={{ padding: '48px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>Loading…</div>;
    }

    if (!account) {
        return <div style={{ padding: '48px', color: 'var(--red)', fontFamily: 'var(--font-body)' }}>Account not found.</div>;
    }

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
                <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 32px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                        <button
                            onClick={() => navigate('/dashboard')}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--teak)', fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            ← Accounts
                        </button>
                        <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />
                        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, color: 'var(--teak-dark)' }}>
                            {account.name}
                        </h1>
                    </div>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, color: balanceColor(balance) }}>
                        {formatCents(balance)}
                    </span>
                </div>
                <div className="sid-header-stripe" />
            </header>

            <main style={{ maxWidth: '900px', margin: '0 auto', padding: '36px 32px' }}>
                {/* Action bar */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '28px' }}>
                    <input
                        ref={importInputRef}
                        type="file"
                        accept=".csv"
                        style={{ display: 'none' }}
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
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Loading…</p>
                )}

                {!txLoading && transactions.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '60px 0' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>No transactions yet.</p>
                        <button className="sid-btn sid-btn-primary sid-btn-sm" onClick={() => setModal({ type: 'create' })}>
                            Add first transaction
                        </button>
                    </div>
                )}

                {transactions.length > 0 && (
                    <div style={{ background: 'var(--white)', borderRadius: '16px', border: '1.5px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                        {/* Table header */}
                        <div style={{ display: 'grid', gridTemplateColumns: TX_GRID, padding: '10px 20px', background: 'var(--cream)', borderBottom: '1.5px solid var(--border)' }}>
                            {['Date', 'Category', 'Description', 'Type', 'Amount', ''].map((h, i) => (
                                <div key={i} style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: i === 4 ? 'right' : 'left' as any }}>
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
