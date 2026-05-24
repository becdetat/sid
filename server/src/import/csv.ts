export interface ImportRow {
    date: string;
    category: string;
    description: string;
    type: 'income' | 'expense';
    amount: number;
    notes: string | null;
}

export interface RowError {
    row: number;
    error: string;
}

export type DateFormat = 'YMD' | 'MDY' | 'DMY';

export type ParseResult =
    | { rows: ImportRow[] }
    | { errors: RowError[] }
    | { ambiguousDateFormat: true };

const REQUIRED_HEADERS = ['date', 'category', 'description', 'type', 'amount', 'notes'];

function normaliseDateSeparator(s: string): string {
    return s.replace(/\//g, '-');
}

function parseDate(s: string, format: DateFormat): string | null {
    const n = normaliseDateSeparator(s);
    if (format === 'YMD') {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(n)) return null;
        return isNaN(Date.parse(n)) ? null : n;
    }
    const m = n.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!m) return null;
    const [, a, b, year] = m;
    const iso = format === 'MDY' ? `${year}-${a}-${b}` : `${year}-${b}-${a}`;
    return isNaN(Date.parse(iso)) ? null : iso;
}

function detectDateFormat(dates: string[]): DateFormat | 'ambiguous' | 'error' {
    const normalised = dates.map(normaliseDateSeparator);

    const ymdPattern = /^\d{4}-\d{2}-\d{2}$/;
    const dmyPattern = /^\d{2}-\d{2}-\d{4}$/;

    const ymds = normalised.filter((d) => ymdPattern.test(d));
    const others = normalised.filter((d) => !ymdPattern.test(d));

    // Mixed file: some YMD, some not
    if (ymds.length > 0 && others.length > 0) return 'error';

    // All YMD
    if (others.length === 0) return 'YMD';

    // All non-YMD: need DMY/MDY disambiguation
    if (!others.every((d) => dmyPattern.test(d))) return 'error';

    let impliesDMY = false;
    let impliesMDY = false;

    for (const d of others) {
        const [first, second] = d.split('-').map(Number);
        if (first > 12) impliesDMY = true;
        if (second > 12) impliesMDY = true;
    }

    if (impliesDMY && impliesMDY) return 'error';
    if (impliesDMY) return 'DMY';
    if (impliesMDY) return 'MDY';
    return 'ambiguous';
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

export function parseImportCSV(buffer: Buffer, dateFormat?: DateFormat): ParseResult {
    const text = buffer.toString('utf-8');
    const records = parseCSV(text);

    if (records.length === 0 || records[0].every((f) => f.trim() === '')) {
        return { errors: [{ row: 0, error: 'File is empty or could not be parsed' }] };
    }

    const headerRow = records[0].map((h) => h.trim().toLowerCase());

    const missing = REQUIRED_HEADERS.filter((h) => !headerRow.includes(h));
    if (missing.length > 0) {
        const display = missing.map((h) => h.charAt(0).toUpperCase() + h.slice(1));
        return { errors: [{ row: 0, error: `Missing required columns: ${display.join(', ')}` }] };
    }

    const col: Record<string, number> = {};
    headerRow.forEach((h, i) => { col[h] = i; });

    const dataRecords: { rowNum: number; rec: string[] }[] = [];
    for (let i = 1; i < records.length; i++) {
        const rec = records[i];
        if (rec.every((f) => f.trim() === '')) continue;
        dataRecords.push({ rowNum: i, rec });
    }

    // Detect date format from raw date values when not provided by caller
    const resolvedFormat: DateFormat | 'ambiguous' | 'error' = dateFormat
        ? dateFormat
        : detectDateFormat(dataRecords.map(({ rec }) => (rec[col['date']] ?? '').trim()).filter(Boolean));

    if (resolvedFormat === 'ambiguous') {
        return { ambiguousDateFormat: true };
    }

    const errors: RowError[] = [];
    const rows: ImportRow[] = [];

    for (const { rowNum, rec } of dataRecords) {
        const dateRaw = (rec[col['date']] ?? '').trim();
        const category = (rec[col['category']] ?? '').trim();
        const descriptionRaw = (rec[col['description']] ?? '').trim();
        const typeRaw = (rec[col['type']] ?? '').trim().toLowerCase();
        const amountRaw = (rec[col['amount']] ?? '').trim();
        const notes = (rec[col['notes']] ?? '').trim();

        let rowHasError = false;

        if (!dateRaw) {
            errors.push({ row: rowNum, error: `Row ${rowNum}: date is required` });
            rowHasError = true;
        } else if (resolvedFormat === 'error') {
            errors.push({ row: rowNum, error: `Row ${rowNum}: date format is inconsistent with other rows` });
            rowHasError = true;
        } else {
            const parsed = parseDate(dateRaw, resolvedFormat as DateFormat);
            if (!parsed) {
                errors.push({ row: rowNum, error: `Row ${rowNum}: invalid date '${dateRaw}'` });
                rowHasError = true;
            }
        }

        if (!category) {
            errors.push({ row: rowNum, error: `Row ${rowNum}: category is required` });
            rowHasError = true;
        }

        if (typeRaw !== 'income' && typeRaw !== 'expense') {
            errors.push({ row: rowNum, error: `Row ${rowNum}: type must be 'income' or 'expense'` });
            rowHasError = true;
        }

        if (!amountRaw) {
            errors.push({ row: rowNum, error: `Row ${rowNum}: amount is required` });
            rowHasError = true;
        } else {
            const amount = parseFloat(amountRaw);
            if (isNaN(amount) || amount <= 0) {
                errors.push({ row: rowNum, error: `Row ${rowNum}: amount must be a positive number` });
                rowHasError = true;
            }
        }

        if (!rowHasError) {
            const date = parseDate(dateRaw, resolvedFormat as DateFormat)!;
            const description = descriptionRaw || category;
            rows.push({
                date,
                category,
                description,
                type: typeRaw as 'income' | 'expense',
                amount: parseFloat(amountRaw),
                notes: notes || null,
            });
        }
    }

    if (errors.length > 0) return { errors };
    return { rows };
}
