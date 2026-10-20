import { printPage } from '@app/shared/utils/print-page/print-page';
import { styled } from '@app/shared/utils/styled/styled';

export interface PrintedReport {
    business: string;
    title: string;
    /** The period and when it was made, one line each. */
    lines: string[];
    columns: { key: string; label: string; numeric: boolean }[];
    /** Every row, already in the reader's language and digits, its number first. */
    rows: string[][];
    totals: [string, string][];
    note: string;
}

// The fonts the invoice prints with: the frame has no stylesheet, and these draw Bengali on Windows.
const FONT = "Arial, 'Nirmala UI', 'Vrinda', Helvetica, sans-serif";
const PAGE_CSS = '@page { size: A4 landscape; margin: 10mm; } thead { display: table-header-group; } tr { break-inside: avoid; }';

const text = (doc: Document, tag: string, value: string, style: Record<string, string> = {}): HTMLElement => {
    const element = styled(doc.createElement(tag), style);
    element.textContent = value;
    return element;
};

/**
 * A report on A4 landscape, for the print dialog's Save as PDF (docs/report: no PDF library). Drawn
 * with DOM methods, so nothing a person typed can be read as markup; the header row repeats on
 * every page.
 */
export const printReport = (report: PrintedReport): void =>
    printPage(PAGE_CSS, null, (doc) => {
        const page = styled(doc.createElement('div'), { 'font-family': FONT, 'font-size': '10px', 'line-height': '1.4', color: '#000' });
        page.append(text(doc, 'div', report.business, { 'font-size': '14px', 'font-weight': '700' }));
        page.append(text(doc, 'div', report.title, { 'font-size': '12px', 'font-weight': '700', 'margin-top': '1mm' }));
        report.lines.forEach((line) => page.append(text(doc, 'div', line, { color: '#555' })));

        if (report.totals.length) {
            const totals = styled(doc.createElement('div'), { display: 'flex', 'flex-wrap': 'wrap', gap: '2mm 6mm', margin: '3mm 0', padding: '2mm 0', 'border-top': '1px solid #000', 'border-bottom': '1px solid #000' });
            for (const [label, value] of report.totals) {
                const item = doc.createElement('div');
                item.append(text(doc, 'span', `${label}: `, { color: '#555' }), text(doc, 'span', value, { 'font-weight': '700' }));
                totals.append(item);
            }
            page.append(totals);
        }

        const table = styled(doc.createElement('table'), { width: '100%', 'border-collapse': 'collapse' });
        const head = doc.createElement('thead');
        const headRow = doc.createElement('tr');
        report.columns.forEach((c) => headRow.append(text(doc, 'th', c.label, { 'text-align': c.numeric ? 'right' : 'left', padding: '1mm', 'border-bottom': '1px solid #000' })));
        head.append(headRow);
        const body = doc.createElement('tbody');
        report.rows.forEach((row) => {
            const tr = doc.createElement('tr');
            row.forEach((value, j) => tr.append(text(doc, 'td', value, { 'text-align': report.columns[j].numeric ? 'right' : 'left', padding: '1mm', 'border-bottom': '1px solid #ddd' })));
            body.append(tr);
        });
        table.append(head, body);
        page.append(table);
        page.append(text(doc, 'p', report.note, { color: '#555', 'margin-top': '3mm' }));
        return page;
    });
