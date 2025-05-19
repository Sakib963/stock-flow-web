import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-quick-sale',
  standalone: true,
  imports: [CommonModule, NgZorroCustomModule, FormsModule],
  templateUrl: './quick-sale.component.html',
  styleUrls: ['./quick-sale.component.scss'],
})
export class QuickSaleComponent {
  selectedProducts: any[] = [];
  customerName: string = '';
  customerPhone: string = '';

  removeProduct(product: any) {
    this.selectedProducts = this.selectedProducts.filter((p) => p !== product);
  }

  calculateTotal(): number {
    return this.selectedProducts.reduce((acc, product) => {
      return acc + (product.price - product.discount) * product.quantity;
    }, 0);
  }

  generateInvoice() {
    // Placeholder for invoice generation logic
    console.log('Generating Invoice', this.selectedProducts);
  }
}
