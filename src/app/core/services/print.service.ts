import { Injectable, signal } from '@angular/core';
import { COMPANY_INFO } from '../constants/company-info';

@Injectable({
  providedIn: 'root',
})
export class PrintService {
  isPrinting = signal(false);
  companyInfo = COMPANY_INFO;

  printReceipt(data: any): Promise<void> {
    if (this.isPrinting()) return Promise.resolve();

    this.isPrinting.set(true);

    return new Promise((resolve) => {
      const receiptHTML = this.generateReceiptHTML(data, this.companyInfo);

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        console.error('Failed to open print window');
        this.isPrinting.set(false);
        resolve();
        return;
      }

      printWindow.document.open();
      printWindow.document.write(receiptHTML);
      printWindow.document.close();

      const handlePrintCleanup = () => {
        printWindow.close();
        this.isPrinting.set(false);
        resolve();
      };

      // Safer: wait for printWindow to load completely
      printWindow.onload = () => {
        setTimeout(() => {
          try {
            printWindow.focus();
            printWindow.print();

            // Use event listener for reliable cleanup
            printWindow.onafterprint = handlePrintCleanup;

            // Fallback in case onafterprint is not called
            setTimeout(() => handlePrintCleanup(), 3000);
          } catch (err) {
            console.error('Printing failed', err);
            handlePrintCleanup();
          }
        }, 100); // Slight delay to ensure DOM is fully ready
      };
    });
  }

  private generateReceiptHTML(data: any, company_info: any): string {
    return `
    <html>
      <head>
        <style>
          @page {
            size: 58mm auto;
            margin: 0 0 5mm 0;
          }

          body {
            font-family: monospace;
            width: 58mm;
            padding: 5mm;
            font-size: 10px;
            margin: 0;
          }

          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #000; margin: 10px 0; }
          .flex {
            display: flex;
            justify-content: space-between;
          }
        </style>
      </head>
      <body>
        <div class="center bold">${company_info.name}</div>
        <div class="center">Invoice No: ${data.invoice_no}</div>
        <div class="center">Date: ${
          data.created_on
            ? new Date(data.created_on).toLocaleString()
            : new Date(data.created_on).toLocaleString()
        }</div>
        <div class="line"></div>

        ${data.products
          .map(
            (p: any) => `
          <div class="flex">
            <div>${p.product_name} x${p.quantity}</div>
            <div>${p.total.toFixed(2)}</div>
          </div>
        `
          )
          .join('')}

        <div class="line"></div>
        <div class="flex bold">
          <div>Total</div>
          <div>${data.total_amount.toFixed(2)} BDT</div>
        </div>

        <div style="height: 15mm;"></div>
        <div class="center">Thank you!</div>
        <div class="center">Powered by ${company_info.name}</div>
        <div class="center">${company_info.website}</div>
        </body>
    </html>
  `;
  }

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
          @page {
            size: 58mm auto;
            margin: 0;
          }

          body {
            margin: 0;
            padding: 0;
            font-family: Arial, Helvetica, sans-serif;
            width: 80mm;
            text-align: center;
            text-transform: uppercase;
            font-size: 12px;
          }

          .label {
            width: 70mm;
            margin: auto;
            padding-top: 4mm;
            padding-bottom: 4mm;
          }

          .company {
            font-weight: bold;
            margin-bottom: 4px;
            font-size: 11px;
          }

          .product {
            font-size: 14px;
            font-weight: bold;
            margin: 2px 0 6px 0;
          }

          .price {
            font-weight: bold;
            margin-top: 4px;
            font-size: 13px;
          }

          svg {
            display: block;
            margin: auto;
          }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
      </head>
      <body>
        <div class="label">
          <div class="company">${data.companyName}</div>
          <div class="product">${data.productName}</div>
          <svg id="barcode"></svg>
          <div class="price">৳ ${data.price?.toFixed(2)}</div>
        </div>

        <script>
          JsBarcode("#barcode", "${data.batchCode}", {
            format: "CODE128",
            width: 1.2,
            height: 40,
            displayValue: true,
            fontSize: 14,
            textAlign: "center",
            textMargin: 4,
            fontOptions: "bold"
          });
        </script>
      </body>
    </html>
  `;
  }
}
