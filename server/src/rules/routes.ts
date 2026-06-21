import { Router } from 'express';
import * as repo from './repository';
import * as service from './service';
import * as tagRepo from '../tags/repository';
import type { Rule } from './repository';

const router = Router();

function validateRuleBody(b: Record<string, unknown>): { error: string } | null {
    if (b.name !== undefined) {
        if (typeof b.name !== 'string' || b.name.trim().length < 1 || b.name.trim().length > 60) {
            return { error: 'Name must be 1–60 characters' };
        }
    }

    if (b.match_type !== undefined && b.match_type !== 'substring' && b.match_type !== 'regex') {
        return { error: 'match_type must be substring or regex' };
    }

    if (b.description_pattern !== undefined && b.description_pattern !== null) {
        if (typeof b.description_pattern !== 'string') {
            return { error: 'description_pattern must be a string' };
        }
        if (b.description_pattern.length > 200) {
            return { error: 'Pattern too long' };
        }
        const matchType = typeof b.match_type === 'string' ? b.match_type : 'substring';
        if (matchType === 'regex') {
            try {
                new RegExp(b.description_pattern, 'i');
            } catch (e) {
                return { error: `Invalid regex: ${(e as Error).message}` };
            }
        }
    }

    if (
        b.amount_min_cents !== undefined && b.amount_min_cents !== null &&
        b.amount_max_cents !== undefined && b.amount_max_cents !== null &&
        (b.amount_min_cents as number) > (b.amount_max_cents as number)
    ) {
        return { error: 'Min must be ≤ max' };
    }

    if (b.tx_type !== undefined && b.tx_type !== null) {
        if (b.tx_type !== 'income' && b.tx_type !== 'expense' && b.tx_type !== 'transfer') {
            return { error: 'tx_type must be income, expense, or transfer' };
        }
    }

    if (b.add_tag_ids !== undefined && b.add_tag_ids !== null) {
        if (!Array.isArray(b.add_tag_ids) || !(b.add_tag_ids as unknown[]).every((x) => typeof x === 'number')) {
            return { error: 'add_tag_ids must be an array of numbers' };
        }
    }

    return null;
}

function hasCondition(b: Record<string, unknown>): boolean {
    return (
        (typeof b.description_pattern === 'string' && b.description_pattern.trim() !== '') ||
        (b.amount_min_cents !== undefined && b.amount_min_cents !== null) ||
        (b.amount_max_cents !== undefined && b.amount_max_cents !== null) ||
        (b.tx_type !== undefined && b.tx_type !== null) ||
        (b.account_id !== undefined && b.account_id !== null)
    );
}

function hasAction(b: Record<string, unknown>): boolean {
    return (
        (typeof b.set_category === 'string' && b.set_category.trim() !== '') ||
        (Array.isArray(b.add_tag_ids) && (b.add_tag_ids as unknown[]).length > 0) ||
        (typeof b.notes_prefix === 'string' && b.notes_prefix.trim() !== '')
    );
}

router.get('/', (_req, res) => {
    res.json(repo.list());
});

router.post('/dry-run', (req, res) => {
    const b = req.body as Record<string, unknown>;

    const validationError = validateRuleBody(b);
    if (validationError) {
        res.status(400).json(validationError);
        return;
    }

    const matchCount = service.dryRunRule({
        account_id: (b.account_id as number | null) ?? null,
        match_type: (b.match_type as 'substring' | 'regex') ?? 'substring',
        description_pattern: (b.description_pattern as string | null) ?? null,
        amount_min_cents: (b.amount_min_cents as number | null) ?? null,
        amount_max_cents: (b.amount_max_cents as number | null) ?? null,
        tx_type: (b.tx_type as 'income' | 'expense' | 'transfer' | null) ?? null,
    });

    res.json({ match_count: matchCount });
});

router.post('/run', (req, res) => {
    const b = req.body as Record<string, unknown>;

    const result = service.runAcross({
        from: typeof b.from === 'string' ? b.from : undefined,
        to: typeof b.to === 'string' ? b.to : undefined,
        account_id: typeof b.account_id === 'number' ? b.account_id : undefined,
        dry_run: b.dry_run === true,
    });

    res.json(result);
});

