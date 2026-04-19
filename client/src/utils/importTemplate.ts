export function downloadImportTemplate(): void {
    const csv = ['Date,Category,Description,Type,Amount,Notes', '2024-01-15,Food,Coffee at the airport,expense,4.50,Morning coffee'].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions-template.csv';
    a.click();
    URL.revokeObjectURL(url);
}
