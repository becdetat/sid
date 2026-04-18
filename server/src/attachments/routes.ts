import { Router } from 'express';
import multer from 'multer';
import * as repo from './repository';
import { findById as findTransaction } from '../transactions/repository';

const upload = multer({ storage: multer.memoryStorage() });

export const txAttachmentRouter = Router({ mergeParams: true });
export const attachmentRouter = Router();

txAttachmentRouter.get('/', (req, res) => {
    const txId = parseInt((req.params as Record<string, string>).txId, 10);
    if (!findTransaction(txId)) {
        res.status(404).json({ error: 'transaction not found' });
        return;
    }
    res.json(repo.findByTransaction(txId));
});

txAttachmentRouter.post('/', upload.array('files'), (req, res) => {
    const txId = parseInt((req.params as Record<string, string>).txId, 10);
    if (!findTransaction(txId)) {
        res.status(404).json({ error: 'transaction not found' });
        return;
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
        res.status(400).json({ error: 'no files provided' });
        return;
    }

    const attachments = files.map((f) =>
        repo.create(txId, f.originalname, f.mimetype, f.size, f.buffer),
    );
    res.status(201).json({ attachments });
});

attachmentRouter.get('/:id/download', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const attachment = repo.findBlobById(id);
    if (!attachment) {
        res.status(404).json({ error: 'attachment not found' });
        return;
    }
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.filename}"`);
    res.setHeader('Content-Type', attachment.mime_type);
    res.send(attachment.data);
});

attachmentRouter.delete('/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const deleted = repo.softDelete(id);
    if (!deleted) {
        res.status(404).json({ error: 'attachment not found' });
        return;
    }
    res.status(204).send();
});
