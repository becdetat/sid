export function formatCents(cents: number): string {
    const abs = Math.abs(cents) / 100;
    const str = abs.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });
    if (cents < 0) return `\u2212${str}`; // U+2212 MINUS SIGN, not a hyphen
    if (cents === 0) return str;
    return `+${str}`;
}

export function formatDate(iso: string): string {
    const [year, month, day] = iso.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string): string {
    // SQLite datetime() returns "YYYY-MM-DD HH:MM:SS" (space, no T, no Z); normalise before parsing
    const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z');
    return d.toLocaleString('en-AU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function balanceColor(cents: number): string {
    if (cents > 0) return 'var(--green)';
    if (cents < 0) return 'var(--red)';
    return 'var(--text-secondary)';
}
