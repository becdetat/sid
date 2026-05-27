export interface BackupAccount {
    id: number;
    name: string;
    created_at: string;
    deleted_at: string | null;
}

export interface BackupTransaction {
    id: number;
    account_id: number;
    category: string | null;
    description: string;
    amount_cents: number;
    type: 'income' | 'expense';
    date: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    recurrence: string | null;
    recurrence_end_date: string | null;
    recurrence_source_id: number | null;
}

export interface BackupAttachment {
    id: number;
    transaction_id: number;
    filename: string;
    mime_type: string;
    size_bytes: number;
    data: string; // base64-encoded
    created_at: string;
    deleted_at: string | null;
}

export interface BackupBudget {
    id: number;
    account_id: number;
    category: string;
    amount_cents: number;
    period: 'monthly' | 'weekly';
    warning_threshold: number;
    danger_threshold: number;
    created_at: string;
    deleted_at: string | null;
}

export interface BackupSavedView {
    id: number;
    scope: 'account' | 'global';
    account_id: number | null;
    name: string;
    filters: string; // JSON-encoded
    is_default: number;
    position: number;
    created_at: string;
    deleted_at: string | null;
}

export interface BackupPayload {
    version: number;
    exported_at: string;
    accounts: BackupAccount[];
    transactions: BackupTransaction[];
    attachments: BackupAttachment[];
    budgets: BackupBudget[];
    saved_views?: BackupSavedView[];
}

export interface ImportResult {
    accounts: number;
    transactions: number;
    attachments: number;
    budgets: number;
    saved_views: number;
}
