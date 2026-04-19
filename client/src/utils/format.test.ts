import { describe, it, expect } from 'vitest';
import { formatCents, formatDate } from './format';

describe('formatCents', () => {
    it('formats positive cents as income', () => {
        expect(formatCents(5000)).toBe('+$50.00');
    });

    it('formats negative cents as expense', () => {
        expect(formatCents(-450)).toBe('−$4.50');
    });

    it('formats zero', () => {
        expect(formatCents(0)).toBe('$0.00');
    });
});

describe('formatDate', () => {
    it('formats ISO date as DD MMM YYYY', () => {
        expect(formatDate('2024-01-15')).toBe('15 Jan 2024');
    });

    it('formats another date correctly', () => {
        expect(formatDate('2026-04-18')).toBe('18 Apr 2026');
    });
});
