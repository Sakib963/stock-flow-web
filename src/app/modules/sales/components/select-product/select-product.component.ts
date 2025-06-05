import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { HttpService } from '@app/core/services/http.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { debounceTime, distinctUntilChanged, finalize, Subject } from 'rxjs';
import { checkRequiredValidator } from '@app/core/constants/helper';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-select-product',
  standalone: true,
  imports: [
    CommonModule,
    LoaderComponent,
    NgZorroCustomModule,
    ReactiveFormsModule,
    FormsModule,
    TranslateModule
  ],
  templateUrl: './select-product.component.html',
  styleUrls: ['./select-product.component.scss'],
})
export class SelectProductComponent implements OnInit, OnChanges {
  @Output() readonly actionEmitter: EventEmitter<{
    action: string;
    value: any;
  }> = new EventEmitter();

  @Input() formData: any;
  form!: FormGroup;
  loading: boolean = false;
  isFilter: boolean = false;

  productList: any = [];
  filteredProductList: any = [];

  selectedProduct: any = null;

  private $searchSubject = new Subject<string>();

  constructor(
    private _fb: FormBuilder,
    private _httpService: HttpService,
    private _destroyRef: DestroyRef,
    private _notificationService: NzNotificationService
  ) {}

  ngOnInit(): void {
    this.form = this.createForm();
    this.loadProductList();

    this.$searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((value: string) => {
        this.isFilter = true;
        this.loadProductList({ search_text: value });
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['formData'] && changes['formData'].currentValue) {
      this.form.reset();
      this.selectedProduct = null;

      const data = changes['formData'].currentValue;

      this.form.patchValue({
        inventory_oid: data.inventory_oid,
        product_name: data.product_name,
        product_oid: data.product_oid,
        quantity_available: data.quantity_available,
        quantity: data.quantity,
        unit_price: data.unit_price,
        discount: data.discount,
        total: data.total,
      });

      this.onProductSelectedById(data.inventory_oid);
    }
  }

  createForm(): FormGroup {
    return this._fb.group({
      search_input: [null],
      product_name: [null, [Validators.required]],
      product_oid: [null, [Validators.required]],
      inventory_oid: [null, [Validators.required]],
      quantity_available: [null, [Validators.required, Validators.min(1)]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unit_price: [null, [Validators.required, Validators.min(0)]],
      discount: [0, [Validators.required, Validators.min(0)]],
      total: [0, [Validators.required, Validators.min(0)]],
    });
  }

  hasRequiredValidator(controlName: string): boolean {
    const control = this.form.get(controlName);
    return control ? checkRequiredValidator(control) : false;
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
        quantity_available: Number(item.quantity_available),
        unit_price: Number(item.selling_price),
        max_discount_range: Number(item.maximum_discount),
      });
    });

    return Array.from(groupedMap.values());
  }

  onChange(value: string): void {
    if (!value || value.length < 2) return;
    this.$searchSubject.next(value); // debounce triggers loadProductList
  }

  onProductSelected(product: any): void {
    this.selectedProduct = product;

    this.form.patchValue({
      inventory_oid: product.inventory_oid,
      product_name: this.getProductDisplayLabel(product),
      product_oid: product.product_oid,
      quantity_available: product.quantity_available,
      quantity: this.formData ? this.form.value.quantity : 1,
      unit_price: product.unit_price,
      discount: this.formData ? this.form.value.discount : 0,
      total: product.unit_price,
    });
  }

  getProductDisplayLabel(product: any): string {
    return product ? `${product?.product_name} (${product?.batch_code})` : '';
  }

  getProductUnitPriceLabel(product: any): any {
    return product ? product?.unit_price : 0;
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).src = 'assets/fallback.png';
  }

  addToInvoice(): void {
    const actionType = this.formData ? 'update' : 'add';

    this.actionEmitter.emit({
      action: actionType,
      value: this.form.getRawValue(),
    });

    this.form.reset();
    this.selectedProduct = null;
    this.formData = null;
  }

  onProductSelectedById(inventoryOid: string) {
    for (const group of this.filteredProductList) {
      const found = group.children.find(
        (p: any) => p.inventory_oid === inventoryOid
      );
      if (found) {
        this.onProductSelected(found);
        break;
      }
    }
  }

  getTotalPrice(): number {
    const quantity = Number(this.form.get('quantity')?.value) || 0;
    const unitPrice = Number(this.form.get('unit_price')?.value) || 0;
    const discountPercent = Number(this.form.get('discount')?.value) || 0;

    const discountAmount = (unitPrice * discountPercent) / 100;
    const discountedUnitPrice = unitPrice - discountAmount;

    const total = Number((discountedUnitPrice * quantity).toFixed(2));

    this.form.get('total')?.setValue(total, { emitEvent: false });

    return Number(this.form.get('total')?.value) || 0;
  }
}
