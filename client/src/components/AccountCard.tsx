import { useState } from 'react';
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
    const [hov, setHov] = useState(false);

    return (
        <div
            style={{
                background: 'var(--white)',
                borderRadius: 'var(--radius-card)',
                boxShadow: hov ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                border: '1.5px solid var(--border)',
                overflow: 'hidden',
                transition: 'box-shadow 0.2s, transform 0.2s',
                transform: hov ? 'translateY(-2px)' : 'none',
                display: 'flex',
                flexDirection: 'column',
            }}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
        >
            <div className="wood-stripe" style={{ height: '24px', flexShrink: 0 }} />

            <div style={{ padding: '18px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <div style={{ marginBottom: '10px' }}>
                    <Link
                        to={`/accounts/${account.id}`}
                        style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', textDecoration: 'none', lineHeight: 1.3 }}
                    >
                        {account.name}
                    </Link>
                </div>

                {/* Balance */}
                <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '28px',
                    fontWeight: 700,
                    color: balanceColor(account.balance_cents),
                    marginBottom: '14px',
                    letterSpacing: '-0.02em',
                }}>
                    {formatCents(account.balance_cents)}
                </div>

                {/* Recent transactions */}
                {account.recent_transactions.length === 0 ? (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', flex: 1 }}>
                        No transactions yet
                    </p>
                ) : (
                    <ul style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '14px' }}>
                        {account.recent_transactions.slice(0, 5).map((tx) => (
                            <li key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                                <span style={{ color: 'var(--text-muted)', flexShrink: 0, width: '80px' }}>{formatDate(tx.date)}</span>
                                <span style={{ flex: 1, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description}</span>
                                <span style={{ color: balanceColor(tx.amount_cents), fontWeight: 600, flexShrink: 0 }}>{formatCents(tx.amount_cents)}</span>
                            </li>
                        ))}
                    </ul>
                )}

                {/* Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--cream-mid)' }}>
                    <Link
                        to={`/accounts/${account.id}`}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: 'var(--teak)', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                    >
                        View all <ArrowIcon />
                    </Link>
                    <button
                        onClick={() => onAddTransaction(account)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: 'var(--teak)', fontFamily: 'var(--font-body)' }}
                    >
                        + Add transaction
                    </button>
                </div>
            </div>
        </div>
    );
}
