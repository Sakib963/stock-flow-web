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

    private brand() {
        const s = this._settings.settings() || {};
        return {
            name: s.name || COMPANY_INFO.name,
            logo: s.logo_url || '',
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
          <td>${i + 1}</td>
          <td>${this.esc(l.product_name)}</td>
          <td class="r">${this.esc(l.quantity)}</td>
          <td class="r">${this.money(l.unit_price)}</td>
          <td class="r">${this.money(l.discount || 0)}</td>
          <td class="r">${this.money(l.total)}</td>
        </tr>`
            )
            .join('');

        const total = Number(order?.total_amount) || 0;
        const paid = Number(order?.amount_paid) || 0;
        const partial = order?.payment_status === 'partially_paid';

        const legal = [b.bin ? `BIN: ${this.esc(b.bin)}` : '', b.tin ? `TIN: ${this.esc(b.tin)}` : '', b.trade_license ? `Trade License: ${this.esc(b.trade_license)}` : ''].filter(Boolean).join(' &nbsp;•&nbsp; ');
        const payMethods = [b.bank_details ? `Bank: ${this.esc(b.bank_details)}` : '', b.bkash ? `bKash: ${this.esc(b.bkash)}` : '', b.nagad ? `Nagad: ${this.esc(b.nagad)}` : ''].filter(Boolean).join('<br/>');

        return `
    <html>
      <head>
        <style>
          @page { size: A4; margin: 14mm; }
          * { box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; color: #1f2430; font-size: 12px; margin: 0; }
          .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1f2430; padding-bottom: 12px; }
          .logo { max-height: 60px; max-width: 180px; object-fit: contain; }
          .biz-name { font-size: 18px; font-weight: 700; }
          .muted { color: #6b7280; }
          .doc-title { font-size: 26px; font-weight: 700; letter-spacing: 1px; text-align: right; }
          .cols { display: flex; justify-content: space-between; margin-top: 16px; gap: 24px; }
          .col h4 { margin: 0 0 4px; font-size: 11px; text-transform: uppercase; color: #6b7280; }
          table { width: 100%; border-collapse: collapse; margin-top: 18px; }
          th, td { padding: 8px 10px; border-bottom: 1px solid #e6e8ec; text-align: left; }
          th { background: #f4f5f7; font-size: 11px; text-transform: uppercase; }
          td.r, th.r { text-align: right; }
          .totals { margin-top: 12px; margin-left: auto; width: 280px; }
          .totals .row { display: flex; justify-content: space-between; padding: 4px 0; }
          .totals .grand { border-top: 2px solid #1f2430; margin-top: 6px; padding-top: 8px; font-size: 15px; font-weight: 700; }
          .foot { margin-top: 26px; border-top: 1px solid #e6e8ec; padding-top: 10px; font-size: 11px; color: #6b7280; }
          .pill { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #eef2ff; color: #3730a3; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="head">
          <div>
            ${b.logo ? `<img class="logo" src="${this.esc(b.logo)}" alt="${this.esc(b.name)}"/>` : `<div class="biz-name">${this.esc(b.name)}</div>`}
            <div class="muted" style="margin-top:6px">
              ${b.logo ? `<div class="biz-name" style="font-size:14px">${this.esc(b.name)}</div>` : ''}
              ${b.address ? `<div>${this.esc(b.address)}</div>` : ''}
              ${[b.phone, b.phone2].filter(Boolean).map((p: string) => this.esc(p)).join(', ')}
              ${b.email ? `<div>${this.esc(b.email)}</div>` : ''}
              ${b.website ? `<div>${this.esc(b.website)}</div>` : ''}
            </div>
          </div>
          <div>
            <div class="doc-title">INVOICE</div>
            <div class="muted" style="text-align:right;margin-top:6px">
              <div><b>#${this.esc(order?.invoice_no)}</b></div>
              <div>${this.esc(this.formatLocalTime(order?.created_on))}</div>
              <div class="pill">${this.esc(order?.status)}</div>
            </div>
          </div>
        </div>

        <div class="cols">
          <div class="col">
            <h4>Billed To</h4>
            <div><b>${this.esc(order?.customer_name || '-')}</b></div>
            ${order?.customer_phone ? `<div>${this.esc(order.customer_phone)}</div>` : ''}
            ${this.deliveryLine(order) ? `<div>${this.esc(this.deliveryLine(order))}</div>` : ''}
          </div>
          <div class="col" style="text-align:right">
            <h4>Payment</h4>
            <div>${this.esc(order?.payment_type || '-')} • ${this.esc(order?.payment_status || '-')}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr><th>#</th><th>Product</th><th class="r">Qty</th><th class="r">Unit</th><th class="r">Discount</th><th class="r">Total</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <div class="totals">
          <div class="row"><span class="muted">Subtotal</span><span>${this.money(order?.subtotal)}</span></div>
          <div class="row"><span class="muted">Discount</span><span>- ${this.money(order?.discount_total)}</span></div>
          <div class="row"><span class="muted">Delivery</span><span>+ ${this.money(order?.delivery_charge)}</span></div>
          <div class="row grand"><span>Grand Total</span><span>${this.money(total)}</span></div>
          ${partial ? `<div class="row"><span class="muted">Paid</span><span>${this.money(paid)}</span></div><div class="row"><span class="muted">Due</span><span>${this.money(total - paid)}</span></div>` : ''}
        </div>

        <div class="foot">
          ${payMethods ? `<div style="margin-bottom:6px">${payMethods}</div>` : ''}
          ${legal ? `<div style="margin-bottom:6px">${legal}</div>` : ''}
          <div>${b.footer ? this.esc(b.footer) : 'Thank you for your business.'}</div>
        </div>
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

        return `
    <html>
      <head>
        <style>
          @page { size: 100mm 150mm; margin: 4mm; }
          * { box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; color: #000; font-size: 12px; margin: 0; width: 92mm; }
          .box { border: 1px solid #000; }
          .sec { padding: 6px 8px; border-bottom: 1px solid #000; }
          .sec:last-child { border-bottom: 0; }
          .label { font-size: 9px; text-transform: uppercase; color: #333; }
          .name { font-weight: 700; font-size: 13px; }
          .row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
          .big { font-size: 16px; font-weight: 700; }
          .qr { width: 34mm; height: 34mm; object-fit: contain; }
          .muted { color: #333; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="box">
          <div class="sec">
            <div class="label">Shipped From</div>
            <div class="name">${this.esc(b.name)}</div>
            <div class="muted">${this.esc(b.address)}</div>
            <div class="muted">${[b.phone, b.phone2].filter(Boolean).map((p: string) => this.esc(p)).join(', ')}</div>
          </div>
          <div class="sec">
            <div class="label">Shipped To</div>
            <div class="name">${this.esc(order?.customer_name || '-')}</div>
            <div class="muted">${this.esc(order?.customer_phone || '')}</div>
            <div class="muted">${this.esc(this.deliveryLine(order) || '-')}</div>
          </div>
          <div class="sec row">
            <div>
              <div class="label">Order</div>
              <div class="big">#${this.esc(order?.invoice_no)}</div>
              <div class="muted">${itemCount} item(s) • ${this.esc(this.formatLocalTime(order?.created_on))}</div>
              <div class="label" style="margin-top:6px">Collect (COD)</div>
              <div class="big">${isCod ? this.money(collect) : 'PREPAID'}</div>
            </div>
            ${qrDataUrl ? `<img class="qr" src="${qrDataUrl}" alt="Track order"/>` : '<div class="muted">No tracking QR<br/>(confirm the order first)</div>'}
          </div>
        </div>
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
