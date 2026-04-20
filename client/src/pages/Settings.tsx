import { useState } from 'react';
import { Link } from 'react-router-dom';
import AccountsSection from '../components/settings/AccountsSection';
import ImportExportSection from '../components/settings/ImportExportSection';
import { GearIcon } from '../components/GearIcon';
import { balanceColor, formatCents } from '../utils/format';
import { getDashboard } from '../api/dashboard';
import { useQuery } from '@tanstack/react-query';
import DashboardLink from '../components/DashboardLink';
import { WaveIcon } from '../components/WaveIcon';

const navItems = [
    { label: 'Accounts', key: 'accounts' },
    { label: 'Import / Export', key: 'import-export' },
] as const;

type Section = (typeof navItems)[number]['key'];

export default function Settings() {
    const [section, setSection] = useState<Section>('accounts');

    const { data: accounts = [] } = useQuery({
        queryKey: ['dashboard'],
        queryFn: getDashboard,
    });

    const totalBalance = accounts.reduce((s, a) => s + a.balance_cents, 0);

    return (
        <div className="min-h-screen">
            <header className="bg-[var(--white)] [border-bottom:1.5px_solid_var(--border)] shadow-[0_1px_0_var(--cream-dark)] sticky top-0 z-[100]">
                <div className="max-w-[1100px] mx-auto px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h1 className="font-display text-[26px] font-bold text-[var(--teak-dark)] tracking-[-0.02em] leading-none">
                            <a href="/">Sid</a>
                        </h1>
                        <WaveIcon />
                        <h2 className="font-display text-xl font-bold text-[var(--teak-dark)] m-0">
                            Settings
                        </h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-[13px] text-[var(--text-muted)] font-semibold font-body">
                            Net
                        </span>
                        <span className="font-display text-xl font-bold" style={{ color: balanceColor(totalBalance) }}>
                            {formatCents(totalBalance)}
                        </span>
                        <Link to="/settings" aria-label="Settings" className="sid-icon-btn">
                            <GearIcon />
                        </Link>
                    </div>
                </div>
                <div className="sid-header-stripe" />
            </header>

            <main className="max-w-[1100px] mx-auto px-8 py-[36px]">
                <DashboardLink />

                <div className="flex gap-12 items-start">
                    {/* Sidebar */}
                    <nav className="w-[180px] shrink-0">
                        <ul className="list-none m-0 p-0 flex flex-col gap-1">
                            {navItems.map((item) => (
                                <li key={item.key}>
                                    <button
                                        onClick={() => setSection(item.key)}
                                        className={`block w-full text-left px-3 py-2 rounded-[8px] text-sm font-semibold font-body border-none cursor-pointer ${section === item.key ? 'bg-[var(--cream)] text-[var(--teak-dark)]' : 'bg-transparent text-[var(--text-secondary)]'}`}
                                    >
                                        {item.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    {/* Content panel */}
                    <div className="flex-1 min-w-0">
                        {section === 'accounts' && <AccountsSection />}
                        {section === 'import-export' && <ImportExportSection />}
                    </div>
                </div>
            </main>
        </div>
    );
}
