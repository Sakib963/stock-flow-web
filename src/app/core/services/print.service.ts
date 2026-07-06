import { Injectable, signal } from '@angular/core';
import { COMPANY_INFO } from '../constants/company-info';

@Injectable({
  providedIn: 'root',
})
export class PrintService {
  isPrinting = signal(false);
  companyInfo = COMPANY_INFO;

  formatLocalTime(createdOn?: string): string {
    if (createdOn) {
      return createdOn.substring(0, 16).replace('T', ' ');
    } else {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();

      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      hours = hours % 12 || 12;

      return `${day}/${month}/${year} ${hours}:${minutes}`;
    }
  }

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
        <div class="center">
          Date: ${this.formatLocalTime(data.created_on)}
        </div>
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
            width: 58mm;
            text-align: center;
            text-transform: uppercase;
            font-size: 9px;
          }

          .label {
            width: 50mm;
            margin: 0 auto;
            padding-left: 4mm;
          }

          .company, .product, .price {
            margin: 1px 0;
            line-height: 1.3;
            text-align: center;
          }

          .company {
            font-weight: bold;
            font-size: 8px;
          }

          .product {
            font-size: 10px;
            font-weight: bold;
          }

          .price {
            font-weight: bold;
            font-size: 10px;
          }

          svg {
            display: block;
            margin: 0 auto;
            padding: 0;
          }
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
    </html>
  `;
  }
}
