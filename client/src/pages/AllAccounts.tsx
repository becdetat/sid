import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listAccountsWithBalances } from '../api/accounts';
import { balanceColor, formatCents } from '../utils/format';
import { GearIcon } from '../components/GearIcon';
import { WaveIcon } from '../components/WaveIcon';
import DashboardLink from '../components/DashboardLink';

export default function AllAccounts() {
    const { data: accounts = [], isLoading } = useQuery({
        queryKey: ['accounts-balances'],
        queryFn: listAccountsWithBalances,
    });

    return (
        <div className="min-h-screen">
            <header className="bg-[var(--white)] [border-bottom:1.5px_solid_var(--border)] shadow-[0_1px_0_var(--cream-dark)] sticky top-0 z-[100]">
                <div className="max-w-[1100px] mx-auto px-4 sm:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                        <h1 className="font-display text-[22px] sm:text-[26px] font-bold text-[var(--teak-dark)] tracking-[-0.02em] leading-none shrink-0">
                            <a href="/">Sid</a>
                        </h1>
                        <WaveIcon />
                        <h2 className="font-display text-lg sm:text-xl font-bold text-[var(--teak-dark)] m-0 truncate">
                            All accounts
                        </h2>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                        <Link to="/settings" aria-label="Settings" className="sid-icon-btn">
                            <GearIcon />
                        </Link>
                    </div>
                </div>
                <div className="sid-header-stripe" />
            </header>

            <main className="max-w-[1100px] mx-auto px-4 sm:px-8 py-5 sm:py-[36px]">
                <DashboardLink />

                {isLoading && (
                    <p className="text-[var(--text-muted)] text-sm">Loading…</p>
                )}

                {!isLoading && accounts.length === 0 && (
                    <div className="text-center py-[80px]">
                        <p className="text-[var(--text-muted)] text-[15px]">No accounts yet.</p>
                    </div>
                )}

                {!isLoading && accounts.length > 0 && (
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="[border-bottom:1.5px_solid_var(--border)]">
                                <th className="text-left px-3 pt-2 pb-[10px] text-[11px] font-bold tracking-[0.06em] text-[var(--text-muted)] uppercase font-body">
                                    Account
                                </th>
                                <th className="text-right px-3 pt-2 pb-[10px] text-[11px] font-bold tracking-[0.06em] text-[var(--text-muted)] uppercase font-body">
                                    Balance
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {accounts.map((account) => (
                                <tr
                                    key={account.id}
                                    className="border-b border-[var(--cream-mid)] hover:bg-[var(--cream)] transition-colors duration-[120ms] cursor-pointer"
                                >
                                    <td className="p-3">
                                        <Link
                                            to={`/accounts/${account.id}`}
                                            className="text-sm font-semibold text-[var(--text-primary)] font-body no-underline block"
                                        >
                                            {account.name}
                                        </Link>
                                    </td>
                                    <td className="p-3 text-right">
                                        <Link
                                            to={`/accounts/${account.id}`}
                                            className="text-sm font-bold font-body no-underline block"
                                            style={{ color: balanceColor(account.balance_cents) }}
                                        >
                                            {formatCents(account.balance_cents)}
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </main>
        </div>
    );
}
