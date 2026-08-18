import { Injectable, inject, signal } from '@angular/core';
import { toDataURL } from 'qrcode';
import { environment } from '@env/environment';
import { COMPANY_INFO } from '../constants/company-info';
import { SettingsService } from './settings.service';

// Renders and prints the three order documents:
//   - printReceipt: 58mm thermal receipt (counter handoff)
//   - printInvoice: A4 branded invoice
//   - printLabel:   ~100x150mm packing/shipping label with a QR to the tracker
// Branding comes from the DB-backed Settings (SettingsService), with the
// COMPANY_INFO constant as a fallback. Nothing here calls the tracker; the label
// only ENCODES the tracker URL into a QR (offline image).
@Injectable({
    providedIn: 'root',
})
export class PrintService {
    private _settings = inject(SettingsService);

    isPrinting = signal(false);
    companyInfo = COMPANY_INFO;

    // ---- helpers -------------------------------------------------------------

    private esc(s: any): string {
        return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
    }

    private money(n: any): string {
        return '৳' + (Number(n) || 0).toFixed(2);
    }

    // Only allow a hex color into the printed HTML/CSS; otherwise use the fallback.
    private hex(c: any, fallback: string): string {
        return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(String(c || '')) ? String(c) : fallback;
    }

    private brand() {
        const s = this._settings.settings() || {};
        return {
            name: s.name || COMPANY_INFO.name,
            logo: s.logo_url || '',
            invoiceBg: s.invoice_bg_url || s.logo_url || '',
            color: this.hex(s.brand_color, '#1f2430'),
            address: s.address || COMPANY_INFO.address || '',
            phone: s.phone_primary || COMPANY_INFO.phone || '',
            phone2: s.phone_secondary || '',
            email: s.email || COMPANY_INFO.email || '',
            website: s.website || COMPANY_INFO.website || '',
            bin: s.bin || '',
            tin: s.tin || '',
            trade_license: s.trade_license || '',
            bank_details: s.bank_details || '',
            bkash: s.bkash_number || '',
            nagad: s.nagad_number || '',
            footer: s.invoice_footer || '',
        };
    }

    private lines(order: any): any[] {
        return order?.items || order?.products || [];
    }

    private deliveryLine(order: any): string {
        const parts = [order?.customer_address, order?.delivery_area, order?.delivery_zone, order?.delivery_city].filter((p) => p && String(p).trim());
        const line = parts.join(', ');
        return order?.delivery_postcode ? `${line} - ${order.delivery_postcode}` : line;
    }

