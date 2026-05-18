import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getBudgetProgress, type BudgetProgress } from '../api/budgets';
import { Tile } from './Tile';

interface Props {
    accountId: number;
    accountName: string;
}

function barColor(b: BudgetProgress): string {
    if (b.percent >= b.danger_threshold) return 'var(--red)';
    if (b.percent >= b.warning_threshold) return '#d97706'; // amber
    return 'var(--green)';
}

function BudgetBar({ b }: { b: BudgetProgress }) {
    const color = barColor(b);
    const barWidth = Math.min(b.percent, 110);
    const overflowing = b.percent > 100;
    const spentDollars = (b.spent_cents / 100).toFixed(2);
    const limitDollars = (b.amount_cents / 100).toFixed(2);
    const periodLabel = b.period === 'monthly' ? 'This month' : 'This week';

    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] font-semibold text-[var(--text-primary)] font-body truncate">{b.category}</span>
                <span className="text-[11px] text-[var(--text-muted)] font-body shrink-0">{periodLabel}</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-[var(--cream-mid)] rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${barWidth}%`, background: color }}
                    />
                </div>
                <span
                    className="text-[11px] font-bold font-body shrink-0 w-10 text-right"
                    style={{ color }}
                >
                    {b.percent}%
                </span>
            </div>
            <div className="flex items-center justify-between">
                <span className="text-[11px] text-[var(--text-muted)] font-body">
                    ${spentDollars} <span className="text-[var(--text-muted)]">of ${limitDollars}</span>
                </span>
                {overflowing && (
                    <span className="text-[10px] font-bold text-[var(--red)] font-body">OVER LIMIT</span>
                )}
            </div>
        </div>
    );
}

export default function BudgetProgressTile({ accountId, accountName }: Props) {
    const { data = [], isLoading } = useQuery({
        queryKey: ['budget-progress', accountId],
        queryFn: () => getBudgetProgress(accountId),
    });

    const contentHeight = Math.max(data.length * 60 + 16, 80);

    return (
        <Tile accountName={accountName} accountId={accountId}>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)] font-body">
                Budget Progress
            </p>

            {isLoading && (
                <div className="flex items-center justify-center min-h-[80px]">
                    <p className="text-xs text-[var(--text-muted)] italic">Loading…</p>
                </div>
            )}

            {!isLoading && data.length === 0 && (
                <div className="flex flex-col items-center justify-center min-h-[80px] gap-2 text-center">
                    <p className="text-xs text-[var(--text-muted)] italic">No budgets configured.</p>
                    <Link to="/settings?section=budgets" className="text-xs text-[var(--teak)] font-semibold font-body underline">
                        Add budgets in Settings →
                    </Link>
                </div>
            )}

            {!isLoading && data.length > 0 && (
                <div className="flex flex-col gap-4" style={{ minHeight: contentHeight }}>
                    {data.map((b) => <BudgetBar key={b.id} b={b} />)}
                </div>
            )}
        </Tile>
    );
}
