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

export interface BackupPayload {
    version: number;
    exported_at: string;
    accounts: BackupAccount[];
    transactions: BackupTransaction[];
    attachments: BackupAttachment[];
}

export interface ImportResult {
    accounts: number;
    transactions: number;
    attachments: number;
}
