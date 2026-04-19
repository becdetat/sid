import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Transaction } from '../types/transaction';
import { getCategories } from '../api/categories';
import AttachmentManager from './AttachmentManager';
import ConfirmDialog from './ConfirmDialog';

interface TransactionData {
    category: string | null;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    date: string;
    notes: string | null;
}

interface Props {
    initial?: Transaction;
    onSubmit: (data: TransactionData, pendingFiles: File[]) => void;
    onCancel: () => void;
}

interface FormErrors {
    description?: string;
    amount?: string;
    date?: string;
}

function centsToDisplay(cents: number): string {
    return (Math.abs(cents) / 100).toFixed(2);
}

export default function TransactionForm({ initial, onSubmit, onCancel }: Props) {
    const [type, setType] = useState<'income' | 'expense'>(initial?.type ?? 'expense');
    const [category, setCategory] = useState(initial?.category ?? '');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [description, setDescription] = useState(initial?.description ?? '');
    const [amount, setAmount] = useState(initial ? centsToDisplay(initial.amount_cents) : '');
    const [date, setDate] = useState(initial?.date ?? new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState(initial?.notes ?? '');
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
           pendingFiles.length > 0)
        : (type !== 'expense' ||
           category !== '' ||
           description !== '' ||
           amount !== '' ||
           date !== today ||
           notes !== '' ||
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
    }

    function validate(): boolean {
        const next: FormErrors = {};
        if (!description.trim()) next.description = 'Description is required.';
        const parsed = parseFloat(amount);
        if (!amount || isNaN(parsed) || parsed <= 0) next.amount = 'Enter a positive amount.';
        if (!date) next.date = 'Date is required.';
        setErrors(next);
        return Object.keys(next).length === 0;
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!validate()) return;
        onSubmit(
            {
                category: category.trim() || null,
                description: description.trim(),
                amount: parseFloat(amount),
                type,
                date,
                notes: notes.trim() || null,
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
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Type toggle */}
                        <div style={{ display: 'flex', borderRadius: 'var(--radius-input)', overflow: 'hidden', border: '1.5px solid var(--border)', background: 'var(--cream)' }}>
                            {(['expense', 'income'] as const).map((t) => (
                                <button key={t} type="button" onClick={() => setType(t)}
                                    style={{
                                        flex: 1, padding: '9px', border: 'none', cursor: 'pointer',
                                        fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px',
                                        transition: 'all 0.15s',
                                        background: type === t ? (t === 'expense' ? 'var(--red)' : 'var(--green)') : 'transparent',
                                        color: type === t ? '#fff' : 'var(--text-secondary)',
                                    }}>
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                </button>
                            ))}
                        </div>

                        {/* Category */}
                        <div style={{ position: 'relative' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <label htmlFor="category" className="sid-label">Category (optional)</label>
                                <input
                                    id="category"
                                    type="text"
                                    autoComplete="off"
                                    className="sid-input"
                                    placeholder="e.g. Shopping"
                                    value={category}
                                    onChange={(e) => { setCategory(e.target.value); setShowSuggestions(true); }}
                                    onFocus={() => setShowSuggestions(true)}
                                    onBlur={handleCategoryBlur}
                                    onKeyDown={(e) => { if (e.key === 'Escape') setShowSuggestions(false); }}
                                />
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label htmlFor="description" className="sid-label">Description</label>
                            <input
                                id="description"
                                type="text"
                                className="sid-input"
                                value={description}
                                onChange={(e) => { setDescription(e.target.value); setErrors((p) => ({ ...p, description: undefined })); }}
                            />
                            {errors.description && <span style={{ fontSize: '12px', color: 'var(--red)' }}>{errors.description}</span>}
                        </div>

                        {/* Amount */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label className="sid-label">Amount</label>
                            <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                className="sid-input"
                                value={amount}
                                onChange={(e) => { setAmount(e.target.value); setErrors((p) => ({ ...p, amount: undefined })); }}
                            />
                            {errors.amount && <span style={{ fontSize: '12px', color: 'var(--red)' }}>{errors.amount}</span>}
                        </div>

                        {/* Date */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label className="sid-label">Date</label>
                            <input
                                type="date"
                                className="sid-input"
                                value={date}
                                onChange={(e) => { setDate(e.target.value); setErrors((p) => ({ ...p, date: undefined })); }}
                            />
                            {errors.date && <span style={{ fontSize: '12px', color: 'var(--red)' }}>{errors.date}</span>}
                        </div>

                        {/* Notes */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label className="sid-label">Notes (optional)</label>
                            <textarea
                                rows={2}
                                className="sid-input"
                                style={{ resize: 'vertical' }}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>

                        {/* Attachments */}
                        <AttachmentManager
                            transactionId={initial?.id}
                            pendingFiles={pendingFiles}
                            onPendingFilesChange={setPendingFiles}
                        />

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '4px' }}>
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
