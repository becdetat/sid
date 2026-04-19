export interface ImportRow {
    date: string;
    category: string | null;
    description: string;
    type: 'income' | 'expense';
    amount: number;
    notes: string | null;
}

export type ParseResult = { rows: ImportRow[] } | { error: string };

const REQUIRED_HEADERS = ['date', 'category', 'description', 'type', 'amount', 'notes'];

function isValidDate(s: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
}

// RFC 4180-compatible CSV parser — handles quoted fields with embedded commas,
// newlines, and escaped quotes ("").
function parseCSV(text: string): string[][] {
    const records: string[][] = [];
    const len = text.length;
    let i = 0;

    while (i < len) {
        const record: string[] = [];

        while (true) {
            let field = '';

            if (i < len && text[i] === '"') {
                i++; // skip opening quote
                while (i < len) {
                    if (text[i] === '"') {
                        if (i + 1 < len && text[i + 1] === '"') {
                            field += '"';
                            i += 2;
                        } else {
                            i++; // skip closing quote
                            break;
                        }
                    } else {
                        field += text[i++];
                    }
                }
            } else {
                while (i < len && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') {
                    field += text[i++];
                }
            }

            record.push(field);

            if (i >= len || text[i] === '\n' || text[i] === '\r') break;
            if (text[i] === ',') i++;
        }

        if (i < len && text[i] === '\r') i++;
        if (i < len && text[i] === '\n') i++;

        records.push(record);
    }

    return records;
}

export function parseImportCSV(buffer: Buffer): ParseResult {
    const text = buffer.toString('utf-8');
    const records = parseCSV(text);

    if (records.length === 0 || records[0].every((f) => f.trim() === '')) {
        return { error: 'File is empty or could not be parsed' };
    }

    const headerRow = records[0].map((h) => h.trim().toLowerCase());

    const missing = REQUIRED_HEADERS.filter((h) => !headerRow.includes(h));
    if (missing.length > 0) {
        const display = missing.map((h) => h.charAt(0).toUpperCase() + h.slice(1));
        return { error: `Missing required columns: ${display.join(', ')}` };
    }

    const col: Record<string, number> = {};
    headerRow.forEach((h, i) => {
        col[h] = i;
    });

    const rows: ImportRow[] = [];

    for (let i = 1; i < records.length; i++) {
        const rec = records[i];

        // Skip blank rows
        if (rec.every((f) => f.trim() === '')) continue;

        const rowNum = i;
        const date = (rec[col['date']] ?? '').trim();
        const category = (rec[col['category']] ?? '').trim();
        const description = (rec[col['description']] ?? '').trim();
        const typeRaw = (rec[col['type']] ?? '').trim().toLowerCase();
        const amountRaw = (rec[col['amount']] ?? '').trim();
        const notes = (rec[col['notes']] ?? '').trim();

        if (!date) return { error: `Row ${rowNum}: date is required` };
        if (!isValidDate(date)) return { error: `Row ${rowNum}: invalid date, expected YYYY-MM-DD` };
        if (!description) return { error: `Row ${rowNum}: description is required` };
        if (typeRaw !== 'income' && typeRaw !== 'expense')
            return { error: `Row ${rowNum}: type must be 'income' or 'expense'` };
        if (!amountRaw) return { error: `Row ${rowNum}: amount is required` };
        const amount = parseFloat(amountRaw);
        if (isNaN(amount) || amount <= 0)
            return { error: `Row ${rowNum}: amount must be a positive number` };

        rows.push({
            date,
            category: category || null,
            description,
            type: typeRaw as 'income' | 'expense',
            amount,
            notes: notes || null,
        });
    }

    return { rows };
}
