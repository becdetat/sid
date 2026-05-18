import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Transaction, RecurrenceFrequency } from '../types/transaction';
import { getCategories } from '../api/categories';
import AttachmentManager from './AttachmentManager';
import ConfirmDialog from './ConfirmDialog';
import { formatDateTime } from '../utils/format';

interface TransactionData {
    category: string;
    description?: string;
    amount: number;
    type: 'income' | 'expense';
    date: string;
    notes: string | null;
    recurrence?: RecurrenceFrequency | null;
    recurrence_end_date?: string | null;
}

interface Props {
    initial?: Transaction;
    onSubmit: (data: TransactionData, pendingFiles: File[]) => void;
    onCancel: () => void;
}

interface FormErrors {
    category?: string;
    amount?: string;
    date?: string;
    recurrence_end_date?: string;
}

const RECURRENCE_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'fortnightly', label: 'Fortnightly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
];

function centsToDisplay(cents: number): string {
    return (Math.abs(cents) / 100).toFixed(2);
}

export default function TransactionForm({ initial, onSubmit, onCancel }: Props) {
    const isGenerated = !!initial?.recurrence_source_id;
    const [type, setType] = useState<'income' | 'expense'>(initial?.type ?? 'expense');
    const [category, setCategory] = useState(initial?.category ?? '');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [description, setDescription] = useState(initial?.description ?? '');
    const [amount, setAmount] = useState(initial ? centsToDisplay(initial.amount_cents) : '');
    const [date, setDate] = useState(initial?.date ?? new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState(initial?.notes ?? '');
    const [repeat, setRepeat] = useState(!!initial?.recurrence);
    const [recurrence, setRecurrence] = useState<RecurrenceFrequency>(initial?.recurrence ?? 'monthly');
    const [recurrenceEndDate, setRecurrenceEndDate] = useState(initial?.recurrence_end_date ?? '');
    const [errors, setErrors] = useState<FormErrors>({});
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
    const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const today = new Date().toISOString().split('T')[0];
    const isDirty = initial
        ? (type !== initial.type ||
           category !== (initial.category ?? '') ||
           description !== initial.description ||
           amount !== centsToDisplay(initial.amount_cents) ||
           date !== initial.date ||
           notes !== (initial.notes ?? '') ||
           repeat !== !!initial.recurrence ||
           recurrence !== (initial.recurrence ?? 'monthly') ||
           recurrenceEndDate !== (initial.recurrence_end_date ?? '') ||
           pendingFiles.length > 0)
        : (type !== 'expense' ||
           category !== '' ||
           description !== '' ||
           amount !== '' ||
           date !== today ||
           notes !== '' ||
           repeat ||
           pendingFiles.length > 0);

    const { data: allCategories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: getCategories,
    });

    const suggestions = category.trim()
        ? allCategories.filter((c) => c.toLowerCase().includes(category.toLowerCase()))
        : allCategories;

    function handleCancel() {
        if (isDirty) {
            setShowDiscardConfirm(true);
        } else {
            onCancel();
        }
    }

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') handleCancel(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDirty]);

    function handleCategoryBlur() {
        blurTimerRef.current = setTimeout(() => setShowSuggestions(false), 100);
    }

    function handleSuggestionClick(value: string) {
        if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
        setCategory(value);
        setShowSuggestions(false);
        setErrors((p) => ({ ...p, category: undefined }));
    }

    function validate(): boolean {
        const next: FormErrors = {};
        if (!category.trim()) next.category = 'Category is required.';
        const parsed = parseFloat(amount);
        if (!amount || isNaN(parsed) || parsed <= 0) next.amount = 'Enter a positive amount.';
        if (!date) next.date = 'Date is required.';
        if (repeat && recurrenceEndDate) {
            if (recurrenceEndDate <= date) next.recurrence_end_date = 'End date must be after the transaction date.';
            else if (recurrenceEndDate <= today) next.recurrence_end_date = 'End date must be in the future.';
        }
        setErrors(next);
        return Object.keys(next).length === 0;
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!validate()) return;
        onSubmit(
            {
                category: category.trim(),
                description: description.trim() || undefined,
                amount: parseFloat(amount),
                type,
                date,
                notes: notes.trim() || null,
                recurrence: repeat ? recurrence : null,
                recurrence_end_date: repeat && recurrenceEndDate ? recurrenceEndDate : null,
            },
            pendingFiles,
        );
    }

    return (
        <>
        <div className="sid-modal-overlay anim-fade" onMouseDown={(e) => { if (e.target === e.currentTarget) handleCancel(); }}>
            <div className="sid-modal anim-slide-up" style={{ maxWidth: '460px' }}>
                <div className="sid-modal-trim" />
                <div className="sid-modal-body">
                    <h2 className="sid-modal-title">
                        {initial ? 'Edit transaction' : 'New transaction'}
                    </h2>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        {/* Type toggle */}
                        <div className="flex rounded-[var(--radius-input)] overflow-hidden [border:1.5px_solid_var(--border)] bg-[var(--cream)]">
                            {(['expense', 'income'] as const).map((t) => (
                                <button key={t} type="button" onClick={() => setType(t)}
                                    className="flex-1 p-[9px] border-none cursor-pointer font-body font-bold text-[13px] transition-all duration-150"
                                    style={{
                                        background: type === t ? (t === 'expense' ? 'var(--red)' : 'var(--green)') : 'transparent',
                                        color: type === t ? '#fff' : 'var(--text-secondary)',
                                    }}>
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                </button>
                            ))}
                        </div>

                        {/* Category */}
                        <div className="relative">
                            <div className="flex flex-col gap-[5px]">
                                <label htmlFor="category" className="sid-label">Category</label>
                                <input
                                    id="category"
                                    type="text"
                                    autoComplete="off"
                                    className="sid-input"
                                    placeholder="e.g. Shopping"
                                    value={category}
                                    onChange={(e) => { setCategory(e.target.value); setShowSuggestions(true); setErrors((p) => ({ ...p, category: undefined })); }}
                                    onFocus={() => setShowSuggestions(true)}
                                    onBlur={handleCategoryBlur}
                                    onKeyDown={(e) => { if (e.key === 'Escape') setShowSuggestions(false); }}
                                />
                                {errors.category && <span className="text-xs text-[var(--red)]">{errors.category}</span>}
                            </div>
                            {showSuggestions && suggestions.length > 0 && (
                                <ul className="sid-suggestions">
                                    {suggestions.map((c) => (
                                        <li key={c}>
                                            <button type="button" onMouseDown={() => handleSuggestionClick(c)} className="sid-suggestion-item">
                                                {c}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Description */}
                        <div className="flex flex-col gap-[5px]">
                            <label htmlFor="description" className="sid-label">Description (optional)</label>
                            <input
                                id="description"
                                type="text"
                                className="sid-input"
                                placeholder="Defaults to category if left blank"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>

                        {/* Amount */}
                        <div className="flex flex-col gap-[5px]">
                            <label className="sid-label">Amount</label>
                            <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                className="sid-input"
                                value={amount}
                                onChange={(e) => { setAmount(e.target.value); setErrors((p) => ({ ...p, amount: undefined })); }}
                            />
                            {errors.amount && <span className="text-xs text-[var(--red)]">{errors.amount}</span>}
                        </div>

                        {/* Date */}
                        <div className="flex flex-col gap-[5px]">
                            <label className="sid-label">Date</label>
                            <input
                                type="date"
                                className="sid-input"
                                value={date}
                                onChange={(e) => { setDate(e.target.value); setErrors((p) => ({ ...p, date: undefined })); }}
                            />
                            {errors.date && <span className="text-xs text-[var(--red)]">{errors.date}</span>}
                        </div>

                        {/* Notes */}
                        <div className="flex flex-col gap-[5px]">
                            <label className="sid-label">Notes (optional)</label>
                            <textarea
                                rows={2}
                                className="sid-input resize-y"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>

                        {/* Repeat */}
                        {!isGenerated && (
                            <div className="flex flex-col gap-3">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={repeat}
                                        onChange={(e) => setRepeat(e.target.checked)}
                                        className="w-4 h-4 accent-[var(--accent)]"
                                    />
                                    <span className="sid-label mb-0">Repeat</span>
                                </label>
                                {repeat && (
                                    <div className="flex flex-col gap-3 pl-6">
                                        <div className="flex flex-col gap-[5px]">
                                            <label className="sid-label">Frequency</label>
                                            <select
                                                className="sid-input"
                                                value={recurrence}
                                                onChange={(e) => setRecurrence(e.target.value as RecurrenceFrequency)}
                                            >
                                                {RECURRENCE_OPTIONS.map((o) => (
                                                    <option key={o.value} value={o.value}>{o.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex flex-col gap-[5px]">
                                            <label className="sid-label">End date (optional)</label>
                                            <input
                                                type="date"
                                                className="sid-input"
                                                value={recurrenceEndDate}
                                                onChange={(e) => { setRecurrenceEndDate(e.target.value); setErrors((p) => ({ ...p, recurrence_end_date: undefined })); }}
                                            />
                                            {errors.recurrence_end_date && <span className="text-xs text-[var(--red)]">{errors.recurrence_end_date}</span>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Attachments */}
                        <AttachmentManager
                            transactionId={initial?.id}
                            pendingFiles={pendingFiles}
                            onPendingFilesChange={setPendingFiles}
                        />

                        {initial?.created_at && (
                            <p className="text-xs text-[var(--text-muted)] text-right">
                                Created {formatDateTime(initial.created_at)}
                            </p>
                        )}

                        <div className="flex justify-end gap-2.5 pt-1">
                            <button type="button" className="sid-btn sid-btn-ghost" onClick={handleCancel}>Cancel</button>
                            <button type="submit" className="sid-btn sid-btn-primary">Save transaction</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        {showDiscardConfirm && (
            <ConfirmDialog
                message="You have unsaved changes. Discard them?"
                confirmLabel="Discard"
                onConfirm={onCancel}
                onCancel={() => setShowDiscardConfirm(false)}
            />
        )}
        </>
    );
}
