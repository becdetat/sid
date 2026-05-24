import { useEffect } from 'react';

interface Props {
    onSelect: (format: 'MDY' | 'DMY') => void;
    onCancel: () => void;
}

export default function DateFormatPickerDialog({ onSelect, onCancel }: Props) {
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
                        Select date format
                    </h2>
                    <p className="text-sm text-[var(--text-secondary)] leading-[1.6] mb-6">
                        The date format in your CSV file could not be determined automatically. Please select the format used in your file.
                    </p>
                    <div className="flex flex-col gap-2.5 mb-6">
                        <button
                            className="sid-btn sid-btn-ghost text-left justify-start"
                            onClick={() => onSelect('MDY')}
                        >
                            Month/Day/Year &mdash; <span className="text-[var(--text-muted)]">MM/dd/yyyy</span>
                        </button>
                        <button
                            className="sid-btn sid-btn-ghost text-left justify-start"
                            onClick={() => onSelect('DMY')}
                        >
                            Day/Month/Year &mdash; <span className="text-[var(--text-muted)]">dd/MM/yyyy</span>
                        </button>
                    </div>
                    <div className="flex justify-end">
                        <button className="sid-btn sid-btn-ghost" onClick={onCancel}>Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
