import axios from 'axios';
import type { Attachment } from '../types/attachment';

export async function listAttachments(txId: number): Promise<Attachment[]> {
    const { data } = await axios.get<Attachment[]>(`/api/transactions/${txId}/attachments`);
    return data;
}

export async function uploadAttachments(txId: number, files: File[]): Promise<Attachment[]> {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    const { data } = await axios.post<{ attachments: Attachment[] }>(
        `/api/transactions/${txId}/attachments`,
        form,
    );
    return data.attachments;
}

export function downloadUrl(id: number): string {
    return `/api/attachments/${id}/download`;
}

export async function deleteAttachment(id: number): Promise<void> {
    await axios.delete(`/api/attachments/${id}`);
}
