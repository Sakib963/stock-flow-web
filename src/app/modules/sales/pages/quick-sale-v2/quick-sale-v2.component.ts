import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';

interface Product {
  name: string;
  unitPrice: number;
}

@Component({
  selector: 'app-quick-sale-v2',
  standalone: true,
  imports: [CommonModule, NgZorroCustomModule, ReactiveFormsModule],
  templateUrl: './quick-sale-v2.component.html',
  styleUrls: ['./quick-sale-v2.component.scss'],
})
export class QuickSaleV2Component {
  customerForm: FormGroup;
  productForm: FormGroup;
  filteredProducts: Product[] = [];
  selectedProducts: any[] = [];

  products: Product[] = [
    { name: 'Football', unitPrice: 500 },
    { name: 'Jersey', unitPrice: 1200 },
    { name: 'Cricket Bat', unitPrice: 1500 },
  ];

  constructor(private fb: FormBuilder) {
    this.customerForm = this.fb.group({
      name: [''],
      phone: [''],
    });

    this.productForm = this.fb.group({
      productName: [''],
      quantity: [1],
      unitPrice: [{ value: 0, disabled: true }],
      discount: [0],
      totalPrice: [{ value: 0, disabled: true }],
    });
  }

  onProductSearch(event: Event) {
    const inputValue = (event.target as HTMLInputElement).value;
    this.filteredProducts = this.products.filter((p) =>
      p.name.toLowerCase().includes(inputValue.toLowerCase())
    );
  }

  addToList() {
    const product = this.productForm.value;
    const total =
      product.unitPrice * product.quantity * (1 - product.discount / 100);
    this.selectedProducts.push({
      name: product.productName,
      quantity: product.quantity,
      unitPrice: product.unitPrice,
      discount: product.discount,
      totalPrice: total.toFixed(2),
    });
    this.productForm.reset({
      productName: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      totalPrice: 0,
    });
  }

  removeProduct(item: any) {
    this.selectedProducts = this.selectedProducts.filter((p) => p !== item);
  }
}
