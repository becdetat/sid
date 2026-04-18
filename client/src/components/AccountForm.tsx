import { useState } from 'react';

interface Props {
    initialName?: string;
    onSubmit: (name: string) => void;
    onCancel: () => void;
    title: string;
}

export default function AccountForm({ initialName = '', onSubmit, onCancel, title }: Props) {
    const [name, setName] = useState(initialName);
    const [error, setError] = useState('');

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) {
            setError('Name is required.');
            return;
        }
        onSubmit(name.trim());
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
                <h2 className="text-lg font-semibold mb-4">{title}</h2>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Account name"
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            setError('');
                        }}
                        autoFocus
                    />
                    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
                    <div className="mt-4 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
                        >
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
