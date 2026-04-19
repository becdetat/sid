import { Link } from 'react-router-dom';
import type { DashboardAccount } from '../types/dashboard';
import { formatCents, formatDate, balanceColor } from '../utils/format';

interface Props {
    account: DashboardAccount;
    onAddTransaction: (account: DashboardAccount) => void;
}

const ArrowIcon = () => (
    <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
);

export default function AccountCard({ account, onAddTransaction }: Props) {
    return (
        <div className="bg-[var(--white)] rounded-[var(--radius-card)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] [border:1.5px_solid_var(--border)] overflow-hidden transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 flex flex-col">
            <div className="wood-stripe h-6 shrink-0" />

            <div className="px-5 py-[18px] flex-1 flex flex-col">
                {/* Header */}
                <div className="mb-2.5">
                    <Link
                        to={`/accounts/${account.id}`}
                        className="font-body font-bold text-[15px] text-[var(--text-primary)] no-underline leading-[1.3]"
                    >
                        {account.name}
                    </Link>
                </div>

                {/* Balance */}
                <div
                    className="font-display text-[28px] font-bold mb-[14px] tracking-[-0.02em]"
                    style={{ color: balanceColor(account.balance_cents) }}
                >
                    {formatCents(account.balance_cents)}
                </div>

                {/* Recent transactions */}
                {account.recent_transactions.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)] italic flex-1">
                        No transactions yet
                    </p>
                ) : (
                    <ul className="flex-1 flex flex-col gap-[5px] mb-[14px]">
                        {account.recent_transactions.slice(0, 5).map((tx) => (
                            <li key={tx.id} className="flex items-center gap-2 text-xs">
                                <span className="text-[var(--text-muted)] shrink-0 w-20">{formatDate(tx.date)}</span>
                                <span className="flex-1 text-[var(--text-secondary)] overflow-hidden text-ellipsis whitespace-nowrap">{tx.description}</span>
                                <span className="font-semibold shrink-0" style={{ color: balanceColor(tx.amount_cents) }}>{formatCents(tx.amount_cents)}</span>
                            </li>
                        ))}
                    </ul>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-2.5 border-t border-[var(--cream-mid)]">
                    <Link
                        to={`/accounts/${account.id}`}
                        className="bg-transparent border-none cursor-pointer text-xs font-bold text-[var(--teak)] font-body flex items-center gap-1 no-underline"
                    >
                        View all <ArrowIcon />
                    </Link>
                    <button
                        onClick={() => onAddTransaction(account)}
                        className="bg-transparent border-none cursor-pointer text-xs font-bold text-[var(--teak)] font-body"
                    >
                        + Add transaction
                    </button>
                </div>
            </div>
        </div>
    );
}
