import { Router } from 'express';
import * as repo from './repository';

const router = Router();

router.get('/', (_req, res) => {
    res.json(repo.findAll());
});

router.post('/', (req, res) => {
    const { name } = req.body as { name?: string };
    if (!name || name.trim() === '') {
        res.status(400).json({ error: 'name is required' });
        return;
    }
    if (repo.findByName(name.trim())) {
        res.status(409).json({ error: 'name already exists' });
        return;
    }
    const account = repo.create(name.trim());
    res.status(201).json(account);
});

router.get('/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const account = repo.findById(id);
    if (!account) {
        res.status(404).json({ error: 'account not found' });
        return;
    }
    res.json(account);
});

router.put('/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { name } = req.body as { name?: string };
    if (!name || name.trim() === '') {
        res.status(400).json({ error: 'name is required' });
        return;
    }
    const existing = repo.findByName(name.trim());
    if (existing && existing.id !== id) {
        res.status(409).json({ error: 'name already exists' });
        return;
    }
    const account = repo.update(id, name.trim());
    if (!account) {
        res.status(404).json({ error: 'account not found' });
        return;
    }
    res.json(account);
});

router.delete('/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const deleted = repo.softDelete(id);
    if (!deleted) {
        res.status(404).json({ error: 'account not found' });
        return;
    }
    res.status(204).send();
});

export default router;
