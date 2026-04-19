export function formatCents(cents: number): string {
    const abs = Math.abs(cents) / 100;
    const str = abs.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });
    if (cents < 0) return `\u2212${str}`;
    if (cents === 0) return str;
    return `+${str}`;
}

export function formatDate(iso: string): string {
    const [year, month, day] = iso.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function balanceColor(cents: number): string {
    if (cents > 0) return 'var(--green)';
    if (cents < 0) return 'var(--red)';
    return 'var(--text-secondary)';
}
