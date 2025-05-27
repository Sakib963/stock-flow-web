import { Component, DestroyRef, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NzAutocompleteModule } from 'ng-zorro-antd/auto-complete';
import { HttpService } from '@app/core/services/http.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { SelectProductComponent } from '../../components/select-product/select-product.component';

@Component({
  selector: 'app-quick-sale',
  standalone: true,
  imports: [
    CommonModule,
    NgZorroCustomModule,
    FormsModule,
    NzAutocompleteModule,
    ReactiveFormsModule,
    LoaderComponent,
    SelectProductComponent,
  ],
  templateUrl: './quick-sale.component.html',
  styleUrls: ['./quick-sale.component.scss'],
})
export class QuickSaleComponent implements OnInit {
  form!: FormGroup;
  productList: any = [];
  selectedProducts: any[] = [];

  loading: boolean = false;
  isFilter: boolean = false;

  editingProduct: any = null;
  selectedProductIndex: number | null = null;

  constructor(
    private _httpService: HttpService,
    private _destroyRef: DestroyRef,
    private _location: Location,
    private _notificationService: NzNotificationService,
    private _fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.form = this.createForm();
  }

  createForm(): FormGroup {
    return this._fb.group({
      customer_name: [null],
      customer_phone: [null],
      customer_address: [null],
      customer_email: [null],
      status: ['draft'],
      total_amount: [0, [Validators.required, Validators.min(0)]],
      products: this._fb.array([]),
    });
  }

  createProductGroup(product: any = null): FormGroup {
    return this._fb.group({
      inventory_oid: [product?.inventory_oid ?? null, Validators.required],
      product_name: [product?.product_name ?? null, Validators.required],
      product_oid: [product?.product_oid ?? null, Validators.required],
      quantity_available: [product?.quantity_available ?? null],
      quantity: [
        product?.quantity ?? 1,
        [Validators.required, Validators.min(1)],
      ],
      unit_price: [
        product?.unit_price ?? null,
        [Validators.required, Validators.min(0)],
      ],
      discount: [product?.discount ?? 0],
      total: [product?.total ?? 0, Validators.required],
    });
  }

  get products(): FormArray {
    return this.form.get('products') as FormArray;
  }

  get productRows(): any[] {
    return this.products.value;
  }

  addProduct(): void {
    this.products.push(this.createProductGroup());
  }

  removeProduct(index: number): void {
    this.products.removeAt(index);

    console.log(this.products.value);
  }

  generateInvoice(): void {
    // Todo!
    console.log('Invoice:', this.form.value);
  }

  handleProductSelect(event: { action: string; value: any }): void {
    const { action, value } = event;

    switch (action) {
      case 'add':
        this.addProductToInvoice(value);
        break;

      case 'update':
        this.updateProductInInvoice(value);
        break;

      default:
        console.warn(`Unhandled action: ${action}`);
    }
  }

  addProductToInvoice(product: any): void {
    const exists = this.products.controls.some(
      (ctrl) => ctrl.get('inventory_oid')?.value === product.inventory_oid
    );
    if (!exists) {
      this.products.push(this.createProductGroup(product));
      this.updateTotalAmount();
    } else {
      this._notificationService.warning(
        'Product already exists',
        'This product is already added to the invoice.'
      );
    }
  }

  updateTotalAmount(): void {
    const total = this.products.controls.reduce((sum, productGroup) => {
      const itemTotal = Number(productGroup.get('total')?.value) || 0;
      return sum + itemTotal;
    }, 0);

    this.form.get('total_amount')?.setValue(total);
  }

  removeProductFromInvoice(index: any): void {
    if (index !== -1) {
      this.products.removeAt(index);
      this.updateTotalAmount();
    }
  }

  updateProductInInvoice(updatedProduct: any): void {
    const index = this.products.controls.findIndex(
      (item) =>
        item.get('inventory_oid')?.value === updatedProduct.inventory_oid
    );

    if (index !== -1) {
      const item = this.products.at(index);

      item.patchValue({
        quantity: updatedProduct.quantity,
        unit_price: updatedProduct.unit_price,
        discount: updatedProduct.discount,
        total: updatedProduct.total,
        quantity_available: updatedProduct.quantity_available,
        inventory_oid: updatedProduct.inventory_oid,
      });

      this.updateTotalAmount();
      this.selectedProductIndex = null; // Reset selected product index
      this.editingProduct = null; // Reset editing state
    } else {
      console.warn(
        `Product with OID ${updatedProduct.inventory_oid} not found for update.`
      );
    }
  }

  editProduct(index: number): void {
    const product = this.products.at(index).value;
    this.selectedProductIndex = index;
    this.editingProduct = product;
  }

  saveAsDraft(): void {
    if (this.form) {
      this.form.patchValue({ status: 'draft' });

      // Optional: allow saving with no products
      if (this.form.valid || this.products.length === 0) {
        const draftData = this.form.getRawValue();
        // Send to backend or handle accordingly
        console.log('Saving draft:', draftData);
        this._notificationService.success('Saved', 'Invoice saved as draft');
      } else {
        this._notificationService.error(
          'Error',
          'Cannot save draft due to invalid data'
        );
      }
    }
  }
}