    formatLocalTime(createdOn?: string): string {
        const d = createdOn ? new Date(createdOn) : new Date();
        if (isNaN(d.getTime())) return '';
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        let h = d.getHours();
        const ap = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${dd}/${mm}/${yyyy} ${String(h).padStart(2, '0')}:${min} ${ap}`;
    }

    // Open a print window, write the html, print, then clean up. Shared by all docs.
    private renderAndPrint(html: string): Promise<void> {
        if (this.isPrinting()) return Promise.resolve();
        this.isPrinting.set(true);

        return new Promise((resolve) => {
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                console.error('Failed to open print window');
                this.isPrinting.set(false);
                resolve();
                return;
            }

            printWindow.document.open();
            printWindow.document.write(html);
            printWindow.document.close();

            const cleanup = () => {
                printWindow.close();
                this.isPrinting.set(false);
                resolve();
            };

            printWindow.onload = () => {
                setTimeout(() => {
                    try {
                        printWindow.focus();
                        printWindow.print();
                        printWindow.onafterprint = cleanup;
                        setTimeout(() => cleanup(), 3000); // fallback if onafterprint never fires
                    } catch (err) {
                        console.error('Printing failed', err);
                        cleanup();
                    }
                }, 100);
            };
        });
    }

    // ---- 1) Thermal receipt (58mm) ------------------------------------------

    async printReceipt(order: any): Promise<void> {
        await this._settings.ensureLoaded();
        return this.renderAndPrint(this.generateReceiptHTML(order, this.brand()));
    }

    private generateReceiptHTML(order: any, b: any): string {
        const items = this.lines(order)
            .map((p: any) => `<div class="flex"><div>${this.esc(p.product_name)} x${this.esc(p.quantity)}</div><div>${(Number(p.total) || 0).toFixed(2)}</div></div>`)
            .join('');

        const paid = Number(order?.amount_paid);
        const total = Number(order?.total_amount) || 0;
        const showPaid = order?.payment_status === 'partially_paid' && !isNaN(paid);

        return `
    <html>
      <head>
        <style>
          @page { size: 58mm auto; margin: 0 0 5mm 0; }
          body { font-family: monospace; width: 58mm; padding: 5mm; font-size: 10px; margin: 0; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #000; margin: 8px 0; }
          .flex { display: flex; justify-content: space-between; }
          .sm { font-size: 9px; }
        </style>
      </head>
      <body>
        <div class="center bold">${this.esc(b.name)}</div>
        ${b.address ? `<div class="center sm">${this.esc(b.address)}</div>` : ''}
        ${b.phone ? `<div class="center sm">${this.esc(b.phone)}</div>` : ''}
        <div class="line"></div>
        <div class="flex sm"><div>Invoice</div><div>${this.esc(order?.invoice_no)}</div></div>
        <div class="flex sm"><div>Date</div><div>${this.esc(this.formatLocalTime(order?.created_on))}</div></div>
        ${order?.customer_name ? `<div class="flex sm"><div>Customer</div><div>${this.esc(order.customer_name)}</div></div>` : ''}
        <div class="line"></div>
        ${items}
        <div class="line"></div>
        ${Number(order?.discount_total) ? `<div class="flex sm"><div>Discount</div><div>- ${(Number(order.discount_total) || 0).toFixed(2)}</div></div>` : ''}
        ${Number(order?.delivery_charge) ? `<div class="flex sm"><div>Delivery</div><div>+ ${(Number(order.delivery_charge) || 0).toFixed(2)}</div></div>` : ''}
        <div class="flex bold"><div>Total</div><div>${total.toFixed(2)} BDT</div></div>
        ${showPaid ? `<div class="flex sm"><div>Paid</div><div>${paid.toFixed(2)}</div></div><div class="flex sm bold"><div>Due</div><div>${(total - paid).toFixed(2)}</div></div>` : ''}
        <div style="height: 10mm;"></div>
        <div class="center">Thank you!</div>
        <div class="center sm">Powered by ${this.esc(b.name)}</div>
        ${b.website ? `<div class="center sm">${this.esc(b.website)}</div>` : ''}
      </body>
    </html>`;
    }

    // ---- 2) A4 branded invoice ----------------------------------------------

    async printInvoice(order: any): Promise<void> {
        await this._settings.ensureLoaded();
        return this.renderAndPrint(this.generateInvoiceHTML(order, this.brand()));
    }

    private generateInvoiceHTML(order: any, b: any): string {
        const rows = this.lines(order)
            .map(
                (l: any, i: number) => `
          <tr>
            <td class="c">${i + 1}</td>
            <td>${this.esc(l.product_name)}</td>
            <td class="num">${this.esc(l.quantity)}</td>
            <td class="num">${this.money(l.unit_price)}</td>
            <td class="num">${this.money(l.discount || 0)}</td>
            <td class="num">${this.money(l.total)}</td>
          </tr>`
            )
            .join('');

        const total = Number(order?.total_amount) || 0;
        const paid = Number(order?.amount_paid) || 0;
        const due = Math.max(0, total - paid);
        const ps = order?.payment_status;
        const stampClass = ps === 'paid' ? 'paid' : 'due';
        const stampText = ps === 'paid' ? 'PAID' : ps === 'partially_paid' ? 'PARTIALLY PAID' : 'UNPAID';

        const contact = [b.phone, b.phone2].filter(Boolean).map((p: string) => this.esc(p)).join(', ');
        const legal = [b.bin ? `BIN: ${this.esc(b.bin)}` : '', b.tin ? `TIN: ${this.esc(b.tin)}` : '', b.trade_license ? `Trade Lic: ${this.esc(b.trade_license)}` : ''].filter(Boolean).join(' &nbsp;&bull;&nbsp; ');
        const payMethods = [b.bank_details ? `<div class="pl"><b>Bank:</b> ${this.esc(b.bank_details)}</div>` : '', b.bkash ? `<div class="pl"><b>bKash:</b> ${this.esc(b.bkash)}</div>` : '', b.nagad ? `<div class="pl"><b>Nagad:</b> ${this.esc(b.nagad)}</div>` : ''].join('');
        const footerBits = [this.esc(b.name), b.website ? this.esc(b.website) : '', contact].filter(Boolean).join(' &nbsp;&bull;&nbsp; ');

        return `
    <html>
      <head>
        <style>
          @page { size: A4; margin: 13mm 13mm 0 13mm; }
          * { box-sizing: border-box; }
          body { font-family: 'Times New Roman', Times, serif; color: #14181f; font-size: 12.5px; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

          /* Repeated on every page */
          .watermark { position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; z-index: 0; }
          .watermark img { width: 92%; max-width: none; opacity: 0.10; }
          .page-footer { position: fixed; left: 0; right: 0; bottom: 0; height: 12mm; padding-top: 3mm; text-align: center; font-size: 10px; color: #667085; border-top: 1px solid #c9ccd3; background: #fff; z-index: 3; }

          .sheet { width: 100%; border-collapse: collapse; position: relative; z-index: 1; }
          .sheet > tbody > tr > td { padding: 0; }
          .footer-space { height: 15mm; }

          .head { display: flex; justify-content: space-between; align-items: flex-start; }
          .logo { max-height: 62px; max-width: 190px; object-fit: contain; margin-bottom: 6px; }
          .biz-name { font-size: 21px; font-weight: 700; }
          .biz-meta { font-size: 11.5px; color: #3b4150; line-height: 1.5; }
          .doc { text-align: right; }
          .doc-title { font-size: 36px; font-weight: 700; letter-spacing: 4px; }
          .doc-meta { margin-top: 8px; }
          .doc-meta table { margin-left: auto; border-collapse: collapse; }
          .doc-meta td { padding: 1px 0 1px 16px; font-size: 12.5px; }
          .doc-meta .lab { color: #667085; text-align: right; }
          .doc-meta .val { font-weight: 700; text-align: right; }

          .rule { border-bottom: 2px solid #14181f; margin: 12px 0 16px; }
          .section-k { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: #667085; margin-bottom: 4px; }
          .cust-name { font-size: 15px; font-weight: 700; }
          .cust-line { font-size: 12.5px; line-height: 1.5; }

          .items { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .items th { background: #14181f; color: #fff; font-size: 11px; letter-spacing: .05em; text-transform: uppercase; padding: 9px 11px; text-align: left; }
          .items th.num, .items td.num { text-align: right; }
          .items th.c, .items td.c { text-align: center; }
          .items td { padding: 9px 11px; border-bottom: 1px solid #d7dae1; }
          .items tbody tr:nth-child(even) td { background: #f6f7f9; }

          .summary { display: flex; justify-content: space-between; gap: 28px; margin-top: 18px; }
          .pay { flex: 1; }
          .pl { line-height: 1.7; font-size: 12px; }
          .stamp { display: inline-block; margin-top: 14px; border: 2.5px solid; border-radius: 6px; padding: 4px 16px; font-size: 15px; font-weight: 700; letter-spacing: 2px; transform: rotate(-4deg); }
          .stamp.paid { color: #157347; border-color: #157347; }
          .stamp.due { color: #b02a37; border-color: #b02a37; }
          .totals { width: 46%; }
          .totals table { width: 100%; border-collapse: collapse; }
          .totals td { padding: 5px 2px; font-size: 13px; }
          .totals td.lab { color: #3b4150; }
          .totals td.amt { text-align: right; font-weight: 600; }
          .totals tr.grand td { border-top: 2px solid #14181f; border-bottom: 3px double #14181f; font-size: 16px; font-weight: 700; padding: 8px 2px; }

          .notes { margin-top: 22px; font-size: 11.5px; color: #3b4150; }
          .sign { margin-top: 40px; display: flex; justify-content: flex-end; }
          .sign-box { width: 58mm; text-align: center; border-top: 1px solid #14181f; padding-top: 4px; font-size: 11px; color: #3b4150; }
        </style>
      </head>
      <body>
        ${b.invoiceBg ? `<div class="watermark"><img src="${this.esc(b.invoiceBg)}" alt=""/></div>` : ''}
        <div class="page-footer">${footerBits}${footerBits ? ' &nbsp;&bull;&nbsp; ' : ''}Thank you for your business</div>

        <table class="sheet">
          <tfoot><tr><td><div class="footer-space"></div></td></tr></tfoot>
          <tbody><tr><td>

            <div class="head">
              <div>
                ${b.logo ? `<img class="logo" src="${this.esc(b.logo)}" alt=""/>` : ''}
                <div class="biz-name">${this.esc(b.name)}</div>
                ${b.address ? `<div class="biz-meta">${this.esc(b.address)}</div>` : ''}
                ${contact ? `<div class="biz-meta">${contact}</div>` : ''}
                ${b.email ? `<div class="biz-meta">${this.esc(b.email)}</div>` : ''}
                ${legal ? `<div class="biz-meta">${legal}</div>` : ''}
              </div>
              <div class="doc">
                <div class="doc-title">INVOICE</div>
                <div class="doc-meta"><table>
                  <tr><td class="lab">Invoice No</td><td class="val">#${this.esc(order?.invoice_no)}</td></tr>
                  <tr><td class="lab">Date</td><td class="val">${this.esc(this.formatLocalTime(order?.created_on))}</td></tr>
                  <tr><td class="lab">Payment</td><td class="val">${this.esc(order?.payment_type || '-')}</td></tr>
                </table></div>
              </div>
            </div>

            <div class="rule"></div>

            <div class="billto">
              <div class="section-k">Bill To</div>
              <div class="cust-name">${this.esc(order?.customer_name || '-')}</div>
              ${order?.customer_phone ? `<div class="cust-line">${this.esc(order.customer_phone)}</div>` : ''}
              ${this.deliveryLine(order) ? `<div class="cust-line">${this.esc(this.deliveryLine(order))}</div>` : ''}
            </div>

            <table class="items">
              <thead>
                <tr>
                  <th class="c" style="width:6%">#</th>
                  <th>Description</th>
                  <th class="num" style="width:10%">Qty</th>
                  <th class="num" style="width:17%">Unit Price</th>
                  <th class="num" style="width:14%">Discount</th>
                  <th class="num" style="width:18%">Amount</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>

            <div class="summary">
              <div class="pay">
                ${payMethods ? `<div class="section-k">Payment Details</div>${payMethods}` : ''}
                <div class="stamp ${stampClass}">${stampText}</div>
              </div>
              <div class="totals"><table>
                <tr><td class="lab">Subtotal</td><td class="amt">${this.money(order?.subtotal)}</td></tr>
                <tr><td class="lab">Discount</td><td class="amt">- ${this.money(order?.discount_total)}</td></tr>
                <tr><td class="lab">Delivery Charge</td><td class="amt">+ ${this.money(order?.delivery_charge)}</td></tr>
                <tr class="grand"><td class="lab">Grand Total</td><td class="amt">${this.money(total)}</td></tr>
                ${paid > 0 ? `<tr><td class="lab">Paid</td><td class="amt">${this.money(paid)}</td></tr>` : ''}
                ${due > 0 ? `<tr><td class="lab">Amount Due</td><td class="amt">${this.money(due)}</td></tr>` : ''}
              </table></div>
            </div>

            ${b.footer ? `<div class="notes">${this.esc(b.footer)}</div>` : ''}

            <div class="sign">
              <div class="sign-box">Authorized Signature</div>
            </div>

          </td></tr></tbody>
        </table>
      </body>
    </html>`;
    }

    // ---- 3) Packing / shipping label (~100x150mm) with tracking QR -----------

    async printLabel(order: any): Promise<void> {
        if (this.isPrinting()) return;
        await this._settings.ensureLoaded();
        const b = this.brand();
        let qr = '';
        if (order?.tracking_token) {
            try {
                qr = await toDataURL(`${environment.trackerUrl}/${order.tracking_token}`, { margin: 1, width: 240 });
            } catch (e) {
                console.error('QR generation failed', e);
            }
        }
        return this.renderAndPrint(this.generateLabelHTML(order, b, qr));
    }

    private generateLabelHTML(order: any, b: any, qrDataUrl: string): string {
        const total = Number(order?.total_amount) || 0;
        const paid = Number(order?.amount_paid) || 0;
        const isCod = (order?.payment_type || '').toUpperCase() === 'COD';
        const collect = isCod ? Math.max(0, total - paid) : 0;
        const itemCount = this.lines(order).reduce((s: number, l: any) => s + (Number(l.quantity) || 0), 0);

        const contact = [b.phone, b.phone2].filter(Boolean).map((p: string) => this.esc(p)).join(', ') || '-';

        // A real table with border-collapse: every junction is a single, clean line
        // (no doubled or missing borders). The brand color is the top edge only.
        return `
    <html>
      <head>
        <style>
          @page { size: A4; margin: 8mm; }
          * { box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; color: #0a0a0a; font-size: 12px; margin: 0; }
          table.label { width: 100%; border-collapse: collapse; table-layout: fixed; border: 1.5px solid #000; }
          table.label td { border: 1.5px solid #000; padding: 11px 13px; vertical-align: top; }
          .k { font-size: 9px; letter-spacing: .09em; text-transform: uppercase; color: #6b7280; font-weight: 700; }
          .from { display: flex; gap: 10px; align-items: center; margin-top: 4px; }
          .logo { max-height: 40px; max-width: 108px; object-fit: contain; }
          .from-name { font-weight: 700; font-size: 13px; }
          .muted { color: #374151; font-size: 11px; line-height: 1.45; word-break: break-word; }
          .col-right { width: 38%; }
          .order-no { font-weight: 800; font-size: 17px; letter-spacing: .5px; margin-top: 2px; }
          .to-name { font-weight: 800; font-size: 21px; line-height: 1.12; margin: 5px 0 3px; }
          .to-addr { font-size: 13px; line-height: 1.5; margin-top: 2px; }
          .qr-cell { text-align: center; vertical-align: middle; }
          .qr { width: 30mm; height: 30mm; display: block; margin: 0 auto; }
          .qr-cap { font-size: 9px; color: #6b7280; margin-top: 4px; text-transform: uppercase; letter-spacing: .06em; }
          .cod-inner { display: flex; align-items: center; justify-content: space-between; }
          .cod-label { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; font-weight: 700; color: #374151; }
          .cod-amt { font-weight: 800; font-size: 24px; }
        </style>
      </head>
      <body>
        <table class="label">
          <tr>
            <td>
              <div class="k">Shipped From</div>
              <div class="from">
                ${b.logo ? `<img class="logo" src="${this.esc(b.logo)}" alt=""/>` : ''}
                <div>
                  <div class="from-name">${this.esc(b.name)}</div>
                  ${b.address ? `<div class="muted">${this.esc(b.address)}</div>` : ''}
                  <div class="muted">Contact: ${contact}</div>
                </div>
              </div>
            </td>
            <td class="col-right">
              <div class="k">Order</div>
              <div class="order-no">#${this.esc(order?.invoice_no)}</div>
              <div class="muted">${this.esc(this.formatLocalTime(order?.created_on))} &bull; ${itemCount} item(s)</div>
            </td>
          </tr>
          <tr>
            <td>
              <div class="k">Deliver To</div>
              <div class="to-name">${this.esc(order?.customer_name || '-')}</div>
              <div class="muted">${this.esc(order?.customer_phone || '-')}</div>
              <div class="to-addr">${this.esc(this.deliveryLine(order) || '-')}</div>
            </td>
            <td class="col-right qr-cell">
              ${qrDataUrl ? `<img class="qr" src="${qrDataUrl}" alt="Track"/><div class="qr-cap">Scan to track</div>` : `<div class="muted">No tracking QR</div>`}
            </td>
          </tr>
          <tr>
            <td colspan="2">
              <div class="cod-inner">
                <div class="cod-label">${isCod ? 'Collect on Delivery (COD)' : 'Payment'}</div>
                <div class="cod-amt">${isCod ? this.money(collect) : 'PREPAID'}</div>
              </div>
            </td>
          </tr>
        </table>
      </body>
    </html>`;
    }

    // ---- Barcodes (existing, unchanged) -------------------------------------

    printBarcodes(barcodeData: any): Promise<void> {
        if (this.isPrinting()) return Promise.resolve();

        this.isPrinting.set(true);

        return new Promise((resolve) => {
            const barcodeHTML = this.generateBarcodeHTML(barcodeData);

            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                console.error('Failed to open print window');
                this.isPrinting.set(false);
                resolve();
                return;
            }

            printWindow.document.open();
            printWindow.document.write(barcodeHTML);
            printWindow.document.close();

            const handlePrintCleanup = () => {
                printWindow.close();
                this.isPrinting.set(false);
                resolve();
            };

            printWindow.onload = () => {
                setTimeout(() => {
                    try {
                        printWindow.focus();
                        printWindow.print();
                        printWindow.onafterprint = handlePrintCleanup;
                        setTimeout(() => handlePrintCleanup(), 3000); // fallback
                    } catch (err) {
                        console.error('Printing failed', err);
                        handlePrintCleanup();
                    }
                }, 100);
            };
        });
    }

    private generateBarcodeHTML(data: any): string {
        return `
    <html>
      <head>
        <style>
          @page { size: 58mm auto; margin: 0; }
          body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; width: 58mm; text-align: center; text-transform: uppercase; font-size: 9px; }
          .label { width: 50mm; margin: 0 auto; padding-left: 4mm; }
          .company, .product, .price { margin: 1px 0; line-height: 1.3; text-align: center; }
          .company { font-weight: bold; font-size: 8px; }
          .product { font-size: 10px; font-weight: bold; }
          .price { font-weight: bold; font-size: 10px; }
          svg { display: block; margin: 0 auto; padding: 0; }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
      </head>
      <body>
        <div class="label">
          <div class="company">${data.companyName}</div>
          <div class="product">${data.productName}</div>
          <svg id="barcode"></svg>
          ${data.price != null ? `<div class="price">৳ ${data.price.toFixed(2)}</div>` : ''}
        </div>

        <script>
          JsBarcode("#barcode", "${data.batchCode}", {
            format: "CODE128",
            width: 0.9,
            height: 25,
            displayValue: true,
            fontSize: 10,
            margin: 0,
            textMargin: 0,
            fontOptions: "bold"
          });
        </script>
      </body>
    </html>`;
    }
}
