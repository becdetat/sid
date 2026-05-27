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
    isSelected?: boolean;
    onSelect?: (id: number) => void;
    initialExpanded?: boolean;
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

export default function TransactionRow({ transaction, isLast, gridTemplate, onEdit, onDelete, isSelected = false, onSelect, initialExpanded = false }: Props) {
    const [expanded, setExpanded] = useState(initialExpanded);
    const isIncome = transaction.type === 'income';

    const { data: attachments = [] } = useQuery<Attachment[]>({
        queryKey: ['attachments', transaction.id],
        queryFn: () => listAttachments(transaction.id),
        enabled: expanded,
    });

    const isTemplate = !!transaction.recurrence && !transaction.recurrence_source_id;
    const isGenerated = !!transaction.recurrence_source_id;

    const typeBadge = (
        <span className="flex items-center gap-1">
            <span className={`inline-block px-2 py-[3px] rounded-full text-[11px] font-bold ${isIncome ? 'bg-[var(--green-light)] text-[var(--green)]' : 'bg-[var(--red-light)] text-[var(--red)]'}`}>
                {transaction.type}
            </span>
            {(isTemplate || isGenerated) && (
                <span title={isGenerated ? 'Auto-generated' : 'Recurring template'} className="text-[var(--text-muted)] text-[13px] leading-none">↻</span>
            )}
        </span>
    );

    return (
        <div style={{ borderBottom: isLast ? 'none' : '1px solid var(--cream-mid)', background: isSelected ? 'var(--cream)' : undefined }}>
            {/* Clickable row */}
            <div
                className="group cursor-pointer hover:bg-[var(--cream)] transition-colors duration-[120ms]"
                style={{ borderBottom: expanded ? '1px solid var(--cream-mid)' : 'none' }}
                onClick={() => setExpanded((e) => !e)}
            >
                {/* Mobile layout */}
                <div className="sm:hidden px-4 py-3 flex flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <div className="text-[13px] text-[var(--text-primary)] font-semibold leading-snug">
                                {transaction.description}
                            </div>
                            <div className="text-xs text-[var(--text-muted)] mt-0.5 flex flex-wrap items-center gap-1">
                                <span>{formatDate(transaction.date)}</span>
                                {transaction.category && (
                                    <>
                                        <span>·</span>
                                        <span>{transaction.category}</span>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="shrink-0 text-right">
                            <div className="text-[13px] font-bold" style={{ color: balanceColor(transaction.amount_cents) }}>
                                {formatCents(transaction.amount_cents)}
                            </div>
                            <div className="mt-0.5">{typeBadge}</div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-0.5">
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

                {/* Desktop layout */}
                <div
                    className="hidden sm:grid items-center px-5 py-[13px]"
                    style={{ gridTemplateColumns: gridTemplate }}
                >
                    {onSelect && (
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => { e.stopPropagation(); onSelect(transaction.id); }}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Select ${transaction.description}`}
                            className="w-4 h-4 cursor-pointer accent-[var(--teak)]"
                        />
                    )}
                    <span className="text-[13px] text-[var(--text-muted)]">{formatDate(transaction.date)}</span>
                    <span className="text-xs text-[var(--text-muted)]">{transaction.category ?? ''}</span>
                    <span className="text-[13px] text-[var(--text-primary)] font-semibold">{transaction.description}</span>
                    <span>{typeBadge}</span>
                    <span className="text-[13px] font-bold text-right" style={{ color: balanceColor(transaction.amount_cents) }}>
                        {formatCents(transaction.amount_cents)}
                    </span>
                    <div className="flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
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
            </div>

            {/* Expanded detail panel */}
            {expanded && (
                <div className="px-4 sm:px-5 py-4 bg-[var(--cream)] flex flex-col gap-3">
                    {isGenerated && (
                        <p className="text-xs text-[var(--text-muted)] italic">Auto-generated from recurring transaction</p>
                    )}
                    {isTemplate && (
                        <p className="text-xs text-[var(--text-muted)] italic">
                            Recurring {transaction.recurrence}{transaction.recurrence_end_date ? ` until ${transaction.recurrence_end_date}` : ''}
                        </p>
                    )}
                    {transaction.notes && (
                        <div>
                            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.07em] mb-1">Notes</div>
                            <p className="text-[13px] text-[var(--text-secondary)] leading-[1.5] whitespace-pre-wrap">{transaction.notes}</p>
                        </div>
                    )}

                    <div>
                        <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.07em] mb-1">Attachments</div>
                        {attachments.length === 0 ? (
                            <p className="text-[13px] text-[var(--text-muted)] italic">None</p>
                        ) : (
                            <ul className="flex flex-col gap-1">
                                {attachments.map((a) => (
                                    <li key={a.id} className="flex items-center gap-2 text-[13px]">
                                        <a
                                            href={downloadUrl(a.id)}
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="text-[var(--teak)] font-semibold no-underline"
                                        >
                                            {a.filename}
                                        </a>
                                        <span className="text-[var(--text-muted)] text-xs">{formatBytes(a.size_bytes)}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {transaction.created_at && (
                        <div>
                            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.07em] mb-1">Created</div>
                            <p className="text-[13px] text-[var(--text-secondary)]">{formatDateTime(transaction.created_at)}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
