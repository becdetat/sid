import { useState, useEffect } from 'react';

interface Props {
    initialName?: string;
    onSubmit: (name: string) => void;
    onCancel: () => void;
    title: string;
    serverError?: string;
}

export default function AccountForm({ initialName = '', onSubmit, onCancel, title, serverError }: Props) {
    const [name, setName] = useState(initialName);
    const [error, setError] = useState('');

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onCancel]);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) { setError('Name is required.'); return; }
        onSubmit(name.trim());
    }

    return (
        <div className="sid-modal-overlay anim-fade" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
            <div className="sid-modal anim-slide-up">
                <div className="sid-modal-trim" />
                <div className="sid-modal-body">
                    <h2 className="sid-modal-title">{title}</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="flex flex-col gap-[5px]">
                            <label className="sid-label">Account name</label>
                            <input
                                type="text"
                                className="sid-input"
                                placeholder="e.g. Office expenses"
                                value={name}
                                onChange={(e) => { setName(e.target.value); setError(''); }}
                                autoFocus
                            />
                            {(error || serverError) && <span className="text-xs text-[var(--red)]">{error || serverError}</span>}
                        </div>
                        <div className="flex justify-end gap-2.5 mt-5">
                            <button type="button" className="sid-btn sid-btn-ghost" onClick={onCancel}>Cancel</button>
                            <button type="submit" className="sid-btn sid-btn-primary">Save</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
