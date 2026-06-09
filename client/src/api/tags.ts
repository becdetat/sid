import axios from 'axios';

export interface Tag {
    id: number;
    name: string;
    colour: string | null;
    created_at: string;
    deleted_at: string | null;
}

export interface TagWithUsage extends Tag {
    usage_count: number;
}

export async function listTags(): Promise<TagWithUsage[]> {
    const { data } = await axios.get<TagWithUsage[]>('/api/tags');
    return data;
}

export async function createTag(name: string, colour?: string): Promise<Tag> {
    const { data } = await axios.post<Tag>('/api/tags', { name, colour });
    return data;
}

export async function updateTag(id: number, payload: { name?: string; colour?: string | null }): Promise<Tag> {
    const { data } = await axios.put<Tag>(`/api/tags/${id}`, payload);
    return data;
}

export async function deleteTag(id: number): Promise<void> {
    await axios.delete(`/api/tags/${id}`);
}

export async function setTransactionTags(accountId: number, transactionId: number, tagIds: number[]): Promise<void> {
    await axios.put(`/api/accounts/${accountId}/transactions/${transactionId}/tags`, { tag_ids: tagIds });
}

export async function bulkTag(transactionIds: number[], add?: number[], remove?: number[]): Promise<void> {
    await axios.post('/api/transactions/bulk-tag', { transaction_ids: transactionIds, add, remove });
}

export interface SpendByTagRow {
    tag_id: number | null;
    name: string;
    colour: string | null;
    transaction_count: number;
    total_cents: number;
}

export async function getSpendByTag(params: { from?: string; to?: string; account_id?: number }): Promise<SpendByTagRow[]> {
    const p: Record<string, string> = {};
    if (params.from) p.from = params.from;
    if (params.to) p.to = params.to;
    if (params.account_id !== undefined) p.account_id = String(params.account_id);
    const { data } = await axios.get<SpendByTagRow[]>('/api/reports/spend-by-tag', { params: p });
    return data;
}
