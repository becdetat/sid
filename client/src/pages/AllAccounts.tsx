import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listAccountsWithBalances } from '../api/accounts';
import { balanceColor, formatCents } from '../utils/format';
import { Page } from '../components/Page';
import PageLink from '../components/PageLink';

export default function AllAccounts() {
    const { data: accounts = [], isLoading } = useQuery({
        queryKey: ['accounts-balances'],
        queryFn: listAccountsWithBalances,
    });

    const totalBalance = accounts.reduce((s, a) => s + a.balance_cents, 0);

    return (
        <Page pageTitle="All accounts" balance={totalBalance}>
            <PageLink to="/dashboard">&larr; Back to dashboard</PageLink>

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
                                        state={{ from: 'all-accounts' }}
                                        className="text-sm font-semibold text-[var(--text-primary)] font-body no-underline block"
                                    >
                                        {account.name}
                                    </Link>
                                </td>
                                <td className="p-3 text-right">
                                    <Link
                                        to={`/accounts/${account.id}`}
                                        state={{ from: 'all-accounts' }}
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
        </Page>
    );
}