router.post('/', (req, res) => {
    const b = req.body as Record<string, unknown>;

    if (typeof b.name !== 'string' || b.name.trim().length < 1 || b.name.trim().length > 60) {
        res.status(400).json({ error: 'Name must be 1–60 characters' });
        return;
    }

    const validationError = validateRuleBody(b);
    if (validationError) {
        res.status(400).json(validationError);
        return;
    }

    if (!hasCondition(b)) {
        res.status(400).json({ error: 'Specify at least one condition' });
        return;
    }

    if (!hasAction(b)) {
        res.status(400).json({ error: 'Specify at least one action' });
        return;
    }

    if (Array.isArray(b.add_tag_ids)) {
        for (const tagId of b.add_tag_ids as number[]) {
            if (!tagRepo.findById(tagId)) {
                res.status(400).json({ error: 'Tag not found' });
                return;
            }
        }
    }

    const rule = repo.create({
        name: (b.name as string).trim(),
        priority: typeof b.priority === 'number' ? b.priority : 100,
        enabled: b.enabled !== false,
        account_id: (b.account_id as number | null) ?? null,
        match_type: (b.match_type as 'substring' | 'regex') ?? 'substring',
        description_pattern: (b.description_pattern as string | null) ?? null,
        amount_min_cents: (b.amount_min_cents as number | null) ?? null,
        amount_max_cents: (b.amount_max_cents as number | null) ?? null,
        tx_type: (b.tx_type as 'income' | 'expense' | 'transfer' | null) ?? null,
        set_category: (b.set_category as string | null) ?? null,
        add_tag_ids: Array.isArray(b.add_tag_ids) ? (b.add_tag_ids as number[]) : null,
        notes_prefix: (b.notes_prefix as string | null) ?? null,
    });

    res.status(201).json(rule);
});

router.put('/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const existing = repo.findById(id);
    if (!existing) {
        res.status(404).json({ error: 'Rule not found' });
        return;
    }

    const b = req.body as Record<string, unknown>;

    const validationError = validateRuleBody(b);
    if (validationError) {
        res.status(400).json(validationError);
        return;
    }

    // Merge with existing values to validate combined conditions/actions
    const mergedConditions = {
        description_pattern: 'description_pattern' in b ? b.description_pattern : existing.description_pattern,
        amount_min_cents: 'amount_min_cents' in b ? b.amount_min_cents : existing.amount_min_cents,
        amount_max_cents: 'amount_max_cents' in b ? b.amount_max_cents : existing.amount_max_cents,
        tx_type: 'tx_type' in b ? b.tx_type : existing.tx_type,
        account_id: 'account_id' in b ? b.account_id : existing.account_id,
    };
    const mergedActions = {
        set_category: 'set_category' in b ? b.set_category : existing.set_category,
        add_tag_ids: 'add_tag_ids' in b ? b.add_tag_ids : existing.add_tag_ids,
        notes_prefix: 'notes_prefix' in b ? b.notes_prefix : existing.notes_prefix,
    };

    if (!hasCondition(mergedConditions)) {
        res.status(400).json({ error: 'Specify at least one condition' });
        return;
    }
    if (!hasAction(mergedActions)) {
        res.status(400).json({ error: 'Specify at least one action' });
        return;
    }

    if (Array.isArray(b.add_tag_ids)) {
        for (const tagId of b.add_tag_ids as number[]) {
            if (!tagRepo.findById(tagId)) {
                res.status(400).json({ error: 'Tag not found' });
                return;
            }
        }
    }

    const updated = repo.update(id, {
        name: typeof b.name === 'string' ? b.name.trim() : undefined,
        priority: typeof b.priority === 'number' ? b.priority : undefined,
        enabled: typeof b.enabled === 'boolean' ? b.enabled : undefined,
        account_id: 'account_id' in b ? (b.account_id as number | null) : undefined,
        match_type: b.match_type as 'substring' | 'regex' | undefined,
        description_pattern: 'description_pattern' in b ? (b.description_pattern as string | null) : undefined,
        amount_min_cents: 'amount_min_cents' in b ? (b.amount_min_cents as number | null) : undefined,
        amount_max_cents: 'amount_max_cents' in b ? (b.amount_max_cents as number | null) : undefined,
        tx_type: 'tx_type' in b ? (b.tx_type as 'income' | 'expense' | 'transfer' | null) : undefined,
        set_category: 'set_category' in b ? (b.set_category as string | null) : undefined,
        add_tag_ids: 'add_tag_ids' in b ? (b.add_tag_ids as number[] | null) : undefined,
        notes_prefix: 'notes_prefix' in b ? (b.notes_prefix as string | null) : undefined,
    });

    res.json(updated);
});

router.delete('/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const ok = repo.softDelete(id);
    if (!ok) {
        res.status(404).json({ error: 'Rule not found' });
        return;
    }
    res.status(204).send();
});

export default router;
