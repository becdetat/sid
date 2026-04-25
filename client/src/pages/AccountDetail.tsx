import { useState, useRef, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
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
    type TransactionFilters,
} from '../api/transactions';
import { getCategories } from '../api/categories';
import { downloadImportTemplate } from '../utils/importTemplate';
import { uploadAttachments } from '../api/attachments';
import TransactionRow from '../components/TransactionRow';
import TransactionForm from '../components/TransactionForm';
import ConfirmDialog from '../components/ConfirmDialog';
import type { Transaction } from '../types/transaction';
import { Page } from '../components/Page';
import PageLink from '../components/PageLink';

type Modal =
    | { type: 'create' }
    | { type: 'edit'; transaction: Transaction }
    | { type: 'delete'; transaction: Transaction }
    | null;

function ActionsDropdown({
    onDownloadTemplate,
    onImportCsv,
    onExportCsv,
    isImporting,
}: {
    onDownloadTemplate: () => void;
    onImportCsv: () => void;
    onExportCsv: () => void;
    isImporting: boolean;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    function pick(fn: () => void) {
        setOpen(false);
        fn();
    }

    return (
        <div ref={ref} className="relative">
            <button
                className="sid-btn sid-btn-ghost sid-btn-sm"
                onClick={() => setOpen((o) => !o)}
                disabled={isImporting}
            >
                {isImporting ? 'Importing…' : 'Actions ▾'}
            </button>
            {open && (
                <div className="absolute right-0 z-10 mt-1 min-w-[170px] rounded-xl bg-[var(--white)] [border:1.5px_solid_var(--border)] shadow-[var(--shadow-md)] py-1">
                    <button
                        className="w-full text-left px-4 py-2 text-sm font-body text-[var(--text)] hover:bg-[var(--cream)] transition-colors"
                        onClick={() => pick(onDownloadTemplate)}
                    >
                        Download template
                    </button>
                    <button
                        className="w-full text-left px-4 py-2 text-sm font-body text-[var(--text)] hover:bg-[var(--cream)] transition-colors"
                        onClick={() => pick(onImportCsv)}
                    >
                        Import CSV
                    </button>
                    <button
                        className="w-full text-left px-4 py-2 text-sm font-body text-[var(--text)] hover:bg-[var(--cream)] transition-colors"
                        onClick={() => pick(onExportCsv)}
                    >
                        Export CSV
                    </button>
                </div>
            )}
        </div>
    );
}

const TX_GRID = '130px 120px 1fr 90px 120px 72px';

export default function AccountDetail() {
    const { id } = useParams<{ id: string }>();
    const accountId = parseInt(id!, 10);
    const location = useLocation();
    const fromAllAccounts = (location.state as any)?.from === 'all-accounts';
    const queryClient = useQueryClient();
    const [modal, setModal] = useState<Modal>(null);
    const [isImporting, setIsImporting] = useState(false);
    const importInputRef = useRef<HTMLInputElement>(null);

    const [keyword, setKeyword] = useState('');
    const [debouncedKeyword, setDebouncedKeyword] = useState('');
    const [filterFrom, setFilterFrom] = useState('');
    const [filterTo, setFilterTo] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterType, setFilterType] = useState<'income' | 'expense' | ''>('');
    const [amountMin, setAmountMin] = useState('');
    const [amountMax, setAmountMax] = useState('');

    useEffect(() => {
        const t = setTimeout(() => setDebouncedKeyword(keyword), 300);
        return () => clearTimeout(t);
    }, [keyword]);

    const activeFilters: TransactionFilters = {
        keyword: debouncedKeyword || undefined,
        from: filterFrom || undefined,
        to: filterTo || undefined,
        category: filterCategory || undefined,
        type: filterType || undefined,
        amountMin: amountMin || undefined,
        amountMax: amountMax || undefined,
    };
    const isFiltered = Object.values(activeFilters).some(Boolean);

    function clearFilters() {
        setKeyword('');
        setDebouncedKeyword('');
        setFilterFrom('');
        setFilterTo('');
        setFilterCategory('');
        setFilterType('');
        setAmountMin('');
        setAmountMax('');
    }

    const { data: account, isLoading: accountLoading } = useQuery({
        queryKey: ['accounts', accountId],
        queryFn: () => getAccount(accountId),
    });

    const { data: transactions = [], isLoading: txLoading } = useQuery({
        queryKey: ['transactions', accountId, activeFilters],
        queryFn: () => listTransactions(accountId, isFiltered ? activeFilters : undefined),
    });

    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: getCategories,
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

    function handleExportCsv() {
        const params = new URLSearchParams();
        if (activeFilters.keyword) params.set('keyword', activeFilters.keyword);
        if (activeFilters.from) params.set('from', activeFilters.from);
        if (activeFilters.to) params.set('to', activeFilters.to);
        if (activeFilters.category) params.set('category', activeFilters.category);
        if (activeFilters.type) params.set('type', activeFilters.type);
        if (activeFilters.amountMin) params.set('amountMin', activeFilters.amountMin);
        if (activeFilters.amountMax) params.set('amountMax', activeFilters.amountMax);
        const qs = params.toString();
        const a = document.createElement('a');
        a.href = `/api/accounts/${accountId}/export${qs ? `?${qs}` : ''}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
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
        <Page 
            pageTitle={account.name} 
            balance={balance} 
        >
            <PageLink to={fromAllAccounts ? '/accounts' : '/dashboard'}>
                &larr; {fromAllAccounts ? 'Back to all accounts' : 'Back to dashboard'}
            </PageLink>

            {/* Action bar */}
            <div className="flex flex-wrap justify-end gap-2 mb-5 sm:mb-7">
                <input
                    ref={importInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleImport}
                />
                <ActionsDropdown
                    onDownloadTemplate={downloadImportTemplate}
                    onImportCsv={() => importInputRef.current?.click()}
                    onExportCsv={handleExportCsv}
                    isImporting={isImporting}
                />
                <button className="sid-btn sid-btn-primary sid-btn-sm" onClick={() => setModal({ type: 'create' })}>
                    + New transaction
                </button>
            </div>

            {/* Filter bar */}
            <div className="mb-5 bg-[var(--white)] rounded-2xl [border:1.5px_solid_var(--border)] p-4 shadow-[var(--shadow-sm)]">
                <div className="flex flex-wrap gap-3 items-end">
                    <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.07em]">Search</label>
                        <input
                            type="text"
                            className="sid-input"
                            placeholder="Description or notes…"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.07em]">From</label>
                        <input
                            type="date"
                            className="sid-input"
                            value={filterFrom}
                            onChange={(e) => setFilterFrom(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.07em]">To</label>
                        <input
                            type="date"
                            className="sid-input"
                            value={filterTo}
                            onChange={(e) => setFilterTo(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.07em]">Category</label>
                        <select
                            className="sid-input"
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                        >
                            <option value="">All</option>
                            {categories.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.07em]">Type</label>
                        <select
                            className="sid-input"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value as 'income' | 'expense' | '')}
                        >
                            <option value="">All</option>
                            <option value="income">Income</option>
                            <option value="expense">Expense</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.07em]">Amount</label>
                        <div className="flex items-center gap-1">
                            <input
                                type="number"
                                className="sid-input w-24"
                                placeholder="Min"
                                min="0"
                                value={amountMin}
                                onChange={(e) => setAmountMin(e.target.value)}
                            />
                            <span className="text-[var(--text-muted)] text-sm">–</span>
                            <input
                                type="number"
                                className="sid-input w-24"
                                placeholder="Max"
                                min="0"
                                value={amountMax}
                                onChange={(e) => setAmountMax(e.target.value)}
                            />
                        </div>
                    </div>
                    {isFiltered && (
                        <button
                            className="sid-btn sid-btn-ghost sid-btn-sm self-end"
                            onClick={clearFilters}
                        >
                            Clear filters
                        </button>
                    )}
                </div>
            </div>

            {txLoading && (
                <p className="text-sm text-[var(--text-muted)]">Loading…</p>
            )}

            {!txLoading && transactions.length === 0 && (
                <div className="text-center py-[60px]">
                    {isFiltered ? (
                        <>
                            <p className="text-[var(--text-muted)] text-sm mb-4">No transactions match your filters.</p>
                            <button className="sid-btn sid-btn-ghost sid-btn-sm" onClick={clearFilters}>
                                Clear filters
                            </button>
                        </>
                    ) : (
                        <>
                            <p className="text-[var(--text-muted)] text-sm mb-4">No transactions yet.</p>
                            <button className="sid-btn sid-btn-primary sid-btn-sm" onClick={() => setModal({ type: 'create' })}>
                                Add first transaction
                            </button>
                        </>
                    )}
                </div>
            )}

            {transactions.length > 0 && (
                <div className="bg-[var(--white)] rounded-2xl [border:1.5px_solid_var(--border)] overflow-hidden shadow-[var(--shadow-sm)]">
                    {/* Table header */}
                    <div
                        className="hidden sm:grid px-5 py-[10px] bg-[var(--cream)] [border-bottom:1.5px_solid_var(--border)]"
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
            {modal?.type === 'delete' && (
                <ConfirmDialog
                    message={`Delete "${modal.transaction.description}"? This will also delete any attachments.`}
                    onConfirm={() => deleteMutation.mutate(modal.transaction.id)}
                    onCancel={() => setModal(null)}
                />
            )}
        </Page>
    );
}
