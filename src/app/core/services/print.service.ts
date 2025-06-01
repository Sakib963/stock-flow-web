import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class PrintService {
  isPrinting = signal(false);

  printReceipt(data: any): Promise<void> {
    if (this.isPrinting()) return Promise.resolve();

    this.isPrinting.set(true);

    return new Promise((resolve) => {
      const receiptHTML = this.generateReceiptHTML(data);

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

  private generateReceiptHTML(data: any): string {
    return `
    <html>
      <head>
        <style>
          @page {
            size: 58mm auto;
            margin: 0;
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
        <div class="center bold">Bondhu Sports</div>
        <div class="center">Invoice No: ${data.invoice_no}</div>
        <div class="center">Date: ${new Date().toLocaleString()}</div>
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

        <div class="center">Thank you!</div>
      </body>
    </html>
  `;
  }
}
