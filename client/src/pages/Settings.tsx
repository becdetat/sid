import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AccountsSection from '../components/settings/AccountsSection';
import DashboardSection from '../components/settings/DashboardSection';
import BudgetsSection from '../components/settings/BudgetsSection';
import ImportExportSection from '../components/settings/ImportExportSection';
import TagsSection from '../components/settings/TagsSection';
import ReconciliationHistorySection from '../components/settings/ReconciliationHistorySection';
import RulesSection from '../components/settings/RulesSection';
import { Page } from '../components/Page';
import PageLink from '../components/PageLink';

const navItems = [
    { label: 'Accounts', key: 'accounts' },
    { label: 'Dashboard', key: 'dashboard' },
    { label: 'Budgets', key: 'budgets' },
    { label: 'Tags', key: 'tags' },
    { label: 'Rules', key: 'rules' },
    { label: 'Import / Export', key: 'import-export' },
    { label: 'Reconciliation', key: 'reconciliation' },
] as const;

type Section = (typeof navItems)[number]['key'];

function isValidSection(s: string | null): s is Section {
    return navItems.some((item) => item.key === s);
}

export default function Settings() {
    const [searchParams] = useSearchParams();
    const initialSection = searchParams.get('section');
    const [section, setSection] = useState<Section>(
        isValidSection(initialSection) ? initialSection : 'accounts',
    );

    return (
        <Page pageTitle="Settings">
            <PageLink to="/dashboard">&larr; Back to dashboard</PageLink>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-12 items-start">
                {/* Sidebar */}
                <nav className="w-full sm:w-[180px] sm:shrink-0">
                    <ul className="list-none m-0 p-0 flex flex-row sm:flex-col gap-1 overflow-x-auto">
                        {navItems.map((item) => (
                            <li key={item.key} className="shrink-0">
                                <button
                                    onClick={() => setSection(item.key)}
                                    className={`block w-full text-left px-3 py-2 rounded-[8px] text-sm font-semibold font-body border-none cursor-pointer whitespace-nowrap ${section === item.key ? 'bg-[var(--cream)] text-[var(--teak-dark)]' : 'bg-transparent text-[var(--text-secondary)]'}`}
                                >
                                    {item.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* Content panel */}
                <div className="flex-1 min-w-0 w-full">
                    {section === 'accounts' && <AccountsSection />}
                    {section === 'dashboard' && <DashboardSection />}
                    {section === 'budgets' && <BudgetsSection />}
                    {section === 'tags' && <TagsSection />}
                    {section === 'rules' && <RulesSection />}
                    {section === 'import-export' && <ImportExportSection />}
                    {section === 'reconciliation' && <ReconciliationHistorySection />}
                </div>
            </div>
        </Page>
    );
}
