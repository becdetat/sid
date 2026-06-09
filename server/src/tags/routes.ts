import { Router } from 'express';
import * as repo from './repository';

const router = Router();

router.get('/', (_req, res) => {
    res.json(repo.list());
});

router.post('/', (req, res) => {
    const { name, colour } = req.body as { name?: string; colour?: string };
    if (!name || name.trim().length === 0 || name.trim().length > 40) {
        res.status(400).json({ error: 'Tag name must be 1–40 characters' });
        return;
    }
    if (name.includes(',')) {
        res.status(400).json({ error: 'Tag names cannot contain commas' });
        return;
    }
    if (colour !== undefined && colour !== null && !/^#[0-9A-Fa-f]{6}$/.test(colour)) {
        res.status(400).json({ error: 'Colour must be a hex value like #7AB1FF' });
        return;
    }
    const tag = repo.create(name.trim(), colour ?? undefined);
    res.status(201).json(tag);
});

router.put('/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { name, colour } = req.body as { name?: string; colour?: string | null };
    if (name !== undefined) {
        if (!name || name.trim().length === 0 || name.trim().length > 40) {
            res.status(400).json({ error: 'Tag name must be 1–40 characters' });
            return;
        }
        if (name.includes(',')) {
            res.status(400).json({ error: 'Tag names cannot contain commas' });
            return;
        }
    }
    if (colour !== undefined && colour !== null && !/^#[0-9A-Fa-f]{6}$/.test(colour)) {
        res.status(400).json({ error: 'Colour must be a hex value like #7AB1FF' });
        return;
    }
    const tag = repo.update(id, name?.trim(), colour);
    if (!tag) {
        res.status(404).json({ error: 'Tag not found' });
        return;
    }
    res.json(tag);
});

router.delete('/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const ok = repo.softDelete(id);
    if (!ok) {
        res.status(404).json({ error: 'Tag not found' });
        return;
    }
    res.status(204).send();
});

export default router;
