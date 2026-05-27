import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
    searchAllTransactions,
    type TransactionFilters,
    type TransactionWithAccount,
} from '../api/transactions';
import { getCategories } from '../api/categories';
import { Page } from '../components/Page';
import { formatCents, formatDate, balanceColor } from '../utils/format';

export default function Search() {
    const [keyword, setKeyword] = useState('');
    const [debouncedKeyword, setDebouncedKeyword] = useState('');
    const [filterFrom, setFilterFrom] = useState('');
    const [filterTo, setFilterTo] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterType, setFilterType] = useState<'income' | 'expense' | ''>('');
    const [amountMin, setAmountMin] = useState('');
    const [amountMax, setAmountMax] = useState('');
    const [filterHasAttachment, setFilterHasAttachment] = useState<'yes' | 'no' | ''>('');
    const [filterRecurringOnly, setFilterRecurringOnly] = useState(false);

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
        hasAttachment: filterHasAttachment || undefined,
        recurringOnly: filterRecurringOnly || undefined,
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
        setFilterHasAttachment('');
        setFilterRecurringOnly(false);
    }

    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: getCategories,
    });

    const { data: results = [], isLoading } = useQuery({
        queryKey: ['search-transactions', activeFilters],
        queryFn: () => searchAllTransactions(isFiltered ? activeFilters : undefined),
        enabled: isFiltered,
    });

    const grouped = useMemo(() => {
        const map = new Map<number, { name: string; rows: TransactionWithAccount[] }>();
        for (const t of results) {
            const existing = map.get(t.account_id);
            if (existing) existing.rows.push(t);
            else map.set(t.account_id, { name: t.account_name, rows: [t] });
        }
        return Array.from(map.entries())
            .map(([accountId, { name, rows }]) => ({ accountId, name, rows }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [results]);

    return (
        <Page pageTitle="Search">
            <div className="mb-5 bg-[var(--white)] rounded-2xl [border:1.5px_solid_var(--border)] shadow-[var(--shadow-sm)] overflow-hidden">
                <div className="px-4 pb-4 pt-4">
                    <div className="flex flex-wrap gap-3 items-end">
                        <div className="flex flex-col gap-1 flex-1 min-w-[220px]">
                            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.07em]">Search</label>
                            <input
                                type="text"
                                className="sid-input"
                                placeholder="Description, notes or category…"
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.07em]">From</label>
                            <input type="date" className="sid-input" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.07em]">To</label>
                            <input type="date" className="sid-input" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.07em]">Category</label>
                            <select className="sid-input" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
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
                                <input type="number" className="sid-input w-24" placeholder="Min" min="0" value={amountMin} onChange={(e) => setAmountMin(e.target.value)} />
                                <span className="text-[var(--text-muted)] text-sm">–</span>
                                <input type="number" className="sid-input w-24" placeholder="Max" min="0" value={amountMax} onChange={(e) => setAmountMax(e.target.value)} />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.07em]">Attachment</label>
                            <select
                                className="sid-input"
                                value={filterHasAttachment}
                                onChange={(e) => setFilterHasAttachment(e.target.value as 'yes' | 'no' | '')}
                            >
                                <option value="">Any</option>
                                <option value="yes">Has attachment</option>
                                <option value="no">No attachment</option>
                            </select>
                        </div>
                        <label className="flex items-center gap-2 self-end pb-[6px] text-xs font-body text-[var(--text)] cursor-pointer">
                            <input
                                type="checkbox"
                                checked={filterRecurringOnly}
                                onChange={(e) => setFilterRecurringOnly(e.target.checked)}
                                className="w-4 h-4 cursor-pointer accent-[var(--teak)]"
                            />
                            Recurring only
                        </label>
                        {isFiltered && (
                            <button className="sid-btn sid-btn-ghost sid-btn-sm self-end" onClick={clearFilters}>
                                Clear filters
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {!isFiltered && (
                <div className="text-center py-[60px] text-[var(--text-muted)] text-sm">
                    Enter search criteria to find transactions across all accounts.
                </div>
            )}

            {isFiltered && isLoading && (
                <p className="text-sm text-[var(--text-muted)]">Searching…</p>
            )}

            {isFiltered && !isLoading && results.length === 0 && (
                <div className="text-center py-[60px] text-[var(--text-muted)] text-sm">No matches.</div>
            )}

            {isFiltered && !isLoading && grouped.length > 0 && (
                <div className="space-y-5">
                    {grouped.map((g) => (
                        <div key={g.accountId} className="bg-[var(--white)] rounded-2xl [border:1.5px_solid_var(--border)] overflow-hidden shadow-[var(--shadow-sm)]">
                            <div className="px-5 py-[10px] bg-[var(--cream)] [border-bottom:1.5px_solid_var(--border)] flex items-center justify-between">
                                <Link
                                    to={`/accounts/${g.accountId}`}
                                    className="font-display text-sm font-bold text-[var(--teak-dark)] hover:underline"
                                >
                                    {g.name}
                                </Link>
                                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.07em]">
                                    {g.rows.length} {g.rows.length === 1 ? 'match' : 'matches'}
                                </span>
                            </div>
                            {g.rows.map((t, idx) => (
                                <Link
                                    key={t.id}
                                    to={`/accounts/${g.accountId}?expand=${t.id}`}
                                    className="block px-5 py-3 hover:bg-[var(--cream)] transition-colors"
                                    style={{ borderBottom: idx === g.rows.length - 1 ? 'none' : '1px solid var(--cream-mid)' }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="text-xs text-[var(--text-muted)] font-body w-[90px] shrink-0">
                                            {formatDate(t.date)}
                                        </div>
                                        <div className="text-xs text-[var(--text-muted)] font-body w-[110px] shrink-0 truncate">
                                            {t.category ?? '—'}
                                        </div>
                                        <div className="flex-1 text-sm font-body text-[var(--text)] truncate">
                                            {t.description}
                                        </div>
                                        <div
                                            className="text-sm font-display font-bold tabular-nums shrink-0"
                                            style={{ color: balanceColor(t.amount_cents) }}
                                        >
                                            {formatCents(t.amount_cents)}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </Page>
    );
}
