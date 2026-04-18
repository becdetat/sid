import { useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { listAttachments, deleteAttachment, downloadUrl } from '../api/attachments';
import type { Attachment } from '../types/attachment';

interface Props {
    transactionId?: number;
    pendingFiles: File[];
    onPendingFilesChange: (files: File[]) => void;
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AttachmentManager({ transactionId, pendingFiles, onPendingFilesChange }: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const queryClient = useQueryClient();

    const { data: existing = [] } = useQuery<Attachment[]>({
        queryKey: ['attachments', transactionId],
        queryFn: () => listAttachments(transactionId!),
        enabled: transactionId !== undefined,
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => deleteAttachment(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attachments', transactionId] });
        },
        onError: () => toast.error('Failed to delete attachment.'),
    });

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const selected = Array.from(e.target.files ?? []);
        if (selected.length === 0) return;
        onPendingFilesChange([...pendingFiles, ...selected]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    function removePending(index: number) {
        onPendingFilesChange(pendingFiles.filter((_, i) => i !== index));
    }

    return (
        <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Attachments</label>

            {existing.length > 0 && (
                <ul className="mb-2 flex flex-col gap-1">
                    {existing.map((a) => (
                        <li
                            key={a.id}
                            className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1"
                        >
                            <a
                                href={downloadUrl(a.id)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline truncate max-w-[200px]"
                                title={a.filename}
                            >
                                {a.filename}
                            </a>
                            <span className="text-gray-400 mx-2 shrink-0">{formatBytes(a.size_bytes)}</span>
                            <button
                                type="button"
                                onClick={() => deleteMutation.mutate(a.id)}
                                className="text-red-500 hover:text-red-700 shrink-0"
                                title="Delete attachment"
                            >
                                ✕
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {pendingFiles.length > 0 && (
                <ul className="mb-2 flex flex-col gap-1">
                    {pendingFiles.map((f, i) => (
                        <li
                            key={i}
                            className="flex items-center justify-between text-xs bg-blue-50 rounded px-2 py-1"
                        >
                            <span className="truncate max-w-[200px] text-gray-700" title={f.name}>
                                {f.name}
                            </span>
                            <span className="text-gray-400 mx-2 shrink-0">{formatBytes(f.size)}</span>
                            <button
                                type="button"
                                onClick={() => removePending(i)}
                                className="text-red-500 hover:text-red-700 shrink-0"
                                title="Remove"
                            >
                                ✕
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-blue-600 hover:underline"
            >
                + Add files
            </button>
            <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
            />
        </div>
    );
}
