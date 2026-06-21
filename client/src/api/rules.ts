import axios from 'axios';

export interface Rule {
    id: number;
    name: string;
    priority: number;
    enabled: number;
    account_id: number | null;
    match_type: 'substring' | 'regex';
    description_pattern: string | null;
    amount_min_cents: number | null;
    amount_max_cents: number | null;
    tx_type: 'income' | 'expense' | 'transfer' | null;
    set_category: string | null;
    add_tag_ids: number[] | null;
    notes_prefix: string | null;
    last_run_at: string | null;
    last_match_count: number;
    created_at: string;
    deleted_at: string | null;
}

export interface RuleInput {
    name: string;
    priority?: number;
    enabled?: boolean;
    account_id?: number | null;
    match_type?: 'substring' | 'regex';
    description_pattern?: string | null;
    amount_min_cents?: number | null;
    amount_max_cents?: number | null;
    tx_type?: 'income' | 'expense' | 'transfer' | null;
    set_category?: string | null;
    add_tag_ids?: number[] | null;
    notes_prefix?: string | null;
}

export interface RunResult {
    affected: number;
    per_rule: { id: number; name: string; match_count: number }[];
}

export async function listRules(): Promise<Rule[]> {
    const { data } = await axios.get<Rule[]>('/api/rules');
    return data;
}

export async function createRule(input: RuleInput): Promise<Rule> {
    const { data } = await axios.post<Rule>('/api/rules', input);
    return data;
}

export async function updateRule(id: number, input: Partial<RuleInput>): Promise<Rule> {
    const { data } = await axios.put<Rule>(`/api/rules/${id}`, input);
    return data;
}

export async function deleteRule(id: number): Promise<void> {
    await axios.delete(`/api/rules/${id}`);
}

export async function dryRunRule(input: Partial<RuleInput>): Promise<{ match_count: number }> {
    const { data } = await axios.post<{ match_count: number }>('/api/rules/dry-run', input);
    return data;
}

export async function runRules(options: {
    from?: string;
    to?: string;
    account_id?: number;
    dry_run?: boolean;
}): Promise<RunResult> {
    const { data } = await axios.post<RunResult>('/api/rules/run', options);
    return data;
}
