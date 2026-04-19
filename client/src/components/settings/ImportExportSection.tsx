import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import axios from 'axios';
import { exportBackup, importBackup } from '../../api/backup';

type Mode = 'merge' | 'wipe';

export default function ImportExportSection() {
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [mode, setMode] = useState<Mode>('merge');
    const [exportLoading, setExportLoading] = useState(false);

    const importMutation = useMutation({
        mutationFn: () => importBackup(selectedFile!, mode),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            toast.success(
                `Imported ${result.accounts} account${result.accounts !== 1 ? 's' : ''}, ${result.transactions} transaction${result.transactions !== 1 ? 's' : ''}, ${result.attachments} attachment${result.attachments !== 1 ? 's' : ''}.`,
            );
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        },
        onError: (err) => {
            const message =
                axios.isAxiosError(err) && err.response?.data?.error
                    ? (err.response.data as { error: string }).error
                    : 'Import failed.';
            toast.error(message);
        },
    });

    async function handleExport() {
        setExportLoading(true);
        try {
            await exportBackup();
        } catch {
            toast.error('Export failed.');
        } finally {
            setExportLoading(false);
        }
    }

    const labelStyle: React.CSSProperties = {
        fontSize: '13px',
        fontWeight: 600,
        color: 'var(--text-secondary)',
        fontFamily: 'var(--font-body)',
        marginBottom: '4px',
        display: 'block',
    };

    const descStyle: React.CSSProperties = {
        fontSize: '13px',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-body)',
        marginBottom: '16px',
    };

    const dividerStyle: React.CSSProperties = {
        borderTop: '1px solid var(--border)',
        margin: '32px 0',
    };

    return (
        <section>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, color: 'var(--teak-dark)', margin: '0 0 24px' }}>
                Import / Export
            </h2>

            {/* Export */}
            <div>
                <span style={labelStyle}>Export</span>
                <p style={descStyle}>
                    Download a full backup of all accounts, transactions, and attachments (including deleted records) as a ZIP file.
                </p>
                <button
                    className="sid-btn sid-btn-primary"
                    onClick={handleExport}
                    disabled={exportLoading}
                >
                    {exportLoading ? 'Exporting…' : 'Export'}
                </button>
            </div>

            <div style={dividerStyle} />

            {/* Import */}
            <div>
                <span style={labelStyle}>Import</span>
                <p style={descStyle}>
                    Restore or merge data from a Sid backup ZIP file.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label className="sid-label">Backup file</label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".zip"
                            className="sid-input"
                            style={{ cursor: 'pointer' }}
                            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <label className="sid-label">Import mode</label>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                            <input
                                type="radio"
                                name="import-mode"
                                value="merge"
                                checked={mode === 'merge'}
                                onChange={() => setMode('merge')}
                                style={{ marginTop: '2px' }}
                            />
                            <span style={{ fontSize: '14px', fontFamily: 'var(--font-body)' }}>
                                <strong>Merge</strong> — add imported data alongside existing data. Account names that conflict will be renamed.
                            </span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                            <input
                                type="radio"
                                name="import-mode"
                                value="wipe"
                                checked={mode === 'wipe'}
                                onChange={() => setMode('wipe')}
                                style={{ marginTop: '2px' }}
                            />
                            <span style={{ fontSize: '14px', fontFamily: 'var(--font-body)' }}>
                                <strong>Wipe and restore</strong> — delete all existing data and replace with the backup.
                            </span>
                        </label>
                    </div>

                    {mode === 'wipe' && (
                        <div style={{
                            background: 'var(--red-soft, #fff0f0)',
                            border: '1px solid var(--red, #d9534f)',
                            borderRadius: '8px',
                            padding: '12px 16px',
                            fontSize: '13px',
                            color: 'var(--red, #d9534f)',
                            fontFamily: 'var(--font-body)',
                        }}>
                            <strong>Warning:</strong> This will permanently delete all existing accounts, transactions, and attachments before restoring from the backup. This cannot be undone.
                        </div>
                    )}

                    <div>
                        <button
                            className="sid-btn sid-btn-primary"
                            disabled={!selectedFile || importMutation.isPending}
                            onClick={() => importMutation.mutate()}
                        >
                            {importMutation.isPending ? 'Importing…' : 'Import'}
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
