import db from '../db';

export interface CategorySuggestion {
    category: string | null;
    confidence: number;
}

const MIN_SUPPORTING_TRANSACTIONS = 2;
const MIN_CONFIDENCE = 0.5;

// Token -> category -> number of existing transactions whose description contains that token.
export type TokenCategoryMap = Map<string, Map<string, number>>;

export function tokenize(description: string): string[] {
    return Array.from(
        new Set(
            description
                .toLowerCase()
                .split(/[^a-z0-9]+/)
                .filter((t) => t.length >= 3),
        ),
    );
}

/**
 * Builds a token -> category -> count map from the account's existing categorised, non-deleted
 * transactions. One transaction contributes at most once per token (not once per occurrence) so a
 * repeated word inside a single description can't inflate its own weight.
 */
export function buildTokenCategoryMap(accountId: number): TokenCategoryMap {
    const rows = db
        .prepare(
            `SELECT description, category FROM transactions
             WHERE account_id = ? AND deleted_at IS NULL AND category IS NOT NULL AND category != ''`,
        )
        .all(accountId) as { description: string; category: string }[];

    const map: TokenCategoryMap = new Map();
    for (const row of rows) {
        for (const token of tokenize(row.description)) {
            let catCounts = map.get(token);
            if (!catCounts) {
                catCounts = new Map();
                map.set(token, catCounts);
            }
            catCounts.set(row.category, (catCounts.get(row.category) ?? 0) + 1);
        }
    }
    return map;
}

/**
 * Suggests a category for a description by tokenizing it and summing the per-token category counts
 * from `tokenMap`. Returns null unless the winning category has at least MIN_SUPPORTING_TRANSACTIONS
 * matches and accounts for at least MIN_CONFIDENCE of all token-category matches found.
 */
export function suggestCategory(description: string, tokenMap: TokenCategoryMap): CategorySuggestion {
    const combined = new Map<string, number>();

    for (const token of tokenize(description)) {
        const catCounts = tokenMap.get(token);
        if (!catCounts) continue;
        for (const [category, count] of catCounts) {
            combined.set(category, (combined.get(category) ?? 0) + count);
        }
    }

    let bestCategory: string | null = null;
    let bestCount = 0;
    let total = 0;
    for (const [category, count] of combined) {
        total += count;
        if (count > bestCount) {
            bestCategory = category;
            bestCount = count;
        }
    }

    if (bestCategory === null || total === 0) return { category: null, confidence: 0 };

    const confidence = bestCount / total;
    if (bestCount < MIN_SUPPORTING_TRANSACTIONS || confidence < MIN_CONFIDENCE) {
        return { category: null, confidence: 0 };
    }

    return { category: bestCategory, confidence };
}
