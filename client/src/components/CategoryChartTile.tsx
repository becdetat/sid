import { useQuery } from '@tanstack/react-query';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';
import { getCategoryChart } from '../api/charts';
import { formatCents } from '../utils/format';
import { Tile } from './Tile';

interface Props {
    accountId: number;
    accountName: string;
    window: string;
}

function formatXAxis(value: number): string {
    const abs = Math.abs(value) / 100;
    if (abs >= 1000) return `$${(abs / 1000).toFixed(1)}k`;
    return `$${abs.toFixed(0)}`;
}

function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-[var(--white)] [border:1.5px_solid_var(--border)] rounded-lg px-3 py-2 shadow-[var(--shadow-md)] text-xs font-body">
            <p className="text-[var(--text-muted)] mb-0.5">{label}</p>
            <p className="font-semibold text-[var(--text-primary)]">{formatCents(payload[0].value)}</p>
        </div>
    );
}

export default function CategoryChartTile({ accountId, accountName, window }: Props) {
    const { data = [], isLoading } = useQuery({
        queryKey: ['chart-categories', accountId, window],
        queryFn: () => getCategoryChart(accountId, window),
    });

    const barHeight = 28;
    const chartHeight = Math.max(data.length * barHeight + 20, 100);

    return (
        <Tile accountName={accountName} accountId={accountId}>
            {isLoading && (
                <div className="flex-1 flex items-center justify-center min-h-[100px]">
                    <p className="text-xs text-[var(--text-muted)] italic">Loading…</p>
                </div>
            )}

            {!isLoading && data.length === 0 && (
                <div className="flex-1 flex items-center justify-center min-h-[100px]">
                    <p className="text-xs text-[var(--text-muted)] italic">No data for this period.</p>
                </div>
            )}

            {!isLoading && data.length > 0 && (
                <div style={{ height: chartHeight }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            layout="vertical"
                            margin={{ top: 0, right: 4, bottom: 0, left: 0 }}
                        >
                            <XAxis
                                type="number"
                                dataKey="total_cents"
                                tickFormatter={formatXAxis}
                                tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                type="category"
                                dataKey="category"
                                tick={{ fontSize: 10, fill: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}
                                tickLine={false}
                                axisLine={false}
                                width={90}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--cream)' }} />
                            <Bar dataKey="total_cents" radius={[0, 3, 3, 0]}>
                                {data.map((_, i) => (
                                    <Cell key={i} fill="var(--teak)" fillOpacity={1 - i * 0.07} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </Tile>
    );
}
