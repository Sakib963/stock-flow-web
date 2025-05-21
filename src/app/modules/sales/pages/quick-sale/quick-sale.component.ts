import { Component, DestroyRef, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { NzAutocompleteModule } from 'ng-zorro-antd/auto-complete';
import { HttpService } from '@app/core/services/http.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { finalize } from 'rxjs';
import { NzNotificationService } from 'ng-zorro-antd/notification';

@Component({
  selector: 'app-quick-sale',
  standalone: true,
  imports: [
    CommonModule,
    NgZorroCustomModule,
    FormsModule,
    NzAutocompleteModule,
    ReactiveFormsModule,
  ],
  templateUrl: './quick-sale.component.html',
  styleUrls: ['./quick-sale.component.scss'],
})
export class QuickSaleComponent implements OnInit {
  saleForm!: FormGroup;
  productList: any = [];
  filteredProductList: any = [];
  selectedProduct: any = null;
  selectedProducts: any[] = [];

  loading: boolean = false;
  isFilter: boolean = false;

  constructor(
    private _httpService: HttpService,
    private _destroyRef: DestroyRef,
    private _location: Location,
    private _notificationService: NzNotificationService,
    private _fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.saleForm = this.createForm();
    this.loadProductList();
  }

  createForm(): FormGroup {
    return this._fb.group({
      searchInput: [''],
      quantity: [1],
      unit_price: [0],
      discount: [0],
      customerName: [''],
      customerPhone: [''],
    });
  }

  loadProductList(payload: any = null): any {
    if (!this.isFilter) {
      this.loading = true;
    }
    this._httpService
      .get(APIEndpoint.GET_PRODUCT_LIST_FOR_SALE, payload)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (res: any) => {
          if (res.status === 200) {
            this.productList = [];
            if (res.body?.data?.length) {
              this.productList = res.body?.data;
              this.filteredProductList = this.groupProductsBySubCategory(
                this.productList
              );
              console.log('Product List:', this.filteredProductList);
            } else {
              this.productList = [];
              this.filteredProductList = [];
            }
          }
        },
        error: (err: any) => {
          console.log(err);
          this._notificationService.error('Error!', err?.error?.message);
        },
      });
  }

  groupProductsBySubCategory(rawList: any[]): any[] {
    const groupedMap = new Map<string, any>();

    rawList.forEach((item) => {
      const subCategoryKey = item.sub_category_oid;

      if (!groupedMap.has(subCategoryKey)) {
        groupedMap.set(subCategoryKey, {
          sub_category: item.sub_category_name,
          parent_category: item.category_name,
          children: [],
        });
      }

      const group = groupedMap.get(subCategoryKey);

      group.children.push({
        inventory_oid: item.inventory_oid,
        product_oid: item.product_oid,
        product_name: item.product_name,
        image_url: item.image_url,
        sku: item.sku,
        batch_code: item.batch_code,
        quantity: Number(item.quantity_available),
        unit_price: Number(item.selling_price),
        max_discount_range: Number(item.maximum_discount),
      });
    });

    return Array.from(groupedMap.values());
  }

  onChange(value: string): void {
    // Call API or filter product list here
  }

  onProductSelected(product: any): void {
    this.selectedProduct = product;
    this.saleForm.patchValue({
      quantity: 1,
      unit_price: product.unit_price,
      discount: 0,
    });
  }

  getProductDisplayLabel(product: any): string {
    return  product ? `${product?.product_name} (${product?.batch_code})` : '';
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).src = 'assets/fallback.png';
  }

  addToInvoice(): void {
    const { quantity, unit_price, discount } = this.saleForm.value;
    this.selectedProducts.push({
      name: this.getProductDisplayLabel(this.selectedProduct),
      quantity,
      price: unit_price,
      discount,
    });
    this.selectedProduct = null;
    this.saleForm.get('searchInput')?.reset();
  }

  removeProduct(product: any): void {
    this.selectedProducts = this.selectedProducts.filter((p) => p !== product);
  }

  calculateTotal(): number {
    return this.selectedProducts.reduce(
      (acc, item) => acc + (item.price - item.discount) * item.quantity,
      0
    );
  }

  generateInvoice(): void {
    const invoice = {
      customer: {
        name: this.saleForm.value.customerName,
        phone: this.saleForm.value.customerPhone,
      },
      items: this.selectedProducts,
      total: this.calculateTotal(),
    };
    console.log('Invoice:', invoice);
    // Further logic here
  }
}
