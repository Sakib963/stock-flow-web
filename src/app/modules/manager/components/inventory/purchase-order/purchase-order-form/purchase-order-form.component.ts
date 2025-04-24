import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { PrimaryButton } from '@app/shared/components/buttons/primary-button/primary-button.component';
import { SecondaryButton } from '@app/shared/components/buttons/secondary-button/secondary-button.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import {
  markFormGroupTouched,
  checkRequiredValidator,
} from '@app/core/constants/helper';
import { HttpService } from '@app/core/services/http.service';
import { ConfirmationModalComponent } from '@app/shared/components/confirmation-modal/confirmation-modal.component';
import { NzModalService } from 'ng-zorro-antd/modal';
import { DROPDOWN_OPTIONS } from '@app/core/constants/dropdown-options';
import { NzNotificationService } from 'ng-zorro-antd/notification';

@Component({
  selector: 'app-purchase-order-form',
  standalone: true,
  imports: [
    CommonModule,
    NgZorroCustomModule,
    ReactiveFormsModule,
    PrimaryButton,
    SecondaryButton,
    AngularSvgIconModule,
  ],
  templateUrl: './purchase-order-form.component.html',
  styleUrls: ['./purchase-order-form.component.scss'],
})
export class PurchaseOrderFormComponent implements OnInit {
  @Output() readonly actionEmitter: EventEmitter<object> = new EventEmitter();
  @Input() formData: any;
  @Input() loading: boolean = false;
  form!: FormGroup;
  drawerForm!: FormGroup;

  supplierList: any[] = [];
  productList: any[] = [];
  warehouseList: any[] = [];
  aisleList: any[] = [];

  purchaseTypes = DROPDOWN_OPTIONS.PURCHASE_TYPES;
  paymentStatuses = DROPDOWN_OPTIONS.PAYMENT_STATUS;

  visible = false;
  editIndex: number | null = null;

  currentTotalPrice = 0;

  constructor(
    private _fb: FormBuilder,
    private _modal: NzModalService,
    private _httpService: HttpService,
    private _destroyRef: DestroyRef,
    private _notificationService: NzNotificationService
  ) {}

  ngOnInit(): void {
    this.form = this.createForm();
    this.drawerForm = this.createProductGroup();

    this.loadSupplierList();
    this.loadProductList();
    this.loadWarehouseList();

    if (this.formData) {
      this.form.patchValue(this.formData);
      this.formData.products.forEach((product: any) => {
        const group = this.createProductGroup();
        group.patchValue(product);
        this.products.push(group);
        this.calculateTotalPriceFromProducts();
      });
    }

    this.form.get('payment_status')?.valueChanges.subscribe((value) => {
      const paidControl = this.form.get('paid_amount');

      if (value === 'paid' || value === 'partially_paid') {
        paidControl?.setValidators([Validators.required, Validators.min(0.01)]);
      } else {
        paidControl?.clearValidators();
        paidControl?.setValue(null); // Clear the field if Unpaid
      }

      paidControl?.updateValueAndValidity();
    });

    // handle warehouse change
    this.drawerForm.controls['warehouse_oid'].valueChanges.subscribe(
      (value: any) => {
        this.drawerForm.controls['aisle_oid'].setValue(null);
        if (value) {
          this.loadAisleList(value);
        } else {
          this.aisleList = [];
        }
      }
    );

    // Recalculate total price when products array changes
    this.products.valueChanges.subscribe(() => {
      this.calculateTotalPriceFromProducts();
    });
  }

  calculateTotalPriceFromProducts(): void {
    const all_products = this.products.value;
    this.currentTotalPrice = all_products.reduce(
      (acc: number, product: any) => {
        const unitPrice = product.unit_price || 0;
        const quantity = product.quantity || 0;
        return acc + unitPrice * quantity;
      },
      0
    );
  }

  createForm(): FormGroup {
    return this._fb.group({
      oid: [null],
      supplier_oid: [null, Validators.required],
      total_amount: [null, [Validators.required, Validators.min(0.01)]],
      special_notes: [null],
      payment_status: [null, Validators.required],
      paid_amount: [null, Validators.min(0)],
      purchase_type: [null, Validators.required],
      products: this._fb.array([]),
    });
  }

  createProductGroup(): FormGroup {
    return this._fb.group({
      oid: [null],
      product_oid: [null, Validators.required],
      warehouse_oid: [null, Validators.required],
      aisle_oid: [null],
      quantity: [null, [Validators.required, Validators.min(1)]],
      unit_price: [null, [Validators.required, Validators.min(0.01)]],
    });
  }

