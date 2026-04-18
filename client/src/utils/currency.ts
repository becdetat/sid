export function formatBalance(cents: number): string {
    const abs = (Math.abs(cents) / 100).toFixed(2);
    if (cents < 0) return `-$${abs}`;
    return `$${abs}`;
}
