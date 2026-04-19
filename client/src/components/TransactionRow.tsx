import { useState } from 'react';
import type { Transaction } from '../types/transaction';
import { formatCents, formatDate, balanceColor } from '../utils/format';

interface Props {
    transaction: Transaction;
    isLast: boolean;
    gridTemplate: string;
    onEdit: (t: Transaction) => void;
    onDelete: (t: Transaction) => void;
}

const EditIcon = () => (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
        <path d="M13.586 3.586a2 2 0 112.828 2.828l-9 9A2 2 0 016 16H4a1 1 0 01-1-1v-2a2 2 0 01.586-1.414l9-9z" />
    </svg>
);
const TrashIcon = () => (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
);

export default function TransactionRow({ transaction, isLast, gridTemplate, onEdit, onDelete }: Props) {
    const [hov, setHov] = useState(false);
    const isIncome = transaction.type === 'income';

    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: gridTemplate,
                padding: '13px 20px',
                borderBottom: isLast ? 'none' : '1px solid var(--cream-mid)',
                alignItems: 'center',
                background: hov ? 'var(--cream)' : 'transparent',
                transition: 'background 0.12s',
            }}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
        >
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{formatDate(transaction.date)}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{transaction.category ?? ''}</span>
            <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>{transaction.description}</span>
            <span>
                <span style={{
                    display: 'inline-block',
                    padding: '3px 8px',
                    borderRadius: '99px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: isIncome ? 'var(--green-light)' : 'var(--red-light)',
                    color: isIncome ? 'var(--green)' : 'var(--red)',
                }}>
                    {transaction.type}
                </span>
            </span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: balanceColor(transaction.amount_cents), textAlign: 'right' }}>
                {formatCents(transaction.amount_cents)}
            </span>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '2px', opacity: hov ? 1 : 0, transition: 'opacity 0.15s' }}>
                <button aria-label={`Edit ${transaction.description}`} onClick={() => onEdit(transaction)} className="sid-icon-btn">
                    <EditIcon />
                </button>
                <button aria-label={`Delete ${transaction.description}`} onClick={() => onDelete(transaction)} className="sid-icon-btn danger">
                    <TrashIcon />
                </button>
            </div>
        </div>
    );
}