  get products(): FormArray {
    return this.form.get('products') as FormArray;
  }

  addProduct(): void {
    this.products.push(this.createProductGroup());
  }

  removeProduct(index: number): void {
    if (this.products.length > 1) {
      this.products.removeAt(index);
    }
  }

  handleAdd(): void {
    this.visible = true;
  }

  handleConfirm(): void {
    let message = 'Are you sure you want to proceed with this purchase order?';
    if (this.formData) {
      message = 'Are you sure you want to save these updates?';
    }
    this._modal.create({
      nzContent: ConfirmationModalComponent,
      nzData: {
        message,
      },
      nzFooter: null,
      nzClosable: false,
      nzOnOk: () =>
        this.actionEmitter.emit({ action: 'submit', value: this.form.value }),
    });
  }

  handleForm(): void {
    if (this.form.valid) {
      if (this.products.length) {
        this.handleConfirm();
      } else {
        this._notificationService.warning(
          'Warning!',
          'You have to add at lease 1 or more products!'
        );
      }
    } else {
      markFormGroupTouched(this.form);
    }
  }

  goBack(): void {
    this.actionEmitter.emit({ action: 'back', value: this.form.value });
  }

  close(): void {
    this.visible = false;
  }

  hasRequiredValidator(controlName: string): boolean {
    const control = this.form.get(controlName);
    return control ? checkRequiredValidator(control) : false;
  }

  hasRequiredValidatorDrawerForm(controlName: string): boolean {
    const control = this.drawerForm.get(controlName);
    return control ? checkRequiredValidator(control) : false;
  }

  checkDisabledStatus(value: any): boolean {
    return this.products.value.find((item: any) => item.product_oid === value);
  }

  handleDrawerForm(): void {
    if (this.drawerForm.valid) {
      const productData = this.drawerForm.value;

      if (this.editIndex !== null) {
        // Editing existing product
        this.products.at(this.editIndex).patchValue(productData);
        this.editIndex = null;
      } else {
        // Adding new product
        this.products.push(this._fb.group({ ...productData }));
      }

      this.drawerForm.reset();
      this.visible = false;
    } else {
      markFormGroupTouched(this.drawerForm);
    }
  }

  getProductName(product_oid: string): string {
    const product = this.productList.find(
      (item: any) => item.value === product_oid
    );
    return product ? product.label : 'Unknown Product';
  }

  getWarehouseName(warehouse_oid: string): string {
    const warehouse = this.warehouseList.find(
      (item: any) => item.value === warehouse_oid
    );
    return warehouse ? warehouse.label : 'Unknown Warehouse';
  }

  calculateTotalPrice(product: any): number {
    if (!product.unit_price && !product.quantity) return 0;

    return Number(product.unit_price) * Number(product.quantity);
  }

  handleItemEdit(i: any): any {
    this.editIndex = i;
    const product = this.products.at(i).value;
    this.drawerForm.patchValue(product);
    this.visible = true;
  }

  handleItemDelete(i: any): any {
    this.products.removeAt(i);
  }

  loadSupplierList(): void {
    this._httpService
      .get(APIEndpoint.GET_SUPPLIER_LIST_FOR_DROPDOWN)
      .subscribe({
        next: (res: any) => {
          if (res.body.code === 200) {
            this.supplierList = res.body.data;
          }
        },
        error: (err: any) => {
          console.log(err);
        },
      });
  }

  loadProductList(): void {
    this.loading = true;
    this._httpService.get(APIEndpoint.GET_PRODUCT_LIST_FOR_DROPDOWN).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.body.code === 200) {
          this.productList = res.body.data;
        }
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  loadWarehouseList(): void {
    this.loading = true;
    this._httpService
      .get(APIEndpoint.GET_WAREHOUSE_LIST_FOR_DROPDOWN)
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          if (res.body.code === 200) {
            this.warehouseList = res.body.data;
          }
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  loadAisleList(warehouse_oid: any): void {
    this._httpService
      .get(APIEndpoint.GET_AISLE_LIST_FOR_DROPDOWN, { warehouse_oid })
      .subscribe({
        next: (res: any) => {
          this.aisleList = [];
          if (res.body.code === 200) {
            this.aisleList = res.body.data;
          }
        },
        error: () => {},
      });
  }
}
