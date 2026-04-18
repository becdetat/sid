export function formatCents(cents: number): string {
    const abs = (Math.abs(cents) / 100).toFixed(2);
    return cents >= 0 ? `+$${abs}` : `−$${abs}`;
}

export function formatDate(iso: string): string {
    const [year, month, day] = iso.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
}
