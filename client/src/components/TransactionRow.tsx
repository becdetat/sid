import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Transaction } from '../types/transaction';
import type { Attachment } from '../types/attachment';
import { formatCents, formatDate, formatDateTime, balanceColor } from '../utils/format';
import { listAttachments, downloadUrl } from '../api/attachments';

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

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TransactionRow({ transaction, isLast, gridTemplate, onEdit, onDelete }: Props) {
    const [hov, setHov] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const isIncome = transaction.type === 'income';

    const { data: attachments = [] } = useQuery<Attachment[]>({
        queryKey: ['attachments', transaction.id],
        queryFn: () => listAttachments(transaction.id),
        enabled: expanded,
    });

    return (
        <div style={{ borderBottom: isLast ? 'none' : '1px solid var(--cream-mid)' }}>
            {/* Main row */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: gridTemplate,
                    padding: '13px 20px',
                    alignItems: 'center',
                    background: hov ? 'var(--cream)' : 'transparent',
                    transition: 'background 0.12s',
                    cursor: 'pointer',
                    borderBottom: expanded ? '1px solid var(--cream-mid)' : 'none',
                }}
                onClick={() => setExpanded((e) => !e)}
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
                    <button
                        aria-label={`Edit ${transaction.description}`}
                        onClick={(e) => { e.stopPropagation(); onEdit(transaction); }}
                        className="sid-icon-btn"
                    >
                        <EditIcon />
                    </button>
                    <button
                        aria-label={`Delete ${transaction.description}`}
                        onClick={(e) => { e.stopPropagation(); onDelete(transaction); }}
                        className="sid-icon-btn danger"
                    >
                        <TrashIcon />
                    </button>
                </div>
            </div>

            {/* Expanded detail panel */}
            {expanded && (
                <div style={{ padding: '16px 20px', background: 'var(--cream)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {transaction.notes && (
                        <div>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>Notes</div>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{transaction.notes}</p>
                        </div>
                    )}

                    <div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>Attachments</div>
                        {attachments.length === 0 ? (
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>None</p>
                        ) : (
                            <ul style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {attachments.map((a) => (
                                    <li key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                        <a
                                            href={downloadUrl(a.id)}
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            style={{ color: 'var(--teak)', fontWeight: 600, textDecoration: 'none' }}
                                        >
                                            {a.filename}
                                        </a>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{formatBytes(a.size_bytes)}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {transaction.created_at && (
                        <div>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>Created</div>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{formatDateTime(transaction.created_at)}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
