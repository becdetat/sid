import { Link } from 'react-router-dom';
import AccountsSection from '../components/settings/AccountsSection';
import { GearIcon } from '../components/GearIcon';
import { balanceColor, formatCents } from '../utils/format';
import { getDashboard } from '../api/dashboard';
import { useQuery } from '@tanstack/react-query';

const navItems = [
    { label: 'Accounts', key: 'accounts' },
] as const;

type Section = (typeof navItems)[number]['key'];

const WaveIcon = () => (
    <svg width="32" height="14" viewBox="0 0 32 14" fill="none" style={{ opacity: 0.45 }}>
        <path d="M0 7 Q4 2 8 7 Q12 12 16 7 Q20 2 24 7 Q28 12 32 7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
);

export default function Settings() {
    const section: Section = 'accounts';

        const { data: accounts = [] } = useQuery({
        queryKey: ['dashboard'],
        queryFn: getDashboard,
    });

    const totalBalance = accounts.reduce((s, a) => s + a.balance_cents, 0);

    return (
        <div style={{ minHeight: '100vh' }}>
            <header style={{
                background: 'var(--white)',
                borderBottom: '1.5px solid var(--border)',
                boxShadow: '0 1px 0 var(--cream-dark)',
                position: 'sticky',
                top: 0,
                zIndex: 100,
            }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 32px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <Link
                            to="/dashboard"
                            style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 700, color: 'var(--teak-dark)', letterSpacing: '-0.02em', lineHeight: 1, textDecoration: 'none' }}
                        >
                            Sid
                        </Link>
                        <WaveIcon />
                        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, color: 'var(--teak-dark)', margin: 0 }}>
                            <Link to="/dashboard">Dashboard</Link>
                            {" / "}
                            Settings
                        </h1>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600, fontFamily: 'var(--font-body)' }}>
                            Net
                        </span>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, color: balanceColor(totalBalance) }}>
                            {formatCents(totalBalance)}
                        </span>
                        <Link to="/settings" aria-label="Settings" className="sid-icon-btn">
                            <GearIcon />
                        </Link>
                        </div>
                    </div>
                <div className="sid-header-stripe" />
            </header>

            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '36px 32px', display: 'flex', gap: '48px', alignItems: 'flex-start' }}>
                {/* Sidebar */}
                <nav style={{ width: '180px', flexShrink: 0 }}>
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {navItems.map((item) => (
                            <li key={item.key}>
                                <span style={{
                                    display: 'block',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    fontFamily: 'var(--font-body)',
                                    background: section === item.key ? 'var(--cream)' : 'transparent',
                                    color: section === item.key ? 'var(--teak-dark)' : 'var(--text-secondary)',
                                    cursor: 'default',
                                }}>
                                    {item.label}
                                </span>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* Content panel */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    {section === 'accounts' && <AccountsSection />}
                </div>
            </div>
        </div>
    );
}
