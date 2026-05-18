interface Props {
    selectedCount: number;
    onDelete: () => void;
    onExport: () => void;
    onClear: () => void;
}

export default function BulkActionBar({ selectedCount, onDelete, onExport, onClear }: Props) {
    if (selectedCount === 0) return null;

    return (
        <div className="flex items-center gap-3 px-4 py-2.5 mb-3 bg-[var(--cream)] rounded-xl [border:1.5px_solid_var(--border)] shadow-[var(--shadow-sm)]">
            <span className="text-[13px] font-semibold text-[var(--text-secondary)] font-body flex-1">
                {selectedCount} selected
            </span>
            <button className="sid-btn sid-btn-ghost sid-btn-sm" onClick={onExport}>
                Export selected
            </button>
            <button className="sid-btn sid-btn-danger sid-btn-sm" onClick={onDelete}>
                Delete selected
            </button>
            <button
                aria-label="Clear selection"
                className="sid-icon-btn"
                onClick={onClear}
                title="Clear selection"
            >
                <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>
        </div>
    );
}
