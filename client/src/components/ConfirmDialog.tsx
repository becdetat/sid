import { useEffect } from 'react';

interface Props {
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmLabel?: string;
}

export default function ConfirmDialog({ message, onConfirm, onCancel, confirmLabel = 'Delete' }: Props) {
    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onCancel]);

    return (
        <div className="sid-modal-overlay anim-fade" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
            <div className="sid-modal anim-slide-up">
                <div className="sid-modal-trim" />
                <div className="sid-modal-body">
                    <h2 className="font-display text-lg font-bold text-[var(--teak-dark)] mb-3">
                        Are you sure?
                    </h2>
                    <p className="text-sm text-[var(--text-secondary)] leading-[1.6] mb-6">
                        {message}
                    </p>
                    <div className="flex justify-end gap-2.5">
                        <button className="sid-btn sid-btn-ghost" onClick={onCancel}>Cancel</button>
                        <button className="sid-btn sid-btn-danger" onClick={onConfirm}>{confirmLabel}</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
