interface ExportRow {
    date: string;
    category: string | null;
    description: string;
    type: string;
    amount_cents: number;
    notes: string | null;
}

function escapeField(value: string): string {
    if (value.includes(',') || value.includes('\n') || value.includes('"')) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

export function toCSV(rows: ExportRow[]): string {
    const header = 'Date,Category,Description,Type,Amount,Notes';
    const lines = rows.map((r) => {
        const amount = (Math.abs(r.amount_cents) / 100).toFixed(2);
        return [
            r.date,
            escapeField(r.category ?? ''),
            escapeField(r.description),
            r.type,
            amount,
            escapeField(r.notes ?? ''),
        ].join(',');
    });
    return [header, ...lines].join('\n');
}
