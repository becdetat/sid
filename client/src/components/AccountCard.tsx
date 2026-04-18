import { Link } from 'react-router-dom';
import type { DashboardAccount } from '../types/dashboard';
import { formatBalance } from '../utils/currency';
import { formatDate, formatCents } from '../utils/format';

interface Props {
    account: DashboardAccount;
    onEdit: (account: DashboardAccount) => void;
    onDelete: (account: DashboardAccount) => void;
    onAddTransaction: (account: DashboardAccount) => void;
}

function balanceClass(cents: number): string {
    if (cents > 0) return 'text-green-600';
    if (cents < 0) return 'text-red-600';
    return 'text-gray-500';
}

export default function AccountCard({ account, onEdit, onDelete, onAddTransaction }: Props) {
    return (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
                <Link
                    to={`/accounts/${account.id}`}
                    className="text-sm font-medium text-gray-900 hover:underline"
                >
                    {account.name}
                </Link>
                <div className="flex gap-2">
                    <button
                        aria-label={`Edit ${account.name}`}
                        onClick={() => onEdit(account)}
                        className="rounded p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-9 9A2 2 0 016 16H4a1 1 0 01-1-1v-2a2 2 0 01.586-1.414l9-9z" />
                        </svg>
                    </button>
                    <button
                        aria-label={`Delete ${account.name}`}
                        onClick={() => onDelete(account)}
                        className="rounded p-1 text-gray-400 hover:text-red-600 hover:bg-red-50"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path
                                fillRule="evenodd"
                                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </button>
                </div>
            </div>

            <p className={`text-2xl font-semibold mb-3 ${balanceClass(account.balance_cents)}`}>
                {formatBalance(account.balance_cents)}
            </p>

            {account.recent_transactions.length === 0 ? (
                <p className="text-xs text-gray-400">No transactions yet</p>
            ) : (
                <ul className="flex flex-col gap-1 mb-3">
                    {account.recent_transactions.map((tx) => (
                        <li key={tx.id} className="text-xs text-gray-600 flex justify-between gap-2">
                            <span className="text-gray-400 shrink-0">{formatDate(tx.date)}</span>
                            <span className="truncate flex-1">{tx.description}</span>
                            <span className={tx.amount_cents >= 0 ? 'text-green-600 shrink-0' : 'text-red-600 shrink-0'}>
                                {formatCents(tx.amount_cents)}
                            </span>
                        </li>
                    ))}
                </ul>
            )}

            <div className="flex items-center justify-between">
                <Link
                    to={`/accounts/${account.id}`}
                    className="text-xs text-blue-600 hover:underline"
                >
                    View all transactions →
                </Link>
                <button
                    aria-label={`Add transaction to ${account.name}`}
                    onClick={() => onAddTransaction(account)}
                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                >
                    + Add transaction
                </button>
            </div>
        </div>
    );
}
