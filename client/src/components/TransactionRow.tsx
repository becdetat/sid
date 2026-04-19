import type { Transaction } from '../types/transaction';
import { formatCents, formatDate } from '../utils/format';

interface Props {
    transaction: Transaction;
    onEdit: (t: Transaction) => void;
    onDelete: (t: Transaction) => void;
}

export default function TransactionRow({ transaction, onEdit, onDelete }: Props) {
    const isIncome = transaction.type === 'income';
    const amountClass = isIncome ? 'text-green-600' : 'text-red-600';

    return (
        <tr className="border-b border-gray-100 last:border-0">
            <td className="py-2 pr-4 text-sm text-gray-500 whitespace-nowrap">
                {formatDate(transaction.date)}
            </td>
            <td className="py-2 pr-4 text-xs text-gray-500">{transaction.category ?? ''}</td>
            <td className="py-2 pr-4 text-sm text-gray-900">{transaction.description}</td>
            <td className="py-2 pr-4">
                <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        isIncome
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                    }`}
                >
                    {transaction.type}
                </span>
            </td>
            <td className={`py-2 pr-4 text-sm font-medium text-right ${amountClass}`}>
                {formatCents(transaction.amount_cents)}
            </td>
            <td className="py-2 text-right">
                <button
                    aria-label={`Edit ${transaction.description}`}
                    onClick={() => onEdit(transaction)}
                    className="rounded p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                    >
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-9 9A2 2 0 016 16H4a1 1 0 01-1-1v-2a2 2 0 01.586-1.414l9-9z" />
                    </svg>
                </button>
                <button
                    aria-label={`Delete ${transaction.description}`}
                    onClick={() => onDelete(transaction)}
                    className="rounded p-1 text-gray-400 hover:text-red-600 hover:bg-red-50"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                    >
                        <path
                            fillRule="evenodd"
                            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                            clipRule="evenodd"
                        />
                    </svg>
                </button>
            </td>
        </tr>
    );
}
