import { useState } from 'react';
import type { Transaction } from '../types/transaction';

interface Props {
    initial?: Transaction;
    onSubmit: (data: {
        description: string;
        amount: number;
        type: 'income' | 'expense';
        date: string;
        notes: string | null;
    }) => void;
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
    const [description, setDescription] = useState(initial?.description ?? '');
    const [amount, setAmount] = useState(initial ? centsToDisplay(initial.amount_cents) : '');
    const [date, setDate] = useState(initial?.date ?? '');
    const [notes, setNotes] = useState(initial?.notes ?? '');
    const [errors, setErrors] = useState<FormErrors>({});

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
        onSubmit({
            description: description.trim(),
            amount: parseFloat(amount),
            type,
            date,
            notes: notes.trim() || null,
        });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
                <h2 className="text-lg font-semibold mb-4">
                    {initial ? 'Edit transaction' : 'New transaction'}
                </h2>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {/* Type toggle */}
                    <div className="flex rounded overflow-hidden border border-gray-300">
                        <button
                            type="button"
                            onClick={() => setType('expense')}
                            className={`flex-1 py-2 text-sm font-medium transition-colors ${
                                type === 'expense'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            Expense
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('income')}
                            className={`flex-1 py-2 text-sm font-medium transition-colors ${
                                type === 'income'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            Income
                        </button>
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor="tf-description" className="block text-xs font-medium text-gray-700 mb-1">
                            Description
                        </label>
                        <input
                            id="tf-description"
                            type="text"
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={description}
                            onChange={(e) => {
                                setDescription(e.target.value);
                                setErrors((p) => ({ ...p, description: undefined }));
                            }}
                        />
                        {errors.description && (
                            <p className="mt-1 text-xs text-red-600">{errors.description}</p>
                        )}
                    </div>

                    {/* Amount */}
                    <div>
                        <label htmlFor="tf-amount" className="block text-xs font-medium text-gray-700 mb-1">
                            Amount
                        </label>
                        <input
                            id="tf-amount"
                            type="number"
                            min="0.01"
                            step="0.01"
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={amount}
                            onChange={(e) => {
                                setAmount(e.target.value);
                                setErrors((p) => ({ ...p, amount: undefined }));
                            }}
                        />
                        {errors.amount && (
                            <p className="mt-1 text-xs text-red-600">{errors.amount}</p>
                        )}
                    </div>

                    {/* Date */}
                    <div>
                        <label htmlFor="tf-date" className="block text-xs font-medium text-gray-700 mb-1">
                            Date
                        </label>
                        <input
                            id="tf-date"
                            type="date"
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={date}
                            onChange={(e) => {
                                setDate(e.target.value);
                                setErrors((p) => ({ ...p, date: undefined }));
                            }}
                        />
                        {errors.date && (
                            <p className="mt-1 text-xs text-red-600">{errors.date}</p>
                        )}
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Notes (optional)
                        </label>
                        <textarea
                            rows={2}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
                        >
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
