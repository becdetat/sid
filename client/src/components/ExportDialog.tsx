import { useState, useEffect } from 'react';

interface Props {
    accountId: number;
    accountName: string;
    defaultFrom?: string;
    defaultTo?: string;
    onCancel: () => void;
}

export default function ExportDialog({ accountId, accountName, defaultFrom = '', defaultTo = '', onCancel }: Props) {
    const [from, setFrom] = useState(defaultFrom);
    const [to, setTo] = useState(defaultTo);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onCancel]);

    function handleDownload() {
        if (!from) { setError('Start date is required.'); return; }
        if (!to) { setError('End date is required.'); return; }
        if (from > to) { setError('Start date must be on or before end date.'); return; }
        setError(null);
        const a = document.createElement('a');
        a.href = `/api/accounts/${accountId}/export?from=${from}&to=${to}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        onCancel();
    }

    return (
        <div className="sid-modal-overlay anim-fade" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
            <div className="sid-modal anim-slide-up">
                <div className="sid-modal-trim" />
                <div className="sid-modal-body">
                    <h2 className="sid-modal-title">Export — {accountName}</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label className="sid-label">From</label>
                            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="sid-input" />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label className="sid-label">To</label>
                            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="sid-input" />
                        </div>
                    </div>
                    {error && <p style={{ fontSize: '12px', color: 'var(--red)', marginBottom: '12px' }}>{error}</p>}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button className="sid-btn sid-btn-ghost" onClick={onCancel}>Cancel</button>
                        <button className="sid-btn sid-btn-primary" onClick={handleDownload}>Download</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
