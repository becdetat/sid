import { useState } from 'react';

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
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl">
                <h2 className="text-lg font-semibold mb-4">
                    Export — {accountName}
                </h2>
                <div className="flex flex-col gap-3 mb-4">
                    <label className="flex flex-col gap-1 text-sm text-gray-700">
                        From
                        <input
                            type="date"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                            className="border border-gray-300 rounded px-3 py-2 text-sm"
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-sm text-gray-700">
                        To
                        <input
                            type="date"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            className="border border-gray-300 rounded px-3 py-2 text-sm"
                        />
                    </label>
                </div>
                {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
                <div className="flex justify-end gap-2">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDownload}
                        className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
                    >
                        Download
                    </button>
                </div>
            </div>
        </div>
    );
}
